/* Super Admin : carte des agences (§29), sauvegardes (§56), indicateur d'état du système (§6),
   filtres du tableau de bord par période / agence / ville (§60) */
import { useEffect, useState } from "react";
import { adminApi as api, storage } from "../../lib/api.js";
import Icon from "../../ui/Icon.jsx";
import { Page, Panel, Table, Modal, Kpi, P, HBars, useData, useAct, useAdm, Loading } from "../kit.jsx";
import { COMMUNES, COORDS } from "@shared/constants.js";
import { fmtDT, fcfa } from "@shared/format.js";

export const AG_ST = { ACTIVE: ["Active", "green", "#13A043"], TEMPORAIREMENT_INDISPONIBLE: ["Temporairement indisponible", "orange", "#F28C12"], SUSPENDUE: ["Suspendue", "red", "#E3141B"] };

/* carte schématique d'Abidjan : projection des coordonnées GPS des agences, communes en repère */
export function AgencyMap({ items, height = 300, onPick }) {
  const pts = Object.values(COORDS).concat(items.filter(a => a.lat && a.lng).map(a => [+a.lat, +a.lng]));
  const la = pts.map(p => p[0]), ln = pts.map(p => p[1]);
  const [minLa, maxLa, minLn, maxLn] = [Math.min(...la) - .02, Math.max(...la) + .02, Math.min(...ln) - .03, Math.max(...ln) + .03];
  const W = 600, H = 300, x = g => (g - minLn) / (maxLn - minLn) * W, y = g => H - (g - minLa) / (maxLa - minLa) * H;
  return <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--line)" }}>
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height, display: "block", background: "#E6EDE3" }} role="img" aria-label="Carte des agences">
      <path d={`M0 ${y(5.30)} C ${x(-4.1)} ${y(5.28)} ${x(-4.0)} ${y(5.33)} ${x(-3.95)} ${y(5.30)} S ${x(-3.9)} ${y(5.27)} ${W} ${y(5.28)} V${H} H0Z`} fill="#BFDDF3" />
      {Object.entries(COORDS).map(([c, [a, b]]) => <text key={c} x={x(b)} y={y(a) + 4} textAnchor="middle" fontSize="11" fill="#6A7570" style={{ fontWeight: 600 }}>{c}</text>)}
      {items.filter(a => a.lat && a.lng).map(a => { const [, , col] = AG_ST[a.status] || AG_ST.ACTIVE; return <g key={a.id} transform={`translate(${x(+a.lng)},${y(+a.lat) - 12})`} style={{ cursor: onPick ? "pointer" : "default" }} onClick={() => onPick && onPick(a)}>
        <title>{`${a.nom} · ${(AG_ST[a.status] || AG_ST.ACTIVE)[0]}${a.stock != null ? ` · ${a.stock} document(s) en stock` : ""}`}</title>
        <path d="M0 14 C-9 2 -9 -8 0 -8 C9 -8 9 2 0 14Z" fill={col} stroke="#fff" strokeWidth="2" /><circle r="3" cy="-1" fill="#fff" /></g>; })}
    </svg>
    <div className="row" style={{ padding: "8px 12px", gap: 14, flexWrap: "wrap", background: "var(--card)" }}>{Object.entries(AG_ST).map(([k, [l, , c]]) => <span key={k} className="t-s row" style={{ gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 5, background: c, display: "inline-block" }} />{l} · {items.filter(a => a.status === k).length}</span>)}<span className="t-s">· {items.length} agence(s) au total</span></div>
  </div>;
}

/* badge d'état du système (barre supérieure) */
export function SystemBadge() {
  const [d, setD] = useState(null), [open, setOpen] = useState(false);
  useEffect(() => { const load = () => api.get("/admin/system-status").then(setD).catch(() => {}); load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);
  if (!d) return null;
  const [l, c] = { OPERATIONNEL: ["Système opérationnel", "green"], PERTURBE: ["Service partiellement perturbé", "orange"], INCIDENT_MAJEUR: ["Incident majeur", "red"] }[d.level];
  return <div style={{ position: "relative" }}><button className={`pill p-${c} sys-badge`} style={{ cursor: "pointer", padding: "6px 10px" }} onClick={() => setOpen(!open)} aria-label={l} title={l}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: "currentColor", marginRight: 6 }} /><span className="sb-txt">{l}</span></button>
    {open && <div className="panel bell-pop" style={{ position: "absolute", right: 0, top: 38, width: 320, zIndex: 60, boxShadow: "0 16px 40px rgba(0,0,0,.18)" }}>
      <b>{l}</b>{d.reasons.length ? (d.details ? <ul className="t-s" style={{ margin: "8px 0 0", paddingLeft: 18 }}>{d.reasons.map(r => <li key={r}>{r}</li>)}</ul> : <div className="t-s">Contactez le Support technique.</div>) : <div className="t-s">Aucune anomalie détectée.</div>}</div>}</div>;
}

/* filtres globaux du tableau de bord + activité de la période */
const iso = d => d.toISOString().slice(0, 10);
const PERIODS = { jour: ["Aujourd’hui", () => [iso(new Date()), iso(new Date())]], semaine: ["Cette semaine", () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return [iso(d), iso(new Date())]; }],
  mois: ["Ce mois", () => { const d = new Date(); return [iso(new Date(d.getFullYear(), d.getMonth(), 1)), iso(d)]; }], annee: ["Cette année", () => [`${new Date().getFullYear()}-01-01`, iso(new Date())]], perso: ["Période personnalisée", null] };
export function PeriodPanel() {
  const [p, setP] = useState(() => storage.get("ids_dash_period") || "mois"), [from, setFrom] = useState(""), [to, setTo] = useState("");
  const [agency, setAgency] = useState(""), [commune, setCommune] = useState("");
  const [ag] = useData("/admin/agencies");
  const [f, t] = p === "perso" ? [from, to] : PERIODS[p][1]();
  const [d] = useData(`/admin/dashboard/period?from=${f}&to=${t}&agency=${agency}&commune=${encodeURIComponent(commune)}`, [f, t, agency, commune]);
  const k = d && d.kpi;
  return <Panel title="Activité sur la période" ic="chartUp" right={<span className="t-s">{f && t ? `${f} → ${t}` : ""}</span>}>
    <div className="filters" style={{ marginBottom: 10 }}>
      <select className="inp" value={p} onChange={e => { setP(e.target.value); storage.set("ids_dash_period", e.target.value); }}>{Object.entries(PERIODS).map(([v, [l]]) => <option key={v} value={v}>{l}</option>)}</select>
      {p === "perso" && <><input className="inp" type="date" value={from} onChange={e => setFrom(e.target.value)} aria-label="Du" /><input className="inp" type="date" value={to} onChange={e => setTo(e.target.value)} aria-label="Au" /></>}
      <select className="inp" value={agency} onChange={e => { setAgency(e.target.value); setCommune(""); }}><option value="">Toutes les agences</option>{((ag && ag.items) || []).map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}</select>
      <select className="inp" value={commune} onChange={e => { setCommune(e.target.value); setAgency(""); }}><option value="">Toutes les villes / communes</option>{COMMUNES.map(c => <option key={c}>{c}</option>)}</select>
    </div>
    {!k ? <Loading /> : <div className="kpis">
      <Kpi ic="users" label="Inscriptions" value={k.inscriptions} /><Kpi ic="shield" label="Nouvelles protections" value={k.protections} color="var(--green-d)" bg="var(--green-s)" />
      <Kpi ic="alert" label="Déclarations de perte" value={k.declarations} color="var(--red)" bg="var(--red-s)" /><Kpi ic="hand" label="Signalements (trouvés)" value={k.signalements} color="var(--orange)" bg="var(--orange-s)" />
      <Kpi ic="warehouse" label="Réceptions en agence" value={k.receptions} color="var(--ink)" bg="var(--soft)" /><Kpi ic="check" label="Restitutions" value={k.restitutions} color="var(--green-d)" bg="var(--green-s)" />
      <Kpi ic="list" label="Incidents" value={k.incidents} />{k.revenus != null && <Kpi ic="money" label={k.revenusAgence ? "Revenus encaissés en agence" : "Revenus"} value={fcfa(k.revenus)} color="var(--green-d)" bg="var(--green-s)" />}
    </div>}
  </Panel>;
}

/* support aux agences (organigramme) : un agent demande l'aide du Support technique et suit la réponse */
export const INC_ST = { OUVERT: "orange", "EN COURS": "blue", "RÉSOLU": "green", "CLÔTURÉ": "grey" };
export function Assistance() {
  const { staff } = useAdm();
  const [d, reload] = useData("/admin/assistance", [], 30000);
  const [f, setF] = useState(null), [rate, setRate] = useState(null);
  const act = useAct(reload);
  if (!d) return <Loading />;
  return <Page title="Demander de l’aide" sub={`Support technique · assistance aux agences${staff.agency ? " · " + staff.agency : ""}`}
    actions={<button className="btn sm red" onClick={() => setF({ categorie: d.categories[0], titre: "", description: "", priorite: "NORMALE", dossier: "" })}><Icon n="plus" s={14} /> Nouvelle demande</button>}>
    <Panel title="Mes demandes" ic="headset"><Table rows={d.items} empty="Aucune demande d’assistance." cols={[["Réf.", r => <><span className="mono">{r.ref}</span><div className="t-s">{fmtDT(r.created_at)}</div></>],
      ["Demande", r => <><b>{r.titre}</b><div className="t-s">{r.categorie} · {r.description}</div>{r.dossier_ref && <div className="t-s mono">Dossier {r.dossier_ref}</div>}</>],
      ["Priorité", r => <P c={{ BASSE: "grey", NORMALE: "blue", HAUTE: "orange", CRITIQUE: "red" }[r.priorite]}>{r.priorite}</P>], ["Statut", r => <P c={INC_ST[r.statut]}>{r.statut}</P>],
      ["Réponse du Support", r => r.reponse ? <><span>{r.reponse}</span><div className="t-s">{r.repondant} · {fmtDT(r.repondu_at)}</div></> : <span className="t-s">En attente</span>],
      ["Votre avis", r => r.avis ? <span title={`${r.avis}/5`} style={{ color: "#F5B301", fontSize: 16 }}>{"★".repeat(r.avis)}<span style={{ color: "var(--line)" }}>{"★".repeat(5 - r.avis)}</span></span>
        : ["RÉSOLU", "CLÔTURÉ"].includes(r.statut) ? <button className="btn sm ghost" onClick={() => setRate({ ref: r.ref, titre: r.titre, note: 0, commentaire: "" })}><Icon n="star" s={13} /> Évaluer</button> : <span className="t-s">—</span>]]} /></Panel>
    <div className="note n-blue"><Icon n="info" s={16} /><span>Votre demande est transmise au Support technique avec votre agence. Vous êtes notifié (cloche) dès qu’une réponse est apportée ou que le statut change.</span></div>
    {rate && <Modal title={`Évaluer l’assistance · ${rate.ref}`} onClose={() => setRate(null)}>
      <div className="t-s">{rate.titre}</div>
      <StarPick value={rate.note} onChange={note => setRate({ ...rate, note })} />
      <textarea className="inp" rows={3} placeholder="Commentaire (facultatif)" value={rate.commentaire} onChange={e => setRate({ ...rate, commentaire: e.target.value })} />
      <button className="btn red" disabled={!rate.note} onClick={async () => { if (await act(() => api.post(`/admin/assistance/${rate.ref}/feedback`, rate), "Merci ! Votre avis a été transmis au Support.")) setRate(null); }}>Envoyer mon avis</button></Modal>}
    {f && <Modal title="Nouvelle demande d’assistance" onClose={() => setF(null)}>
      <div className="field"><label>Catégorie</label><select className="inp" value={f.categorie} onChange={e => setF({ ...f, categorie: e.target.value })}>{d.categories.map(c => <option key={c}>{c}</option>)}</select></div>
      <div className="field"><label>Objet</label><input className="inp" value={f.titre} onChange={e => setF({ ...f, titre: e.target.value })} placeholder="Ex. : le scanner de QR ne fonctionne plus" /></div>
      <div className="field"><label>Description</label><textarea className="inp" rows={4} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></div>
      <div className="grid-2"><div className="field"><label>Urgence</label><select className="inp" value={f.priorite} onChange={e => setF({ ...f, priorite: e.target.value })}>{[["BASSE", "Basse"], ["NORMALE", "Normale"], ["HAUTE", "Haute"], ["CRITIQUE", "Critique (service bloqué)"]].map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div className="field"><label>Dossier lié (facultatif)</label><input className="inp mono" value={f.dossier} onChange={e => setF({ ...f, dossier: e.target.value })} placeholder="IDS-…" /></div></div>
      <button className="btn red" disabled={!f.titre.trim() || !f.description.trim()} onClick={async () => { if (await act(() => api.post("/admin/assistance", f), "Demande envoyée au Support technique.")) setF(null); }}>Envoyer</button></Modal>}
  </Page>;
}

const NOTE_L = ["", "Très insatisfait", "Insatisfait", "Correct", "Satisfait", "Très satisfait"];
export function StarPick({ value, onChange }) {
  return <div style={{ textAlign: "center" }}><div className="row" style={{ gap: 4, justifyContent: "center" }}>{[1, 2, 3, 4, 5].map(n => <button key={n} type="button" aria-label={`${n} étoile(s)`} onClick={() => onChange(n)}
    style={{ background: "none", border: 0, cursor: "pointer", fontSize: 30, lineHeight: 1, color: n <= value ? "#F5B301" : "var(--line)" }}>★</button>)}</div><div className="t-s" style={{ minHeight: 18 }}>{NOTE_L[value]}</div></div>;
}
const Stars = ({ n }) => <span title={`${n}/5`} style={{ color: "#F5B301", whiteSpace: "nowrap" }}>{"★".repeat(n)}<span style={{ color: "var(--line)" }}>{"★".repeat(5 - n)}</span></span>;
const avgC = a => a == null ? "var(--muted)" : a >= 4 ? "var(--green-d)" : a >= 3 ? "var(--orange)" : "var(--red)";

/* satisfaction des usagers et des agents (amélioration continue) */
export function Satisfaction() {
  const [days, setDays] = useState(90), [ctx, setCtx] = useState("");
  const [d] = useData(`/admin/feedback?days=${days}&context=${ctx}`, [days, ctx]);
  if (!d) return <Loading />;
  const t = d.total, by = k => d.byContext.find(x => x.context === k);
  return <Page title="Avis & satisfaction" sub="Notes laissées après chaque étape terminée : restitution, livraison, collecte et assistance aux agences · une note de 1 ou 2 alerte le pilotage">
    <div className="filters"><select className="inp" value={days} onChange={e => setDays(+e.target.value)}>{[[30, "30 derniers jours"], [90, "90 derniers jours"], [365, "12 derniers mois"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      <select className="inp" value={ctx} onChange={e => setCtx(e.target.value)}><option value="">Toutes les étapes</option>{Object.entries(d.contexts).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
    <div className="kpis">
      <Kpi ic="star" label={`Note moyenne · ${t.n} avis`} value={t.avg != null ? `${t.avg} / 5` : "—"} color={avgC(t.avg)} bg="var(--soft)" />
      <Kpi ic="check" label="Usagers satisfaits (4–5 ★)" value={t.satisfaction != null ? t.satisfaction + " %" : "—"} color="var(--green-d)" bg="var(--green-s)" />
      <Kpi ic="alert" label="Avis négatifs (1–2 ★)" value={t.mecontents} color="var(--red)" bg="var(--red-s)" />
      {Object.entries(d.contexts).map(([k, l]) => { const x = by(k); return <Kpi key={k} ic={{ RESTITUTION: "hand", LIVRAISON: "truck", COLLECTE: "moto", ASSISTANCE: "headset" }[k]} label={`${l} · ${x ? x.n : 0} avis`} value={x ? `${x.avg} / 5` : "—"} color={avgC(x && x.avg)} bg="var(--soft)" />; })}
    </div>
    <div className="grid-2">
      <Panel title="Par agence" ic="building">{d.byAgency.length ? <HBars data={d.byAgency.map(x => ({ l: `${x.l} (${x.n})`, v: +x.avg }))} color="#1A7EE0" /> : <div className="t-s">Aucun avis.</div>}</Panel>
      <Panel title="Par partenaire de livraison" ic="moto">{d.byPartner.length ? <HBars data={d.byPartner.map(x => ({ l: `${x.l} (${x.n})`, v: +x.avg }))} color="#7C3AED" /> : <div className="t-s">Aucun avis.</div>}</Panel>
    </div>
    <Panel title="Répartition des notes" ic="chart"><HBars data={[5, 4, 3, 2, 1].map(n => ({ l: `${n} ★ · ${NOTE_L[n]}`, v: +((d.dist.find(x => x.note === n) || {}).n || 0) }))} color="#F5B301" /></Panel>
    <Panel title="Derniers avis" ic="msg"><Table rows={d.items} empty="Aucun avis sur la période." cols={[["Date", r => fmtDT(r.created_at)], ["Étape", r => <>{d.contexts[r.context]}<div className="t-s mono">{r.ref}</div></>],
      ["Note", r => <Stars n={r.note} />], ["Commentaire", r => r.commentaire ? <span>« {r.commentaire} »</span> : <span className="t-s">—</span>],
      ["Agence / partenaire", r => <>{r.agence || "—"}{r.partner && <div className="t-s">{r.partner}</div>}</>], ["Auteur", r => r.agent ? `Agent · ${r.agent}` : r.prenom ? `${r.prenom} ${r.ini}.` : "Usager sans compte"]]} /></Panel>
  </Page>;
}

export function Backups() {
  const { can } = useAdm();
  const [d, reload] = useData("/admin/backups");
  const [busy, setBusy] = useState(false);
  const act = useAct(reload);
  if (!d) return <Loading />;
  const last = d.items.find(b => b.status === "REUSSIE");
  const run = async () => { setBusy(true); await act(() => api.post("/admin/backups"), "Sauvegarde réalisée."); setBusy(false); };
  const download = async b => { try { const r = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/admin/backups/${b.id}/download`, { headers: { Authorization: `Bearer ${api.getToken()}` } }); if (!r.ok) throw new Error((await r.json()).error); const u = URL.createObjectURL(await r.blob()); Object.assign(document.createElement("a"), { href: u, download: b.file }).click(); URL.revokeObjectURL(u); } catch (e) { act(() => Promise.reject(e)); } };
  return <Page title="Sauvegardes" sub="Export complet de la base (structure et données), compressé et conservé hors du serveur web." actions={<button className="btn sm red" disabled={busy} onClick={run}>{busy ? <span className="spin-inline" /> : <Icon n="server" s={14} />} Sauvegarder maintenant</button>}>
    <div className="kpis">
      <Kpi ic="clock" label="Dernière sauvegarde réussie" value={last ? fmtDT(last.created_at) : "Aucune"} color={last ? "var(--green-d)" : "var(--red)"} bg={last ? "var(--green-s)" : "var(--red-s)"} />
      <Kpi ic="server" label="Taille" value={last ? `${last.size_kb} Ko` : "—"} /><Kpi ic="refresh" label="Sauvegarde automatique" value={d.autoH ? `toutes les ${d.autoH} h` : "désactivée"} color="var(--ink)" bg="var(--soft)" />
      <Kpi ic="list" label="Fichiers conservés (rotation)" value={d.keep} color="var(--ink)" bg="var(--soft)" />
    </div>
    <Panel title="Historique" ic="list"><Table rows={d.items} empty="Aucune sauvegarde." cols={[["Date", r => fmtDT(r.created_at)], ["Type", r => r.kind === "AUTO" ? "Automatique" : `Manuelle · ${r.agent || ""}`],
      ["Contenu", r => r.tables_n ? `${r.tables_n} tables · ${r.rows_n} lignes` : "—"], ["Taille", r => r.size_kb ? `${r.size_kb} Ko` : "—"],
      ["Statut", r => <><P c={{ REUSSIE: "green", ECHEC: "red", EN_COURS: "blue" }[r.status]}>{{ REUSSIE: "Réussie", ECHEC: "Échec", EN_COURS: "En cours" }[r.status]}</P>{r.error && <div className="t-s">{r.error}</div>}{r.status === "REUSSIE" && !r.file && <div className="t-s">Fichier supprimé (rotation)</div>}</>],
      ["", r => d.canDownload && r.file ? <button className="btn sm ghost" onClick={() => download(r)}><Icon n="download" s={13} /> Télécharger</button> : null]]} /></Panel>
    <div className="note n-blue"><Icon n="info" s={16} /><span>Restauration : décompresser le fichier (.sql.gz) puis l’importer dans MySQL (<span className="mono">mysql db_idsecours &lt; fichier.sql</span>). Périodicité et nombre de fichiers conservés : Paramètres système (backup_auto_h, backup_keep). Le téléchargement, réservé au Super Admin, est journalisé.</span></div>
    {!can("staff.manage") && <p className="t-s">Le téléchargement des fichiers est réservé au Super Admin.</p>}
  </Page>;
}
