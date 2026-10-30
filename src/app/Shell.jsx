/* Cadre de l'application : scène de marque + téléphone sur grand écran, plein écran sur mobile (disposition du prototype) */
import { useEffect, useRef, useState } from "react";
import { useApp, linkTo } from "./store.jsx";
import Icon from "../ui/Icon.jsx";
import { Wordmark } from "../ui/common.jsx";
import { SCREENS, PUBLIC } from "./screens/index.js";
import { fmtLeft } from "@shared/format.js";
import { api } from "../lib/api.js";
import { locate, battery } from "../lib/geo.js";
import { pressKey } from "./screens/sosTriggers.jsx";
import { SLOGAN, ECOSYSTEM } from "@shared/constants.js";

const NAV_ITEMS = [["home", "home", "Accueil"], ["docs", "doc", "Mes documents", "Documents"], ["search", "search", "Rechercher", "Chercher"], ["notifs", "bell", "Notifications", "Alertes"], ["profile", "user", "Profil"]];
const NO_FAB = ["incident", "welcome", "signup", "otp", "login", "sosWizard", "forgot", "verified"];

function Clock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 10000); return () => clearInterval(i); }, []);
  return <span className="num">{t.getHours()}:{String(t.getMinutes()).padStart(2, "0")}</span>;
}

function ProtBar() {
  const app = useApp(), pm = app.sos && app.sos.protection;
  const [, tick] = useState(0);
  useEffect(() => { if (!pm || !pm.active) return; const i = setInterval(() => { tick(x => x + 1); if (new Date(pm.until) <= new Date()) app.refreshSos(); }, 1000); return () => clearInterval(i); }, [pm && pm.active, pm && pm.until]); // eslint-disable-line react-hooks/exhaustive-deps
  /* signal du Mode Protection : position + batterie chaque minute (alerte serveur si le téléphone se tait) */
  useEffect(() => {
    if (!app.user || !pm || !pm.active) return;
    const send = async () => { try { const [loc, bat] = await Promise.all([locate(), battery()]); const r = await api.post("/sos/protection/beat", { loc, battery: bat }); if (!r.active) app.refreshSos(); } catch { /* hors ligne : le serveur alertera si le silence se prolonge */ } };
    send(); const i = setInterval(send, 60000); return () => clearInterval(i);
  }, [app.user, pm && pm.active]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!app.user || !pm || !pm.active) return null;
  return <button className="protbar" onClick={() => app.go("sosProtection")}><span className="dotp" /><span className="grow">Mode Protection actif</span><span className="num">{fmtLeft(new Date(pm.until) - Date.now())}</span></button>;
}

function Lock() {
  const app = useApp();
  const [pin, setPin] = useState(""), [msg, setMsg] = useState("Saisissez votre code"), [block, setBlock] = useState(0);
  const d = new Date();
  const press = async k => {
    if (block > Date.now()) return;
    const n = k === "⌫" ? pin.slice(0, -1) : pin.length < 4 ? pin + k : pin;
    setPin(n);
    if (n.length === 4) {
      try {
        const loc = await locate(null, 3000);
        await api.post("/sos/unlock", { code: n, loc });
        app.setLocked(false); setPin("");
      } catch (e) {
        setPin(""); setMsg(e.status === 429 ? "Trop de tentatives." : e.status === 409 ? "Définissez vos codes dans SOS › Code sous contrainte." : "Code incorrect.");
        if (e.status === 401) { const t = (+sessionStorage.getItem("ids_pin_ko") || 0) + 1; sessionStorage.setItem("ids_pin_ko", t); if (t >= 5) { sessionStorage.setItem("ids_pin_ko", 0); setBlock(Date.now() + 30000); setMsg("Trop de tentatives. Réessayez dans 30 s."); } }
        if (e.status === 409) app.setLocked(false);
      }
    }
  };
  return (
    <div className="lock">
      <div style={{ textAlign: "center" }}><div className="num" style={{ font: "300 64px var(--f-display)", lineHeight: 1 }}>{String(d.getHours()).padStart(2, "0")}:{String(d.getMinutes()).padStart(2, "0")}</div>
        <div style={{ opacity: .8, marginTop: 4 }}>{d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</div></div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <img src="/logo.png" alt="" width="46" height="46" style={{ background: "#fff", borderRadius: "50%", padding: 3, objectFit: "contain" }} />
          <b style={{ fontFamily: "var(--f-display)" }}>ID SECOURS verrouillé</b><span style={{ fontSize: 12.5, opacity: .75 }}>{msg}</span></div>
        <div className="pindots">{[0, 1, 2, 3].map(i => <i key={i} className={i < pin.length ? "f" : ""} />)}</div>
        <div className="pinpad">{[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((k, i) => k === "" ? <span key={i} /> : <button key={i} onClick={() => press(String(k))} aria-label={k === "⌫" ? "Effacer" : String(k)}>{k}</button>)}</div>
      </div>
    </div>
  );
}

function SidePanel() {
  return (
    <aside className="side" aria-label="Présentation">
      <div className="brand"><img src="/logo.png" alt="" style={{ objectFit: "contain" }} /><h1><span className="i">I</span><span className="d">D</span> <span className="s">SECOURS</span></h1></div>
      <p>Votre identité retrouvée, votre tranquillité restaurée. Protégez vos documents, déclarez une perte en une minute, retrouvez un document et alertez vos proches en cas de danger.</p>
      <div className="guide">
        <h3>Accès rapide</h3>
        <div className="links">
          <a href="#search" onClick={e => { e.preventDefault(); window.dispatchEvent(new CustomEvent("ids-go", { detail: "search" })); }}><span className="dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "#1A7EE0" }} />Rechercher un document</a>
          <a href="#found" onClick={e => { e.preventDefault(); window.dispatchEvent(new CustomEvent("ids-go", { detail: "found" })); }}><span className="dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "#13A043" }} />J’ai trouvé un document</a>
          <a href="/admin"><span className="dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "#16201B" }} />Espace agents ID SECOURS</a>
        </div>
        <div className="data">Application mobile disponible sur Android et iOS. Urgences : Police 110 / 111 / 170 · Pompiers 180 · SAMU 185.</div>
      </div>
      <div style={{ background: "var(--blue-s)", borderRadius: 14, padding: "12px 16px", textAlign: "center" }}>
        <div style={{ font: "italic 600 17px var(--f-display)", color: "#16365C" }}>{SLOGAN}</div>
        <div style={{ height: 3, width: 150, background: "var(--red)", borderRadius: 2, margin: "4px auto 0", transform: "rotate(-2deg)" }} />
      </div>
      <p className="t-s" style={{ fontStyle: "italic" }}>{ECOSYSTEM}<br />Un projet porté par PROSOFT ACADEMY</p>
    </aside>
  );
}

export default function Shell() {
  const app = useApp();
  const { cur, user, sos } = app;
  const [splash, setSplash] = useState(true);
  const viewRef = useRef();
  useEffect(() => { const t = setTimeout(() => setSplash(false), 1300); return () => clearTimeout(t); }, []);
  useEffect(() => { if (viewRef.current) viewRef.current.scrollTop = 0; }, [cur]);
  useEffect(() => { const f = e => app.go(e.detail); window.addEventListener("ids-go", f); return () => window.removeEventListener("ids-go", f); }, [app.go]); // eslint-disable-line react-hooks/exhaustive-deps

  const Screen = !user && !PUBLIC.includes(cur.name) ? SCREENS.welcome : SCREENS[cur.name] || SCREENS.home;
  const navOn = !!user && app.NAV.includes(cur.name);
  const fabOn = !!user && sos && sos.enabled && !NO_FAB.includes(cur.name);
  const hw = k => { if (k === "P" && user) { if (!pressKey(app, k)) app.setLocked(true); return; } if (!pressKey(app, k)) app.toast(k === "V+" ? "Volume +" : "Volume −", "info"); };

  return (
    <div className="stage">
      <SidePanel />
      <div className="phone">
        <button className="hw l" style={{ top: 170, height: 34 }} onClick={() => hw("V+")} data-tip="Volume +" aria-label="Volume plus" />
        <button className="hw l" style={{ top: 216, height: 58 }} onClick={() => hw("V-")} data-tip="Volume −" aria-label="Volume moins" />
        <button className="hw r" style={{ top: 200, height: 84 }} onClick={() => hw("P")} data-tip="Bouton latéral (verrouiller)" aria-label="Bouton latéral" />
        <div className="screenwrap">
          <div className="island" />
          <div className="statusbar"><Clock /><span className="icons">
            <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5.5" width="3" height="6.5" rx="1" /><rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
            <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M8 2.5c2.3 0 4.4.9 6 2.4l1.3-1.4C13.3 1.6 10.8.5 8 .5S2.7 1.6.7 3.5L2 4.9c1.6-1.5 3.7-2.4 6-2.4zm0 4c1.2 0 2.3.5 3.2 1.2l1.3-1.4C11.3 5.2 9.7 4.5 8 4.5s-3.3.7-4.5 1.8l1.3 1.4C5.7 7 6.8 6.5 8 6.5zM8 9l-2 2 2 1 2-1z" /></svg>
            <svg width="27" height="13" viewBox="0 0 27 13" fill="none"><rect x=".5" y=".5" width="22" height="12" rx="3.5" stroke="currentColor" opacity=".4" /><rect x="2" y="2" width="19" height="9" rx="2" fill="currentColor" /><rect x="24" y="4" width="2" height="5" rx="1" fill="currentColor" opacity=".4" /></svg>
          </span></div>
          <div className="app">
            <ProtBar />
            <div id="view" ref={viewRef}>{app.ready ? <Screen p={cur.p || {}} key={JSON.stringify(cur)} /> : null}</div>
            {fabOn && <button className={`fab ${navOn ? "" : "lift"}`} onClick={() => app.go("sosImmediate", { now: 1 })} aria-label="Déclencher un SOS immédiat">SOS</button>}
            {navOn && <nav className="nav">{NAV_ITEMS.map(([k, ic, l, short]) => <button key={k} className={cur.name === k ? "on" : ""} onClick={() => app.tab(k)} title={l} aria-label={l}><Icon n={ic} s={21} />{k === "notifs" && app.unread > 0 && <b className="nbdg">{app.unread > 99 ? "99+" : app.unread}</b>}<span className="nl" aria-hidden="true">{l}</span><span className="ns" aria-hidden="true">{short || l}</span></button>)}</nav>}
            <div className={`scrim ${app.sheet ? "on" : ""}`} onClick={app.closeSheet} />
            <div className={`sheet ${app.sheet ? "on" : ""}`} role="dialog" aria-modal="true"><div className="grab" />{app.sheet}</div>
            <div className={`toast ${app.toastS ? "on t-" + app.toastS.kind : ""}`} role={app.toastS && app.toastS.kind === "err" ? "alert" : "status"}>{app.toastS && <><Icon n={app.toastS.ic} s={17} /><span>{app.toastS.msg}</span></>}</div>
            <button className={`push ${app.push ? "on" : ""}`} onClick={() => { const l = app.push && app.push.link; app.setPush(null); linkTo(app, l); }}>
              {app.push && <><img src="/logo.png" alt="" style={{ objectFit: "contain" }} /><div className="grow"><b>{app.push.title}</b><span>{app.push.body}</span></div><span className="t-s">maintenant</span></>}
            </button>
            {app.locked && <Lock />}
            {splash && <div className="splash"><img src="/logo.png" alt="ID SECOURS" style={{ objectFit: "contain" }} /><Wordmark /><div className="t-s">Votre identité retrouvée, votre tranquillité restaurée.</div></div>}
          </div>
          <div className="homebar"><i /></div>
        </div>
      </div>
    </div>
  );
}
