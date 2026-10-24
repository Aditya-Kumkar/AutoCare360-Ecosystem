type SalesforceToken = { access_token: string; instance_url: string; token_type: string };

function json(res: any, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function config() {
  const domain = process.env.SF_DOMAIN?.trim().replace(/\/$/, "");
  const clientId = process.env.SF_CLIENT_ID?.trim();
  const clientSecret = process.env.SF_CLIENT_SECRET;
  if (!domain || !clientId || !clientSecret) return null;
  try {
    const url = new URL(domain);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".salesforce.com")) return null;
  } catch {
    return null;
  }
  return { domain, clientId, clientSecret };
}

async function getToken(): Promise<SalesforceToken> {
  const cfg = config();
  if (!cfg) throw new Error("SF_CONFIG_MISSING");
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  });
  const response = await fetch(`${cfg.domain}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!response.ok) throw new Error("SF_AUTH_FAILED");
  const token = await response.json() as SalesforceToken;
  if (!token.access_token || !token.instance_url) throw new Error("SF_AUTH_FAILED");
  return token;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { ok: false, error: "method_not_allowed" });
  }

  const objectName = typeof req.query?.object === "string" ? req.query.object : "";
  if (objectName && !/^[A-Za-z][A-Za-z0-9_]*$/.test(objectName)) {
    return json(res, 400, { ok: false, error: "invalid_object_name" });
  }

  try {
    const token = await getToken();
    const apiRoot = `${token.instance_url}/services/data/v65.0`;
    const headers = { Authorization: `Bearer ${token.access_token}`, Accept: "application/json" };

    if (objectName) {
      const response = await fetch(`${apiRoot}/sobjects/${encodeURIComponent(objectName)}/describe`, { headers, cache: "no-store" });
      if (!response.ok) return json(res, response.status === 404 ? 404 : 502, { ok: false, error: response.status === 404 ? "object_not_found_or_not_accessible" : "salesforce_schema_lookup_failed" });
      const data = await response.json() as { name: string; label: string; fields: Array<{ name: string; label: string; type: string; createable: boolean; updateable: boolean; nillable: boolean; referenceTo?: string[] }> };
      return json(res, 200, {
        ok: true,
        object: { name: data.name, label: data.label },
        fields: data.fields.map(f => ({ name: f.name, label: f.label, type: f.type, createable: f.createable, updateable: f.updateable, required: !f.nillable && !f.createable === false, referenceTo: f.referenceTo ?? [] })),
      });
    }

    const response = await fetch(`${apiRoot}/sobjects/`, { headers, cache: "no-store" });
    if (!response.ok) return json(res, 502, { ok: false, error: "salesforce_schema_lookup_failed" });
    const data = await response.json() as { sobjects: Array<{ name: string; label: string; custom: boolean; queryable: boolean; createable: boolean; updateable: boolean }> };
    const objects = data.sobjects
      .filter(o => o.queryable && (o.custom || /^(Account|Contact|Lead|Opportunity|Case|Task|Event)$/.test(o.name)))
      .map(o => ({ name: o.name, label: o.label, custom: o.custom, createable: o.createable, updateable: o.updateable }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return json(res, 200, { ok: true, apiVersion: "v65.0", count: objects.length, objects });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "SF_CONFIG_MISSING") return json(res, 503, { ok: false, error: "salesforce_not_configured", required: ["SF_DOMAIN", "SF_CLIENT_ID", "SF_CLIENT_SECRET"] });
    if (message === "SF_AUTH_FAILED") return json(res, 502, { ok: false, error: "salesforce_authentication_failed", hint: "Check the My Domain URL, External Client App OAuth policy, integration user, and API permissions." });
    return json(res, 502, { ok: false, error: "salesforce_connection_failed" });
  }
}
