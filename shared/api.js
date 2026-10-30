/* Client API partagé (web + mobile). `storage` : { get(k), set(k, v), del(k) } (synchrone ou asynchrone).
   `sendForm` (facultatif) : transport des envois FormData, avec la même signature que fetch. */
export function createApi({ baseUrl, storage, sendForm }) {
  let token = null, onUnauthorized = null;
  const ACCESS = "ids_access"; // jetons d'accès des dossiers ouverts sans compte

  async function accessTokens() { try { return JSON.parse((await storage.get(ACCESS)) || "{}"); } catch { return {}; } }
  async function rememberAccess(ref, tok) { const m = await accessTokens(); m[ref] = tok; await storage.set(ACCESS, JSON.stringify(m)); }

  async function request(method, path, body, opts = {}) {
    const headers = {};
    if (token) headers.authorization = "Bearer " + token;
    const ref = (path.match(/IDS-(REC|TRO|PER)-\d{4}-\d+/) || [])[0];
    if (ref) { const t = (await accessTokens())[ref]; if (t) headers["x-access-token"] = t; }
    let payload;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) { headers["content-type"] = "application/json"; payload = JSON.stringify(body); }
    let res;
    try { res = await (sendForm && payload instanceof FormData ? sendForm : fetch)(baseUrl + path, { method, headers, body: payload }); }
    catch { throw Object.assign(new Error("Connexion impossible. Vérifiez votre réseau."), { status: 0 }); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401 && token && !opts.noAuthRedirect && onUnauthorized) onUnauthorized();
      throw Object.assign(new Error(data.error || "Erreur inattendue."), { status: res.status, data });
    }
    return data;
  }
  return {
    setToken: t => { token = t; }, getToken: () => token, onUnauthorized: fn => { onUnauthorized = fn; },
    rememberAccess, fileUrl: u => !u ? null : /^(https?:|data:|blob:|file:)/.test(u) ? u : baseUrl.replace(/\/api$/, "") + u,
    get: (p, o) => request("GET", p, undefined, o), post: (p, b, o) => request("POST", p, b, o), patch: (p, b) => request("PATCH", p, b),
    put: (p, b) => request("PUT", p, b), del: p => request("DELETE", p)
  };
}
