/* Rechercher un document (§25–§31, accessible sans abonnement) et dossier de récupération (§32–§39) */
import { useEffect, useState } from "react";
import { useApp } from "../store.jsx";
import { api, form, compress } from "../../lib/api.js";
import Icon from "../../ui/Icon.jsx";
import { Hdr, Btn, Field, Input, Select, Note, Hero, Kv, Pill, Spinner, Timeline, PhotoPick, FilePick, LocBlock, useLoad, Qr } from "../../ui/common.jsx";
import { locate } from "../../lib/geo.js";
import { COMMUNES, SLOTS } from "@shared/constants.js";
import { fcfa, fmtD } from "@shared/format.js";
import { FeedbackBox } from "./feedback.jsx";

export function Search() {
  const app = useApp();
  const s = app.mem.srch || (app.mem.srch = { mode: "num", type: "", q: "" });
  const [, force] = useState(0);
  const set = k => v => { s[k] = v; force(x => x + 1); };
  const run = async () => {
    if (!s.q.trim()) return app.toast(s.mode === "num" ? "Saisissez un numéro." : "Saisissez un nom complet.", "alert");
    if (s.mode === "nom" && (!s.type || s.q.trim().split(/\s+/).length < 2)) return app.toast("Indiquez le type de document et le nom complet (nom + prénom).", "alert");
    app.go("searching");
    try { const [r] = await Promise.all([api.post("/search", s), new Promise(res => setTimeout(res, 900))]); app.mem.hit = r; app.replace(r.found ? "srchHit" : "notFound"); }
    catch (e) { app.toast(e.message, "alert"); app.back(); }
  };
  return <>
    {app.user ? <Hdr title="Rechercher un document" noBack /> : <Hdr title="Rechercher un document" onBack={() => app.reset(["welcome"])} />}
    <div className="pad">
      <Note ic="users"><b>ACCESSIBLE MÊME SANS ABONNEMENT</b><br />Même si votre document n’a jamais été enregistré ni déclaré sur ID SECOURS.</Note>
      <div className="seg"><button className={s.mode === "num" ? "on" : ""} onClick={() => { s.mode = "num"; s.q = ""; force(x => x + 1); }}>Par numéro</button><button className={s.mode === "nom" ? "on" : ""} onClick={() => { s.mode = "nom"; s.q = ""; force(x => x + 1); }}>Par nom complet</button></div>
      <Field label={`Type de document${s.mode === "nom" ? " *" : " (facultatif)"}`} id="sr-type"><Select id="sr-type" value={s.type} onChange={set("type")} placeholder="Tous les types" options={app.cat ? app.cat.cats.map(c => [c.code, c.label]) : []} /></Field>
      <Field label={s.mode === "num" ? "Numéro du document" : "Nom complet du titulaire"} id="sr-q"><Input id="sr-q" className={s.mode === "num" ? "mono" : ""} value={s.q} onChange={set("q")} placeholder={s.mode === "num" ? "Ex. : CI0098765432" : "NOM Prénom(s) exactement comme sur le document"} onKeyDown={e => e.key === "Enter" && run()} /></Field>
      {s.mode === "nom" && <Note c="orange" ic="lock">Recherche protégée : seule une correspondance exacte est signalée, aucune liste n’est affichée et une correspondance approximative ne permet jamais une restitution.</Note>}
      <Btn c="blue" ic="search" onClick={run}>Rechercher</Btn>
      <div style={{ height: 60 }} />
    </div>
  </>;
}
export const Searching = () => <div className="pad" style={{ minHeight: "70%", justifyContent: "center" }}><Hero spinner="var(--blue)" title="Recherche en cours…"><p className="t-s">Documents déclarés, signalés, collectés, reçus et conservés.</p></Hero></div>;

export function NotFound() {
  const app = useApp();
  return <><Hdr title="Résultat" /><div className="pad">
    <Hero ic="search" size={34} bg="var(--soft)" color="var(--muted)" title="DOCUMENT NON TROUVÉ POUR LE MOMENT"><p className="t-s">Aucun document correspondant n’est actuellement détenu par ID SECOURS. De nouveaux documents sont signalés chaque jour.</p></Hero>
    <Btn c="ghost" onClick={app.back}>Modifier ma recherche</Btn>
    <Btn ic="shield" onClick={() => app.user ? app.go("protChoice") : app.go("signup")}>Protéger mes documents</Btn>
  </div></>;
}

export function SrchHit() {
  const app = useApp(), r = app.mem.hit;
  if (!r || !r.hit) return <NotFound />;
  const h = r.hit;
  const mine = async () => { try { const x = await api.post("/recoveries", { match: r.match }); await api.rememberAccess(x.ref, x.token); app.replace("recDossier", { id: x.ref }); } catch (e) { app.toast(e.message, "alert"); } };
  return <><Hdr title="Correspondance trouvée" /><div className="pad">
    <Hero ic="check" bg="var(--green-s)" color="var(--green-d)" title="CORRESPONDANCE TROUVÉE"><p className="t-s">Seules les informations nécessaires sont affichées.</p></Hero>
    <div className="card"><Kv rows={[["Type", app.catOf(h.cat).label], ["Statut", <Pill c="blue">{h.etat}</Pill>], ["Numéro", <span className="mono">{h.num}</span>], ["Titulaire", h.nom]]} /></div>
    <Note c="orange" ic="lock">La restitution n’a lieu qu’après vérification de votre identité.</Note>
    <Btn c="green" onClick={mine}>C’est mon document</Btn><Btn c="ghost" onClick={app.back}>Ce n’est pas mon document</Btn>
  </div></>;
}

/* ---------- dossier de récupération ---------- */
const useRec = id => useLoad(() => api.get(`/recoveries/${id}`).then(r => r.rec), [id]);

export function RecFound({ p }) {
  const app = useApp(); const [r] = useRec(p.id);
  if (!r) return <Spinner />;
  return <><Hdr title="Correspondance" /><div className="pad">
    <Note c="green" ic="star"><b>BONNE NOUVELLE !</b> Un document susceptible de correspondre au vôtre a été signalé.</Note>
    <div className="card"><Kv rows={[["Type", app.catOf(r.cat).label], ["Statut", <Pill c="blue">{r.etat}</Pill>], ["Numéro", <span className="mono">{r.num}</span>]]} /></div>
    <Btn c="green" onClick={() => app.replace("recDossier", { id: r.ref })}>C’est mon document</Btn>
  </div></>;
}

export function RecDossier({ p }) {
  const app = useApp(); const [r] = useRec(p.id);
  if (!r) return <><Hdr title="Dossier de récupération" /><Spinner /></>;
  const confirmed = r.verif.st === "PROPRIÉTAIRE CONFIRMÉ";
  const steps = [["Correspondance", true], ["Vérification du propriétaire", confirmed], [r.protected ? "Frais : inclus dans votre protection" : "Paiement des frais", r.protected || r.paid], ["Récupération autorisée", r.st === "RÉCUPÉRATION AUTORISÉE" || r.done], ["Document récupéré", r.done]];
  const cur = steps.findIndex(s => !s[1]);
  const authorize = async () => { try { await api.post(`/recoveries/${r.ref}/authorize`); app.go("recAuth", { id: r.ref }); } catch (e) { app.toast(e.message, "alert"); } };
  return <><Hdr title="Dossier de récupération" /><div className="pad">
    <div className="card col" style={{ gap: 8 }}><span className="t-s">Référence</span><span className="ref" style={{ alignSelf: "flex-start" }}>{r.ref}</span>
      <div className="row"><span className="t-s grow">Statut</span><Pill c={confirmed ? "green" : r.verif.st === "VÉRIFICATION ÉCHOUÉE" ? "red" : "orange"} dot>{r.verif.st || r.st}</Pill></div></div>
    <div className="card"><Timeline steps={steps.map(([l, ok], i) => ({ l, done: ok, cur: i === cur }))} /></div>
    {r.done ? <Btn c="green" onClick={() => app.go("recDone", { id: r.ref })}>Voir le dossier clôturé</Btn>
      : !confirmed ? (r.verif.st === "EN VÉRIFICATION" ? <Note ic="clock">Vos informations sont en cours de contrôle par le service Vérification & Contrôle. Vous serez notifié de la décision.</Note>
        : <Btn c="green" ic="shieldck" onClick={() => app.go("recVerify", { id: r.ref })}>Vérifier ma propriété</Btn>)
        : !r.protected && !r.paid ? <Btn onClick={() => app.go("recFees", { id: r.ref })}>Payer les frais de récupération</Btn>
          : r.st === "RÉCUPÉRATION AUTORISÉE" ? <Btn c="green" onClick={() => app.go("recAuth", { id: r.ref })}>Voir la récupération autorisée</Btn>
            : <Btn c="green" onClick={authorize}>Continuer</Btn>}
    <Btn c="ghost" ic="msg" onClick={() => app.go("chat", { id: r.ref })}>Contacter ID SECOURS</Btn>
  </div></>;
}

export function RecVerify({ p }) {
  const app = useApp(); const [r] = useRec(p.id);
  const [v, setV] = useState({ tel: "", otp: "", dob: "", lieu: "", selfie: null, selfiePrev: null, just: null, devCode: null, sent: false });
  useEffect(() => { if (r) setV(s => ({ ...s, sent: r.verif.otpSent, dob: s.dob || (app.user && app.user.dob) || "" })); }, [r]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!r) return <><Hdr title="Vérification du propriétaire" /><Spinner /></>;
  const sendOtp = async () => { try { const x = await api.post(`/recoveries/${r.ref}/otp`, { tel: v.tel }); setV(s => ({ ...s, sent: true, devCode: x.devCode })); app.toast("Code envoyé par SMS.", "send"); } catch (e) { app.toast(e.message, "alert"); } };
  const submit = async () => {
    if (!v.sent) return app.toast("Demandez d’abord votre code OTP.", "alert");
    app.go("recChecking");
    try { const [x] = await Promise.all([api.post(`/recoveries/${r.ref}/verify`, form({ otp: v.otp, dob: v.dob, lieu: v.lieu, selfie: v.selfie, just: v.just })), new Promise(res => setTimeout(res, 1200))]); app.mem.recResult = x.rec; app.replace("recResult", { id: r.ref }); }
    catch (e) { app.mem.recResult = { ref: r.ref, verif: { st: e.status === 429 ? "VÉRIFICATION ÉCHOUÉE" : "VÉRIFICATION ÉCHOUÉE" }, err: e.message }; app.replace("recResult", { id: r.ref }); }
  };
  return <><Hdr title="Vérification du propriétaire" /><div className="pad">
    <div className="t-s">Contrôles requis avant toute restitution : OTP, selfie, informations connues et justificatif.</div>
    <div className="card col"><div className="row"><b className="grow">1. Code OTP</b>{v.sent && <Pill c="blue">Envoyé</Pill>}</div>
      {r.verif.needTel && <Input inputMode="tel" placeholder="Votre numéro de téléphone" value={v.tel} onChange={x => setV({ ...v, tel: x })} />}
      <div className="row"><Input className="mono" inputMode="numeric" maxLength={6} placeholder="Code à 6 chiffres" value={v.otp} onChange={x => setV({ ...v, otp: x })} /><button className="btn sm ghost" onClick={sendOtp}>{v.sent ? "Renvoyer" : "Recevoir"}</button></div>
      {v.devCode && <button className="btn ghost sm" onClick={() => setV({ ...v, otp: v.devCode })}>Mode test : remplir le code reçu</button>}</div>
    <div className="card col"><b>2. Selfie</b><PhotoPick capture="user" label="Prendre un selfie" style={{ aspectRatio: "auto", height: 110 }} value={v.selfiePrev} onPick={async f => { const c = await compress(f, 720); setV(s => ({ ...s, selfie: c, selfiePrev: c.preview })); }} /></div>
    <div className="card col"><b>3. Informations connues</b>
      <Field label="Date de naissance du titulaire" id="rv-dob"><Input id="rv-dob" type="date" value={v.dob} onChange={x => setV({ ...v, dob: x })} /></Field>
      <Field label="Lieu de naissance" id="rv-lieu"><Input id="rv-lieu" placeholder="Ex. : Bouaké" value={v.lieu} onChange={x => setV({ ...v, lieu: x })} /></Field></div>
    <div className="card col"><b>4. Justificatif (facultatif)</b><FilePick label="Acte de naissance, déclaration officielle…" value={v.just && v.just.name} onPick={f => setV({ ...v, just: f })} /></div>
    <Btn c="green" onClick={submit}>Soumettre pour vérification</Btn>
  </div></>;
}
export const RecChecking = () => <div className="pad" style={{ minHeight: "70%", justifyContent: "center" }}><Hero spinner title="Vérification en cours…"><p className="t-s">Contrôle de l’OTP, du selfie et des informations connues par le service Vérification & Contrôle.</p></Hero></div>;

export function RecResult({ p }) {
  const app = useApp(), r = app.mem.recResult || { verif: {} }, st = r.verif.st;
  const ok = st === "PROPRIÉTAIRE CONFIRMÉ", fail = st === "VÉRIFICATION ÉCHOUÉE", pending = st === "EN VÉRIFICATION";
  const authorize = async () => { try { await api.post(`/recoveries/${p.id}/authorize`); app.reset([app.user ? "home" : "welcome"]); app.go("recAuth", { id: p.id }); } catch (e) { app.toast(e.message, "alert"); } };
  return <div className="pad">
    <Hero ic={ok ? "check" : fail ? "x" : pending ? "clock" : "alert"} bg={ok ? "var(--green)" : fail ? "var(--red)" : pending ? "var(--blue)" : "var(--orange)"} color="#fff" title={st || "VÉRIFICATION"}>
      <p className="t-s">{ok ? "Votre identité correspond au titulaire du document." : fail ? (r.err || "Le code OTP ne correspond pas. Vérifiez le SMS reçu et réessayez.") : pending ? "Un agent Vérification & Contrôle examine votre dossier. Vous serez notifié." : "Ajoutez le selfie et les informations manquantes pour poursuivre."}</p></Hero>
    {ok ? (r.protected ? <><Note c="green" ic="shield">Document protégé : aucun frais de récupération.</Note><Btn c="green" onClick={authorize}>Continuer</Btn></> : <Btn onClick={() => app.replace("recFees", { id: p.id })}>Voir les frais de récupération</Btn>)
      : pending ? <Btn c="ghost" onClick={() => app.replace("recDossier", { id: p.id })}>Suivre mon dossier</Btn>
        : <Btn onClick={() => app.replace("recVerify", { id: p.id })}>Compléter la vérification</Btn>}
    <Btn c="ghost" ic="msg" onClick={() => app.go("chat", { id: p.id })}>Contacter ID SECOURS</Btn>
  </div>;
}

export function RecFees({ p }) {
  const app = useApp(); const [r] = useRec(p.id);
  if (!r || !app.cat) return <><Hdr title="Frais de récupération" /><Spinner /></>;
  const c = app.catOf(r.cat), svc = app.cat.fraisService;
  return <><Hdr title="Frais de récupération" /><div className="pad">
    <div className="t-s">Ce document n’était pas protégé avant sa perte. Les frais de récupération sont indépendants du tarif annuel de protection.</div>
    <div className="card"><Kv rows={[["Document", c.label], ["Dossier", <span className="mono">{r.ref}</span>], ["Montant", fcfa(r.fee)], ["Frais de service", fcfa(svc)], [<span style={{ fontWeight: 700, color: "var(--ink)" }}>Total</span>, <span className="price" style={{ fontSize: 20 }}>{fcfa(r.fee + svc)}</span>]]} /></div>
    <Btn onClick={() => { app.mem.pending = { kind: "frais", recovery: r.ref }; app.go("payment"); }}>Payer</Btn>
  </div></>;
}

/* confirmation du point de livraison (Collecte §35) */
function DeliverySheet({ r, onDone }) {
  const app = useApp();
  const [loc, setLoc] = useState(null), [rep, setRep] = useState(""), [slot, setSlot] = useState(SLOTS[1]);
  const send = async () => {
    try {
      const x = await api.post(`/recoveries/${r.ref}/delivery`, { ...loc, repere: rep, slot });
      app.closeSheet();
      if (x.included) { app.toast(`Livraison ${x.ref} programmée.`); onDone(); } else { app.mem.pending = { kind: "livraison", recovery: r.ref }; app.go("payment"); }
    } catch (e) { app.toast(e.message, "alert"); }
  };
  return <div className="col" style={{ gap: 12 }}><h3 className="t-h">Point de livraison</h3>
    <p className="t-s" style={{ margin: 0 }}>Le document vous sera remis en main propre, après contrôle de votre code. Il ne sera jamais remis à un tiers.</p>
    {loc ? <LocBlock loc={loc} title="Point de livraison" /> : <Btn c="green" ic="pin" onClick={async () => setLoc(await locate())}>Utiliser ma position actuelle</Btn>}
    <Select value={loc ? loc.commune : ""} onChange={async v => setLoc(await locate(v))} placeholder="… ou choisir la commune" options={COMMUNES} />
    <Input placeholder="Repère : immeuble, pharmacie, carrefour…" value={rep} onChange={setRep} />
    <Field label="Créneau souhaité" id="dl-slot"><Select id="dl-slot" value={slot} onChange={setSlot} options={SLOTS} /></Field>
    <Btn disabled={!loc} onClick={send}>Confirmer le point de livraison</Btn></div>;
}
const DLV_TXT = { ATTENTE_PAIEMENT: "En attente du paiement", A_PLANIFIER: "Demande reçue · planification en cours", PLANIFIEE: "Partenaire désigné · préparation", EN_LIVRAISON: "En route vers votre point de livraison", LIVREE: "Livrée", REMISE_BLOQUEE: "Remise bloquée · retour en agence", ECHEC: "Livraison impossible · retour en agence", RETOURNEE: "Document de retour en agence" };

export function RecAuth({ p }) {
  const app = useApp(); const [r, reload] = useLoad(() => api.get(`/recoveries/${p.id}`).then(x => x.rec), [p.id], { poll: 20000 });
  if (!r) return <><Hdr title="Récupération autorisée" /><Spinner /></>;
  if (r.done) return <RecDone p={p} />;
  const deliv = () => app.openSheet(<DeliverySheet r={r} onDone={reload} />);
  const lv = r.livraison && !["RETOURNEE"].includes(r.livraison.st) ? r.livraison : null;
  return <><Hdr title="Récupération autorisée" /><div className="pad">
    <Hero ic="check" bg="var(--green)" color="#fff" title="RÉCUPÉRATION AUTORISÉE" style={{ paddingTop: 12 }}><span className="ref">{r.ref}</span></Hero>
    <div className="card"><Kv rows={[["Agence", r.agence], ["Lieu", r.lieu], ["Horaires", r.horaires]]} /></div>
    <div className="card col"><div className="t-label">Instructions</div><div className="t-s" style={{ color: "var(--ink2)" }}>Présentez ce QR code de retrait à l’accueil. Il est personnel et ne peut servir qu’une seule fois.</div>
      {r.qr && <Qr src={r.qr} />}{r.withdrawalCode && <div style={{ textAlign: "center", font: "800 22px ui-monospace,Menlo,monospace", letterSpacing: ".2em" }}>{r.withdrawalCode}</div>}
      <div className="t-label" style={{ marginTop: 6 }}>Pièces nécessaires</div>
      <ul className="t-s" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, color: "var(--ink2)" }}><li>Référence du dossier {r.ref}</li><li>Téléphone ayant reçu l’OTP</li><li>Justificatif d’identité secondaire si disponible</li>{r.paid && <li>Reçu de paiement {r.payRef}</li>}</ul></div>
    {lv ? <div className="card col" style={{ gap: 8 }}><div className="row"><span style={{ color: "var(--blue)" }}><Icon n="truck" s={22} /></span><div className="grow"><div className="t-h" style={{ fontSize: 13.5 }}>Livraison {lv.ref}</div><div className="t-s">{DLV_TXT[lv.st]}</div></div></div>
        <Kv rows={[["Point", `${lv.commune}${lv.repere ? " · " + lv.repere : ""}`], ["Créneau", lv.slot || "—"], lv.partner && ["Partenaire", `${lv.partner} · ${lv.collecteur}`], lv.fail_reason && ["Motif", lv.fail_reason]]} />
        {lv.st === "EN_LIVRAISON" && <Note c="orange" ic="lock">À l’arrivée du livreur, montrez votre QR code ci-dessus ou communiquez-lui le code reçu par SMS. Ne le donnez à personne d’autre.</Note>}
        {lv.st === "ATTENTE_PAIEMENT" && <Btn sm onClick={() => { app.mem.pending = { kind: "livraison", recovery: r.ref }; app.go("payment"); }}>Payer la livraison</Btn>}</div>
      : <div className="card row"><span style={{ color: "var(--blue)" }}><Icon n="truck" s={22} /></span><div className="grow"><div className="t-h" style={{ fontSize: 13.5 }}>Option : livraison par partenaire</div><div className="t-s">Incluse selon votre formule, sinon {fcfa(app.cat ? app.cat.fraisLivraison : 1500)} · Abidjan</div></div><button className="btn sm ghost" style={{ width: "auto" }} onClick={deliv}>Choisir</button></div>}
    <Btn c="ghost" ic="msg" onClick={() => app.go("chat", { id: r.ref })}>Contacter ID SECOURS</Btn>
  </div></>;
}

export function RecDone({ p }) {
  const app = useApp(); const [r] = useRec(p.id);
  if (!r) return <Spinner />;
  const c = app.catOf(r.cat);
  return <div className="pad">
    <Hero ic="check" size={40} bg="var(--green)" color="#fff" title="DOCUMENT RÉCUPÉRÉ"><p className="t-s">{c.label} · dossier {r.ref} · {fmtD(r.doneT)}</p></Hero>
    <FeedbackBox dossier={r.ref} />
    <Btn c="ghost" ic="receipt" onClick={async () => { try { const { proof: x } = await api.get(`/recoveries/${r.ref}/proof`); app.openSheet(<div className="col" style={{ gap: 12 }}><div className="t-label">Preuve de restitution</div><span className="ref" style={{ alignSelf: "flex-start" }}>{x.reference}</span>
      <div className="card" style={{ boxShadow: "none", border: "1.5px dashed var(--line)" }}><Kv rows={[["Dossier", x.dossier], ["Document", `${x.document} · ${x.numero}`], ["Agence", x.agence], ["Date", new Date(x.date).toLocaleString("fr-FR")], ["Mode", x.mode], x.agent && ["Agent", x.agent]]} /></div>
      <Btn c="ghost" onClick={() => window.print()}>Imprimer / PDF</Btn><Btn c="ghost" onClick={app.closeSheet}>Fermer</Btn></div>); } catch (e) { app.toast(e.message, "alert"); } }}>Ma preuve de restitution</Btn>
    {r.protected ? <Btn onClick={() => app.tab("docs")}>Voir mes documents</Btn> : <div className="card col" style={{ gap: 10 }}><div className="t-h">Souhaitez-vous désormais protéger ce document ?</div><div className="price">{fcfa(c.prix)} <small>/ an · catégorie {c.short}</small></div>
      <Btn ic="shieldck" onClick={() => { if (!app.user) return app.go("signup"); app.mem.pending = { kind: "indiv", cat: r.cat }; app.go("payment"); }}>Protéger ce document</Btn>
      <Btn c="ghost" onClick={() => app.go(app.user ? "packs" : "signup")}>Voir les packs</Btn><Btn c="ghost" ic="crown" onClick={() => app.go(app.user ? "formules" : "signup")}>Découvrir VIP</Btn></div>}
    <Btn c="ghost" onClick={() => app.reset([app.user ? "home" : "welcome"])}>Terminer</Btn>
  </div>;
}
