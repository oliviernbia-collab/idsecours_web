/* Messagerie contextuelle (§21, §22, §47, §48) et profil */
import { useEffect, useRef, useState } from "react";
import { useApp } from "../store.jsx";
import { api, form, compress } from "../../lib/api.js";
import Icon from "../../ui/Icon.jsx";
import { Hdr, Btn, Field, Input, Select, Note, Spinner, Empty, Pill, useLoad } from "../../ui/common.jsx";
import { Avatar } from "./home.jsx";
import { ReceiptSheet } from "./protections.jsx";
import { COL_STEPS, DOC_ST, PRIVACY, COMMUNES } from "@shared/constants.js";
import { fmtD, fmtT, fcfa, fmtTel } from "@shared/format.js";

export function Chat({ p }) {
  const app = useApp(), ref = p.id;
  const [data, reload, err] = useLoad(() => api.get(`/messages/${ref}`), [ref], { poll: 6000, silent: true });
  const [text, setText] = useState(""), [rec, setRec] = useState(null);
  const recorder = useRef(null), viewEnd = useRef();
  useEffect(() => { viewEnd.current && viewEnd.current.scrollIntoView({ block: "end" }); }, [data]);
  if (!ref || err) return <><Hdr title="Messagerie" /><div className="pad"><Empty card ic="msg"><span>La messagerie est disponible uniquement lorsqu’un dossier opérationnel existe (déclaration, récupération ou signalement).</span></Empty></div></>;
  const send = async body => { try { await api.post(`/messages/${ref}`, body); reload(); } catch (e) { app.toast(e.message, "alert"); } };
  const sendText = () => { if (!text.trim()) return; send({ text }); setText(""); };
  const voice = async () => {
    if (rec) { recorder.current.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream), chunks = [], start = Date.now();
      mr.ondataavailable = e => chunks.push(e.data);
      mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); setRec(null); const b = new Blob(chunks, { type: "audio/webm" }); send(form({ file: new File([b], "vocal.webm", { type: "audio/webm" }), dur: Math.round((Date.now() - start) / 1000) })); };
      recorder.current = mr; mr.start(); setRec(Date.now());
    } catch { app.toast("Micro indisponible ou refusé.", "alert"); }
  };
  return <>
    <Hdr title={"ID SECOURS · " + ref} />
    <div className="pad" style={{ gap: 8, minHeight: "calc(100% - 120px)" }}>
      <Note style={{ fontSize: 12 }} ic="lock">Conversation liée au dossier {ref}. Texte, vocal, photos, PDF et justificatifs autorisés.</Note>
      {!data ? <Spinner /> : data.items.map(m => <div key={m.id} className={`bubble ${m.me ? "me" : "them"}`}>
        {m.kind === "file" ? <>{/\.(jpg|png|webp)$/.test(m.file || "") && <img src={api.fileUrl(m.file)} alt="" style={{ borderRadius: 10, maxHeight: 160, display: "block", marginBottom: 4 }} />}<a href={api.fileUrl(m.file)} target="_blank" rel="noreferrer" style={{ color: "inherit" }}><Icon n="clip" s={12} /> {m.name}</a></>
          : m.kind === "voice" ? <><Icon n="mic" s={12} /> Message vocal · 0:{String(m.dur || 0).padStart(2, "0")}<audio className="audio" controls src={api.fileUrl(m.file)} /></> : m.text}
        <small>{m.me ? "Vous" : "Agent ID SECOURS"} · {fmtT(m.t)}</small></div>)}
      <div ref={viewEnd} />
    </div>
    <div className="composer">
      <label className="iconbtn" aria-label="Joindre un fichier" style={{ cursor: "pointer" }}><Icon n="clip" s={18} /><input type="file" accept="image/*,application/pdf" hidden onChange={async e => { const f = e.target.files[0]; e.target.value = ""; if (!f) return; const c = await compress(f, 1024); send(form({ file: c, name: f.name })); }} /></label>
      <button className="iconbtn" onClick={voice} aria-label="Message vocal" style={rec ? { background: "var(--red)", color: "#fff" } : undefined}><Icon n="mic" s={18} /></button>
      <input className="inp" placeholder={rec ? "Enregistrement… touchez le micro pour envoyer" : "Votre message"} style={{ minHeight: 42 }} disabled={!!rec} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && sendText()} />
      <button className="iconbtn" style={{ background: "var(--green)", color: "#fff" }} onClick={sendText} aria-label="Envoyer"><Icon n="send" s={17} /></button>
    </div>
  </>;
}

export function Profile() {
  const app = useApp(), u = app.user;
  const [dos] = useLoad(() => api.get("/me/dossiers"), []);
  if (!u) return null;
  const n = dos ? dos.decl.length + dos.recs.length + dos.founds.length : 0;
  const item = (ic, l, onClick, extra) => <button className="li" onClick={onClick}><span className="ic" style={{ background: "var(--soft)" }}><Icon n={ic} s={17} /></span><div className="grow t-h" style={{ fontSize: 14 }}>{l}</div>{extra}<Icon n="chevR" s={14} /></button>;
  const privacy = () => app.openSheet(<div className="col" style={{ gap: 10 }}><h3 className="t-h">Confidentialité</h3>{PRIVACY.map(x => <div key={x} className="row" style={{ alignItems: "flex-start" }}><span style={{ color: "var(--green)" }}><Icon n="lock" s={14} /></span><span className="t-s" style={{ color: "var(--ink2)" }}>{x}</span></div>)}
    <Btn c="ghost" style={{ color: "var(--red)" }} onClick={() => app.openSheet(<DeleteAccount />)}>Supprimer mon compte</Btn><Btn c="ghost" onClick={app.closeSheet}>Fermer</Btn></div>);
  return <>
    <Hdr title="Profil" noBack />
    <div className="pad">
      <button className="card row" style={{ gap: 14, textAlign: "left" }} onClick={() => app.go("editProfile")}><Avatar sz={64} /><div className="grow"><div className="t-h" style={{ fontSize: 17 }}>{u.prenom} {u.nom}</div><div className="t-s">{fmtTel(u.tel)} · {u.email || ""}</div><Pill c="green" style={{ marginTop: 6 }}><Icon n="check" s={10} /> Numéro vérifié</Pill></div><Icon n="edit" s={16} /></button>
      <div className="list">{item("shield", "Mes protections", () => app.go("protections"))}{item("doc", "Mes dossiers", () => app.go("dossiers"), <Pill>{n}</Pill>)}{item("receipt", "Mes reçus", () => app.go("receipts"))}{item("bell", "Notifications", () => app.go("notifs"), app.unread ? <Pill c="red">{app.unread}</Pill> : null)}</div>
      <div className="t-label">Sécurité</div>
      <div className="list">{item("siren", "SOS & Protection", () => app.go("sosHome"), <Pill c={app.sos && app.sos.enabled ? "green" : "grey"}>{app.sos && app.sos.enabled ? "Actif" : "Inactif"}</Pill>)}{item("lock", "Verrouiller l’application", () => app.setLocked(true))}{item("eye", "Confidentialité", privacy)}{item("clock", "Journal d’activité", () => app.go("auditLog"))}</div>
      <div className="list">{item("logout", "Se déconnecter", app.logout)}</div>
      <p className="t-s" style={{ textAlign: "center" }}>ID SECOURS · v1.0 · PROSOFT ACADEMY</p><div style={{ height: 60 }} />
    </div>
  </>;
}

function DeleteAccount() {
  const app = useApp();
  return <div className="col" style={{ gap: 12 }}><h3 className="t-h">Supprimer mon compte ?</h3><p className="t-s" style={{ margin: 0 }}>Vos documents, protections, contacts d’urgence et notifications seront définitivement supprimés. Cette action est irréversible.</p>
    <Btn onClick={async () => { try { await api.del("/me"); app.closeSheet(); app.logout(); app.toast("Compte supprimé."); } catch (e) { app.toast(e.message, "alert"); } }}>Supprimer définitivement</Btn><Btn c="ghost" onClick={app.closeSheet}>Annuler</Btn></div>;
}

export function EditProfile() {
  const app = useApp(), u = app.user;
  const [f, setF] = useState({ prenom: u.prenom, nom: u.nom, email: u.email || "", dob: u.dob || "", commune: u.commune || "Cocody", avenue: u.avenue || "", rue: u.rue || "", complement: u.complement || "" });
  const [photo, setPhoto] = useState(null);
  const set = k => v => setF(s => ({ ...s, [k]: v }));
  const save = async () => { try { const r = await api.patch("/me", form({ ...f, photo })); app.setUser(r.user); app.toast("Profil mis à jour."); app.back(); } catch (e) { app.toast(e.message, "alert"); } };
  return <><Hdr title="Mon profil" /><div className="pad">
    <label className="photo" style={{ aspectRatio: "auto", height: 110, width: 110, borderRadius: "50%", alignSelf: "center" }}>{photo ? <img src={photo.preview} alt="" /> : u.photo ? <img src={api.fileUrl(u.photo)} alt="" /> : <span><Icon n="camera" s={22} /><br />Photo</span>}<input type="file" accept="image/*" capture="user" onChange={async e => { const x = e.target.files[0]; if (x) setPhoto(await compress(x, 480)); }} /></label>
    <div className="grid2"><Field label="Nom" id="ep-nom"><Input id="ep-nom" value={f.nom} onChange={set("nom")} /></Field><Field label="Prénom" id="ep-pr"><Input id="ep-pr" value={f.prenom} onChange={set("prenom")} /></Field></div>
    <Field label="E-mail" id="ep-em"><Input id="ep-em" type="email" value={f.email} onChange={set("email")} /></Field>
    <Field label="Date de naissance" id="ep-dob"><Input id="ep-dob" type="date" value={f.dob} onChange={set("dob")} /></Field>
    <Field label="Commune" id="ep-com"><Select id="ep-com" value={f.commune} onChange={set("commune")} options={COMMUNES} /></Field>
    <div className="grid2"><Field label="Avenue" id="ep-av"><Input id="ep-av" value={f.avenue} onChange={set("avenue")} /></Field><Field label="Rue" id="ep-rue"><Input id="ep-rue" value={f.rue} onChange={set("rue")} /></Field></div>
    <Field label="Informations complémentaires de domicile" id="ep-cp"><Input id="ep-cp" value={f.complement} onChange={set("complement")} /></Field>
    <Btn onClick={save}>Enregistrer</Btn>
  </div></>;
}

export function Dossiers() {
  const app = useApp();
  const [d] = useLoad(() => api.get("/me/dossiers"), []);
  if (!d) return <><Hdr title="Mes dossiers" /><Spinner /></>;
  const rows = [
    ...d.decl.map(x => ({ ref: x.ref, t: x.t, l: "Déclaration de perte · " + app.catOf(x.cat).short, st: x.closed ? "Clôturé" : DOC_ST[x.st].l, go: ["dossier", { id: x.doc_id }] })),
    ...d.recs.map(x => ({ ref: x.ref, t: x.t, l: "Récupération · " + app.catOf(x.cat).short, st: x.done_at ? "Récupéré" : (x.verif_status || x.status), go: [x.done_at ? "recDone" : x.status === "RÉCUPÉRATION AUTORISÉE" ? "recAuth" : "recDossier", { id: x.ref }] })),
    ...d.founds.map(x => ({ ref: x.ref, t: x.t, l: "Document trouvé · " + app.catOf(x.cat).short, st: COL_STEPS[x.step], go: [x.step >= 1 ? "collecte" : "foundOk", { id: x.ref }] }))
  ].sort((a, b) => new Date(b.t) - new Date(a.t));
  return <><Hdr title="Mes dossiers" /><div className="pad">{rows.length ? <div className="list">{rows.map(r => <button key={r.ref} className="li" onClick={() => app.go(...r.go)}><div className="grow"><div className="mono" style={{ fontWeight: 700, fontSize: 13 }}>{r.ref}</div><div className="t-s">{r.l} · {fmtD(r.t)}</div></div><Pill c="blue">{r.st}</Pill></button>)}</div> : <Empty card ic="doc">Aucun dossier pour le moment.</Empty>}</div></>;
}

export function Receipts() {
  const app = useApp();
  const [d] = useLoad(() => api.get("/me/receipts"), []);
  return <><Hdr title="Mes reçus" /><div className="pad">{!d ? <Spinner /> : d.items.length ? <div className="list">{d.items.map(r => <button key={r.ref} className="li" onClick={() => app.openSheet(<ReceiptSheet r={r} />)}><span className="ic" style={{ background: "var(--green-s)", color: "var(--green-d)" }}><Icon n="receipt" s={16} /></span><div className="grow"><div className="t-h" style={{ fontSize: 13.5 }}>{r.label}</div><div className="t-s">{r.ref} · {fmtD(r.t)}</div></div><b className="num">{fcfa(r.amount)}</b></button>)}</div> : <Empty card ic="receipt">Aucun paiement pour le moment.</Empty>}</div></>;
}

export function AuditLog() {
  const [d] = useLoad(() => api.get("/me/activity"), []);
  return <><Hdr title="Journal d’activité" /><div className="pad"><div className="card log" style={{ maxHeight: "none" }}>{!d ? <Spinner /> : d.items.length ? d.items.map((a, i) => <div key={i}><span>{fmtD(a.t)} {fmtT(a.t, true)}</span>{a.l}</div>) : "Aucune action journalisée."}</div></div></>;
}
