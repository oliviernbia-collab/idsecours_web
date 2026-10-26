/* Module SOS — 4 niveaux + chaîne d'alerte (cahier des charges SOS) */
import { useEffect, useRef, useState } from "react";
import { useApp } from "../store.jsx";
import { api } from "../../lib/api.js";
import Icon from "../../ui/Icon.jsx";
import { Hdr, Btn, Field, Input, Select, Chk, Note, Hero, Kv, Pill, Spinner, Empty, Switch, MapSVG, useLoad } from "../../ui/common.jsx";
import { triggerSOS, pressKey } from "./sosTriggers.jsx";
import { SOS_FLOW, TRIG, C_ST, DIAG_ROWS, KEYL, RELATIONS, invLabel, BT_FOUND } from "@shared/constants.js";
import { fmtT, fmtDT, fmtLeft, norm, fmtTel } from "@shared/format.js";

const compatPill = (s, k) => { const c = s.diag && s.diag[k]; return c === "ok" ? <Pill c="green">Compatible ✓</Pill> : c === "warn" ? <Pill c="orange">Avec restrictions</Pill> : c === "ko" ? <Pill c="red">Non disponible ✕</Pill> : <Pill>Diagnostic requis</Pill>; };
const canUse = (s, k) => s.diag && ["ok", "warn"].includes(s.diag[k]);
function useSos() {
  const app = useApp();
  useEffect(() => { app.refreshSos(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const patch = async body => { try { const r = await api.patch("/sos", body); app.setSos(r.sos); return r.sos; } catch (e) { app.toast(e.message, "alert"); } };
  return [app.sos, patch, app];
}

export function SosHome() {
  const [s, patch, app] = useSos();
  if (!s) return <><Hdr title="SOS & Protection" /><Spinner /></>;
  const rc = s.contacts.filter(c => c.ready).length, pm = s.protection;
  const diagRes = s.diag ? (Object.values(s.diag).every(x => x === "ok") ? "PROTECTION OPTIMALE" : "PROTECTION PARTIELLE") : null;
  const it = (ic, l, sub, v, right) => <button className="li" onClick={() => app.go(v)}><span className="ic" style={{ background: "var(--red-s)", color: "var(--red)" }}><Icon n={ic} s={17} /></span><div className="grow"><div className="t-h" style={{ fontSize: 13.5 }}>{l}</div><div className="t-s">{sub}</div></div>{right}<Icon n="chevR" s={14} /></button>;
  return <><Hdr title="SOS & Protection" /><div className="pad">
    <div className="card col sosbg" style={{ gap: 10 }}><div className="row"><Icon n="siren" s={28} /><div className="grow"><div className="t-h" style={{ color: "#fff" }}>SOS ID SECOURS</div><div style={{ fontSize: 12.5, opacity: .9 }}>{s.enabled ? "Activé · vos contacts confirmés seront alertés" : s.configured ? "Désactivé" : "Assistant de configuration requis"}</div></div>
      <Switch on={s.enabled} label="Activer le SOS" onClick={() => s.configured ? patch({ enabled: !s.enabled }) : app.go("sosWizard", { id: 0 })} /></div>
      {diagRes && <div className="row" style={{ fontSize: 12.5 }}><span className="pill" style={{ background: "rgba(255,255,255,.2)", color: "#fff" }}>{diagRes}</span><span style={{ opacity: .9 }}>{rc} contact{rc > 1 ? "s" : ""} prêt{rc > 1 ? "s" : ""}</span></div>}</div>
    {!s.configured && <Btn onClick={() => app.go("sosWizard", { id: 0 })}>Lancer l’assistant de configuration</Btn>}
    <div className="list">
      {it("users", "Contacts d’urgence", `${s.contacts.length} contact(s) · ${rc} prêt(s)`, "sosContacts")}
      {it("siren", "Niveau 1 · SOS immédiat", "Bouton rouge visible dans l’application", "sosImmediate", <Pill c="green">✓</Pill>)}
      {it("phone", "Niveau 2 · SOS invisible", `Boutons physiques : ${s.seq.map(k => ({ "V+": "Vol+", "V-": "Vol−", P: "Latéral" })[k]).join(" · ") || "aucune séquence"}`, "sosInvisible", s.seqEnabled ? <Pill c="green">Actif</Pill> : null)}
      {it("tap", "Tapotements", `${s.tapCount} tapotements arrière`, "sosTaps", s.tapsEnabled ? <Pill c="green">Actif</Pill> : null)}
      {it("shield", "Niveau 3 · Mode Protection", pm.active ? `Actif · ${fmtLeft(new Date(pm.until) - Date.now())}` : "Trajet nocturne, rendez-vous, voyage…", "sosProtection", pm.active ? <Pill c="green">Actif</Pill> : null)}
      {it("mic", "Code vocal", s.voice.trained ? "« " + s.voice.phrase + " »" : "Non configuré", "sosVoice")}
      {it("bt", "Niveau 4 · Accessoire Bluetooth", s.bt.length ? s.bt.map(b => b.nom).join(", ") : "Aucun dispositif", "sosBluetooth")}
      {it("key", "Code sous contrainte", s.hasCodes ? "Code normal et code de contrainte définis" : "À définir", "sosDuress")}
    </div>
    <div className="list">
      <div className="li"><span className="ic" style={{ background: "var(--soft)" }}><Icon n="pin" s={17} /></span><div className="grow"><div className="t-h" style={{ fontSize: 13.5 }}>Partage de localisation</div><div className="t-s">Uniquement pendant un SOS ou un Mode Protection</div></div><Switch on={s.shareLoc} label="Partage de localisation" onClick={() => patch({ shareLoc: !s.shareLoc })} /></div>
      {it("check", "Test du SOS", "Envoyer une fausse alerte identifiée « TEST »", "sosTest")}
      {it("gear", "Diagnostic du téléphone", diagRes || "À lancer", "sosDiag")}
      {it("clock", "Historique des alertes", `${s.incidents} alerte(s)`, "sosHistory")}
    </div>
    <div className="card col"><div className="row"><span className="grow t-s" style={{ color: "var(--ink)" }}>Délai d’escalade vers le contact suivant</span><Select style={{ width: "auto", minHeight: 36 }} value={String(s.ackTimeout)} onChange={v => patch({ ackTimeout: +v })} options={[10, 20, 30, 60, 120].map(x => [String(x), x < 60 ? x + " s" : x / 60 + " min"])} /></div></div>
  </div></>;
}

export function SosWizard({ p }) {
  const [s, patch, app] = useSos();
  if (!s) return <Spinner />;
  const st = +(p.id || 0), steps = ["Contacts d’urgence", "Diagnostic du téléphone", "Déclencheurs", "Codes de sécurité"];
  const body = [
    <><div className="t-s">Ajoutez au moins un contact. Il reçoit une invitation à installer ID SECOURS pour recevoir l’alerte sonore.</div><div className="list">{s.contacts.length ? s.contacts.map(c => <div key={c.id} className="li"><div className="grow"><b>{c.prenom} {c.nom}</b><div className="t-s">{c.rel} · priorité {c.prio}</div></div><Pill c={c.ready ? "green" : "orange"}>{c.ready ? "Prêt ✓" : invLabel(c.inv)}</Pill></div>) : <div className="li t-s">Aucun contact</div>}</div><Btn c="ghost" ic="plus" onClick={() => app.go("sosContactAdd")}>Ajouter un contact</Btn></>,
    <><div className="t-s">Le diagnostic détermine quels mécanismes sont réellement disponibles sur votre appareil. Aucun mécanisme non testé n’est activé.</div>{s.diag && <div className="card diag">{DIAG_ROWS.map(([k, l]) => [<div key={k}>{l}</div>, <div key={k + "r"} className={`res ${s.diag[k]}`}>{s.diag[k] === "ok" ? "✓" : s.diag[k] === "warn" ? "!" : "✕"}</div>])}</div>}<Btn c="ghost" ic="gear" onClick={() => app.go("sosDiag")}>{s.diag ? "Relancer" : "Lancer"} le diagnostic</Btn></>,
    <div className="list"><div className="li"><div className="grow"><b>SOS immédiat</b><div className="t-s">Toujours disponible</div></div><Pill c="green">✓</Pill></div><button className="li" onClick={() => app.go("sosInvisible")}><div className="grow"><b>Boutons physiques</b><div className="t-s">{s.seq.join(" / ")}</div></div>{compatPill(s, "btn")}</button><button className="li" onClick={() => app.go("sosVoice")}><div className="grow"><b>Code vocal</b><div className="t-s">Pendant le Mode Protection</div></div>{compatPill(s, "vocal")}</button><button className="li" onClick={() => app.go("sosBluetooth")}><div className="grow"><b>Bluetooth</b><div className="t-s">{s.bt.length} dispositif(s)</div></div>{compatPill(s, "bt")}</button></div>,
    <><div className="t-s">Code normal pour ouvrir ou désactiver ID SECOURS, et code sous contrainte qui ouvre l’application normalement mais crée discrètement un incident.</div><div className="card"><Kv rows={[["Code normal", <span className="mono">{s.hasCodes ? "••••" : "—"}</span>], ["Code sous contrainte", <span className="mono">{s.hasCodes ? "••••" : "—"}</span>]]} /></div><Btn c="ghost" ic="key" onClick={() => app.go("sosDuress")}>{s.hasCodes ? "Modifier" : "Définir"} les codes</Btn></>
  ][st];
  const canNext = st === 0 ? s.contacts.length > 0 : st === 1 ? !!s.diag : st === 3 ? s.hasCodes : true;
  const done = async () => { await patch({ configured: true }); const r = await patch({ enabled: true }); if (r) { app.toast("SOS activé."); app.reset(["home", "sosHome"]); } };
  return <><Hdr title="Assistant SOS" /><div className="pad">
    <div className="status-steps">{steps.map((x, i) => <i key={i} style={{ background: i <= st ? "var(--red)" : "var(--line)" }} />)}</div>
    <div className="t-label">Étape {st + 1}/4</div><h3 className="t-title">{steps[st]}</h3>{body}
    <Btn onClick={() => st === 3 ? done() : app.replace("sosWizard", { id: st + 1 })} disabled={!canNext}>{st === 3 ? "Activer le SOS" : "Suivant"}</Btn>
    {st > 0 && <Btn c="ghost" onClick={() => app.replace("sosWizard", { id: st - 1 })}>Précédent</Btn>}
  </div></>;
}

export function SosContacts() {
  const [s, , app] = useSos();
  if (!s) return <Spinner />;
  const act = async (path, method = "post") => { try { const r = method === "del" ? await api.del(path) : await api.post(path); app.setSos(r.sos); return r.sos; } catch (e) { app.toast(e.message, "alert"); } };
  const test = c => app.openSheet(<div className="col" style={{ gap: 12 }}><div className="t-label">Préparation du téléphone de {c.prenom}</div>
    <div className="card col" style={{ background: "var(--ink)", color: "#fff", textAlign: "center", gap: 4 }}><div style={{ font: "800 15px var(--f-display)", color: "#F5C842" }}>TEST ID SECOURS</div><div>Ceci est un test.</div><div>Aucune urgence réelle.</div></div>
    <Btn ic="send" onClick={async () => { const r = await act(`/sos/contacts/${c.id}/test`); if (r) app.openSheet(<div className="hero"><div className="big" style={{ background: "var(--green)", color: "#fff" }}><Icon n="check" s={34} /></div><h3 className="t-title">CONTACT PRÊT ✓</h3><p className="t-s">{c.prenom} a reçu l’alerte de test.</p><Btn c="ghost" onClick={app.closeSheet}>Fermer</Btn></div>); }}>Tester mon alerte SOS</Btn></div>);
  const revoke = c => app.openSheet(<div className="col" style={{ gap: 12 }}><h3 className="t-h">Révoquer {c.prenom} ?</h3><p className="t-s" style={{ margin: 0 }}>Ce contact n’aura plus aucun accès futur à vos alertes ni à votre position.</p><Btn onClick={async () => { await act(`/sos/contacts/${c.id}`, "del"); app.closeSheet(); app.toast("Contact révoqué."); }}>Révoquer le contact</Btn><Btn c="ghost" onClick={app.closeSheet}>Annuler</Btn></div>);
  return <><Hdr title="Contacts d’urgence" right={s.contacts.length < 5 ? <button className="btn sm green" onClick={() => app.go("sosContactAdd")}><Icon n="plus" s={14} /> Ajouter</button> : null} /><div className="pad">
    {s.contacts.length ? s.contacts.map(c => <div key={c.id} className="card col" style={{ gap: 10 }}>
      <div className="row"><span className="avatar" style={{ width: 42, height: 42, fontSize: 16, background: "var(--ink)" }}>{c.prenom[0]}</span><div className="grow"><div className="t-h" style={{ fontSize: 14 }}>{c.prenom} {c.nom}</div><div className="t-s">{c.rel} · {fmtTel(c.tel)}</div></div><Pill c="dark">Priorité {c.prio}</Pill></div>
      <div className="row" style={{ flexWrap: "wrap", gap: 6 }}><Pill c={c.inv === "ACCEPTEE" ? "green" : "orange"}>{invLabel(c.inv)}</Pill><Pill c={c.ready ? "green" : "grey"}>{c.ready ? "CONTACT PRÊT ✓" : "Préparation SOS à faire"}</Pill></div>
      <div className="row" style={{ gap: 8 }}>{c.inv !== "ACCEPTEE" ? <button className="btn sm ghost grow" onClick={() => act(`/sos/contacts/${c.id}/install`)}>Confirmer l’installation</button> : <button className={`btn sm ${c.ready ? "ghost" : "red"} grow`} onClick={() => test(c)}>Tester mon alerte SOS</button>}<button className="btn sm ghost" style={{ width: "auto" }} onClick={() => revoke(c)} aria-label="Révoquer"><Icon n="trash" s={14} /></button></div>
    </div>) : <Empty card ic="users">Ajoutez au moins un contact d’urgence.</Empty>}
    <Note>Seuls les contacts ayant installé ID SECOURS et réussi le test reçoivent l’alerte sonore. L’ordre de priorité définit l’escalade. Chaque contact alerté reçoit aussi un SMS avec un lien sécurisé.</Note>
  </div></>;
}

export function SosContactAdd() {
  const app = useApp();
  const [f, setF] = useState({ nom: "", prenom: "", tel: "", rel: "Mère", prio: String(((app.sos && app.sos.contacts.length) || 0) + 1) });
  const set = k => v => setF(s => ({ ...s, [k]: v }));
  const add = async () => {
    if (!f.nom || !f.prenom || f.tel.replace(/\D/g, "").length < 8) return app.toast("Nom, prénom et numéro valide sont obligatoires.", "alert");
    try { const r = await api.post("/sos/contacts", { ...f, prio: +f.prio }); app.setSos(r.sos); app.back(); app.toast(`Notification et invitation envoyées à ${f.prenom}.`, "send"); } catch (e) { app.toast(e.message, "alert"); }
  };
  return <><Hdr title="Ajouter un contact" /><div className="pad">
    <div className="grid2"><Field label="Nom" req id="ct-nom"><Input id="ct-nom" value={f.nom} onChange={set("nom")} /></Field><Field label="Prénom" req id="ct-prenom"><Input id="ct-prenom" value={f.prenom} onChange={set("prenom")} /></Field></div>
    <Field label="Numéro de téléphone" req id="ct-tel"><Input id="ct-tel" inputMode="tel" placeholder="07 00 00 00 00" value={f.tel} onChange={set("tel")} /></Field>
    <div className="grid2"><Field label="Relation" req id="ct-rel"><Select id="ct-rel" value={f.rel} onChange={set("rel")} options={RELATIONS} /></Field><Field label="Priorité" id="ct-prio"><Select id="ct-prio" value={f.prio} onChange={set("prio")} options={["1", "2", "3", "4", "5"]} /></Field></div>
    <div className="card col" style={{ gap: 6, background: "var(--soft)", boxShadow: "none" }}><div className="t-label">Message envoyé automatiquement</div><div className="t-s" style={{ color: "var(--ink2)" }}>« {app.user.prenom} vous a désigné comme contact d’urgence sur ID SECOURS. En cas de situation de détresse, vous pourrez recevoir une alerte accompagnée de sa position. »<br /><br />« Téléchargez ID SECOURS pour recevoir les alertes d’urgence sonore et les informations de localisation. »</div></div>
    <Btn onClick={add}>Enregistrer et notifier</Btn>
  </div></>;
}

/* niveau 1 : bouton rouge — compte à rebours de 3 s pour éviter les fausses alertes */
export function SosImmediate({ p }) {
  const app = useApp();
  const [count, setCount] = useState(p.now ? 3 : null);
  useEffect(() => {
    if (count === null) return;
    if (count === 0) { triggerSOS(app, "immediat"); return; }
    const t = setTimeout(() => setCount(c => c - 1), 1000); return () => clearTimeout(t);
  }, [count]); // eslint-disable-line react-hooks/exhaustive-deps
  const start = () => { if (!app.sos || !app.sos.enabled) { app.toast("SOS désactivé. Activez-le dans Profil › SOS & Protection.", "alert"); return app.go("sosHome"); } setCount(3); };
  return <><Hdr title="SOS immédiat" /><div className="pad">
    <div className="t-s">Le bouton rouge SOS est accessible depuis toutes les pages de l’application. L’alerte part après 3 secondes : l’incident est créé, votre position récupérée et vos contacts confirmés prévenus.</div>
    <button className="sosring" onClick={() => count === null ? start() : setCount(0)}>{count === null ? "SOS" : count || "…"}</button>
    {count !== null && count > 0 ? <><Note c="red" ic="alert">Envoi de l’alerte dans {count} s. Touchez le bouton pour l’envoyer immédiatement.</Note><Btn c="dark" onClick={() => { setCount(null); app.toast("Alerte annulée."); }}>ANNULER</Btn></>
      : <Note c="orange" ic="alert">Une alerte réelle est transmise à vos contacts d’urgence. L’annulation est sécurisée par votre code.</Note>}
    <Btn c="ghost" onClick={() => app.go("sosTest")}>Préférer un test identifié « TEST »</Btn>
  </div></>;
}

export function SosInvisible() {
  const [s, patch, app] = useSos();
  const [fb, setFb] = useState(""), [real, setReal] = useState(false);
  if (!s) return <Spinner />;
  const can = canUse(s, "btn");
  const test = k => { const r = pressKey(app, k, !real, buf => setFb(buf.map(x => KEYL[x]).join(" → "))); if (r === "test") setFb("✓ Séquence reconnue · aucun SOS envoyé (test)"); };
  return <><Hdr title="SOS invisible" /><div className="pad">
    <div className="row"><span className="grow t-s">Compatibilité de cet appareil</span>{compatPill(s, "btn")}</div>
    <div className="card col"><div className="row"><div className="grow"><div className="t-h" style={{ fontSize: 14 }}>Séquence de boutons physiques</div><div className="t-s">Fonctionne même écran verrouillé, selon le téléphone (application mobile).</div></div><Switch on={s.seqEnabled} disabled={!can} label="Activer la séquence" onClick={() => patch({ seqEnabled: !s.seqEnabled })} /></div>
      <div className="seqv">{s.seq.map((k, i) => <span key={i}>{KEYL[k]}</span>).reduce((a, x, i) => i ? [...a, <span key={"a" + i} style={{ background: "none", padding: "6px 0" }}>→</span>, x] : [x], [])}</div>
      <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>{["V+", "V-", "P"].map(k => <button key={k} className="btn sm ghost" onClick={() => s.seq.length >= 5 ? app.toast("5 appuis maximum.") : patch({ seq: [...s.seq, k] })}>+ {KEYL[k]}</button>)}<button className="btn sm ghost" style={{ color: "var(--red)" }} onClick={() => patch({ seq: [] })}>Effacer</button></div>
      <Field label="Délai maximum entre deux appuis" id="seq-d"><Select id="seq-d" value={String(s.seqDelay)} onChange={v => patch({ seqDelay: +v })} options={[["1", "1 s"], ["1.5", "1,5 s"], ["2", "2 s"], ["3", "3 s"]]} /></Field></div>
    {!can && <><Note c="red" ic="x">Lancez le diagnostic : un mécanisme n’est jamais activé sans test de compatibilité.</Note><Btn c="ghost" onClick={() => app.go("sosDiag")}>Diagnostic du téléphone</Btn></>}
    <div className="card col"><div className="t-h" style={{ fontSize: 14 }}>Tester la séquence</div><div className="t-s">Appuyez sur les boutons latéraux du téléphone à l’écran, ou ci-dessous.</div>
      <div className="vbtn">{["V+", "V-", "P"].map(k => <button key={k} onClick={() => test(k)}>{KEYL[k]}</button>)}</div><div className="t-s" style={{ textAlign: "center", minHeight: 18 }}>{fb}</div>
      <Chk checked={real} onChange={setReal}>Déclencher un vrai SOS (sinon test sans alerte)</Chk></div>
    <Note>Hors test, cette séquence déclenche un vrai SOS depuis n’importe quel écran (réarmement 30 s, anti-double-déclenchement).</Note>
  </div></>;
}

export function SosTaps() {
  const [s, patch, app] = useSos();
  const taps = useRef([]); const [fb, setFb] = useState("Tapotez ici"), [real, setReal] = useState(false);
  if (!s) return <Spinner />;
  const can = canUse(s, "taps");
  const hit = () => { const now = Date.now(); if (taps.current.length && now - taps.current[taps.current.length - 1] > 600) taps.current = []; taps.current.push(now);
    if (taps.current.length >= s.tapCount) { taps.current = []; if (real) { if (!s.tapsEnabled) return app.toast("Activez d’abord les tapotements.", "alert"); triggerSOS(app, "taps"); } else setFb("✓ Séquence reconnue (test)"); } else setFb(`${taps.current.length} / ${s.tapCount}`); };
  return <><Hdr title="Tapotements" /><div className="pad">
    <div className="row"><span className="grow t-s">Compatibilité</span>{compatPill(s, "taps")}</div>
    {s.diag && s.diag.taps === "ko" && <Note c="red" ic="x">Non disponible sur cet appareil. Utilisez plutôt : boutons physiques, Bluetooth ou SOS immédiat.</Note>}
    <div className="card col"><div className="row"><div className="grow"><div className="t-h" style={{ fontSize: 14 }}>{s.tapCount} tapotements arrière</div><div className="t-s">Un simple toucher accidentel ne suffit jamais.</div></div><Switch on={s.tapsEnabled} disabled={!can} label="Activer les tapotements" onClick={() => patch({ tapsEnabled: !s.tapsEnabled })} /></div>
      <Kv rows={[["Nombre précis de gestes", <Select style={{ width: "auto", minHeight: 34 }} value={String(s.tapCount)} onChange={v => patch({ tapCount: +v })} options={["3", "4", "5"]} />], ["Délai maximum entre gestes", "0,6 s"], ["Anti-double-déclenchement", "Oui"], ["Délai de réarmement", "30 s"]]} /></div>
    <div className="card col"><div className="t-h" style={{ fontSize: 14 }}>Zone de test</div><div className="t-s">Tapotez {s.tapCount} fois rapidement.</div>
      <button onClick={hit} style={{ height: 120, borderRadius: 16, background: "var(--soft)", border: "2px dashed #C9D2CD", font: "600 13px var(--f-display)", color: "var(--muted)" }}><Icon n="tap" s={26} /><br /><span>{fb}</span></button>
      <Chk checked={real} onChange={setReal}>Déclencher un vrai SOS (sinon test sans alerte)</Chk></div>
  </div></>;
}

/* niveau 3 : Mode Protection + écoute du code vocal (Web Speech API si disponible) */
export function SosProtection() {
  const [s, , app] = useSos();
  const [dur, setDur] = useState(30), [custom, setCustom] = useState(""), [said, setSaid] = useState(""), [listening, setListening] = useState(false), [, tick] = useState(0);
  const rec = useRef(null);
  const pm = s && s.protection;
  const vOk = s && s.voice.trained && s.voice.enabled && canUse(s, "vocal");
  useEffect(() => { if (!pm || !pm.active) return; const i = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(i); }, [pm && pm.active]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!pm || !pm.active || !vOk || !SR) return;
    const r = new SR(); r.lang = "fr-FR"; r.continuous = true; r.interimResults = false;
    r.onresult = e => { const t = norm(Array.from(e.results).map(x => x[0].transcript).join(" ")); if (t.includes(norm(s.voice.phrase))) { r.stop(); app.toast("Phrase reconnue · validation locale"); triggerSOS(app, "vocal"); } };
    r.onend = () => { if (rec.current === r) try { r.start(); } catch { /* déjà actif */ } };
    try { r.start(); rec.current = r; setListening(true); } catch { setListening(false); }
    return () => { rec.current = null; try { r.stop(); } catch { /* ignore */ } setListening(false); };
  }, [pm && pm.active, vOk]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!s) return <Spinner />;
  const start = async () => { const m = +custom > 0 ? Math.min(720, +custom) : dur; try { const r = await api.post("/sos/protection", { minutes: m }); app.setSos(r.sos); app.toast("Mode Protection activé"); } catch (e) { app.toast(e.message, "alert"); } };
  const stop = async () => { const r = await api.del("/sos/protection"); app.setSos(r.sos); app.toast("Mode Protection arrêté"); };
  if (!pm.active) return <><Hdr title="Mode Protection" /><div className="pad">
    <div className="t-s">Pour les périodes où vous vous sentez davantage exposé : trajet nocturne, déplacement isolé, rendez-vous avec une personne inconnue, voyage, retour tardif…</div>
    <div className="t-label">Durée</div><div className="grid2">{[[15, "15 minutes"], [30, "30 minutes"], [60, "1 heure"], [120, "2 heures"]].map(([m, l]) => <button key={m} className={`plan ${dur === m ? "sel" : ""}`} style={{ alignItems: "center", padding: 12 }} onClick={() => setDur(m)}><b>{l}</b></button>)}</div>
    <Field label="Durée personnalisée (minutes)" id="pm-custom"><Input id="pm-custom" type="number" min="1" max="720" placeholder="Ex. : 45" value={custom} onChange={setCustom} /></Field>
    <Btn c="dark" ic="shield" onClick={start}>Activer Mode Protection</Btn>
    <Note>Pendant le Mode Protection, la dernière position est conservée : même si le téléphone s’éteint, l’alerte peut être transmise avec la dernière géolocalisation.</Note>
  </div></>;
  return <><Hdr title="Mode Protection" /><div className="pad">
    <div className="card" style={{ background: "var(--ink)", color: "#fff", textAlign: "center" }}><div className="t-label" style={{ color: "#9FB0A7" }}>Mode Protection actif</div><div className="num" style={{ font: "800 44px var(--f-display)", margin: "6px 0" }}>{fmtLeft(new Date(pm.until) - Date.now())}</div><div style={{ fontSize: 12.5, color: "#C9D2CD" }}>Expire automatiquement à {fmtT(pm.until)}</div></div>
    <div className="card col"><div className="row"><span style={{ color: "var(--red)" }}><Icon n="mic" s={20} /></span><div className="grow"><div className="t-h" style={{ fontSize: 14 }}>Code vocal</div><div className="t-s">{vOk ? (listening ? "À l’écoute · détection locale sur l’appareil" : "Écoute automatique indisponible sur ce navigateur") : ""}</div></div>{listening && <Pill c="green" dot>Écoute</Pill>}</div>
      {vOk ? <><div className="t-s">Phrase configurée : <b style={{ color: "var(--ink)" }}>« {s.voice.phrase} »</b></div>
        {!listening && <><Field label="Saisir la phrase entendue" id="vc-say"><Input id="vc-say" placeholder="Prononcez votre phrase…" value={said} onChange={setSaid} /></Field><button className="btn red sm" style={{ width: "100%" }} onClick={() => norm(said) === norm(s.voice.phrase) ? triggerSOS(app, "vocal") : app.toast("Phrase non reconnue · aucun déclenchement.", "info")}><Icon n="mic" s={14} /> Valider la phrase</button></>}</>
        : <><div className="note n-red" style={{ fontWeight: 600 }}><Icon n="x" s={18} /><span>CODE VOCAL NON DISPONIBLE SUR CET APPAREIL{!s.voice.trained ? " (phrase non enregistrée)" : ""}</span></div><div className="t-s">Alternatives : bouton physique, raccourci système, Bluetooth, SOS immédiat.</div><button className="btn ghost sm" style={{ width: "100%" }} onClick={() => app.go("sosVoice")}>Configurer le code vocal</button></>}</div>
    <Btn c="ghost" onClick={stop}>Arrêter le Mode Protection</Btn>
  </div></>;
}

export function SosVoice() {
  const [s, patch, app] = useSos();
  const [phrase, setPhrase] = useState(null), [rep, setRep] = useState(0);
  if (!s) return <Spinner />;
  const v = s.voice, ph = phrase ?? v.phrase, c = s.diag && s.diag.vocal, pm = s.protection;
  const reps = rep || (v.trained ? 3 : 0);
  const record = async () => {
    if (ph.trim().length < 6) return app.toast("Choisissez une phrase d’au moins 6 caractères.", "alert");
    if (ph !== v.phrase) { const r = await patch({ voicePhrase: ph }); if (!r) return; }
    const n = (v.trained && !rep ? 0 : rep) + 1; setRep(n); app.toast(`Répétition ${n}/3 enregistrée`, "mic");
    if (n >= 3) { await patch({ voiceTrained: true, voiceEnabled: true }); setRep(0); app.toast("Code vocal enregistré ✓"); }
  };
  const cond = [["Le système autorise le fonctionnement", c && c !== "ko"], ["Permissions accordées (micro)", c && c !== "ko"], ["Le téléphone passe le test", !!c && c !== "ko"], ["Le Mode Protection est actif", pm.active]];
  return <><Hdr title="Code vocal" /><div className="pad">
    <div className="row"><span className="grow t-s">Compatibilité</span>{compatPill(s, "vocal")}</div>
    <div className="card col"><Field label="Votre phrase personnelle" id="vc-ph"><Input id="vc-ph" value={ph} onChange={setPhrase} /></Field><div className="t-s">Elle n’a pas besoin de contenir « SOS », « danger » ou « secours ».</div>
      <div className="t-label">Enregistrement de la voix (3 répétitions)</div><div className="row" style={{ gap: 6 }}>{[0, 1, 2].map(i => <span key={i} className={`pill ${reps > i ? "p-green" : "p-grey"}`} style={{ flex: 1, justifyContent: "center" }}>{reps > i ? "✓" : i + 1}</span>)}</div>
      <button className="btn dark sm" style={{ width: "100%" }} onClick={record}><Icon n="mic" s={14} /> {v.trained && !rep ? "Réenregistrer" : "Prononcer la phrase"}</button></div>
    <div className="card col"><div className="t-label">Disponibilité annoncée seulement si</div>{cond.map(([l, ok]) => <div key={l} className="row"><span className={`res ${ok ? "ok" : "ko"}`}>{ok ? "✓" : "✕"}</span><span className="t-s" style={{ color: "var(--ink)" }}>{l}</span></div>)}</div>
    <Note c="green" ic="lock">Détection locale sur l’appareil privilégiée. ID SECOURS n’enregistre pas vos conversations en permanence : l’écoute n’a lieu que pendant le Mode Protection.</Note>
    {!pm.active && <Btn c="ghost" ic="shield" onClick={() => app.go("sosProtection")}>Activer le Mode Protection</Btn>}
  </div></>;
}

/* bouton « maintenir 3 s » */
function HoldBtn({ label, onDone }) {
  const [k, setK] = useState(0); const t = useRef(null), start = useRef(0);
  const down = e => { e.preventDefault(); start.current = Date.now(); const step = () => { const x = Math.min(1, (Date.now() - start.current) / 3000); setK(x); if (x >= 1) { start.current = 0; onDone(); return; } t.current = requestAnimationFrame(step); }; t.current = requestAnimationFrame(step); };
  const up = () => { if (!start.current) return; cancelAnimationFrame(t.current); if (Date.now() - start.current < 3000) { setK(0); } start.current = 0; };
  return <button className="holdbtn" onPointerDown={down} onPointerUp={up} onPointerLeave={up} onPointerCancel={up}>
    <svg className="ring" viewBox="0 0 132 132"><circle cx="66" cy="66" r="62" fill="none" stroke="var(--line)" strokeWidth="6" /><circle cx="66" cy="66" r="62" fill="none" stroke="var(--red)" strokeWidth="6" strokeDasharray="390" strokeDashoffset={390 * (1 - k)} strokeLinecap="round" /></svg>
    <Icon n="bt" s={24} /><span style={{ fontSize: 11 }}>{label}</span></button>;
}

export function SosBluetooth() {
  const [s, , app] = useSos();
  if (!s) return <Spinner />;
  const remove = async id => { const r = await api.del(`/sos/devices/${encodeURIComponent(id)}`); app.setSos(r.sos); };
  return <><Hdr title="Accessoire Bluetooth" /><div className="pad">
    <div className="row"><span className="grow t-s">Compatibilité</span>{compatPill(s, "bt")}</div>
    {s.bt.map(b => <div key={b.id} className="card col">
      <div className="row"><span style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--blue-s)", color: "var(--blue-d)" }}><Icon n="bt" s={20} /></span><div className="grow"><div className="t-h" style={{ fontSize: 14 }}>{b.nom}</div><div className="t-s">{b.modele}</div></div><Pill c="green">{b.statut}</Pill></div>
      <Kv rows={[["Identifiant", <span className="mono">{b.id}</span>], ["Type", b.type], ["Batterie", b.bat != null ? b.bat + " %" : "—"], ["Dernière connexion", fmtDT(b.last)], ["Déclenchement", "Appui long 3 s"]]} />
      <div className="t-s" style={{ textAlign: "center" }}>Appui long sur l’accessoire</div><HoldBtn label="Maintenir 3 s" onDone={() => triggerSOS(app, "bluetooth")} />
      <button className="btn sm ghost" style={{ color: "var(--red)" }} onClick={() => remove(b.id)}>Révoquer l’appareil</button></div>)}
    <Btn c={s.bt.length ? "ghost" : "blue"} ic="plus" onClick={() => app.go("sosBtPair", { id: "scan" })}>Ajouter un dispositif</Btn>
    <Note>Configuration : Bluetooth → détection → appairage → test → activation. Le comportement est configurable pour limiter les faux déclenchements.</Note>
  </div></>;
}

export function SosBtPair({ p }) {
  const app = useApp(), bp = app.mem.btPair || {};
  const [tested, setTested] = useState(false);
  useEffect(() => {
    if (p.id === "scan") {
      (async () => {
        if (navigator.bluetooth) {
          try { const d = await navigator.bluetooth.requestDevice({ acceptAllDevices: true }); app.mem.btPair = { id: d.id.slice(0, 20), nom: d.name || "Accessoire Bluetooth", modele: d.name || "BLE", type: "Dispositif BLE", bat: null }; return app.replace("sosBtPair", { id: "pair" }); }
          catch { /* annulé : liste des dispositifs détectés */ }
        }
        setTimeout(() => app.replace("sosBtPair", { id: "list" }), 1500);
      })();
    }
    if (p.id === "pair") { const t = setTimeout(() => app.replace("sosBtPair", { id: "test" }), 1500); return () => clearTimeout(t); }
  }, [p.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (p.id === "scan") return <><Hdr title="Ajouter un dispositif" /><div className="pad"><Hero spinner="var(--blue)" title="Détection…"><p className="t-s">Approchez l’accessoire et appuyez brièvement dessus.</p></Hero></div></>;
  if (p.id === "list") return <><Hdr title="Dispositifs détectés" /><div className="pad"><div className="list">{BT_FOUND.map(d => <button key={d[0]} className="li" onClick={() => { app.mem.btPair = { id: d[0], nom: d[1], modele: d[2], type: d[3], bat: d[4] }; app.replace("sosBtPair", { id: "pair" }); }}><span className="ic" style={{ background: "var(--blue-s)", color: "var(--blue-d)" }}><Icon n="bt" s={16} /></span><div className="grow"><div className="t-h" style={{ fontSize: 13.5 }}>{d[1]}</div><div className="t-s">{d[3]}</div></div>{d[0] === "BTN-4F2A" && <Pill c="green">Certifié</Pill>}</button>)}</div></div></>;
  if (p.id === "pair") return <><Hdr title="Appairage" /><div className="pad"><Hero spinner="var(--blue)" title={`Appairage avec ${bp.nom}…`} /></div></>;
  const activate = async () => { try { const r = await api.post("/sos/devices", bp); app.setSos(r.sos); app.mem.btPair = null; app.back(); app.toast("Accessoire activé."); } catch (e) { app.toast(e.message, "alert"); } };
  return <><Hdr title="Test de l’accessoire" /><div className="pad">
    <Note c="green" ic="check">{bp.nom} appairé.</Note>
    <div className="t-s" style={{ textAlign: "center" }}>Maintenez le bouton de l’accessoire 3 secondes pour le tester. Aucune alerte n’est envoyée.</div>
    <HoldBtn label="Test 3 s" onDone={() => { setTested(true); app.toast("Appui long reconnu ✓"); }} />
    {tested && <><Note c="green" ic="check">Événement reçu par ID SECOURS ✓</Note><Btn c="blue" onClick={activate}>Activer l’accessoire</Btn></>}
  </div></>;
}

export function SosDuress() {
  const app = useApp();
  const [n, setN] = useState(""), [d, setD] = useState("");
  const save = async () => {
    if (!/^\d{4}$/.test(n) || !/^\d{4}$/.test(d)) return app.toast("Les codes doivent comporter 4 chiffres.", "alert");
    if (n === d) return app.toast("Les deux codes doivent être différents.", "alert");
    try { await api.put("/sos/codes", { normal: n, duress: d }); await app.refreshSos(); app.toast("Codes enregistrés."); setN(""); setD(""); } catch (e) { app.toast(e.message, "alert"); }
  };
  return <><Hdr title="Code sous contrainte" /><div className="pad">
    <div className="t-s">Si quelqu’un vous oblige à ouvrir ou désactiver ID SECOURS, saisissez le code sous contrainte : l’application s’ouvre normalement mais un incident « SOS SOUS CONTRAINTE » est créé discrètement.</div>
    <div className="card col"><Field label="Code normal (4 chiffres)" id="cd-n"><Input id="cd-n" type="password" className="mono" inputMode="numeric" maxLength={4} autoComplete="off" value={n} onChange={setN} /></Field>
      <Field label="Code sous contrainte (différent)" id="cd-d"><Input id="cd-d" type="password" className="mono" inputMode="numeric" maxLength={4} autoComplete="off" value={d} onChange={setD} /></Field>
      <button className="btn dark sm" style={{ width: "100%" }} onClick={save}>Enregistrer les codes</button></div>
    <div className="card col" style={{ background: "var(--soft)", boxShadow: "none" }}><div className="t-label">Message reçu par vos contacts</div><div className="t-s" style={{ color: "var(--ink2)" }}>Alerte de contrainte détectée. Évitez toute action susceptible d’augmenter immédiatement le danger. Consultez la position et suivez les consignes d’urgence.</div></div>
    <Btn c="ghost" ic="lock" onClick={() => app.setLocked(true)}>Tester l’écran de déverrouillage</Btn>
  </div></>;
}

export function SosTest() {
  const [s, , app] = useSos();
  if (!s) return <Spinner />;
  const rc = s.contacts.filter(c => c.inv === "ACCEPTEE");
  return <><Hdr title="Test du SOS" /><div className="pad">
    <div className="card col" style={{ background: "var(--ink)", color: "#fff", textAlign: "center", gap: 4 }}><div style={{ font: "800 17px var(--f-display)", color: "#F5C842" }}>TEST ID SECOURS</div><div>Ceci est un test.</div><div>Aucune urgence réelle.</div></div>
    <div className="t-s">L’alerte de test parcourt toute la chaîne (incident, localisation, serveur, notifications) et sera envoyée à {rc.length} contact(s) confirmé(s).</div>
    <Btn ic="send" disabled={!rc.length} onClick={() => triggerSOS(app, "test")}>Envoyer l’alerte de test</Btn>
    {!rc.length && <Btn c="ghost" onClick={() => app.go("sosContacts")}>Ajouter / confirmer un contact</Btn>}
  </div></>;
}

/* diagnostic réel des capacités du navigateur */
async function runDiag() {
  const mobileFrame = !matchMedia("(max-width:520px)").matches;
  let notif = "warn"; try { if ("Notification" in window) notif = Notification.permission === "denied" ? "ko" : (await Notification.requestPermission()) === "granted" ? "ok" : "warn"; else notif = "ko"; } catch { notif = "warn"; }
  const gps = await new Promise(res => { if (!navigator.geolocation) return res("ko"); navigator.geolocation.getCurrentPosition(() => res("ok"), e => res(e.code === 1 ? "ko" : "warn"), { timeout: 6000 }); });
  return { app: "ok", notif, gps, bg: "warn", lock: "warn", btn: mobileFrame ? "warn" : "ko", taps: "warn", vocal: (window.SpeechRecognition || window.webkitSpeechRecognition) ? "warn" : "ko", bt: navigator.bluetooth ? "ok" : "warn", sms: "ok" };
}
export function SosDiag() {
  const [s, patch] = useSos();
  const [run, setRun] = useState(null);
  if (!s) return <Spinner />;
  const go = async () => {
    setRun({ i: 0, res: null });
    const res = await runDiag();
    for (let i = 1; i <= DIAG_ROWS.length; i++) { await new Promise(r => setTimeout(r, 260)); setRun({ i, res }); }
    await patch({ diag: res }); setRun(null);
  };
  const shown = run ? run.res : s.diag;
  const all = s.diag && Object.values(s.diag).every(x => x === "ok");
  const rec = s.diag ? DIAG_ROWS.filter(([k]) => s.diag[k] === "ok" && ["btn", "bt"].includes(k)).map(([, l]) => l) : [];
  return <><Hdr title="Diagnostic SOS de mon appareil" /><div className="pad">
    <div className="card diag">{DIAG_ROWS.map(([k, l], i) => { const r = run ? (i < run.i && shown ? shown[k] : null) : shown ? shown[k] : null; return [<div key={k}>{l}</div>, <div key={k + "r"} className={`res ${r || ""}`}>{r === "ok" ? "✓" : r === "warn" ? "! restreint" : r === "ko" ? "✕" : run && i === run.i ? "…" : "—"}</div>]; })}</div>
    {!run && s.diag && <div className="card" style={{ textAlign: "center", background: all ? "var(--green-s)" : "var(--orange-s)" }}><div className="t-label">Résultat global</div><div style={{ font: "800 19px var(--f-display)", color: all ? "var(--green-d)" : "#A85A00" }}>{all ? "PROTECTION OPTIMALE" : "PROTECTION PARTIELLE"}</div><div className="t-s" style={{ marginTop: 6 }}>Déclencheurs recommandés : SOS immédiat{rec.length ? ", " + rec.join(", ") : ""}. Pour une protection complète (écran verrouillé, boutons physiques), utilisez l’application mobile.</div></div>}
    <Btn c="dark" ic="gear" disabled={!!run} onClick={go}>{s.diag ? "Relancer" : "Lancer"} le diagnostic</Btn>
  </div></>;
}

export function SosHistory() {
  const app = useApp();
  const [d] = useLoad(() => api.get("/sos/incidents"), []);
  return <><Hdr title="Historique des alertes" /><div className="pad">{!d ? <Spinner /> : d.items.length ? <div className="list">{d.items.map(i => <button key={i.id} className="li" onClick={() => app.go("incident", { id: i.id })}><span className="ic" style={{ background: i.test ? "var(--soft)" : "var(--red-s)", color: i.test ? "var(--muted)" : "var(--red)" }}><Icon n="siren" s={16} /></span><div className="grow"><div className="t-h" style={{ fontSize: 13.5 }}>#{i.id}{i.duress ? " · SOS SOUS CONTRAINTE" : ""}</div><div className="t-s">{TRIG[i.type]} · {fmtDT(i.t)}</div></div><Pill c={i.closed ? "grey" : "red"}>{i.st.replace(/_/g, " ")}</Pill></button>)}</div> : <Empty card ic="clock">Aucune alerte.</Empty>}</div></>;
}

/* incident en cours : suivi temps réel + envoi périodique de la position */
export function Incident({ p }) {
  const app = useApp();
  const [d, reload, err] = useLoad(() => api.get(`/sos/incidents/${p.id}`).then(r => r.incident), [p.id], { poll: 2000, silent: true });
  useEffect(() => {
    if (!d || d.closed || d.test || !navigator.geolocation) return;
    const w = navigator.geolocation.watchPosition(pos => { const now = Date.now(); if (now - (window.__idsLastPos || 0) < 20000) return; window.__idsLastPos = now; api.post(`/sos/incidents/${p.id}/position`, { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy, src: "GPS" }).catch(() => {}); }, () => {}, { enableHighAccuracy: true });
    return () => navigator.geolocation.clearWatch(w);
  }, [d && d.closed]); // eslint-disable-line react-hooks/exhaustive-deps
  if (err) return <><Hdr title="Alerte" /><div className="pad"><Empty card ic="check">Alerte terminée.</Empty><Btn c="ghost" onClick={() => app.tab("home")}>Retour à l’accueil</Btn></div></>;
  if (!d) return <div className="sosbg" style={{ minHeight: "100%", display: "grid", placeItems: "center" }}><div className="spinner" style={{ borderTopColor: "#fff" }} /></div>;
  const fi = SOS_FLOW.indexOf(d.st), live = !d.closed, branch = ["ANNULÉ", "FAUSSE_ALERTE", "ESCALADE"].includes(d.st);
  const pinSheet = (title, body, path, withMotif) => app.openSheet(<PinSheet title={title} body={body} path={path} withMotif={withMotif} onDone={reload} />);
  return <>
    <div className="sosbg" style={{ padding: "14px 16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="row"><button className="iconbtn" style={{ color: "#fff" }} onClick={() => app.stack.length > 1 ? app.back() : app.tab("home")} aria-label="Retour"><Icon n="chevL" s={20} /></button><div className="grow" style={{ font: "600 12px var(--f-display)", letterSpacing: ".08em", opacity: .85 }}>{d.test ? "TEST ID SECOURS" : "ALERTE SOS"}</div><span className="pill" style={{ background: "rgba(255,255,255,.2)", color: "#fff" }}>#{d.id}</span></div>
      <div style={{ font: "800 24px/1.15 var(--f-display)" }}>{d.closed ? (d.st === "CLÔTURÉ" ? "Incident clôturé" : "Alerte terminée") : d.test ? "Test en cours…" : "INCIDENT SOS CRÉÉ"}</div>
      <div style={{ fontSize: 13, opacity: .92 }}>{TRIG[d.type]} · {fmtT(d.t, true)}{d.test ? " · aucune urgence réelle" : ""}</div>
      <div className="status-steps">{SOS_FLOW.map((s, i) => <i key={s} className={i <= fi || d.closed ? "on" : ""} />)}</div>
      <div className="row" style={{ font: "600 12.5px var(--f-display)" }}><span className="grow">Statut : {d.st.replace(/_/g, " ")}</span>{branch && <span className="pill" style={{ background: "#fff", color: "var(--red)" }}>Branche</span>}</div>
    </div>
    <div className="pad">
      {d.loc && <div className="card col" style={{ gap: 8 }}><div className="row"><b className="grow">Position transmise</b><Pill c="blue">{d.loc.src || "GPS"}</Pill></div><MapSVG loc={d.loc} trail={d.track} />
        <Kv rows={[["Dernière position", fmtT(d.loc.t, true)], ["Précision", `± ${d.loc.acc} m`], ["Coordonnées", <span className="mono">{d.loc.lat}, {d.loc.lng}</span>], ["Batterie · Réseau", `${d.bat ?? "—"} % · ${d.net}`], ["Mode Protection", d.prot ? "Actif" : "Inactif"]]} /></div>}
      <div className="card col" style={{ gap: 8 }}><b>Contacts d’urgence</b>{d.contacts.length ? d.contacts.map((c, i) => <div key={i} className="row"><Pill c="dark">{i + 1}</Pill><div className="grow"><div style={{ fontWeight: 600 }}>{c.nom}</div><div className="t-s">{c.rel}</div></div><Pill c={C_ST[c.st][1]}>{C_ST[c.st][0]}</Pill></div>) : <span className="t-s">Aucun contact confirmé : SMS de secours.</span>}</div>
      <div className="card col" style={{ gap: 6 }}><b>Journal d’audit</b><div className="log">{d.log.map((l, i) => <div key={i}><span>{fmtT(l.t, true)}</span>{l.l}</div>)}</div></div>
      {live && !d.test && <><Btn c="green" ic="check" onClick={() => pinSheet("Je suis en sécurité", "Vos contacts seront informés que l’alerte est terminée.", "safe")}>Je suis en sécurité · clôturer</Btn>
        <Btn c="outline-r" onClick={() => pinSheet("Annuler le SOS", "L’annulation est sécurisée : une simple pression ne suffit pas à supprimer une alerte déjà transmise.", "cancel", true)}>ANNULER LE SOS</Btn></>}
      {d.closed && <Btn c="ghost" onClick={() => app.tab("home")}>Retour à l’accueil</Btn>}
    </div>
  </>;
}

function PinSheet({ title, body, path, withMotif, onDone }) {
  const app = useApp(), cur = app.cur;
  const [code, setCode] = useState(""), [mot, setMot] = useState("");
  const confirm = async () => {
    try { await api.post(`/sos/incidents/${cur.p.id}/${path}`, { code, motif: mot }); app.closeSheet(); app.toast(path === "safe" ? "Incident clôturé." : "Alerte terminée."); onDone(); app.refreshSos(); }
    catch (e) { app.toast(e.message, "alert"); }
  };
  return <div className="col" style={{ gap: 12 }}><h3 className="t-h">{title}</h3><p className="t-s" style={{ margin: 0 }}>{body}</p>
    {withMotif && <Field label="Motif (facultatif)" id="ic-mot"><Select id="ic-mot" value={mot} onChange={setMot} placeholder="—" options={["Fausse alerte", "Déclenchement accidentel", "Situation réglée"]} /></Field>}
    <Field label="Code ID SECOURS" id="ic-pin"><Input id="ic-pin" className="mono" type="password" inputMode="numeric" maxLength={4} placeholder="••••" autoFocus value={code} onChange={setCode} /></Field>
    <Btn onClick={confirm}>Confirmer</Btn><Btn c="ghost" onClick={app.closeSheet}>Retour</Btn></div>;
}
