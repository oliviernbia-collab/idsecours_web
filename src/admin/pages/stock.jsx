/* Réception & Restitution : emplacements de stockage, transferts entre agences, inventaire physique, documents non réclamés */
import { useState } from "react";
import { adminApi as api } from "../../lib/api.js";
import Icon from "../../ui/Icon.jsx";
import { Page, Panel, Table, Modal, Kpi, P, useData, useAct, useAdm, Loading } from "../kit.jsx";
import { fmtDT, fmtD } from "@shared/format.js";

const TRF = { DEMANDE: ["Demande", "orange"], AUTORISE: ["Autorisé", "blue"], EN_TRANSIT: ["En transit", "blue"], RECU: ["Réceptionné", "green"], ANNULE: ["Annulé", "grey"] };
const RES = { CONFORME: "green", MANQUANT: "red", INATTENDU: "orange" };
const LST = { DISPONIBLE: "green", PARTIEL: "blue", COMPLET: "red", RESERVE: "orange", BLOQUE: "red", MAINTENANCE: "grey" };

/* choix d'un emplacement (§29) : seuls les emplacements actifs, disponibles et non complets sont proposés.
   Valeur : { location_id } ou { emplacement } (saisie libre si l'agence n'a pas encore de plan de stockage) */
export function LocSelect({ agency, value, onChange, exclude }) {
  const [d] = useData(`/admin/locations${agency ? "?agency=" + agency : ""}`, [agency]);
  if (!d) return <div className="t-s">Chargement des emplacements…</div>;
  if (!d.items.length) return <input className="inp mono" placeholder="Emplacement (ex. A-12-03)" value={(value && value.emplacement) || ""} onChange={e => onChange({ emplacement: e.target.value })} />;
  const free = d.items.filter(l => ["DISPONIBLE", "PARTIEL"].includes(l.etat) && l.id !== exclude);
  return <><select className="inp mono" value={(value && value.location_id) || ""} onChange={e => onChange(e.target.value ? { location_id: +e.target.value } : null)}>
    <option value="">Choisir un emplacement libre…</option>
    {[...new Set(free.map(l => l.salle))].map(sl => <optgroup key={sl} label={`Salle ${sl}`}>{free.filter(l => l.salle === sl).map(l => <option key={l.id} value={l.id}>{l.code} · {l.kind === "COFFRE" ? "coffre" : "armoire"} {l.armoire}, compartiment {l.compartiment} · {l.occ}/{l.capacite}</option>)}</optgroup>)}
  </select>{!free.length && <div className="t-s" style={{ color: "var(--red)" }}>Aucun emplacement libre dans cette agence : ajoutez des compartiments (Stock › Emplacements).</div>}</>;
}

/* confirmation du stockage (§33) : QR du document puis QR de l'emplacement */
export function StoreModal({ doc, onClose, onDone }) {
  const [f, setF] = useState({ doc: "", loc: "" });
  const act = useAct(onDone);
  return <Modal title={`Confirmer le stockage · ${doc.reception_ref}`} onClose={onClose}>
    <div className="note n-blue"><Icon n="qr" s={16} /><span>Rangez l’enveloppe en <b className="mono">{doc.emplacement}</b>, puis scannez <b>1.</b> le QR du document et <b>2.</b> le QR de l’emplacement. Le système vérifie la correspondance.</span></div>
    <div className="field"><label>1. QR du document</label><input className="inp mono" autoFocus placeholder="IDSECOURS:INT:IDS-RCP-…" value={f.doc} onChange={e => setF({ ...f, doc: e.target.value })} /></div>
    <div className="field"><label>2. QR de l’emplacement</label><input className="inp mono" placeholder="IDSECOURS:EMP:… ou code (ex. A-12-03)" value={f.loc} onChange={e => setF({ ...f, loc: e.target.value })} /></div>
    <button className="btn red" disabled={!f.doc || !f.loc} onClick={async () => { if (await act(() => api.post(`/admin/stock/${doc.id}/store`, f), "Stockage confirmé · EN STOCK SÉCURISÉ.")) onClose(); }}>Confirmer le stockage</button>
  </Modal>;
}

/* plan de stockage (§30) : occupation par salle */
export function StoragePlan({ plan, compact }) {
  return <div className="kpis">{plan.map(s => <div key={s.salle} className="kpi" style={{ display: "block" }}>
    <div className="row" style={{ justifyContent: "space-between" }}><b style={{ font: "800 16px var(--f-display)" }}>SALLE {s.salle}</b><b style={{ color: s.pct >= 90 ? "var(--red)" : s.pct >= 70 ? "var(--orange)" : "var(--green-d)" }}>{s.pct} %</b></div>
    <div style={{ height: 8, borderRadius: 4, background: "var(--soft)", margin: "8px 0 6px", overflow: "hidden" }}><div style={{ width: `${Math.min(100, s.pct)}%`, height: "100%", background: s.pct >= 90 ? "var(--red)" : s.pct >= 70 ? "var(--orange)" : "var(--green)" }} /></div>
    {!compact && <span className="t-s">{s.occ} / {s.cap} documents · {s.n} compartiment(s){s.indispo ? ` · ${s.indispo} indisponible(s)` : ""}</span>}
  </div>)}</div>;
}

function Locations({ can }) {
  const { staff } = useAdm();
  const [agency, setAgency] = useState("");
  const [d, reload] = useData(`/admin/locations${agency ? "?agency=" + agency : ""}`, [agency]);
  const [m, setM] = useState(null), [qr, setQr] = useState(null), [salle, setSalle] = useState("");
  const act = useAct(reload);
  const manage = can("agencies.manage") || can("reception.manage");
  if (!d) return <Loading />;
  const rows = d.items.filter(l => !salle || l.salle === salle);
  const showQr = async l => setQr(await api.get(`/admin/locations/${l.id}/qr`));
  return <>
    <div className="filters">{!staff.agency && <select className="inp" value={agency || d.agency || ""} onChange={e => setAgency(e.target.value)} aria-label="Agence">{d.agencies.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}</select>}
      <select className="inp" value={salle} onChange={e => setSalle(e.target.value)} aria-label="Salle"><option value="">Toutes les salles</option>{d.plan.map(s => <option key={s.salle} value={s.salle}>Salle {s.salle}</option>)}</select>
      {manage && <button className="btn sm red" onClick={() => setM({ salle: "A", armoire: "", kind: "ARMOIRE", compartiments: 4, capacite: 5 })}><Icon n="plus" s={14} /> Ajouter une armoire / un coffre</button>}</div>
    <Panel title="Plan de stockage" ic="warehouse">{d.plan.length ? <StoragePlan plan={d.plan} /> : <div className="t-s">Aucun emplacement configuré pour cette agence.</div>}</Panel>
    <Panel title={`Emplacements · ${rows.length}`} ic="list"><Table rows={rows} empty="Aucun emplacement." cols={[
      ["Code", r => <b className="mono">{r.code}</b>], ["Hiérarchie", r => <span className="t-s">Salle {r.salle} › {r.kind === "COFFRE" ? "Coffre" : "Armoire"} {r.armoire} › Compartiment {r.compartiment}</span>],
      ["Occupation", r => <><b>{r.occ}</b> / {r.capacite}</>], ["Statut", r => <><P c={LST[r.etat]}>{r.etatLabel}</P>{r.status_motif && <div className="t-s">{r.status_motif}</div>}</>],
      ["", r => <div className="acts"><button className="btn sm ghost" onClick={() => showQr(r)}><Icon n="qr" s={13} /> QR</button>{manage && <button className="btn sm ghost" onClick={() => setM({ edit: r, status: r.status, motif: r.status_motif || "", capacite: r.capacite })}>Modifier</button>}</div>]]} /></Panel>
    <div className="note n-blue"><Icon n="info" s={16} /><span>Un emplacement complet, réservé, bloqué ou en maintenance n’est plus proposé à la réception. Chaque compartiment porte un QR à coller : il sert à confirmer le stockage (QR du document + QR de l’emplacement) et à l’inventaire.</span></div>
    {m && !m.edit && <Modal title="Ajouter une armoire / un coffre" onClose={() => setM(null)}>
      <div className="grid-2"><div className="field"><label>Salle / zone</label><input className="inp mono" value={m.salle} onChange={e => setM({ ...m, salle: e.target.value })} placeholder="A" /></div>
        <div className="field"><label>Type</label><select className="inp" value={m.kind} onChange={e => setM({ ...m, kind: e.target.value })}><option value="ARMOIRE">Armoire</option><option value="COFFRE">Coffre</option></select></div>
        <div className="field"><label>Numéro d’armoire / de coffre</label><input className="inp mono" value={m.armoire} onChange={e => setM({ ...m, armoire: e.target.value })} placeholder="12" /></div>
        <div className="field"><label>Nombre de compartiments</label><input className="inp" type="number" min="1" max="50" value={m.compartiments} onChange={e => setM({ ...m, compartiments: e.target.value })} /></div>
        <div className="field"><label>Capacité par compartiment (documents)</label><input className="inp" type="number" min="1" value={m.capacite} onChange={e => setM({ ...m, capacite: e.target.value })} /></div></div>
      <div className="t-s">Codes générés : {m.salle && m.armoire ? `${m.salle.toUpperCase()}-${String(m.armoire).padStart(2, "0")}-01 … -${String(m.compartiments || 1).padStart(2, "0")}` : "—"}</div>
      <button className="btn red" disabled={!m.salle || !m.armoire} onClick={async () => { if (await act(() => api.post("/admin/locations", { ...m, agency: agency || d.agency }), "Emplacements créés · journalisé.")) setM(null); }}>Créer</button></Modal>}
    {m && m.edit && <Modal title={`Emplacement ${m.edit.code}`} onClose={() => setM(null)}>
      <div className="field"><label>Statut</label><select className="inp" value={m.status} onChange={e => setM({ ...m, status: e.target.value })}>{[["ACTIF", "Actif (disponible selon l’occupation)"], ["RESERVE", "Réservé"], ["BLOQUE", "Bloqué"], ["MAINTENANCE", "Maintenance"]].map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
      {m.status !== "ACTIF" && <div className="field"><label>Motif (obligatoire)</label><input className="inp" value={m.motif} onChange={e => setM({ ...m, motif: e.target.value })} /></div>}
      <div className="field"><label>Capacité (documents) · occupation actuelle {m.edit.occ}</label><input className="inp" type="number" min={Math.max(1, m.edit.occ)} value={m.capacite} onChange={e => setM({ ...m, capacite: e.target.value })} /></div>
      <button className="btn red" onClick={async () => { if (await act(() => api.patch(`/admin/locations/${m.edit.id}`, { status: m.status, motif: m.motif, capacite: m.capacite }), "Emplacement mis à jour · journalisé.")) setM(null); }}>Enregistrer</button></Modal>}
    {qr && <Modal title={`QR de l’emplacement ${qr.code}`} onClose={() => setQr(null)}>
      <img src={qr.qr} alt={`QR ${qr.code}`} style={{ width: 220, alignSelf: "center", imageRendering: "pixelated" }} />
      <div style={{ textAlign: "center" }}><b className="mono" style={{ fontSize: 22 }}>{qr.code}</b><div className="t-s">{qr.agence}</div></div>
      <button className="btn ghost" onClick={() => window.print()}><Icon n="download" s={14} /> Imprimer l’étiquette</button></Modal>}
  </>;
}

export function StockOps() {
  const { can } = useAdm();
  const tabs = [["locations", "Emplacements & plan de stockage"], ["transfers", "Transferts entre agences"], ["inventory", "Inventaire physique"], ["unclaimed", "Documents non réclamés"]];
  const [tab, setTab] = useState("locations");
  return <Page title="Stock : emplacements, transferts & inventaire" sub="Le document ne disparaît jamais du suivi : chaque entrée, rangement, sortie et transport est tracé.">
    <div className="chips">{tabs.map(([k, l]) => <button key={k} className={`chip ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{l}</button>)}</div>
    {tab === "locations" && <Locations can={can} />}
    {tab === "transfers" && <Transfers can={can} />}
    {tab === "inventory" && <Inventory can={can} />}
    {tab === "unclaimed" && <Unclaimed />}
  </Page>;
}

/* demande → autorisation (autre agent) → sortie scannée → réception scannée par un autre agent → nouvel emplacement */
function Transfers({ can }) {
  const [d, reload] = useData("/admin/transfers", [], 20000);
  const [m, setM] = useState(null);
  const act = useAct(reload);
  const run = async (path, body, ok) => { if (await act(() => api.post(`/admin/transfers/${m.t.ref}/${path}`, body), ok)) setM(null); };
  return <>
    <Panel><Table rows={d && d.items} empty="Aucun transfert. Lancez une demande depuis « Réception & stock » (bouton Transférer)." cols={[
      ["Transfert", r => <><span className="mono">{r.ref}</span><div className="t-s">{fmtDT(r.created_at)}</div></>], ["Document", r => <>{r.cat}<div className="t-s mono">{r.reception_ref}</div></>],
      ["Trajet", r => <>{r.from_nom} → <b>{r.to_nom}</b><div className="t-s">{r.motif}</div></>],
      ["Chaîne", r => <div className="t-s">Demandé : {r.requested}{r.authorized && <><br />Autorisé : {r.authorized}</>}{r.sent && <><br />Sorti : {r.sent}</>}{r.received && <><br />Reçu : {r.received}</>}{r.cancel_reason && <><br />Annulé : {r.cancel_reason}</>}</div>],
      ["Statut", r => <P c={TRF[r.status][1]}>{TRF[r.status][0]}</P>],
      ["", r => <div className="acts">
        {r.status === "DEMANDE" && can("stock.transfer.authorize") && <button className="btn sm green" onClick={() => act(() => api.post(`/admin/transfers/${r.ref}/authorize`), "Transfert autorisé.")}>Autoriser</button>}
        {r.status === "AUTORISE" && can("reception.manage") && <button className="btn sm red" onClick={() => setM({ t: r, step: "send", code: "" })}>Sortie du stock</button>}
        {r.status === "EN_TRANSIT" && can("reception.manage") && <button className="btn sm green" onClick={() => setM({ t: r, step: "receive", code: "", emplacement: "" })}>Réceptionner</button>}
        {["DEMANDE", "AUTORISE"].includes(r.status) && <button className="btn sm ghost" onClick={() => setM({ t: r, step: "cancel", motif: "" })}>Annuler</button>}</div>]]} /></Panel>
    {m && <Modal title={`${{ send: "Sortie du stock", receive: "Réception à l’agence de destination", cancel: "Annuler le transfert" }[m.step]} · ${m.t.ref}`} onClose={() => setM(null)}>
      {m.step !== "cancel" && <><div className="note n-blue"><Icon n="qr" s={16} /><span>Scannez (ou saisissez) le QR interne de l’enveloppe {m.t.reception_ref}. {m.step === "receive" ? "La réception doit être confirmée par un autre agent que celui qui a fait la sortie." : "Le document passera « En transit » : ni recherchable ni restituable jusqu’à sa réception."}</span></div>
        <div className="field"><label>Code QR interne</label><input className="inp mono" autoFocus value={m.code} onChange={e => setM({ ...m, code: e.target.value })} /></div></>}
      {m.step === "receive" && <div className="field"><label>Nouvel emplacement</label><LocSelect agency={m.t.to_agency} value={m.loc} onChange={loc => setM({ ...m, loc })} /></div>}
      {m.step === "cancel" && <div className="field"><label>Motif (obligatoire)</label><input className="inp" value={m.motif} onChange={e => setM({ ...m, motif: e.target.value })} /></div>}
      <button className="btn red" onClick={() => m.step === "send" ? run("send", { code: m.code }, "Sortie tracée · document en transit.") : m.step === "receive" ? run("receive", { code: m.code, ...(m.loc || {}) }, "Transfert réceptionné.") : run("cancel", { motif: m.motif }, "Transfert annulé.")}>Confirmer</button>
    </Modal>}
  </>;
}

function Inventory({ can }) {
  const { staff } = useAdm();
  const [d, reload] = useData("/admin/inventories");
  const [ag] = useData(staff.agency ? null : "/admin/agencies");
  const [open, setOpen] = useState(null), [zone, setZone] = useState(""), [agency, setAgency] = useState("");
  const act = useAct(reload);
  const cur = d && d.items.find(i => i.status === "OUVERT");
  return <>
    {can("reception.manage") && !cur && <Panel title="Nouvel inventaire" ic="list">
      <div className="t-s" style={{ marginBottom: 8 }}>Le stock théorique est figé à l’ouverture. Scannez ensuite physiquement chaque enveloppe de la zone ; à la clôture, tout document attendu non scanné devient <b>MANQUANT</b> (incident critique, restitution bloquée).</div>
      <div className="row">{!staff.agency && <select className="inp" style={{ maxWidth: 240 }} value={agency} onChange={e => setAgency(e.target.value)} aria-label="Agence">
          <option value="">Choisir l’agence…</option>{((ag && ag.items) || []).filter(a => a.status !== "SUSPENDUE").map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}</select>}
        <input className="inp mono" style={{ maxWidth: 220 }} placeholder="Zone (ex. A ou A-12) — vide = toute l’agence" value={zone} onChange={e => setZone(e.target.value)} />
        <button className="btn sm red" onClick={() => act(() => api.post("/admin/inventories", { zone, agency: agency || undefined }), "Inventaire ouvert.")}><Icon n="plus" s={14} /> Ouvrir l’inventaire</button></div></Panel>}
    {cur && <InventoryRun inv={cur} reload={reload} />}
    <Panel title="Historique des inventaires" ic="clock"><Table rows={d && d.items} empty="Aucun inventaire réalisé." cols={[
      ["Inventaire", r => <><span className="mono">{r.ref}</span><div className="t-s">{fmtDT(r.created_at)} · {r.agent}</div></>], ["Agence / zone", r => <>{r.agence}<div className="t-s">{r.zone || "Toute l’agence"}</div></>],
      ["Attendus", r => r.attendus], ["Conformes", r => <P c="green">{r.conformes}</P>], ["Manquants", r => <P c={r.manquants ? "red" : "grey"}>{r.manquants}</P>], ["Inattendus", r => <P c={r.inattendus ? "orange" : "grey"}>{r.inattendus}</P>],
      ["Statut", r => <P c={r.status === "OUVERT" ? "orange" : "grey"}>{r.status}</P>], ["", r => <button className="btn sm ghost" onClick={() => setOpen(r.ref)}>Rapport</button>]]} /></Panel>
    {open && <InventoryReport refId={open} onClose={() => setOpen(null)} />}
  </>;
}
function InventoryRun({ inv, reload }) {
  const [code, setCode] = useState(""), [last, setLast] = useState([]);
  const act = useAct(reload);
  const scan = async e => {
    e.preventDefault(); if (!code.trim()) return;
    try { const r = await api.post(`/admin/inventories/${inv.ref}/scan`, { code }); setLast(l => [{ code, ...r }, ...l].slice(0, 12)); setCode(""); reload(); }
    catch (x) { act(() => Promise.reject(x)); }
  };
  return <Panel title={`Inventaire en cours · ${inv.ref} · ${inv.agence}${inv.zone ? " · zone " + inv.zone : ""}`} ic="qr">
    <div className="kpis"><Kpi ic="list" label="Attendus (stock théorique)" value={inv.attendus} /><Kpi ic="check" label="Conformes" value={inv.conformes} color="var(--green-d)" bg="var(--green-s)" /><Kpi ic="alert" label="Inattendus" value={inv.inattendus} color="var(--orange)" bg="var(--orange-s)" /></div>
    <form className="row" onSubmit={scan}><input className="inp mono grow" autoFocus placeholder="Scanner le QR interne ou saisir la référence IDS-RCP-…" value={code} onChange={e => setCode(e.target.value)} /><button className="btn sm red">Valider</button></form>
    {last.length > 0 && <div className="log" style={{ marginTop: 10 }}>{last.map((l, i) => <div key={i}><span><P c={RES[l.result]}>{l.result}</P></span>{l.ref || l.code}{l.already ? " (déjà scanné)" : ""}</div>)}</div>}
    <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => window.confirm(`Clôturer ${inv.ref} ? Les ${inv.attendus - inv.conformes} document(s) non scanné(s) seront déclarés MANQUANTS.`) && act(() => api.post(`/admin/inventories/${inv.ref}/close`), "Inventaire clôturé · rapport disponible.")}>Clôturer l’inventaire</button>
  </Panel>;
}
function InventoryReport({ refId, onClose }) {
  const [d] = useData(`/admin/inventories/${refId}`);
  return <Modal title={`Rapport d’inventaire · ${refId}`} onClose={onClose}>
    {!d ? <Loading /> : <><div className="t-s">{d.inventory.agence} · {d.inventory.zone || "toute l’agence"} · ouvert le {fmtDT(d.inventory.created_at)}{d.inventory.closed_at ? " · clos le " + fmtDT(d.inventory.closed_at) : ""}</div>
      <Table rows={d.lines} cols={[["Document", r => <span className="mono">{r.reception_ref || r.code}</span>], ["Type", r => r.cat || "—"], ["Emplacement", r => r.emplacement || "—"], ["Résultat", r => r.result ? <P c={RES[r.result]}>{r.result}</P> : <P>Non scanné</P>]]} />
      <button className="btn ghost" onClick={() => window.print()}><Icon n="download" s={14} /> Imprimer le rapport</button></>}
  </Modal>;
}

function Unclaimed() {
  const [d] = useData("/admin/stock/unclaimed");
  const [b, setB] = useState(null);
  if (!d) return <Loading />;
  const rows = b == null ? d.items : d.items.filter(r => r.jours >= d.buckets[b].a && r.jours <= d.buckets[b].b);
  return <>
    <div className="kpis">{d.buckets.map((x, i) => <button key={x.l} className="kpi" style={{ textAlign: "left", outline: b === i ? "2px solid var(--red)" : "none" }} onClick={() => setB(b === i ? null : i)}>
      <span className="ic" style={{ background: i === 3 ? "var(--red-s)" : "var(--orange-s)", color: i === 3 ? "var(--red)" : "var(--orange)" }}><Icon n="clock" s={18} /></span><div><b>{x.n}</b><span>{x.l}</span></div></button>)}</div>
    <div className="note n-orange"><Icon n="info" s={16} /><span>Documents conservés sans aucune demande de récupération. Durée de conservation paramétrée : {d.conservation} jours (Paramètres › conservation_jours) — la destination finale reste soumise aux règles juridiques et administratives applicables.</span></div>
    <Panel><Table rows={rows} empty="Aucun document non réclamé." cols={[["Réception", r => <span className="mono">{r.reception_ref}</span>], ["Document", r => <>{r.cat}<div className="t-s mono">{r.numero || "—"}</div></>], ["Agence", r => r.agence], ["Emplacement", r => r.emplacement || "—"],
      ["Reçu le", r => fmtD(r.received_at)], ["Ancienneté", r => <P c={r.jours > 90 ? "red" : r.jours > 30 ? "orange" : "grey"}>{r.jours} j</P>]]} /></Panel>
  </>;
}
