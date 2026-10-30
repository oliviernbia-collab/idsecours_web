/* Super Admin : utilisateurs internes, rôles & permissions, agences, paramètres, journaux */
import { useEffect, useState } from "react";
import { adminApi as api } from "../../lib/api.js";
import Icon from "../../ui/Icon.jsx";
import { Page, Panel, Table, Modal, P, useData, useAct, useAdm, Loading, csv } from "../kit.jsx";
import { COMMUNES, COORDS } from "@shared/constants.js";
import { AgencyMap, AG_ST } from "./supervision.jsx";
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
  const [f, setF] = useState(null), [st, setSt] = useState(null), [fiche, setFiche] = useState(null);
  const act = useAct(reload);
  const EDIT = [["nom", "Nom"], ["adresse", "Adresse"], ["tel", "Téléphone"], ["email", "E-mail"], ["horaires", "Horaires"], ["responsable", "Responsable"], ["capacite", "Capacité de conservation (documents)", "number"], ["services", "Services disponibles"]];
  return <Page title="Agences" sub="Réseau d’agences ID SECOURS (réception, stock et restitution) · toute suspension exige un motif et est journalisée"
    actions={<button className="btn sm red" onClick={() => setF({ nom: "", commune: "Cocody", adresse: "", tel: "", email: "", horaires: "Lun–Sam · 8h–17h", responsable: "", capacite: "", services: "Réception, conservation, restitution" })}><Icon n="plus" s={14} /> Ajouter une agence</button>}>
    {d && <Panel title="Carte des agences" ic="map"><AgencyMap items={d.items} onPick={setFiche} /></Panel>}
    <Panel><Table rows={d && d.items} cols={[["Agence", r => <><b>{r.nom}</b><div className="t-s mono">{r.code}</div></>], ["Adresse", r => <>{r.adresse}<div className="t-s">{r.commune} · {r.tel}</div></>], ["Responsable", r => r.responsable || "—"], ["Horaires", r => r.horaires],
      ["Stock / capacité", r => r.capacite ? <><b>{r.stock}</b> / {r.capacite}<div className="t-s" style={{ color: r.stock / r.capacite > .9 ? "var(--red)" : undefined }}>{Math.round(r.stock * 100 / r.capacite)} % occupé</div></> : r.stock], ["Agents", r => r.agents],
      ["Statut", r => <><P c={AG_ST[r.status][1]}>{AG_ST[r.status][0]}</P>{r.status_motif && <div className="t-s">{r.status_motif}</div>}</>],
      ["", r => <div className="acts"><button className="btn sm ghost" onClick={() => setFiche(r)}>Fiche</button><button className="btn sm ghost" onClick={() => setF({ edit: r.id, ...Object.fromEntries(EDIT.map(([k]) => [k, r[k] == null ? "" : r[k]])) })}>Modifier</button>
        <button className="btn sm ghost" onClick={() => setSt({ id: r.id, nom: r.nom, status: r.status, motif: "" })}>Statut</button></div>]]} /></Panel>
    {f && <Modal title={f.edit ? "Modifier l’agence" : "Ajouter une agence"} onClose={() => setF(null)}>
      {!f.edit && <div className="field"><label>Commune</label><select className="inp" value={f.commune} onChange={e => setF({ ...f, commune: e.target.value })}>{COMMUNES.map(c => <option key={c}>{c}</option>)}</select></div>}
      <div className="grid-2">{EDIT.map(([k, l, t]) => <div key={k} className="field"><label>{l}</label><input className="inp" type={t || "text"} value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></div>)}</div>
      <button className="btn red" onClick={async () => {
        const { edit, ...b } = f, [lat, lng] = COORDS[b.commune] || [];
        if (await act(() => edit ? api.patch(`/admin/agencies/${edit}`, b) : api.post("/admin/agencies", { ...b, lat, lng }), edit ? "Agence modifiée · journalisé." : "Agence créée.")) setF(null); }}>Enregistrer</button></Modal>}
    {st && <Modal title={`Statut · ${st.nom}`} onClose={() => setSt(null)}>
      <div className="field"><label>Statut</label><select className="inp" value={st.status} onChange={e => setSt({ ...st, status: e.target.value })}>{Object.entries(AG_ST).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></div>
      {st.status !== "ACTIVE" && <div className="field"><label>Motif (obligatoire)</label><input className="inp" value={st.motif} onChange={e => setSt({ ...st, motif: e.target.value })} /></div>}
      <div className="note n-orange"><Icon n="info" s={16} /><span>Une agence non active n’apparaît plus dans l’application et ne reçoit plus de transferts.</span></div>
      <button className="btn red" onClick={async () => { if (await act(() => api.patch(`/admin/agencies/${st.id}`, { status: st.status, motif: st.motif }), "Statut mis à jour · journalisé.")) setSt(null); }}>Enregistrer</button></Modal>}
    {fiche && <Modal title={fiche.nom} onClose={() => setFiche(null)}>
      <dl className="kv"><dt>Code</dt><dd className="mono">{fiche.code}</dd><dt>Adresse</dt><dd>{fiche.adresse} · {fiche.commune}</dd><dt>Contact</dt><dd>{fiche.tel || "—"}{fiche.email ? " · " + fiche.email : ""}</dd><dt>Horaires</dt><dd>{fiche.horaires}</dd>
        <dt>Responsable</dt><dd>{fiche.responsable || "—"}</dd><dt>Services</dt><dd>{fiche.services || "—"}</dd><dt>Personnel</dt><dd>{fiche.agents} agent(s)</dd>
        <dt>Documents conservés</dt><dd>{fiche.stock}{fiche.capacite ? ` / ${fiche.capacite}` : ""}</dd><dt>Documents restitués</dt><dd>{fiche.restitues}</dd><dt>Collectes reçues</dt><dd>{fiche.collectes}</dd>
        <dt>Incidents ouverts</dt><dd>{fiche.incidents}</dd><dt>Statut</dt><dd><P c={AG_ST[fiche.status][1]}>{AG_ST[fiche.status][0]}</P>{fiche.status_motif ? " · " + fiche.status_motif : ""}</dd></dl></Modal>}
  </Page>;
}

/* cellule éditable : enregistre à la sortie du champ */
function Cell({ entity, code, field, value: raw, type = "number", reload, options }) {
  const value = raw ?? ""; // colonnes facultatives (description, fournisseur…) : champ vide plutôt que null
  const [v, setV] = useState(value); const act = useAct(reload);
  useEffect(() => setV(value), [value]);
  if (type === "select") return <select className="inp" style={{ minHeight: 34, width: 130 }} value={value} onChange={e => act(() => api.put(`/admin/settings/${entity}/${code}`, { [field]: e.target.value }), "Paramètre enregistré.")}>{options.map(o => <option key={o}>{o}</option>)}</select>;
  if (type === "bool") return <input type="checkbox" checked={!!value} onChange={e => act(() => api.put(`/admin/settings/${entity}/${code}`, { [field]: e.target.checked ? 1 : 0 }), "Paramètre enregistré.")} />;
  return <input className="inp" style={{ minHeight: 34, width: type === "number" ? 100 : 200 }} type={type} value={v} onChange={e => setV(e.target.value)}
    onBlur={() => String(v) !== String(value) && act(() => api.put(`/admin/settings/${entity}/${code}`, { [field]: type === "number" ? +v : v }), "Paramètre enregistré · historique mis à jour.")} />;
}
export function Settings() {
  const [d, reload] = useData("/admin/settings");
  const [tab, setTab] = useState("categories"), [nc, setNc] = useState(null);
  const act = useAct(reload);
  if (!d) return <Loading />;
  const C = (e, f, t, options) => r => <Cell entity={e} code={r.code || r.k} field={f} value={r[f]} type={t} reload={reload} options={options} />;
  const NEW_CAT = { code: "", label: "", short: "", prix: 300, frais: 2000, prefix: "", official: 0, num_required: 1, recto_required: 0, verso_required: 0, has_expiry: 1, has_issuer: 1, description: "" };
  const tabs = { categories: "Catégories & tarifs", packs: "Packs", formules: "Formules", paymethods: "Moyens de paiement", settings: "Paramètres système", history: "Historique des tarifs" };
  return <Page title="Paramètres & tarifs" sub="Toute modification est journalisée (ancienne et nouvelle valeur, auteur, date)."
    actions={tab === "categories" && <button className="btn sm red" onClick={() => setNc(NEW_CAT)}><Icon n="plus" s={14} /> Nouvelle catégorie</button>}>
    <div className="chips">{Object.entries(tabs).map(([k, l]) => <button key={k} className={`chip ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{l}</button>)}</div>
    <Panel>
      {tab === "categories" && <Table rows={d.categories} keyf={r => r.code} cols={[["Code", r => <span className="mono">{r.code}</span>], ["Libellé", C("categories", "label", "text")], ["Protection (FCFA/an)", C("categories", "prix")], ["Frais de récupération", C("categories", "frais")], ["Décl. officielle", C("categories", "official", "bool")],
        ["N° obligatoire", C("categories", "num_required", "bool")], ["Recto requis", C("categories", "recto_required", "bool")], ["Verso requis", C("categories", "verso_required", "bool")], ["Date d’expiration", C("categories", "has_expiry", "bool")], ["Organisme émetteur", C("categories", "has_issuer", "bool")],
        ["Description", C("categories", "description", "text")], ["Active", C("categories", "active", "bool")]]} />}
      {tab === "packs" && <Table rows={d.packs} keyf={r => r.code} cols={[["Code", r => <span className="mono">{r.code}</span>], ["Libellé", C("packs", "label", "text")], ["Prix", C("packs", "prix")], ["Docs 500", C("packs", "quota500")], ["Docs 300", C("packs", "quota300")], ["Description", C("packs", "description", "text")], ["Actif", C("packs", "active", "bool")]]} />}
      {tab === "formules" && <Table rows={d.formules} keyf={r => r.code} cols={[["Code", r => <span className="mono">{r.code}</span>], ["Prix", C("formules", "prix")], ["Docs max (0 = ∞)", C("formules", "max_docs")], ["Collectes/an (-1 = ∞)", C("formules", "collect_quota")], ["Livraisons/an (-1 = ∞)", C("formules", "delivery_quota")], ["Priorité", C("formules", "priorite", "text")], ["Publication", C("formules", "publication", "bool")], ["Active", C("formules", "active", "bool")]]} />}
      {tab === "paymethods" && <Table rows={d.paymethods} keyf={r => r.code} cols={[["Code", r => <span className="mono">{r.code}</span>], ["Libellé", C("paymethods", "label", "text")], ["Fournisseur / agrégateur", C("paymethods", "provider", "text")], ["Frais (%)", C("paymethods", "fee_pct")], ["Frais fixes (FCFA)", C("paymethods", "fee_fixed")],
        ["Environnement", C("paymethods", "env", "select", ["SIMULATION", "TEST", "PRODUCTION"])], ["Actif", C("paymethods", "active", "bool")]]} />}
      {tab === "paymethods" && <div className="note n-blue" style={{ marginTop: 10 }}><Icon n="lock" s={16} /><span>Les clés d’API et secrets des passerelles ne sont jamais affichés ni modifiables ici : ils sont stockés dans la configuration sécurisée du serveur.</span></div>}
      {tab === "settings" && <Table rows={d.settings} keyf={r => r.k} cols={[["Paramètre", r => <span className="mono">{r.k}</span>], ["Valeur", r => <Cell entity="settings" code={r.k} field="v" value={r.v} type="text" reload={reload} />]]} />}
      {tab === "history" && <Table rows={d.history} cols={[["Date", r => fmtDT(r.created_at)], ["Élément", r => `${r.entity} · ${r.code}`], ["Champ", r => r.field], ["Avant", r => r.old_value], ["Après", r => <b>{r.new_value}</b>], ["Auteur", r => `${r.prenom || ""} ${r.nom || ""}`]]} empty="Aucune modification." />}
    </Panel>
    {nc && <Modal title="Nouvelle catégorie de document" onClose={() => setNc(null)}>
      <div className="grid-2">{[["code", "Code (ex. : CSJ)"], ["label", "Libellé"], ["short", "Libellé court"], ["prefix", "Préfixe du numéro"]].map(([k, l]) => <div key={k} className="field"><label>{l}</label><input className="inp" value={nc[k]} onChange={e => setNc({ ...nc, [k]: e.target.value })} /></div>)}
        {[["prix", "Protection (FCFA/an)"], ["frais", "Frais de récupération (FCFA)"]].map(([k, l]) => <div key={k} className="field"><label>{l}</label><input className="inp" type="number" min="0" value={nc[k]} onChange={e => setNc({ ...nc, [k]: +e.target.value })} /></div>)}</div>
      <div className="field"><label>Description</label><input className="inp" value={nc.description} onChange={e => setNc({ ...nc, description: e.target.value })} /></div>
      <div className="grid-2">{[["num_required", "Numéro obligatoire"], ["recto_required", "Photo recto requise"], ["verso_required", "Photo verso requise"], ["has_expiry", "Date d’expiration"], ["has_issuer", "Organisme émetteur"], ["official", "Déclaration officielle exigée"]].map(([k, l]) =>
        <label key={k} className="row" style={{ gap: 8 }}><input type="checkbox" checked={!!nc[k]} onChange={e => setNc({ ...nc, [k]: e.target.checked ? 1 : 0 })} />{l}</label>)}</div>
      <button className="btn red" onClick={async () => { if (await act(() => api.post("/admin/settings/categories", nc), "Catégorie créée · disponible dans l’application.")) setNc(null); }}>Créer la catégorie</button></Modal>}
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
