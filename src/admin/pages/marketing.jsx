/* Service commercial : opportunités & pipeline (§20–§23), campagnes & segments (§30–§33) */
import { useState } from "react";
import { adminApi as api } from "../../lib/api.js";
import Icon from "../../ui/Icon.jsx";
import { Page, Panel, Table, Modal, Kpi, P, useData, useAct, useAdm, Loading } from "../kit.jsx";
import { fmtD, fmtDT, fcfa } from "@shared/format.js";

const OPP = { NOUVEAU: ["Nouveau", "grey"], EN_CONTACT: ["En contact", "blue"], PROPOSITION: ["Proposition", "blue"], NEGOCIATION: ["Négociation", "orange"], EN_ATTENTE: ["En attente", "orange"], CONVERTI: ["Converti", "green"], PERDU: ["Perdu", "red"] };
const CMP = { A_VALIDER: ["À valider", "orange"], VALIDEE: ["Validée", "blue"], EN_COURS: ["En cours", "green"], TERMINEE: ["Terminée", "grey"], REFUSEE: ["Refusée", "red"], ANNULEE: ["Annulée", "grey"] };
const CANAUX = [["NOTIFICATION", "Notification dans l’application"], ["SMS", "SMS"], ["NOTIFICATION+SMS", "Notification + SMS"]];

export function Opportunities() {
  const { can } = useAdm();
  const [d, reload] = useData("/admin/opportunities");
  const [pr] = useData(can("prospects.manage") ? "/admin/prospects" : "/admin/opportunities");
  const [cp] = useData("/admin/com-partners");
  const [f, setF] = useState(null), [hist, setHist] = useState(null), [view, setView] = useState("pipeline");
  const act = useAct(reload);
  if (!d) return <Loading />;
  const s = d.stats;
  const setSt = (o, statut) => act(() => api.patch(`/admin/opportunities/${o.ref}`, { statut }), "Statut mis à jour · historisé.");
  const who = o => o.prospect ? `Prospect · ${o.prospect}` : o.client ? `Client · ${o.client}` : o.partenaire ? `Partenaire · ${o.partenaire}` : o.organisation || "—";
  return <Page title="Opportunités & pipeline" sub="Nouveau → En contact → Proposition → Négociation → Converti. Chaque changement de statut est historisé."
    actions={can("prospects.manage") && <button className="btn sm red" onClick={() => setF({ titre: "", type: "Particulier", organisation: "", offre: "", valeur: 0, prospect_id: "", com_partner_id: "", prochaine_action: "", prochaine_date: "", notes: "" })}><Icon n="plus" s={14} /> Créer une opportunité</button>}>
    <div className="kpis">
      <Kpi ic="list" label="Opportunités ouvertes" value={s.ouvertes} />
      <Kpi ic="check" label={`Conversions · taux ${s.taux} %`} value={s.conversions} color="var(--green-d)" bg="var(--green-s)" />
      <Kpi ic="x" label="Abandons" value={s.abandons} color="var(--red)" bg="var(--red-s)" />
      <Kpi ic="clock" label="Durée moyenne avant conversion" value={s.delai_moyen_j == null ? "—" : `${s.delai_moyen_j} j`} color="var(--orange)" bg="var(--orange-s)" />
    </div>
    <div className="chips">{[["pipeline", "Pipeline"], ["list", "Liste"]].map(([k, l]) => <button key={k} className={`chip ${view === k ? "on" : ""}`} onClick={() => setView(k)}>{l}</button>)}</div>
    {view === "pipeline" ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>{s.pipeline.map(col =>
      <div key={col.s} className="panel" style={{ padding: 10, margin: 0 }}>
        <div className="row" style={{ marginBottom: 8 }}><P c={OPP[col.s][1]}>{OPP[col.s][0]}</P><span className="grow" /><b>{col.n}</b></div>
        <div className="t-s" style={{ marginBottom: 8 }}>{fcfa(col.v)}</div>
        {d.items.filter(o => o.statut === col.s).map(o => <div key={o.ref} className="card" style={{ padding: 8, marginBottom: 6, fontSize: 13 }}>
          <b>{o.titre}</b><div className="t-s">{who(o)}</div>{o.prochaine_action && <div className="t-s">→ {o.prochaine_action}{o.prochaine_date ? ` · ${fmtD(o.prochaine_date)}` : ""}</div>}
          {o.inactif_j >= 10 && !["CONVERTI", "PERDU"].includes(o.statut) && <P c="orange">Sans activité · {o.inactif_j} j</P>}
          {can("prospects.manage") && <select className="inp" style={{ minHeight: 30, marginTop: 6, fontSize: 12 }} value={o.statut} onChange={e => setSt(o, e.target.value)}>{d.statuts.map(x => <option key={x} value={x}>{OPP[x][0]}</option>)}</select>}
        </div>)}</div>)}</div>
      : <Panel><Table rows={d.items} empty="Aucune opportunité." cols={[["Référence", r => <><span className="mono">{r.ref}</span><div className="t-s">{fmtD(r.created_at)}</div></>], ["Opportunité", r => <><b>{r.titre}</b><div className="t-s">{r.type} · {who(r)}</div></>],
        ["Offre / valeur", r => <>{r.offre || "—"}<div className="t-s">{fcfa(r.valeur)}</div></>], ["Prochaine action", r => r.prochaine_action ? <>{r.prochaine_action}<div className="t-s">{r.prochaine_date ? fmtD(r.prochaine_date) : ""}</div></> : "—"],
        ["Commercial", r => r.commercial], ["Statut", r => <P c={OPP[r.statut][1]}>{OPP[r.statut][0]}</P>], ["", r => <button className="btn sm ghost" onClick={() => setHist(r.ref)}>Historique</button>]]} /></Panel>}
    {f && <Modal title="Nouvelle opportunité" onClose={() => setF(null)}>
      <div className="field"><label>Intitulé</label><input className="inp" value={f.titre} onChange={e => setF({ ...f, titre: e.target.value })} placeholder="Ex. : Pack étudiants Université de Cocody" /></div>
      <div className="grid-2"><div className="field"><label>Type</label><select className="inp" value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>{["Particulier", "Entreprise", "Partenariat", "Opération commerciale"].map(x => <option key={x}>{x}</option>)}</select></div>
        <div className="field"><label>Offre concernée</label><select className="inp" value={f.offre} onChange={e => setF({ ...f, offre: e.target.value })}><option value="">—</option>{["Protection individuelle", "Pack", "STANDARD", "ESSENTIEL", "VIP", "VVIP", "Offre entreprise"].map(x => <option key={x}>{x}</option>)}</select></div></div>
      <div className="t-label">Rattachement (obligatoire)</div>
      <div className="grid-2"><div className="field"><label>Prospect</label><select className="inp" value={f.prospect_id} onChange={e => setF({ ...f, prospect_id: e.target.value })}><option value="">—</option>{((pr && pr.items) || []).filter(p => p.nom).map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}</select></div>
        <div className="field"><label>Partenaire commercial</label><select className="inp" value={f.com_partner_id} onChange={e => setF({ ...f, com_partner_id: e.target.value })}><option value="">—</option>{((cp && cp.items) || []).map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}</select></div></div>
      <div className="field"><label>… ou organisation</label><input className="inp" value={f.organisation} onChange={e => setF({ ...f, organisation: e.target.value })} /></div>
      <div className="grid-2"><div className="field"><label>Valeur estimée (FCFA)</label><input className="inp" type="number" min="0" value={f.valeur} onChange={e => setF({ ...f, valeur: e.target.value })} /></div>
        <div className="field"><label>Date de la prochaine action</label><input className="inp" type="date" value={f.prochaine_date} onChange={e => setF({ ...f, prochaine_date: e.target.value })} /></div></div>
      <div className="field"><label>Prochaine action</label><input className="inp" value={f.prochaine_action} onChange={e => setF({ ...f, prochaine_action: e.target.value })} /></div>
      <div className="field"><label>Notes (aucune donnée de document d’identité)</label><input className="inp" value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
      <button className="btn red" onClick={async () => { if (await act(() => api.post("/admin/opportunities", f), "Opportunité créée.")) setF(null); }}>Enregistrer</button></Modal>}
    {hist && <OppHistory refId={hist} onClose={() => setHist(null)} />}
  </Page>;
}
function OppHistory({ refId, onClose }) {
  const [d] = useData(`/admin/opportunities/${refId}/history`);
  return <Modal title={`Historique · ${refId}`} onClose={onClose}>{!d ? <Loading /> : <div className="log">{d.items.map(x => <div key={x.id}><span>{fmtDT(x.created_at)}</span>{x.from_st ? `${OPP[x.from_st][0]} → ` : "Création · "}{OPP[x.to_st][0]} · {x.agent}{x.motif ? ` · ${x.motif}` : ""}</div>)}</div>}</Modal>;
}

export function Campaigns() {
  const { can, staff } = useAdm();
  const [d, reload] = useData("/admin/campaigns");
  const [seg] = useData("/admin/segments");
  const [f, setF] = useState(null), [refuse, setRefuse] = useState(null);
  const act = useAct(reload);
  if (!d) return <Loading />;
  const today = new Date().toISOString().slice(0, 10);
  const segLabel = c => ((seg && seg.items.find(s => s.code === c)) || { label: c }).label;
  return <Page title="Campagnes & segments" sub="Une campagne est validée par la Direction (autre agent que son auteur) avant lancement ; chaque envoi est tracé."
    actions={can("prospects.manage") && <button className="btn sm red" onClick={() => setF({ nom: "", objectif: "", segment: "EXPIRANT", offre: "", canal: "NOTIFICATION", message: "", date_debut: today, date_fin: today, budget: 0 })}><Icon n="mega" s={14} /> Lancer une campagne</button>}>
    <Panel title="Segments clients" ic="users" right={<span className="t-s">critères non sensibles · aucune donnée documentaire</span>}>
      {!seg ? <Loading /> : <div className="kpis">{seg.items.map(s => <Kpi key={s.code} ic="users" label={s.label} value={s.n} color="var(--blue-d)" bg="var(--blue-s)" />)}</div>}</Panel>
    <Panel title="Campagnes" ic="mega"><Table rows={d.items} empty="Aucune campagne." cols={[
      ["Campagne", r => <><b>{r.nom}</b><div className="t-s mono">{r.ref}</div></>], ["Cible", r => <>{segLabel(r.segment)}<div className="t-s">{r.canal.replace("+", " + ")}{r.offre ? ` · ${r.offre}` : ""}</div></>],
      ["Période", r => <>{fmtD(r.date_debut)} → {fmtD(r.date_fin)}<div className="t-s">Budget {fcfa(r.budget)}</div></>],
      ["Résultats", r => r.launched_at ? <><b>{r.cibles}</b> ciblé(s) · <b>{r.conversions}</b> souscription(s)<div className="t-s">Taux {r.taux} % · CA attribuable {fcfa(r.ca)}</div></> : <span className="t-s">Non lancée</span>],
      ["Validation", r => <div className="t-s">Par {r.auteur}{r.valideur && <><br />{r.statut === "REFUSEE" ? "Refusée" : "Validée"} par {r.valideur}</>}{r.motif && <><br />{r.motif}</>}</div>],
      ["Statut", r => <P c={CMP[r.statut][1]}>{CMP[r.statut][0]}</P>],
      ["", r => <div className="acts">
        {r.statut === "A_VALIDER" && can("campaigns.validate") && r.created_by !== staff.id && <><button className="btn sm green" onClick={() => act(() => api.post(`/admin/campaigns/${r.ref}/decision`, { approve: true }), "Campagne validée.")}>Valider</button><button className="btn sm ghost" onClick={() => setRefuse({ ref: r.ref, motif: "" })}>Refuser</button></>}
        {r.statut === "VALIDEE" && can("prospects.manage") && <button className="btn sm red" onClick={() => window.confirm(`Lancer ${r.ref} vers « ${segLabel(r.segment)} » ?`) && act(async () => { const x = await api.post(`/admin/campaigns/${r.ref}/launch`); return x; }, "Campagne lancée · envois tracés.")}>Lancer</button>}
        {["A_VALIDER", "VALIDEE", "EN_COURS"].includes(r.statut) && <button className="btn sm ghost" onClick={() => act(() => api.post(`/admin/campaigns/${r.ref}/cancel`), "Campagne close.")}>{r.statut === "EN_COURS" ? "Terminer" : "Annuler"}</button>}</div>]]} /></Panel>
    {f && <Modal title="Nouvelle campagne" onClose={() => setF(null)}>
      <div className="field"><label>Nom</label><input className="inp" value={f.nom} onChange={e => setF({ ...f, nom: e.target.value })} /></div>
      <div className="field"><label>Objectif</label><input className="inp" value={f.objectif} onChange={e => setF({ ...f, objectif: e.target.value })} placeholder="Ex. : renouveler 60 % des protections expirant ce mois" /></div>
      <div className="grid-2"><div className="field"><label>Segment ciblé</label><select className="inp" value={f.segment} onChange={e => setF({ ...f, segment: e.target.value })}>{((seg && seg.items) || []).map(s => <option key={s.code} value={s.code}>{s.label} ({s.n})</option>)}</select></div>
        <div className="field"><label>Canal</label><select className="inp" value={f.canal} onChange={e => setF({ ...f, canal: e.target.value })}>{CANAUX.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div></div>
      <div className="grid-2"><div className="field"><label>Offre associée</label><select className="inp" value={f.offre} onChange={e => setF({ ...f, offre: e.target.value })}><option value="">—</option>{["Protection individuelle", "Pack", "STANDARD", "ESSENTIEL", "VIP", "VVIP"].map(x => <option key={x}>{x}</option>)}</select></div>
        <div className="field"><label>Budget (FCFA)</label><input className="inp" type="number" min="0" value={f.budget} onChange={e => setF({ ...f, budget: e.target.value })} /></div></div>
      <div className="grid-2"><div className="field"><label>Début</label><input className="inp" type="date" value={f.date_debut} onChange={e => setF({ ...f, date_debut: e.target.value })} /></div>
        <div className="field"><label>Fin</label><input className="inp" type="date" value={f.date_fin} onChange={e => setF({ ...f, date_fin: e.target.value })} /></div></div>
      <div className="field"><label>Message ({f.message.length}/320)</label><textarea className="inp" rows={3} maxLength={320} value={f.message} onChange={e => setF({ ...f, message: e.target.value })} /></div>
      <button className="btn red" onClick={async () => { if (await act(() => api.post("/admin/campaigns", f), "Campagne soumise à validation.")) setF(null); }}>Soumettre à validation</button></Modal>}
    {refuse && <Modal title={`Refuser ${refuse.ref}`} onClose={() => setRefuse(null)}><div className="field"><label>Motif (obligatoire)</label><input className="inp" value={refuse.motif} onChange={e => setRefuse({ ...refuse, motif: e.target.value })} /></div>
      <button className="btn red" onClick={async () => { if (await act(() => api.post(`/admin/campaigns/${refuse.ref}/decision`, { approve: false, motif: refuse.motif }), "Campagne refusée.")) setRefuse(null); }}>Refuser</button></Modal>}
  </Page>;
}
