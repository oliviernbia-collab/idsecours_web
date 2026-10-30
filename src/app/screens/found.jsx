/* J'ai trouvé un document (§40–§59) — accessible sans abonnement */
import { useState } from "react";
import { useApp } from "../store.jsx";
import { api, form, compress } from "../../lib/api.js";
import { locate } from "../../lib/geo.js";
import Icon from "../../ui/Icon.jsx";
import { Hdr, Btn, Field, Input, Select, Note, Hero, Kv, Pill, Spinner, Timeline, PhotoPick, LocBlock, useLoad, Qr } from "../../ui/common.jsx";
import { COMMUNES, SLOTS } from "@shared/constants.js";
import { fmtD, fmtT } from "@shared/format.js";
import { FeedbackBox } from "./feedback.jsx";

export function Found() {
  const app = useApp();
  const f = app.mem.found || (app.mem.found = { cat: "CNI", num: "", nom: "", photos: {}, files: {} });
  const [, force] = useState(0);
  const set = k => v => { f[k] = v; force(x => x + 1); };
  const check = async () => {
    if (!f.num.trim() && !f.nom.trim()) return app.toast("Indiquez au moins le numéro ou le nom visible.", "alert");
    try { const r = await api.post("/found/check", { num: f.num }); f.registered = r.registered; app.go("fdControl"); } catch (e) { app.toast(e.message, "alert"); }
  };
  return <>
    {app.user ? <Hdr title="J’ai trouvé un document" /> : <Hdr title="J’ai trouvé un document" onBack={() => app.reset(["welcome"])} />}
    <div className="pad">
      <Note c="green" ic="heart">Merci pour votre geste. Accessible sans abonnement. Vous ne serez jamais mis en relation directe avec le propriétaire.</Note>
      <Field label="Type" req id="fd-cat"><Select id="fd-cat" value={f.cat} onChange={set("cat")} options={app.cat ? app.cat.cats.map(c => [c.code, c.label]) : []} /></Field>
      <Field label="Numéro (si lisible)" id="fd-num"><Input id="fd-num" className="mono" placeholder="Ex. : CI0011223344" value={f.num} onChange={set("num")} /></Field>
      <Field label="Nom visible" id="fd-nom"><Input id="fd-nom" placeholder="Nom et prénom(s) inscrits" value={f.nom} onChange={set("nom")} /></Field>
      {!app.user && <Field label="Votre téléphone (pour organiser la collecte)" id="fd-tel"><Input id="fd-tel" inputMode="tel" placeholder="07 00 00 00 00" value={f.tel} onChange={set("tel")} /></Field>}
      <div className="grid2">{["recto", "verso"].map(k => <PhotoPick key={k} label={"PHOTO " + k.toUpperCase()} value={f.photos[k]} onPick={async file => { const c = await compress(file); f.files[k] = c; f.photos[k] = c.preview; force(x => x + 1); }} />)}</div>
      <Btn c="green" ic="search" onClick={check}>Vérifier / Signaler</Btn>
      <div style={{ height: 50 }} />
    </div>
  </>;
}

export function FdControl() {
  const app = useApp(), f = app.mem.found;
  const [, force] = useState(0);
  if (!f) return <Found />;
  const setLoc = l => { f.loc = l; force(x => x + 1); };
  const submit = async () => {
    try {
      const r = await api.post("/found", form({ cat: f.cat, num: f.num, nom: f.nom, tel: f.tel, lat: f.loc.lat, lng: f.loc.lng, acc: f.loc.acc, commune: f.loc.commune, recto: f.files.recto, verso: f.files.verso }));
      await api.rememberAccess(r.ref, r.token);
      app.mem.found = null; app.reset([app.user ? "home" : "welcome"]); app.go("foundOk", { id: r.ref });
    } catch (e) { app.toast(e.message, "alert"); }
  };
  return <>
    <Hdr title="Contrôle" />
    <div className="pad">
      <Hero ic={f.registered ? "shieldck" : "doc"} size={34} bg={f.registered ? "var(--green-s)" : "var(--blue-s)"} color={f.registered ? "var(--green-d)" : "var(--blue-d)"} title={f.registered ? "DOCUMENT RECONNU" : "DOCUMENT NON ENREGISTRÉ"}>
        <p className="t-s">{f.registered ? "Ce document est enregistré dans ID SECOURS. Aucune coordonnée privée du propriétaire n’est communiquée." : "Ce document peut être signalé et collecté malgré l’absence d’abonnement de son propriétaire."}</p></Hero>
      {f.loc ? <LocBlock loc={f.loc} title="Lieu de la trouvaille" /> : <div className="card col"><div className="t-h" style={{ fontSize: 14 }}>Géolocalisation du document trouvé</div><div className="t-s">Avec votre consentement : latitude, longitude, date, heure et précision.</div>
        <Btn c="outline-g" sm style={{ width: "100%" }} onClick={async () => setLoc(await locate())}>J’autorise la géolocalisation</Btn>
        <Select value="" onChange={async v => v && setLoc(await locate(v))} placeholder="… ou choisir la commune" options={COMMUNES} /></div>}
      <Btn c="green" onClick={submit} disabled={!f.loc}>Confirmer le signalement</Btn>
    </div>
  </>;
}

const collect = async (app, ref, body) => { try { await api.post(`/found/${ref}/collect`, body); app.reset([app.user ? "home" : "welcome"]); app.go("collecte", { id: ref }); } catch (e) { app.toast(e.message, "alert"); } };

export function FoundOk({ p }) {
  const app = useApp();
  const later = () => app.openSheet(<div className="col" style={{ gap: 10 }}><h3 className="t-h">Proposer un créneau</h3>{SLOTS.map(s => <Btn key={s} c="ghost" onClick={() => { app.closeSheet(); collect(app, p.id, { slot: s }); }}>{s}</Btn>)}</div>);
  return <div className="pad">
    <Hero ic="heart" bg="var(--green)" color="#fff" title="Signalement enregistré"><span className="ref">{p.id}</span><p className="t-s">Merci pour votre geste. ID SECOURS va organiser la prise en charge du document.</p></Hero>
    <div className="card col"><div className="t-h" style={{ fontSize: 14 }}>Demande de collecte</div><div className="t-s">Êtes-vous disponible pour remettre le document à un partenaire de collecte ?</div>
      <Btn c="green" onClick={() => collect(app, p.id, {})}>Oui, je suis disponible</Btn>
      <Btn c="ghost" onClick={() => app.go("colPos", { id: p.id })}>Modifier ma position</Btn>
      <Btn c="ghost" onClick={later}>Proposer plus tard</Btn></div>
    <Btn c="ghost" ic="msg" onClick={() => app.go("chat", { id: p.id })}>Discuter avec l’agence</Btn>
  </div>;
}

export function ColPos({ p }) {
  const app = useApp();
  const [data] = useLoad(() => api.get(`/found/${p.id}`), [p.id]);
  const [com, setCom] = useState(null), [rep, setRep] = useState("");
  if (!data) return <><Hdr title="Position de collecte" /><Spinner /></>;
  const f = data.found;
  return <><Hdr title="Position de collecte" /><div className="pad">
    <LocBlock loc={{ ...f.loc, t: f.t }} title="Point de collecte actuel" />
    <Btn c="green" ic="pin" onClick={async () => { const l = await locate(); collect(app, p.id, l); }}>Utiliser ma position actuelle</Btn>
    <div className="card col"><div className="t-h" style={{ fontSize: 14 }}>Modifier le point de collecte</div>
      <Select value={com || f.loc.commune} onChange={setCom} options={COMMUNES} />
      <Input placeholder="Repère : pharmacie, carrefour, école…" value={rep} onChange={setRep} />
      <button className="btn ghost sm" onClick={async () => { const l = await locate(com || f.loc.commune); collect(app, p.id, { ...l, repere: rep }); }}>Enregistrer ce point</button></div>
  </div></>;
}

export function Collecte({ p }) {
  const app = useApp();
  const [data] = useLoad(() => api.get(`/found/${p.id}`), [p.id], { poll: 4000 });
  if (!data) return <><Hdr title="Suivi de la collecte" /><Spinner /></>;
  const f = data.found, st = f.step;
  const proof = () => app.openSheet(<div className="col" style={{ gap: 10 }}><div className="t-label">Preuve de collecte</div><div className="card" style={{ boxShadow: "none", border: "1.5px dashed var(--line)" }}><Kv rows={[["Signalement", <span className="mono">{f.ref}</span>], ["Mission", <span className="mono">{f.mission}</span>], ["Partenaire", f.partner && f.partner.nom], ["Date", fmtD(f.handT)], ["Heure", fmtT(f.handT, true)], ["Zone", `${f.loc.commune}, Abidjan`], ["Statut", st >= 8 ? "Contrôlé et conservé" : st >= 6 ? "Reçu en agence" : "Collecté par partenaire"]]} /></div><Btn c="ghost" onClick={app.closeSheet}>Fermer</Btn></div>);
  return <><Hdr title="Suivi de la collecte" /><div className="pad">
    {st >= 1 && <Note c="green" ic="check"><b>COLLECTE CONFIRMÉE</b><br />Un partenaire de livraison mandaté par ID SECOURS effectuera la collecte{f.slot ? " · " + f.slot : ""}.</Note>}
    <div className="card"><Timeline steps={f.steps.map((s, i) => ({ l: s, done: i <= st, cur: i === st + 1, small: i === 7 && st >= 7 ? "Authenticité vérifiée · propriétaire recherché" : i === 8 && st >= 8 ? "Indexé · conservé en agence · recherchable" : null }))} /></div>
    {st >= 2 && f.partner && <div className="card"><div className="t-label" style={{ marginBottom: 8 }}>Informations du partenaire</div><Kv rows={[["Partenaire", f.partner.nom + " (partenaire agréé)"], ["Collecteur", `${f.partner.collecteur} · ${f.partner.collecteur_code}`], ["Mission", <span className="mono">{f.mission}</span>], ["Véhicule", f.partner.vehicule], ["Point", `${f.loc.commune}${f.repere ? " · " + f.repere : ""}`]]} /></div>}
    {f.code && <div className="card col" style={{ textAlign: "center" }}><div className="t-label">Code sécurisé de collecte</div><div style={{ font: "800 30px ui-monospace,Menlo,monospace", letterSpacing: ".2em" }}>{f.code}</div><Qr src={f.qr} /><div className="t-s">Remettez le document uniquement au collecteur qui valide ce code. Il ne peut être utilisé qu’une seule fois.</div></div>}
    {st >= 5 && <div className="card col"><div className="row"><Pill>CODE INVALIDÉ</Pill><span className="t-s">Impossible à réutiliser</span></div><div className="t-h">DOCUMENT COLLECTÉ</div><Kv rows={[["Date", fmtD(f.handT)], ["Heure", fmtT(f.handT)], ["Dossier", <span className="mono">{f.ref}</span>], ["Mission", <span className="mono">{f.mission}</span>], ["Partenaire", f.partner && f.partner.nom]]} /><button className="btn ghost sm" onClick={proof}><Icon n="receipt" s={14} /> Preuve de collecte</button></div>}
    {st === 5 && <Note ic="truck">Le livreur achemine le document vers l’agence ID SECOURS.</Note>}
    {st >= 6 && st < 8 && <Note ic="clock">Le document est arrivé en agence : le service Vérification & Contrôle vérifie son authenticité et recherche son propriétaire.</Note>}
    {st >= 8 && <Note c="green" ic="shieldck"><b>DOCUMENT REÇU PAR ID SECOURS</b><br />Il est désormais conservé et recherchable{f.num ? ` par son numéro (${f.num})` : ""}. Merci pour votre geste !</Note>}
    {st >= 6 && <FeedbackBox dossier={f.ref} />}
    <Btn c="ghost" ic="msg" onClick={() => app.go("chat", { id: f.ref })}>Discuter avec l’agence</Btn>
  </div></>;
}
