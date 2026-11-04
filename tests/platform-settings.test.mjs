import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { testDatabase } from "./database.mjs";
import { loadTs } from "./load-ts.mjs";

const ADMIN = "81ab4bb4-4bdb-4f9c-be3c-7977e2efe58e";
let db, service, failReads = false, failWrites = false;
const input = {
  brand_name_pt: "Marca PT", brand_name_en: "Brand EN", brand_tagline_pt: "Slogan PT", brand_tagline_en: "Tagline EN",
  support_email: "suporte@example.test", support_whatsapp: "+55 (11) 99999-0000",
  support_hours_pt: "Seg a Sex", support_hours_en: "Mon-Fri", maintenance_mode: false,
  maintenance_duration: 2, maintenance_duration_unit: "hours", signup_open: true, trial_days_default: 0,
};
const client = {
  from() {
    let keys, equal;
    const read = async () => {
      if (failReads) return { data: null, error: { code: "NETWORK_FAILED" } };
      let rows = (await db.query("select to_jsonb(t) as row from platform_settings t")).rows.map(r => r.row);
      if (keys) rows = rows.filter(row => keys.includes(row.key));
      if (equal) rows = rows.filter(row => row.key === equal);
      return { data: rows, error: null };
    };
    const q = {
      select: () => q,
      in(_, values) { keys = values; return q; },
      eq(_, value) { equal = value; return q; },
      async maybeSingle() { const r = await read(); return { ...r, data: r.data?.[0] ?? null }; },
      then(resolve, reject) { return read().then(resolve, reject); },
    };
    return q;
  },
  async rpc(name, args) {
    assert.equal(name, "admin_save_platform_settings");
    if (failWrites) return { data: null, error: { code: "NETWORK_FAILED" } };
    try {
      return { data: (await db.query("select admin_save_platform_settings($1,$2::jsonb,$3::timestamptz) as result", [args.p_actor, args.p_input, args.p_expected])).rows[0].result, error: null };
    } catch (error) { return { data: null, error: { code: error.code, message: error.message } }; }
  },
};
before(async () => {
  db = await testDatabase();
  service = loadTs("src/services/PlatformSettingsService.ts", { react: { cache: fn => fn }, "../lib/supabase/server": { createServiceClientSSR: async () => client } });
});
after(async () => { if (db) await db.close(); });
beforeEach(async () => {
  failReads = false; failWrites = false;
  await db.exec("update platform_settings set value_json='false' where key='maintenance_mode';update platform_settings set value_pt=null where key='maintenance_until';update platform_settings set value_num=24 where key='maintenance_duration';update platform_settings set value_pt='hours' where key='maintenance_duration_unit';update platform_settings set value_json='true' where key='signup_open'");
});
const current = () => service.PlatformSettingsService.getForm();
const save = async (changes = {}, actor = ADMIN) => service.PlatformSettingsService.save({ ...await current(), ...input, ...changes }, actor);

test("salva todos os campos e devolve o snapshot real com auditoria, versão e WhatsApp normalizado", async () => {
  const form = await save();
  assert.equal(form.brand_name_pt, input.brand_name_pt);
  assert.equal(form.brand_name_en, input.brand_name_en);
  assert.equal(form.support_whatsapp, "5511999990000");
  assert.equal(form.support_email, input.support_email);
  assert.equal(form.support_hours_pt, input.support_hours_pt);
  assert.equal(form.support_hours_en, input.support_hours_en);
  assert.ok(form.revision);
  assert.deepEqual(await current(), form);
  assert.equal((await db.query("select action from audit_logs where action='platform_settings.update' order by id desc limit 1")).rows[0].action, "platform_settings.update");
});

test("marca e contatos públicos são localizados e não expõem configurações privilegiadas", async () => {
  await save();
  const settings = await service.getPublicPlatformSettings();
  const { localizedBrand } = loadTs("src/lib/platform/publicSettings.ts");
  assert.deepEqual(localizedBrand(settings, "pt-BR"), { name: "Marca PT", tagline: "Slogan PT", hours: "Seg a Sex" });
  assert.deepEqual(localizedBrand(settings, "en-US"), { name: "Brand EN", tagline: "Tagline EN", hours: "Mon-Fri" });
  assert.equal(settings.support_whatsapp, "5511999990000");
  assert.equal("maintenance_mode" in settings, false);
  assert.equal("revision" in settings, false);
  await save({ brand_tagline_pt: "", support_email: "", support_whatsapp: "", support_hours_pt: "" });
  const cleared = await service.getPublicPlatformSettings();
  assert.equal(cleared.brand_tagline_pt, ""); assert.equal(cleared.support_email, ""); assert.equal(cleared.support_whatsapp, "");
});

test("leitura com falha não vira valores padrão; cadastro falha fechado e manutenção não é ignorada", async () => {
  failReads = true;
  await assert.rejects(current);
  assert.equal(await service.isSignupOpen(), false);
  await assert.rejects(service.getMaintenanceStatus);
});

test("cadastro fechado é respeitado; falha na gravação não altera o banco", async () => {
  const closed = await save({ signup_open: false });
  assert.equal(await service.isSignupOpen(), false);
  failWrites = true;
  await assert.rejects(() => service.PlatformSettingsService.save({ ...closed, signup_open: true }, ADMIN));
  failWrites = false;
  assert.equal((await current()).signup_open, false);
});

test("manutenção ativa preserva o prazo em salvamentos não relacionados, em horas e dias", async () => {
  const active = await save({ maintenance_mode: true });
  assert.equal(active.maintenance_active, true);
  const preserved = await service.PlatformSettingsService.save({ ...active, support_hours_pt: "Outro horário" }, ADMIN);
  assert.equal(preserved.maintenance_until, active.maintenance_until);
  const days = await service.PlatformSettingsService.save({ ...preserved, maintenance_duration_unit: "days" }, ADMIN);
  assert.ok(Math.abs(Date.parse(days.maintenance_until) - Date.now() - 2 * 86400000) < 3000);
  const disabled = await service.PlatformSettingsService.save({ ...days, maintenance_mode: false }, ADMIN);
  assert.equal(disabled.maintenance_until, null); assert.equal(disabled.maintenance_active, false);
});

test("manutenção vencida não reinicia ao salvar contatos; reinício explícito abre nova janela", async () => {
  await save({ maintenance_mode: true });
  await db.exec("update platform_settings set value_pt='2000-01-01T00:00:00Z' where key='maintenance_until'");
  const expired = await current();
  assert.equal(expired.maintenance_active, false);
  const unchanged = await service.PlatformSettingsService.save({ ...expired, support_hours_pt: "Novo horário" }, ADMIN);
  assert.equal(unchanged.maintenance_active, false);
  assert.equal(Date.parse(unchanged.maintenance_until), Date.parse(expired.maintenance_until));
  const restarted = await service.PlatformSettingsService.save({ ...unchanged, restart_maintenance: true }, ADMIN);
  assert.equal(restarted.maintenance_active, true);
});

test("versão desatualizada não sobrescreve dados de outra sessão", async () => {
  const old = await current();
  const next = await save({ brand_name_pt: "Nova marca" });
  await assert.rejects(() => service.PlatformSettingsService.save({ ...old, ...input }, ADMIN), /outra sessão/);
  assert.equal((await current()).brand_name_pt, next.brand_name_pt);
});

test("falha na auditoria desfaz todas as configurações na transação", async () => {
  const before = await current();
  await db.exec("create function test_settings_audit_fail() returns trigger language plpgsql as $$begin if new.action='platform_settings.update' then raise exception 'AUDIT_FAILED';end if;return new;end$$;create trigger test_settings_audit_fail before insert on audit_logs for each row execute function test_settings_audit_fail()");
  try {
    await assert.rejects(() => save({ brand_name_pt: "Não deve persistir" }));
    assert.deepEqual(await current(), before);
  } finally { await db.exec("drop trigger test_settings_audit_fail on audit_logs;drop function test_settings_audit_fail()"); }
});

test("somente admin pode gravar e authenticated não executa RPC mesmo forjando ator", async () => {
  const student = "70000000-0000-4000-8000-000000000001";
  await db.query("insert into auth.users(id,email) values($1,'settings-student@example.test')", [student]);
  await assert.rejects(() => save({}, student));
  await db.query("update profiles set role='coach' where id=$1", [student]);
  await assert.rejects(() => save({}, student));
  const allowed = (await db.query("select has_function_privilege('authenticated','public.admin_save_platform_settings(uuid,jsonb,timestamp with time zone)','execute') as allowed")).rows[0].allowed;
  assert.equal(allowed, false);
});

test("WhatsApp inválido, e-mail incorreto e teste gratuito são rejeitados antes da gravação", async () => {
  for (const value of ["abc123", "123", "0000000000", "+55abc11999990000", "1234567890123456"]) await assert.rejects(() => save({ support_whatsapp: value }));
  await assert.rejects(() => save({ support_email: "email-invalido" }));
  await assert.rejects(() => save({ trial_days_default: 7 }));
});

test("ação exige admin e devolve valores persistidos para atualizar o formulário", async () => {
  let writes = 0;
  const invalidations = [];
  const form = await current();
  const mocks = {
    "@/lib/auth/access": { requireRole: async roles => { assert.deepEqual(roles, ["admin"]); return { userId: ADMIN }; } },
    "@/services/PlatformSettingsService": { PlatformSettingsService: { save: async (value, actor) => { writes++; assert.equal(actor, ADMIN); return form; } } },
    "next/cache": { revalidatePath: (...args) => invalidations.push(args) },
  };
  const action = loadTs("src/app/actions/settings.ts", mocks);
  const result = await action.savePlatformSettingsAction({ ...form, ...input });
  assert.equal(result.success, true); assert.deepEqual(result.settings, form);
  assert.deepEqual(invalidations, [["/[locale]", "layout"]]);
  const denied = loadTs("src/app/actions/settings.ts", { ...mocks, "@/lib/auth/access": { requireRole: async () => { throw Error("denied"); } } });
  await assert.rejects(() => denied.savePlatformSettingsAction({ ...form, ...input }), /denied/);
  assert.equal(writes, 1);
});

test("cabeçalho e rodapé reais renderizam marca, slogan e contatos em cada idioma", async () => {
  await save();
  const settings = await service.getPublicPlatformSettings();
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const mocks = {
    "next/link": ({ children, ...props }) => React.createElement("a", props, children),
    "next/image": ({ alt, src }) => React.createElement("img", { alt, src }),
    "next/navigation": { usePathname: () => "/pt-BR/sobre", useRouter: () => ({}) },
  };
  const { PublicHeader } = loadTs("src/components/shared/PublicHeader.tsx", mocks);
  const { PublicFooter } = loadTs("src/components/shared/PublicFooter.tsx", mocks);
  for (const locale of ["pt-BR", "en-US"]) {
    const html = renderToStaticMarkup(React.createElement(React.Fragment, null, React.createElement(PublicHeader, { locale, settings }), React.createElement(PublicFooter, { locale, settings })));
    assert.ok(html.includes(locale === "pt-BR" ? "Marca PT" : "Brand EN"));
    assert.ok(html.includes(locale === "pt-BR" ? "Slogan PT" : "Tagline EN"));
    assert.ok(html.includes(locale === "pt-BR" ? "Seg a Sex" : "Mon-Fri"));
    assert.ok(html.includes("mailto:suporte@example.test"));
    assert.ok(html.includes("https://wa.me/5511999990000"));
  }
});
