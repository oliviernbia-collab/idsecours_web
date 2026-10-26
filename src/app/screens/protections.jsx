/* Protections : individuelle, packs, formules, comparaison, détail — écrans 73 à 82 ; paiement §7, §36, §37 */
import { useEffect, useState } from "react";
import { useApp } from "../store.jsx";
import { api } from "../../lib/api.js";
import Icon from "../../ui/Icon.jsx";
import { Hdr, Btn, Field, Input, Note, Hero, Kv, Pill, Spinner, Empty, useLoad } from "../../ui/common.jsx";
import { INDIV_IN, INDIV_OUT, DOC_ST } from "@shared/constants.js";
import { fmtD, fmtDT, fcfa } from "@shared/format.js";

const pay = (app, pending) => { app.mem.pending = pending; app.closeSheet(); app.go("payment"); };

export function Protections() {
  const app = useApp();
  const [data] = useLoad(() => api.get("/protections"), []);
  if (!data) return <><Hdr title="Mes protections" /><Spinner /></>;
  const s = data.summary;
  return <>
    <Hdr title="Mes protections" />
    <div className="pad">
      <div className="card" style={{ background: "var(--ink)", color: "#fff" }}><div className="t-label" style={{ color: "#9FB0A7" }}>Mes protections</div><div style={{ font: "700 26px var(--f-display)", margin: "4px 0" }}>{s.protectedDocs} document{s.protectedDocs > 1 ? "s" : ""} protégé{s.protectedDocs > 1 ? "s" : ""}</div>
        <div className="row" style={{ flexWrap: "wrap", gap: 6 }}><span className="pill" style={{ background: "#2A3A32", color: "#fff" }}>Individuelles : {s.indiv}</span><span className="pill" style={{ background: "#2A3A32", color: "#fff" }}>Pack : {s.pack ? "actif" : "inactif"}</span><span className="pill" style={{ background: s.vip ? "#C9A227" : "#2A3A32", color: "#fff" }}>VIP : {s.vip ? "actif" : "inactif"}</span></div></div>
      {data.items.length ? data.items.map(p => {
        const c = p.kind === "INDIV" ? app.catOf(p.cat) : null;
        const title = p.kind === "INDIV" ? c.label.toUpperCase() : p.kind === "PACK" ? p.label.toUpperCase() : "FORMULE " + p.name.replace("Formule ", "").toUpperCase();
        const sub = p.kind === "INDIV" ? `Protection individuelle · ${fcfa(p.prix)}/an` : p.kind === "PACK" ? `${fcfa(p.prix)}/an · ${p.docs.length} document${p.docs.length > 1 ? "s" : ""} couvert${p.docs.length > 1 ? "s" : ""}` : `${fcfa(p.prix)}/an · ${p.docs.length}/${p.left.max === 0 ? "∞" : p.left.max} documents`;
        return <div key={p.id} className="card col" style={{ gap: 10 }}>
          <button className="row" style={{ textAlign: "left" }} onClick={() => app.go("protDetail", { id: p.id })}><span style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", background: p.kind === "FORMULE" ? p.formuleInfo.color : p.kind === "PACK" ? "var(--green)" : c.color, color: "#fff", flex: "none" }}><Icon n={p.kind === "FORMULE" ? "crown" : p.kind === "PACK" ? "shieldck" : c.icon} s={18} /></span><div className="grow"><div className="t-h" style={{ fontSize: 14 }}>{title}</div><div className="t-s">{sub}</div></div><Pill c={p.status.c} dot>{p.status.l}</Pill></button>
          <div className="row t-s" style={{ justifyContent: "space-between" }}><span>Expiration : <b style={{ color: "var(--ink)" }}>{fmtD(p.exp)}</b></span><button className="btn sm outline-g" onClick={() => pay(app, { kind: "renew", protection: p.id })}>Renouveler</button></div>
        </div>;
      }) : <Empty card ic="shield">Aucune protection active.</Empty>}
      {s.vip && <div className="card col"><div className="t-h">Avantages VIP disponibles</div><ul className="t-s" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}><li>Traitement prioritaire</li><li>Services prévus par la formule (collecte, livraison)</li><li>Publication de perte après validation</li></ul></div>}
      <div className="btns"><Btn ic="plus" onClick={() => app.go("protChoice")}>Ajouter une protection</Btn><Btn c="ghost" ic="crown" onClick={() => app.go("formules")}>Changer de formule</Btn></div>
    </div>
  </>;
}

export function ProtDetail({ p }) {
  const app = useApp();
  const [data] = useLoad(() => Promise.all([api.get("/protections"), api.get("/documents")]), []);
  if (!data) return <><Hdr title="Détail de la protection" /><Spinner /></>;
  const pr = data[0].items.find(x => x.id === +p.id); if (!pr) return <Empty>Protection introuvable.</Empty>;
  const docs = data[1].items.filter(d => pr.docs.includes(d.id)), f = pr.formuleInfo;
  return <>
    <Hdr title="Détail de la protection" />
    <div className="pad">
      <div className="card"><Kv rows={[["Protection", pr.name], ["Statut", <Pill c={pr.status.c} dot>{pr.status.l}</Pill>], ["Tarif", `${fcfa(pr.prix)} / an`], ["Début", fmtD(pr.start)], ["Expiration", fmtD(pr.exp)],
        ...(pr.kind === "PACK" ? [["Composition", `${pr.quota[500]} × 500 + ${pr.quota[300]} × 300`], ["Places restantes", `${pr.left[500]} × 500 · ${pr.left[300]} × 300`]] : []),
        ...(f ? [["Collecte", f.collecte], ["Livraison", f.livraison], ["Priorité", f.priorite], ["Publication de perte", f.publication ? "Oui, après validation" : "Non"]] : [])]} /></div>
      <div className="card col"><div className="t-label">Documents rattachés</div>
        {docs.length ? docs.map(d => <button key={d.id} className="row" style={{ textAlign: "left" }} onClick={() => app.go("docDetail", { id: d.id })}><Icon n={app.catOf(d.cat).icon} s={16} /><span className="grow">{app.catOf(d.cat).label}</span><Pill c={DOC_ST[d.st].c}>{DOC_ST[d.st].l}</Pill></button>)
          : <><span className="t-s">Aucun document rattaché pour l’instant.</span><button className="btn sm green" onClick={() => app.go("addDoc")}><Icon n="plus" s={14} /> Ajouter un document</button></>}</div>
      {pr.kind === "INDIV" && <Note>La protection individuelle donne accès à l’enregistrement sécurisé, la déclaration rapide, le suivi, les notifications, le rapprochement et la procédure de récupération. Elle n’inclut pas la collecte gratuite, la livraison gratuite, la publication de perte ni les avantages VIP.</Note>}
      <Btn ic="refresh" onClick={() => pay(app, { kind: "renew", protection: pr.id })}>Renouveler pour 1 an</Btn>
    </div>
  </>;
}

export function ProtChoice() {
  const { go } = useApp();
  return <>
    <Hdr title="Choisir le mode de protection" />
    <div className="pad">
      <button className="plan" onClick={() => go("protIndiv")}><div className="row"><span style={{ color: "var(--blue)" }}><Icon n="doc" s={24} /></span><div className="grow"><div className="t-h">Protection individuelle</div><div className="t-s">Un document pendant un an</div></div></div><div className="price">300 / 500 <small>FCFA / an selon la catégorie</small></div></button>
      <button className="plan" onClick={() => go("packs")}><div className="row"><span style={{ color: "var(--green)" }}><Icon n="shieldck" s={24} /></span><div className="grow"><div className="t-h">Protection groupée (Pack)</div><div className="t-s">Plusieurs documents, un seul paiement</div></div><Pill c="green">Populaire</Pill></div><div className="price">dès 700 <small>FCFA / an</small></div></button>
      <button className="plan" onClick={() => go("formules")}><div className="row"><span style={{ color: "#C9A227" }}><Icon n="crown" s={24} /></span><div className="grow"><div className="t-h">Formules supérieures</div><div className="t-s">Standard · Essentiel · VIP · VVIP</div></div></div><div className="t-s">Collecte, livraison, priorité et publication de perte selon la formule.</div></button>
      <Btn c="ghost" onClick={() => go("compare")}>Comparer les protections</Btn>
    </div>
  </>;
}

function TarifSheet({ c }) {
  const app = useApp();
  return <div className="col" style={{ gap: 12 }}>
    <div className="t-label">Tarif d’un document</div>
    <div className="row"><span style={{ width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", background: c.color, color: "#fff" }}><Icon n={c.icon} s={20} /></span><div className="grow t-h">{c.label}</div></div>
    <div className="price">{fcfa(c.prix)} <small>/ an</small></div>
    <div className="grid2" style={{ fontSize: 12.5 }}><div className="col" style={{ gap: 5 }}><b className="ok">Inclus</b>{INDIV_IN.map(x => <span key={x}>✓ {x}</span>)}</div><div className="col" style={{ gap: 5 }}><b className="ko">Non inclus</b>{INDIV_OUT.map(x => <span key={x}>✕ {x}</span>)}</div></div>
    <Btn onClick={() => pay(app, { kind: "indiv", cat: c.code })}>Payer et protéger</Btn>
  </div>;
}
export function ProtIndiv() {
  const app = useApp();
  return <>
    <Hdr title="Protection individuelle" />
    <div className="pad"><div className="t-s">Choisissez le document à protéger. Le tarif est récupéré automatiquement selon la catégorie.</div>
      {app.cat && <div className="list">{app.cat.cats.map(c => <button key={c.code} className="li" onClick={() => app.openSheet(<TarifSheet c={c} />)}><span className="ic" style={{ background: c.color, color: "#fff" }}><Icon n={c.icon} s={17} /></span><div className="grow"><div className="t-h" style={{ fontSize: 13.5 }}>{c.label}</div></div><b className="num">{fcfa(c.prix)}</b><Icon n="chevR" s={14} /></button>)}</div>}
    </div>
  </>;
}

export function Packs({ p }) {
  const app = useApp();
  return <>
    <Hdr title="Choisir un pack" />
    <div className="pad">{app.cat && app.cat.packs.map(k => <div key={k.code} className="plan">
      <div className="row"><div className="grow"><div className="t-h">{k.label}</div><div className="t-s">{k.description}</div></div><div className="price" style={{ fontSize: 20 }}>{fcfa(k.prix)}<small>/an</small></div></div>
      <ul><li><Icon n="check" s={13} /> {k.quota500} document(s) catégorie 500 FCFA (CNI, passeport, permis…)</li><li><Icon n="check" s={13} /> {k.quota300} document(s) catégorie 300 FCFA (cartes pro, étudiante…)</li><li><Icon n="check" s={13} /> Services de la protection individuelle pour chaque document</li></ul>
      <button className="btn green sm" style={{ width: "100%" }} onClick={() => pay(app, { kind: "pack", pack: k.code, cat: p.id || null })}>Souscrire</button>
    </div>)}<p className="t-s" style={{ textAlign: "center" }}>La composition des packs est paramétrable.</p></div>
  </>;
}

export function Formules() {
  const app = useApp();
  const [prots] = useLoad(() => api.get("/protections"), []);
  const cur = prots && prots.summary.formule;
  return <>
    <Hdr title="Formules" />
    <div className="pad">{app.cat && app.cat.formules.map(f => <div key={f.code} className={`plan ${cur === f.code ? "sel" : ""}`}>
      <div className="row"><span style={{ width: 38, height: 38, borderRadius: 11, display: "grid", placeItems: "center", background: f.color, color: "#fff" }}><Icon n="crown" s={17} /></span><div className="grow"><div className="t-h">{f.label}</div>{cur === f.code && <Pill c="green">Formule actuelle</Pill>}</div><div className="price" style={{ fontSize: 20 }}>{fcfa(f.prix)}<small>/an</small></div></div>
      <ul><li><Icon n="doc" s={13} /> {f.max_docs === 0 ? "Documents illimités" : f.max_docs + " documents"}</li><li><Icon n="truck" s={13} /> Collecte : {f.collecte_label}</li><li><Icon n="truck" s={13} /> Livraison : {f.livraison_label}</li><li><Icon n="star" s={13} /> Priorité : {f.priorite}</li><li><Icon n="mega" s={13} /> Publication de perte : {f.publication ? "oui, après validation" : "non"}</li></ul>
      {cur !== f.code && <button className={`btn ${f.publication ? "dark" : "ghost"} sm`} style={{ width: "100%" }} onClick={() => pay(app, { kind: "formule", formule: f.code })}>{cur ? "Changer pour " + f.label : "Souscrire " + f.label}</button>}
    </div>)}
      {cur && <Note>En changeant de formule, le temps restant sur votre formule actuelle est conservé.</Note>}
      <Btn c="ghost" onClick={() => app.go("compare")}>Comparer les protections</Btn></div>
  </>;
}

export function Compare() {
  const app = useApp();
  if (!app.cat) return <Spinner />;
  const P = app.cat.packs, F = app.cat.formules;
  const cols = [["Individuelle", "300/500", "1", "—", "—", "Normale", "—"], ["Pack", "dès " + Math.min(...P.map(x => x.prix)), `${Math.min(...P.map(x => x.quota500 + x.quota300))} à ${Math.max(...P.map(x => x.quota500 + x.quota300))}`, "—", "—", "Normale", "—"],
    ...F.map(f => [f.label, f.prix.toLocaleString("fr-FR"), f.max_docs === 0 ? "∞" : f.max_docs, f.collecte_label.replace(" / an", "/an"), f.livraison_label.replace(" / an", "/an"), f.priorite.split(" ")[0], f.publication ? "✓" : "—"])];
  const rows = ["Prix (FCFA/an)", "Documents", "Collecte", "Livraison", "Priorité", "Publication"];
  return <>
    <Hdr title="Comparaison des protections" />
    <div className="pad">
      <div className="card" style={{ overflowX: "auto", padding: 8 }}><table className="cmp"><thead><tr><th />{cols.map(c => <th key={c[0]}>{c[0]}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={r}><td>{r}</td>{cols.map(c => <td key={c[0]}>{c[i + 1]}</td>)}</tr>)}</tbody></table></div>
      <Note>Les droits sont déterminés par la protection réellement active (R37). Tarifs et compositions sont paramétrables par le Super Admin.</Note>
      <Btn onClick={() => app.go("protChoice")}>Choisir une protection</Btn>
    </div>
  </>;
}

/* ---------- paiement ---------- */
export function Payment() {
  const app = useApp(), pd = app.mem.pending;
  const [quote, setQuote] = useState(null), [m, setM] = useState(app.mem.payMethod || "OM"), [tel, setTel] = useState(app.user ? app.user.tel : "");
  const [card, setCard] = useState({ num: "", exp: "", cvv: "" });
  useEffect(() => { if (pd) api.post("/payments/quote", pd).then(setQuote).catch(e => { app.toast(e.message, "alert"); app.back(); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!pd) return <><Hdr title="Paiement" /><Empty>Aucun paiement en cours.</Empty></>;
  if (!quote || !app.cat) return <><Hdr title="Paiement" /><Spinner /></>;
  const meth = app.cat.pay.find(x => x.code === m);
  const doPay = async () => {
    if (m === "CB") { if (card.num.replace(/\D/g, "").length < 13 || !/^\d{2}\/\d{2}$/.test(card.exp) || !/^\d{3,4}$/.test(card.cvv)) return app.toast("Informations de carte invalides.", "alert"); }
    else if (tel.replace(/\D/g, "").length < 8) return app.toast("Numéro de paiement invalide.", "alert");
    try { app.mem.payMethod = m; const r = await api.post("/payments", { ...pd, method: m, phone: tel }); app.replace("payProcessing", { id: r.ref, m: meth.label }); }
    catch (e) { app.toast(e.message, "alert"); }
  };
  return <>
    <Hdr title="Paiement" />
    <div className="pad">
      <div className="card"><div className="t-label">Récapitulatif</div><div className="t-h" style={{ margin: "6px 0" }}>{quote.label}</div>
        <Kv rows={[...quote.lines, [<span style={{ fontWeight: 700, color: "var(--ink)" }}>Total</span>, <span className="price" style={{ fontSize: 20 }}>{fcfa(quote.amount)}</span>]]} /></div>
      <div className="t-label">Moyen de paiement</div>
      <div className="paym">{app.cat.pay.map(x => <button key={x.code} className={m === x.code ? "sel" : ""} onClick={() => setM(x.code)}><span className="lg" style={{ background: x.color, color: x.dark ? "#16201B" : "#fff" }}>{x.short}</span>{x.label}</button>)}</div>
      {m === "CB" ? <>
        <Field label="Numéro de carte" id="pay-card"><Input id="pay-card" className="mono" inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" value={card.num} onChange={v => setCard({ ...card, num: v })} /></Field>
        <div className="grid2"><Field label="Expiration" id="pay-exp"><Input id="pay-exp" placeholder="MM/AA" autoComplete="cc-exp" value={card.exp} onChange={v => setCard({ ...card, exp: v })} /></Field><Field label="CVV" id="pay-cvv"><Input id="pay-cvv" inputMode="numeric" autoComplete="cc-csc" value={card.cvv} onChange={v => setCard({ ...card, cvv: v })} /></Field></div>
      </> : <Field label={`Numéro ${meth.label}`} id="pay-tel"><Input id="pay-tel" inputMode="tel" value={tel} onChange={setTel} /></Field>}
      <Btn c="green" ic="lock" onClick={doPay}>Payer {fcfa(quote.amount)}</Btn>
      <p className="t-s" style={{ textAlign: "center", margin: 0 }}>Paiement sécurisé · vous validez la transaction sur votre téléphone.</p>
    </div>
  </>;
}

export function PayProcessing({ p }) {
  const app = useApp();
  useEffect(() => {
    let stop = false;
    const poll = async () => {
      if (stop) return;
      try { const r = await api.get(`/payments/${p.id}`); if (r.status === "RÉUSSI") { app.mem.lastPay = r; app.mem.pending = null; return app.replace("payOk"); } if (r.status === "ÉCHOUÉ") { app.toast("Paiement refusé.", "alert"); return app.back(); } }
      catch { /* réseau : on réessaie */ }
      setTimeout(poll, 1200);
    };
    const t = setTimeout(poll, 900);
    return () => { stop = true; clearTimeout(t); };
  }, [p.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="pad" style={{ minHeight: "70%", justifyContent: "center" }}><Hero spinner title="Paiement en cours…"><p className="t-s">Validez la transaction sur votre téléphone ({p.m}).</p></Hero></div>;
}

export function ReceiptSheet({ r }) {
  const app = useApp();
  return <div className="col" style={{ gap: 12, textAlign: "center" }}>
    <img src="/logo.png" alt="" width="54" height="54" style={{ alignSelf: "center", objectFit: "contain" }} />
    <div className="wm" style={{ fontSize: 20 }}><span className="i">I</span><span className="d">D</span> <span className="s">SECOURS</span></div>
    <div className="t-label">Reçu de paiement · preuve générée</div>
    <div className="card" style={{ textAlign: "left", boxShadow: "none", border: "1.5px dashed var(--line)" }}><Kv rows={[["Référence", <span className="mono">{r.ref}</span>], ["Objet", r.label], ...r.lines, ["Moyen", r.method], ["Date", fmtDT(r.t)], ["Client", app.user ? `${app.user.prenom} ${app.user.nom}` : "—"]]} /></div>
    <div className="t-s">ID SECOURS · PROSOFT ACADEMY · Abidjan</div>
    <Btn c="ghost" ic="download" onClick={() => window.print()}>Imprimer / enregistrer en PDF</Btn>
    <Btn c="ghost" onClick={app.closeSheet}>Fermer</Btn>
  </div>;
}

export function PayOk() {
  const app = useApp(), lp = app.mem.lastPay;
  if (!lp) return <Empty>Aucun paiement.</Empty>;
  const cont = () => {
    const nx = lp.next || { name: "protections" };
    app.reset([app.user ? "home" : "welcome"]);
    if (nx.name === "addDocForm") { app.mem.draft = { cat: nx.id }; app.go("addDocForm", { id: nx.id }); }
    else app.go(nx.name, nx.id ? { id: nx.id } : {});
  };
  return <div className="pad">
    <Hero ic="check" size={40} bg="var(--green)" color="#fff" title={lp.title}><span className="ref">{lp.ref}</span></Hero>
    <div className="card"><Kv rows={[...lp.lines, ["Moyen", lp.method], ["Référence", <span className="mono">{lp.ref}</span>]]} /></div>
    <Btn c="ghost" ic="receipt" onClick={() => app.openSheet(<ReceiptSheet r={lp} />)}>Voir mon reçu</Btn>
    <Btn onClick={cont}>Continuer</Btn>
  </div>;
}
