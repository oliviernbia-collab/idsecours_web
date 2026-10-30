/* Back-office ID SECOURS : connexion des agents, menu selon les permissions du rôle (organigramme) */
import { useEffect, useState, useCallback } from "react";
import { Routes, Route, NavLink, Navigate, useNavigate } from "react-router-dom";
import "./admin.css";
import { adminApi, storage } from "../lib/api.js";
import Icon from "../ui/Icon.jsx";
import { AdmCtx } from "./kit.jsx";
import { PwField } from "../ui/common.jsx";
import { Dashboard, Finance, Commercial, ComPartners, Messages, SosMonitor, Incidents, Population, Performance } from "./pages/business.jsx";
import { Declarations, Founds, FoundChecks, Partners, Reception, Verifications, Officials, Publications, Restitutions, Deliveries } from "./pages/ops.jsx";
import { Staff, Roles, Agencies, Settings, Logs } from "./pages/system.jsx";
import { SystemPage } from "./pages/maintenance.jsx";
import { Profile } from "./pages/profile.jsx";
import { StockOps } from "./pages/stock.jsx";
import { Opportunities, Campaigns } from "./pages/marketing.jsx";
import { Cash } from "./pages/cash.jsx";
import { Backups, SystemBadge, Assistance, Satisfaction } from "./pages/supervision.jsx";
import { SLOGAN, ECOSYSTEM } from "@shared/constants.js";

const TOKEN = "ids_admin_token";
/* menu calqué sur l'organigramme : [service, couleur, pictogramme, entrées] */
const MENU = [
  ["Direction Générale", "#16365C", "userTie", [["dashboard", "Tableau de bord · pilotage", "gauge", "dashboard.view", Dashboard]]],
  ["Super Admin", "#3B4742", "gear", [
    ["staff", "Utilisateurs internes", "user", "staff.manage", Staff],
    ["roles", "Rôles & permissions", "key", "roles.manage", Roles],
    ["agencies", "Agences", "building", "agencies.manage", Agencies],
    ["settings", "Tarifs & formules", "sliders", "settings.manage", Settings],
    ["logs", "Suivi global & journaux", "clock", "audit.view|staff.manage", Logs]]],
  ["Direction financière & comptabilité", "#13A043", "chartBar", [
    ["finance", "Paiements, factures & rapports", "invoice", "finance.view", Finance],
    ["cash", "Caisses des agences (espèces)", "money", "finance.view", Cash]]],
  ["Direction des opérations", "#F28C12", "users", [
    ["declarations", "Déclarations de perte", "alert", "declarations.view", Declarations],
    ["performance", "Suivi des performances", "chartUp", "performance.view", Performance],
    ["feedback", "Avis & satisfaction", "star", "performance.view|incidents.manage|staff.manage", Satisfaction],
    ["population", "Utilisateurs (population)", "users", "users.view", Population],
    ["incidents", "Incidents & amélioration continue", "list", "incidents.manage", Incidents]]],
  ["Service commercial", "#7C3AED", "chartUp", [
    ["commercial", "Abonnements & prospects", "crown", "commercial.view", Commercial],
    ["opportunities", "Opportunités & pipeline", "list", "commercial.view", Opportunities],
    ["campaigns", "Campagnes & segments", "mega", "commercial.view|campaigns.validate", Campaigns],
    ["com-partners", "Partenariats", "handshake", "commercial.view", ComPartners]]],
  ["Support technique", "#6A7570", "headset", [
    ["messages", "Assistance utilisateurs", "msg", "support.messages", Messages],
    ["sos", "Alertes SOS", "siren", "sos.monitor", SosMonitor],
    ["system", "Maintenance du système", "server", "system.view", SystemPage],
    ["backups", "Sauvegardes", "server", "backups.manage", Backups],
    ["assistance", "Demander de l’aide (support aux agences)", "headset", "support.request", Assistance]]],
  ["Service Collecte & Livraison", "#0B7A32", "truck", [
    ["founds", "Collectes ① ②", "truck", "founds.view|collectes.manage", Founds],
    ["deliveries", "Livraisons au propriétaire", "truck", "collectes.manage", Deliveries],
    ["partners", "Livreurs & partenaires", "moto", "founds.view|partners.manage", Partners]]],
  ["Service Vérification & Contrôle", "#1A7EE0", "magnify", [
    ["found-checks", "Contrôle des documents reçus ④", "magnify", "foundcheck.manage", FoundChecks],
    ["verifications", "Vérification des propriétaires", "userShield", "verification.manage", Verifications],
    ["officials", "Déclarations officielles", "file", "official.manage", Officials],
    ["publications", "Publications VIP", "mega", "publications.manage", Publications]]],
  ["Service Réception & Restitution", "#E3141B", "fileDoc", [
    ["reception", "Réception & stock ③", "warehouse", "reception.manage|stock.view", Reception],
    ["stock-ops", "Emplacements, transferts & inventaire", "list", "reception.manage|stock.view|stock.transfer.authorize", StockOps],
    ["restitutions", "Restitutions ⑤ ⑥", "hand", "restitution.manage", Restitutions],
    ["caisse", "Caisse · espèces", "money", "cash.collect", Cash]]]
];
const allowed = (staff, perm) => perm.split("|").some(p => staff.perms.includes(p));

function Login({ onLogged }) {
  const [email, setEmail] = useState(""), [pw, setPw] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const [otp, setOtp] = useState(null), [code, setCode] = useState("");
  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      if (!otp) { const r = await adminApi.post("/admin/auth/login", { email, password: pw }); setOtp(r); setCode(""); }
      else { const r = await adminApi.post("/admin/auth/otp", { challenge: otp.challenge, code }); onLogged(r.token); }
    } catch (x) { setErr(x.message); if (x.status === 401 && otp) setOtp(null); } finally { setBusy(false); }
  };
  if (otp) return <div className="adm-login"><form className="card" onSubmit={submit}>
    <img src="/logo-full.png" alt="ID SECOURS" style={{ maxWidth: 240, alignSelf: "center" }} />
    <div style={{ textAlign: "center" }}><div className="t-title">Authentification renforcée</div><div className="t-s">Saisissez le code envoyé par SMS{otp.tel ? ` au ${otp.tel}` : ""}. Il expire dans 10 minutes.</div></div>
    <input className="inp mono" style={{ textAlign: "center", fontSize: 22, letterSpacing: ".3em" }} inputMode="numeric" maxLength={6} autoFocus autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} aria-label="Code de connexion" />
    {err && <div className="note n-red"><Icon n="alert" s={16} /><span>{err}</span></div>}
    <button className="btn red" disabled={busy || code.length !== 6}>{busy ? <span className="spin-inline" /> : <Icon n="lock" s={16} />} Valider</button>
    {otp.devCode && <button type="button" className="btn ghost sm" onClick={() => setCode(otp.devCode)}>Mode test : remplir le code reçu</button>}
    <button type="button" className="btn sm" style={{ color: "var(--blue-d)" }} onClick={() => { setOtp(null); setErr(""); }}>← Changer de compte</button>
  </form></div>;
  return <div className="adm-login"><form className="card" onSubmit={submit}>
    <img src="/logo-full.png" alt="ID SECOURS" style={{ maxWidth: 240, alignSelf: "center" }} />
    <div style={{ textAlign: "center" }}><div className="t-title">Espace agents</div><div className="t-s">Accès réservé au personnel ID SECOURS. Toutes les connexions sont journalisées.</div>
      <div style={{ font: "italic 600 15px var(--f-display)", color: "#16365C", marginTop: 10 }}>{SLOGAN}<div style={{ height: 3, width: 140, background: "var(--red)", borderRadius: 2, margin: "4px auto 0", transform: "rotate(-2deg)" }} /></div></div>
    <div className="field"><label htmlFor="ad-em">E-mail professionnel</label><input id="ad-em" className="inp" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required /></div>
    <div className="field"><label htmlFor="ad-pw">Mot de passe</label><PwField><input id="ad-pw" className="inp" type="password" autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} required /></PwField></div>
    {err && <div className="note n-red"><Icon n="alert" s={16} /><span>{err}</span></div>}
    <button className="btn red" disabled={busy}>{busy ? <span className="spin-inline" /> : <Icon n="lock" s={16} />} Se connecter</button>
    <a href="/" className="t-s" style={{ textAlign: "center" }}>← Retour à l’application citoyenne</a>
  </form></div>;
}

function GlobalSearch() {
  const [q, setQ] = useState(""), [res, setRes] = useState([]);
  const nav = useNavigate();
  useEffect(() => { if (q.trim().length < 2) return setRes([]); const t = setTimeout(() => adminApi.get(`/admin/search?q=${encodeURIComponent(q)}`).then(r => setRes(r.items)).catch(() => {}), 300); return () => clearTimeout(t); }, [q]);
  const go = r => { setQ(""); setRes([]); nav({ Déclaration: "declarations", Récupération: "verifications", Signalement: "founds", Stock: "reception", Paiement: "finance" }[r.type] || "dashboard"); };
  return <div className="srch"><Icon n="search" s={15} /><input className="inp" placeholder="Rechercher un dossier, un numéro, une référence…" value={q} onChange={e => setQ(e.target.value)} />
    {res.length > 0 && <div className="res">{res.map(r => <button key={r.type + r.ref} onClick={() => go(r)}><span className="pill p-blue">{r.type}</span><span className="mono">{r.ref}</span></button>)}</div>}</div>;
}

/* notifications internes (alertes automatiques ciblées selon le rôle) */
function StaffBell() {
  const [d, setD] = useState(null), [open, setOpen] = useState(false);
  const nav = useNavigate();
  const load = useCallback(() => adminApi.get("/admin/notifications").then(setD).catch(() => {}), []);
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);
  const go = async n => { setOpen(false); await adminApi.post("/admin/notifications/read", { id: n.id }).catch(() => {}); load(); if (n.link) nav(n.link); };
  const C = { CRITIQUE: "red", HAUTE: "orange", NORMALE: "blue" };
  return <div style={{ position: "relative" }}>
    <button className="bell" onClick={() => setOpen(!open)} aria-label="Notifications"><Icon n="bell" s={19} />{d && d.unread ? <span className="bdg">{d.unread}</span> : null}</button>
    {open && d && <div className="panel bell-pop" style={{ position: "absolute", right: 0, top: 50, width: 400, maxHeight: 480, overflowY: "auto", zIndex: 60, boxShadow: "0 16px 40px rgba(0,0,0,.18)", padding: 0 }}>
      <div className="row" style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)" }}><b className="grow">Alertes et notifications</b>{d.unread > 0 && <button className="btn sm ghost" onClick={async () => { await adminApi.post("/admin/notifications/read", {}); load(); }}>Tout lire</button>}</div>
      {d.items.length ? d.items.map(n => <button key={n.id} className="li" style={{ opacity: n.resolved ? .55 : 1 }} onClick={() => go(n)}>
        <span className={`pill p-${n.resolved ? "grey" : C[n.priority]}`} style={{ alignSelf: "flex-start" }}>{n.resolved ? "Résolue" : n.priority}</span>
        <div className="grow"><div className="t-h" style={{ fontSize: 13 }}>{n.title}{!n.read && !n.resolved && " •"}</div><div className="t-s">{n.body}</div><div className="t-s" style={{ fontSize: 11 }}>{new Date(n.t).toLocaleString("fr-FR")}</div></div></button>)
        : <div className="empty">Aucune alerte.</div>}
    </div>}
  </div>;
}

export default function AdminApp() {
  const [staff, setStaff] = useState(null), [ready, setReady] = useState(false), [toastS, setToast] = useState(null), [open, setOpen] = useState(false);
  const toast = useCallback((msg, ic = "check") => {
    const kind = ic === "alert" ? "err" : ic === "check" ? "ok" : "info";
    setToast({ msg, ic, kind }); clearTimeout(window.__admT); window.__admT = setTimeout(() => setToast(null), kind === "err" ? 5000 : 3200);
  }, []);
  const logout = useCallback(() => { storage.del(TOKEN); adminApi.setToken(null); setStaff(null); }, []);
  const loadMe = useCallback(async () => { try { const r = await adminApi.get("/admin/me"); setStaff(r.staff); } catch { logout(); } finally { setReady(true); } }, [logout]);
  useEffect(() => { const t = storage.get(TOKEN); adminApi.onUnauthorized(logout); if (t) { adminApi.setToken(t); loadMe(); } else setReady(true); }, [loadMe, logout]);
  useEffect(() => { document.title = "ID SECOURS · Back-office"; }, []);
  if (!ready) return <div className="loading"><div className="spinner" /></div>;
  if (!staff) return <Login onLogged={t => { storage.set(TOKEN, t); adminApi.setToken(t); loadMe(); }} />;
  const menu = MENU.map(([g, color, ic, items]) => [g, color, ic, items.filter(i => allowed(staff, i[3]))]).filter(m => m[3].length);
  const first = menu[0] && menu[0][3][0][0];
  /* renew : nouveau jeton après changement de mot de passe / fermeture des autres sessions */
  const renew = t => { storage.set(TOKEN, t); adminApi.setToken(t); };
  return <AdmCtx.Provider value={{ staff, toast, can: p => allowed(staff, p), refresh: loadMe, renew }}>
    <div className="adm">
      <aside className={`adm-side ${open ? "open" : ""}`}>
        <div className="adm-brand"><img src="/logo.png" alt="" /><div><b><span className="i">I</span><span className="d">D</span> <span className="s">SECOURS</span></b><small>Back-office · {staff.roleLabel}</small></div></div>
        <nav className="adm-nav" onClick={() => setOpen(false)}>{menu.map(([g, color, gic, items]) => <div key={g} style={{ display: "contents" }}>
          <h6 style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 20, height: 20, borderRadius: 6, background: color, color: "#fff", display: "grid", placeItems: "center" }}><Icon n={gic} s={11} /></span>{g}</h6>
          {items.map(([path, label, ic]) => <NavLink key={path} to={path} className={({ isActive }) => isActive ? "on" : ""} style={({ isActive }) => isActive ? { background: color } : undefined}><Icon n={ic} s={16} />{label}</NavLink>)}</div>)}</nav>
        <div style={{ marginTop: "auto", padding: "14px 18px 18px", borderTop: "1px solid #26332D", fontSize: 11.5, color: "#9FB0A7", fontStyle: "italic" }}>{ECOSYSTEM}</div>
      </aside>
      <div className="adm-main">
        <header className="adm-top">
          <button className="iconbtn menu-btn" onClick={() => setOpen(!open)} aria-label="Menu"><Icon n="bars" s={18} /></button>
          <GlobalSearch />
          <div className="adm-who"><SystemBadge /><StaffBell />
            <NavLink to="profil" className="who-link" title="Mon profil"><div className="who-txt"><div style={{ fontWeight: 700 }}>{staff.prenom} {staff.nom}</div><div className="t-s">{staff.roleLabel}{staff.agency ? " · " + staff.agency : ""}</div></div>
              {staff.photo ? <img className="av" src={staff.photo} alt="" style={{ objectFit: "cover" }} /> : <span className="av">{staff.prenom[0]}</span>}</NavLink>
            <button className="iconbtn" onClick={logout} aria-label="Se déconnecter" title="Se déconnecter"><Icon n="logout" s={17} /></button></div>
        </header>
        <main className="adm-content">
          <Routes>
            {menu.flatMap(m => m[3]).map(([path, , , , C]) => <Route key={path} path={path} element={<C />} />)}
            <Route path="profil" element={<Profile />} />
            <Route path="*" element={<Navigate to={first || "dashboard"} replace />} />
          </Routes>
        </main>
      </div>
      {toastS && <div className={`adm-toast t-${toastS.kind}`} role={toastS.kind === "err" ? "alert" : "status"}><Icon n={toastS.ic} s={17} /><span>{toastS.msg}</span><button className="adm-toast-x" onClick={() => setToast(null)} aria-label="Fermer">×</button></div>}
    </div>
  </AdmCtx.Provider>;
}
