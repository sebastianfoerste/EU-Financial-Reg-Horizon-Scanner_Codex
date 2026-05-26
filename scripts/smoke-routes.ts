type SmokeRoute = {
  path: string;
  expected: string[];
};

const baseUrl =
  process.argv.find((argument) => argument.startsWith("--base-url="))?.replace("--base-url=", "") ??
  process.env.SMOKE_BASE_URL ??
  "http://localhost:3000";

const routes: SmokeRoute[] = [
  { path: "/", expected: ["scanner cockpit", "save current view"] },
  { path: "/review", expected: ["review queue", "approved content"] },
  { path: "/review/pub-esma-qa-2845", expected: ["classification correction", "impact explanation"] },
  { path: "/alerts", expected: ["alert drafts", "send reviewed alert"] },
  { path: "/service-catalogue", expected: ["service catalogue", "trigger rules"] },
  { path: "/sources", expected: ["tier 1 source estate", "source diligence"] },
  { path: "/sources/diligence", expected: ["source diligence", "reuse status"] },
  { path: "/integrations", expected: ["production diagnostics", "governed integration settings"] },
  { path: "/audit", expected: ["audit log", "latest events"] },
  { path: "/digest", expected: ["dry-run digest", "impact explanation"] },
  { path: "/product-maps", expected: ["product maps drive the impact score", "create a product map"] },
  { path: "/sign-in", expected: ["clerk is not configured locally"] },
  { path: "/sign-up", expected: ["clerk is not configured locally"] },
];

async function checkRoute(route: SmokeRoute) {
  const url = new URL(route.path, baseUrl);
  const response = await fetch(url);
  const text = (await response.text()).toLowerCase();
  const missing = route.expected.filter((expected) => !text.includes(expected));

  return {
    path: route.path,
    status: response.status,
    ok: response.ok && missing.length === 0,
    missing,
  };
}

async function main() {
  const results = await Promise.all(routes.map(checkRoute));
  const failed = results.filter((result) => !result.ok);

  for (const result of results) {
    const marker = result.ok ? "OK" : "FAIL";
    console.log(`${marker} ${result.path} ${result.status}`);
    if (result.missing.length) {
      console.log(`  missing: ${result.missing.join(", ")}`);
    }
  }

  if (failed.length) {
    process.exitCode = 1;
  }
}

void main();
