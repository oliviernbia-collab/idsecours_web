/* Vue du contact d'urgence (lien sécurisé reçu par SMS) — cahier SOS §22 à §24 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api.js";
import Icon from "../ui/Icon.jsx";
import { MapSVG, Kv, Note } from "../ui/common.jsx";
import { C_ST, URGENCES } from "@shared/constants.js";
import { fmtT } from "@shared/format.js";

export default function AlertPage() {
  const { token } = useParams();
  const [a, setA] = useState(null), [err, setErr] = useState(null), [panel, setPanel] = useState(null), [msg, setMsg] = useState("");
  const load = () => api.get(`/alert/${token}`).then(r => setA(r.alert)).catch(e => setErr(e.message));
  useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  const act = async k => { try { await api.post(`/alert/${token}/${k}`); load(); if (k === "no") setMsg("Merci. Le contact suivant est alerté."); } catch (e) { setMsg(e.message); } };
  if (err) return <div className="alertpage"><div className="pad"><div className="card empty"><Icon n="alert" s={30} />{err}</div></div></div>;
  if (!a) return <div className="alertpage"><div className="loading"><div className="spinner" /></div></div>;
  const taken = a.me.st === "PRIS", done = a.closed;
  const summary = `Alerte SOS ID SECOURS #${a.ref} — ${a.user.prenom} ${a.user.nom}, ${a.user.tel}. Déclenchée à ${fmtT(a.t)}. Dernière position : ${a.loc ? `${a.loc.commune || ""} ${a.loc.lat}, ${a.loc.lng} (± ${a.loc.acc} m, ${fmtT(a.loc.t)})` : "inconnue"}.`;
  return <div className="alertpage">
    <div style={{ background: "#16201B", color: "#fff", padding: "16px 16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="row"><img src="/logo.png" alt="" width="34" height="34" style={{ background: "#fff", borderRadius: "50%", padding: 2, objectFit: "contain" }} /><span className="grow t-s" style={{ color: "#9FB0A7" }}>Alerte destinée à {a.me.nom} ({a.me.rel})</span></div>
      <div className="row" style={{ gap: 12 }}><span style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--red)", display: "grid", placeItems: "center", animation: done ? "none" : "pulse 1s infinite", flex: "none" }}><Icon n="siren" s={26} /></span>
        <div><div style={{ font: "800 19px var(--f-display)", color: "#FF5A5F" }}>{a.test ? "TEST ID SECOURS" : done ? "ALERTE TERMINÉE" : "ALERTE SOS ID SECOURS"}</div><div style={{ fontSize: 13.5 }}>{a.test ? "Ceci est un test. Aucune urgence réelle." : done ? "Alerte terminée — utilisateur déclaré en sécurité." : `${a.user.prenom} a déclenché une alerte d’urgence.`}</div></div></div>
      {a.duress && !done && <div className="note n-orange" style={{ fontSize: 12.5 }}><Icon n="alert" s={16} /><span><b>Alerte de contrainte détectée.</b> Évitez toute action susceptible d’augmenter immédiatement le danger. Consultez la position et suivez les consignes d’urgence.</span></div>}
      <dl className="kv" style={{ color: "#fff" }}><dt style={{ color: "#9FB0A7" }}>Heure</dt><dd>{fmtT(a.t)}</dd><dt style={{ color: "#9FB0A7" }}>Dernière position</dt><dd>{a.loc ? `${a.loc.commune || "—"} · ${fmtT(a.loc.t)}` : "Non disponible"}</dd><dt style={{ color: "#9FB0A7" }}>Batterie</dt><dd>{a.battery != null ? a.battery + " %" : "—"}</dd><dt style={{ color: "#9FB0A7" }}>Votre statut</dt><dd>{C_ST[a.me.st] ? C_ST[a.me.st][0] : a.me.st}</dd></dl>
    </div>
    <div className="pad">
      {msg && <Note>{msg}</Note>}
      {done || a.test ? null : <>
        {taken ? <><Note c="green" ic="check">Vous avez pris en charge l’alerte. Le suivi GPS continue.</Note>{a.st !== "INTERVENTION_EN_COURS" && <button className="btn dark" onClick={() => act("inter")}>Intervention en cours</button>}</>
          : <button className="btn green" onClick={() => act("take")}><Icon n="hand" s={18} /> JE PRENDS EN CHARGE</button>}
        <a className="btn blue" href={`tel:${a.user.tel.replace(/\s/g, "")}`} onClick={() => act("call")}><Icon n="phone" s={18} /> APPELER {a.user.tel}</a>
        <button className="btn ghost" onClick={() => setPanel(panel === "pos" ? null : "pos")}><Icon n="map" s={18} /> VOIR LA POSITION</button>
        {panel === "pos" && (a.loc ? <div className="card col"><MapSVG loc={a.loc} trail={a.track} />
          {Date.now() - new Date(a.loc.t) > 120000 && <Note c="orange" ic="clock">Position ancienne : dernière mise à jour à {fmtT(a.loc.t)}.</Note>}
          <Kv rows={[["Précision", `± ${a.loc.acc} m`], ["Source", a.loc.src], ["Coordonnées", <span className="mono">{a.loc.lat}, {a.loc.lng}</span>]]} />
          <a className="btn ghost sm" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${a.loc.lat},${a.loc.lng}`}>Ouvrir dans Google Maps</a></div> : <Note>Position non partagée.</Note>)}
        <button className="btn outline-r" onClick={() => { setPanel(panel === "urg" ? null : "urg"); act("urgences"); }}><Icon n="siren" s={18} /> CONTACTER LES SERVICES D’URGENCE</button>
        {panel === "urg" && <div className="col" style={{ gap: 10 }}><Note c="orange">ID SECOURS n’a prévenu aucun service officiel. Appelez vous-même et communiquez les informations ci-dessous.</Note>
          <div className="list">{URGENCES.map(([l, n]) => <a key={l} className="li" href={`tel:${n.split(" ")[0]}`} style={{ textDecoration: "none", color: "inherit" }}><span className="ic" style={{ background: "var(--red-s)", color: "var(--red)" }}><Icon n="phone" s={16} /></span><div className="grow t-h" style={{ fontSize: 14 }}>{l}</div><b className="mono">{n}</b></a>)}</div>
          <div className="card" style={{ boxShadow: "none", border: "1px solid var(--line)", fontSize: 12.5, userSelect: "all" }}>{summary}</div>
          <button className="btn ghost" onClick={() => navigator.clipboard.writeText(summary).then(() => setMsg("Informations copiées."), () => setMsg("Sélectionnez le texte pour le copier."))}>Copier les informations</button></div>}
        {!taken && <button className="btn ghost" style={{ color: "var(--muted)" }} onClick={() => act("no")}>JE NE SUIS PAS DISPONIBLE</button>}
      </>}
      <p className="t-s" style={{ textAlign: "center" }}>ID SECOURS · votre accès à cette alerte se termine à sa clôture.</p>
    </div>
  </div>;
}
