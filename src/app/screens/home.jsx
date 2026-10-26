/* Tableau de bord utilisateur (maquette + §64), notifications (§65), position (§66) */
import { useEffect, useState } from "react";
import { useApp, linkTo } from "../store.jsx";
import { api } from "../../lib/api.js";
import { locate } from "../../lib/geo.js";
import Icon from "../../ui/Icon.jsx";
import { Hdr, Btn, Field, Select, LocBlock, Empty, useLoad, Spinner } from "../../ui/common.jsx";
import { SLIDES, COMMUNES, DOC_ST, shortSt, isLost } from "@shared/constants.js";
import { fmtD, fmtDT } from "@shared/format.js";

export function Avatar({ sz = 62 }) {
  const { user } = useApp();
  return <div className="avatar" style={{ width: sz, height: sz }}>{user && user.photo ? <img src={api.fileUrl(user.photo)} alt="" /> : (user ? user.prenom[0] : "?")}</div>;
}

export function DocRow({ d }) {
  const { go, catOf } = useApp(), c = catOf(d.cat), st = DOC_ST[d.st];
  const lost = isLost(d.st);
  return <div className="docrow">
    <span className="ic" style={{ width: 38, height: 34, borderRadius: 8, display: "grid", placeItems: "center", background: c.color, color: "#fff" }}><Icon n={c.icon} s={17} /></span>
    <button className="nm" onClick={() => go("docDetail", { id: d.id })}>{c.label}<small className="mono">N° {d.num}</small></button>
    <span className={`pill p-${st.c}`} style={{ padding: "4px 8px" }}><i />{shortSt(d.st)}</span>
    {lost ? <button className="dec follow" onClick={() => go("dossier", { id: d.id })}>Suivre</button>
      : d.st === "RECUPERE" ? <button className="dec" onClick={() => go("docDetail", { id: d.id })}>Voir</button>
        : <button className="dec" onClick={() => go("declare", { id: d.id })}>Déclarer</button>}
  </div>;
}

export function PosSheet() {
  const app = useApp(), u = app.user;
  const [loc, setLoc] = useState(u.position || null);
  const save = async l => { setLoc(l); try { await api.put("/me/position", l); await app.loadMe(); } catch (e) { app.toast(e.message, "alert"); } };
  return <div className="col" style={{ gap: 12 }}>
    <h3 className="t-h">Ma position</h3>
    <p className="t-s" style={{ margin: 0 }}>La géolocalisation est utilisée uniquement lorsque nécessaire : déclaration, trouvaille, collecte, SOS et services de proximité (§66).</p>
    {loc ? <LocBlock loc={loc} title="Position actuelle" /> : <Empty card ic="pin">Aucune position enregistrée.</Empty>}
    <Btn c="green" ic="refresh" onClick={async () => { const l = await locate(); await save(l); app.toast(`Position actualisée (± ${l.acc} m)`); }}>Actualiser ma position</Btn>
    <Field label="Ou choisir ma commune" id="pos-c"><Select id="pos-c" value={loc ? loc.commune : ""} onChange={async v => save(await locate(v))} options={COMMUNES} /></Field>
  </div>;
}

export function Home() {
  const app = useApp(), { user: u, go, tab } = app;
  const [slide, setSlide] = useState(0);
  const [docs] = useLoad(() => api.get("/documents"), []);
  const [prots] = useLoad(() => api.get("/protections"), []);
  useEffect(() => { const t = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 4500); return () => clearInterval(t); }, []);
  if (!u) return null;
  const items = docs ? docs.items : [];
  const mp = prots && prots.items.filter(p => p.active).sort((a, b) => (b.kind === "FORMULE") - (a.kind === "FORMULE") || (b.kind === "PACK") - (a.kind === "PACK"))[0];
  const lostDoc = items.find(d => ["PERDU", "RECHERCHE"].includes(d.st));
  const addDoc = () => go("addDoc");
  return <>
    <div className="top">
      <div className="logo"><img src="/logo.png" alt="" style={{ objectFit: "contain" }} /><div style={{ minWidth: 0 }}><b><span className="i">I</span><span className="d">D</span> <span className="s">SECOURS</span></b><small>Votre identité retrouvée, votre tranquillité restaurée.</small></div></div>
      <button className="posbtn" onClick={() => app.openSheet(<PosSheet />)}><Icon n="pin" s={15} /><span><small>Ma position</small><b>Abidjan, {(u.position && u.position.commune) || u.commune || "—"}</b></span></button>
      <button className="bell" onClick={() => go("notifs")} aria-label="Notifications"><Icon n="bell" s={19} />{app.unread ? <span className="bdg">{app.unread}</span> : null}</button>
    </div>
    <div className="pad" style={{ paddingTop: 12 }}>
      <div className="hello"><Avatar /><div style={{ minWidth: 0 }}><h3>Bonjour,<b>{u.prenom} 👋</b></h3><div className="t-s">Votre sécurité documentaire commence ici.</div></div></div>
      <button className="subcard" onClick={() => go(mp ? "protections" : "protChoice")}><span style={{ color: "var(--green)" }}><Icon n="crown" s={26} /></span><div className="grow">
        <div className="t-h" style={{ fontSize: 13.5 }}>{mp ? "Abonnement" : "Aucune protection"}</div>
        {mp ? <><span className={`pill p-${mp.status.c}`} style={{ margin: "3px 0" }}>{mp.status.l}</span><div className="t-s">Expire le {fmtD(mp.exp)} · {prots.summary.protectedDocs} doc. protégés</div></> : <div className="t-s">Protégez un document dès 300 FCFA/an</div>}
      </div><Icon n="chevR" s={15} /></button>
      {prots && prots.summary.vip && lostDoc && <button className="subcard" style={{ background: "var(--ink)", color: "#fff" }} onClick={() => go("vipPub", { id: lostDoc.id })}><span style={{ color: "#F5C842" }}><Icon n="mega" s={24} /></span><div className="grow"><div className="t-h" style={{ fontSize: 13.5 }}>ALERTE DE PERTE VIP</div><div className="t-s" style={{ color: "#C9D2CD" }}>Publiez votre perte auprès de la communauté</div></div><Icon n="chevR" s={15} /></button>}
      <div className="carousel">
        {SLIDES.map((s, i) => <button key={i} className={`slide ${i === slide ? "on" : ""}`} style={{ background: `linear-gradient(110deg,${s.bg[0]},${s.bg[1]}${s.bg[2] ? " 60%," + s.bg[2] : ""})`, textAlign: "left" }} onClick={() => go(s.go)} tabIndex={i === slide ? 0 : -1}>
          <h4>{s.h}</h4><p>{s.p}</p>
          {s.card ? <div className="idcard"><div className="flag"><i style={{ background: "#F28C12" }} /><i style={{ background: "#fff" }} /><i style={{ background: "#13A043" }} /></div><div style={{ fontWeight: 700, fontSize: 6.5 }}>RÉPUBLIQUE DE CÔTE D’IVOIRE</div><div>CARTE NATIONALE D’IDENTITÉ</div><div className="ph" />{[30, 40, 50, 60, 70].map((y, j) => <div key={j} className="ln" style={{ top: y, width: 70 - j * 6 }} />)}</div>
            : <div style={{ position: "absolute", right: 18, bottom: 22, width: 78, height: 78, borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center", color: s.c, boxShadow: "0 8px 20px rgba(0,0,0,.08)" }}><Icon n={s.ic} s={34} /></div>}
        </button>)}
        <div className="dots">{SLIDES.map((s, i) => <button key={i} className={i === slide ? "on" : ""} onClick={() => setSlide(i)} aria-label={`Diapositive ${i + 1}`} />)}</div>
      </div>
      <div className="tiles">
        <button className="tile t-green" onClick={() => tab("docs")}><Icon n="doc" s={28} /><h4>Mes documents</h4><p>Consultez et gérez vos documents enregistrés.</p><span className="go"><Icon n="arrowR" s={14} /></span></button>
        <button className="tile t-red" onClick={() => go("declare")}><Icon n="alert" s={28} /><h4>Déclarer une perte</h4><p>Signalez rapidement un document perdu.</p><span className="go"><Icon n="arrowR" s={14} /></span></button>
        <button className="tile t-blue" onClick={() => tab("search")}><Icon n="search" s={28} /><h4>Rechercher un document</h4><p>Vérifiez s’il est enregistré.</p><span className="free"><Icon n="users" s={11} />Accessible même sans abonnement</span></button>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="row" style={{ padding: "13px 12px 10px" }}><span style={{ color: "var(--green)" }}><Icon n="doc" s={24} /></span><div className="grow"><div className="t-h">Mes documents</div><div className="t-s">{items.length} document{items.length > 1 ? "s" : ""} enregistré{items.length > 1 ? "s" : ""}</div></div><button className="btn sm outline-g" onClick={addDoc}><Icon n="plus" s={14} /> Ajouter</button></div>
        {!docs ? <Spinner /> : items.length ? items.slice(0, 5).map(d => <DocRow key={d.id} d={d} />)
          : <div className="empty" style={{ padding: "14px 16px 20px" }}><b style={{ color: "var(--ink)" }}>CRÉEZ VOTRE DOSSIER DE DOCUMENTS</b><button className="btn green sm" onClick={addDoc}><Icon n="plus" s={14} /> Ajouter mon premier document</button></div>}
        {items.length > 5 && <button className="btn sm" style={{ width: "100%", color: "var(--blue-d)" }} onClick={() => tab("docs")}>Voir les {items.length} documents</button>}
      </div>
      <button className="community" onClick={() => go("found")}><span style={{ color: "var(--green)" }}><Icon n="shieldck" s={30} /></span><div className="grow"><div className="t-h" style={{ fontSize: 13.5 }}>Une communauté solidaire</div><div className="t-s">Si vous trouvez un document, aidez son propriétaire en le signalant via l’application.</div></div><div style={{ textAlign: "center", color: "var(--green-d)", font: "600 10.5px var(--f-display)", flex: "none", width: 78 }}><span style={{ color: "var(--red)" }}><Icon n="heart" s={22} /></span><br />Un petit geste, un grand impact !</div></button>
      <div style={{ height: 60 }} />
    </div>
  </>;
}

export function Notifs() {
  const app = useApp();
  const [data, reload] = useLoad(() => api.get("/me/notifications"), []);
  const readAll = async () => { await api.post("/me/notifications/read", {}); reload(); app.refreshNotifs(); };
  const open = async n => { if (!n.read) { await api.post("/me/notifications/read", { id: n.id }).catch(() => {}); app.refreshNotifs(); } if (n.link) linkTo(app, n.link); else reload(); };
  return <>
    <Hdr title="Notifications" right={<button className="btn sm" style={{ color: "var(--blue-d)", width: "auto" }} onClick={readAll}>Tout lire</button>} />
    <div className="pad">{!data ? <Spinner /> : data.items.length ? <div className="list">{data.items.map(n =>
      <button key={n.id} className="li" onClick={() => open(n)}><span className="ic" style={{ background: n.read ? "var(--soft)" : "var(--red-s)", color: n.read ? "var(--muted)" : "var(--red)" }}><Icon n="bell" s={16} /></span>
        <div className="grow"><div className="t-h" style={{ fontSize: 13.5 }}>{n.title}{!n.read && <> <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "var(--red)", verticalAlign: "middle" }} /></>}</div><div className="t-s">{n.body}</div><div className="t-s" style={{ fontSize: 11, marginTop: 3 }}>{fmtDT(n.t)}</div></div></button>)}</div>
      : <Empty ic="bell">Aucune notification</Empty>}</div>
  </>;
}
