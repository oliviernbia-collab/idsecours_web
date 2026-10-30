/* Espèces en agence (Finance §42–§43) et clôture financière journalière (§69) */
import { useState } from "react";
import { adminApi as api } from "../../lib/api.js";
import Icon from "../../ui/Icon.jsx";
import { Page, Panel, Table, Modal, Kpi, P, useData, useAct, useAdm, Loading } from "../kit.jsx";
import { fmtDT, fcfa } from "@shared/format.js";

const CST = { OUVERTE: ["Ouverte", "blue"], A_CONTROLER: ["À contrôler", "orange"], VALIDEE: ["Validée", "green"], ECART_A_JUSTIFIER: ["Écart à justifier", "red"] };

export function Cash() {
  const { can, staff } = useAdm();
  const [d, reload] = useData("/admin/cash", [], 20000);
  const [m, setM] = useState(null), [rec, setRec] = useState(null);
  const act = useAct(reload);
  if (!d) return <Loading />;
  const c = d.current;
  const collect = async () => {
    try { const r = await api.post("/admin/cash/collect", { [m.mode]: m.ref.trim(), recu: +m.recu }); setRec(r); setM(null); reload(); }
    catch (e) { act(() => Promise.reject(e)); }
  };
  return <Page title="Caisse · paiements en espèces" sub="Aucune recette espèces sans référence : chaque encaissement produit un reçu numéroté, rattaché à la caisse et à l’agent.">
    {!d.enabled && <div className="note n-orange"><Icon n="info" s={16} /><span>Les paiements en espèces sont désactivés (Paramètres › Moyens de paiement › Espèces).</span></div>}
    {can("cash.collect") && (d.agency ? <Panel title={`Caisse de ${d.agency.nom}`} ic="money">
      {!c ? <div className="row"><span className="t-s grow">Caisse fermée. Saisissez le solde d’ouverture (fonds de caisse) pour commencer.</span>
        <button className="btn sm red" onClick={() => setM({ open: true, opening: 0 })}>Ouvrir la caisse</button></div>
        : <>
          <div className="kpis"><Kpi ic="money" label={`Solde d’ouverture · ${c.ref}`} value={fcfa(c.opening_balance)} /><Kpi ic="receipt" label={`${c.n} encaissement(s)`} value={fcfa(c.encaissements)} color="var(--green-d)" bg="var(--green-s)" /><Kpi ic="gauge" label="Solde théorique" value={fcfa(c.theorique)} color="var(--ink)" bg="var(--soft)" /></div>
          <div className="row"><button className="btn sm red" disabled={!d.enabled} onClick={() => setM({ mode: "recovery", ref: "", recu: "" })}><Icon n="plus" s={14} /> Encaisser</button><span className="grow" />
            <button className="btn sm ghost" onClick={() => setM({ close: true, declared: "", justificatif: "" })}>Clôturer la caisse</button></div>
          <Table rows={c.lines} empty="Aucun encaissement." cols={[["Reçu", r => <span className="mono">{r.ref}</span>], ["Motif", r => r.label], ["Montant", r => <b>{fcfa(r.amount)}</b>], ["Heure", r => fmtDT(r.created_at)]]} /></>}
    </Panel> : <div className="note n-blue"><Icon n="info" s={16} /><span>Votre compte n’est rattaché à aucune agence : l’encaissement se fait par un agent de l’agence.</span></div>)}
    <Panel title="Clôtures de caisse" ic="clock"><Table rows={d.sessions} empty="Aucune caisse." cols={[
      ["Caisse", r => <><span className="mono">{r.ref}</span><div className="t-s">{r.agence}</div></>], ["Caissier", r => <>{r.caissier}<div className="t-s">{fmtDT(r.opened_at)}{r.closed_at ? " → " + fmtDT(r.closed_at) : ""}</div></>],
      ["Ouverture", r => fcfa(r.opening_balance)], ["Encaissements", r => r.encaissements == null ? `${r.n} en cours` : fcfa(r.encaissements)], ["Théorique / déclaré", r => r.theoretical_balance == null ? "—" : <>{fcfa(r.theoretical_balance)} / {fcfa(r.declared_balance)}</>],
      ["Écart", r => r.ecart == null ? "—" : <><P c={r.ecart ? "red" : "green"}>{fcfa(r.ecart)}</P>{r.justificatif && <div className="t-s">{r.justificatif}</div>}</>],
      ["Statut", r => <><P c={CST[r.status][1]}>{CST[r.status][0]}</P>{r.controleur && <div className="t-s">Contrôle : {r.controleur}{r.control_note ? ` · ${r.control_note}` : ""}</div>}</>],
      ["", r => can("finance.view") && ["A_CONTROLER", "ECART_A_JUSTIFIER"].includes(r.status) && r.staff_id !== staff.id ? <div className="acts"><button className="btn sm green" onClick={() => setM({ control: r, note: "" })}>Contrôler</button></div> : null]]} /></Panel>
    {m && m.open && <Modal title="Ouverture de caisse" onClose={() => setM(null)}><div className="field"><label>Solde d’ouverture (FCFA)</label><input className="inp" type="number" min="0" value={m.opening} onChange={e => setM({ ...m, opening: e.target.value })} /></div>
      <button className="btn red" onClick={async () => { if (await act(() => api.post("/admin/cash/open", { opening: +m.opening }), "Caisse ouverte.")) setM(null); }}>Ouvrir</button></Modal>}
    {m && m.mode && <Modal title="Encaissement en espèces" onClose={() => setM(null)}>
      <div className="chips">{[["recovery", "Frais d’un dossier de récupération"], ["payment", "Paiement en attente (référence PAY-)"]].map(([k, l]) => <button key={k} className={`chip ${m.mode === k ? "on" : ""}`} onClick={() => setM({ ...m, mode: k })}>{l}</button>)}</div>
      <div className="field"><label>{m.mode === "recovery" ? "Référence du dossier (IDS-REC-…)" : "Référence de la transaction (PAY-…)"}</label><input className="inp mono" value={m.ref} onChange={e => setM({ ...m, ref: e.target.value })} /></div>
      <div className="field"><label>Montant remis par le client (FCFA)</label><input className="inp" type="number" min="0" value={m.recu} onChange={e => setM({ ...m, recu: e.target.value })} /></div>
      <div className="note n-blue"><Icon n="info" s={16} /><span>Le montant dû est calculé par le système (tarif en vigueur). Le paiement confirme uniquement la condition financière : la restitution reste soumise aux autres contrôles.</span></div>
      <button className="btn red" disabled={!m.ref || !m.recu} onClick={collect}>Encaisser et émettre le reçu</button></Modal>}
    {m && m.close && <Modal title={`Clôture de la caisse ${c.ref}`} onClose={() => setM(null)}>
      <dl className="kv"><dt>Solde d’ouverture</dt><dd>{fcfa(c.opening_balance)}</dd><dt>Encaissements</dt><dd>{fcfa(c.encaissements)}</dd><dt>Solde théorique</dt><dd><b>{fcfa(c.theorique)}</b></dd></dl>
      <div className="field"><label>Solde compté (déclaré)</label><input className="inp" type="number" min="0" value={m.declared} onChange={e => setM({ ...m, declared: e.target.value })} /></div>
      {m.declared !== "" && +m.declared !== c.theorique && <><div className="note n-red"><Icon n="alert" s={16} /><span>Écart de {fcfa(+m.declared - c.theorique)} : justificatif obligatoire, la Finance contrôlera.</span></div>
        <div className="field"><label>Justificatif</label><input className="inp" value={m.justificatif} onChange={e => setM({ ...m, justificatif: e.target.value })} /></div></>}
      <button className="btn red" disabled={m.declared === ""} onClick={async () => { if (await act(() => api.post("/admin/cash/close", { declared: +m.declared, justificatif: m.justificatif }), "Caisse clôturée · transmise à la Finance.")) setM(null); }}>Clôturer et transmettre</button></Modal>}
    {m && m.control && <Modal title={`Contrôle de la caisse ${m.control.ref}`} onClose={() => setM(null)}>
      <dl className="kv"><dt>Théorique</dt><dd>{fcfa(m.control.theoretical_balance)}</dd><dt>Déclaré</dt><dd>{fcfa(m.control.declared_balance)}</dd><dt>Écart</dt><dd><b>{fcfa(m.control.ecart)}</b></dd><dt>Justificatif</dt><dd>{m.control.justificatif || "—"}</dd></dl>
      <div className="field"><label>Observation {m.control.ecart ? "(obligatoire pour valider)" : ""}</label><input className="inp" value={m.note} onChange={e => setM({ ...m, note: e.target.value })} /></div>
      <div className="row"><button className="btn ghost sm grow" onClick={async () => { if (await act(() => api.post(`/admin/cash/${m.control.ref}/control`, { decision: "ECART", note: m.note }), "Écart à justifier.")) setM(null); }}>Écart à justifier</button>
        <button className="btn green sm grow" onClick={async () => { if (await act(() => api.post(`/admin/cash/${m.control.ref}/control`, { decision: "VALIDEE", note: m.note }), "Caisse validée.")) setM(null); }}>Valider</button></div></Modal>}
    {rec && <Modal title={`Reçu ${rec.ref}`} onClose={() => setRec(null)}>
      <dl className="kv">{rec.lines.map(([k, v]) => <div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></div>)}<dt>Moyen</dt><dd>{rec.method}</dd><dt>Remis</dt><dd>{fcfa(rec.recu)}</dd><dt>Rendu</dt><dd><b>{fcfa(rec.rendu)}</b></dd><dt>Caisse</dt><dd className="mono">{rec.caisse}</dd></dl>
      <button className="btn ghost" onClick={() => window.print()}><Icon n="download" s={14} /> Imprimer le reçu</button></Modal>}
  </Page>;
}

export function FinDay({ bar }) {
  const today = new Date().toISOString().slice(0, 10);
  const [day, setDay] = useState(today), [note, setNote] = useState("");
  const [d, reload] = useData(`/admin/fin-day?date=${day}`, [day]);
  const act = useAct(reload);
  if (!d) return <Loading />;
  const t = d.totals, anomalies = t.en_attente + t.ecarts_ouverts + t.caisses_non_controlees;
  return <Page title="Clôture financière journalière" sub="Recettes, remboursements, frais de paiement et anomalies de la journée.">
    {bar}
    <div className="row"><input className="inp" type="date" style={{ maxWidth: 180 }} max={today} value={day} onChange={e => setDay(e.target.value)} />
      {d.closure ? <P c={d.closure.status === "CLOTUREE" ? "green" : "orange"}>{d.closure.status === "CLOTUREE" ? "Clôturée" : "Clôturée avec anomalies"} · {d.closure.agent}</P> : <P c="blue">Ouverte</P>}</div>
    <div className="kpis">
      <Kpi ic="shield" label="Recettes abonnements" value={fcfa(t.abonnements)} color="var(--blue-d)" bg="var(--blue-s)" /><Kpi ic="refresh" label="Renouvellements" value={fcfa(t.renouvellements)} color="var(--blue-d)" bg="var(--blue-s)" />
      <Kpi ic="hand" label="Récupération & livraison" value={fcfa(t.recuperation)} color="var(--orange)" bg="var(--orange-s)" /><Kpi ic="money" label="Dont espèces" value={fcfa(t.especes)} color="var(--ink)" bg="var(--soft)" />
      <Kpi ic="money" label="Total brut" value={fcfa(t.brut)} color="var(--green-d)" bg="var(--green-s)" /><Kpi ic="x" label="Remboursements" value={fcfa(t.remboursements)} color="var(--red)" bg="var(--red-s)" />
      <Kpi ic="sliders" label="Frais de paiement (estimés)" value={fcfa(t.frais_paiement)} color="var(--violet)" bg="var(--violet-s)" /><Kpi ic="check" label="Total net" value={fcfa(t.net)} color="var(--green-d)" bg="var(--green-s)" />
    </div>
    <Panel title="Anomalies" ic="alert"><dl className="kv"><dt>Transactions en attente</dt><dd>{t.en_attente}</dd><dt>Transactions échouées</dt><dd>{t.echouees}</dd><dt>Écarts de rapprochement ouverts</dt><dd>{t.ecarts_ouverts}</dd><dt>Caisses non contrôlées</dt><dd>{t.caisses_non_controlees}</dd></dl>
      {!d.closure && <>{anomalies > 0 && <div className="field" style={{ marginTop: 10 }}><label>Commentaire (obligatoire : clôture avec anomalies)</label><input className="inp" value={note} onChange={e => setNote(e.target.value)} /></div>}
        <button className="btn red" style={{ marginTop: 10 }} onClick={() => act(() => api.post("/admin/fin-day/close", { date: day, note }), "Journée clôturée.")}>{anomalies ? "Clôturer avec anomalies" : "Clôturer la journée"}</button></>}
      {d.closure && d.closure.note && <div className="t-s" style={{ marginTop: 8 }}>Commentaire : {d.closure.note}</div>}</Panel>
    <Panel title="Dernières clôtures" ic="clock"><Table rows={d.history} keyf={r => r.day} empty="Aucune clôture." cols={[["Journée", r => String(r.day).slice(0, 10)], ["Statut", r => <P c={r.status === "CLOTUREE" ? "green" : "orange"}>{r.status === "CLOTUREE" ? "Clôturée" : "Avec anomalies"}</P>], ["Le", r => fmtDT(r.created_at)]]} /></Panel>
  </Page>;
}
