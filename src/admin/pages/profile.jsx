/* Mon profil — agent connecté au back-office : identité, coordonnées, photo, mot de passe, sessions, accès, historique */
import { useEffect, useRef, useState } from "react";
import { adminApi as api, form, compress } from "../../lib/api.js";
import Icon from "../../ui/Icon.jsx";
import { PwField } from "../../ui/common.jsx";
import { Page, Panel, Table, Kpi, Modal, P, useData, useAct, useAdm, Loading } from "../kit.jsx";
import { fmtD, fmtDT, fmtTel } from "@shared/format.js";

/* libellés lisibles des actions journalisées (repli : code brut) */
const ACTIONS = {
  STAFF_LOGIN: "Connexion au back-office", STAFF_PROFILE_UPDATE: "Mise à jour du profil", STAFF_PHOTO_UPDATE: "Nouvelle photo de profil",
  STAFF_PASSWORD_CHANGE: "Changement de mot de passe", STAFF_SESSIONS_REVOKED: "Déconnexion des autres sessions", STAFF_CREATED: "Création d’un agent",
  STAFF_UPDATED: "Modification d’un agent", ROLE_PERMS: "Modification des permissions d’un rôle", SETTINGS_UPDATED: "Paramètre modifié",
  AGENCY_CREATED: "Création d’une agence", AGENCY_STATUS: "Changement de statut d’une agence", SYSTEM_PURGE_OTP: "Purge des codes expirés",
  USER_STATUS: "Changement de statut d’un utilisateur", SUBSCRIBER_CREATED: "Création d’un abonné", COM_PARTNER_CREATED: "Nouveau partenariat commercial",
  RENEWAL_REMINDER: "Relance de renouvellement", DOSSIER_VIEW: "Consultation d’un dossier", INVOICE_VIEW: "Consultation d’une facture",
  SOS_VIEW: "Consultation d’une alerte SOS", EXPORT: "Export de données",
  PARTNER_CREATED: "Création d’un partenaire de livraison", PARTNER_STATUS: "Changement de statut d’un partenaire", PARTNER_PIN_RESET: "Réinitialisation du PIN livreur",
  COLLECT_ASSIGNED: "Affectation d’une collecte", COLLECT_HANDOVER: "Remise du document au livreur", COLLECT_CODE_KO: "Code de remise erroné",
  COLLECT_DEPOSIT: "Dépôt en agence", RECEPTION: "Réception physique d’un document", RECEPTION_ABSENT: "Document attendu non reçu", STOCK_MOVE: "Mouvement de stock",
  FOUNDCHECK_VALIDATED: "Document contrôlé et validé", DOCCHECK_VALIDATED: "Document contrôlé et validé", DOCCHECK_SUSPECT: "Document signalé suspect",
  MULTIPLE_RESOLVED: "Correspondance multiple résolue", RECOVERY_VERIFY: "Vérification d’un propriétaire", VERIFICATION_CONFIRM: "Propriétaire confirmé",
  DECLARATION_SENSIBLE: "Déclaration marquée sensible", OFFICIAL_SUBMITTED: "Déclaration officielle transmise", PUBLICATION_REQUESTED: "Publication VIP demandée",
  RESTITUTION: "Restitution au guichet", RESTITUTION_CODE_KO: "Code de retrait erroné",
  DELIVERY_PLANNED: "Livraison planifiée", DELIVERY_OUT: "Départ en livraison", DELIVERY_OTP_SENT: "Code de livraison envoyé", DELIVERY_DONE: "Livraison effectuée",
  DELIVERY_FAILED: "Échec de livraison", DELIVERY_RETURNED: "Retour en agence", DELIVERY_CANCELLED: "Livraison annulée", DELIVERY_CODE_KO: "Code de livraison erroné",
  REFUND_REQUESTED: "Demande de remboursement", REFUND_VALIDATE: "Validation d’un remboursement", RECONCILIATION_IMPORT: "Import d’un relevé de rapprochement",
  INCIDENT_CREATED: "Incident créé"
};
/* codes suivis d'un statut (ex. DECLARATION_CLÔTURÉE) */
const PREFIXES = { DECLARATION_: "Déclaration", OFFICIAL_: "Déclaration officielle", PUBLICATION_: "Publication VIP", VERIFICATION_: "Vérification", REFUND_: "Remboursement",
  INCIDENT_: "Incident", FINANCE_GAP_: "Écart financier", RECONCILIATION_MANUAL_: "Rapprochement manuel" };
const actionLabel = a => {
  if (ACTIONS[a]) return ACTIONS[a];
  const k = Object.keys(PREFIXES).find(x => a.startsWith(x));
  return k ? `${PREFIXES[k]} · ${a.slice(k.length).toLowerCase()}` : a.toLowerCase().replace(/_/g, " ").replace(/^./, c => c.toUpperCase());
};

/* appareil lisible à partir de l'agent utilisateur */
const device = ua => {
  if (!ua) return "—";
  if (ua === "OTP invalide") return "Code OTP invalide";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  const br = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : /node|undici/i.test(ua) ? "Client API" : "Navigateur";
  return os ? `${br} · ${os}` : br;
};

/* règles du mot de passe interne (identiques au serveur) */
const RULES = [["8 caractères minimum", p => p.length >= 8], ["Au moins une lettre", p => /[A-Za-zÀ-ÿ]/.test(p)], ["Au moins un chiffre", p => /\d/.test(p)]];
const strength = p => !p ? 0 : RULES.filter(([, t]) => t(p)).length + (p.length >= 12 && /[^A-Za-z0-9]/.test(p) ? 1 : 0);
const STRENGTH = [["", "var(--line)"], ["Faible", "var(--red)"], ["Moyen", "var(--orange)"], ["Bon", "var(--blue)"], ["Excellent", "var(--green)"]];

function Avatar({ p, size = 96 }) {
  return p.photo ? <img src={p.photo} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--card)", boxShadow: "0 4px 14px rgba(0,0,0,.12)" }} />
    : <span style={{ width: size, height: size, borderRadius: "50%", background: "var(--ink)", color: "#fff", display: "grid", placeItems: "center", font: `700 ${size * .36}px var(--f-display)`, flex: "none" }}>{p.prenom[0]}{p.nom[0]}</span>;
}

function Identity({ d, reload }) {
  const { refresh } = useAdm(), act = useAct(() => { reload(); refresh(); });
  const inp = useRef(null), p = d.profile;
  const pick = async e => { const f = e.target.files[0]; e.target.value = ""; if (!f) return; const img = await compress(f, 512, .85); act(() => api.post("/admin/profile/photo", form({ photo: img })), "Photo de profil mise à jour."); };
  return <div className="panel" style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
    <div style={{ position: "relative" }}><Avatar p={p} />
      <button className="iconbtn" onClick={() => inp.current.click()} aria-label="Changer la photo" title="Changer la photo" style={{ position: "absolute", right: -2, bottom: -2, background: "var(--card)", boxShadow: "0 2px 8px rgba(0,0,0,.15)" }}><Icon n="camera" s={15} /></button>
      <input ref={inp} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pick} /></div>
    <div className="grow" style={{ minWidth: 220 }}>
      <div className="t-title" style={{ fontSize: 22 }}>{p.prenom} {p.nom}</div>
      <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 6 }}><P c="dark">{p.roleLabel}</P>{p.agency && <P c="blue">{p.agency}</P>}<P c={p.status === "ACTIVE" ? "green" : "red"}>{p.status === "ACTIVE" ? "Compte actif" : "Compte suspendu"}</P></div>
      <div className="row t-s" style={{ gap: 18, flexWrap: "wrap", marginTop: 10 }}>
        <span><Icon n="mail" s={13} /> {p.email}</span><span><Icon n="phone" s={13} /> {p.tel ? fmtTel(p.tel) : "Aucun numéro"}</span>
        <span><Icon n="clock" s={13} /> Membre depuis le {fmtD(p.created_at)}</span></div>
    </div>
    {p.photo && <button className="btn sm ghost" onClick={() => act(() => api.del("/admin/profile/photo"), "Photo retirée.")}><Icon n="trash" s={14} /> Retirer la photo</button>}
  </div>;
}

function InfoForm({ p, reload }) {
  const { refresh } = useAdm(), act = useAct(() => { reload(); refresh(); });
  const [f, setF] = useState({ prenom: p.prenom, nom: p.nom, tel: fmtTel(p.tel), password: "" });
  useEffect(() => setF({ prenom: p.prenom, nom: p.nom, tel: fmtTel(p.tel), password: "" }), [p.prenom, p.nom, p.tel]);
  const telChanged = f.tel.replace(/\D/g, "") !== String(p.tel || "").replace(/\D/g, "");
  const dirty = telChanged || f.prenom.trim() !== p.prenom || f.nom.trim() !== p.nom;
  const save = e => { e.preventDefault(); act(() => api.patch("/admin/profile", { prenom: f.prenom, nom: f.nom, tel: f.tel, password: telChanged ? f.password : undefined }), "Profil mis à jour."); };
  const set = k => e => setF({ ...f, [k]: e.target.value });
  return <Panel title="Informations personnelles" ic="user"><form className="col" style={{ display: "flex", flexDirection: "column", gap: 12 }} onSubmit={save}>
    <div className="grid2"><div className="field"><label htmlFor="pf-pr">Prénom</label><input id="pf-pr" className="inp" value={f.prenom} onChange={set("prenom")} autoComplete="given-name" /></div>
      <div className="field"><label htmlFor="pf-nm">Nom</label><input id="pf-nm" className="inp" value={f.nom} onChange={set("nom")} autoComplete="family-name" /></div></div>
    <div className="field"><label htmlFor="pf-em">E-mail professionnel</label><input id="pf-em" className="inp" value={p.email} disabled /><span className="hint">Identifiant de connexion : modifiable uniquement par le Super Admin.</span></div>
    <div className="field"><label htmlFor="pf-tel">Téléphone</label><input id="pf-tel" className="inp" inputMode="tel" value={f.tel} onChange={set("tel")} autoComplete="tel" /><span className="hint">Reçoit vos codes de connexion (OTP).</span></div>
    {telChanged && <div className="field"><label htmlFor="pf-pw">Mot de passe actuel (confirmation)</label><PwField><input id="pf-pw" className="inp" type="password" autoComplete="current-password" value={f.password} onChange={set("password")} /></PwField>
      <span className="hint">Le changement de numéro est protégé : l’ancien numéro sera prévenu par SMS.</span></div>}
    <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
      {dirty && <button type="button" className="btn sm ghost" onClick={() => setF({ prenom: p.prenom, nom: p.nom, tel: fmtTel(p.tel), password: "" })}>Annuler</button>}
      <button className="btn sm red" disabled={!dirty || (telChanged && !f.password)}><Icon n="check" s={14} /> Enregistrer</button></div>
  </form></Panel>;
}

function Security({ p, reload }) {
  const { renew, toast } = useAdm();
  const [f, setF] = useState({ current: "", next: "", confirm: "" }), [busy, setBusy] = useState(false), [ask, setAsk] = useState(false);
  const s = strength(f.next), ok = RULES.every(([, t]) => t(f.next)) && f.next === f.confirm && f.current;
  const change = async e => {
    e.preventDefault(); setBusy(true);
    try { const r = await api.post("/admin/profile/password", { current: f.current, next: f.next }); renew(r.token); setF({ current: "", next: "", confirm: "" }); toast("Mot de passe modifié · vos autres sessions ont été fermées."); reload(); }
    catch (x) { toast(x.message, "alert"); } finally { setBusy(false); }
  };
  const others = async () => { try { const r = await api.post("/admin/profile/logout-others", {}); renew(r.token); setAsk(false); toast("Toutes vos autres sessions ont été fermées."); reload(); } catch (x) { toast(x.message, "alert"); } };
  const set = k => e => setF({ ...f, [k]: e.target.value });
  return <Panel title="Sécurité du compte" ic="shield">
    <form style={{ display: "flex", flexDirection: "column", gap: 12 }} onSubmit={change}>
      <div className="t-s">Dernier changement de mot de passe : <b>{p.pw_changed_at ? fmtDT(p.pw_changed_at) : "jamais modifié depuis la création du compte"}</b></div>
      <div className="field"><label htmlFor="sc-cur">Mot de passe actuel</label><PwField><input id="sc-cur" className="inp" type="password" autoComplete="current-password" value={f.current} onChange={set("current")} /></PwField></div>
      <div className="grid2">
        <div className="field"><label htmlFor="sc-new">Nouveau mot de passe</label><PwField><input id="sc-new" className="inp" type="password" autoComplete="new-password" value={f.next} onChange={set("next")} /></PwField></div>
        <div className="field"><label htmlFor="sc-cf">Confirmation</label><PwField><input id="sc-cf" className={`inp ${f.confirm && f.confirm !== f.next ? "err" : ""}`} type="password" autoComplete="new-password" value={f.confirm} onChange={set("confirm")} /></PwField></div></div>
      {f.next && <div><div style={{ display: "flex", gap: 4 }}>{[1, 2, 3, 4].map(i => <i key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i <= s ? STRENGTH[s][1] : "var(--line)" }} />)}</div>
        <div className="t-s" style={{ marginTop: 4 }}>Robustesse : <b style={{ color: STRENGTH[s][1] }}>{STRENGTH[s][0]}</b></div></div>}
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", gap: 14, flexWrap: "wrap" }}>{RULES.map(([l, t]) => { const on = t(f.next); return <li key={l} className="t-s" style={{ color: on ? "var(--green-d)" : undefined, display: "flex", gap: 5, alignItems: "center" }}><Icon n={on ? "check" : "x"} s={12} />{l}</li>; })}
        {f.confirm && <li className="t-s" style={{ color: f.confirm === f.next ? "var(--green-d)" : "var(--red)", display: "flex", gap: 5, alignItems: "center" }}><Icon n={f.confirm === f.next ? "check" : "x"} s={12} />Confirmation identique</li>}</ul>
      <div className="row" style={{ justifyContent: "flex-end" }}><button className="btn sm red" disabled={!ok || busy}>{busy ? <span className="spin-inline" /> : <Icon n="key" s={14} />} Changer le mot de passe</button></div>
    </form>
    <div style={{ borderTop: "1px solid var(--line)", marginTop: 16, paddingTop: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <div className="grow" style={{ minWidth: 220 }}><div className="t-h" style={{ fontSize: 14 }}>Sessions ouvertes</div><div className="t-s">Fermez les sessions ouvertes sur d’autres ordinateurs ou navigateurs. Celle-ci reste active.</div></div>
      <button className="btn sm ghost" onClick={() => setAsk(true)}><Icon n="logout" s={14} /> Déconnecter les autres sessions</button></div>
    {ask && <Modal title="Déconnecter les autres sessions ?" onClose={() => setAsk(false)}>
      <p className="t-s" style={{ margin: 0 }}>Toutes vos sessions ouvertes ailleurs seront fermées immédiatement ; une nouvelle connexion (mot de passe + code SMS) sera demandée sur ces appareils.</p>
      <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}><button className="btn sm ghost" onClick={() => setAsk(false)}>Annuler</button><button className="btn sm red" onClick={others}>Déconnecter</button></div></Modal>}
  </Panel>;
}

export function Profile() {
  const [d, reload] = useData("/admin/profile");
  if (!d) return <Loading />;
  const p = d.profile, mods = d.access.reduce((m, a) => ((m[a.module] = m[a.module] || []).push(a), m), {});
  return <Page title="Mon profil" sub="Vos informations, la sécurité de votre compte et votre activité sur le back-office.">
    <Identity d={d} reload={reload} />
    <div className="kpis" style={{ margin: "14px 0" }}>
      <Kpi ic="clock" label={p.last_login ? `Dernière connexion · ${fmtDT(p.last_login).slice(-5)}` : "Dernière connexion"} value={p.last_login ? fmtD(p.last_login) : "—"} />
      <Kpi ic="check" label="Connexions · 30 jours" value={d.stats.logins30} color="var(--green-d)" bg="var(--green-s)" />
      <Kpi ic="alert" label="Échecs · 30 jours" value={d.stats.failed30} color={d.stats.failed30 ? "var(--red)" : "var(--muted)"} bg={d.stats.failed30 ? "var(--red-s)" : "var(--soft)"} />
      <Kpi ic="list" label="Actions · 30 jours" value={d.stats.actions30} color="#7C3AED" bg="#EFE7FD" />
    </div>
    <div className="grid-2"><InfoForm p={p} reload={reload} /><Security p={p} reload={reload} /></div>
    <Panel title={`Mes accès · ${d.access.length} permission${d.access.length > 1 ? "s" : ""}`} ic="key" style={{ marginTop: 14 }}>
      <div className="t-s" style={{ marginBottom: 10 }}>Accordées par le rôle « {p.roleLabel} ». Pour toute modification, adressez-vous au Super Admin.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>{Object.entries(mods).map(([m, list]) =>
        <div key={m} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 12 }}><div className="t-h" style={{ fontSize: 13, marginBottom: 6 }}>{m}</div>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>{list.map(a => <li key={a.code} className="t-s" style={{ display: "flex", gap: 6 }}><Icon n="check" s={12} style={{ color: "var(--green)", marginTop: 3 }} />{a.label}</li>)}</ul></div>)}</div>
    </Panel>
    <div className="grid-2" style={{ marginTop: 14 }}>
      <Panel title="Historique de connexion" ic="desktop"><Table rows={d.logins} empty="Aucune connexion enregistrée." cols={[
        ["Date", r => fmtDT(r.created_at)], ["Résultat", r => <P c={r.success ? "green" : "red"}>{r.success ? "Réussie" : "Échouée"}</P>],
        ["Appareil", r => device(r.user_agent)], ["Adresse IP", r => <span className="mono">{(r.ip || "—").replace(/^::ffff:/, "")}</span>]]} /></Panel>
      <Panel title="Mon activité récente" ic="list"><Table rows={d.activity} empty="Aucune action enregistrée." cols={[
        ["Date", r => fmtDT(r.created_at)], ["Action", r => <><b style={{ fontWeight: 600 }}>{actionLabel(r.action)}</b>{r.details && <div className="t-s">{r.details}</div>}</>],
        ["Référence", r => r.entity_ref && r.entity !== "staff" ? <span className="mono">{r.entity_ref}</span> : "—"]]} /></Panel>
    </div>
  </Page>;
}
