// Built from action/src by scripts/build-action.ts: edit those and rebuild, not this file.

// action/src/main.ts
import { existsSync } from "node:fs";
import { appendFile, readFile as readFile2 } from "node:fs/promises";
import { isAbsolute, join as join2, relative, resolve as resolve2 } from "node:path";

// apps/site/lib/fix-request.ts
var toFix = (r) => r.checks.filter((c) => c.status === "fail" || c.status === "warn").sort((a, b) => a.status === b.status ? 0 : a.status === "fail" ? -1 : 1);
var REQUEST_RULES = [
  "Don't change what the app does.",
  "Never put a secret key or password in the code: read it from an environment variable.",
  "If a step has to be done outside the code, like revoking a key in a provider's dashboard, list it for me at the end instead of skipping it."
];
var body = (c) => [
  `What's wrong: ${c.detail}`,
  ...c.where?.length ? [`Where: ${c.where.join(", ")}`] : [],
  ...c.fix ? [`How to fix it: ${c.fix}`] : []
];
function fixAllRequest(r) {
  const list = toFix(r);
  if (!list.length) return "";
  const built = r.tool ? `, built with ${r.tool.name}` : "";
  return [
    `My app (${r.repo}${built}) is about to launch, and a launch check found ${list.length === 1 ? "one problem" : `${list.length} problems`}. Fix ${list.length === 1 ? "it" : "each one"} in the code, in this order:`,
    "",
    ...list.flatMap((c, i) => [
      `${i + 1}. ${c.title} (${c.status === "fail" ? "fix before launch" : "worth fixing"})`,
      ...body(c).map((l) => `   ${l}`),
      ""
    ]),
    ...REQUEST_RULES
  ].join("\n");
}

// apps/site/lib/share.ts
var SITE = "https://launchpad.axonscape.com";
var scoreLabel = (score2) => score2 >= 90 ? "Launch-ready" : score2 >= 60 ? "Almost there" : "Needs work";

// packages/cli/src/launch-check.ts
import { execFile } from "node:child_process";
import { lstat, readdir, readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

// apps/site/lib/ai-tools.ts
var TOOL_NAME = { lovable: "Lovable", bolt: "Bolt", v0: "v0", replit: "Replit" };
var depsOf = (pkg) => new Set(Object.keys({ ...pkg?.dependencies, ...pkg?.devDependencies }));
function toolOf(rootFiles, pkg, readme) {
  const d = depsOf(pkg);
  const r = readme ?? "";
  if (d.has("lovable-tagger")) return { tool: "lovable", evidence: "package.json uses lovable-tagger" };
  if (/lovable\.(dev|app)\/projects\//.test(r)) return { tool: "lovable", evidence: "the README links to a Lovable project" };
  if (rootFiles.includes(".bolt")) return { tool: "bolt", evidence: "the repository has a .bolt folder" };
  if (rootFiles.includes(".replit") || rootFiles.includes("replit.nix") || rootFiles.includes("replit.md")) {
    return { tool: "replit", evidence: `the repository has ${["replit.md", ".replit", "replit.nix"].find((f) => rootFiles.includes(f))}` };
  }
  if ([...d].some((x) => x.startsWith("@replit/"))) return { tool: "replit", evidence: "package.json uses Replit's Vite plugins" };
  if (pkg?.name === "my-v0-project") return { tool: "v0", evidence: "package.json is named my-v0-project" };
  if (/\bv0\.(dev|app)\b/.test(r)) return { tool: "v0", evidence: "the README links to v0" };
  return null;
}
var serverRendered = (deps) => deps.has("@tanstack/react-start") || deps.has("@tanstack/start");
var SPA_ROUTERS = ["react-router-dom", "react-router", "wouter", "@tanstack/react-router", "vue-router"];
var singlePageApp = (deps) => deps.has("vite") && !deps.has("next") && !serverRendered(deps) && SPA_ROUTERS.some((r) => deps.has(r));
var SPA_VERCEL_JSON = `${JSON.stringify({ rewrites: [{ source: "/(.*)", destination: "/index.html" }] }, null, 2)}
`;
function serverTarget(rootFiles, deps, config) {
  const preset = /\bpreset\s*:\s*["'`]([\w-]+)["'`]/.exec(config ?? "")?.[1];
  if (preset) {
    const target = /^cloudflare/.test(preset) ? "cloudflare-workers" : /^netlify/.test(preset) ? "netlify" : "nitro";
    return { target, evidence: `the build config sets Nitro's preset to "${preset}"` };
  }
  if (deps.has("@cloudflare/vite-plugin")) return { target: "cloudflare-workers", evidence: "package.json uses @cloudflare/vite-plugin" };
  if (deps.has("@netlify/vite-plugin-tanstack-start")) return { target: "netlify", evidence: "package.json uses Netlify's TanStack Start plugin" };
  if (deps.has("nitro") || deps.has("nitropack")) return { target: "nitro", evidence: `package.json uses ${deps.has("nitro") ? "nitro" : "nitropack"}` };
  const wrangler = rootFiles.find((f) => /^wrangler\.(jsonc?|toml)$/.test(f));
  if (wrangler) return { target: "cloudflare-workers", evidence: `the repository has ${wrangler}` };
  return { target: "none", evidence: "no host is set up in the build" };
}

// apps/site/lib/readiness.ts
var MAX_KEPT_BYTES = 3e7;
var MAX_FILE_BYTES = 2e5;
var MAX_CODE_FILES = 150;
var MAX_SQL_FILES = 30;
var WHERE = 5;
function parseDomain(raw) {
  if (typeof raw !== "string") return void 0;
  const host = raw.trim().toLowerCase().replace(/^[a-z]+:\/\//, "").split(/[/?#]/)[0].replace(/:\d+$/, "").replace(/\.$/, "");
  return /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host) ? host : void 0;
}
var SKIP_DIR = /(^|\/)(node_modules|\.next|\.nuxt|\.svelte-kit|\.vercel|\.turbo|\.git|dist|build|out|coverage|vendor|public|static)\//;
var TEST_FILE = /(^|\/)(__tests__|tests?|e2e|cypress|__mocks__|fixtures?|scripts)\/|\.(test|spec|stories)\.[cm]?[jt]sx?$|(^|\/)(playwright|vitest|jest|cypress|eslint|prettier|tailwind|postcss|commitlint)\.config\.[cm]?[jt]s$/;
var CODE = /\.(?:[cm]?[jt]sx?)$/;
var ENV_FILE = /(^|\/)\.env(?:\.[\w.-]+)?$/;
var ENV_EXAMPLE = /\.(example|sample|template|dist|defaults?)$/i;
var CONFIG = /(^|\/)(next\.config\.[cm]?[jt]s|vercel\.json|netlify\.toml|_headers|middleware\.[jt]s|vite\.config\.[cm]?[jt]s|nitro\.config\.[cm]?[jt]s|astro\.config\.[cm]?[jt]s|svelte\.config\.[cm]?js)$/;
var LOCKFILE = /^(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?)$/;
var SQL = /(^|\/)supabase\/migrations\/[^/]+\.sql$/;
var FIREBASE_RULES = /(^|\/)(firestore\.rules|storage\.rules|database\.rules\.json)$/;
function pick(blobs) {
  const small = blobs.filter((b) => b.size <= MAX_FILE_BYTES && !SKIP_DIR.test(b.path));
  const depth = (p) => p.split("/").length;
  const config = small.filter((b) => /(^|\/)package\.json$/.test(b.path) && depth(b.path) <= 3 || b.path === ".gitignore" || b.path === "README.md" || CONFIG.test(b.path) && depth(b.path) <= 3).map((b) => b.path);
  const env = small.filter((b) => ENV_FILE.test(b.path)).map((b) => b.path);
  const sql = small.filter((b) => (SQL.test(b.path) || FIREBASE_RULES.test(b.path)) && !/(^|\/)(examples?|tests?|__tests__|fixtures?|e2e)\//.test(b.path)).slice(0, MAX_SQL_FILES).map((b) => b.path);
  const rank = (p) => (/(^|\/)(app|pages|src|lib|api|server|routes|utils|actions|components)\//.test(p) ? 0 : 1) * 10 + depth(p);
  const code2 = small.filter((b) => CODE.test(b.path) && !TEST_FILE.test(b.path) && !/\.(min\.js|d\.ts)$/.test(b.path) && !config.includes(b.path)).sort((a, b) => rank(a.path) - rank(b.path) || a.path.localeCompare(b.path)).slice(0, MAX_CODE_FILES).map((b) => b.path);
  return { config, env, sql, code: code2 };
}
function candidate(path) {
  if (SKIP_DIR.test(path)) return false;
  const depth = path.split("/").length;
  if (path === ".gitignore" || path === "README.md" || ENV_FILE.test(path) || SQL.test(path) || FIREBASE_RULES.test(path)) return true;
  if ((/(^|\/)package\.json$/.test(path) || CONFIG.test(path)) && depth <= 3) return true;
  return CODE.test(path) && !TEST_FILE.test(path) && !/\.(min\.js|d\.ts)$/.test(path);
}
var SECRET_PATTERNS = [
  ["Stripe secret key", /\b[sr]k_live_[0-9a-zA-Z]{16,}/],
  ["Stripe test secret key", /\b[sr]k_test_[0-9a-zA-Z]{16,}/],
  ["Stripe webhook secret", /\bwhsec_[0-9a-zA-Z]{24,}/],
  ["Anthropic API key", /\bsk-ant-[A-Za-z0-9_-]{20,}/],
  ["OpenAI API key", /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}/],
  ["AWS access key", /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ["GitHub token", /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})/],
  ["Resend API key", /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}/],
  ["Razorpay secret", /\bRAZORPAY_KEY_SECRET\s*[=:]\s*["']?[A-Za-z0-9]{20,}/],
  ["Slack webhook", /hooks\.slack\.com\/services\/T[A-Za-z0-9]+\/B[A-Za-z0-9]+\/[A-Za-z0-9]{20,}/],
  ["Private key", /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/],
  ["Database URL with a password", /\bpostgres(?:ql)?:\/\/[^\s:@/'"`]+:[^\s@/'"`]{6,}@(?!localhost|127\.0\.0\.1|db\b|postgres\b)[^\s'"`]+/]
];
var JWT = /\beyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g;
var PLACEHOLDER = /x{4,}|\.{3}|your|example|placeholder|changeme|dummy|<|0{8,}|12345678|abcdefgh/i;
function findSecrets(path, text) {
  const out = [];
  text.split("\n").forEach((line, i) => {
    if (line.length > 5e3) return;
    for (const [kind, re] of SECRET_PATTERNS) {
      const m = re.exec(line);
      if (m && !PLACEHOLDER.test(m[0])) out.push({ kind, at: `${path}:${i + 1}` });
    }
    for (const m of line.matchAll(JWT)) {
      try {
        const claims = JSON.parse(Buffer.from(m[1], "base64url").toString("utf8"));
        if (claims.role === "service_role") out.push({ kind: "Supabase service role key", at: `${path}:${i + 1}` });
      } catch {
      }
    }
  });
  return out;
}
var BUILTIN_ENV = /^(NODE_ENV|PORT|HOST|HOSTNAME|CI|TZ|PWD|HOME|VERCEL|VERCEL_[A-Z_]+|NEXT_RUNTIME|NEXT_PHASE|NEXT_PUBLIC_VERCEL_[A-Z_]+|DEV|PROD|MODE|SSR|BASE_URL|RENDER|RENDER_[A-Z_]+|CF_PAGES[A-Z_]*|npm_[a-z_]+)$/;
var PUBLIC_PREFIX = /^(NEXT_PUBLIC_|VITE_|PUBLIC_|EXPO_PUBLIC_|REACT_APP_|NUXT_PUBLIC_)/;
var SECRET_NAME = /(SECRET|SERVICE_ROLE|PRIVATE_KEY|PASSWORD|OPENAI|ANTHROPIC|RESEND|DATABASE_URL|STRIPE_SK)/;
var LOCALHOST_USE = /(fetch|axios(\.\w+)?|ky|got|redirect\w*|href|location(\.href)?|new URL|callbackURL|callbackUrl|emailRedirectTo|redirectTo|baseURL|baseUrl|apiUrl|API_URL|endpoint|url)\s*[(:=]\s*\(?\s*["'`]https?:\/\/(localhost|127\.0\.0\.1)\b/i;
var HEADER_NAMES = /(Content-Security-Policy|Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options)/i;
var STACK = [
  ["Next.js", /^next$/],
  ["TanStack Start", /^@tanstack\/(react-)?start$/],
  ["Vite", /^vite$/],
  ["Astro", /^astro$/],
  ["Remix", /^@remix-run\//],
  ["SvelteKit", /^@sveltejs\/kit$/],
  ["Express", /^express$/],
  ["Supabase", /^@supabase\/(supabase-js|ssr)$/],
  ["Prisma", /^(@prisma\/client|prisma)$/],
  ["Drizzle", /^drizzle-orm$/],
  ["Firebase", /^firebase$/],
  ["Clerk", /^@clerk\//],
  ["Auth.js", /^(next-auth|@auth\/core)$/],
  ["Stripe", /^stripe$/],
  ["Razorpay", /^razorpay$/],
  ["Resend", /^resend$/],
  ["Nodemailer", /^nodemailer$/],
  ["SendGrid", /^@sendgrid\/mail$/],
  ["Postmark", /^postmark$/],
  ["OpenAI", /^openai$/],
  ["Anthropic", /^@anthropic-ai\/sdk$/],
  ["Vercel AI SDK", /^ai$/],
  ["Upstash", /^@upstash\//],
  ["Sentry", /^@sentry\//]
];
function lineOf(text, re) {
  const i = text.search(re);
  return i < 0 ? 0 : text.slice(0, i).split("\n").length;
}
function analyse(blobs, files, env, sql) {
  const checks = [];
  const add = (c) => checks.push(c);
  const all = [...files.entries()].sort(([a], [b]) => a.localeCompare(b));
  const code2 = all.filter(([p]) => CODE.test(p) && !CONFIG.test(p));
  const pkgs = all.filter(([p]) => /(^|\/)package\.json$/.test(p)).map(([p, t]) => {
    try {
      return { path: p, json: JSON.parse(t) };
    } catch {
      return { path: p, json: {} };
    }
  });
  const deps = new Set(pkgs.flatMap((p) => [...Object.keys(p.json.dependencies ?? {}), ...Object.keys(p.json.devDependencies ?? {})]));
  const imports = new Set(code2.flatMap(([, t]) => [...t.matchAll(/(?:from\s+|require\()\s*["']([^"'./][^"']*)["']/g)].map((m) => m[1].startsWith("@") ? m[1].split("/").slice(0, 2).join("/") : m[1].split("/")[0])));
  const uses = (re) => [...deps, ...imports].some((d) => re.test(d));
  const stack = STACK.filter(([, re]) => uses(re)).map(([n]) => n);
  const anyCode = (re) => code2.some(([, t]) => re.test(t));
  const places = (list, re) => list.filter(([, t]) => re.test(t)).slice(0, WHERE).map(([p, t]) => `${p}:${lineOf(t, re)}`);
  const secrets = all.flatMap(([p, t]) => findSecrets(p, t));
  const realEnv = env.filter((p) => !ENV_EXAMPLE.test(p));
  if (secrets.length) {
    const kinds = [...new Set(secrets.map((s) => s.kind))];
    add({
      id: "secrets",
      group: "Security",
      title: "Secret keys committed to the repo",
      status: "fail",
      detail: `Found ${secrets.length === 1 ? "a secret" : `${secrets.length} secrets`} in the code: ${kinds.join(", ")}. Anyone who can read the repo can use ${secrets.length === 1 ? "it" : "them"}.`,
      fix: "Revoke and replace each key in its provider's dashboard now (deleting it from the code isn't enough: it stays in git history). Then read keys from environment variables.",
      where: secrets.slice(0, WHERE).map((s) => s.at),
      launchpad: true
    });
  } else {
    add({ id: "secrets", group: "Security", title: "No secret keys in the code", status: "pass", detail: "None of the files read contain a recognisable API key, private key or password." });
  }
  if (realEnv.length) {
    add({
      id: "env-files",
      group: "Security",
      title: ".env file committed",
      status: "fail",
      detail: `${realEnv.length === 1 ? "A .env file is" : `${realEnv.length} .env files are`} in the repo. These usually hold real keys.`,
      fix: "Remove the file from git (git rm --cached), add .env* to .gitignore, and rotate any keys it held. Keep a .env.example with names only.",
      where: realEnv.slice(0, WHERE),
      launchpad: true
    });
  }
  const gitignore = files.get(".gitignore");
  if (gitignore === void 0) {
    add({ id: "gitignore", group: "Security", title: "No .gitignore", status: "warn", detail: "Without one, .env files and build output are easy to commit by mistake.", fix: "Add a .gitignore that includes .env*, node_modules and your build folder." });
  } else if (!gitignore.split("\n").some((l) => /^\s*\/?(\*\*\/)?\.env(\*|\.\*|\.local|\b)/.test(l) || /^\s*\*\.env/.test(l))) {
    add({ id: "gitignore", group: "Security", title: ".env files aren't ignored by git", status: "warn", detail: ".gitignore has no rule for .env files, so a key file can be committed by accident.", fix: "Add .env* to .gitignore (and !.env.example if you keep an example file)." });
  }
  const envNames = /* @__PURE__ */ new Set();
  const nameRefs = /* @__PURE__ */ new Map();
  for (const [p, t] of code2) {
    for (const m of t.matchAll(/(?:process\.env|import\.meta\.env)(?:\.([A-Z][A-Z0-9_]*)|\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\])/g)) {
      const n = m[1] ?? m[2];
      envNames.add(n);
      if (!nameRefs.has(n)) nameRefs.set(n, `${p}:${t.slice(0, m.index).split("\n").length}`);
    }
  }
  const documented = /* @__PURE__ */ new Set();
  for (const p of env) for (const m of (files.get(p) ?? "").matchAll(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/gm)) {
    documented.add(m[1]);
    if (!nameRefs.has(m[1])) nameRefs.set(m[1], p);
  }
  const exposed = [.../* @__PURE__ */ new Set([...envNames, ...documented])].filter((n) => PUBLIC_PREFIX.test(n) && SECRET_NAME.test(n.replace(PUBLIC_PREFIX, "")) && !/ANON|PUBLISHABLE|PUBLIC_KEY|SITE_KEY/.test(n));
  if (exposed.length) {
    add({
      id: "public-secrets",
      group: "Security",
      title: "Secrets exposed to the browser",
      status: "fail",
      detail: `${exposed.slice(0, 6).join(", ")} ${exposed.length === 1 ? "has" : "have"} a public prefix, so ${exposed.length === 1 ? "its value is" : "their values are"} bundled into the JavaScript every visitor downloads.`,
      fix: "Rename without the public prefix and use the value on the server only (an API route or server action). Rotate the key, since it has already shipped.",
      where: exposed.slice(0, WHERE).map((n) => nameRefs.get(n) ?? n)
    });
  }
  if (uses(/^@supabase\//)) {
    const sqlText = sql.filter((p) => SQL.test(p)).map((p) => [p, files.get(p) ?? ""]);
    if (!sqlText.length) {
      add({ id: "rls", group: "Security", title: "Check Row Level Security in Supabase", status: "info", detail: "The app uses Supabase but the repo has no supabase/migrations, so the tables couldn't be checked.", fix: "In Supabase → Table editor, make sure every table shows RLS enabled, with policies for who can read and write." });
    } else {
      const norm = (n) => n.replace(/"/g, "").replace(/^public\./, "").toLowerCase();
      const created = /* @__PURE__ */ new Map();
      const secured = /* @__PURE__ */ new Set();
      for (const [p, t] of sqlText) {
        for (const m of t.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?([\w."]+)/gi)) if (!/^auth\.|^storage\./.test(norm(m[1]))) created.set(norm(m[1]), `${p}:${t.slice(0, m.index).split("\n").length}`);
        for (const m of t.matchAll(/alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?([\w."]+)\s+enable\s+row\s+level\s+security/gi)) secured.add(norm(m[1]));
      }
      const open = [...created.keys()].filter((n) => !secured.has(n));
      if (open.length) {
        add({
          id: "rls",
          group: "Security",
          title: "Tables without Row Level Security",
          status: "fail",
          detail: `${open.slice(0, 8).join(", ")} ${open.length === 1 ? "doesn't" : "don't"} enable RLS. With Supabase, the public anon key can then read and change every row.`,
          fix: 'Run "alter table <name> enable row level security;" for each, and add policies for who may read and write.',
          where: open.slice(0, WHERE).map((n) => created.get(n))
        });
      } else if (created.size) {
        add({ id: "rls", group: "Security", title: "Row Level Security is on", status: "pass", detail: `All ${created.size} table${created.size === 1 ? "" : "s"} in the migrations enable RLS.` });
      }
    }
  }
  const clientFile = ([p, t]) => /^\s*["']use client["']/m.test(t) || !stack.includes("Next.js") && stack.some((s) => ["Vite"].includes(s)) && !/(^|\/)(api|server|functions|supabase\/functions)\//.test(p);
  const adminInBrowser = code2.filter((f) => clientFile(f) && /SERVICE_ROLE|service_role/.test(f[1]));
  if (uses(/^@supabase\//) && adminInBrowser.length) {
    add({
      id: "service-role-client",
      group: "Security",
      title: "Supabase admin key used in browser code",
      status: "fail",
      detail: "The service-role key skips every Row Level Security rule. Code that runs in the browser uses it, so anyone who opens the app can take it and read, change or delete everything in the database.",
      fix: "Use the anon key in the browser and keep the service-role key in server code only (an API route, server action or edge function). Then rotate it in Supabase → Settings → API, since it has already shipped.",
      where: adminInBrowser.slice(0, WHERE).map(([p, t]) => `${p}:${lineOf(t, /SERVICE_ROLE|service_role/)}`)
    });
  }
  if (uses(/^@supabase\//)) {
    const open = [];
    for (const p of sql.filter((x) => SQL.test(x))) {
      const t = files.get(p) ?? "";
      for (const m of t.matchAll(/create\s+policy\s+("[^"]*"|\w+)\s+on\s+([\w."]+)([^;]*);/gi)) {
        const body2 = m[3].toLowerCase().replace(/\s+/g, " ");
        const writes = /\bfor (all|insert|update|delete)\b/.test(body2) || !/\bfor (select)\b/.test(body2);
        const anyone = /using \(\s*true\s*\)|with check \(\s*true\s*\)/.test(body2);
        if (writes && anyone) open.push(`${p}:${t.slice(0, m.index).split("\n").length}`);
      }
    }
    if (open.length) {
      add({
        id: "rls-open",
        group: "Security",
        title: "Policies that let anyone change data",
        status: "fail",
        detail: `${open.length === 1 ? "A policy allows" : `${open.length} policies allow`} writes with "using (true)" or "with check (true)", which means anyone, signed in or not. Row Level Security is on, but it isn't protecting anything.`,
        fix: `Tie each write policy to the user, e.g. "using (auth.uid() = user_id)". Keep "true" only on read policies for data that's meant to be public.`,
        where: open.slice(0, WHERE)
      });
    }
  }
  const rules = [...files.entries()].filter(([p]) => FIREBASE_RULES.test(p));
  const openRules = rules.filter(([, t]) => /allow\s+(read\s*,\s*)?write[^;]*:\s*if\s+true\s*;|allow\s+read\s*,\s*write\s*;|"\.write"\s*:\s*true|request\.time\s*<\s*timestamp\.date\(/.test(t));
  if (openRules.length) {
    add({
      id: "firebase-rules",
      group: "Security",
      title: "Firebase rules let anyone write",
      status: "fail",
      detail: "The security rules allow writes from anyone, or are the test-mode rules that open everything until a date (after which the app stops working). Anyone with the project's public config can change or delete the data.",
      fix: 'Require a signed-in user and match it to the document, e.g. "allow write: if request.auth != null && request.auth.uid == userId". Deploy the rules with firebase deploy --only firestore:rules.',
      where: openRules.slice(0, WHERE).map(([p, t]) => `${p}:${lineOf(t, /if\s+true|"\.write"\s*:\s*true|request\.time|allow\s+read\s*,\s*write\s*;/)}`)
    });
  } else if (rules.length) {
    add({ id: "firebase-rules", group: "Security", title: "Firebase rules aren't open", status: "pass", detail: "The security rules don't allow writes from anyone." });
  }
  const aiInBrowser = code2.filter(([, t]) => /dangerouslyAllowBrowser\s*:\s*true/.test(t));
  if (aiInBrowser.length) {
    add({
      id: "ai-browser",
      group: "Security",
      title: "AI API key sent to the browser",
      status: "fail",
      detail: "The OpenAI or Anthropic client is created with dangerouslyAllowBrowser, so the API key is in the page. Anyone can copy it and run requests on your account until it's revoked.",
      fix: "Call the AI from a server route that holds the key, and have the browser call that route. Revoke the exposed key.",
      where: aiInBrowser.slice(0, WHERE).map(([p, t]) => `${p}:${lineOf(t, /dangerouslyAllowBrowser/)}`)
    });
  }
  const AUTH = /\b(auth\(\)|getServerSession|getSession|getUser\(|currentUser|getAuth|clerkClient|requireUser|requireAuth|verifyToken|jwtVerify|jwt\.verify|verifyIdToken|supabase\.auth|validateRequest|withAuth|protect\(|isAdmin|authorization|x-api-key|constructEvent|validateWebhookSignature|createHmac)/i;
  const WRITES = /\.from\([^)]*\)\s*\.\s*(insert|update|upsert|delete)\(|\bprisma\.\w+\.(create|update|upsert|delete)(Many)?\(|\bdb\.(insert|update|delete)\(|\b(setDoc|updateDoc|deleteDoc|addDoc)\(/;
  const serverEntry = ([p, t]) => /(^|\/)app\/(.+\/)?route\.[cm]?[jt]s$/.test(p) || /(^|\/)pages\/api\//.test(p) || /^\s*["']use server["']/m.test(t);
  const middleware = [...files.entries()].find(([p]) => /(^|\/)middleware\.[jt]s$/.test(p));
  const guardedByMiddleware = middleware ? AUTH.test(middleware[1]) || /clerkMiddleware|withAuth|updateSession|NextAuth/.test(middleware[1]) : false;
  const unguarded = code2.filter((f) => serverEntry(f) && WRITES.test(f[1]) && !AUTH.test(f[1]) && !/webhook/i.test(f[0]));
  if (unguarded.length && !guardedByMiddleware) {
    add({
      id: "unauth-writes",
      group: "Security",
      title: "Endpoints that change data without checking who's asking",
      status: "warn",
      detail: `${unguarded.length === 1 ? "A route or server action writes" : `${unguarded.length} routes or server actions write`} to the database and never check who's signed in. Anyone who finds the address can call ${unguarded.length === 1 ? "it" : "them"} directly, not just your own pages.`,
      fix: "At the top of each, get the signed-in user and stop if there isn't one (or if it isn't the owner of what's being changed). Public forms, like a contact form, are fine without, but add a bot check.",
      where: unguarded.slice(0, WHERE).map(([p, t]) => `${p}:${lineOf(t, WRITES)}`)
    });
  }
  const adminPages = code2.filter(([p]) => /(^|\/)(app|pages|src\/app|src\/pages|routes)\/(.+\/)?admin(\/|\.)/.test(p));
  if (adminPages.length && !guardedByMiddleware && !adminPages.some(([, t]) => AUTH.test(t))) {
    add({
      id: "admin",
      group: "Security",
      title: "Admin pages with no sign-in check",
      status: "warn",
      detail: "The app has admin pages, and neither they nor a middleware check who's signed in. Hiding the link isn't protection: the address is easy to guess.",
      fix: "Check the user is signed in and is an admin in the admin layout or a middleware, and redirect everyone else.",
      where: adminPages.slice(0, WHERE).map(([p]) => p)
    });
  }
  const AI_CALL = /\.(chat\.completions\.create|responses\.create|messages\.create|images\.generate)\(|\b(generateText|streamText|generateObject|streamObject)\(/;
  const aiRoutes = code2.filter((f) => serverEntry(f) && AI_CALL.test(f[1]));
  const limited = uses(/^@upstash\/ratelimit$|rate-?limit|^limiter$|^bottleneck$/i) || anyCode(/ratelimit|rateLimit|rate_limit|Ratelimit/);
  if (aiRoutes.length && !limited) {
    add({
      id: "ai-limit",
      group: "Security",
      title: "Anyone can run up your AI bill",
      status: "warn",
      detail: `${aiRoutes.length === 1 ? "An endpoint calls" : `${aiRoutes.length} endpoints call`} an AI model with no rate limit. A bot, or one person with a loop, can make thousands of requests, and the provider bills you for every one.`,
      fix: "Limit requests per user or IP (for example @upstash/ratelimit with Redis), require sign-in for anything expensive, and set a monthly spending cap in the AI provider's dashboard.",
      where: aiRoutes.slice(0, WHERE).map(([p, t]) => `${p}:${lineOf(t, AI_CALL)}`)
    });
  }
  if (uses(/^stripe$/)) {
    const hooks = code2.filter(([p, t]) => /webhook/i.test(p) || /stripe-signature|checkout\.session\.completed|customer\.subscription\./.test(t));
    if (!hooks.length) {
      add({ id: "stripe-webhook", group: "Security", title: "No Stripe webhook handler", status: "warn", detail: "The app uses Stripe but no webhook handler was found, so subscriptions won't update when a payment succeeds, fails or is cancelled.", fix: "Add a webhook route that verifies the signature with stripe.webhooks.constructEvent and updates your database.", launchpad: true });
    } else if (!anyCode(/constructEvent(Async)?\s*\(/)) {
      add({ id: "stripe-webhook", group: "Security", title: "Stripe webhooks aren't verified", status: "fail", detail: `A webhook handler exists but never checks Stripe's signature, so anyone can post a fake "payment succeeded" event.`, fix: "Verify every event with stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET) before acting on it.", where: hooks.slice(0, WHERE).map(([p]) => p) });
    } else {
      add({ id: "stripe-webhook", group: "Security", title: "Stripe webhooks are verified", status: "pass", detail: "The webhook handler checks Stripe's signature." });
    }
  }
  if (uses(/^razorpay$/)) {
    const hooks = code2.filter(([p, t]) => /webhook/i.test(p) || /x-razorpay-signature/i.test(t));
    if (hooks.length && !anyCode(/validateWebhookSignature|createHmac/)) {
      add({ id: "razorpay-webhook", group: "Security", title: "Razorpay webhooks aren't verified", status: "fail", detail: "A webhook handler exists but doesn't check the X-Razorpay-Signature header, so payment events can be faked.", fix: "Verify each event with Razorpay's validateWebhookSignature (or an HMAC-SHA256 of the raw body with your webhook secret).", where: hooks.slice(0, WHERE).map(([p]) => p) });
    } else if (hooks.length) {
      add({ id: "razorpay-webhook", group: "Security", title: "Razorpay webhooks are verified", status: "pass", detail: "The webhook handler checks Razorpay's signature." });
    }
  }
  const headerFiles = all.filter(([p]) => CONFIG.test(p));
  if (headerFiles.some(([, t]) => HEADER_NAMES.test(t)) || anyCode(/Content-Security-Policy|Strict-Transport-Security/i) || uses(/^helmet$/)) {
    add({ id: "headers", group: "Security", title: "Security headers are set", status: "pass", detail: "The app sets security headers such as a Content Security Policy." });
  } else if (pkgs.length) {
    add({ id: "headers", group: "Security", title: "No security headers", status: "warn", detail: "No Content-Security-Policy, Strict-Transport-Security or X-Frame-Options headers were found. They block whole classes of attacks such as clickjacking and injected scripts.", fix: stack.includes("Next.js") ? "Return them from headers() in next.config." : "Set them in your host's config (vercel.json, _headers) or your server.", launchpad: true });
  }
  const forms = code2.filter(([p, t]) => /\.[jt]sx$/.test(p) && /<form\b/.test(t));
  if (forms.length) {
    const guarded = uses(/turnstile|recaptcha|hcaptcha|^botid$/i) || anyCode(/turnstile|recaptcha|hcaptcha|cf-turnstile/i);
    add(guarded ? { id: "bot", group: "Security", title: "Forms have a bot check", status: "pass", detail: "A bot check (Turnstile, reCAPTCHA or hCaptcha) is in use." } : { id: "bot", group: "Security", title: "Forms have no bot check", status: "warn", detail: `${forms.length} component${forms.length === 1 ? " has a form" : "s have forms"} with no bot check. Sign-up and contact forms are the first thing spam bots find.`, fix: "Add Cloudflare Turnstile (free) and verify its token on the server.", where: forms.slice(0, WHERE).map(([p]) => p), launchpad: true });
  }
  const undocumented = [...envNames].filter((n) => !BUILTIN_ENV.test(n) && !documented.has(n)).sort();
  if (undocumented.length) {
    const hasExample = env.some((p) => ENV_EXAMPLE.test(p));
    add({
      id: "env-vars",
      group: "Launch",
      title: `${undocumented.length} environment variable${undocumented.length === 1 ? "" : "s"} not listed`,
      status: "warn",
      detail: `The code reads ${undocumented.slice(0, 8).join(", ")}${undocumented.length > 8 ? " and more" : ""}, which ${undocumented.length === 1 ? "isn't" : "aren't"} ${hasExample ? "in your .env.example" : "listed in any .env.example"}. A missing one is the most common reason an app works locally and breaks once deployed.`,
      fix: "List every variable in .env.example (names only) and set each one for production and previews.",
      where: undocumented.slice(0, WHERE).map((n) => nameRefs.get(n)),
      launchpad: true
    });
  } else if (envNames.size) {
    add({ id: "env-vars", group: "Launch", title: "Environment variables are listed", status: "pass", detail: `All ${envNames.size} variables the code reads are in .env.example or provided by the host.` });
  }
  const hostLines = [];
  for (const [p, t] of code2) {
    t.split("\n").forEach((l, i) => {
      if (hostLines.length < WHERE && LOCALHOST_USE.test(l) && !/process\.env|import\.meta\.env|\?\?|\|\|/.test(l) && !/^\s*(\/\/|\*)/.test(l)) hostLines.push(`${p}:${i + 1}`);
    });
  }
  if (hostLines.length) {
    add({ id: "localhost", group: "Launch", title: "Hard-coded localhost URLs", status: "warn", detail: "Some code points at localhost, which doesn't exist in production: links, API calls or sign-in redirects there will fail.", fix: "Read the site's address from an environment variable (e.g. NEXT_PUBLIC_SITE_URL) instead.", where: hostLines });
  }
  const root = pkgs.find((p) => p.path === "package.json");
  if (!pkgs.length) {
    add({ id: "package", group: "Launch", title: "No package.json found", status: "info", detail: "This check is tuned for JavaScript and TypeScript apps, so some checks were skipped." });
  } else {
    const rootDeps = Object.keys({ ...root?.json.dependencies, ...root?.json.devDependencies });
    if (root && !root.json.scripts?.build && rootDeps.some((d) => /^(next|vite|astro|@sveltejs\/kit|@remix-run\/dev)$/.test(d))) {
      add({ id: "build", group: "Launch", title: "No build script", status: "fail", detail: `package.json has no "build" script, so hosts don't know how to build the app.`, fix: `Add the framework's build command, e.g. "build": "next build".` });
    }
    const lock = blobs.some((b) => LOCKFILE.test(b.path));
    add(lock ? { id: "lockfile", group: "Launch", title: "Dependencies are locked", status: "pass", detail: "A lockfile pins exact versions, so production builds match yours." } : { id: "lockfile", group: "Launch", title: "No lockfile", status: "warn", detail: "Without package-lock.json (or pnpm, yarn or bun's), each deploy can install different versions than you tested.", fix: "Commit the lockfile your package manager creates." });
  }
  const health = blobs.some((b) => /(^|\/)(api\/)?health[z]?(\/route|\/index)?\.[cm]?[jt]s$/.test(b.path)) || anyCode(/["'`]\/(api\/)?healthz?["'`]/);
  if (pkgs.length) {
    add(health ? { id: "health", group: "Launch", title: "Has a health check", status: "pass", detail: "Uptime monitors can check a health URL to know the app and its database are up." } : { id: "health", group: "Launch", title: "No health check URL", status: "warn", detail: "Without one, you find out the app is down when a customer tells you.", fix: "Add /api/health that returns 200 when the app (and its database) are working, and point an uptime monitor at it.", launchpad: true });
  }
  const rootNames = [...new Set(blobs.map((b) => b.path.split("/")[0]))];
  const found = toolOf(rootNames, root?.json ?? null, files.get("README.md") ?? null);
  const tool = found ? { id: found.tool, name: TOOL_NAME[found.tool], evidence: found.evidence } : void 0;
  const hasPath = (re) => blobs.some((b) => re.test(b.path));
  const text = (re) => all.filter(([p]) => re.test(p)).map(([, t]) => t).join("\n");
  if (singlePageApp(deps) && !rootNames.includes("server") && !deps.has("express")) {
    const routed = /"(rewrites|routes)"\s*:/.test(text(/(^|\/)vercel\.json$/)) || /\[\[redirects\]\]/.test(text(/(^|\/)netlify\.toml$/)) || hasPath(/(^|\/)_redirects$/);
    const router = SPA_ROUTERS.find((r) => deps.has(r));
    add(routed ? { id: "spa-routes", group: "Launch", title: "Deep links reach the app", status: "pass", detail: "The host is told to send every page's address to the app, so opening or refreshing /dashboard works." } : {
      id: "spa-routes",
      group: "Launch",
      title: "Pages other than the home page will show 404",
      status: "warn",
      detail: `The app has its own pages (it uses ${router}) and is built to plain files. Opening one directly, refreshing it, or following a shared link to it asks the host for a file that doesn't exist, so Vercel and Netlify answer 404.`,
      fix: `Add vercel.json at the top of the repository: ${SPA_VERCEL_JSON.replace(/\s+/g, " ").trim()} (on Netlify, a public/_redirects file with "/* /index.html 200"). Cloudflare Pages does this by itself.`,
      where: [root?.path ?? "package.json"]
    });
  }
  if (serverRendered(deps)) {
    const { target, evidence } = serverTarget(rootNames, deps, text(/(^|\/)(vite|nitro)\.config\.[cm]?[jt]s$/) || null);
    const where = all.filter(([p]) => /(^|\/)(vite|nitro)\.config\.[cm]?[jt]s$/.test(p)).map(([p]) => p).slice(0, WHERE);
    if (target === "nitro") {
      add({ id: "ssr-host", group: "Launch", title: "Server rendering is set up to deploy", status: "pass", detail: `It's a TanStack Start app, and ${evidence}: Vercel and Node servers run it as it is.` });
    } else {
      const on = target === "cloudflare-workers" ? "Cloudflare Workers" : target === "netlify" ? "Netlify" : null;
      add({
        id: "ssr-host",
        group: "Launch",
        title: on ? `Built to run on ${on} only` : "Its server code has nowhere to run",
        status: "warn",
        detail: `It's a TanStack Start app, which makes each page on a server, and ${evidence}. ${on ? `That runs on ${on}; on Vercel every page shows 404, and a Node server can't start it.` : "Without a host set up in the build, Vercel and Node servers can't start it, so every page shows 404."}`,
        fix: `To deploy ${on ? "anywhere else" : "it"}, build it with Nitro, which Vercel and Node servers run: npm i nitro, then add nitro() from "nitro/vite" to the Vite plugins beside tanstackStart(), with no preset written in.${on === "Cloudflare Workers" ? " Deploying to Cloudflare Workers with wrangler works as it is." : ""}`,
        ...where.length ? { where } : {}
      });
    }
    if (/"destination"\s*:\s*"\/index\.html"/.test(text(/(^|\/)vercel\.json$/))) {
      add({
        id: "ssr-rewrite",
        group: "Launch",
        title: "vercel.json sends every page to index.html",
        status: "warn",
        detail: "That rewrite is for single-page apps. This app makes its pages on a server and has no index.html to send them to.",
        fix: "Remove the rewrite from vercel.json, or the whole file if that's all it holds.",
        where: all.filter(([p]) => /(^|\/)vercel\.json$/.test(p)).map(([p]) => p).slice(0, WHERE)
      });
    }
  }
  const exact = new Set(blobs.map((b) => b.path));
  const byLower = new Map(blobs.map((b) => [b.path.toLowerCase(), b.path]));
  const pkgRoots = pkgs.map((p) => p.path.replace(/package\.json$/, "")).sort((a, b) => b.length - a.length);
  const EXTS = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", "/index.ts", "/index.tsx", "/index.js", "/index.jsx"];
  const resolve3 = (parts) => parts.reduce((out, seg) => seg === ".." ? out.slice(0, -1) : seg === "." || seg === "" ? out : [...out, seg], []).join("/");
  const misCased = [];
  let example = "";
  for (const [p, t] of code2) {
    const pkgRoot = pkgRoots.find((r) => p.startsWith(r)) ?? "";
    for (const m of t.matchAll(/(?:\bfrom\s+|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)["']((?:\.{1,2}\/|@\/)[^"'?#]+)/gm)) {
      const spec = m[1];
      const bases = spec.startsWith("@/") ? [`${pkgRoot}src/${spec.slice(2)}`, `${pkgRoot}${spec.slice(2)}`] : [resolve3([...p.split("/").slice(0, -1), ...spec.split("/")])];
      const tries = bases.flatMap((b) => EXTS.map((e) => b + e));
      if (tries.some((x) => exact.has(x))) continue;
      const near = tries.map((x) => byLower.get(x.toLowerCase())).find(Boolean);
      if (!near) continue;
      if (misCased.length < WHERE) misCased.push(`${p}:${t.slice(0, m.index).split("\n").length}`);
      if (!example) example = `"${spec}" is ${near}`;
    }
  }
  if (misCased.length) {
    add({
      id: "import-case",
      group: "Launch",
      title: "Imports that only work on your computer",
      status: "fail",
      detail: `Some imports use different capital letters from the file's name (${example}). Mac and Windows don't mind; the Linux servers that build your app do, so the deploy fails with "Could not resolve".`,
      fix: "Change each import to match the file's name exactly, letter for letter (or rename the file; in git, a rename that only changes case needs git mv -f).",
      where: misCased
    });
  }
  const replitPkgs = [...imports].filter((i) => /^@replit\/(database|object-storage)$/.test(i));
  const replitLogin = code2.filter(([p, t]) => /(^|\/)replitAuth\.[cm]?[jt]s$/.test(p) || /REPLIT_DOMAINS|replit\.com\/oidc/.test(t));
  if (replitPkgs.length || replitLogin.length) {
    const what = [...replitLogin.length ? ["sign-in with Replit accounts"] : [], ...replitPkgs.map((x) => x === "@replit/database" ? "Replit Database" : "Replit Object Storage")];
    add({
      id: "replit-only",
      group: "Launch",
      title: "Uses services that only work on Replit",
      status: "fail",
      detail: `The app relies on ${what.join(" and ")}, which ${what.length === 1 ? "exists" : "exist"} only inside Replit. Anywhere else, ${replitLogin.length ? "nobody can sign in" : "saving and loading data fails"}.`,
      fix: "Before moving it: switch sign-in to Clerk or Supabase Auth, files to Cloudflare R2 or Supabase Storage, and Replit Database records into Postgres. Replit's agent, or your AI tool, can make the change.",
      where: [...replitLogin.map(([p, t]) => `${p}:${lineOf(t, /REPLIT_DOMAINS|replit\.com\/oidc|./)}`), ...code2.filter(([, t]) => /["']@replit\/(database|object-storage)["']/.test(t)).map(([p, t]) => `${p}:${lineOf(t, /@replit\//)}`)].slice(0, WHERE)
    });
  }
  const LISTEN = /\.listen\(\s*(?:\{\s*port\s*:\s*)?(\d{4,5})\b|\bconst\s+port\s*=\s*(\d{4,5})\s*;/;
  const fixedPort = code2.filter(([p, t]) => /\.listen\(/.test(t) && LISTEN.test(t) && !/\bPORT\b/.test(t) && !clientFile([p, t]));
  if (fixedPort.length) {
    const m = LISTEN.exec(fixedPort[0][1]);
    const port = m[1] ?? m[2];
    add({
      id: "port",
      group: "Launch",
      title: `The server always listens on port ${port}`,
      status: "warn",
      detail: "Hosts tell the app which port to use in the PORT variable. A server fixed to one port isn't reached there, and the deploy fails its health check.",
      fix: `Listen on Number(process.env.PORT) || ${port}.`,
      where: fixedPort.slice(0, WHERE).map(([p, t]) => `${p}:${lineOf(t, LISTEN)}`)
    });
  }
  const managers = [...new Set(blobs.filter((b) => LOCKFILE.test(b.path)).map((b) => b.path.startsWith("bun.") ? "bun" : b.path === "package-lock.json" ? "npm" : b.path.split(/[-.]/)[0]))];
  if (managers.length > 1) {
    add({
      id: "lockfiles",
      group: "Launch",
      title: "Lockfiles from more than one package manager",
      status: "info",
      detail: `The repository has lockfiles for ${managers.join(" and ")}. The host picks one by its own rules, which may not be the one you install with, and then installs different versions from the ones you tested.`,
      fix: "Keep the lockfile of the package manager you use and delete the others.",
      where: blobs.filter((b) => LOCKFILE.test(b.path)).map((b) => b.path)
    });
  }
  return { checks, stack, ...tool ? { tool } : {} };
}
async function lookup(deps, name, type) {
  const res = await deps.fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`, { headers: { accept: "application/dns-json" }, redirect: "error", signal: AbortSignal.timeout(5e3) });
  if (!res.ok) {
    await res.body?.cancel();
    throw new Error(`DNS lookup answered ${res.status}`);
  }
  const text = await res.text();
  if (text.length > 2e5) throw new Error("DNS answer too large");
  const json = JSON.parse(text);
  if (json.Status === 3) return [];
  if (json.Status !== 0) throw new Error(`DNS status ${json.Status}`);
  const want = type === "TXT" ? 16 : 15;
  return (json.Answer ?? []).filter((a) => a.type === want && typeof a.data === "string").map((a) => {
    const data = a.data;
    return type === "TXT" ? [...data.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]).join("") || data : data;
  });
}
async function emailChecks(deps, domain, stack) {
  const sends = stack.some((s) => ["Resend", "Nodemailer", "SendGrid", "Postmark"].includes(s));
  if (!domain) {
    return sends ? [{ id: "email", group: "Email", title: "Add your domain to check email", status: "info", detail: "The app sends email. Enter your domain to check that it will reach inboxes (SPF, DKIM and DMARC records)." }] : [];
  }
  let root, dmarc, dkim, mx;
  try {
    [root, dmarc, dkim, mx] = await Promise.all([
      lookup(deps, domain, "TXT"),
      lookup(deps, `_dmarc.${domain}`, "TXT"),
      stack.includes("Resend") ? lookup(deps, `resend._domainkey.${domain}`, "TXT") : Promise.resolve(null),
      lookup(deps, domain, "MX")
    ]);
  } catch {
    return [{ id: "email", group: "Email", title: "Couldn't check email records", status: "info", detail: `The DNS lookup for ${domain} didn't answer. Run the check again in a minute.` }];
  }
  const miss = sends ? "fail" : "warn";
  const out = [];
  const spf = root.find((r) => /^v=spf1\b/i.test(r));
  out.push(spf ? { id: "spf", group: "Email", title: "SPF record found", status: "pass", detail: `${domain} lists which servers may send its email.` } : { id: "spf", group: "Email", title: "No SPF record", status: miss, detail: `${domain} has no SPF record, so ${sends ? "your app's emails are likely to land in spam, and " : ""}anyone can send email pretending to be you.`, fix: "Add the TXT record your email provider gives you (it starts with v=spf1).", launchpad: true });
  const dm = dmarc.find((r) => /^v=DMARC1\b/i.test(r));
  out.push(dm ? { id: "dmarc", group: "Email", title: /p=none/i.test(dm) ? "DMARC is in monitoring mode" : "DMARC record found", status: /p=none/i.test(dm) ? "info" : "pass", detail: /p=none/i.test(dm) ? "DMARC is in monitoring mode (p=none): spoofed mail is reported but still delivered. Fine to start; tighten to quarantine later." : "Mail that fails SPF or DKIM is rejected or quarantined." } : { id: "dmarc", group: "Email", title: "No DMARC record", status: miss, detail: "Gmail and Yahoo now expect a DMARC record from anyone sending email. Without it, mail is more likely to be rejected or marked as spam.", fix: `Add a TXT record at _dmarc.${domain}, e.g. "v=DMARC1; p=none; rua=mailto:you@${domain}".`, launchpad: true });
  if (dkim !== null) {
    out.push(dkim.length ? { id: "dkim", group: "Email", title: "Resend DKIM record found", status: "pass", detail: "Emails sent through Resend are signed for your domain." } : { id: "dkim", group: "Email", title: "Resend isn't verified for this domain", status: "fail", detail: `No DKIM record at resend._domainkey.${domain}, so Resend can't send from this domain yet.`, fix: "In Resend → Domains, add the domain and create the DNS records it lists.", launchpad: true });
  }
  if (!mx.length) {
    out.push({ id: "mx", group: "Email", title: "No inbox for replies", status: "info", detail: `${domain} has no MX record, so replies to your app's emails bounce.`, fix: "Set up email for the domain (Google Workspace, Zoho, Cloudflare Email Routing) or use a reply-to address elsewhere." });
  }
  return out;
}
var WEIGHT = { fail: 15, warn: 5, info: 0, pass: 0 };
var score = (checks) => Math.max(0, 100 - checks.reduce((s, c) => s + WEIGHT[c.status], 0));
async function report(read, meta, domain, deps) {
  const blobs = read.blobs;
  const chosen = pick(blobs);
  const files = /* @__PURE__ */ new Map();
  for (const p of [...chosen.config, ...chosen.env, ...chosen.sql, ...chosen.code]) {
    const text = read.files.get(p);
    if (text !== void 0) files.set(p, text);
  }
  const { checks, stack, tool } = analyse(blobs, files, chosen.env, chosen.sql);
  checks.push(...await emailChecks(deps, domain, stack));
  const order = { fail: 0, warn: 1, info: 2, pass: 3 };
  const groups = ["Security", "Launch", "Email"];
  checks.sort((a, b) => groups.indexOf(a.group) - groups.indexOf(b.group) || order[a.status] - order[b.status]);
  return { ...meta, domain, ...tool ? { tool } : {}, files: blobs.length, scanned: files.size, partial: read.partial, stack, score: score(checks), checks };
}
var FILE_LIMITS = { wanted: candidate, maxFileBytes: MAX_FILE_BYTES, maxKeptBytes: MAX_KEPT_BYTES };
async function runFilesCheck(read, name, domain, deps) {
  return report(read, { repo: name, commit: "" }, domain, deps);
}

// apps/site/lib/fixes.ts
var FIXES = [
  // ---------- deploys that break ----------
  {
    slug: "page-404-on-refresh",
    title: "Pages show 404 when refreshed or opened directly",
    summary: "Your Lovable or Bolt app works from the home page, but /dashboard shows 404 on Vercel or Netlify when you refresh it or open a link to it. One small file fixes it.",
    group: "Deploys that break",
    tools: ["lovable", "bolt"],
    symptom: "The home page loads. Clicking around works. But refresh `/dashboard`, or open a link someone shared to it, and the host answers `404 NOT_FOUND`.",
    cause: "The app is a single-page app: its pages exist only in the browser, drawn by a router (React Router, Wouter). The host is asked for a file called `/dashboard`, has none, and says so. Inside Lovable or Bolt, their hosting sends every address to the app for you.",
    steps: [
      'On Vercel, add a file named `vercel.json` at the top of the repository with: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`',
      "On Netlify, add `public/_redirects` with the line: `/* /index.html 200`",
      "On Cloudflare Pages, you need nothing: it sends unknown addresses to the app by itself.",
      "Commit, push, and open a deep link again."
    ],
    ask: "My app shows 404 when a page other than the home page is refreshed or opened directly on Vercel. Add a vercel.json at the root of the repository that rewrites every path to /index.html, so the router handles it. Don't change anything else.",
    checks: ["spa-routes"],
    launchpad: "The launch check flags it before you deploy, and the console's import wizard hands you the `vercel.json`, or hosts the app on Cloudflare Pages, which needs none.",
    related: ["lovable-tanstack-start-404-on-vercel", "could-not-resolve-works-locally"]
  },
  {
    slug: "lovable-tanstack-start-404-on-vercel",
    title: "New Lovable app shows 404 on every page on Vercel",
    summary: "Lovable projects made since May 2026 use TanStack Start, which renders pages on a server. Built for Cloudflare Workers, they 404 on Vercel until they're built with Nitro.",
    group: "Deploys that break",
    tools: ["lovable"],
    symptom: "Every page on Vercel, the home page included, shows `404 NOT_FOUND`, or the deploy has no pages at all. The `vercel.json` rewrite that fixes older Lovable apps doesn't help, and can make it worse.",
    cause: "Since 13 May 2026, Lovable builds apps with TanStack Start, which makes each page on a server rather than in the browser. Its build says where that server runs. Set up for Cloudflare Workers (`@cloudflare/vite-plugin` and a `wrangler.jsonc`), it produces something Vercel can't run.",
    steps: [
      "Check `package.json` for `@tanstack/react-start`. If it's there, this page is about your app.",
      'Build with Nitro, which Vercel detects and runs: `npm i nitro`, then add `nitro()` from `"nitro/vite"` to the plugins in `vite.config.ts`, beside `tanstackStart()` and `viteReact()`.',
      "Don't write a Nitro preset in, so Vercel is detected by itself.",
      "Remove any `vercel.json` rewrite to `/index.html`: a server-rendered app has no `index.html` to send pages to.",
      "Deploying to Cloudflare Workers with `wrangler` works as the app is."
    ],
    ask: `This TanStack Start app needs to deploy to Vercel, and it's set up to run on Cloudflare Workers. Make its build use Nitro: install nitro and add nitro() from "nitro/vite" to the Vite plugins, beside tanstackStart() and viteReact(). Don't hard-code a Nitro preset, and remove any vercel.json rewrite to /index.html. Keep the app working in Lovable's own preview: only use Nitro when process.env.VERCEL is set. Don't change what the app does.`,
    checks: ["ssr-host", "ssr-rewrite"],
    launchpad: "The launch check reads where the build is set up to run. The console's wizard deploys these apps as TanStack Start on Vercel, and stops before creating anything if the build can't run there, with this request ready to paste into Lovable.",
    related: ["page-404-on-refresh", "move-off-lovable-cloud"]
  },
  {
    slug: "could-not-resolve-works-locally",
    title: "“Could not resolve” on deploy, but it works on my computer",
    summary: "The build fails with Could not resolve './components/navbar' while the app runs fine locally. Usually it's capital letters: Mac and Windows ignore them, the build server doesn't.",
    group: "Deploys that break",
    tools: [],
    symptom: 'The deploy fails with `Could not resolve "./components/navbar" from "src/App.tsx"` (or `Module not found: Can\'t resolve`), yet `npm run dev` and `npm run build` work on your computer.',
    cause: "The import says `navbar` and the file is `Navbar.tsx`. macOS and Windows treat those as the same name; the Linux machines that build your app don't. AI tools write mismatched capitals easily, and nothing on your computer complains. The other cause: the file was never committed.",
    steps: [
      "Find the file the error names, and compare its name with the import letter by letter.",
      "Change the import to match the file's name exactly (or rename the file).",
      "To rename a file only by capital letters in git, use `git mv -f old new`: a plain rename often isn't seen.",
      "Check the file is in the repository on GitHub, not only on your computer."
    ],
    ask: `My app builds on my computer but fails when deployed (on Linux) with "Could not resolve". Find every import whose path differs from the real file's name in capital letters, and make each one match the file exactly. Don't change anything else.`,
    checks: ["import-case"],
    explains: ["The code imports a file that isn’t in the repository"],
    launchpad: "The launch check compares every import with the files in the repository and lists each one that would fail. If a deploy fails anyway, the console explains it in these words, with this request ready to paste.",
    related: ["module-not-found-package-not-installed", "page-404-on-refresh"]
  },
  {
    slug: "module-not-found-package-not-installed",
    title: "“Module not found” on deploy: a package isn't installed",
    summary: "The deploy fails because the code uses a package that isn't in package.json. It worked on your computer because the package happened to be installed there.",
    group: "Deploys that break",
    tools: [],
    symptom: "The build fails with `Cannot find module 'something'` or `Could not resolve \"some-package\"`, for a package the code imports by name.",
    cause: "The package is installed on your computer (by hand, or by another project) but isn't listed in `package.json`, so the build server, which installs only what `package.json` lists, never gets it.",
    steps: [
      "Run `npm install <package>` in the project, so it's added to `package.json`.",
      "Commit `package.json` and the lockfile together, then push."
    ],
    ask: "My app fails to build when deployed because a package it imports isn't installed. Add every package the code imports to package.json (and the lockfile), with the versions the code expects.",
    checks: [],
    explains: ["The package “", "Two packages want different versions of the same thing"],
    launchpad: "When a deploy fails this way, the console names the package and gives this request ready to paste. A committed lockfile, which the launch check looks for, keeps production on the versions you tested.",
    related: ["could-not-resolve-works-locally", "missing-environment-variables-in-production"]
  },
  {
    slug: "missing-environment-variables-in-production",
    title: "Works locally, blank or broken in production: missing environment variables",
    summary: "The deployed app shows a blank page or errors that never happen locally. Usually a key the code reads was set on your computer, or in the AI tool, and never on the host.",
    group: "Deploys that break",
    tools: ["lovable", "bolt", "v0"],
    symptom: "A white screen, `supabaseUrl is required`, `undefined` in place of a value, or sign-in redirecting to `localhost`, only once deployed.",
    cause: "The code reads values like `VITE_SUPABASE_URL` from the environment. Your `.env` file, or the tool's secrets panel, set them where you built it; the new host has none of them. Links or sign-in redirects written as `http://localhost:…` break in the same way.",
    steps: [
      "List every variable the code reads (`process.env.X`, `import.meta.env.X`) in a `.env.example`, names only.",
      "Set each one at the host for production and previews. Values that start with `NEXT_PUBLIC_` or `VITE_` are visible to everyone: never put a secret in one.",
      "Replace hard-coded `localhost` addresses with a variable such as `NEXT_PUBLIC_SITE_URL`.",
      "Redeploy: most hosts only read variables at build time."
    ],
    ask: "My app works locally but not when deployed. List every environment variable the code reads in .env.example (names only, no values), and replace any hard-coded localhost URL with one read from an environment variable. Don't put any secret value in the code.",
    checks: ["env-vars", "localhost"],
    explains: ["The app needs a setting that isn’t there"],
    launchpad: "The launch check lists every variable the code reads that isn't written down. Launchpad sets the keys of every service it creates (database, sign-in, email, storage) in each environment for you.",
    related: ["env-file-committed-to-github", "module-not-found-package-not-installed"]
  },
  {
    slug: "replit-auth-outside-replit",
    title: "Replit Auth and Replit storage don't work outside Replit",
    summary: "An app built by Replit's Agent signs people in with their Replit accounts and keeps files in Replit's storage. Moved anywhere else, nobody can sign in. Change both first.",
    group: "Deploys that break",
    tools: ["replit"],
    symptom: "Deployed outside Replit, sign-in fails (`REPLIT_DOMAINS` isn't set), and saving or loading files errors.",
    cause: "`server/replitAuth.ts` signs people in through Replit's login service, and `@replit/object-storage` and `@replit/database` are Replit's own services. None of them exist outside Replit.",
    steps: [
      "Ask Replit's Agent, or your AI tool, to switch sign-in to Clerk or Supabase Auth.",
      "Move files to Cloudflare R2 or Supabase Storage, and Replit Database records into Postgres.",
      'Bring the Postgres data along: in Replit\'s Shell, `pg_dump -Fc --no-owner --no-privileges "$DATABASE_URL" > replit.dump`.'
    ],
    ask: "This app has to run outside Replit. Replace sign-in with Replit accounts (server/replitAuth.ts, REPLIT_DOMAINS) with Clerk, and replace @replit/object-storage and @replit/database with S3-compatible storage (Cloudflare R2) and Postgres. Keep every page and API route working the same way.",
    checks: ["replit-only"],
    launchpad: "The launch check finds Replit-only services before you move. The console's wizard marks them as blockers, sends the app to your own server (Replit apps are an Express server), and `launchpad db restore` loads the Replit database's dump into the new one.",
    related: ["server-fixed-port-5000", "move-off-lovable-cloud"]
  },
  {
    slug: "server-fixed-port-5000",
    title: "Deploy fails its health check: the server always listens on port 5000",
    summary: "Replit apps listen on port 5000. Other hosts tell the app which port to use in PORT, so a fixed port is never reached and the deploy fails.",
    group: "Deploys that break",
    tools: ["replit"],
    symptom: "The build succeeds, then the deploy times out or fails its health check, and the logs say the server started on port 5000.",
    cause: "Hosts give each app a port in the `PORT` environment variable and send traffic there. A server hard-coded to 5000 listens somewhere nobody calls.",
    steps: ["Change the server to listen on `Number(process.env.PORT) || 5000`, and deploy again."],
    ask: "Make the server listen on the port in the PORT environment variable, falling back to 5000: Number(process.env.PORT) || 5000. Don't change anything else.",
    checks: ["port"],
    launchpad: "The launch check and the console's wizard both point at the line to change.",
    related: ["replit-auth-outside-replit"]
  },
  // ---------- security holes ----------
  {
    slug: "supabase-row-level-security",
    title: "Supabase tables without Row Level Security: anyone can read and change your data",
    summary: "With Row Level Security off, or a policy of using (true), the public anon key in your app lets anyone read, change or delete every row. The app still works, which is why nobody notices.",
    group: "Security holes",
    tools: ["lovable", "bolt"],
    symptom: "Nothing looks wrong: the app works in every test. But anyone can open the browser's developer tools, take the Supabase URL and anon key, and query your tables directly.",
    cause: "Supabase gives the browser a public key and relies on Row Level Security (RLS) to decide what each user may see. A table created without RLS, or with a policy that allows everyone (`using (true)` on an insert, update or delete), protects nothing.",
    steps: [
      "In Supabase → Table editor, make sure every table shows RLS enabled.",
      "For each table, add policies tied to the signed-in user, e.g. `using (auth.uid() = user_id)`.",
      "Keep `using (true)` only for read policies on data that's meant to be public.",
      "Test it: sign in as one user and try to read another's rows."
    ],
    ask: "Enable Row Level Security on every table in the public schema, and add policies so each user can only read and change their own rows (auth.uid() = user_id), with public read access only where data is meant to be public. Add it as a new migration, and don't remove any existing data.",
    checks: ["rls", "rls-open"],
    launchpad: "The launch check reads every migration and lists each table without RLS, and each policy that lets anyone write. Free, for any public repository or zip.",
    related: ["supabase-service-role-key-in-browser", "api-routes-anyone-can-call"]
  },
  {
    slug: "supabase-service-role-key-in-browser",
    title: "Supabase service-role key exposed in the browser",
    summary: "The service-role key skips every Row Level Security rule. Used in browser code, it's handed to every visitor, who can then read, change or delete your whole database.",
    group: "Security holes",
    tools: ["lovable", "bolt"],
    symptom: "Code that runs in the browser creates a Supabase client with `SUPABASE_SERVICE_ROLE_KEY` (or a key whose role is `service_role`).",
    cause: "AI tools reach for the service-role key when a query is blocked by RLS: it makes the error go away by switching security off. In browser code, the key ships to everyone.",
    steps: [
      "Use the anon key in the browser, and fix the RLS policy that blocked the query instead.",
      "Keep the service-role key in server code only: an API route, a server action or an edge function.",
      "Rotate the key in Supabase → Settings → API: it has already shipped."
    ],
    ask: "The Supabase service-role key is used in code that runs in the browser. Move every use of it to server-side code (an API route or edge function), use the anon key in the browser, and make the RLS policies allow what the app needs. Then tell me to rotate the key in Supabase.",
    checks: ["service-role-client", "public-secrets"],
    launchpad: "The launch check finds the key in browser code and secrets behind a public prefix. Launchpad injects the service-role key only under a server-side name.",
    related: ["supabase-row-level-security", "ai-api-key-exposed-in-browser"]
  },
  {
    slug: "ai-api-key-exposed-in-browser",
    title: "OpenAI or Anthropic API key exposed in the browser",
    summary: "An AI client created with dangerouslyAllowBrowser, or a key behind a VITE_ or NEXT_PUBLIC_ prefix, puts your API key in the page, where anyone can copy it and spend on your account.",
    group: "Security holes",
    tools: ["lovable", "bolt", "v0"],
    symptom: "The OpenAI or Anthropic client is created in a component, with `dangerouslyAllowBrowser: true`, or the key is read from `VITE_OPENAI_API_KEY` or `NEXT_PUBLIC_…`.",
    cause: "Anything the browser runs, every visitor can read. A public prefix means the value is bundled into the JavaScript everyone downloads.",
    steps: [
      "Revoke the key in the provider's dashboard now: it has already shipped.",
      "Call the AI from a server route that holds a new key (without a public prefix).",
      "Have the browser call that route, and limit how often each user can."
    ],
    ask: "The AI API key is exposed in the browser. Move every AI call to a server-side API route that reads the key from a server-only environment variable (no VITE_ or NEXT_PUBLIC_ prefix), have the browser call that route, and add a per-user rate limit. Then tell me to revoke the old key.",
    checks: ["ai-browser", "public-secrets"],
    launchpad: "The launch check finds both patterns, and never shows the key itself, only where it is.",
    related: ["ai-bill-rate-limit", "env-file-committed-to-github"]
  },
  {
    slug: "ai-bill-rate-limit",
    title: "Anyone can run up your OpenAI bill",
    summary: "An AI endpoint with no sign-in and no rate limit can be called in a loop by a bot or one curious person, and your AI provider bills you for every request.",
    group: "Security holes",
    tools: ["lovable", "bolt", "v0"],
    symptom: "Your AI provider's usage spikes overnight, or a route like `/api/chat` answers anyone who calls it, as fast as they call.",
    cause: "The route that calls the model checks neither who's asking nor how often. Scripts find routes like that within days.",
    steps: [
      "Require sign-in for anything that costs money.",
      "Limit requests per user or per IP, for example with `@upstash/ratelimit` and Redis.",
      "Set a monthly spending cap in the AI provider's dashboard."
    ],
    ask: "Add a rate limit to every API route that calls an AI model: per signed-in user, or per IP for anonymous use (for example @upstash/ratelimit with Upstash Redis), and require sign-in where the feature allows it. Return a clear 429 when the limit is reached.",
    checks: ["ai-limit"],
    launchpad: "The launch check lists each AI route without a limit. Launchpad can add an Upstash Redis for the limiter, and the console tracks this month's OpenAI and Anthropic spend with a budget alert.",
    related: ["ai-api-key-exposed-in-browser", "api-routes-anyone-can-call"]
  },
  {
    slug: "env-file-committed-to-github",
    title: ".env file and API keys committed to GitHub",
    summary: "A .env file exported with the code puts every key in it where anyone with access to the repository can read them, and deleting the file doesn't remove them from git history.",
    group: "Security holes",
    tools: ["bolt", "lovable"],
    symptom: "The repository has a `.env` file, or keys written straight into the code (`sk_live_…`, `re_…`, a database URL with its password).",
    cause: "Some tools export the `.env` with the project, and the `.gitignore` Vite starts with doesn't cover `.env` files. Once committed, a key stays in the history even after the file is deleted.",
    steps: [
      "Revoke and replace every key the file held, in each provider's dashboard.",
      "Remove the file from git (`git rm --cached .env`) and add `.env*` to `.gitignore` (with `!.env.example` if you keep one).",
      "Set the new values at the host instead."
    ],
    ask: "Remove .env from the repository (keep it locally), add .env* to .gitignore with !.env.example, create a .env.example listing every variable with no values, and make sure no key or password is written in the code. Then list every key I need to revoke and replace.",
    checks: ["env-files", "secrets", "gitignore"],
    launchpad: "The launch check finds committed keys by their shape and reports the file and line, never the value. Launchpad keeps every key out of the repository: they're set at the host, per environment.",
    related: ["missing-environment-variables-in-production", "ai-api-key-exposed-in-browser"]
  },
  {
    slug: "api-routes-anyone-can-call",
    title: "API routes and admin pages anyone can call",
    summary: "Routes and server actions that change data without checking who's signed in, and admin pages hidden only by not linking to them, are open to anyone who finds the address.",
    group: "Security holes",
    tools: ["v0", "lovable", "bolt"],
    symptom: "An `/api` route or server action writes to the database with no sign-in check, or `/admin` opens for anyone who types the address.",
    cause: "AI tools build the feature first; checking who's asking is a separate step that's easy to leave out, and nothing in a demo shows it's missing.",
    steps: [
      "At the top of every route and action that changes data, get the signed-in user and stop if there isn't one, or if they don't own what's being changed.",
      "Protect admin pages in a middleware or the admin layout, checking the user is an admin.",
      "Public forms (contact, waitlist) are fine without sign-in: give them a bot check instead."
    ],
    ask: "Add an authentication check to every API route and server action that writes data: get the signed-in user, return 401 if there's none and 403 if they don't own the record. Protect every /admin page with a check that the user is an admin, in middleware or the admin layout.",
    checks: ["unauth-writes", "admin"],
    launchpad: "The launch check lists each route and action that writes without a sign-in check, and admin pages with none.",
    related: ["supabase-row-level-security", "forms-flooded-by-bots"]
  },
  {
    slug: "firebase-rules-open",
    title: "Firebase rules let anyone write (or test mode is about to expire)",
    summary: "Firestore in test mode, or rules with allow write: if true, let anyone change or delete your data, and test mode switches everything off on its expiry date.",
    group: "Security holes",
    tools: [],
    symptom: "`firestore.rules` has `allow read, write: if true`, or the test-mode rule that opens everything until a date.",
    cause: "Test mode is how Firebase starts a project. It's meant to be replaced before launch, and nothing reminds you.",
    steps: [
      "Require a signed-in user, matched to the document: `allow write: if request.auth != null && request.auth.uid == userId`.",
      "Deploy the rules: `firebase deploy --only firestore:rules`."
    ],
    ask: "Replace the open Firestore security rules with rules that require a signed-in user and only let each user read and write their own documents. Keep public reads only where data is meant to be public.",
    checks: ["firebase-rules"],
    launchpad: "The launch check reads the rules files and flags open and test-mode rules.",
    related: ["supabase-row-level-security"]
  },
  {
    slug: "forms-flooded-by-bots",
    title: "Bots flooding your sign-up or contact form",
    summary: "Public forms with no bot check are the first thing spam bots find. A free, invisible check stops them without annoying real people.",
    group: "Security holes",
    tools: [],
    symptom: "Fake sign-ups, junk messages, or your email provider's quota used up overnight.",
    cause: "The form accepts anything posted to it, and scripts post to every form they find.",
    steps: [
      "Add Cloudflare Turnstile (free, usually invisible) to the form.",
      "Verify its token on the server before saving anything."
    ],
    ask: "Add Cloudflare Turnstile to every public form, and verify the token on the server (with TURNSTILE_SECRET_KEY) before processing the submission.",
    checks: ["bot"],
    launchpad: "The launch check finds forms with no bot check. Launchpad creates the Turnstile widget and sets its keys for you.",
    related: ["api-routes-anyone-can-call"]
  },
  // ---------- data, email and payments ----------
  {
    slug: "move-off-lovable-cloud",
    title: "Move your data off Lovable Cloud to your own Supabase",
    summary: "An app on Lovable's built-in backend keeps its database on Lovable's cloud. Export it, load it into a Supabase project of your own, and your users keep their passwords.",
    group: "Data, email and payments",
    tools: ["lovable"],
    symptom: "Your Supabase project isn't in your own Supabase dashboard, because Lovable created it on Lovable Cloud.",
    cause: "Lovable doesn't move a project to your own backend in one step: the data has to be exported and restored, and storage files, secrets and sign-in settings set up again.",
    steps: [
      "In Lovable: More → Database → Manage → Settings → Export data, then Export on the Database card. Download it from More → Storage when Lovable emails you, with any files your app keeps there.",
      "Create a Supabase project of your own (Launchpad's wizard does it when you turn on Database with Supabase) and deploy.",
      "Load the export: `launchpad db restore <the export file>`. The app's tables, policies and user accounts come across, so people keep their passwords.",
      "Upload the storage files, and set up secrets and sign-in providers in the new project."
    ],
    ask: "This app is moving from Lovable Cloud to my own Supabase project. Point the Supabase client at environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) instead of the values written into the code, and list every edge function and secret the app uses so I can set them up in the new project.",
    checks: [],
    launchpad: "`launchpad db restore` loads Lovable Cloud's export into your new project in one transaction, users and their passwords included.",
    related: ["lovable-tanstack-start-404-on-vercel", "replit-auth-outside-replit"]
  },
  {
    slug: "app-emails-go-to-spam",
    title: "Your app's emails go to spam (SPF, DKIM and DMARC)",
    summary: "Sign-in links and receipts landing in spam usually mean the sending domain isn't set up: no SPF, no DKIM signature, no DMARC record. Gmail and Yahoo now expect all three.",
    group: "Data, email and payments",
    tools: [],
    symptom: "Magic links, password resets or receipts arrive in spam, or never arrive.",
    cause: "Mail providers check that a domain says which servers may send for it (SPF), that mail is signed (DKIM), and what to do with mail that fails (DMARC). Without them, your app's mail looks like spoofing.",
    steps: [
      "Add your domain in your email provider (Resend → Domains) and create the DNS records it lists: SPF and DKIM.",
      "Add a DMARC record: a TXT record at `_dmarc.yourdomain.com`, e.g. `v=DMARC1; p=none; rua=mailto:you@yourdomain.com`.",
      "Send from an address on that domain, and give replies somewhere to go (an MX record)."
    ],
    ask: "Make the app send all email from an address on my own domain, read from an EMAIL_FROM environment variable, through Resend, and list the DNS records I need to add.",
    checks: ["spf", "dkim", "dmarc", "mx"],
    launchpad: "The launch check reads your domain's SPF, DMARC and Resend DKIM records. Launchpad creates the sending domain on Resend and, with your DNS on Cloudflare, adds the records itself.",
    related: ["stripe-webhook-not-verified"]
  },
  {
    slug: "stripe-webhook-not-verified",
    title: "Stripe webhook not verified, or missing",
    summary: "A Stripe webhook that doesn't check the signature lets anyone post a fake “payment succeeded”. Without a webhook at all, subscriptions never update when payments fail or are cancelled.",
    group: "Data, email and payments",
    tools: [],
    symptom: "Subscriptions stay active after a failed payment, or the webhook route acts on any JSON posted to it.",
    cause: "The webhook route skips `stripe.webhooks.constructEvent`, the call that proves an event came from Stripe, or no webhook route exists.",
    steps: [
      "Verify every event with `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)` before acting on it. It needs the raw request body, not parsed JSON.",
      "Handle `checkout.session.completed` and the `customer.subscription` events, and update your database from them."
    ],
    ask: "Make the Stripe webhook route verify every event with stripe.webhooks.constructEvent using the raw request body and STRIPE_WEBHOOK_SECRET, return 400 when verification fails, and update the database on checkout.session.completed and customer.subscription.updated and .deleted.",
    checks: ["stripe-webhook"],
    launchpad: "The launch check flags missing and unverified webhooks. Launchpad creates the webhook in your Stripe account and sets `STRIPE_WEBHOOK_SECRET` for you.",
    related: ["api-routes-anyone-can-call"]
  }
];
var fixHref = (slug) => `/fix/${slug}`;
var FIX_FOR_CHECK = Object.fromEntries(FIXES.flatMap((f) => f.checks.map((c) => [c, f.slug])));

// apps/site/lib/report-text.ts
var fixPage = (c) => FIX_FOR_CHECK[c.id] ? `${SITE}${fixHref(FIX_FOR_CHECK[c.id])}` : void 0;

// packages/cli/src/launch-check.ts
var MAX_FILES = 5e4;
var PRUNE = /* @__PURE__ */ new Set(["node_modules", ".git", ".next", ".nuxt", ".svelte-kit", ".vercel", ".turbo", ".output", ".cache", "dist", "build", "out", "coverage", ".launchpad"]);
var LaunchCheckError = class extends Error {
};
function gitFiles(dir) {
  return new Promise((done) => {
    execFile("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: dir, maxBuffer: 256 * 1024 * 1024 }, (err, stdout) => {
      done(err ? null : stdout.split("\0").filter(Boolean));
    });
  });
}
async function walk(dir, prefix = "", out = []) {
  for (const entry of await readdir(join(dir, prefix), { withFileTypes: true })) {
    if (out.length > MAX_FILES) break;
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (!PRUNE.has(entry.name)) await walk(dir, path, out);
    } else if (entry.isFile()) out.push(path);
  }
  return out;
}
async function readFolder(dir) {
  const listed = await gitFiles(dir);
  let paths = listed?.length ? listed : await walk(dir);
  let partial = paths.length > MAX_FILES;
  paths = paths.slice(0, MAX_FILES);
  const blobs = [];
  const files = /* @__PURE__ */ new Map();
  let kept = 0;
  for (let i = 0; i < paths.length; i += 64) {
    const stats = await Promise.all(paths.slice(i, i + 64).map((p) => lstat(join(dir, p)).then((s) => s.isFile() ? { path: p, size: s.size } : null, () => null)));
    for (const b of stats) {
      if (!b) continue;
      blobs.push(b);
      if (!FILE_LIMITS.wanted(b.path) || b.size > FILE_LIMITS.maxFileBytes) continue;
      if (kept + b.size > FILE_LIMITS.maxKeptBytes) {
        partial = true;
        continue;
      }
      kept += b.size;
      files.set(b.path, await readFile(join(dir, b.path), "utf8"));
    }
  }
  return { blobs, files, partial };
}
async function launchCheck(dir, opts) {
  const root = resolve(dir);
  let domain;
  if (opts.domain !== void 0) {
    domain = parseDomain(opts.domain);
    if (!domain) throw new LaunchCheckError(`"${opts.domain}" isn't a domain. Give just the name, like example.com.`);
  }
  let read;
  try {
    read = await readFolder(root);
  } catch (e) {
    throw new LaunchCheckError(`Couldn't read ${root}: ${e.message}`);
  }
  if (!read.blobs.length) throw new LaunchCheckError(`${root} has no files to check.`);
  return runFilesCheck(read, basename(root), domain, { fetch: opts.fetch });
}

// action/src/main.ts
var MARKER = "<!-- launchpad-launch-check -->";
var FROM = `${SITE}/?utm_source=github&utm_medium=action`;
var input = (env, name, fallback = "") => (env[`INPUT_${name.toUpperCase().replace(/ /g, "_")}`] ?? "").trim() || fallback;
var code = (s) => `\`${s.replace(/`/g, "'").replace(/\r?\n/g, " ")}\``;
function formatMarkdown(r, folder) {
  const fix = toFix(r);
  const fails = fix.filter((c) => c.status === "fail");
  const warns = fix.filter((c) => c.status === "warn");
  const passed = r.checks.filter((c) => c.status === "pass").length;
  const where = (c) => c.where?.length ? ` ${c.where.map((w) => code(folder === "." ? w : `${folder}/${w}`)).join(", ")}` : "";
  const item = (c) => {
    const page = fixPage(c);
    return [
      `- **${c.title}**${where(c)}`,
      `  ${c.detail}${c.fix ? ` ${c.fix}` : ""}${page ? ` [Step by step](${page}?utm_source=github&utm_medium=action)` : ""}`
    ];
  };
  const lines = [
    MARKER,
    `### Launch check: ${r.score}/100, ${scoreLabel(r.score).toLowerCase()}`,
    "",
    `**${fails.length} to fix before launch**, ${warns.length} worth fixing, ${passed} passed.${r.tool ? ` Built with ${r.tool.name}.` : ""}${r.stack.length ? ` Stack: ${r.stack.join(", ")}.` : ""}${folder !== "." ? ` Folder: ${code(folder)}.` : ""}`
  ];
  if (r.partial) lines.push("", "The repository was too big to read whole, so some problems may be missing.");
  for (const [title, list] of [["Fix before launch", fails], ["Worth fixing", warns]]) {
    if (list.length) lines.push("", `#### ${title}`, ...list.flatMap(item));
  }
  if (fix.length) {
    lines.push("", "<details><summary>Fix them all: paste this into the AI tool that built the app</summary>", "", "````text", fixAllRequest(r), "````", "", "</details>");
  } else {
    lines.push("", "Nothing to fix: ready to launch.");
  }
  lines.push("", `<sub>The [Launchpad](${FROM}) launch check ran on this workflow's runner; the code wasn't uploaded anywhere.</sub>`);
  return lines.join("\n");
}
function annotations(r, folder, root) {
  const out = [];
  const esc = (s) => s.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
  const prop = (s) => esc(s).replace(/:/g, "%3A").replace(/,/g, "%2C");
  for (const c of toFix(r)) {
    for (const w of c.where ?? []) {
      const m = /^(.+?):(\d+)$/.exec(w);
      const file = join2(folder, m ? m[1] : w);
      if (!existsSync(join2(root, file))) continue;
      const level = c.status === "fail" ? "error" : "warning";
      out.push(`::${level} file=${prop(file)}${m ? `,line=${m[2]}` : ""},title=${prop(c.title)}::${esc(`${c.detail}${c.fix ? ` ${c.fix}` : ""}`)}`);
    }
  }
  return out;
}
async function gh(g, method, path, body2) {
  return g.fetch(`${g.api}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${g.token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "launchpad-launch-check-action",
      ...body2 ? { "content-type": "application/json" } : {}
    },
    body: body2 ? JSON.stringify(body2) : void 0,
    signal: AbortSignal.timeout(15e3)
  });
}
async function upsertComment(g, pr, body2) {
  let existing;
  for (let page = 1; page <= 10 && existing === void 0; page++) {
    const res2 = await gh(g, "GET", `/repos/${g.repo}/issues/${pr}/comments?per_page=100&page=${page}`);
    if (!res2.ok) throw new Error(`reading the pull request's comments: HTTP ${res2.status}`);
    const list = await res2.json();
    existing = list.find((c) => c.body?.startsWith(MARKER))?.id;
    if (list.length < 100) break;
  }
  const res = existing === void 0 ? await gh(g, "POST", `/repos/${g.repo}/issues/${pr}/comments`, { body: body2 }) : await gh(g, "PATCH", `/repos/${g.repo}/issues/comments/${existing}`, { body: body2 });
  await res.body?.cancel();
  if (!res.ok) throw new Error(`${existing === void 0 ? "adding" : "updating"} the comment: HTTP ${res.status}`);
  return existing === void 0 ? "created" : "updated";
}
async function run(io) {
  const { env, out } = io;
  const root = resolve2(env.GITHUB_WORKSPACE ?? process.cwd());
  const folder = input(env, "path", ".").replace(/\/+$/, "") || ".";
  const dir = resolve2(root, folder);
  if (isAbsolute(folder) || relative(root, dir).startsWith("..")) {
    out(`::error::path must be a folder inside the repository, not ${folder}`);
    return 1;
  }
  const failOn = input(env, "fail-on", "fail");
  if (!["fail", "warn", "never"].includes(failOn)) {
    out(`::error::fail-on is fail, warn or never, not ${failOn}`);
    return 1;
  }
  let report2;
  try {
    report2 = await launchCheck(dir, { domain: input(env, "domain") || void 0, fetch: io.fetch });
  } catch (e) {
    out(`::error::${e instanceof LaunchCheckError ? e.message : `The launch check couldn't run: ${e.message}`}`);
    return 1;
  }
  const shownFolder = relative(root, dir).split("\\").join("/") || ".";
  if (env.GITHUB_REPOSITORY) report2 = { ...report2, repo: shownFolder === "." ? env.GITHUB_REPOSITORY : `${env.GITHUB_REPOSITORY}/${shownFolder}` };
  const markdown = formatMarkdown(report2, shownFolder);
  const fix = toFix(report2);
  const fails = fix.filter((c) => c.status === "fail").length;
  const warns = fix.length - fails;
  out(`Launch check: ${report2.score}/100, ${scoreLabel(report2.score).toLowerCase()}. ${fails} to fix before launch, ${warns} worth fixing.`);
  for (const a of annotations(report2, shownFolder, root)) out(a);
  if (env.GITHUB_STEP_SUMMARY) await appendFile(env.GITHUB_STEP_SUMMARY, `${markdown.replace(MARKER, "").trimStart()}
`);
  if (env.GITHUB_OUTPUT) await appendFile(env.GITHUB_OUTPUT, `score=${report2.score}
fails=${fails}
warns=${warns}
`);
  const event = env.GITHUB_EVENT_PATH ? JSON.parse(await readFile2(env.GITHUB_EVENT_PATH, "utf8").catch(() => "{}")) : {};
  const pr = event.pull_request?.number;
  const token = input(env, "github-token");
  if (pr && input(env, "comment", "true") !== "false" && token && env.GITHUB_REPOSITORY) {
    const g = { api: (env.GITHUB_API_URL ?? "https://api.github.com").replace(/\/$/, ""), token, repo: env.GITHUB_REPOSITORY, fetch: io.fetch };
    try {
      out(`Comment ${await upsertComment(g, pr, markdown)} on pull request #${pr}.`);
    } catch (e) {
      out(`::warning::Couldn't comment on the pull request (${e.message}). Give the job "pull-requests: write"; from a fork the token can't write, and the report is in the job summary.`);
    }
  }
  const failing = failOn === "fail" ? fails > 0 : failOn === "warn" ? fails + warns > 0 : false;
  if (failing) out(`::error::The launch check found ${failOn === "fail" ? `${fails} thing(s) to fix before launch` : `${fails + warns} thing(s) to fix`}.`);
  return failing ? 1 : 0;
}

// action/src/index.ts
process.exitCode = await run({ env: process.env, out: (line) => console.log(line), fetch });
