/* Opérations, Collecte & Livraison, Réception & Restitution, Vérification & Contrôle */
import { useState } from "react";
import { adminApi as api, form } from "../../lib/api.js";
import Icon from "../../ui/Icon.jsx";
import { Page, Panel, Table, Modal, P, useData, useAct, useAdm, csv, SignaturePad, ProofView } from "../kit.jsx";
import { COL_STEPS, DOC_ST, OFFI_ST } from "@shared/constants.js";
import { fmtD, fmtDT, fmtTel } from "@shared/format.js";

const STEP_C = ["grey", "orange", "blue", "blue", "orange", "orange", "blue", "blue", "green"];

export function Declarations() {
  const [open, setOpen] = useState(true);
  const [d, reload] = useData(`/admin/declarations${open ? "?open=1" : ""}`, [open]);
  const act = useAct(reload), { can } = useAdm();
  const cols = [["Référence", r => <span className="mono">{r.ref}</span>], ["Date", r => fmtDT(r.created_at)], ["Document", r => <>{r.cat}<div className="t-s mono">{r.numero}</div></>],
    ["Déclarant", r => <>{r.prenom} {r.nom}<div className="t-s">{fmtTel(r.tel)}</div></>], ["Circonstances", r => <>{r.circonstances}<div className="t-s">{r.commune || "—"} · perte le {fmtD(r.date_perte)}</div></>],
    ["Statut", r => <>{r.closed ? <P>Clôturé</P> : <P c={DOC_ST[r.doc_status].c}>{DOC_ST[r.doc_status].l}</P>}{r.is_sensitive ? <> <P c="red">Sensible</P></> : null}</>],
    ["Décl. officielle", r => r.official ? <P c={OFFI_ST[r.offi || "NON TRANSMISE"]}>{r.offi || "NON TRANSMISE"}</P> : <span className="t-s">Non exigée</span>],
    ["", r => can("declarations.manage") && !r.closed ? <div className="acts">{r.doc_status === "PERDU" && <button className="btn sm ghost" onClick={() => act(() => api.post(`/admin/declarations/${r.ref}/status`, { status: "RECHERCHE" }), "Recherche active")}>Recherche active</button>}
      <button className="btn sm ghost" onClick={() => act(() => api.post(`/admin/declarations/${r.ref}/status`, { status: "SENSIBLE" }))}>{r.is_sensitive ? "Retirer sensible" : "Marquer sensible"}</button></div> : null]];
  return <Page title="Déclarations de perte" sub="Dossiers déclarés par les abonnés · rapprochement automatique avec les documents détenus"
    actions={<><label className="chk"><input type="checkbox" checked={open} onChange={e => setOpen(e.target.checked)} />En cours uniquement</label>{d && <button className="btn sm ghost" onClick={() => csv("declarations", d.items, [["Référence", r => r.ref], ["Date", r => fmtDT(r.created_at)], ["Document", r => r.cat], ["Numéro", r => r.numero], ["Déclarant", r => `${r.prenom} ${r.nom}`], ["Téléphone", r => r.tel], ["Circonstances", r => r.circonstances], ["Commune", r => r.commune], ["Clôturé", r => r.closed ? "Oui" : "Non"]])}><Icon n="download" s={14} /> Export</button>}</>}>
    <Panel><Table rows={d && d.items} cols={cols} empty="Aucune déclaration." /></Panel>
  </Page>;
}

export function Founds() {
  const [d, reload] = useData("/admin/founds", [], 10000);
  const [parts] = useData("/admin/partners");
  const [modal, setModal] = useState(null), [code, setCode] = useState(""), [partner, setPartner] = useState("");
  const act = useAct(reload), { can } = useAdm();
  return <Page title="Collectes ① ②" sub="① signalement du grand public · ② déploiement d’un livreur partenaire · le livreur dépose ensuite le document à l’agence, où la Réception confirme la réception physique (③ double confirmation)">
    <Panel><Table rows={d && d.items} empty="Aucun signalement." cols={[
      ["Signalement", r => <><span className="mono">{r.ref}</span><div className="t-s">{fmtDT(r.created_at)}</div></>], ["Document", r => <>{r.cat}<div className="t-s mono">{r.numero || r.nom_visible || "—"}</div></>],
      ["Enregistré", r => r.registered ? <P c="green">Abonné</P> : <P>Non enregistré</P>], ["Point de collecte", r => <>{r.commune || "—"}<div className="t-s">{r.repere || r.slot || ""}</div></>],
      ["Mission", r => r.mission_ref ? <><span className="mono">{r.mission_ref}</span><div className="t-s">{r.partner} · {r.collecteur}</div></> : "—"],
      ["Étape", r => <P c={STEP_C[r.step]}>{COL_STEPS[r.step]}</P>],
      ["", r => can("collectes.manage") ? <div className="acts">{r.step < 5 && <button className="btn sm ghost" onClick={() => { setPartner(""); setModal({ t: "assign", r }); }}>Affecter</button>}
        {r.step >= 3 && r.step < 5 && <button className="btn sm ghost" title="Si le livreur ne peut pas utiliser son portail" onClick={() => { setCode(""); setModal({ t: "hand", r }); }}><Icon n="qr" s={13} /> Remise (secours)</button>}</div> : null]]} /></Panel>
    <div className="note n-blue"><Icon n="moto" s={16} /><span>Les livreurs suivent leurs missions, se déclarent en route et valident le code de remise depuis leur portail : <b>/livreur</b> (code collecteur + PIN).</span></div>
    {modal && modal.t === "assign" && <Modal title={`Affecter la mission · ${modal.r.ref}`} onClose={() => setModal(null)}>
      <div className="field"><label>Partenaire</label><select className="inp" value={partner} onChange={e => setPartner(e.target.value)}><option value="">Choisir…</option>{parts && parts.items.filter(p => p.status === "ACTIF").map(p => <option key={p.id} value={p.id}>{p.nom} · {p.collecteur} ({p.zones})</option>)}</select></div>
      <div className="note n-blue"><Icon n="lock" s={16} /><span>Le partenaire ne reçoit que les données nécessaires à la mission (R49).</span></div>
      <button className="btn red" disabled={!partner} onClick={async () => { if (await act(() => api.post(`/admin/founds/${modal.r.ref}/assign`, { partner }), "Mission affectée.")) setModal(null); }}>Affecter</button></Modal>}
    {modal && modal.t === "hand" && <Modal title={`Remise au collecteur · ${modal.r.mission_ref}`} onClose={() => setModal(null)}>
      <p className="t-s" style={{ margin: 0 }}>Saisissez le code sécurisé affiché sur le téléphone de la personne qui a trouvé le document (ou scanné depuis son QR code). Le code est invalidé après usage.</p>
      <input className="inp mono" inputMode="numeric" maxLength={6} placeholder="Code à 6 chiffres" value={code} onChange={e => setCode(e.target.value)} autoFocus />
      <button className="btn green" disabled={code.length !== 6} onClick={async () => { if (await act(() => api.post(`/admin/founds/${modal.r.ref}/handover`, { code }), "Remise validée · code invalidé.")) setModal(null); }}>Valider la remise</button></Modal>}
  </Page>;
}

export function Partners() {
  const [d, reload] = useData("/admin/partners");
  const [f, setF] = useState(null);
  const act = useAct(reload), { can } = useAdm();
  return <Page title="Partenaires de livraison" sub="Entreprises de livraison externes agréées (moto, voiture)" actions={can("partners.manage") && <button className="btn sm red" onClick={() => setF({ nom: "", contact: "", tel: "", collecteur: "", vehicule: "", zones: "" })}><Icon n="plus" s={14} /> Nouveau partenaire</button>}>
    <Panel><Table rows={d && d.items} cols={[["Partenaire", r => <b>{r.nom}</b>], ["Contact", r => <>{r.contact}<div className="t-s">{r.tel}</div></>], ["Collecteur", r => <>{r.collecteur}<div className="t-s mono">{r.collecteur_code} · {r.vehicule}</div></>], ["Zones", r => <span className="t-s">{r.zones}</span>],
      ["Missions", r => `${r.done} / ${r.missions}`], ["Statut", r => <P c={r.status === "ACTIF" ? "green" : "red"}>{r.status}</P>],
      ["", r => can("partners.manage") ? <div className="acts"><button className="btn sm ghost" onClick={() => { const pin = String(Math.floor(1000 + Math.random() * 9000)); act(() => api.patch(`/admin/partners/${r.id}`, { pin }), `Nouveau PIN de ${r.collecteur} : ${pin} (à communiquer au livreur).`); }}>Nouveau PIN</button>
        <button className="btn sm ghost" onClick={() => act(() => api.patch(`/admin/partners/${r.id}`, { status: r.status === "ACTIF" ? "SUSPENDU" : "ACTIF" }), "Statut mis à jour.")}>{r.status === "ACTIF" ? "Suspendre" : "Réactiver"}</button></div> : null]]} /></Panel>
    <div className="note n-blue"><Icon n="moto" s={16} /><span>Portail des livreurs : <b>{window.location.origin}/livreur</b> · connexion avec le code collecteur et le PIN. Le livreur ne voit que les données nécessaires à sa mission (R49).</span></div>
    {f && <Modal title="Nouveau partenaire" onClose={() => setF(null)}>
      {[["nom", "Raison sociale"], ["contact", "Contact"], ["tel", "Téléphone"], ["collecteur", "Collecteur principal"], ["vehicule", "Véhicule"], ["zones", "Zones (communes séparées par des virgules)"]].map(([k, l]) => <div key={k} className="field"><label>{l}</label><input className="inp" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></div>)}
      <button className="btn red" onClick={async () => { if (await act(() => api.post("/admin/partners", f), "Partenaire créé.")) setF(null); }}>Enregistrer</button></Modal>}
  </Page>;
}

export function Reception() {
  const { can } = useAdm();
  const [pend, reloadP] = useData("/admin/reception/pending", [], 10000);
  const [stock, reloadS] = useData("/admin/stock");
  const [modal, setModal] = useState(null), [res, setRes] = useState(null);
  const reload = () => { reloadP(); reloadS(); };
  const act = useAct(reload);
  const receive = async () => {
    const { files = {}, degats = [], ...data } = modal;
    const observation = [...degats, data.observation].filter(Boolean).join(" · ");
    try { const r = await api.post("/admin/reception", form({ ...data, observation, recto: files.recto, verso: files.verso, anomaliePhoto: files.anomalie })); setRes(r); setModal(null); reload(); } catch (e) { act(() => Promise.reject(e)); }
  };
  return <Page title="Réception & stock sécurisé" sub="Chaîne de responsabilité : qui a reçu, quand, dans quel état, où il est conservé, qui l’a sorti"
    actions={can("reception.manage") && <button className="btn sm red" onClick={() => setModal({ cat: "CNI", numero: "", nom: "", etatPhysique: "Bon état", emplacement: "" })}><Icon n="plus" s={14} /> Réception manuelle</button>}>
    {can("reception.manage") && <Panel title="③ Documents attendus · remis aux livreurs" ic="truck"><Table rows={pend && pend.items} empty="Aucun document en transit vers l’agence." cols={[
      ["Signalement", r => <span className="mono">{r.ref}</span>], ["Document", r => <>{r.cat}<div className="t-s mono">{r.numero || r.nom_visible}</div></>], ["Mission", r => <>{r.mission_ref}<div className="t-s">{r.partner} · {r.collecteur}</div></>], ["Collecté le", r => fmtDT(r.handed_at)],
      ["", r => <div className="acts"><button className="btn sm green" onClick={() => setModal({ found: r.ref, mission: r.mission_ref, numero: r.numero || "", nom: r.nom_visible || "", etatPhysique: "Bon état", emplacement: "", anomalie: "Document conforme", motif: "" })}>Confirmer la réception physique</button></div>]]} /></Panel>}
    <Panel title="Stock" ic="warehouse"><Table rows={stock && stock.items} cols={[
      ["Réception", r => <><span className="mono">{r.reception_ref}</span><div className="t-s">{fmtDT(r.received_at)}</div></>], ["Document", r => <>{r.cat}<div className="t-s mono">{r.numero || "—"}</div></>], ["Titulaire", r => r.nom || "—"],
      ["État", r => r.etat_physique], ["Agence", r => r.agence], ["Emplacement", r => r.emplacement ? <span className="mono">{r.emplacement}</span> : <P c="orange">Sans emplacement</P>],
      ["Statut", r => <P c={{ A_CONTROLER: "orange", RECU: "orange", CONSERVE: "green", QUARANTAINE: "red", EN_RESTITUTION: "blue", RESTITUE: "grey" }[r.status]}>{r.status === "A_CONTROLER" ? "À CONTRÔLER" : r.status.replace("_", " ")}</P>],
      ["", r => can("reception.manage") && ["A_CONTROLER", "RECU", "CONSERVE", "QUARANTAINE"].includes(r.status) ? <div className="acts"><button className="btn sm ghost" onClick={() => setModal({ move: r, emplacement: r.emplacement || "", motif: "" })}>Déplacer</button></div> : null]]} /></Panel>
    {modal && !modal.move && <Modal title={modal.found ? `Réception physique · mission ${modal.mission}` : "Dépôt direct en agence"} onClose={() => setModal(null)}>
      {modal.found && <><div className="note n-blue"><Icon n="moto" s={16} /><span>Double confirmation : le livreur remet le document, vous confirmez sa réception physique. Le document sera ensuite contrôlé par Vérification & Contrôle (④).</span></div>
        <div className="field"><label>Constat à la réception</label><select className="inp" value={modal.anomalie} onChange={e => setModal({ ...modal, anomalie: e.target.value })}>{["Document conforme", "Document endommagé", "Document différent", "Document absent", "Enveloppe/conditionnement endommagé", "Référence incorrecte", "Autre anomalie"].map(x => <option key={x}>{x}</option>)}</select></div>
        {modal.anomalie !== "Document conforme" && <><div className="field"><label>Précisions (incident partenaire créé automatiquement)</label><input className="inp" value={modal.motif} onChange={e => setModal({ ...modal, motif: e.target.value })} /></div></>}</>}
      {!modal.found &&<div className="field"><label>Catégorie</label><select className="inp" value={modal.cat} onChange={e => setModal({ ...modal, cat: e.target.value })}>{["CNI", "PASS", "PERMIS", "PRO", "ETU", "SCO", "ASS", "MUT", "AUT"].map(c => <option key={c}>{c}</option>)}</select></div>}
      <div className="field"><label>Numéro du document (contrôlé)</label><input className="inp mono" value={modal.numero} onChange={e => setModal({ ...modal, numero: e.target.value })} /></div>
      <div className="field"><label>Nom du titulaire (tel qu’inscrit)</label><input className="inp" value={modal.nom} onChange={e => setModal({ ...modal, nom: e.target.value })} /></div>
      {modal.anomalie !== "Document absent" && <>
        <div className="t-label">Photos de l’état à la réception (obligatoires)</div>
        <div className="grid2">{[["recto", "Photo recto"], ["verso", "Photo verso"]].map(([k, l]) => <label key={k} className="photo" style={{ aspectRatio: "auto", height: 110 }}>{modal.files && modal.files[k] ? <img src={URL.createObjectURL(modal.files[k])} alt={l} /> : <span><Icon n="camera" s={20} /><br />{l}</span>}
          <input type="file" accept="image/*" capture="environment" onChange={async e => { const f = e.target.files[0]; if (f) setModal(md => ({ ...md, files: { ...(md.files || {}), [k]: f } })); }} /></label>)}</div>
        {modal.anomalie && modal.anomalie !== "Document conforme" && <label className="photo" style={{ aspectRatio: "auto", height: 80 }}>{modal.files && modal.files.anomalie ? <span style={{ color: "var(--green-d)" }}>Photo de l’anomalie ajoutée ✓</span> : <span><Icon n="camera" s={18} /> Photo de l’anomalie</span>}<input type="file" accept="image/*" capture="environment" onChange={e => { const f = e.target.files[0]; if (f) setModal(md => ({ ...md, files: { ...(md.files || {}), anomalie: f } })); }} /></label>}
        <div className="field"><label>État physique</label><select className="inp" value={modal.etatPhysique} onChange={e => setModal({ ...modal, etatPhysique: e.target.value })}>{["Bon état", "État moyen", "Endommagé", "Très endommagé", "Illisible / à contrôler"].map(x => <option key={x}>{x}</option>)}</select></div>
        <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>{["Plié", "Rayé", "Déchiré", "Mouillé", "Perforé", "Cassé", "Illisible"].map(x => { const on = (modal.degats || []).includes(x); return <button type="button" key={x} className={`chip ${on ? "on" : ""}`} onClick={() => setModal(md => ({ ...md, degats: on ? md.degats.filter(y => y !== x) : [...(md.degats || []), x] }))}>{x}</button>; })}</div>
        <div className="field"><label>Observation</label><input className="inp" value={modal.observation || ""} onChange={e => setModal({ ...modal, observation: e.target.value })} /></div></>}
      <div className="field"><label>Emplacement (ex. A-01-03)</label><input className="inp mono" value={modal.emplacement} onChange={e => setModal({ ...modal, emplacement: e.target.value })} /></div>
      <button className="btn red" onClick={receive}>Enregistrer la réception</button></Modal>}
    {modal && modal.move && <Modal title={`Déplacement · ${modal.move.reception_ref}`} onClose={() => setModal(null)}>
      <div className="field"><label>Nouvel emplacement</label><input className="inp mono" value={modal.emplacement} onChange={e => setModal({ ...modal, emplacement: e.target.value })} /></div>
      <div className="field"><label>Motif (obligatoire pour la traçabilité)</label><input className="inp" value={modal.motif} onChange={e => setModal({ ...modal, motif: e.target.value })} /></div>
      <div className="row"><button className="btn ghost sm" onClick={async () => { if (await act(() => api.post(`/admin/stock/${modal.move.id}/move`, { status: "QUARANTAINE", motif: modal.motif || "Isolement" }), "Document isolé.")) setModal(null); }}>Mettre en quarantaine</button>
        <button className="btn red sm grow" disabled={!modal.emplacement || !modal.motif} onClick={async () => { if (await act(() => api.post(`/admin/stock/${modal.move.id}/move`, { emplacement: modal.emplacement, status: "CONSERVE", motif: modal.motif }), "Déplacement tracé.")) setModal(null); }}>Enregistrer</button></div></Modal>}
    {res && <Modal title={res.ref ? `Réception enregistrée · ${res.ref}` : "Document absent"} onClose={() => setRes(null)}>
      {res.qr && <img src={res.qr} alt="QR interne" style={{ width: 200, alignSelf: "center", imageRendering: "pixelated" }} />}
      {res.ref && <div className="note n-blue"><Icon n="qr" s={16} /><span>QR code interne à imprimer sur l’étiquette de l’enveloppe sécurisée. Statut : <b>À CONTRÔLER</b> — le document n’est ni recherchable ni restituable avant la décision de Vérification & Contrôle.</span></div>}
      {res.incident && <div className="note n-red"><Icon n="alert" s={16} /><span>Incident partenaire {res.incident} créé automatiquement.</span></div>}
      {res.ref && <button className="btn ghost" onClick={() => window.print()}><Icon n="download" s={14} /> Imprimer l’étiquette</button>}</Modal>}
  </Page>;
}

/* ④ contrôle des documents reçus en agence : authenticité, identification et géolocalisation du propriétaire, décision */
export function FoundChecks() {
  const [d, reload] = useData("/admin/found-checks", [], 15000);
  const [m, setM] = useState(null), [f, setF] = useState({});
  const act = useAct(reload);
  const open = r => { setF({ numero: r.numero || "", nom: r.nom || "", dob: r.dob || "", exp: r.date_exp || "", note: "", auth: false, coherent: false }); setM(r); };
  const decide = async decision => { if (await act(() => api.post(`/admin/found-checks/${m.id}/decision`, { decision, numero: f.numero, nom: f.nom, dob: f.dob, exp: f.exp, note: f.note }), decision === "AUTHENTIQUE" ? "Document validé · indexé et conservé ; propriétaires enregistrés notifiés." : "Document mis en quarantaine · incident créé.")) setM(null); };
  return <Page title="Contrôle des documents reçus ④" sub="Vérifie l’authenticité · géolocalise et identifie le propriétaire · contrôle les informations · valide le dossier (aucune décision automatique)">
    <Panel><Table rows={d && d.items} empty="Aucun document à contrôler." cols={[
      ["Réception", r => <><span className="mono">{r.reception_ref}</span><div className="t-s">{fmtDT(r.received_at)} · {r.agence}</div></>], ["Document", r => <>{r.cat}<div className="t-s mono">{r.numero || r.nom || "—"}</div></>],
      ["Provenance", r => r.found_ref ? <>{r.found_ref}<div className="t-s">trouvé à {r.commune || "—"} · {r.mission_ref}</div></> : <span className="t-s">Dépôt direct</span>],
      ["Propriétaire identifié", r => r.owners.length ? <>{r.owners.map(o => <div key={o.id}>{o.prenom} {o.unom} <MatchPill m={o.match} /> <span className="t-s">· {o.perte || "pas de perte déclarée"}</span></div>)}{r.multiple && <P c="red">CORRESPONDANCES MULTIPLES</P>}</> : <span className="t-s">Non enregistré</span>],
      ["Contrôle", r => r.status === "A_CONTROLER" ? <P c="orange">À contrôler</P> : r.status === "QUARANTAINE" ? <P c="red">Suspect · quarantaine</P> : <P c="green">Validé · indexé</P>],
      ["", r => r.status === "A_CONTROLER" ? <div className="acts"><button className="btn sm ghost" onClick={() => open(r)}>Contrôler</button></div> : null]]} /></Panel>
    {m && <Modal title={`Contrôle · ${m.reception_ref}`} onClose={() => setM(null)}>
      <div className="t-s">Réceptionné par {m.rprenom} {m.rnom} · état : {m.etat_physique}{m.etat_observation ? ` (${m.etat_observation})` : ""}{m.anomalie ? ` · anomalie : ${m.anomalie}` : ""}</div>
      <div className="row" style={{ gap: 8 }}>{["r_recto", "r_verso", "r_anom"].filter(k => m[k]).map(k => <a key={k} href={api.fileUrl(m[k])} target="_blank" rel="noreferrer"><img className="thumb" src={api.fileUrl(m[k])} alt={k} /></a>)}<span className="t-s">Photos de réception (agence)</span></div>
      <div className="row" style={{ gap: 8 }}>{["photo_recto", "photo_verso"].map(k => m[k] ? <a key={k} href={api.fileUrl(m[k])} target="_blank" rel="noreferrer"><img className="thumb" src={api.fileUrl(m[k])} alt={k} /></a> : <div key={k} className="thumb" style={{ display: "grid", placeItems: "center" }}><Icon n="camera" s={18} /></div>)}<span className="t-s">Photos prises par la personne qui a trouvé le document · comparez avec l’original.</span></div>
      <div className="grid2"><div className="field"><label>Numéro relevé sur l’original</label><input className="inp mono" value={f.numero} onChange={e => setF({ ...f, numero: e.target.value })} /></div><div className="field"><label>Nom du titulaire</label><input className="inp" value={f.nom} onChange={e => setF({ ...f, nom: e.target.value })} /></div></div>
      <div className="grid2"><div className="field"><label>Date de naissance (identité visible)</label><input className="inp" type="date" value={f.dob} onChange={e => setF({ ...f, dob: e.target.value })} /></div><div className="field"><label>Date d’expiration</label><input className="inp" type="date" value={f.exp} onChange={e => setF({ ...f, exp: e.target.value })} /></div></div>
      <div className="panel" style={{ boxShadow: "none", border: "1px solid var(--line)" }}><b>Propriétaire et géolocalisation</b>
        {m.owners.length ? m.owners.map(o => <div key={o.id} className="t-s" style={{ marginTop: 6 }}>{o.prenom} {o.unom} ({o.commune || "—"}) · titulaire « {o.nom} {o.prenoms} » · né(e) le {o.dob || "—"} · {o.perte ? "perte " + o.perte : "aucune perte déclarée"} · document trouvé à {m.commune || "—"}</div>) : <div className="t-s" style={{ marginTop: 6 }}>Aucun abonné ne possède ce numéro : le document restera recherchable par son titulaire.</div>}</div>
      <label className="chk"><input type="checkbox" checked={f.auth} onChange={e => setF({ ...f, auth: e.target.checked })} />Authenticité vérifiée (sécurités, hologramme, typographie, photo)</label>
      <label className="chk"><input type="checkbox" checked={f.coherent} onChange={e => setF({ ...f, coherent: e.target.checked })} />Informations contrôlées et cohérentes avec le signalement</label>
      <div className="field"><label>Observation</label><textarea className="inp" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} placeholder="Obligatoire si le document est suspect" /></div>
      <div className="row" style={{ flexWrap: "wrap" }}><button className="btn green sm grow" disabled={!f.auth || !f.coherent} onClick={() => decide("AUTHENTIQUE")}>Valider · indexer et notifier le propriétaire</button><button className="btn outline-r sm" disabled={!f.note} onClick={() => decide("SUSPECT")}>Signaler suspect</button></div></Modal>}
  </Page>;
}

/* aide à la décision : score calculé à partir des critères pondérés paramétrés (jamais automatique) */
const MATCH_C = { "CORRESPONDANCE FORTE": "green", "CORRESPONDANCE À VÉRIFIER": "orange", "INCOHÉRENCE": "red", "AUCUNE CORRESPONDANCE": "grey" };
export const MatchPill = ({ m }) => m && m.evaluated ? <P c={MATCH_C[m.level]}>{m.pct} % · {m.level.replace("CORRESPONDANCE ", "")}</P> : <P>Non évaluable</P>;
const fmtV = (k, v) => v == null || v === "" ? "—" : ["dob", "exp"].includes(k) ? fmtD(v) : String(v);
function Comparator({ m }) {
  const held = { type: m.cat, numero: m.numero, nom: m.held_nom, prenoms: m.held_nom, dob: m.held_dob, exp: m.held_exp };
  const dec = { type: m.declared.category_code, numero: m.declared.numero, nom: m.declared.nom, prenoms: m.declared.prenoms, dob: m.declared.dob, exp: m.declared.exp };
  return <div className="panel" style={{ boxShadow: "none", border: "1px solid var(--line)" }}>
    <div className="row" style={{ marginBottom: 8 }}><b className="grow">Comparateur document déclaré ↔ retrouvé</b><MatchPill m={m.match} /></div>
    <table className="tbl"><thead><tr><th>Critère</th><th>Déclaré / demandeur</th><th>Retrouvé (agence)</th><th style={{ textAlign: "center" }}>Résultat</th><th style={{ textAlign: "right" }}>Poids</th></tr></thead>
      <tbody>{m.match.criteria.map(c => <tr key={c.k}><td>{c.l}</td><td className={c.k === "numero" ? "mono" : ""}>{fmtV(c.k, dec[c.k])}</td><td className={c.k === "numero" ? "mono" : ""}>{fmtV(c.k, held[c.k])}</td>
        <td style={{ textAlign: "center" }}>{c.ok === null ? <span className="t-s">non comparé</span> : c.ok ? <span className="res ok">✓</span> : <span className="res ko">✕</span>}</td><td style={{ textAlign: "right" }} className="t-s">{c.w}</td></tr>)}</tbody></table>
    <div className="t-s" style={{ marginTop: 6 }}>Aide à la décision uniquement : un numéro identique ne vaut jamais autorisation de restitution (VC02).</div>
  </div>;
}

export function Verifications() {
  const [d, reload] = useData("/admin/verifications", [], 15000);
  const [m, setM] = useState(null), [motif, setMotif] = useState(""), [resolve, setResolve] = useState(false);
  const act = useAct(reload);
  const decide = async decision => { if (decision !== "CONFIRM" && !motif) return act(() => Promise.reject(new Error("Indiquez le motif communiqué au demandeur."))); if (await act(() => api.post(`/admin/verifications/${m.ref}/decision`, { decision, motif, resolveMultiple: resolve, matchPct: m.match.pct }), "Décision enregistrée.")) setM(null); };
  return <Page title="Vérification des propriétaires" sub="Toute correspondance passe par Vérification & Contrôle (R46). Aucune restitution sans contrôle.">
    <Panel><Table rows={d && d.items} empty="Aucun dossier à traiter." cols={[
      ["Dossier", r => <><span className="mono">{r.ref}</span><div className="t-s">{fmtDT(r.created_at)}</div></>], ["Document", r => <>{r.cat}<div className="t-s mono">{r.numero}</div></>],
      ["Demandeur", r => <>{r.prenom ? `${r.prenom} ${r.nom}` : "Sans compte"}<div className="t-s">{fmtTel(r.tel)}</div></>], ["Protégé", r => r.protected ? <P c="green">Oui</P> : <P>Non · frais</P>],
      ["Correspondance", r => <><MatchPill m={r.match} />{r.multiple && <div><P c="red">MULTIPLE</P></div>}</>],
      ["Statut", r => <P c={r.verif_status === "PROPRIÉTAIRE CONFIRMÉ" ? "green" : r.verif_status === "EN VÉRIFICATION" ? "orange" : r.verif_status ? "red" : "grey"}>{r.verif_status || "En attente du demandeur"}</P>],
      ["", r => <div className="acts"><button className="btn sm ghost" onClick={() => { setMotif(""); setResolve(false); setM(r); }}>Examiner</button></div>]]} /></Panel>
    {m && <Modal title={`Fiche de contrôle · ${m.ref}`} onClose={() => setM(null)}>
      <Comparator m={m} />
      {m.multiple && <div className="note n-red"><Icon n="alert" s={16} /><span><b>CORRESPONDANCES MULTIPLES</b> · {m.owners.length} titulaires enregistrés portent ce numéro ({m.owners.map(o => `${o.prenom} ${o.unom}`).join(", ")}). Aucun n’est choisi automatiquement : la restitution reste bloquée jusqu’à résolution motivée.</span></div>}
      {m.multiple && <label className="chk"><input type="checkbox" checked={resolve} onChange={e => setResolve(e.target.checked)} />Je résous la correspondance multiple en faveur de ce demandeur (motif obligatoire)</label>}
      <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>{m.selfie ? <a href={api.fileUrl(m.selfie)} target="_blank" rel="noreferrer"><img className="thumb" src={api.fileUrl(m.selfie)} alt="Selfie" /></a> : <div className="thumb" style={{ display: "grid", placeItems: "center" }}><Icon n="user" s={22} /></div>}
        <dl className="kv grow"><dt>Document détenu</dt><dd>{m.cat} · <span className="mono">{m.numero}</span></dd><dt>Titulaire (document)</dt><dd>{m.held_nom}</dd><dt>Réception</dt><dd className="mono">{m.reception_ref}</dd>
          <dt>Naissance déclarée</dt><dd>{fmtD(m.dob)}</dd><dt>Naissance enregistrée</dt><dd>{m.doc_dob ? <>{fmtD(m.doc_dob)} {m.doc_dob === m.dob ? <P c="green">Concorde</P> : <P c="red">Écart</P>}</> : "—"}</dd><dt>Lieu de naissance</dt><dd>{m.lieu_naissance || "—"}</dd><dt>Tentatives</dt><dd>{m.verif_tries}</dd>
          <dt>Justificatif</dt><dd>{m.justificatif ? <a href={api.fileUrl(m.justificatif)} target="_blank" rel="noreferrer">Ouvrir</a> : "—"}</dd></dl></div>
      <div className="field"><label>Motif / message au demandeur</label><textarea className="inp" value={motif} onChange={e => setMotif(e.target.value)} placeholder="Obligatoire pour un complément ou un rejet" /></div>
      <div className="note n-orange"><Icon n="userShield" s={16} /><span>Séparation des pouvoirs : l’agent qui confirme la propriété ne pourra pas effectuer la restitution.</span></div>
      <div className="row" style={{ flexWrap: "wrap" }}><button className="btn green sm grow" onClick={() => decide("CONFIRM")}>Confirmer le propriétaire</button><button className="btn ghost sm" onClick={() => decide("COMPLEMENT")}>Complément requis</button><button className="btn outline-r sm" onClick={() => decide("REJECT")}>Rejeter</button></div></Modal>}
  </Page>;
}

export function Officials() {
  const [d, reload] = useData("/admin/official", [], 15000);
  const [m, setM] = useState(null), [motif, setMotif] = useState("");
  const act = useAct(reload);
  const decide = async status => { if (await act(() => api.post(`/admin/official/${m.id}/decision`, { status, motif }), "Décision enregistrée.")) setM(null); };
  return <Page title="Déclarations officielles" sub="Contrôle des déclarations délivrées par l’administration (conditionne la publication VIP, R39)">
    <Panel><Table rows={d && d.items} cols={[["Perte", r => <span className="mono">{r.decl_ref}</span>], ["Déclarant", r => `${r.prenom} ${r.nom}`], ["Document", r => r.cat], ["Déclaration", r => <>{r.numero}<div className="t-s">{r.administration} · {r.lieu} · {fmtD(r.date_decl)}</div></>],
      ["Pièce", r => <a href={api.fileUrl(r.file_url)} target="_blank" rel="noreferrer">Ouvrir</a>], ["Statut", r => <P c={OFFI_ST[r.status]}>{r.status}</P>],
      ["", r => r.status === "EN VÉRIFICATION" ? <div className="acts"><button className="btn sm ghost" onClick={() => { setMotif(""); setM(r); }}>Contrôler</button></div> : null]]} /></Panel>
    {m && <Modal title={`Déclaration ${m.numero}`} onClose={() => setM(null)}>
      <a className="btn ghost sm" href={api.fileUrl(m.file_url)} target="_blank" rel="noreferrer"><Icon n="file" s={14} /> Ouvrir la pièce</a>
      <div className="field"><label>Motif (complément ou rejet)</label><textarea className="inp" value={motif} onChange={e => setMotif(e.target.value)} /></div>
      <div className="row" style={{ flexWrap: "wrap" }}><button className="btn green sm grow" onClick={() => decide("VALIDÉE")}>Valider</button><button className="btn ghost sm" disabled={!motif} onClick={() => decide("COMPLÉMENT REQUIS")}>Complément requis</button><button className="btn outline-r sm" disabled={!motif} onClick={() => decide("REJETÉE")}>Rejeter</button></div></Modal>}
  </Page>;
}

export function Publications() {
  const [d, reload] = useData("/admin/publications", [], 15000);
  const act = useAct(reload);
  const doAct = (r, action, ok) => act(() => api.post(`/admin/publications/${r.ref}/decision`, { action }), ok);
  return <Page title="Publications de perte VIP" sub="Validation agence, diffusion, signalements contrôlés et clôture (R40–R47)">
    <Panel><Table rows={d && d.items} cols={[["Publication", r => <><span className="mono">{r.ref}</span><div className="t-s">{fmtDT(r.created_at)}</div></>], ["Avis", r => <>{r.cat}<div className="t-s">{r.titulaire} · <span className="mono">{r.numero}</span> · {r.commune || "—"}</div></>],
      ["Statut", r => <P c={r.status === "ACTIVE" ? "green" : r.status === "EN VALIDATION" ? "orange" : "grey"}>{r.status}</P>], ["Vues · signalements", r => `${r.views} · ${r.reports}`],
      ["", r => <div className="acts">{r.status === "EN VALIDATION" && <><button className="btn sm green" onClick={() => doAct(r, "validate", "Publication diffusée.")}>Valider et diffuser</button><button className="btn sm ghost" onClick={() => doAct(r, "reject", "Publication refusée.")}>Refuser</button></>}
        {r.status === "ACTIVE" && <><button className="btn sm ghost" onClick={() => doAct(r, "report", "Signalement transmis au propriétaire.")}>Enregistrer un signalement</button><button className="btn sm ghost" onClick={() => doAct(r, "close", "Publication clôturée.")}>Clôturer</button></>}</div>]]} /></Panel>
  </Page>;
}

const Checklist = ({ list }) => <div className="col" style={{ gap: 4 }}>{list.map(x => <div key={x.l} className="row" style={{ gap: 8 }}><span className={`res ${x.ok ? "ok" : "ko"}`}>{x.ok ? "✓" : "✕"}</span><span className="t-s" style={{ color: "var(--ink)" }}>{x.l}{!x.ok && x.motif ? <b style={{ color: "var(--red)" }}> · {x.motif}</b> : null}</span></div>)}</div>;
const DLV_ST = { ATTENTE_PAIEMENT: ["Attente paiement", "grey"], A_PLANIFIER: ["À planifier", "orange"], PLANIFIEE: ["Planifiée · sortie agence", "blue"], EN_LIVRAISON: ["En livraison", "blue"], LIVREE: ["Livrée", "green"], REMISE_BLOQUEE: ["Remise bloquée · retour", "red"], ECHEC: ["Échec · retour attendu", "red"], RETOURNEE: ["Retournée en agence", "grey"], ANNULEE: ["Annulée", "grey"] };

export function Restitutions() {
  const [d, reload] = useData("/admin/restitutions", [], 15000);
  const [dl, reloadD] = useData("/admin/deliveries", [], 15000);
  const [m, setM] = useState(null), [code, setCode] = useState(""), [out, setOut] = useState(null), [courier, setCourier] = useState("");
  const [sig, setSig] = useState(null), [proof, setProof] = useState(null);
  const act = useAct(() => { reload(); reloadD(); });
  const showProof = ref => api.get(`/admin/restitutions/${ref}/proof`).then(x => setProof(x.proof)).catch(() => {});
  const sorties = dl && dl.items.filter(x => x.status === "PLANIFIEE"), retours = dl && dl.items.filter(x => ["ECHEC", "REMISE_BLOQUEE"].includes(x.status));
  return <Page title="Restitutions ⑤ ⑥" sub="La Réception ne décide pas seule : elle applique la décision du système (RESTITUTION AUTORISÉE / BLOQUÉE) et remet le document uniquement au propriétaire vérifié">
    {retours && retours.length > 0 && <Panel title="Retours attendus après livraison impossible" ic="alert"><Table rows={retours} cols={[["Livraison", x => <span className="mono">{x.ref}</span>], ["Motif", x => <span className="t-s">{x.fail_reason}</span>], ["Coursier", x => `${x.collecteur} · ${x.partner}`], ["Depuis", x => fmtDT(x.fail_at)],
      ["", x => <div className="acts"><button className="btn sm green" onClick={() => act(() => api.post(`/admin/deliveries/${x.ref}/return`, {}), "Retour confirmé · document réintégré au stock sécurisé.")}>Confirmer le retour</button></div>]]} /></Panel>}
    {sorties && sorties.length > 0 && <Panel title="Sorties pour livraison" ic="truck"><Table rows={sorties} cols={[["Livraison", x => <span className="mono">{x.ref}</span>], ["Document", x => <>{x.cat}<div className="t-s mono">{x.reception_ref} · {x.emplacement || "—"}</div></>], ["Partenaire", x => `${x.partner} · ${x.collecteur}`], ["Destination", x => `${x.commune}${x.slot ? " · " + x.slot : ""}`],
      ["", x => <div className="acts"><button className="btn sm green" onClick={() => { setCourier(""); setOut(x); }}>Remettre au coursier</button></div>]]} /></Panel>}
    <Panel title="Dossiers de restitution" ic="hand"><Table rows={d && d.items} cols={[["Dossier", r => <span className="mono">{r.ref}</span>], ["Document", r => <>{r.cat}<div className="t-s">{r.nom}</div></>], ["Propriétaire", r => r.prenom ? <>{r.prenom} {r.unom}<div className="t-s">{fmtTel(r.tel)}</div></> : "Sans compte"],
      ["Stock", r => <>{r.agence}<div className="t-s mono">{r.reception_ref} · {r.emplacement || "—"}</div></>],
      ["Décision système", r => r.done_at ? <P>Restitué le {fmtD(r.done_at)}</P> : r.livraison && !["RETOURNEE", "ANNULEE"].includes(r.livraison.st) ? <P c="blue">Livraison {r.livraison.ref}</P> : r.conditions.every(x => x.ok) ? <P c="green">RESTITUTION AUTORISÉE</P> : <P c="red">RESTITUTION BLOQUÉE</P>],
      ["", r => r.done_at ? <div className="acts"><button className="btn sm ghost" onClick={() => showProof(r.ref)}><Icon n="receipt" s={13} /> Preuve</button></div>
        : !(r.livraison && !["RETOURNEE", "ANNULEE"].includes(r.livraison.st)) ? <div className="acts"><button className="btn sm ghost" onClick={() => { setCode(""); setSig(null); setM(r); }}><Icon n="qr" s={13} /> Contrôle final</button></div> : null]]} /></Panel>
    {proof && <Modal title={`Preuve ${proof.reference}`} onClose={() => setProof(null)}><ProofView p={proof} api={api} /></Modal>}
    {m && <Modal title={`Contrôle final · ${m.ref}`} onClose={() => setM(null)}>
      <Checklist list={m.conditions} />
      {m.conditions.every(x => x.ok) ? <><div className="t-s">Document : {m.cat} · {m.reception_ref} · emplacement {m.emplacement || "—"}. Scannez le QR de récupération présenté par le propriétaire ou saisissez son code de retrait.</div>
        <input className="inp mono" maxLength={60} placeholder="Code de retrait / QR" value={code} onChange={e => setCode(e.target.value)} autoFocus />
        <SignaturePad onChange={setSig} />
        <button className="btn green" disabled={code.trim().length < 6 || !sig} onClick={async () => { const ref = m.ref; if (await act(() => api.post(`/admin/restitutions/${ref}/complete`, form({ code, signature: sig })), "Document restitué · emplacement libéré · preuve générée.")) { setM(null); showProof(ref); } }}>Confirmer la remise</button></>
        : <div className="note n-red"><Icon n="lock" s={16} /><span><b>RESTITUTION IMPOSSIBLE.</b> Le blocage ne peut pas être contourné par l’agent.</span></div>}</Modal>}
    {out && <Modal title={`Sortie de l’agence · ${out.ref}`} onClose={() => setOut(null)}>
      <div className="t-s">Récupérez l’enveloppe {out.reception_ref} (emplacement {out.emplacement || "—"}) puis identifiez le coursier de {out.partner} avant de lui confier le document. La sortie est enregistrée (partenaire, mission, agent, date, heure).</div>
      <input className="inp mono" placeholder="Code du coursier (ex. COL-2231)" value={courier} onChange={e => setCourier(e.target.value)} autoFocus />
      <button className="btn green" disabled={!courier.trim()} onClick={async () => { if (await act(() => api.post(`/admin/deliveries/${out.ref}/out`, { courier }), "Document confié au partenaire · propriétaire notifié.")) setOut(null); }}>Confirmer la remise au coursier</button></Modal>}
  </Page>;
}

/* livraisons au propriétaire : le service Collecte planifie à partir de l'autorisation système (§32–§36) */
export function Deliveries() {
  const [d, reload] = useData("/admin/deliveries", [], 15000);
  const [parts] = useData("/admin/partners");
  const [m, setM] = useState(null), [f, setF] = useState({});
  const act = useAct(reload);
  return <Page title="Livraisons au propriétaire" sub="Livraison possible uniquement si le système l’autorise : document contrôlé, propriétaire vérifié, paiement confirmé, aucun blocage">
    <Panel><Table rows={d && d.items} empty="Aucune livraison demandée." cols={[
      ["Mission", x => <><span className="mono">{x.ref}</span><div className="t-s">{fmtDT(x.created_at)}</div></>], ["Dossier", x => <>{x.cat}<div className="t-s mono">{x.rec_ref}</div></>],
      ["Destination", x => <>{x.commune}<div className="t-s">{x.repere || ""}{x.slot ? " · " + x.slot : ""}</div></>], ["Partenaire", x => x.partner ? `${x.partner} · ${x.collecteur}` : "—"],
      ["Statut", x => <><P c={DLV_ST[x.status][1]}>{DLV_ST[x.status][0]}</P>{x.included ? <div className="t-s">incluse dans la formule</div> : null}{x.fail_reason ? <div className="t-s" style={{ color: "var(--red)" }}>{x.fail_reason}</div> : null}</>],
      ["", x => <div className="acts">{["A_PLANIFIER", "PLANIFIEE"].includes(x.status) && <button className="btn sm ghost" onClick={() => { setF({ partner: x.partner_id || "", slot: x.slot || "", externalRef: x.external_ref || "", motif: "" }); setM(x); }}>{x.status === "A_PLANIFIER" ? "Planifier" : "Modifier"}</button>}</div>]]} /></Panel>
    {m && <Modal title={`Mission ${m.ref}`} onClose={() => setM(null)}>
      <div className="panel" style={{ boxShadow: "none", border: "1px solid var(--line)" }}><b>Contrôles avant livraison</b><div style={{ marginTop: 8 }}><Checklist list={m.conditions || []} /></div></div>
      {m.conditions && m.conditions.every(x => x.ok) ? <>
        <div className="field"><label>Partenaire</label><select className="inp" value={f.partner} onChange={e => setF({ ...f, partner: e.target.value })}><option value="">Choisir…</option>{parts && parts.items.filter(p => p.status === "ACTIF").map(p => <option key={p.id} value={p.id}>{p.nom} · {p.collecteur} ({p.zones})</option>)}</select></div>
        <div className="grid2"><div className="field"><label>Créneau</label><input className="inp" value={f.slot} onChange={e => setF({ ...f, slot: e.target.value })} /></div><div className="field"><label>Référence externe partenaire</label><input className="inp mono" value={f.externalRef} onChange={e => setF({ ...f, externalRef: e.target.value })} /></div></div>
        <button className="btn red" disabled={!f.partner} onClick={async () => { if (await act(() => api.post(`/admin/deliveries/${m.ref}/plan`, f), "Livraison planifiée · la Réception remettra le document au coursier.")) setM(null); }}>Planifier la livraison</button></>
        : <div className="note n-red"><Icon n="lock" s={16} /><span><b>LIVRAISON BLOQUÉE</b> tant que toutes les conditions ne sont pas satisfaites.</span></div>}
      <div className="row"><input className="inp grow" placeholder="Motif d’annulation" value={f.motif} onChange={e => setF({ ...f, motif: e.target.value })} /><button className="btn sm outline-r" disabled={!f.motif} onClick={async () => { if (await act(() => api.post(`/admin/deliveries/${m.ref}/cancel`, { motif: f.motif }), "Livraison annulée.")) setM(null); }}>Annuler</button></div></Modal>}
  </Page>;
}
