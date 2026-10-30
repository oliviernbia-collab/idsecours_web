/* Tableau de bord, Finance, Commercial, Support (messagerie, SOS, incidents), population */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi as api } from "../../lib/api.js";
import Icon from "../../ui/Icon.jsx";
import { Page, Panel, Table, Modal, Kpi, P, Bars, HBars, useData, useAct, useAdm, Loading, csv } from "../kit.jsx";
import { DOC_ST, TRIG, C_ST, FLOW, ECOSYSTEM } from "@shared/constants.js";
import { FinDay } from "./cash.jsx";
import { PeriodPanel, AgencyMap } from "./supervision.jsx";
import { fmtD, fmtDT, fmtT, fcfa, fmtTel } from "@shared/format.js";

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const ym = s => MOIS[+s.slice(5, 7) - 1];

/* tableau de bord : vue spécialisée du service de l'agent, ou vue globale (Direction, Opérations, Super Admin) */
export function Dashboard() {
  const [s] = useData("/admin/dashboard/service", [], 30000);
  if (!s) return <Loading />;
  return s.global ? <GlobalDashboard /> : <ServiceDashboard s={s} />;
}
const KC = { blue: ["var(--blue)", "var(--blue-s)"], green: ["var(--green-d)", "var(--green-s)"], orange: ["var(--orange)", "var(--orange-s)"], red: ["var(--red)", "var(--red-s)"],
  violet: ["var(--violet)", "var(--violet-s)"], teal: ["var(--teal-d)", "var(--teal-s)"] };
function AlertsPanel() {
  const [n] = useData("/admin/notifications", [], 30000);
  const nav = useNavigate();
  const open = n ? n.items.filter(x => !x.resolved) : [];
  return <Panel title="Alertes et actions requises" ic="alert">{!n ? <Loading /> : open.length ? <div className="list" style={{ boxShadow: "none" }}>{open.slice(0, 8).map(x =>
    <button key={x.id} className="li" onClick={() => x.link && nav("/admin/" + x.link)}><P c={{ CRITIQUE: "red", HAUTE: "orange", NORMALE: "blue" }[x.priority]}>{x.priority}</P><div className="grow"><div className="t-h" style={{ fontSize: 13 }}>{x.title}</div><div className="t-s">{x.body}</div></div><Icon n="chevR" s={13} /></button>)}</div>
    : <div className="empty"><Icon n="check" s={24} />Aucune action requise.</div>}</Panel>;
}
function ServiceDashboard({ s }) {
  const nav = useNavigate();
  return <Page title={`Tableau de bord · ${s.title}`} sub={`Situation au ${fmtDT(new Date())}`} actions={s.links.map(([p, l]) => <button key={p} className="btn sm ghost" onClick={() => nav("/admin/" + p)}>{l}</button>)}>
    <div className="kpis">{s.kpis.map(k => <Kpi key={k.l} ic={k.ic} label={k.l} value={k.v} color={KC[k.c][0]} bg={KC[k.c][1]} />)}</div>
    <div className="grid-2">
      <Panel title={s.series.title} ic="chartUp"><Bars data={s.series.data} color="#1A7EE0" /></Panel>
      <Panel title={s.bars.title} ic="chartBar">{s.bars.data.length ? <HBars data={s.bars.data} color="#13A043" /> : <div className="empty">Aucune donnée.</div>}</Panel>
      <AlertsPanel />
    </div>
  </Page>;
}

function GlobalDashboard() {
  const [d] = useData("/admin/dashboard", [], 30000);
  const [ag] = useData("/admin/agencies");
  const { can } = useAdm();
  if (!d) return <Loading />;
  const k = d.kpi;
  return <Page title="Tableau de bord" sub={`Situation au ${fmtDT(new Date())}`}>
    <div className="kpis">
      <Kpi ic="users" label={`Utilisateurs inscrits · +${k.usersMonth} sur 30 j`} value={k.users} />
      <Kpi ic="shield" label="Abonnements actifs" value={k.subs} color="var(--green-d)" bg="var(--green-s)" />
      <Kpi ic="doc" label="Documents enregistrés" value={k.docs} color="var(--ink)" bg="var(--soft)" />
      <Kpi ic="alert" label={`Déclarations · ${k.declOpen} en cours`} value={k.decl} color="var(--red)" bg="var(--red-s)" />
      <Kpi ic="warehouse" label={`Documents retrouvés · ${k.stock} en stock`} value={k.found} color="var(--orange)" bg="var(--orange-s)" />
      <Kpi ic="hand" label="Restitutions effectuées" value={k.restitutions} color="var(--green-d)" bg="var(--green-s)" />
      {k.revenue != null && <Kpi ic="money" label={`Revenus · ${fcfa(k.revenueMonth)} sur 30 j`} value={fcfa(k.revenue)} color="var(--green-d)" bg="var(--green-s)" />}
      <Kpi ic="siren" label={`Alertes SOS en cours · ${k.verifQueue} vérif. en attente`} value={k.sosOpen} color={k.sosOpen ? "#fff" : "var(--red)"} bg={k.sosOpen ? "var(--red)" : "var(--red-s)"} />
    </div>
    <PeriodPanel />
    <Panel title="Circuit du document · organigramme ID SECOURS" ic="sitemap" right={<span className="t-s">situation en temps réel à chaque étape</span>}>
      <div className="flow">{FLOW.map((s, i) => <div key={s.n} className="flow-step" style={{ "--c": s.c }}>
        <span className="flow-n">{s.n}</span><div className="flow-v num">{d.flux[i]}</div><b>{s.l}</b><span className="t-s">{s.s}</span>
        <span className="t-s" style={{ fontStyle: "italic" }}>{["à collecter", "missions en cours", "en transit vers l’agence", "à contrôler", "restitutions autorisées", "documents récupérés"][i]}</span></div>)}</div>
      <div className="t-s" style={{ marginTop: 10, fontStyle: "italic", textAlign: "center" }}>{ECOSYSTEM}</div>
    </Panel>
    <div className="grid-2">
      <AlertsPanel />
      {ag && <Panel title="Carte des agences" ic="map" right={can("agencies.manage") && <a href="agencies" className="t-s">Voir la carte complète →</a>}><AgencyMap items={ag.items} height={220} /></Panel>}
      <Panel title="Inscriptions par mois" ic="users"><Bars data={d.months.map(m => ({ l: ym(m.ym), v: m.inscriptions }))} color="#1A7EE0" /></Panel>
      <Panel title="Nouvelles protections par mois" ic="shield"><Bars data={d.months.map(m => ({ l: ym(m.ym), v: m.abonnements }))} color="#13A043" /></Panel>
      {can("finance.view") && <Panel title="Revenus par mois (FCFA)" ic="money"><Bars data={d.months.map(m => ({ l: ym(m.ym), v: m.revenus }))} color="#0B7A32" fmt={v => v >= 1000 ? Math.round(v / 100) / 10 + " k" : v} /></Panel>}
      <Panel title="Documents par catégorie" ic="doc"><HBars data={d.byCat.map(c => ({ l: c.label, v: c.n }))} color="#1A7EE0" /></Panel>
      <Panel title="Documents par statut" ic="list"><HBars data={d.bySt.map(s => ({ l: (DOC_ST[s.status] || { l: s.status }).l, v: s.n }))} color="#F28C12" /></Panel>
      <Panel title="Derniers utilisateurs inscrits" ic="user"><Table rows={d.lastUsers} cols={[["Nom", r => `${r.prenom} ${r.nom}`], ["Téléphone", r => fmtTel(r.tel)], ["Commune", r => r.commune || "—"], ["Inscrit le", r => fmtD(r.created_at)]]} /></Panel>
      <Panel title="Dernières déclarations de perte" ic="alert"><Table rows={d.lastDecl} cols={[["Référence", r => <span className="mono">{r.ref}</span>], ["Document", r => r.cat], ["Déclarant", r => `${r.prenom} ${r.nom}`], ["Statut", r => r.closed ? <P>Clôturé</P> : <P c="red">En cours</P>]]} /></Panel>
      <Panel title="Activités récentes du système" ic="clock"><div className="log" style={{ maxHeight: 260 }}>{d.recent.map((a, i) => <div key={i}><span>{fmtD(a.created_at)} {fmtT(a.created_at)}</span>{a.action.replace(/_/g, " ").toLowerCase()} {a.entity_ref || ""}</div>)}</div></Panel>
    </div>
  </Page>;
}

const KIND = { indiv: "Protection individuelle", pack: "Pack", formule: "Formule", renew: "Renouvellement", frais: "Frais de récupération", livraison: "Livraison" };
/* Direction financière : alertes cliquables + onglets (Finance §21–§38) */
export function Finance() {
  const [tab, setTab] = useState("transactions");
  const [al] = useData("/admin/fin/alerts", [tab], 30000);
  const bar = <>
    {al && <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>{al.alerts.filter(a => a.n > 0).map(a => <button key={a.k} className={`pill p-${a.c}`} style={{ cursor: a.to ? "pointer" : "default", padding: "7px 12px" }} onClick={() => a.to && setTab(a.to)}><Icon n="alert" s={12} /> {a.n} {a.l}</button>)}</div>}
    <div className="chips">{[["transactions", "Transactions"], ["remboursements", "Remboursements"], ["rapprochements", "Rapprochements"], ["ecarts", "Écarts"], ["cloture", "Clôture du jour"]].map(([k, l]) => <button key={k} className={`chip ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{l}</button>)}</div></>;
  return tab === "cloture" ? <FinDay bar={bar} /> : tab === "remboursements" ? <Refunds bar={bar} /> : tab === "rapprochements" ? <Reconciliations bar={bar} /> : tab === "ecarts" ? <Gaps bar={bar} /> : <Transactions bar={bar} />;
}

function Transactions({ bar }) {
  const [from, setFrom] = useState(""), [to, setTo] = useState("");
  const [d, reload] = useData(`/admin/finance?from=${from}&to=${to}`, [from, to]);
  const [m, setM] = useState(null), [motif, setMotif] = useState(""), [amount, setAmount] = useState(""), [inv, setInv] = useState(null);
  const act = useAct(reload), { can } = useAdm();
  const cols = [["Référence", r => r.ref], ["Date", r => fmtDT(r.created_at)], ["Objet", r => r.label], ["Type", r => KIND[r.kind]], ["Client", r => r.prenom ? `${r.prenom} ${r.nom}` : "Sans compte"], ["Moyen", r => r.method], ["Montant", r => r.amount], ["Statut", r => r.status]];
  return <Page title="Transactions financières" sub="Abonnements, frais de récupération et livraisons · les transactions ne sont jamais supprimées"
    actions={<div className="filters"><input className="inp" type="date" value={from} onChange={e => setFrom(e.target.value)} aria-label="Du" /><input className="inp" type="date" value={to} onChange={e => setTo(e.target.value)} aria-label="Au" />{d && <button className="btn sm ghost" onClick={() => csv("transactions", d.items, cols)}><Icon n="download" s={14} /> Export comptable</button>}</div>}>
    {bar}
    {!d ? <Loading /> : <>
      <div className="kpis"><Kpi ic="money" label="Encaissé" value={fcfa(d.totals.ok)} color="var(--green-d)" bg="var(--green-s)" /><Kpi ic="refresh" label="Remboursé" value={fcfa(d.totals.refunded)} color="var(--red)" bg="var(--red-s)" /><Kpi ic="clock" label="Transactions en attente" value={d.totals.pending} color="var(--violet)" bg="var(--violet-s)" /></div>
      <div className="grid-2"><Panel title="Revenus par type" ic="chart"><HBars data={d.byKind.map(x => ({ l: KIND[x.kind], v: +x.total }))} color="#0B7A32" /></Panel><Panel title="Revenus par moyen de paiement" ic="money"><HBars data={d.byMethod.map(x => ({ l: x.label, v: x.total }))} color="#7C3AED" /></Panel></div>
      <Panel title="Transactions"><Table rows={d.items} cols={[["Référence", r => <span className="mono">{r.ref}</span>], ["Date", r => fmtDT(r.created_at)], ["Objet", r => <>{r.label}<div className="t-s">{KIND[r.kind]}</div></>], ["Client", r => r.prenom ? `${r.prenom} ${r.nom}` : <span className="t-s">Sans compte</span>], ["Moyen", r => r.method],
        ["Montant", r => <><b className="num">{fcfa(r.amount)}</b>{r.refunded_amount > 0 && r.status !== "REMBOURSÉ" && <div className="t-s">dont {fcfa(r.refunded_amount)} remboursés</div>}</>], ["Statut", r => <P c={{ "RÉUSSI": "green", "EN ATTENTE": "orange", "ÉCHOUÉ": "red", "REMBOURSÉ": "grey" }[r.status]}>{r.status}</P>],
        ["Rapprochement", r => r.reconciled ? <P c={{ "RAPPROCHÉ": "green", "À RAPPROCHER": "teal", "ÉCART": "red" }[r.reconciled]}>{r.reconciled}</P> : <span className="t-s">—</span>],
        ["", r => <div className="acts">{can("billing.view") && ["RÉUSSI", "REMBOURSÉ"].includes(r.status) && <button className="btn sm ghost" onClick={() => api.get(`/admin/finance/${r.ref}/invoice`).then(x => setInv(x.invoice)).catch(() => {})}><Icon n="invoice" s={13} /> Facture</button>}
          {can("finance.refund") && r.status === "RÉUSSI" && <button className="btn sm ghost" onClick={() => { setMotif(""); setAmount(String(r.amount - (r.refunded_amount || 0))); setM(r); }}>Demander un remboursement</button>}</div>]]} /></Panel></>}
    {inv && <Modal title={`Facture ${inv.numero}`} onClose={() => setInv(null)}>
      <div className="row" style={{ alignItems: "flex-start" }}><img src="/logo-full.png" alt="ID SECOURS" style={{ width: 170 }} /><div className="grow" style={{ textAlign: "right" }}><div className="t-title" style={{ textAlign: "right" }}>FACTURE</div><div className="mono">{inv.numero}</div><div className="t-s">Émise le {fmtD(inv.date)}</div>{inv.statut === "REMBOURSÉ" && <P c="red">REMBOURSÉE</P>}</div></div>
      <div className="grid2"><div className="panel" style={{ boxShadow: "none", border: "1px solid var(--line)" }}><div className="t-label">Émetteur</div><b>ID SECOURS · PROSOFT ACADEMY</b><div className="t-s">Abidjan, Côte d’Ivoire</div></div>
        <div className="panel" style={{ boxShadow: "none", border: "1px solid var(--line)" }}><div className="t-label">Client</div><b>{inv.client.nom}</b><div className="t-s">{inv.client.tel}{inv.client.email ? " · " + inv.client.email : ""}</div><div className="t-s">{inv.client.commune || ""}</div></div></div>
      <table className="tbl"><thead><tr><th>Désignation</th><th style={{ textAlign: "right" }}>Montant</th></tr></thead><tbody><tr><td><b>{inv.objet}</b>{inv.lignes.filter(([k]) => !/montant/i.test(k)).map(([k, v]) => <div key={k} className="t-s">{k} : {v}</div>)}</td><td style={{ textAlign: "right" }}>{fcfa(inv.montant)}</td></tr>
        <tr><td style={{ textAlign: "right", fontWeight: 700 }}>Total payé</td><td style={{ textAlign: "right" }}><b className="price" style={{ fontSize: 18 }}>{fcfa(inv.montant)}</b></td></tr></tbody></table>
      <div className="t-s">Réglé par {inv.methode} · transaction {inv.ref}</div>
      <button className="btn ghost noprint" onClick={() => window.print()}><Icon n="download" s={14} /> Imprimer / PDF</button></Modal>}
    {m && <Modal title={`Demande de remboursement · ${m.ref}`} onClose={() => setM(null)}><p className="t-s" style={{ margin: 0 }}>{m.label} · {fcfa(m.amount)}. La demande sera analysée puis validée par un autre agent (double validation au-delà du seuil). La transaction initiale est conservée.</p>
      <div className="field"><label>Montant demandé (FCFA)</label><input className="inp num" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ""))} /></div>
      <div className="field"><label>Motif (obligatoire)</label><textarea className="inp" value={motif} onChange={e => setMotif(e.target.value)} /></div>
      <button className="btn red" disabled={!motif || !+amount} onClick={async () => { if (await act(() => api.post("/admin/fin/refunds", { payment: m.ref, amount: +amount, motif }), "Demande de remboursement créée · en attente d’analyse.")) setM(null); }}>Créer la demande</button></Modal>}
  </Page>;
}

const RMB_C = { "EN ATTENTE D’ANALYSE": "orange", "EN ATTENTE SUPER ADMIN": "orange", "INITIÉ": "blue", "REMBOURSÉ": "green", "REFUSÉ": "red" };
function Refunds({ bar }) {
  const [d, reload] = useData("/admin/fin/refunds", [], 20000);
  const [m, setM] = useState(null), [note, setNote] = useState("");
  const act = useAct(reload), { staff } = useAdm();
  return <Page title="Remboursements" sub="Toujours rattachés à une transaction initiale · l’agent qui prépare ne valide pas · validation Super Admin au-delà du seuil">
    {bar}
    {d && <div className="note n-blue"><Icon n="info" s={16} /><span>Seuil de double validation : <b>{fcfa(d.seuil)}</b> (paramétrable par le Super Admin).</span></div>}
    <Panel><Table rows={d && d.items} empty="Aucun remboursement." cols={[["Demande", r => <><span className="mono">{r.ref}</span><div className="t-s">{fmtDT(r.created_at)}</div></>], ["Transaction initiale", r => <><span className="mono">{r.pay_ref}</span><div className="t-s">{r.pay_label}</div></>],
      ["Client", r => r.prenom ? `${r.prenom} ${r.nom}` : "Sans compte"], ["Montant", r => <><b>{fcfa(r.amount)}</b><div className="t-s">sur {fcfa(r.amount_original)}</div></>], ["Motif", r => <span className="t-s">{r.motif}</span>],
      ["Statut", r => <P c={RMB_C[r.status]}>{r.status}</P>], ["", r => <div className="acts"><button className="btn sm ghost" onClick={() => { setNote(""); setM(r); }}>{["EN ATTENTE D’ANALYSE", "EN ATTENTE SUPER ADMIN"].includes(r.status) ? "Analyser" : "Détail"}</button></div>]]} /></Panel>
    {m && <Modal title={`Remboursement ${m.ref}`} onClose={() => setM(null)}>
      <dl className="kv"><dt>Transaction initiale</dt><dd className="mono">{m.pay_ref} · {m.method}</dd><dt>Montant</dt><dd>{fcfa(m.amount)} sur {fcfa(m.amount_original)}</dd><dt>Préparé par</dt><dd>{m.rq_prenom} {m.rq_nom}</dd>
        {m.va_prenom && <><dt>Validé par</dt><dd>{m.va_prenom} {m.va_nom}</dd></>}{m.ad_prenom && <><dt>Validation Super Admin</dt><dd>{m.ad_prenom} {m.ad_nom}</dd></>}{m.provider_ref && <><dt>Référence prestataire</dt><dd className="mono">{m.provider_ref}</dd></>}</dl>
      <div className="t-label">Étapes conservées</div><div className="log" style={{ maxHeight: 180 }}>{m.steps.map((s, i) => <div key={i}><span>{fmtDT(s.created_at)}</span>{s.label}{s.prenom ? ` · ${s.prenom} ${s.nom}` : ""}</div>)}</div>
      {["EN ATTENTE D’ANALYSE", "EN ATTENTE SUPER ADMIN"].includes(m.status) && <>
        {m.requested_by === staff.id && <div className="note n-orange"><Icon n="userShield" s={16} /><span>Vous avez préparé cette demande : un autre agent doit la valider.</span></div>}
        <div className="field"><label>Commentaire (obligatoire en cas de refus)</label><textarea className="inp" value={note} onChange={e => setNote(e.target.value)} /></div>
        <div className="row"><button className="btn green sm grow" onClick={async () => { if (await act(() => api.post(`/admin/fin/refunds/${m.ref}/decision`, { action: "validate", note }), "Validation enregistrée.")) setM(null); }}>Valider</button>
          <button className="btn outline-r sm" disabled={!note} onClick={async () => { if (await act(() => api.post(`/admin/fin/refunds/${m.ref}/decision`, { action: "refuse", note }), "Remboursement refusé.")) setM(null); }}>Refuser</button></div></>}</Modal>}
  </Page>;
}

function Reconciliations({ bar }) {
  const [d, reload] = useData("/admin/fin/reconciliations", [], 0);
  const [imp, setImp] = useState(null), [det, setDet] = useState(null), [ln, setLn] = useState(null), [note, setNote] = useState("");
  const act = useAct(reload);
  const open = ref => api.get(`/admin/fin/reconciliations/${ref}`).then(setDet).catch(() => {});
  const pct = d ? Math.round(d.totals.ok / Math.max(1, d.totals.ok + d.totals.pending + d.totals.gaps) * 100) : 0;
  return <Page title="Rapprochements" sub="Comparaison des transactions ID SECOURS avec les relevés des opérateurs Mobile Money, prestataires, banque et caisse agence"
    actions={<button className="btn sm red" onClick={() => setImp({ source: "OM", csv: "" })}><Icon n="upload" s={14} /> Importer un relevé</button>}>
    {bar}
    {d && <div className="kpis"><Kpi ic="check" label={`Transactions rapprochées · ${pct} %`} value={d.totals.ok} color="var(--green-d)" bg="var(--green-s)" /><Kpi ic="clock" label="En attente de rapprochement" value={d.totals.pending} color="var(--teal-d)" bg="var(--teal-s)" /><Kpi ic="alert" label="Écarts à analyser" value={d.totals.gaps} color="var(--red)" bg="var(--red-s)" /></div>}
    <Panel title="Relevés importés"><Table rows={d && d.batches} empty="Aucun relevé importé." cols={[["Rapprochement", b => <span className="mono">{b.ref}</span>], ["Source", b => b.source], ["Période", b => b.date_from ? `${fmtD(b.date_from)} → ${fmtD(b.date_to)}` : "—"],
      ["Lignes", b => b.lines_total], ["Rapprochées", b => <P c="green">{b.matched}</P>], ["À rapprocher", b => b.pending ? <P c="orange">{b.pending}</P> : 0], ["Écarts", b => b.gaps ? <P c="red">{b.gaps}</P> : 0], ["Par", b => `${b.prenom} ${b.nom} · ${fmtDT(b.created_at)}`],
      ["", b => <div className="acts"><button className="btn sm ghost" onClick={() => open(b.ref)}>Voir le détail</button></div>]]} /></Panel>
    {imp && <Modal title="Importer un relevé" onClose={() => setImp(null)}>
      <div className="field"><label>Source</label><select className="inp" value={imp.source} onChange={e => setImp({ ...imp, source: e.target.value })}>{["OM", "MTN", "MOOV", "WAVE", "CB", "CAISSE"].map(s => <option key={s}>{s}</option>)}</select></div>
      <div className="field"><label>Relevé CSV (reference_idsecours ; reference_prestataire ; montant ; date ; statut)</label><textarea className="inp mono" style={{ minHeight: 160, fontSize: 12 }} value={imp.csv} onChange={e => setImp({ ...imp, csv: e.target.value })} /></div>
      <label className="photo" style={{ aspectRatio: "auto", height: 56 }}><span><Icon n="upload" s={16} /> Charger un fichier .csv</span><input type="file" accept=".csv,text/csv" onChange={e => { const f = e.target.files[0]; if (f) f.text().then(t => setImp(i => ({ ...i, csv: t }))); }} /></label>
      <button className="btn ghost sm" onClick={() => api.get(`/admin/fin/reconciliations-sample/${imp.source}`).then(x => setImp(i => ({ ...i, csv: x.csv }))).catch(() => {})}>Générer un relevé de test (simulation)</button>
      <button className="btn red" disabled={!imp.csv.trim()} onClick={async () => { let r; if (await act(async () => { r = await api.post("/admin/fin/reconciliations", imp); }, "Relevé importé et rapproché.")) { setImp(null); open(r.ref); } }}>Lancer le rapprochement</button></Modal>}
    {det && <Modal title={`Détail ${det.batch.ref} · ${det.batch.source}`} onClose={() => setDet(null)}>
      <Table rows={det.lines} cols={[["Réf. prestataire", l => <span className="mono">{l.ext_ref}</span>], ["Réf. ID SECOURS", l => <span className="mono">{l.ids_ref || "—"}</span>], ["Montant", l => <>{fcfa(l.ext_amount)}{l.diff ? <div className="t-s" style={{ color: "var(--red)" }}>écart {fcfa(l.diff)}</div> : null}</>],
        ["Statut", l => <P c={{ "RAPPROCHÉ": "green", "À RAPPROCHER": "orange", "ÉCART": "red" }[l.status]}>{l.status}</P>], ["Note", l => <span className="t-s">{l.note}</span>],
        ["", l => l.status !== "RAPPROCHÉ" ? <button className="btn sm ghost" onClick={() => { setNote(""); setLn(l); }}>Traiter</button> : null]]} /></Modal>}
    {ln && <Modal title={`Ligne ${ln.ext_ref}`} onClose={() => setLn(null)}>
      <div className="field"><label>Commentaire (journalisé)</label><textarea className="inp" value={note} onChange={e => setNote(e.target.value)} /></div>
      <div className="row"><button className="btn green sm grow" disabled={!note} onClick={async () => { if (await act(() => api.post(`/admin/fin/reconciliation-lines/${ln.id}`, { action: "rapprocher", note }), "Ligne rapprochée manuellement.")) { setLn(null); open(det.batch.ref); } }}>Rapprocher</button>
        <button className="btn outline-r sm" disabled={!note} onClick={async () => { if (await act(() => api.post(`/admin/fin/reconciliation-lines/${ln.id}`, { action: "ecart", note }), "Écart signalé.")) { setLn(null); open(det.batch.ref); } }}>Signaler un écart</button></div></Modal>}
  </Page>;
}

const GAP_C = { NOUVEAU: "red", "EN ANALYSE": "orange", "JUSTIFIÉ": "blue", "CORRIGÉ": "blue", "ESCALADÉ": "red", "CLÔTURÉ": "grey" };
function Gaps({ bar }) {
  const [d, reload] = useData("/admin/fin/gaps", [], 20000);
  const [m, setM] = useState(null), [f, setF] = useState({});
  const act = useAct(reload);
  return <Page title="Écarts financiers" sub="Chaque écart devient un élément de suivi · motif de clôture obligatoire">
    {bar}
    <Panel><Table rows={d && d.items} empty="Aucun écart." cols={[["Écart", g => <><span className="mono">{g.ref}</span><div className="t-s">{fmtDT(g.created_at)}</div></>], ["Type", g => g.type], ["Transaction", g => g.pay_ref ? <span className="mono">{g.pay_ref}</span> : "—"],
      ["Différence", g => g.amount_diff ? fcfa(g.amount_diff) : "—"], ["Relevé", g => g.batch_ref || "—"], ["Statut", g => <P c={GAP_C[g.status]}>{g.status}</P>], ["Note", g => <span className="t-s">{g.closed_reason || g.note}</span>],
      ["", g => g.status !== "CLÔTURÉ" ? <div className="acts"><button className="btn sm ghost" onClick={() => { setF({ status: g.status === "NOUVEAU" ? "EN ANALYSE" : g.status, note: "", reason: "" }); setM(g); }}>Traiter</button></div> : null]]} /></Panel>
    {m && <Modal title={`Écart ${m.ref} · ${m.type}`} onClose={() => setM(null)}>
      <div className="field"><label>Nouveau statut</label><select className="inp" value={f.status} onChange={e => setF({ ...f, status: e.target.value })}>{["EN ANALYSE", "JUSTIFIÉ", "CORRIGÉ", "ESCALADÉ", "CLÔTURÉ"].map(s => <option key={s}>{s}</option>)}</select></div>
      <div className="field"><label>Note</label><textarea className="inp" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} /></div>
      {f.status === "CLÔTURÉ" && <div className="field"><label>Motif de clôture (obligatoire)</label><textarea className="inp" value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })} /></div>}
      <button className="btn red" disabled={f.status === "CLÔTURÉ" && !f.reason} onClick={async () => { if (await act(() => api.patch(`/admin/fin/gaps/${m.ref}`, f), "Écart mis à jour.")) setM(null); }}>Enregistrer</button></Modal>}
  </Page>;
}

/* portefeuille (Commercial §17) */
const PF = { PROSPECT: ["Prospect", "grey"], CLIENT: ["Client", "green"], ANCIEN_CLIENT: ["Ancien client", "orange"] };

/* renouvellements (Commercial §25–§28) : échéances, relance manuelle ou automatique, message paramétrable, historique */
function Renewals({ d, reload }) {
  const { can } = useAdm();
  const [tab, setTab] = useState("due"), [msg, setMsg] = useState(null), [ech, setEch] = useState("");
  const [h, reloadH] = useData(tab === "history" ? "/admin/commercial/reminders" : null, [tab]);
  const act = useAct(() => { reload(); reloadH(); });
  const edit = can("settings.manage") || can("prospects.manage");
  const rows = d.renew.filter(r => ech === "" || String(r.bucket.k) === ech);
  const counts = k => d.renew.filter(r => r.bucket.k === k).length;
  return <Panel title="Renouvellements" ic="refresh" right={<div className="chips" style={{ margin: 0 }}>{[["due", "À renouveler"], ["history", "Historique des relances"]].map(([k, l]) => <button key={k} className={`chip ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{l}</button>)}</div>}>
    {tab === "due" && <>
      <div className="chips"><button className={`chip ${ech === "" ? "on" : ""}`} onClick={() => setEch("")}>Toutes · {d.renew.length}</button>
        {[...d.echeances.filter(e => e > 0).sort((a, b) => b - a).map(e => [String(e), `Dans ${e} jours`]), ["0", "Aujourd’hui"], ["-1", "Expirés"]].map(([k, l]) => <button key={k} className={`chip ${ech === k ? "on" : ""}`} onClick={() => setEch(k)}>{l} · {counts(+k)}</button>)}</div>
      <Table rows={rows} empty="Aucun abonnement à cette échéance." cols={[["Référence", r => <span className="mono">PROT-{String(r.id).padStart(5, "0")}</span>], ["Client", r => <>{r.prenom} {r.nom}<div className="t-s">{fmtTel(r.tel)}</div></>], ["Formule", r => r.label], ["Échéance", r => fmtD(r.exp_at)],
        ["Statut", r => <P c={r.bucket.c}>{r.bucket.l}</P>], ["Relances", r => r.reminders ? <span className="t-s">{r.reminders} · dernière le {fmtDT(r.last_reminder)}</span> : <span className="t-s">Aucune</span>],
        ["", r => <div className="acts"><button className="btn sm ghost" onClick={() => act(() => api.post(`/admin/commercial/remind/${r.id}`), "Relance envoyée (notification + SMS) · historisée.")}><Icon n="send" s={13} /> Relancer</button></div>]]} />
      <div className="note n-blue"><Icon n="clock" s={16} /><span>Relances automatiques {d.renewAuto ? <b>activées</b> : <b>désactivées</b>} : une seule relance par échéance ({d.echeances.filter(e => e > 0).map(e => `J-${e}`).join(", ")}{d.echeances.includes(0) ? ", jour J" : ""}), inscrite dans l’historique comme « Automatisation ». Échéances réglables dans Paramètres système (renew_echeances).</span></div>
      {edit && <div className="row" style={{ gap: 8, flexWrap: "wrap" }}><button className="btn sm ghost" onClick={() => setMsg(d.renewMessage)}><Icon n="edit" s={13} /> Modifier le message</button>
        <button className="btn sm ghost" onClick={() => act(() => api.put("/admin/commercial/renew-settings", { auto: !d.renewAuto }), d.renewAuto ? "Relances automatiques désactivées." : "Relances automatiques activées.")}>{d.renewAuto ? "Désactiver" : "Activer"} les relances automatiques</button></div>}
    </>}
    {tab === "history" && <Table rows={h && h.items} empty="Aucune relance envoyée." cols={[["Date", r => fmtDT(r.created_at)], ["Client", r => `${r.prenom} ${r.nom}`], ["Canal", r => r.channel], ["Campagne", r => r.campaign_ref ? <span className="mono">{r.campaign_ref}</span> : "—"],
      ["Échéance", r => r.echeance == null ? "—" : r.echeance === 0 ? "Jour J" : `J-${r.echeance}`], ["Message", r => <span className="t-s">{r.message}</span>], ["Résultat", r => <P c={/^Envoy/.test(r.result) ? "green" : "orange"}>{r.result}</P>], ["Origine", r => r.auto ? <P c="blue">Automatisation</P> : r.origine]]} />}
    {msg != null && <Modal title="Message de renouvellement" onClose={() => setMsg(null)}>
      <div className="field"><label>Modèle (notification et SMS)</label><textarea className="inp" rows={5} value={msg} onChange={e => setMsg(e.target.value)} /></div>
      <div className="t-s">Variables : <span className="mono">{"{prenom}"}</span>, <span className="mono">{"{nom}"}</span>, <span className="mono">{"{formule}"}</span>, <span className="mono">{"{date}"}</span> (obligatoire : date d’expiration).</div>
      <div className="note n-blue"><Icon n="eye" s={16} /><span>Aperçu : {msg.replace(/\{prenom\}/g, "Koffi").replace(/\{nom\}/g, "Kouadio").replace(/\{formule\}/g, "Pack ID SECOURS").replace(/\{date\}/g, "30/09/2026")}</span></div>
      <button className="btn red" disabled={!msg.includes("{date}")} onClick={async () => { if (await act(() => api.put("/admin/commercial/renew-settings", { message: msg }), "Message enregistré · journalisé.")) setMsg(null); }}>Enregistrer</button></Modal>}
  </Panel>;
}

export function Commercial() {
  const [d, reload] = useData("/admin/commercial");
  const { can } = useAdm();
  const [pr, reloadP] = useData(can("prospects.manage") ? "/admin/prospects" : "/admin/commercial");
  const [f, setF] = useState(null), [sub, setSub] = useState(null);
  const [cl, reloadC] = useData("/admin/commercial/clients");
  const act = useAct(() => { reload(); reloadP(); reloadC(); });
  const newSub = (p = {}) => setSub({ prenom: "", nom: p.nom || "", tel: p.tel || "", email: p.email || "", commune: "Cocody", formule: "", source: p.source || "Terrain", consentCgu: false, consentData: false, prospect: p.id || null });
  return <Page title="Abonnements & prospects" sub="Le service commercial ne peut jamais enregistrer de documents à la place d’un abonné."
    actions={can("prospects.manage") && <button className="btn sm red" onClick={() => newSub()}><Icon n="plus" s={14} /> Créer un nouvel abonné</button>}>
    {!d ? <Loading /> : <>
      <div className="kpis"><Kpi ic="user" label={`Prospects · sans abonnement actif${d.portfolio.prospectsFiches ? ` (+ ${d.portfolio.prospectsFiches} fiche(s) prospect)` : ""}`} value={d.portfolio.prospects} color="var(--ink)" bg="var(--soft)" />
        <Kpi ic="users" label="Clients · abonnement actif" value={d.portfolio.clients} color="var(--green-d)" bg="var(--green-s)" /><Kpi ic="clock" label="Anciens clients · non renouvelés" value={d.portfolio.anciens} color="var(--orange)" bg="var(--orange-s)" /></div>
      <div className="kpis">{d.byKind.map(k => <Kpi key={k.kind} ic={k.kind === "FORMULE" ? "crown" : k.kind === "PACK" ? "shieldck" : "doc"} label={{ INDIV: "Protections individuelles actives", PACK: "Packs actifs", FORMULE: "Formules actives" }[k.kind]} value={k.n} color="var(--green-d)" bg="var(--green-s)" />)}</div>
      <Renewals d={d} reload={reload} />
      <Panel title="Abonnements" ic="shield"><Table rows={d.prots} cols={[["Client", r => `${r.prenom} ${r.nom}`], ["Protection", r => r.label], ["Tarif", r => fcfa(r.prix)], ["Début", r => fmtD(r.start_at)], ["Expiration", r => fmtD(r.exp_at)], ["Statut", r => <P c={r.status.c}>{r.status.l}</P>]]} /></Panel>
      {can("prospects.manage") && <Panel title="Prospects" ic="handshake" right={<button className="btn sm red" onClick={() => setF({ nom: "", tel: "", email: "", source: "Terrain", notes: "" })}><Icon n="plus" s={13} /> Nouveau prospect</button>}>
        <Table rows={pr && pr.items} cols={[["Prospect", r => <b>{r.nom}</b>], ["Contact", r => <>{r.tel}<div className="t-s">{r.email}</div></>], ["Source", r => r.source], ["Notes", r => <span className="t-s">{r.notes}</span>],
          ["Statut", r => <select className="inp" style={{ minHeight: 34, width: "auto" }} value={r.statut} onChange={e => act(() => api.patch(`/admin/prospects/${r.id}`, { statut: e.target.value }))}>{["NOUVEAU", "CONTACTÉ", "INTÉRESSÉ", "CONVERTI", "PERDU"].map(s => <option key={s}>{s}</option>)}</select>],
          ["", r => !r.user_id && r.statut !== "PERDU" ? <div className="acts"><button className="btn sm ghost" onClick={() => newSub(r)}>Convertir en client</button></div> : r.user_id ? <span className="t-s">Client CLI-{String(r.user_id).padStart(6, "0")}</span> : null]]} /></Panel>}
      <Panel title="Clients · fiche commerciale" ic="users"><Table rows={cl && cl.items} cols={[["Client", r => <><b>{r.prenom} {r.nom}</b><div className="t-s mono">{r.ref}</div></>], ["Contact", r => <>{fmtTel(r.tel)}<div className="t-s">{r.commune || ""}</div></>],
        ["Compte", r => <P c={{ ACTIF: "green", A_ACTIVER: "orange", SUSPENDU: "red" }[r.status]}>{r.status === "A_ACTIVER" ? "À activer" : r.status}</P>], ["Protections", r => r.protections || <span className="t-s">Aucune{r.formule_souhaitee ? ` · souhaite ${r.formule_souhaitee}` : ""}</span>],
        ["Échéance", r => r.prochaine_echeance ? fmtD(r.prochaine_echeance) : "—"], ["Source", r => r.acquisition_source || "Application"], ["CA", r => fcfa(r.ca)]]} /></Panel>
    </>}
    {sub && <Modal title={sub.prospect ? "Convertir le prospect en client" : "Créer un nouvel abonné"} onClose={() => setSub(null)}>
      <div className="note n-blue"><Icon n="info" s={16} /><span>Le client activera lui-même son compte (code SMS + mot de passe), choisira et paiera sa protection, puis enregistrera ses documents dans l’application. Vous n’avez accès ni à ses documents ni à leurs images.</span></div>
      <div className="grid2">{[["prenom", "Prénom"], ["nom", "Nom"]].map(([k, l]) => <div key={k} className="field"><label>{l}</label><input className="inp" value={sub[k]} onChange={e => setSub({ ...sub, [k]: e.target.value })} /></div>)}</div>
      <div className="grid2">{[["tel", "Téléphone"], ["email", "E-mail"]].map(([k, l]) => <div key={k} className="field"><label>{l}</label><input className="inp" value={sub[k]} onChange={e => setSub({ ...sub, [k]: e.target.value })} /></div>)}</div>
      <div className="grid2"><div className="field"><label>Formule souhaitée</label><select className="inp" value={sub.formule} onChange={e => setSub({ ...sub, formule: e.target.value })}><option value="">Protection individuelle / pack</option>{["STANDARD", "ESSENTIEL", "VIP", "VVIP"].map(x => <option key={x}>{x}</option>)}</select></div>
        <div className="field"><label>Canal d’acquisition</label><select className="inp" value={sub.source} onChange={e => setSub({ ...sub, source: e.target.value })}>{["Terrain", "Agence", "Partenaire", "Établissement scolaire", "Entreprise", "Événement", "Réseaux sociaux", "Recommandation"].map(x => <option key={x}>{x}</option>)}</select></div></div>
      <label className="chk"><input type="checkbox" checked={sub.consentCgu} onChange={e => setSub({ ...sub, consentCgu: e.target.checked })} />Le client accepte les conditions générales et du service</label>
      <label className="chk"><input type="checkbox" checked={sub.consentData} onChange={e => setSub({ ...sub, consentData: e.target.checked })} />Le client consent au traitement de ses données (politique de confidentialité)</label>
      <button className="btn red" disabled={!sub.consentCgu || !sub.consentData} onClick={async () => { if (await act(() => api.post("/admin/commercial/subscribers", sub), "Compte créé · SMS d’activation envoyé au client.")) setSub(null); }}>Créer le compte</button></Modal>}
    {f && <Modal title="Nouveau prospect" onClose={() => setF(null)}>{[["nom", "Nom / organisation"], ["tel", "Téléphone"], ["email", "E-mail"], ["source", "Source d’acquisition"], ["notes", "Notes"]].map(([k, l]) => <div key={k} className="field"><label>{l}</label><input className="inp" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></div>)}
      <button className="btn red" onClick={async () => { if (await act(() => api.post("/admin/prospects", f), "Prospect créé.")) setF(null); }}>Enregistrer</button></Modal>}
  </Page>;
}

export function Messages() {
  const [list, reloadL] = useData("/admin/messages", [], 10000);
  const [ref, setRef] = useState(null), [text, setText] = useState("");
  const [conv, reloadC] = useData(ref ? `/admin/messages/${ref}` : "/admin/messages", [ref], ref ? 6000 : null);
  const act = useAct(() => { reloadC(); reloadL(); });
  return <Page title="Messagerie des dossiers" sub="ID SECOURS reste l’intermédiaire : aucune coordonnée privée n’est échangée entre les parties.">
    <div className="grid-2" style={{ gridTemplateColumns: "minmax(280px,1fr) 2fr" }}>
      <Panel title="Conversations" ic="msg"><div className="list" style={{ boxShadow: "none" }}>{!list ? <Loading /> : list.items.map(c => <button key={c.ref} className="li" style={{ background: ref === c.ref ? "var(--soft)" : undefined }} onClick={() => setRef(c.ref)}><div className="grow"><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{c.ref}</div><div className="t-s" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.last}</div></div>{+c.unread > 0 && <span className="pill p-red">{c.unread}</span>}</button>)}</div></Panel>
      <Panel title={ref || "Sélectionnez une conversation"} ic="msg">{ref && conv && conv.items && <div className="col" style={{ gap: 8 }}>
        <div className="col" style={{ gap: 8, maxHeight: 480, overflowY: "auto", padding: 4 }}>{conv.items.map(m => <div key={m.id} className={`bubble ${m.sender === "USER" ? "them" : "me"}`}>{m.kind === "file" ? <a href={api.fileUrl(m.file_url)} target="_blank" rel="noreferrer" style={{ color: "inherit" }}><Icon n="clip" s={12} /> {m.file_name}</a> : m.kind === "voice" ? <audio controls src={api.fileUrl(m.file_url)} className="audio" /> : m.body}<small>{m.sender === "USER" ? "Usager" : m.agent ? "Agent " + m.agent : "ID SECOURS"} · {fmtDT(m.created_at)}</small></div>)}</div>
        <div className="row"><input className="inp" placeholder="Votre réponse" value={text} onChange={e => setText(e.target.value)} onKeyDown={async e => { if (e.key === "Enter" && text.trim()) { await act(() => api.post(`/admin/messages/${ref}`, { text })); setText(""); } }} />
          <button className="btn green" disabled={!text.trim()} onClick={async () => { await act(() => api.post(`/admin/messages/${ref}`, { text })); setText(""); }}><Icon n="send" s={15} /> Envoyer</button></div></div>}</Panel>
    </div>
  </Page>;
}

export function SosMonitor() {
  const [d] = useData("/admin/sos", [], 5000);
  const [ref, setRef] = useState(null);
  const [det] = useData(ref ? `/admin/sos/${ref}` : "/admin/sos", [ref], ref ? 4000 : null);
  return <Page title="Alertes SOS" sub="Supervision des incidents réels (les tests sont exclus). Les incidents sous contrainte sont signalés ici uniquement.">
    <Panel><Table rows={d && d.items} empty="Aucune alerte." cols={[["Incident", r => <><b className="mono">#{r.ref}</b><div className="t-s">{fmtDT(r.created_at)}</div></>], ["Utilisateur", r => <>{r.prenom} {r.nom}<div className="t-s">{fmtTel(r.tel)}</div></>], ["Déclencheur", r => <>{TRIG[r.type]}{r.duress ? <> <P c="red">SOUS CONTRAINTE</P></> : null}</>],
      ["Dernière position", r => <span className="t-s">{r.pos || "Non partagée"}</span>], ["Statut", r => <P c={r.closed ? "grey" : "red"}>{r.status.replace(/_/g, " ")}</P>], ["", r => <div className="acts"><button className="btn sm ghost" onClick={() => setRef(r.ref)}>Journal</button></div>]]} /></Panel>
    {ref && det && det.log && <Modal title={`Incident #${ref}`} onClose={() => setRef(null)}>
      <div className="col" style={{ gap: 6 }}>{det.contacts.map((c, i) => <div key={i} className="row"><span className="pill p-dark">{i + 1}</span><span className="grow">{c.prenom} {c.nom} · {c.relation} · {fmtTel(c.tel)}</span><P c={(C_ST[c.status] || [])[1]}>{(C_ST[c.status] || [c.status])[0]}</P></div>)}</div>
      <div className="log" style={{ maxHeight: 320 }}>{det.log.map((l, i) => <div key={i}><span>{fmtT(l.created_at, true)}</span>{l.label}</div>)}</div>
      <div className="note n-orange"><Icon n="info" s={16} /><span>ID SECOURS ne prévient pas automatiquement les services officiels. Police 110 / 111 / 170 · Pompiers 180 · SAMU 185.</span></div></Modal>}
  </Page>;
}

export function Incidents() {
  const [d, reload] = useData("/admin/incidents");
  const [ag] = useData("/admin/agencies");
  const [f, setF] = useState(null), [rep, setRep] = useState(null);
  const act = useAct(reload);
  return <Page title="Incidents & amélioration continue" sub="Anomalies opérationnelles, partenaires, agences, sécurité · résolution par le Support technique" actions={<button className="btn sm red" onClick={() => setF({ titre: "", description: "", priorite: "NORMALE", dossier: "", agency: "" })}><Icon n="plus" s={14} /> Déclarer un incident</button>}>
    <Panel><Table rows={d && d.items} empty="Aucun incident." cols={[["Réf.", r => <span className="mono">{r.ref}</span>], ["Incident", r => <>{r.kind === "ASSISTANCE" && <P c="violet">Assistance agence · {r.categorie}</P>}<div><b>{r.titre}</b></div><div className="t-s">{r.description}</div>{r.reponse && <div className="t-s" style={{ color: "var(--green-d)" }}>Réponse : {r.reponse}</div>}</>], ["Agence", r => r.agence || "—"], ["Dossier", r => r.dossier_ref || "—"], ["Priorité", r => <P c={{ BASSE: "grey", NORMALE: "blue", HAUTE: "orange", CRITIQUE: "red" }[r.priorite]}>{r.priorite}</P>],
      ["Créé par", r => <>{r.prenom} {r.nom}<div className="t-s">{fmtDT(r.created_at)}</div></>], ["Statut", r => <select className="inp" style={{ minHeight: 34, width: "auto" }} value={r.statut} onChange={e => act(() => api.patch(`/admin/incidents/${r.ref}`, { statut: e.target.value }), "Statut mis à jour.")}>{["OUVERT", "EN COURS", "RÉSOLU", "CLÔTURÉ"].map(s => <option key={s}>{s}</option>)}</select>],
      ["", r => r.kind === "ASSISTANCE" ? <button className="btn sm ghost" onClick={() => setRep({ ref: r.ref, titre: r.titre, reponse: r.reponse || "", statut: r.statut === "OUVERT" ? "EN COURS" : r.statut })}><Icon n="send" s={13} /> Répondre</button> : null]]} /></Panel>
    {rep && <Modal title={`Répondre · ${rep.ref}`} onClose={() => setRep(null)}>
      <div className="t-s">{rep.titre}</div>
      <div className="field"><label>Réponse à l’agent</label><textarea className="inp" rows={4} value={rep.reponse} onChange={e => setRep({ ...rep, reponse: e.target.value })} /></div>
      <div className="field"><label>Statut</label><select className="inp" value={rep.statut} onChange={e => setRep({ ...rep, statut: e.target.value })}>{["OUVERT", "EN COURS", "RÉSOLU", "CLÔTURÉ"].map(s => <option key={s}>{s}</option>)}</select></div>
      <button className="btn red" disabled={!rep.reponse.trim()} onClick={async () => { if (await act(() => api.patch(`/admin/incidents/${rep.ref}`, { statut: rep.statut, reponse: rep.reponse }), "Réponse envoyée à l’agent.")) setRep(null); }}>Envoyer la réponse</button></Modal>}
    {f && <Modal title="Déclarer un incident" onClose={() => setF(null)}>
      <div className="field"><label>Titre</label><input className="inp" value={f.titre} onChange={e => setF({ ...f, titre: e.target.value })} /></div>
      <div className="field"><label>Description</label><textarea className="inp" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></div>
      <div className="grid2"><div className="field"><label>Priorité</label><select className="inp" value={f.priorite} onChange={e => setF({ ...f, priorite: e.target.value })}>{["BASSE", "NORMALE", "HAUTE", "CRITIQUE"].map(s => <option key={s}>{s}</option>)}</select></div><div className="field"><label>Dossier lié</label><input className="inp mono" value={f.dossier} onChange={e => setF({ ...f, dossier: e.target.value })} /></div></div>
      <div className="field"><label>Agence concernée (support aux agences)</label><select className="inp" value={f.agency} onChange={e => setF({ ...f, agency: e.target.value })}><option value="">—</option>{ag && ag.items.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}</select></div>
      <button className="btn red" onClick={async () => { if (await act(() => api.post("/admin/incidents", f), "Incident créé.")) setF(null); }}>Enregistrer</button></Modal>}
  </Page>;
}

export function Population() {
  const [q, setQ] = useState("");
  const [d, reload] = useData(`/admin/users?q=${encodeURIComponent(q)}`, [q]);
  const act = useAct(reload), { can } = useAdm();
  return <Page title="Utilisateurs (population)" sub="Grand public inscrit sur l’application" actions={<input className="inp" style={{ width: 280 }} placeholder="Nom ou téléphone" value={q} onChange={e => setQ(e.target.value)} />}>
    <Panel><Table rows={d && d.items} cols={[["Utilisateur", r => <b>{r.prenom} {r.nom}</b>], ["Téléphone", r => fmtTel(r.tel)], ["E-mail", r => r.email || "—"], ["Commune", r => r.commune || "—"], ["Documents", r => r.docs], ["Protections actives", r => r.prots], ["Portefeuille", r => <P c={PF[r.portefeuille][1]}>{PF[r.portefeuille][0]}</P>], ["Inscrit le", r => fmtD(r.created_at)],
      ["Statut", r => <P c={r.status === "ACTIF" ? "green" : "red"}>{r.status}</P>], ["", r => can("staff.manage") ? <div className="acts"><button className="btn sm ghost" onClick={() => act(() => api.patch(`/admin/users/${r.id}`, { status: r.status === "ACTIF" ? "SUSPENDU" : "ACTIF" }), "Statut mis à jour.")}>{r.status === "ACTIF" ? "Suspendre" : "Réactiver"}</button></div> : null]]} /></Panel>
  </Page>;
}

export function Performance() {
  const [d] = useData("/admin/performance", [], 30000);
  if (!d) return <Loading />;
  const s = d.services, h = v => v == null ? "—" : v + " h";
  return <Page title="Suivi des performances" sub="Coordination des services · suivi des agences et des partenaires · amélioration continue">
    <div className="kpis">
      <Kpi ic="alert" label="Déclarations en cours" value={s.declarations_ouvertes} color="var(--red)" bg="var(--red-s)" />
      <Kpi ic="truck" label="Collectes en cours (①②③)" value={s.collectes_en_cours} color="var(--green-d)" bg="var(--green-s)" />
      <Kpi ic="magnify" label={`Contrôles en attente (④) · délai moyen ${h(s.delai_controle_h)}`} value={s.controles_en_attente} />
      <Kpi ic="userShield" label={`Vérifications propriétaires · délai moyen ${h(s.delai_verification_h)}`} value={s.verifications_proprietaire} />
      <Kpi ic="warehouse" label="Réceptions en attente (⑤)" value={s.receptions_en_attente} color="var(--red)" bg="var(--red-s)" />
      <Kpi ic="hand" label="Restitutions en attente (⑥)" value={s.restitutions_en_attente} color="var(--green-d)" bg="var(--green-s)" />
      <Kpi ic="list" label="Incidents ouverts" value={s.incidents_ouverts} color="var(--orange)" bg="var(--orange-s)" />
    </div>
    <div className="grid-2">
      <Panel title="Performance des agences" ic="building"><Table rows={d.agencies} cols={[["Agence", r => <b>{r.nom}</b>], ["Réceptions", r => r.receptions], ["Stock", r => r.stock], ["Sans emplacement", r => r.sans_emplacement ? <P c="orange">{r.sans_emplacement}</P> : 0], ["Restitutions", r => r.restitutions], ["Délai moyen", r => h(r.delai_restitution_h)], ["Statut", r => <P c={r.status === "ACTIVE" ? "green" : "red"}>{r.status}</P>]]} /></Panel>
      <Panel title="Performance des partenaires de livraison" ic="moto"><Table rows={d.partners} cols={[["Partenaire", r => <b>{r.nom}</b>], ["Missions", r => r.missions], ["Collectées", r => +r.collectees || 0], ["Taux", r => r.missions ? Math.round((+r.collectees || 0) / r.missions * 100) + " %" : "—"], ["Délai moyen de collecte", r => h(r.delai_collecte_h)], ["Statut", r => <P c={r.status === "ACTIF" ? "green" : "red"}>{r.status}</P>]]} /></Panel>
    </div>
  </Page>;
}

export function ComPartners() {
  const [d, reload] = useData("/admin/com-partners");
  const [f, setF] = useState(null);
  const act = useAct(reload), { can } = useAdm();
  return <Page title="Partenariats commerciaux" sub="Distributeurs, établissements, entreprises : acquisition et fidélisation" actions={can("prospects.manage") && <button className="btn sm red" onClick={() => setF({ nom: "", type: "Revendeur", contact: "", tel: "", email: "", commission: "0", notes: "" })}><Icon n="plus" s={14} /> Nouveau partenaire</button>}>
    <Panel><Table rows={d && d.items} empty="Aucun partenariat." cols={[["Partenaire", r => <><b>{r.nom}</b><div className="t-s">{r.type}</div></>], ["Contact", r => <>{r.contact}<div className="t-s">{r.tel} {r.email}</div></>], ["Commission", r => `${+r.commission} %`], ["Notes", r => <span className="t-s">{r.notes}</span>],
      ["Statut", r => can("prospects.manage") ? <select className="inp" style={{ minHeight: 34, width: "auto" }} value={r.statut} onChange={e => act(() => api.patch(`/admin/com-partners/${r.id}`, { statut: e.target.value }), "Statut mis à jour.")}>{["PROSPECT", "ACTIF", "SUSPENDU", "TERMINÉ"].map(s => <option key={s}>{s}</option>)}</select> : <P>{r.statut}</P>]]} /></Panel>
    {f && <Modal title="Nouveau partenaire commercial" onClose={() => setF(null)}>
      {[["nom", "Raison sociale"], ["contact", "Contact"], ["tel", "Téléphone"], ["email", "E-mail"], ["commission", "Commission (%)"], ["notes", "Notes"]].map(([k, l]) => <div key={k} className="field"><label>{l}</label><input className="inp" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></div>)}
      <div className="field"><label>Type</label><select className="inp" value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>{["Revendeur", "Distributeur", "Établissement", "Entreprise", "Administration", "Association"].map(x => <option key={x}>{x}</option>)}</select></div>
      <button className="btn red" onClick={async () => { if (await act(() => api.post("/admin/com-partners", f), "Partenaire créé.")) setF(null); }}>Enregistrer</button></Modal>}
  </Page>;
}
