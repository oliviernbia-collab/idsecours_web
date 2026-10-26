/* Super Admin : utilisateurs internes, rôles & permissions, agences, paramètres, journaux */
import { useEffect, useState } from "react";
import { adminApi as api } from "../../lib/api.js";
import Icon from "../../ui/Icon.jsx";
import { Page, Panel, Table, Modal, P, useData, useAct, useAdm, Loading, csv } from "../kit.jsx";
import { COMMUNES } from "@shared/constants.js";
import { fmtDT, fcfa } from "@shared/format.js";

export function Staff() {
  const [d, reload] = useData("/admin/staff");
  const [f, setF] = useState(null);
  const act = useAct(reload), { staff: me } = useAdm();
  if (!d) return <Loading />;
  return <Page title="Utilisateurs internes" sub="Comptes des agents · un mot de passe provisoire est communiqué à l’agent" actions={<button className="btn sm red" onClick={() => setF({ prenom: "", nom: "", email: "", tel: "", role: "SUPPORT", agency: "", password: "" })}><Icon n="plus" s={14} /> Créer un agent</button>}>
    <Panel><Table rows={d.items} cols={[["Agent", r => <><b>{r.prenom} {r.nom}</b><div className="t-s">{r.email}</div></>],
      ["Rôle", r => <select className="inp" style={{ minHeight: 34, width: "auto" }} value={r.role} disabled={r.id === me.id} onChange={e => act(() => api.patch(`/admin/staff/${r.id}`, { role: e.target.value }), "Rôle modifié.")}>{d.roles.map(x => <option key={x.code} value={x.code}>{x.label}</option>)}</select>],
      ["Agence", r => <select className="inp" style={{ minHeight: 34, width: "auto" }} value={r.agency_id || ""} onChange={e => act(() => api.patch(`/admin/staff/${r.id}`, { agency: e.target.value }), "Agence modifiée.")}><option value="">Siège</option>{d.agencies.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}</select>],
      ["Dernière connexion", r => r.last_login ? fmtDT(r.last_login) : "—"], ["Statut", r => <P c={r.status === "ACTIVE" ? "green" : "red"}>{r.status}</P>],
      ["", r => r.id !== me.id ? <div className="acts"><button className="btn sm ghost" onClick={() => act(() => api.patch(`/admin/staff/${r.id}`, { status: r.status === "ACTIVE" ? "SUSPENDU" : "ACTIVE" }), "Statut mis à jour.")}>{r.status === "ACTIVE" ? "Suspendre" : "Réactiver"}</button></div> : <span className="t-s">Vous</span>]]} /></Panel>
    {f && <Modal title="Créer un utilisateur interne" onClose={() => setF(null)}>
      <div className="grid2">{[["prenom", "Prénom"], ["nom", "Nom"]].map(([k, l]) => <div key={k} className="field"><label>{l}</label><input className="inp" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></div>)}</div>
      <div className="field"><label>E-mail professionnel</label><input className="inp" type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
      <div className="field"><label>Téléphone</label><input className="inp" value={f.tel} onChange={e => setF({ ...f, tel: e.target.value })} /></div>
      <div className="grid2"><div className="field"><label>Rôle</label><select className="inp" value={f.role} onChange={e => setF({ ...f, role: e.target.value })}>{d.roles.map(x => <option key={x.code} value={x.code}>{x.label}</option>)}</select></div>
        <div className="field"><label>Agence</label><select className="inp" value={f.agency} onChange={e => setF({ ...f, agency: e.target.value })}><option value="">Siège</option>{d.agencies.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}</select></div></div>
      <div className="field"><label>Mot de passe provisoire (8 caractères min.)</label><input className="inp mono" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></div>
      <button className="btn red" onClick={async () => { if (await act(() => api.post("/admin/staff", f), "Agent créé.")) setF(null); }}>Créer le compte</button></Modal>}
  </Page>;
}

export function Roles() {
  const [d, reload] = useData("/admin/roles");
  const [sel, setSel] = useState(null), [perms, setPerms] = useState([]);
  const act = useAct(reload);
  useEffect(() => { if (d && !sel) { const r = d.roles.find(x => x.code !== "SUPER_ADMIN"); if (r) { setSel(r.id); setPerms(r.perms); } } }, [d]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!d) return <Loading />;
  const role = d.roles.find(r => r.id === sel), modules = [...new Set(d.perms.map(p => p.module))];
  return <Page title="Rôles & permissions" sub="Principe de séparation des pouvoirs : un même agent ne réalise jamais seul une opération sensible.">
    <div className="grid-2" style={{ gridTemplateColumns: "minmax(240px,1fr) 3fr" }}>
      <Panel title="Rôles" ic="key"><div className="list" style={{ boxShadow: "none" }}>{d.roles.map(r => <button key={r.id} className="li" style={{ background: sel === r.id ? "var(--soft)" : undefined }} onClick={() => { setSel(r.id); setPerms(r.perms); }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: r.color }} /><div className="grow"><b>{r.label}</b><div className="t-s">{r.perms.length} permission(s)</div></div></button>)}</div></Panel>
      {role && <Panel title={role.label} ic="userShield" right={role.code !== "SUPER_ADMIN" && <button className="btn sm red" onClick={() => act(() => api.put(`/admin/roles/${role.id}`, { perms }), "Permissions enregistrées.")}>Enregistrer</button>}>
        {role.code === "SUPER_ADMIN" && <div className="note n-orange" style={{ marginBottom: 10 }}><Icon n="lock" s={16} /><span>Les droits du Super Admin ne sont pas modifiables.</span></div>}
        {modules.map(m => <div key={m} style={{ marginBottom: 12 }}><div className="t-label" style={{ marginBottom: 6 }}>{m}</div><div className="perm-grid">{d.perms.filter(p => p.module === m).map(p => <label key={p.code} className="chk"><input type="checkbox" disabled={role.code === "SUPER_ADMIN"} checked={perms.includes(p.code)} onChange={e => setPerms(e.target.checked ? [...perms, p.code] : perms.filter(x => x !== p.code))} />{p.label}</label>)}</div></div>)}</Panel>}
    </div>
  </Page>;
}

export function Agencies() {
  const [d, reload] = useData("/admin/agencies");
  const [f, setF] = useState(null);
  const act = useAct(reload);
  return <Page title="Agences" sub="Réseau d’agences ID SECOURS (réception, stock et restitution)" actions={<button className="btn sm red" onClick={() => setF({ nom: "", commune: "Cocody", adresse: "", tel: "", horaires: "Lun–Sam · 8h–17h" })}><Icon n="plus" s={14} /> Créer une agence</button>}>
    <Panel><Table rows={d && d.items} cols={[["Agence", r => <><b>{r.nom}</b><div className="t-s mono">{r.code}</div></>], ["Adresse", r => <>{r.adresse}<div className="t-s">{r.commune} · {r.tel}</div></>], ["Horaires", r => r.horaires], ["Stock", r => r.stock], ["Agents", r => r.agents],
      ["Statut", r => <P c={r.status === "ACTIVE" ? "green" : "red"}>{r.status}</P>], ["", r => <div className="acts"><button className="btn sm ghost" onClick={() => act(() => api.patch(`/admin/agencies/${r.id}`, { status: r.status === "ACTIVE" ? "SUSPENDUE" : "ACTIVE" }), "Statut mis à jour.")}>{r.status === "ACTIVE" ? "Suspendre" : "Activer"}</button></div>]]} /></Panel>
    {f && <Modal title="Créer une agence" onClose={() => setF(null)}>
      <div className="field"><label>Nom</label><input className="inp" value={f.nom} onChange={e => setF({ ...f, nom: e.target.value })} /></div>
      <div className="field"><label>Commune</label><select className="inp" value={f.commune} onChange={e => setF({ ...f, commune: e.target.value })}>{COMMUNES.map(c => <option key={c}>{c}</option>)}</select></div>
      {[["adresse", "Adresse"], ["tel", "Téléphone"], ["horaires", "Horaires"]].map(([k, l]) => <div key={k} className="field"><label>{l}</label><input className="inp" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></div>)}
      <button className="btn red" onClick={async () => { if (await act(() => api.post("/admin/agencies", f), "Agence créée.")) setF(null); }}>Enregistrer</button></Modal>}
  </Page>;
}

/* cellule éditable : enregistre à la sortie du champ */
function Cell({ entity, code, field, value, type = "number", reload }) {
  const [v, setV] = useState(value); const act = useAct(reload);
  useEffect(() => setV(value), [value]);
  if (type === "bool") return <input type="checkbox" checked={!!value} onChange={e => act(() => api.put(`/admin/settings/${entity}/${code}`, { [field]: e.target.checked ? 1 : 0 }), "Paramètre enregistré.")} />;
  return <input className="inp" style={{ minHeight: 34, width: type === "number" ? 100 : 200 }} type={type} value={v} onChange={e => setV(e.target.value)}
    onBlur={() => String(v) !== String(value) && act(() => api.put(`/admin/settings/${entity}/${code}`, { [field]: type === "number" ? +v : v }), "Paramètre enregistré · historique mis à jour.")} />;
}
export function Settings() {
  const [d, reload] = useData("/admin/settings");
  const [tab, setTab] = useState("categories");
  if (!d) return <Loading />;
  const C = (e, f, t) => r => <Cell entity={e} code={r.code || r.k} field={f} value={r[f]} type={t} reload={reload} />;
  const tabs = { categories: "Catégories & tarifs", packs: "Packs", formules: "Formules", paymethods: "Moyens de paiement", settings: "Paramètres système", history: "Historique des tarifs" };
  return <Page title="Paramètres & tarifs" sub="Toute modification est journalisée (ancienne et nouvelle valeur, auteur, date).">
    <div className="chips">{Object.entries(tabs).map(([k, l]) => <button key={k} className={`chip ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{l}</button>)}</div>
    <Panel>
      {tab === "categories" && <Table rows={d.categories} keyf={r => r.code} cols={[["Code", r => <span className="mono">{r.code}</span>], ["Libellé", C("categories", "label", "text")], ["Protection (FCFA/an)", C("categories", "prix")], ["Frais de récupération", C("categories", "frais")], ["Décl. officielle", C("categories", "official", "bool")], ["Active", C("categories", "active", "bool")]]} />}
      {tab === "packs" && <Table rows={d.packs} keyf={r => r.code} cols={[["Code", r => <span className="mono">{r.code}</span>], ["Libellé", C("packs", "label", "text")], ["Prix", C("packs", "prix")], ["Docs 500", C("packs", "quota500")], ["Docs 300", C("packs", "quota300")], ["Description", C("packs", "description", "text")], ["Actif", C("packs", "active", "bool")]]} />}
      {tab === "formules" && <Table rows={d.formules} keyf={r => r.code} cols={[["Code", r => <span className="mono">{r.code}</span>], ["Prix", C("formules", "prix")], ["Docs max (0 = ∞)", C("formules", "max_docs")], ["Collectes/an (-1 = ∞)", C("formules", "collect_quota")], ["Livraisons/an (-1 = ∞)", C("formules", "delivery_quota")], ["Priorité", C("formules", "priorite", "text")], ["Publication", C("formules", "publication", "bool")], ["Active", C("formules", "active", "bool")]]} />}
      {tab === "paymethods" && <Table rows={d.paymethods} keyf={r => r.code} cols={[["Code", r => <span className="mono">{r.code}</span>], ["Libellé", C("paymethods", "label", "text")], ["Actif", C("paymethods", "active", "bool")]]} />}
      {tab === "settings" && <Table rows={d.settings} keyf={r => r.k} cols={[["Paramètre", r => <span className="mono">{r.k}</span>], ["Valeur", r => <Cell entity="settings" code={r.k} field="v" value={r.v} type="text" reload={reload} />]]} />}
      {tab === "history" && <Table rows={d.history} cols={[["Date", r => fmtDT(r.created_at)], ["Élément", r => `${r.entity} · ${r.code}`], ["Champ", r => r.field], ["Avant", r => r.old_value], ["Après", r => <b>{r.new_value}</b>], ["Auteur", r => `${r.prenom || ""} ${r.nom || ""}`]]} empty="Aucune modification." />}
    </Panel>
    <p className="t-s">Exemple : CNI {fcfa((d.categories.find(c => c.code === "CNI") || {}).prix)} / an · les nouveaux tarifs s’appliquent aux prochaines souscriptions.</p>
  </Page>;
}

export function Logs() {
  const [tab, setTab] = useState("audit"), [q, setQ] = useState("");
  const { can } = useAdm();
  const [d] = useData(tab === "audit" ? `/admin/audit?q=${encodeURIComponent(q)}&limit=200` : tab === "logins" ? "/admin/staff-logins" : "/admin/sms", [tab, q]);
  const cols = tab === "audit" ? [["Date", r => fmtDT(r.created_at)], ["Acteur", r => r.actor_type === "STAFF" ? `${r.prenom} ${r.nom}` : r.actor_type], ["Action", r => r.action], ["Élément", r => `${r.entity || ""} ${r.entity_ref || ""}`], ["Détails", r => r.details || ""], ["IP", r => r.ip || ""]]
    : tab === "logins" ? [["Date", r => fmtDT(r.created_at)], ["Compte", r => r.email], ["Agent", r => r.prenom ? `${r.prenom} ${r.nom}` : "—"], ["Résultat", r => r.success ? "Succès" : "Échec"], ["IP", r => r.ip], ["Navigateur", r => (r.user_agent || "").slice(0, 60)]]
      : [["Date", r => fmtDT(r.created_at)], ["Destinataire", r => r.tel], ["Message", r => r.body]];
  return <Page title="Journaux d’activité" sub="Aucune action sensible sans trace" actions={<><div className="chips">{[["audit", "Audit"], ["logins", "Connexions"], ...(can("support.messages") || can("staff.manage") ? [["sms", "SMS envoyés"]] : [])].map(([k, l]) => <button key={k} className={`chip ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{l}</button>)}</div>
    {tab === "audit" && <input className="inp" style={{ width: 220 }} placeholder="Filtrer (action, référence)" value={q} onChange={e => setQ(e.target.value)} />}{d && <button className="btn sm ghost" onClick={() => csv("journal-" + tab, d.items, cols)}><Icon n="download" s={14} /> Export</button>}</>}>
    <Panel><Table rows={d && d.items} cols={cols.map(([l, f]) => [l, r => <span className={l === "Action" ? "mono" : ""}>{f(r)}</span>])} /></Panel>
  </Page>;
}
