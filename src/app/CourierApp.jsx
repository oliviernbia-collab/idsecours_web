/* Portail des livreurs partenaires — organigramme : « se rend chez la personne qui a trouvé le document, récupère le document,
   le dépose au service Collecte & Livraison » */
import { useEffect, useRef, useState, useCallback } from "react";
import { createApi } from "@shared/api.js";
import { storage } from "../lib/api.js";
import Icon from "../ui/Icon.jsx";
import { Wordmark, PwField } from "../ui/common.jsx";
import { COL_STEPS, SLOGAN } from "@shared/constants.js";
import { fmtT } from "@shared/format.js";
import "../admin/admin.css";

const api = createApi({ baseUrl: import.meta.env.VITE_API_URL || "/api", storage });
const TOKEN = "ids_courier_token";

/* lecture du QR code avec la caméra (navigateurs compatibles BarcodeDetector) */
function Scanner({ onCode, onClose }) {
  const video = useRef();
  useEffect(() => {
    let stream, stop = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.current.srcObject = stream; await video.current.play();
        const det = new window.BarcodeDetector({ formats: ["qr_code"] });
        const loop = async () => { if (stop) return; try { const r = await det.detect(video.current); if (r[0]) { onCode(r[0].rawValue); return; } } catch { /* image suivante */ } requestAnimationFrame(loop); };
        loop();
      } catch { onClose(); }
    })();
    return () => { stop = true; stream && stream.getTracks().forEach(t => t.stop()); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="modal-bg"><div className="modal"><h3>Scanner le QR code de collecte</h3><video ref={video} playsInline muted style={{ width: "100%", borderRadius: 12, background: "#000" }} /><button className="btn ghost" onClick={onClose}>Annuler</button></div></div>;
}

export default function CourierApp() {
  const [token, setToken] = useState(() => storage.get(TOKEN));
  const [me, setMe] = useState(null), [list, setList] = useState(null), [msg, setMsg] = useState(null);
  const [code, setCode] = useState({}), [scan, setScan] = useState(null);
  const [login, setLogin] = useState({ code: "", pin: "" });
  const flash = (t, ok = true) => { setMsg({ t, ok }); setTimeout(() => setMsg(null), 3500); };
  const logout = useCallback(() => { storage.del(TOKEN); api.setToken(null); setToken(null); setMe(null); }, []);
  const [dlv, setDlv] = useState([]), [fail, setFail] = useState({}), [dev, setDev] = useState({});
  const load = useCallback(async () => { try { setList((await api.get("/courier/missions")).items); setDlv((await api.get("/courier/deliveries")).items); } catch (e) { if (e.status === 401) logout(); } }, [logout]);
  useEffect(() => { document.title = "ID SECOURS · Livreurs"; api.onUnauthorized(logout); }, [logout]);
  useEffect(() => { if (!token) return; api.setToken(token); api.get("/courier/me").then(r => setMe(r.partner)).catch(logout); load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [token, load, logout]);

  if (!token) return <div className="adm-login"><form className="card" onSubmit={async e => { e.preventDefault(); try { const r = await api.post("/courier/login", login); storage.set(TOKEN, r.token); setToken(r.token); } catch (x) { flash(x.message, false); } }}>
    <img src="/logo.png" alt="" style={{ width: 80, alignSelf: "center", objectFit: "contain" }} /><div style={{ textAlign: "center" }}><Wordmark size={26} /><div className="t-title">Espace livreurs</div><div className="t-s">Partenaires de livraison agréés</div></div>
    <div className="field"><label htmlFor="cl-code">Code collecteur</label><input id="cl-code" className="inp mono" placeholder="COL-0000" value={login.code} onChange={e => setLogin({ ...login, code: e.target.value })} required /></div>
    <div className="field"><label htmlFor="cl-pin">PIN</label><PwField><input id="cl-pin" className="inp mono" type="password" inputMode="numeric" maxLength={6} value={login.pin} onChange={e => setLogin({ ...login, pin: e.target.value })} required /></PwField></div>
    {msg && <div className={`note n-${msg.ok ? "green" : "red"}`}><Icon n={msg.ok ? "check" : "alert"} s={16} /><span>{msg.t}</span></div>}
    <button className="btn red"><Icon n="moto" s={16} /> Se connecter</button>
    <div className="t-s" style={{ textAlign: "center", fontStyle: "italic" }}>{SLOGAN}</div></form></div>;

  const enroute = async m => { try { await api.post(`/courier/missions/${m.ref}/enroute`); flash("La personne a été prévenue de votre arrivée."); load(); } catch (e) { flash(e.message, false); } };
  const handover = async (m, c) => { try { await api.post(`/courier/missions/${m.ref}/handover`, { code: c }); flash("Code validé · document collecté. Déposez-le à l’agence ID SECOURS."); setCode({}); load(); } catch (e) { flash(e.message, false); } };
  const active = (list || []).filter(m => m.step <= 5), done = (list || []).filter(m => m.step > 5);

  return <div className="alertpage" style={{ minHeight: "100vh" }}>
    <div style={{ background: "var(--ink)", color: "#fff", padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
      <img src="/logo.png" alt="" width="38" height="38" style={{ background: "#fff", borderRadius: "50%", padding: 2, objectFit: "contain" }} />
      <div className="grow"><b style={{ font: "700 15px var(--f-display)" }}>{me ? me.collecteur : "…"}</b><div style={{ fontSize: 12, color: "#9FB0A7" }}>{me ? `${me.nom} · ${me.code} · ${me.vehicule}` : ""}</div></div>
      <button className="iconbtn" style={{ color: "#fff" }} onClick={logout} aria-label="Se déconnecter"><Icon n="logout" s={17} /></button>
    </div>
    <div className="pad" style={{ paddingBottom: 40 }}>
      {msg && <div className={`note n-${msg.ok ? "green" : "red"}`}><Icon n={msg.ok ? "check" : "alert"} s={16} /><span>{msg.t}</span></div>}
      <div className="t-label">Missions en cours · {active.length}</div>
      {!list ? <div className="loading"><div className="spinner" /></div> : active.length ? active.map(m => <div key={m.ref} className="card col" style={{ gap: 10 }}>
        <div className="row"><span style={{ width: 40, height: 40, borderRadius: 12, background: "var(--green-s)", color: "var(--green-d)", display: "grid", placeItems: "center" }}><Icon n="truck" s={18} /></span>
          <div className="grow"><div className="t-h">Mission {m.mission}</div><div className="t-s">{m.cat} · {m.ref}</div></div><span className={`pill p-${m.step === 5 ? "green" : "orange"}`}>{COL_STEPS[m.step]}</span></div>
        <dl className="kv"><dt>Point de collecte</dt><dd>{m.commune || "—"}{m.repere ? " · " + m.repere : ""}</dd><dt>Créneau</dt><dd>{m.slot || "Dès que possible"}</dd><dt>Contact</dt><dd>{m.tel ? <a href={`tel:${m.tel.replace(/\s/g, "")}`}>{m.tel}</a> : "Via la messagerie ID SECOURS"}</dd></dl>
        <a className="btn ghost sm" style={{ width: "100%" }} target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lng}`}><Icon n="map" s={14} /> Itinéraire</a>
        {m.step === 3 && <button className="btn dark" onClick={() => enroute(m)}><Icon n="moto" s={16} /> Je suis en route</button>}
        {(m.step === 3 || m.step === 4) && <><div className="row"><input className="inp mono grow" inputMode="numeric" maxLength={6} placeholder="Code de collecte (6 chiffres)" value={code[m.ref] || ""} onChange={e => setCode({ ...code, [m.ref]: e.target.value })} />
          <button className="btn green sm" disabled={(code[m.ref] || "").length !== 6} onClick={() => handover(m, code[m.ref])}>Valider</button></div>
          {"BarcodeDetector" in window && <button className="btn ghost sm" style={{ width: "100%" }} onClick={() => setScan(m)}><Icon n="qr" s={14} /> Scanner le QR code</button>}
          <div className="t-s">Ne récupérez le document qu’après validation du code présenté par la personne. Le code est invalidé après usage.</div></>}
        {m.step === 5 && <div className="note n-green"><Icon n="check" s={16} /><span>Collecté à {fmtT(m.handT)}. Déposez le document à l’<b>agence ID SECOURS</b> : le service Réception & Restitution confirmera la réception physique (double confirmation ③).</span></div>}
      </div>) : <div className="card empty"><Icon n="truck" s={30} />Aucune mission en cours.</div>}
      <div className="t-label">Livraisons au propriétaire · {dlv.filter(x => ["PLANIFIEE", "EN_LIVRAISON"].includes(x.st)).length}</div>
      {dlv.length ? dlv.map(x => <div key={x.ref} className="card col" style={{ gap: 10 }}>
        <div className="row"><span style={{ width: 40, height: 40, borderRadius: 12, background: "var(--blue-s)", color: "var(--blue-d)", display: "grid", placeItems: "center" }}><Icon n="hand" s={18} /></span>
          <div className="grow"><div className="t-h">Livraison {x.ref}</div><div className="t-s">{x.cat} · pour {x.destinataire}</div></div>
          <span className={`pill p-${x.st === "LIVREE" ? "green" : ["ECHEC", "REMISE_BLOQUEE"].includes(x.st) ? "red" : "blue"}`}>{{ PLANIFIEE: "À retirer en agence", EN_LIVRAISON: "En livraison", LIVREE: "Livrée", ECHEC: "Échec · retour agence", REMISE_BLOQUEE: "Bloquée · retour agence" }[x.st]}</span></div>
        <dl className="kv"><dt>Point de livraison</dt><dd>{x.commune}{x.repere ? " · " + x.repere : ""}</dd><dt>Créneau</dt><dd>{x.slot || "À convenir"}</dd><dt>Contact</dt><dd>{x.tel ? <a href={`tel:${x.tel.replace(/\s/g, "")}`}>{x.tel}</a> : "—"}</dd></dl>
        {x.st === "PLANIFIEE" && <div className="note n-blue"><Icon n="building" s={16} /><span>Présentez-vous au service Réception & Restitution de l’agence avec votre code collecteur pour retirer le document.</span></div>}
        {x.st === "EN_LIVRAISON" && <>
          <a className="btn ghost sm" style={{ width: "100%" }} target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${x.lat},${x.lng}`}><Icon n="map" s={14} /> Itinéraire</a>
          <div className="note n-orange"><Icon n="lock" s={16} /><span>Remise <b>au titulaire uniquement</b> (jamais à un voisin, gardien, ami ou parent). Demandez son QR de récupération ou envoyez-lui un code.</span></div>
          <button className="btn ghost sm" onClick={async () => { try { const r = await api.post(`/courier/deliveries/${x.ref}/otp`); setDev({ ...dev, [x.ref]: r.devCode }); flash("Code envoyé par SMS au propriétaire."); } catch (e) { flash(e.message, false); } }}><Icon n="send" s={14} /> Envoyer le code au propriétaire</button>
          <div className="row"><input className="inp mono grow" placeholder="Code reçu par le propriétaire / QR" value={code[x.ref] || ""} onChange={e => setCode({ ...code, [x.ref]: e.target.value })} />
            <button className="btn green sm" disabled={(code[x.ref] || "").length < 6} onClick={async () => { try { const r = await api.post(`/courier/deliveries/${x.ref}/confirm`, { code: code[x.ref] }); flash(`Livraison confirmée (${r.method}).`); load(); } catch (e) { flash(e.message, false); load(); } }}>Confirmer</button></div>
          {dev[x.ref] && <button className="btn ghost sm" onClick={() => setCode({ ...code, [x.ref]: dev[x.ref] })}>Mode test : remplir le code envoyé</button>}
          {"BarcodeDetector" in window && <button className="btn ghost sm" onClick={() => setScan({ ...x, delivery: true })}><Icon n="qr" s={14} /> Scanner le QR de récupération</button>}
          <div className="row"><select className="inp grow" value={fail[x.ref] || ""} onChange={e => setFail({ ...fail, [x.ref]: e.target.value })}><option value="">Livraison impossible : motif…</option>{["Propriétaire absent", "Numéro injoignable", "Adresse incorrecte", "OTP incorrect", "QR invalide", "Refus de réception", "Impossibilité de confirmer l’identité", "Incident du partenaire", "Problème de sécurité"].map(o => <option key={o}>{o}</option>)}</select>
            <button className="btn outline-r sm" disabled={!fail[x.ref]} onClick={async () => { try { await api.post(`/courier/deliveries/${x.ref}/fail`, { reason: fail[x.ref] }); flash("Échec enregistré : ramenez le document à l’agence."); load(); } catch (e) { flash(e.message, false); } }}>Signaler</button></div></>}
        {["ECHEC", "REMISE_BLOQUEE"].includes(x.st) && <div className="note n-red"><Icon n="alert" s={16} /><span>{x.failReason}. Rapportez le document à l’agence aujourd’hui : la Réception confirmera son retour.</span></div>}
      </div>) : <div className="card empty"><Icon n="hand" s={30} />Aucune livraison.</div>}
      {done.length > 0 && <><div className="t-label">Déposés récemment</div><div className="list">{done.map(m => <div key={m.ref} className="li"><div className="grow"><b className="mono">{m.mission}</b><div className="t-s">{m.cat} · {COL_STEPS[m.step]}</div></div><span className="pill p-green">Déposé</span></div>)}</div></>}
    </div>
    {scan && <Scanner onClose={() => setScan(null)} onCode={async c => { const m = scan; setScan(null);
      if (m.delivery) { try { const r = await api.post(`/courier/deliveries/${m.ref}/confirm`, { code: c }); flash(`Livraison confirmée (${r.method}).`); load(); } catch (e) { flash(e.message, false); } }
      else handover(m, c); }} />}
  </div>;
}
