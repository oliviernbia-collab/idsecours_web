/* État global de l'application citoyenne : session, catalogue, pile de navigation, feuilles, toasts, notifications */
import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { api, storage } from "../lib/api.js";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const TOKEN = "ids_token", STACK = "ids_stack";
const NAV = ["home", "docs", "search", "profile"];

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [cat, setCat] = useState(null);
  const [stack, setStack] = useState(() => { try { return JSON.parse(sessionStorage.getItem(STACK)) || null; } catch { return null; } });
  const [sheet, setSheet] = useState(null);
  const [toastS, setToast] = useState(null);
  const [push, setPush] = useState(null);
  const [unread, setUnread] = useState(0);
  const [sos, setSos] = useState(null);
  const [locked, setLocked] = useState(false);
  const mem = useRef({}); // données transitoires entre écrans (paiement en attente, brouillons…)
  const lastNotif = useRef(null);
  const toastT = useRef(), pushT = useRef();

  const toast = useCallback((msg, ic = "check") => { setToast({ msg, ic, k: Date.now() }); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(null), 2600); }, []);
  const showPush = useCallback((title, body, link) => { setPush({ title, body, link }); clearTimeout(pushT.current); pushT.current = setTimeout(() => setPush(null), 4500); }, []);

  /* ---------- navigation (pile + historique du navigateur) ---------- */
  const write = s => { setStack(s); try { sessionStorage.setItem(STACK, JSON.stringify(s)); } catch { /* ignore */ } };
  const pushed = useRef(0);
  const go = useCallback((name, p = {}) => { setSheet(null); window.history.pushState({ ids: 1 }, ""); pushed.current++; setStack(s => { const n = [...(s || []), { name, p }]; write(n); return n; }); }, []);
  const replace = useCallback((name, p = {}) => { setStack(s => { const n = [...(s || []).slice(0, -1), { name, p }]; write(n); return n; }); }, []);
  const tab = useCallback(name => { setSheet(null); write([{ name, p: {} }]); }, []);
  const reset = useCallback(list => { setSheet(null); write(list.map(x => typeof x === "string" ? { name: x, p: {} } : x)); }, []);
  const pop = useCallback(() => { setSheet(null); setStack(s => { const n = s && s.length > 1 ? s.slice(0, -1) : [{ name: api.getToken() ? "home" : "welcome", p: {} }]; write(n); return n; }); }, []);
  /* bouton retour de l'application = retour du navigateur (les deux restent synchronisés) */
  const back = useCallback(() => { if (pushed.current > 0) window.history.back(); else pop(); }, [pop]);
  useEffect(() => { const onPop = () => { pushed.current = Math.max(0, pushed.current - 1); pop(); }; window.addEventListener("popstate", onPop); return () => window.removeEventListener("popstate", onPop); }, [pop]);

  /* ---------- session ---------- */
  const loadMe = useCallback(async () => { const r = await api.get("/auth/me"); setUser(r.user); return r.user; }, []);
  const login = useCallback(async (token, u) => { api.setToken(token); storage.set(TOKEN, token); setUser(u); }, []);
  const logout = useCallback(() => { api.setToken(null); storage.del(TOKEN); setUser(null); setSos(null); setUnread(0); reset(["welcome"]); }, [reset]);
  api.onUnauthorized(() => { api.setToken(null); storage.del(TOKEN); setUser(null); reset(["welcome"]); });

  const refreshNotifs = useCallback(async (withPush) => {
    if (!api.getToken()) return;
    try {
      const r = await api.get("/me/notifications", { noAuthRedirect: true });
      setUnread(r.unread);
      const top = r.items[0];
      if (top && lastNotif.current !== null && top.id > lastNotif.current && !top.read && withPush) showPush(top.title, top.body, top.link);
      if (top) lastNotif.current = Math.max(lastNotif.current || 0, top.id); else lastNotif.current = 0;
    } catch { /* hors ligne */ }
  }, [showPush]);
  const refreshSos = useCallback(async () => { if (!api.getToken()) return null; try { const r = await api.get("/sos"); setSos(r.sos); return r.sos; } catch { return null; } }, []);

  useEffect(() => {
    (async () => {
      try { setCat(await api.get("/catalog")); } catch { /* réessayé plus tard */ }
      const t = storage.get(TOKEN);
      if (t) { api.setToken(t); try { await loadMe(); } catch { api.setToken(null); storage.del(TOKEN); } }
      setReady(true);
    })();
  }, [loadMe]);
  useEffect(() => {
    if (!ready) return;
    if (!stack || !stack.length) reset([user ? "home" : "welcome"]);
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!user) return;
    refreshNotifs(false); refreshSos();
    const t = setInterval(() => refreshNotifs(true), 15000);
    return () => clearInterval(t);
  }, [user, refreshNotifs, refreshSos]);

  const cur = stack && stack.length ? stack[stack.length - 1] : { name: user ? "home" : "welcome", p: {} };
  const catOf = code => (cat && cat.cats.find(c => c.code === code)) || { code, label: code, short: code, icon: "doc", color: "#6A7570", prix: 0, frais: 0 };

  const value = {
    user, setUser, ready, cat, catOf, stack, cur, go, replace, back, tab, reset, NAV,
    sheet, openSheet: setSheet, closeSheet: () => setSheet(null), toast, toastS, push, setPush, showPush,
    unread, refreshNotifs, sos, setSos, refreshSos, locked, setLocked, login, logout, loadMe, mem: mem.current
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ouvre un lien de notification « ecran|id » */
export function linkTo(app, link) {
  if (!link) return;
  const [n, id] = link.split("|");
  if (!app.user && !["search", "found"].includes(n)) return;
  app.go(n, id ? { id } : {});
}
