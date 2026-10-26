/* Déclaration de perte (§17–§20), suivi du dossier, déclaration officielle (§23), publication VIP (R38–R47) */
import { useState } from "react";
import { useApp } from "../store.jsx";
import { api, form } from "../../lib/api.js";
import { locate } from "../../lib/geo.js";
import Icon from "../../ui/Icon.jsx";
import { Hdr, Btn, Field, Input, Select, Chk, Note, Hero, Kv, Pill, Spinner, Empty, Timeline, LocBlock, FilePick, useLoad, CatIcon } from "../../ui/common.jsx";
import { DOC_ST, LOST_STEPS, CIRCS, ADMINS, OFFI_ST, OFFI_CHAIN, PUB_CONSENTS } from "@shared/constants.js";
import { fmtD, fmtDT, fmtT, today } from "@shared/format.js";

export function Declare({ p }) {
  const app = useApp();
  const [docs] = useLoad(() => app.user ? api.get("/documents") : Promise.resolve({ items: [] }), []);
  const [dd, setDd] = useState({ date: today(), circ: "", obs: "", ok: false, loc: null });
  const set = k => v => setDd(s => ({ ...s, [k]: v }));
  if (!app.user) return <><Hdr title="Déclarer une perte" /><div className="pad"><Note>La déclaration concerne un document enregistré dans ID SECOURS. Si votre document n’était pas enregistré, utilisez « Rechercher un document ».</Note><Btn onClick={() => app.go("login")}>Se connecter</Btn><Btn c="ghost" onClick={() => app.go("search")}>Rechercher un document</Btn></div></>;
  if (!docs) return <><Hdr title="Déclarer une perte" /><Spinner /></>;
  if (!p.id) {
    const ok = docs.items.filter(d => d.st === "PRESENT");
    return <><Hdr title="Déclarer une perte" /><div className="pad"><div className="t-s">Quel document avez-vous perdu ? Ses informations sont déjà enregistrées : vous n’avez rien à ressaisir.</div>
      {ok.length ? <div className="list">{ok.map(d => { const c = app.catOf(d.cat); return <button key={d.id} className="li" onClick={() => app.go("declare", { id: d.id })}><span className="ic" style={{ background: c.color, color: "#fff" }}><Icon n={c.icon} s={17} /></span><div className="grow"><div className="t-h" style={{ fontSize: 13.5 }}>{c.label}</div><div className="t-s mono">N° {d.num}</div></div><Pill c="green" dot>Présent</Pill></button>; })}</div>
        : <div className="card empty">Aucun document au statut Présent.<button className="btn green sm" onClick={() => app.go("addDoc")}><Icon n="plus" s={14} /> Ajouter un document</button></div>}
      <Note ic="search">Document jamais enregistré ? <button style={{ fontWeight: 700, color: "var(--blue-d)", textDecoration: "underline" }} onClick={() => app.tab("search")}>Rechercher un document</button></Note></div></>;
  }
  const d = docs.items.find(x => x.id === +p.id);
  if (!d) return <><Hdr title="Déclarer une perte" /><Empty>Document introuvable.</Empty></>;
  const c = app.catOf(d.cat);
  const submit = async () => {
    if (!dd.date || !dd.circ) return app.toast("Indiquez la date et les circonstances.", "alert");
    if (!dd.ok) return app.toast("Cochez « Je confirme avoir perdu ce document ».", "alert");
    try { const r = await api.post(`/documents/${d.id}/declare`, dd); app.reset(["home"]); app.go("declared", { id: d.id, ref: r.ref }); }
    catch (e) { app.toast(e.message, "alert"); }
  };
  return <>
    <Hdr title="Confirmation de la perte" />
    <div className="pad">
      <div className="card row"><CatIcon cat={c} /><div className="grow"><div className="t-h" style={{ fontSize: 14 }}>{c.label}</div><div className="t-s">N° {d.num} · {d.nom} {d.prenoms}</div></div><Pill c="green">Données récupérées</Pill></div>
      <Field label="Date approximative de la perte" req id="dc-date"><Input id="dc-date" type="date" max={today()} value={dd.date} onChange={set("date")} /></Field>
      <Field label="Circonstances" req id="dc-circ"><Select id="dc-circ" value={dd.circ} onChange={set("circ")} options={CIRCS} placeholder="Choisir…" /></Field>
      <Field label="Observation (facultatif)" id="dc-obs"><textarea id="dc-obs" className="inp" placeholder="Ex. : dans un portefeuille noir, près du marché…" value={dd.obs} onChange={e => set("obs")(e.target.value)} /></Field>
      {dd.loc ? <LocBlock loc={dd.loc} title="Position au moment de la déclaration" /> : <div className="card col"><div className="row"><span style={{ color: "var(--green)" }}><Icon n="pin" s={20} /></span><div className="grow"><div className="t-h" style={{ fontSize: 14 }}>Géolocalisation de la déclaration</div><div className="t-s">Avec votre autorisation, ID SECOURS enregistre latitude, longitude, date, heure et précision au moment de la déclaration.</div></div></div>
        <Btn c="outline-g" sm style={{ width: "100%" }} onClick={async () => { const l = await locate(); set("loc")(l); app.toast(`Position enregistrée (± ${l.acc} m)`); }}>Autoriser la géolocalisation</Btn></div>}
      <Chk checked={dd.ok} onChange={set("ok")}>Je confirme avoir perdu ce document.</Chk>
      <Btn onClick={submit}>Valider la déclaration</Btn>
    </div>
  </>;
}

export function Declared({ p }) {
  const app = useApp();
  const [data] = useLoad(() => api.get(`/documents/${p.id}`), [p.id]);
  if (!data) return <Spinner />;
  const d = data.doc, c = app.catOf(d.cat), dos = d.dossier;
  return <div className="pad">
    <Hero ic="check" size={40} bg="var(--red)" color="#fff" title="DÉCLARATION ENREGISTRÉE"><span className="t-s">Référence</span><span className="ref">{dos.ref}</span><Pill c="red" dot>PERDU / DÉCLARÉ</Pill></Hero>
    {dos.loc && <div className="card"><Kv rows={[["Document", c.label], ["Position", `${dos.loc.commune} · ± ${dos.loc.acc} m`], ["Horodatage", fmtDT(dos.t)]]} /></div>}
    {d.st === "POT" && <Note c="green" ic="star"><b>BONNE NOUVELLE !</b> Un document correspondant est déjà détenu par ID SECOURS.</Note>}
    {c.official ? <><Note c="orange" ic="alert"><b>ACTION REQUISE</b><br />Veuillez transmettre la déclaration officielle de perte délivrée ou reconnue par l’administration compétente.</Note><Btn c="dark" ic="upload" onClick={() => app.go("offiDecl", { id: d.id })}>Transmettre la déclaration officielle</Btn></> : null}
    <Btn onClick={() => app.replace("dossier", { id: d.id })}>Suivre mon dossier</Btn>
    <Btn c="ghost" ic="msg" onClick={() => app.go("chat", { id: dos.ref })}>Contacter ID SECOURS</Btn>
    <Btn c="ghost" onClick={() => app.tab("home")}>Retour à l’accueil</Btn>
  </div>;
}

export function Dossier({ p }) {
  const app = useApp();
  const [data, reload] = useLoad(() => api.get(`/documents/${p.id}`), [p.id], { poll: 15000 });
  if (!data) return <><Hdr title="Suivi du dossier" /><Spinner /></>;
  const d = data.doc, c = app.catOf(d.cat), dos = d.dossier, rec = d.rec;
  const idx = LOST_STEPS.findIndex(s => s[0] === d.st);
  const match = async () => { try { const r = await api.post(`/documents/${d.id}/match`); app.go("recFound", { id: r.ref }); } catch (e) { app.toast(e.message, "info"); } };
  const foundMine = () => app.openSheet(<div className="col" style={{ gap: 12 }}><h3 className="t-h">Vous avez retrouvé votre document ?</h3><p className="t-s" style={{ margin: 0 }}>Le dossier sera clôturé et le document remis au statut Présent.</p>
    <Btn c="green" onClick={async () => { await api.post(`/documents/${d.id}/found-mine`); app.closeSheet(); reload(); app.toast("Dossier clôturé, document remis au statut Présent."); }}>Confirmer</Btn><Btn c="ghost" onClick={app.closeSheet}>Annuler</Btn></div>);
  return <>
    <Hdr title="Suivi du dossier" />
    <div className="pad">
      <div className="card col" style={{ gap: 8 }}><div className="row"><CatIcon cat={c} /><div className="grow"><div className="t-h" style={{ fontSize: 14 }}>{c.label}</div><div className="t-s mono">{dos ? dos.ref : ""}</div></div><Pill c={DOC_ST[d.st].c} dot>{DOC_ST[d.st].l}</Pill></div>
        {dos && <Kv rows={[["Déclarée le", fmtDT(dos.t)], ["Circonstances", dos.circ], dos.loc && ["Lieu", `${dos.loc.commune} (± ${dos.loc.acc} m)`]]} />}</div>
      <div className="card"><Timeline steps={LOST_STEPS.map((s, i) => ({ l: s[1], done: i < idx || d.st === "RECUPERE", cur: i === idx && d.st !== "RECUPERE" }))} /></div>
      {d.st === "POT" && <><Note c="green" ic="star"><b>BONNE NOUVELLE !</b> Un document susceptible de correspondre au vôtre a été signalé. Des contrôles restent obligatoires avant toute restitution.</Note><Btn c="green" onClick={match}>Voir la correspondance</Btn></>}
      {rec && <Btn c="green" onClick={() => app.go(rec.verifSt === "PROPRIÉTAIRE CONFIRMÉ" && (rec.protected || rec.paid) ? "recAuth" : "recDossier", { id: rec.ref })}>Continuer la récupération · {rec.ref}</Btn>}
      <div className="btns">
        {dos && <Btn c="ghost" ic="msg" onClick={() => app.go("chat", { id: dos.ref })}>Contacter ID SECOURS</Btn>}
        {c.official ? <Btn c="ghost" ic="upload" onClick={() => app.go("offiDecl", { id: d.id })}>Déclaration officielle · {d.offi.st}</Btn> : null}
        <Btn c="ghost" ic="mega" onClick={() => app.go("vipPub", { id: d.id })}>Publication de perte {d.pub ? "· " + d.pub.st : "VIP"}</Btn>
        {["PERDU", "RECHERCHE", "POT"].includes(d.st) && !rec && <Btn c="ghost" ic="check" style={{ color: "var(--green-d)" }} onClick={foundMine}>J’ai retrouvé mon document moi-même</Btn>}
      </div>
    </div>
  </>;
}

export function OffiDecl({ p }) {
  const app = useApp();
  const [data, reload] = useLoad(() => api.get(`/documents/${p.id}`), [p.id]);
  const [f, setF] = useState({ num: "", date: "", lieu: "", adm: ADMINS[0], file: null });
  if (!data) return <><Hdr title="Déclaration officielle" /><Spinner /></>;
  const d = data.doc, o = d.offi, ci = OFFI_CHAIN.indexOf(o.st);
  const canEdit = ["NON TRANSMISE", "COMPLÉMENT REQUIS", "REJETÉE"].includes(o.st);
  const submit = async () => {
    if (!f.num || !f.date || !f.lieu || !f.file) return app.toast("Numéro, date, lieu et pièce sont obligatoires.", "alert");
    try { await api.post(`/documents/${d.id}/official`, form(f)); app.toast("Déclaration officielle transmise."); reload(); }
    catch (e) { app.toast(e.message, "alert"); }
  };
  const steps = OFFI_CHAIN.map((s, i) => ({ l: s, done: ci > i || o.st === "VALIDÉE", cur: ci === i && o.st !== "VALIDÉE" }));
  if (["COMPLÉMENT REQUIS", "REJETÉE"].includes(o.st)) steps.push({ l: o.st, small: o.motif, cur: true, color: "var(--red)" });
  return <>
    <Hdr title="Déclaration officielle" />
    <div className="pad">
      <div className="row"><span className="t-s grow">{app.catOf(d.cat).label}</span><Pill c={OFFI_ST[o.st]} dot>{o.st}</Pill></div>
      <div className="card"><Timeline steps={steps} /></div>
      {!d.dossier || d.dossier.closed ? <Note c="orange" ic="alert">Déclarez d’abord la perte du document.</Note> : canEdit ? <>
        <Note c="orange" ic="alert"><b>ACTION REQUISE</b> · Veuillez transmettre la déclaration officielle de perte délivrée ou reconnue par l’administration compétente.</Note>
        <Field label="Numéro de la déclaration" req id="of-num"><Input id="of-num" placeholder="Ex. : 2026/CP-COC/0457" value={f.num} onChange={v => setF({ ...f, num: v })} /></Field>
        <div className="grid2"><Field label="Date" req id="of-date"><Input id="of-date" type="date" max={today()} value={f.date} onChange={v => setF({ ...f, date: v })} /></Field><Field label="Lieu" req id="of-lieu"><Input id="of-lieu" placeholder="Cocody" value={f.lieu} onChange={v => setF({ ...f, lieu: v })} /></Field></div>
        <Field label="Administration" req id="of-adm"><Select id="of-adm" value={f.adm} onChange={v => setF({ ...f, adm: v })} options={ADMINS} /></Field>
        <FilePick label="Photo, scan ou PDF *" height={96} value={f.file && f.file.name} onPick={file => setF({ ...f, file })} />
        <Btn onClick={submit}>Transmettre</Btn>
      </> : <div className="card"><Kv rows={[["Numéro", o.num], ["Date", fmtD(o.date)], ["Administration", o.adm], ["Lieu", o.lieu], ["Pièce", o.file ? <a href={api.fileUrl(o.file)} target="_blank" rel="noreferrer">Voir la pièce</a> : "—"]]} /></div>}
      {o.st === "EN VÉRIFICATION" && <Note ic="clock">Votre déclaration est en cours de contrôle par le service Vérification & Contrôle. Vous serez notifié de la décision.</Note>}
      {o.st === "VALIDÉE" && <><Note c="green" ic="check">Déclaration validée. Elle conditionne la publication de perte VIP.</Note><Btn c="dark" ic="mega" onClick={() => app.go("vipPub", { id: d.id })}>Publication de perte VIP</Btn></>}
    </div>
  </>;
}

export function VipPub({ p }) {
  const app = useApp();
  const [data, reload] = useLoad(() => api.get(`/documents/${p.id}/publication`), [p.id]);
  const [cons, setCons] = useState([false, false, false, false]);
  if (!data) return <><Hdr title="Publication de perte" /><Spinner /></>;
  const pv = data.preview, pub = data.pub;
  if (!data.vip) return <><Hdr title="Avantages VIP" /><div className="pad">
    <Hero ic="crown" bg="#16201B" color="#F5C842" title="Publication de perte"><p className="t-s">Un avantage des formules VIP et VVIP.</p></Hero>
    <div className="card col">{["Traitement prioritaire de vos dossiers", "Collecte et livraison selon les conditions de la formule", "Publication de perte auprès de la communauté ID SECOURS et des canaux sociaux officiels autorisés", "Aucune donnée sensible exposée : numéro masqué, aucune image privée"].map(x => <div key={x} className="row" style={{ alignItems: "flex-start" }}><span style={{ color: "var(--green)" }}><Icon n="check" s={15} /></span><span>{x}</span></div>)}</div>
    <Note>Votre protection actuelle ({data.protName}) ne donne pas accès à la publication (R36).</Note>
    <Btn c="dark" ic="crown" onClick={() => app.go("formules")}>Découvrir VIP</Btn></div></>;
  if (!data.declared) return <><Hdr title="Publication de perte" /><div className="pad"><div className="card empty">Ce document est au statut Présent. Déclarez la perte avant de demander une publication.<button className="btn red sm" onClick={() => app.go("declare", { id: p.id })}>Déclarer la perte</button></div></div></>;
  if (data.needOffi) return <><Hdr title="Éligibilité publication" /><div className="pad">
    <Hero ic="lock" size={34} bg="var(--orange-s)" color="var(--orange)" title="Pas encore éligible"><p className="t-s">Lorsque la déclaration officielle est exigée, aucune publication ne peut avoir lieu avant sa validation (R39).</p></Hero>
    <div className="card"><Kv rows={[["Formule VIP", <span className="ok">✓ Active</span>], ["Déclaration ID SECOURS", <span className="ok">✓ Enregistrée</span>], ["Déclaration officielle", <span className="ko">{data.offiSt}</span>]]} /></div>
    <Btn c="dark" ic="upload" onClick={() => app.go("offiDecl", { id: p.id })}>Déclaration officielle à valider</Btn></div></>;
  const preview = <div className="card col" style={{ gap: 10, border: "2px solid var(--red)" }}>
    <div className="row"><img src="/logo.png" alt="" width="34" height="34" style={{ objectFit: "contain" }} /><div className="grow"><div className="t-h" style={{ fontSize: 14, color: "var(--red)" }}>AVIS DE PERTE</div><div className="t-s">Communauté ID SECOURS</div></div></div>
    <div style={{ font: "600 15px var(--f-display)" }}>{pv.label} perdu(e)</div>
    <Kv rows={[["Titulaire", pv.titulaire], ["Numéro", <span className="mono">{pv.num}</span>], ["Zone", `${pv.zone || "—"}, Abidjan`], ["Date", fmtD(pv.date)]]} />
    <div className="t-s">Vous l’avez trouvé ? Signalez-le dans l’application ID SECOURS · « J’ai trouvé un document ». Aucune image du document n’est publiée.</div>
  </div>;
  if (!pub || pub.st === "REJETÉE") {
    const ask = async () => { if (!cons.every(Boolean)) return app.toast("Cochez les quatre consentements.", "alert"); try { await api.post(`/documents/${p.id}/publication`, { consents: cons }); app.toast("Demande de publication envoyée."); reload(); } catch (e) { app.toast(e.message, "alert"); } };
    return <><Hdr title="Demander une publication" /><div className="pad">
      <Note c="green" ic="check">Vous êtes éligible : formule VIP active{data.official ? ", déclaration officielle validée" : ""}.</Note>
      {pub && <Note c="red" ic="x">Votre précédente demande a été refusée. Vous pouvez la renouveler.</Note>}
      <div className="t-label">Aperçu de la publication</div>{preview}
      <div className="t-label">Consentement</div>
      {PUB_CONSENTS.map((x, i) => <Chk key={i} checked={cons[i]} onChange={v => setCons(c => c.map((y, j) => j === i ? v : y))}>{x}</Chk>)}
      <Btn ic="mega" onClick={ask}>Demander la publication</Btn></div></>;
  }
  return <><Hdr title={"Publication · " + pub.ref} /><div className="pad">
    <div className="row"><span className="grow t-s">Statut de la publication</span><Pill c={pub.st === "ACTIVE" ? "green" : pub.st === "CLÔTURÉE" ? "grey" : "orange"} dot>{pub.st}</Pill></div>
    {preview}
    {pub.st === "ACTIVE" && <div className="card"><Kv rows={[["Diffusée le", fmtDT(pub.live)], ["Canaux", "Communauté ID SECOURS + canaux sociaux officiels"], ["Vues", pub.views], ["Signalements", pub.reports]]} /></div>}
    <div className="card col"><div className="t-label">Historique de la publication</div>{pub.hist.slice().reverse().map((h, i) => <div key={i} className="row t-s"><span className="mono">{fmtT(h.t)}</span><span className="grow" style={{ color: "var(--ink)" }}>{h.l}</span></div>)}</div>
    {pub.st === "EN VALIDATION" && <Note ic="clock">Votre publication est en validation par l’agence. Vous serez notifié dès sa diffusion.</Note>}
    {pub.st === "ACTIVE" && <Btn c="ghost" onClick={async () => { await api.post(`/documents/${p.id}/publication/close`); reload(); }}>Clôturer la publication</Btn>}
  </div></>;
}
