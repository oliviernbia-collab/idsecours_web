/* Avis de satisfaction après une étape terminée (restitution, livraison, collecte) */
import { useState } from "react";
import { useApp } from "../store.jsx";
import { api } from "../../lib/api.js";
import Icon from "../../ui/Icon.jsx";
import { Btn, useLoad } from "../../ui/common.jsx";

const LABELS = ["", "Très insatisfait", "Insatisfait", "Correct", "Satisfait", "Très satisfait"];

export function Stars({ value, onChange, size = 30 }) {
  return <div className="row" style={{ gap: 6, justifyContent: "center" }} role="radiogroup" aria-label="Note">
    {[1, 2, 3, 4, 5].map(n => <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} étoile${n > 1 ? "s" : ""} · ${LABELS[n]}`} onClick={() => onChange && onChange(n)}
      style={{ background: "none", border: 0, padding: 2, cursor: onChange ? "pointer" : "default", color: n <= value ? "#F5B301" : "var(--line)", fontSize: size, lineHeight: 1 }}>★</button>)}
  </div>;
}

/* carte d'avis pour un dossier ; se masque si l'étape n'est pas terminée */
export function FeedbackBox({ dossier, onDone }) {
  const app = useApp();
  const [d, reload] = useLoad(() => api.get(`/feedback/${dossier}`), [dossier], { silent: true });
  const [note, setNote] = useState(0), [txt, setTxt] = useState(""), [sent, setSent] = useState(false);
  if (!d || !d.eligible) return null;
  if (d.feedback || sent) return <div className="card col" style={{ gap: 6, textAlign: "center" }}>
    <div className="t-h" style={{ fontSize: 14 }}>Merci pour votre avis !</div>
    <Stars value={d.feedback ? d.feedback.note : note} size={22} />
    <div className="t-s">Il nous aide à améliorer le service ID SECOURS.</div></div>;
  const send = async () => {
    try { await api.post(`/feedback/${dossier}`, { note, commentaire: txt }); setSent(true); app.toast("Merci ! Votre avis a été enregistré."); reload(); onDone && onDone(); }
    catch (e) { app.toast(e.message, "alert"); }
  };
  return <div className="card col" style={{ gap: 10 }}>
    <div className="row" style={{ gap: 8 }}><Icon n="star" s={18} /><div className="t-h" style={{ fontSize: 14 }}>Votre avis · {d.label}</div></div>
    <div className="t-s">Comment s’est passée cette étape ?</div>
    <Stars value={note} onChange={setNote} />
    <div className="t-s" style={{ textAlign: "center", minHeight: 18 }}>{LABELS[note]}</div>
    {note > 0 && <textarea className="inp" rows={3} maxLength={500} placeholder={note <= 2 ? "Dites-nous ce qui n’a pas fonctionné (facultatif)" : "Un commentaire ? (facultatif)"} value={txt} onChange={e => setTxt(e.target.value)} />}
    <Btn disabled={!note} onClick={send}>Envoyer mon avis</Btn>
  </div>;
}

/* accueil : avis en attente (le plus récent) */
export function PendingFeedback() {
  const app = useApp();
  const [d, reload] = useLoad(() => api.get("/feedback/pending"), [], { silent: true });
  if (!d || !d.items.length) return null;
  const x = d.items[0];
  return <div className="col" style={{ gap: 6 }}>
    <div className="t-s">{app.catOf(x.cat).label} · dossier {x.ref}{d.items.length > 1 ? ` · ${d.items.length - 1} autre(s) avis en attente` : ""}</div>
    <FeedbackBox dossier={x.ref} onDone={() => setTimeout(reload, 1500)} />
  </div>;
}
