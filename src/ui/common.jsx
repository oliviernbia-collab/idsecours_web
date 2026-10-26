/* Composants d'interface — reprise fidèle des classes du prototype */
import { cloneElement, useEffect, useState, useCallback, useRef } from "react";
import Icon from "./Icon.jsx";
import { useApp } from "../app/store.jsx";
import { fmtD, fmtT } from "@shared/format.js";

export const Pill = ({ c = "grey", dot, children, style }) => <span className={`pill p-${c}`} style={style}>{dot && <i />}{children}</span>;
export const Note = ({ c = "blue", ic = "info", children, style }) => <div className={`note n-${c}`} style={style}><Icon n={ic} s={18} /><span>{children}</span></div>;
export const Kv = ({ rows }) => <dl className="kv">{rows.filter(Boolean).map(([k, v], i) => [<dt key={"k" + i}>{k}</dt>, <dd key={"v" + i}>{v}</dd>])}</dl>;
export const Hero = ({ ic, bg, color, size = 38, title, children, spinner, style }) => (
  <div className="hero" style={style}>
    {spinner ? <div className="spinner" style={spinner === true ? undefined : { borderTopColor: spinner }} /> : <div className="big" style={{ background: bg, color }}><Icon n={ic} s={size} /></div>}
    {title && <h3 className="t-title">{title}</h3>}{children}
  </div>
);
export const Empty = ({ ic, children, card }) => <div className={`${card ? "card " : ""}empty`}>{ic && <Icon n={ic} s={32} />}{children}</div>;
export const Spinner = () => <div className="loading"><div className="spinner" /></div>;
export const Timeline = ({ steps }) => (
  <div className="tl">{steps.map((s, i) => (
    <div key={i} className={`st ${s.done ? "done" : s.cur ? "cur" : ""}`}><span className="b">{s.done && <Icon n="check" s={11} />}</span><div className="tx" style={s.color ? { color: s.color } : undefined}>{s.l}{s.small && <small>{s.small}</small>}</div></div>
  ))}</div>
);

export function Hdr({ title, noBack, right, onBack }) {
  const { back } = useApp();
  return (
    <div className="hdr">
      {!noBack && <button className="iconbtn" onClick={onBack || back} aria-label="Retour"><Icon n="chevL" s={20} /></button>}
      <h2>{title}</h2>{right}
    </div>
  );
}

export function Btn({ c = "red", sm, ic, children, onClick, disabled, style, busy: busyProp, type = "button", className = "" }) {
  const [busy, setBusy] = useState(false);
  const run = async e => { if (!onClick) return; const r = onClick(e); if (r && r.then) { setBusy(true); try { await r; } finally { setBusy(false); } } };
  const b = busy || busyProp;
  return <button type={type} className={`btn ${c} ${sm ? "sm" : ""} ${className}`} onClick={run} disabled={disabled || b} style={style}>
    {b ? <span className="spin-inline" /> : ic && <Icon n={ic} s={sm ? 15 : 18} />}{children}
  </button>;
}

export function Field({ label, req, id, hint, children }) {
  return <div className="field"><label htmlFor={id}>{label}{req ? " *" : ""}</label>{children}{hint && <span className="hint">{hint}</span>}</div>;
}
export const Input = ({ id, value, onChange, err, className = "", ...rest }) => {
  const el = <input id={id} className={`inp ${err ? "err" : ""} ${className}`} value={value ?? ""} onChange={e => onChange(e.target.value)} {...rest} />;
  return rest.type === "password" ? <PwField>{el}</PwField> : el;
};
/* champ secret avec œil afficher / masquer */
export function PwField({ children }) {
  const [show, setShow] = useState(false);
  return <div className="pw-wrap">{cloneElement(children, { type: show ? "text" : "password" })}
    <button type="button" className="pw-eye" onClick={() => setShow(s => !s)} aria-label={show ? "Masquer" : "Afficher"} aria-pressed={show}><Icon n={show ? "eyeOff" : "eye"} s={18} /></button></div>;
}
export const Select = ({ id, value, onChange, options, placeholder, style }) => (
  <select id={id} className="inp" value={value ?? ""} onChange={e => onChange(e.target.value)} style={style}>
    {placeholder !== undefined && <option value="">{placeholder}</option>}
    {options.map(o => Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>)}
  </select>
);
export const Chk = ({ checked, onChange, children }) => <label className="chk"><input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} />{children}</label>;
export const Switch = ({ on, onClick, disabled, label }) =>
  <button className={`switch ${on ? "on" : ""}`} role="switch" aria-checked={!!on} aria-label={label} onClick={onClick} disabled={disabled} style={disabled ? { opacity: .4 } : undefined} />;

/* sélection d'une photo (caméra sur mobile) */
export function PhotoPick({ label = "PHOTO", value, onPick, capture = "environment", style, round }) {
  const ref = useRef();
  return (
    <label className="photo" style={{ ...(round ? { aspectRatio: "auto", height: 120, width: 120, borderRadius: "50%", alignSelf: "center" } : {}), ...style }}>
      {value ? <img src={value} alt="" /> : <span><Icon n="camera" s={24} /><br />{label}</span>}
      <input ref={ref} type="file" accept="image/*" capture={capture} onChange={e => { const f = e.target.files[0]; if (f) onPick(f); e.target.value = ""; }} />
    </label>
  );
}
export function FilePick({ label, value, onPick, accept = "image/*,application/pdf", height = 70 }) {
  return (
    <label className="photo" style={{ aspectRatio: "auto", height }}>
      {value ? <span style={{ color: "var(--green-d)" }}><Icon n="check" s={18} /> {value}</span> : <span><Icon n="upload" s={20} /> {label}</span>}
      <input type="file" accept={accept} onChange={e => { const f = e.target.files[0]; if (f) onPick(f); e.target.value = ""; }} />
    </label>
  );
}

/* carte schématique (aucun service cartographique externe requis) */
export function MapSVG({ loc, trail }) {
  const pts = trail && trail.length > 1 ? trail.map((p, i) => `${70 + i * 34},${70 - (i % 2) * 16 + i * 4}`).join(" ") : "";
  return (
    <div className="map"><svg viewBox="0 0 340 150" role="img" aria-label="Carte de la position">
      <rect width="340" height="150" fill="#E6EDE3" />
      <path d="M0 118 C80 100 140 140 220 112 S320 100 340 108 V150 H0Z" fill="#BFDDF3" />
      <path d="M-10 40 L350 70 M60 -10 L110 160 M220 -10 L190 160 M0 95 L340 30" stroke="#fff" strokeWidth="9" fill="none" />
      <path d="M-10 40 L350 70 M60 -10 L110 160 M220 -10 L190 160 M0 95 L340 30" stroke="#F4D58D" strokeWidth="2" fill="none" />
      <rect x="240" y="15" width="40" height="26" rx="4" fill="#D4E6C9" /><rect x="20" y="10" width="30" height="20" rx="4" fill="#D4E6C9" />
      {pts && <polyline points={pts} fill="none" stroke="#1A7EE0" strokeWidth="3" strokeDasharray="5 4" />}
      <circle cx="170" cy="72" r={Math.min(40, 10 + Math.min(30, loc.acc || 15))} fill="rgba(227,20,27,.14)" />
      <path d="M170 76 C162 66 158 60 158 54 a12 12 0 0 1 24 0 c0 6 -4 12 -12 22z" fill="#E3141B" /><circle cx="170" cy="54" r="4.5" fill="#fff" />
      <text x="170" y="98" textAnchor="middle" fontFamily="Poppins,sans-serif" fontSize="11" fontWeight="600" fill="#16201B">{loc.commune || ""}</text>
    </svg></div>
  );
}
export function LocBlock({ loc, title = "Position enregistrée" }) {
  return (
    <div className="card col" style={{ gap: 10 }}>
      <div className="row"><span style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "var(--green-s)", color: "var(--green-d)" }}><Icon n="pin" s={16} /></span>
        <div className="grow"><div className="t-h" style={{ fontSize: 14 }}>{title}</div><div className="t-s">{loc.commune}, Abidjan · {loc.src === "GPS" ? "GPS" : "commune sélectionnée"}</div></div></div>
      <MapSVG loc={loc} />
      <Kv rows={[["Latitude", <span className="mono">{loc.lat}</span>], ["Longitude", <span className="mono">{loc.lng}</span>], ["Date", fmtD(loc.t || Date.now())], ["Heure", fmtT(loc.t || Date.now(), true)], ["Précision", `± ${loc.acc} m`]]} />
    </div>
  );
}

/* chargement de données : const [data, reload, error] = useLoad(() => api.get(...), [deps]) */
export function useLoad(fn, deps = [], opts = {}) {
  const [data, setData] = useState(null), [error, setError] = useState(null);
  const { toast } = useApp();
  const load = useCallback(async () => {
    try { const d = await fn(); setData(d); setError(null); return d; }
    catch (e) { setError(e); if (!opts.silent) toast(e.message, "alert"); }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!opts.poll) return; const t = setInterval(load, opts.poll); return () => clearInterval(t); }, [load, opts.poll]);
  return [data, load, error];
}

export const CatIcon = ({ cat, w = 42, h = 38, s = 20, r = 10 }) =>
  <span style={{ width: w, height: h, borderRadius: r, display: "grid", placeItems: "center", background: cat.color, color: "#fff", flex: "none" }}><Icon n={cat.icon} s={s} /></span>;

export const Wordmark = ({ size = 34 }) => <div className="wm" style={{ fontSize: size }}><span className="i">I</span><span className="d">D</span> <span className="s">SECOURS</span></div>;

export const Qr = ({ src }) => <img className="qr" src={src} alt="QR code" />;
