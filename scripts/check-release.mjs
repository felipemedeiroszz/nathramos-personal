const mode = process.argv[2];
if (mode !== "staging" && mode !== "production") {
  console.error("Use npm run check:release -- staging ou production.");
  process.exit(2);
}

const problems = [];
const read = (name) => {
  const value = process.env[name]?.trim();
  if (!value || /^<.*>$/.test(value)) {
    problems.push(`${name} ausente.`);
    return "";
  }
  return value;
};

for (const name of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
  "CRON_SECRET",
  "STRIPE_WEBHOOK_SECRET",
  "ASAAS_API_KEY",
  "ASAAS_WEBHOOK_TOKEN",
]) read(name);

const appUrl = read("NEXT_PUBLIC_APP_URL");
if (appUrl) {
  const url = URL.canParse(appUrl) ? new URL(appUrl) : null;
  if (!url || url.protocol !== "https:" || url.username || url.password ||
      url.hostname === "localhost" || url.pathname !== "/" || url.search || url.hash) {
    problems.push("NEXT_PUBLIC_APP_URL deve ser a origem HTTPS do ambiente publicado.");
  }
}

const stripeMode = mode === "production" ? "live" : "test";
for (const [name, prefixes] of [
  ["STRIPE_SECRET_KEY", ["sk", "rk"]],
  ["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", ["pk"]],
]) {
  const value = read(name);
  if (value && !prefixes.some((prefix) => value.startsWith(`${prefix}_${stripeMode}_`))) {
    problems.push(`${name} deve ser do modo ${stripeMode}.`);
  }
}

const asaasMode = mode === "production" ? "production" : "sandbox";
const asaasEnvironment = read("ASAAS_ENVIRONMENT");
if (asaasEnvironment && asaasEnvironment !== asaasMode) {
  problems.push(`ASAAS_ENVIRONMENT deve ser ${asaasMode}.`);
}

const vapid = read("VAPID_PUBLIC_KEY");
const publicVapid = read("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
if (vapid && publicVapid && vapid !== publicVapid) {
  problems.push("VAPID_PUBLIC_KEY e NEXT_PUBLIC_VAPID_PUBLIC_KEY devem coincidir.");
}

if (problems.length) {
  for (const problem of problems) console.error(problem);
  process.exitCode = 1;
} else {
  console.log(`Configuração local de ${mode} aprovada. Valide credenciais, preços e webhooks no ambiente publicado.`);
}
