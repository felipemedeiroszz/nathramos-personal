// Isolated UI fixture. No action, account or database request reaches the application.
import { build } from "esbuild";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
const out = resolve("artifacts/settings-qa");
await mkdir(out, { recursive: true });
const fixture = {
  brand_name_pt: "Marca de teste", brand_name_en: "Test brand", brand_tagline_pt: "Acompanhamento individual", brand_tagline_en: "Individual coaching",
  support_email: "suporte@example.test", support_whatsapp: "5511999990000", support_hours_pt: "Seg a Sex, 8h às 18h", support_hours_en: "Mon-Fri, 8am-6pm",
  maintenance_mode: false, maintenance_duration: 2, maintenance_duration_unit: "hours", maintenance_until: null, maintenance_active: false,
  signup_open: true, trial_days_default: 0, revision: "2026-10-30T12:00:00.000Z",
};
await build({
  stdin: { resolveDir: process.cwd(), loader: "tsx", contents: `
    import React from 'react';import {createRoot} from 'react-dom/client';import {NextIntlClientProvider} from 'next-intl';
    import pt from './src/messages/pt-BR.json';import en from './src/messages/en-US.json';
    import {AdminSettingsClient} from './src/components/admin/settings/AdminSettingsClient';
    import {PublicHeader} from './src/components/shared/PublicHeader';import {PublicFooter} from './src/components/shared/PublicFooter';
    const locale=new URLSearchParams(location.search).get('locale')||'pt-BR';
    window.qa={server:${JSON.stringify(fixture)},fail:false,calls:0};
    function Demo(){const[settings,setSettings]=React.useState(window.qa.server),[status,setStatus]=React.useState(0);
      React.useEffect(()=>{const refresh=()=>{setSettings({...window.qa.server});setStatus(v=>v+1)};const event=()=>setStatus(v=>v+1);window.addEventListener('settings-refresh',refresh);window.addEventListener('settings-test',event);return()=>{window.removeEventListener('settings-refresh',refresh);window.removeEventListener('settings-test',event)}},[]);
      const change=(values)=>{window.qa.server={...window.qa.server,...values,revision:new Date(Date.parse(window.qa.server.revision)+1000).toISOString()};window.dispatchEvent(new Event('settings-refresh'))};
      return <NextIntlClientProvider locale={locale} messages={locale==='en-US'?en:pt} timeZone="America/Sao_Paulo"><div className="admin-shell"><PublicHeader locale={locale} settings={settings}/>
        <main className="mx-auto max-w-5xl px-5 py-8"><h1 className="text-xl font-bold">Teste isolado de Configurações</h1><p className="my-3 text-sm">Nenhuma alteração é enviada ao banco real.</p>
        <div className="my-5 flex flex-wrap gap-3"><button className="rounded border p-2" onClick={()=>{window.qa.fail=!window.qa.fail;setStatus(v=>v+1)}}>Falha de rede: {window.qa.fail?'ligada':'desligada'}</button>
          <button className="rounded border p-2" onClick={()=>change({brand_name_en:'Other session'})}>Simular outra sessão</button>
          <button className="rounded border p-2" onClick={()=>change({maintenance_mode:true,maintenance_until:'2000-01-01T00:00:00Z',maintenance_active:false})}>Simular manutenção vencida</button>
          <output aria-label="Salvamentos do teste">{window.qa.calls}</output></div><AdminSettingsClient settings={settings}/></main><PublicFooter locale={locale} settings={settings}/></div></NextIntlClientProvider>}
    createRoot(document.getElementById('root')).render(<Demo/>);` },
  bundle: true, jsx: "automatic", logOverride: { "duplicate-object-key": "silent" }, outfile: resolve(out, "app.js"), define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{ name: "settings-fixture", setup(b) {
    b.onResolve({ filter: /^(next\/(link|navigation|image)|@\/app\/actions\/settings)$/ }, a => ({ path: a.path, namespace: "fixture" }));
    b.onLoad({ filter: /.*/, namespace: "fixture" }, a => {
      let contents;
      if (a.path === "next/link") contents = `import React from 'react';export default function Link({children,...props}){return <a {...props}>{children}</a>}`;
      else if (a.path === "next/image") contents = `import React from 'react';export default function Image({fill,priority,...props}){return <img {...props} style={fill?{position:'absolute',width:'100%',height:'100%',objectFit:'contain'}:undefined}/>}`;
      else if (a.path === "next/navigation") contents = `const router={refresh:()=>window.dispatchEvent(new Event('settings-refresh')),push:()=>{}};export const useRouter=()=>router;export const usePathname=()=>'/pt-BR/admin/configuracoes';export const useSearchParams=()=>new URLSearchParams();export const useParams=()=>({locale:'pt-BR'});`;
      else contents = `import {platformSettingsSchema} from './src/schemas/settings';export async function savePlatformSettingsAction(input){window.qa.calls++;window.dispatchEvent(new Event('settings-test'));await new Promise(r=>setTimeout(r,300));if(window.qa.fail)throw Error('network');const parsed=platformSettingsSchema.safeParse(input);if(!parsed.success)return {success:false,message:parsed.error.issues[0].message};const p=parsed.data,old=window.qa.server;if(p.revision!==old.revision)return {success:false,message:'As configurações foram alteradas em outra sessão. Recarregue antes de salvar.'};let until=old.maintenance_until;if(!p.maintenance_mode)until=null;else if(!old.maintenance_mode||p.restart_maintenance||p.maintenance_duration!==old.maintenance_duration||p.maintenance_duration_unit!==old.maintenance_duration_unit)until=new Date(Date.now()+p.maintenance_duration*(p.maintenance_duration_unit==='days'?86400000:3600000)).toISOString();const {restart_maintenance,...values}=p;window.qa.server={...old,...values,maintenance_until:until,maintenance_active:p.maintenance_mode&&(!until||Date.parse(until)>Date.now()),revision:new Date(Date.parse(old.revision)+1000).toISOString()};return {success:true,settings:window.qa.server}}`;
      return { contents, loader: "tsx", resolveDir: process.cwd() };
    });
  } }],
});
execFileSync(process.execPath, ["node_modules/tailwindcss/lib/cli.js", "-i", "src/app/globals.css", "-o", resolve(out, "base.css"), "--minify"], { stdio: "pipe" });
await writeFile(resolve(out, "admin.css"), await readFile("src/app/[locale]/admin/admin.css"));
await writeFile(resolve(out, "public.css"), await readFile("src/components/public/public.css"));
await copyFile("public/logo.png", resolve(out, "logo.png"));
await writeFile(resolve(out, "index.html"), '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="base.css"><link rel="stylesheet" href="admin.css"><link rel="stylesheet" href="public.css"></head><body style="font-family:Arial"><div id="root"></div><script src="app.js"></script></body></html>');
await writeFile(resolve(out, "server.mjs"), `import {createServer} from 'node:http';import {readFile} from 'node:fs/promises';import {resolve} from 'node:path';const root=${JSON.stringify(out)};const files={'/':'index.html','/app.js':'app.js','/base.css':'base.css','/admin.css':'admin.css','/public.css':'public.css','/logo.png':'logo.png'};createServer(async(req,res)=>{const path=files[new URL(req.url,'http://localhost').pathname];if(!path){res.writeHead(404);res.end();return;}try{res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':path.endsWith('.png')?'image/png':'text/html');res.end(await readFile(resolve(root,path)));}catch{res.writeHead(500);res.end();}}).listen(3100,'localhost',()=>console.log('SETTINGS_FIXTURE_READY'));`);
console.log(out);
