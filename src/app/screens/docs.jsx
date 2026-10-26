/* Mes documents, fiche détaillée, ajout d'un document — §9 à §15, §61 à §63 */
import { useState } from "react";
import { useApp } from "../store.jsx";
import { api, form, compress } from "../../lib/api.js";
import Icon from "../../ui/Icon.jsx";
import { Hdr, Btn, Field, Input, Note, Hero, Kv, Pill, PhotoPick, Spinner, Empty, Timeline, useLoad, CatIcon } from "../../ui/common.jsx";
import { DOC_ST, isLost } from "@shared/constants.js";
import { fmtD, fmtDT, fcfa } from "@shared/format.js";

export function Docs() {
  const app = useApp();
  const [f, setF] = useState(app.mem.docFilter || "all");
  const [data] = useLoad(() => api.get("/documents"), []);
  const all = data ? data.items : [];
  const list = all.filter(d => f === "all" || (f === "ok" && d.st === "PRESENT") || (f === "lost" && isLost(d.st)) || (f === "rec" && d.st === "RECUPERE"));
  const pick = k => { app.mem.docFilter = k; setF(k); };
  return <>
    <Hdr title="Mes documents" noBack right={<button className="btn sm green" onClick={() => app.go("addDoc")}><Icon n="plus" s={14} /> Ajouter</button>} />
    <div className="pad">
      <div className="chips">{[["all", "Tous"], ["ok", "Présents"], ["lost", "Perdus & suivis"], ["rec", "Récupérés"]].map(([k, l]) => <button key={k} className={`chip ${f === k ? "on" : ""}`} onClick={() => pick(k)}>{l}</button>)}</div>
      {!data ? <Spinner /> : all.length === 0 ? <div className="card empty"><span style={{ color: "var(--green)" }}><Icon n="doc" s={38} /></span><b style={{ color: "var(--ink)", fontFamily: "var(--f-display)" }}>CRÉEZ VOTRE DOSSIER DE DOCUMENTS</b><span>Chaque document doit être couvert par une protection active.</span><Btn c="green" ic="plus" onClick={() => app.go("addDoc")}>Ajouter mon premier document</Btn></div>
        : list.length ? list.map(d => {
          const c = app.catOf(d.cat), st = DOC_ST[d.st], lost = isLost(d.st);
          return <div key={d.id} className="card col" style={{ gap: 10 }}>
            <button className="row" style={{ textAlign: "left" }} onClick={() => app.go("docDetail", { id: d.id })}><CatIcon cat={c} w={44} h={40} s={20} /><div className="grow"><div className="t-h" style={{ fontSize: 14 }}>{c.label}</div><div className="t-s mono">N° {d.num}</div></div><Icon n="chevR" s={15} /></button>
            <div className="row" style={{ flexWrap: "wrap", gap: 6 }}><span className={`pill p-${st.c}`}><i />{st.l}</span>{d.prot ? <span className={`pill p-${d.prot.status.c}`}><Icon n="shield" s={11} /> Protection {d.prot.status.l.toLowerCase()} · {fmtD(d.prot.exp)}</span> : <Pill>Sans protection</Pill>}</div>
            {lost ? <button className="btn sm outline-r" style={{ width: "100%" }} onClick={() => app.go("dossier", { id: d.id })}>Suivre ma déclaration</button>
              : d.st === "PRESENT" ? <button className="btn sm ghost" style={{ width: "100%", color: "var(--blue-d)" }} onClick={() => app.go("declare", { id: d.id })}>Déclarer</button> : null}
          </div>;
        }) : <Empty>Aucun document dans ce filtre.</Empty>}
      <div style={{ height: 70 }} />
    </div>
  </>;
}

export function DocDetail({ p }) {
  const app = useApp();
  const [data, reload] = useLoad(() => api.get(`/documents/${p.id}`), [p.id]);
  if (!data) return <><Hdr title="Document" /><Spinner /></>;
  const d = data.doc, c = app.catOf(d.cat), st = DOC_ST[d.st], lost = isLost(d.st), pr = d.prot;
  const del = () => app.openSheet(<div className="col" style={{ gap: 12 }}><h3 className="t-h">Supprimer ce document ?</h3><p className="t-s" style={{ margin: 0 }}>Il ne sera plus rapproché des documents retrouvés. Sa place dans votre protection est libérée.</p>
    <Btn onClick={async () => { try { await api.del(`/documents/${d.id}`); app.closeSheet(); app.back(); app.toast("Document supprimé."); } catch (e) { app.toast(e.message, "alert"); } }}>Supprimer</Btn><Btn c="ghost" onClick={app.closeSheet}>Annuler</Btn></div>);
  return <>
    <Hdr title={c.label} right={["PRESENT", "RECUPERE"].includes(d.st) ? <button className="iconbtn" onClick={del} aria-label="Supprimer"><Icon n="trash" s={17} /></button> : null} />
    <div className="pad">
      <div style={{ borderRadius: 18, padding: 16, color: "#fff", background: `linear-gradient(135deg,${c.color},${c.color}CC)`, boxShadow: "var(--sh)", display: "flex", flexDirection: "column", gap: 14, position: "relative", overflow: "hidden" }}>
        <div className="row"><Icon n={c.icon} s={24} /><div className="grow"><div style={{ font: "600 11px var(--f-display)", letterSpacing: ".08em", opacity: .85 }}>RÉPUBLIQUE DE CÔTE D’IVOIRE</div><div style={{ font: "700 15px var(--f-display)" }}>{c.label}</div></div><img src="/logo.png" alt="" width="34" height="34" style={{ background: "#fff", borderRadius: "50%", padding: 2, objectFit: "contain" }} /></div>
        <div><div style={{ fontSize: 11, opacity: .8 }}>Titulaire</div><div style={{ font: "600 15px var(--f-display)" }}>{d.nom} {d.prenoms}</div></div>
        <div className="row" style={{ justifyContent: "space-between" }}><div><div style={{ fontSize: 11, opacity: .8 }}>Numéro</div><div className="mono" style={{ fontWeight: 700, fontSize: 15, letterSpacing: ".06em" }}>{d.num}</div></div><span className="pill" style={{ background: "#fff", color: "var(--ink)" }}><i style={{ background: d.st === "PRESENT" ? "var(--green)" : "var(--red)" }} />{st.l}</span></div>
      </div>
      <div className="card"><Kv rows={[["Type", c.label], ["Statut", <span className={`pill p-${st.c}`}><i />{st.l}</span>], ["Numéro (masqué)", <span className="mono">{d.num}</span>], ["Organisme", d.org || "—"], ["Délivrance", fmtD(d.deliv)], ["Expiration", fmtD(d.exp)], ["Enregistré sur ID SECOURS", fmtD(d.created)], ["Type de protection", pr ? pr.name : "Aucune"], ["Expiration protection", pr ? <>{fmtD(pr.exp)} <span className={`pill p-${pr.status.c}`} style={{ marginLeft: 4 }}>{pr.status.l}</span></> : "—"]]} /></div>
      {(d.photos.recto || d.photos.verso) && <div className="card col"><div className="t-label">Photos privées</div><div className="grid2">{["recto", "verso"].map(k => d.photos[k] ? <div key={k} className="photo" style={{ borderStyle: "solid" }}><img src={api.fileUrl(d.photos[k])} alt={k} /></div> : <div key={k} className="photo">{k}</div>)}</div><div className="t-s"><Icon n="lock" s={11} /> Les images de vos documents sont privées et ne sont jamais utilisées comme publication publique de perte.</div></div>}
      <div className="btns">
        {d.st === "PRESENT" && <Btn ic="alert" onClick={() => app.go("declare", { id: d.id })}>Déclarer la perte</Btn>}
        {lost && <>
          <Btn c="dark" ic="clock" onClick={() => app.go("dossier", { id: d.id })}>Suivre mon dossier</Btn>
          {d.dossier && <Btn c="ghost" ic="msg" onClick={() => app.go("chat", { id: d.dossier.ref })}>Contacter ID SECOURS</Btn>}
          {c.official ? <Btn c="ghost" ic="upload" onClick={() => app.go("offiDecl", { id: d.id })}>Déclaration officielle · {d.offi.st}</Btn> : null}
          <Btn c="ghost" ic="mega" onClick={() => app.go("vipPub", { id: d.id })}>Publication de perte VIP</Btn>
        </>}
        {d.st === "RECUPERE" && <Btn c="green" ic="check" onClick={async () => { await api.post(`/documents/${d.id}/back-present`); reload(); app.toast("Document remis au statut Présent."); }}>Remettre au statut Présent</Btn>}
        {pr && pr.status.k !== "ACTIVE" && <Btn c="outline-g" ic="refresh" onClick={() => { app.mem.pending = { kind: "renew", protection: pr.id }; app.go("payment"); }}>Renouveler la protection</Btn>}
      </div>
      <div className="card col"><div className="t-label">Historique</div><Timeline steps={d.hist.slice().reverse().map(h => ({ l: h.l, small: fmtDT(h.t), done: true }))} /></div>
    </div>
  </>;
}

/* ---------- ajout d'un document ---------- */
export function AddDoc() {
  const app = useApp();
  const [cov] = useLoad(() => api.get("/protections/coverage"), []);
  const pick = k => { app.mem.draft = { cat: k }; if (cov && cov.coverage[k]) app.go("addDocForm", { id: k }); else app.go("protRequired", { id: k }); };
  return <>
    <Hdr title="Ajouter un document" />
    <div className="pad"><div className="t-s">Choisissez la catégorie. Le système vérifie votre protection (formule, statut, expiration, catégorie, quota, disponibilité dans le pack) avant tout enregistrement.</div>
      {!cov || !app.cat ? <Spinner /> : <div className="list">{app.cat.cats.map(c => { const cv = cov.coverage[c.code]; return <button key={c.code} className="li" onClick={() => pick(c.code)}><span className="ic" style={{ background: c.color, color: "#fff" }}><Icon n={c.icon} s={17} /></span><div className="grow"><div className="t-h" style={{ fontSize: 13.5 }}>{c.label}</div><div className="t-s">{cv ? <span style={{ color: "var(--green-d)" }}><Icon n="check" s={11} /> Couvert · {cv.name}</span> : `Protection requise · ${fcfa(c.prix)}/an`}</div></div><Icon n="chevR" s={15} /></button>; })}</div>}
    </div>
  </>;
}

export function ProtRequired({ p }) {
  const app = useApp(), c = app.catOf(p.id);
  const [data] = useLoad(() => api.get(`/protections/checks/${p.id}`), [p.id]);
  return <>
    <Hdr title="Protection requise" />
    <div className="pad">
      <Hero ic="shield" bg="var(--orange-s)" color="var(--orange)" title="PROTECTION REQUISE"><p className="t-s">Aucune protection active ne couvre ce document : {c.label}.</p></Hero>
      {data && <div className="card diag">{data.checks.map(([l, ok]) => [<div key={l}>{l}</div>, <div key={l + "r"} className={`res ${ok ? "ok" : "ko"}`}>{ok ? "✓" : "✕"}</div>])}</div>}
      <div className="btns">
        <Btn ic="shieldck" onClick={() => { app.mem.pending = { kind: "indiv", cat: p.id }; app.go("payment"); }}>Protéger ce document · {fcfa(c.prix)}/an</Btn>
        <Btn c="ghost" onClick={() => app.go("packs", { id: p.id })}>Choisir un pack</Btn>
        <Btn c="ghost" ic="crown" onClick={() => app.go("formules")}>Voir les formules VIP</Btn>
      </div>
      <p className="t-s" style={{ textAlign: "center" }}>Aucun enregistrement n’est possible sans protection valide.</p>
    </div>
  </>;
}

const draftOf = app => app.mem.draft || (app.mem.draft = {});
export function AddDocForm({ p }) {
  const app = useApp(), c = app.catOf(p.id), u = app.user, d = draftOf(app);
  if (d.cat !== p.id) Object.assign(d, { cat: p.id, num: "", photos: {}, files: {} });
  if (d.nom === undefined) Object.assign(d, { nom: u.nom.toUpperCase(), prenoms: u.prenom, dob: u.dob || "", org: p.id === "CNI" ? "ONECI" : "" });
  const [, force] = useState(0);
  const set = k => v => { d[k] = v; force(x => x + 1); };
  const f = (id, l, t = "text", ph = "", req) => <Field label={l} req={req} id={"ad-" + id}><Input id={"ad-" + id} type={t} placeholder={ph} value={d[id]} onChange={set(id)} className={id === "num" ? "mono" : ""} /></Field>;
  const next = () => {
    if (!(d.num || "").trim() || !(d.nom || "").trim() || !(d.prenoms || "").trim()) return app.toast("Numéro, nom et prénom(s) sont obligatoires.", "alert");
    if (d.deliv && d.exp && d.exp < d.deliv) return app.toast("La date d’expiration doit suivre la date de délivrance.", "alert");
    app.go("addDocPhotos", { id: p.id });
  };
  return <>
    <Hdr title="Informations du document" />
    <div className="pad"><div className="row t-s"><span className="pill p-dark">Étape 1/3</span>Informations</div>
      <Field label="Type"><div className="inp" style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--soft)" }}><Icon n={c.icon} s={16} /> {c.label}</div></Field>
      {f("num", "Numéro du document", "text", c.prefix + "00000000", 1)}
      <Note>Le numéro est la donnée essentielle au rapprochement avec les documents retrouvés.</Note>
      <div className="grid2">{f("nom", "Nom", "text", "", 1)}{f("prenoms", "Prénom(s)", "text", "", 1)}</div>
      {f("dob", "Date de naissance", "date")}{f("org", "Organisme émetteur")}
      <div className="grid2">{f("deliv", "Date de délivrance", "date")}{f("exp", "Expiration", "date")}</div>
      <Btn onClick={next}>Continuer</Btn><p className="t-s" style={{ textAlign: "center", margin: 0 }}>Brouillon conservé pendant la session.</p>
    </div>
  </>;
}

export function AddDocPhotos({ p }) {
  const app = useApp(), d = draftOf(app);
  d.photos = d.photos || {}; d.files = d.files || {};
  const [, force] = useState(0);
  const pick = k => async file => { const c = await compress(file); d.files[k] = c; d.photos[k] = c.preview; force(x => x + 1); };
  return <>
    <Hdr title="Photographie du document" />
    <div className="pad"><div className="row t-s"><span className="pill p-dark">Étape 2/3</span>Photos recto / verso</div>
      <div className="grid2">{["recto", "verso"].map(k => <PhotoPick key={k} label={"PHOTO " + k.toUpperCase()} value={d.photos[k]} onPick={pick(k)} />)}</div>
      <Note c="green" ic="lock">Les images de vos documents sont privées et ne sont jamais utilisées comme publication publique de perte.</Note>
      <p className="t-s" style={{ margin: 0 }}>Les photos doivent être lisibles. Elles sont compressées pour les connexions faibles.</p>
      <Btn onClick={() => app.go("addDocRecap", { id: p.id })}>{d.photos.recto ? "Continuer" : "Continuer sans photo"}</Btn>
    </div>
  </>;
}

export function AddDocRecap({ p }) {
  const app = useApp(), d = draftOf(app), c = app.catOf(p.id);
  const [cov] = useLoad(() => api.get("/protections/coverage"), []);
  const cv = cov && cov.coverage[p.id];
  const save = async () => {
    try {
      const r = await api.post("/documents", form({ cat: p.id, num: d.num, nom: d.nom, prenoms: d.prenoms, dob: d.dob, org: d.org, deliv: d.deliv, exp: d.exp, recto: d.files && d.files.recto, verso: d.files && d.files.verso }));
      app.mem.draft = null;
      app.reset([{ name: "home", p: {} }]); app.go("docSaved", { id: r.doc.id });
    } catch (e) { app.toast(e.message, "alert"); if (e.data && e.data.code === "PROTECTION_REQUIRED") app.replace("protRequired", { id: p.id }); }
  };
  return <>
    <Hdr title="Récapitulatif" />
    <div className="pad"><div className="row t-s"><span className="pill p-dark">Étape 3/3</span>Confirmation</div>
      <div className="card"><Kv rows={[["Type", c.label], ["Numéro", <span className="mono">{(d.num || "").toUpperCase().replace(/\s/g, "")}</span>], ["Titulaire", `${(d.nom || "").toUpperCase()} ${d.prenoms}`], ["Naissance", fmtD(d.dob)], ["Organisme", d.org || "—"], ["Délivrance", fmtD(d.deliv)], ["Expiration", fmtD(d.exp)], ["Photos", `${["recto", "verso"].filter(k => (d.photos || {})[k]).length}/2`]]} /></div>
      {cov && <Note c={cv ? "green" : "red"} ic="shield">{cv ? <>Couvert par : <b>{cv.name}</b> (jusqu’au {fmtD(cv.exp)}).</> : "Aucune protection disponible. Revenez à l’étape protection."}</Note>}
      <Btn onClick={save} disabled={!cv}>Enregistrer mon document</Btn>
    </div>
  </>;
}

export function DocSaved({ p }) {
  const app = useApp();
  const [data] = useLoad(() => api.get(`/documents/${p.id}`), [p.id]);
  if (!data) return <Spinner />;
  const d = data.doc, c = app.catOf(d.cat);
  return <div className="pad">
    <Hero ic="check" size={40} bg="var(--green)" color="#fff" title="DOCUMENT ENREGISTRÉ"><p className="t-s">{c.label} · N° {d.num}</p></Hero>
    <div className="card"><Kv rows={[["Statut", <Pill c={d.st === "POT" ? "blue" : "green"} dot>{d.st === "POT" ? "CORRESPONDANCE" : "PRÉSENT"}</Pill>], ["Protection", <Pill c="green" dot>ACTIVE</Pill>], ["Couverture", d.prot && d.prot.name]]} /></div>
    {d.st === "POT" && <Note c="green" ic="star"><b>BONNE NOUVELLE !</b> Un document correspondant est déjà détenu par ID SECOURS.</Note>}
    <Btn onClick={() => app.go("docDetail", { id: d.id })}>Voir le document</Btn>
    <Btn c="ghost" ic="plus" onClick={() => app.go("addDoc")}>Ajouter un autre document</Btn>
    <Btn c="ghost" onClick={() => app.tab("docs")}>Retour à mes documents</Btn>
  </div>;
}
