/* Composants du back-office */
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import Icon from "../ui/Icon.jsx";
import { adminApi } from "../lib/api.js";

export const AdmCtx = createContext(null);
export const useAdm = () => useContext(AdmCtx);

export function useData(path, deps = [], poll) {
  const { toast } = useAdm();
  const [data, setData] = useState(null);
  const load = useCallback(() => adminApi.get(path).then(setData).catch(e => toast(e.message, "alert")), [path, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); if (!poll) return; const t = setInterval(load, poll); return () => clearInterval(t); }, [load, poll]);
  return [data, load];
}

export const Page = ({ title, sub, actions, children }) => <>
  <div className="adm-h"><div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>{actions && <div className="act">{actions}</div>}</div>{children}
</>;
export const Panel = ({ title, ic, children, right, style }) => <div className="panel" style={style}>{title && <h3>{ic && <Icon n={ic} s={16} />}{title}<span style={{ marginLeft: "auto" }}>{right}</span></h3>}{children}</div>;
export const Kpi = ({ ic, label, value, color = "var(--blue)", bg = "var(--blue-s)" }) => <div className="kpi"><span className="ic" style={{ background: bg, color }}><Icon n={ic} s={18} /></span><div><b>{value ?? "—"}</b><span>{label}</span></div></div>;
export const P = ({ c = "grey", children }) => <span className={`pill p-${c}`}>{children}</span>;
export const Loading = () => <div className="loading"><div className="spinner" /></div>;

export function Table({ cols, rows, empty = "Aucune donnée.", keyf = (r, i) => r.id || r.ref || i }) {
  if (!rows) return <Loading />;
  if (!rows.length) return <div className="empty">{empty}</div>;
  return <div className="tbl-wrap"><table className="tbl"><thead><tr>{cols.map(c => <th key={c[0]} style={c[2]}>{c[0]}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={keyf(r, i)}>{cols.map(c => <td key={c[0]} style={c[2]}>{c[1](r)}</td>)}</tr>)}</tbody></table></div>;
}

export function Modal({ title, children, onClose }) {
  useEffect(() => { const k = e => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return <div className="modal-bg" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className="modal" role="dialog" aria-modal="true" aria-label={title}>
    <div className="row"><h3 className="grow">{title}</h3><button className="iconbtn" onClick={onClose} aria-label="Fermer"><Icon n="x" s={16} /></button></div>{children}</div></div>;
}

/* action avec retour visuel + rechargement */
export function useAct(reload) {
  const { toast } = useAdm();
  return async (fn, ok) => { try { await fn(); if (ok) toast(ok); reload && reload(); return true; } catch (e) { toast(e.message, "alert"); return false; } };
}

/* barres verticales (une série, une teinte) avec info-bulle native */
export function Bars({ data, color = "#1A7EE0", fmt = v => v }) {
  const max = Math.max(1, ...data.map(d => d.v));
  return <div><div className="bars" style={{ "--c": color }} role="img" aria-label={data.map(d => `${d.l} : ${fmt(d.v)}`).join(", ")}>
    {data.map(d => <div key={d.l} className="b" title={`${d.l} : ${fmt(d.v)}`}><em>{fmt(d.v)}</em><i style={{ height: `${(d.v / max) * 82}%` }} /></div>)}</div>
    <div className="bars-x">{data.map(d => <span key={d.l}>{d.l}</span>)}</div></div>;
}
export function HBars({ data, color = "#13A043" }) {
  const max = Math.max(1, ...data.map(d => d.v));
  return <div className="hbars" style={{ "--c": color }}>{data.map(d => <div key={d.l} className="r" title={`${d.l} : ${d.v}`}><span>{d.l}</span><div className="t"><i style={{ width: `${(d.v / max) * 100}%` }} /></div><b>{d.v}</b></div>)}</div>;
}

/* signature sur écran (doigt, stylet ou souris) — Réception §54 */
export function SignaturePad({ onChange, height = 160 }) {
  const ref = useRef(null), drawing = useRef(false), drawn = useRef(false);
  useEffect(() => { const c = ref.current, r = c.getBoundingClientRect(); c.width = r.width * 2; c.height = height * 2; const x = c.getContext("2d"); x.scale(2, 2); x.lineWidth = 2.2; x.lineCap = "round"; x.strokeStyle = "#16201B"; }, [height]);
  const pos = e => { const r = ref.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const down = e => { e.preventDefault(); ref.current.setPointerCapture(e.pointerId); drawing.current = true; const x = ref.current.getContext("2d"); x.beginPath(); x.moveTo(...pos(e)); };
  const move = e => { if (!drawing.current) return; const x = ref.current.getContext("2d"); x.lineTo(...pos(e)); x.stroke(); drawn.current = true; };
  const up = () => { if (!drawing.current) return; drawing.current = false; if (drawn.current) ref.current.toBlob(b => onChange(b && new File([b], "signature.png", { type: "image/png" })), "image/png"); };
  const clear = () => { const c = ref.current; c.getContext("2d").clearRect(0, 0, c.width, c.height); drawn.current = false; onChange(null); };
  return <div className="col" style={{ gap: 6 }}><canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
    style={{ width: "100%", height, border: "1.5px dashed var(--line)", borderRadius: 12, background: "#fff", touchAction: "none", cursor: "crosshair" }} aria-label="Zone de signature" />
    <div className="row"><span className="t-s grow">Signature du propriétaire</span><button type="button" className="btn sm ghost" onClick={clear}>Effacer</button></div></div>;
}

/* preuve de restitution imprimable (§55) */
export function ProofView({ p, api }) {
  return <div className="col" style={{ gap: 10 }}>
    <div className="row" style={{ alignItems: "flex-start" }}><img src="/logo-full.png" alt="ID SECOURS" style={{ width: 160 }} /><div className="grow" style={{ textAlign: "right" }}><div className="t-title" style={{ textAlign: "right" }}>PREUVE DE RESTITUTION</div><div className="mono">{p.reference}</div></div></div>
    <dl className="kv"><dt>Dossier</dt><dd className="mono">{p.dossier}</dd><dt>Document</dt><dd>{p.document} · <span className="mono">{p.numero}</span></dd><dt>Référence de réception</dt><dd className="mono">{p.reception}</dd>
      <dt>Agence</dt><dd>{p.agence}</dd><dt>Date et heure</dt><dd>{new Date(p.date).toLocaleString("fr-FR")}</dd><dt>Agent</dt><dd>{p.agent || "—"}</dd>
      <dt>Mode de vérification</dt><dd>{p.mode}</dd>{p.livraison && <><dt>Livraison</dt><dd>{p.livraison}</dd></>}<dt>Bénéficiaire</dt><dd>{p.beneficiaire}</dd></dl>
    {p.signature && <div><div className="t-label">Signature du propriétaire</div><img src={api.fileUrl(p.signature)} alt="Signature" style={{ maxHeight: 90, border: "1px solid var(--line)", borderRadius: 8, background: "#fff" }} /></div>}
    <div className="t-s">Données minimisées : numéro masqué. Preuve conservée dans l’historique du dossier.</div>
    <button className="btn ghost noprint" onClick={() => window.print()}>Imprimer / PDF</button>
  </div>;
}

/* export CSV (Excel) d'un tableau */
export function csv(name, rows, cols) {
  adminApi.post("/admin/exports", { name, count: rows.length }).catch(() => {}); // export journalisé (DF14)
  const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const body = [cols.map(c => esc(c[0])).join(";"), ...rows.map(r => cols.map(c => esc(c[1](r))).join(";"))].join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" })); a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
}
