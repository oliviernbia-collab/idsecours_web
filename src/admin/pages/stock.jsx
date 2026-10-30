/* Réception & Restitution : transferts entre agences, inventaire physique, documents non réclamés */
import { useState } from "react";
import { adminApi as api } from "../../lib/api.js";
import Icon from "../../ui/Icon.jsx";
import { Page, Panel, Table, Modal, Kpi, P, useData, useAct, useAdm, Loading } from "../kit.jsx";
import { fmtDT, fmtD } from "@shared/format.js";

const TRF = { DEMANDE: ["Demande", "orange"], AUTORISE: ["Autorisé", "blue"], EN_TRANSIT: ["En transit", "blue"], RECU: ["Réceptionné", "green"], ANNULE: ["Annulé", "grey"] };
const RES = { CONFORME: "green", MANQUANT: "red", INATTENDU: "orange" };

export function StockOps() {
  const { can } = useAdm();
  const tabs = [["transfers", "Transferts entre agences"], ["inventory", "Inventaire physique"], ["unclaimed", "Documents non réclamés"]];
  const [tab, setTab] = useState("transfers");
  return <Page title="Transferts, inventaire & non réclamés" sub="Le document ne disparaît jamais du suivi : chaque sortie, transport et entrée est tracée.">
    <div className="chips">{tabs.map(([k, l]) => <button key={k} className={`chip ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{l}</button>)}</div>
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
      {m.step === "receive" && <div className="field"><label>Nouvel emplacement (ex. B-04-01)</label><input className="inp mono" value={m.emplacement} onChange={e => setM({ ...m, emplacement: e.target.value })} /></div>}
      {m.step === "cancel" && <div className="field"><label>Motif (obligatoire)</label><input className="inp" value={m.motif} onChange={e => setM({ ...m, motif: e.target.value })} /></div>}
      <button className="btn red" onClick={() => m.step === "send" ? run("send", { code: m.code }, "Sortie tracée · document en transit.") : m.step === "receive" ? run("receive", { code: m.code, emplacement: m.emplacement }, "Transfert réceptionné.") : run("cancel", { motif: m.motif }, "Transfert annulé.")}>Confirmer</button>
    </Modal>}
  </>;
}

function Inventory({ can }) {
  const [d, reload] = useData("/admin/inventories");
  const [open, setOpen] = useState(null), [zone, setZone] = useState("");
  const act = useAct(reload);
  const cur = d && d.items.find(i => i.status === "OUVERT");
  return <>
    {can("reception.manage") && !cur && <Panel title="Nouvel inventaire" ic="list">
      <div className="t-s" style={{ marginBottom: 8 }}>Le stock théorique est figé à l’ouverture. Scannez ensuite physiquement chaque enveloppe de la zone ; à la clôture, tout document attendu non scanné devient <b>MANQUANT</b> (incident critique, restitution bloquée).</div>
      <div className="row"><input className="inp mono" style={{ maxWidth: 220 }} placeholder="Zone (ex. A ou A-12) — vide = toute l’agence" value={zone} onChange={e => setZone(e.target.value)} />
        <button className="btn sm red" onClick={() => act(() => api.post("/admin/inventories", { zone }), "Inventaire ouvert.")}><Icon n="plus" s={14} /> Ouvrir l’inventaire</button></div></Panel>}
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
