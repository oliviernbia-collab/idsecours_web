/* Première utilisation, création du compte, connexion — §3, §4 */
import { useEffect, useRef, useState } from "react";
import { useApp } from "../store.jsx";
import { api, form, compress } from "../../lib/api.js";
import Icon from "../../ui/Icon.jsx";
import { Hdr, Btn, Field, Input, Select, Chk, Note, Hero, PhotoPick, Wordmark } from "../../ui/common.jsx";
import { COMMUNES, SLOGAN } from "@shared/constants.js";

export function Welcome() {
  const { go } = useApp();
  return <>
    <div className="welcome-hero"><img src="/logo.png" alt="" style={{ objectFit: "contain" }} /><Wordmark /><div className="t-s" style={{ fontSize: 13.5, maxWidth: 280 }}>Votre identité retrouvée, votre tranquillité restaurée.</div></div>
    <div className="pad" style={{ paddingTop: 18 }}>
      <div className="btns"><Btn ic="user" onClick={() => go("signup")}>Créer mon compte</Btn><Btn c="ghost" onClick={() => go("login")}>Se connecter</Btn></div>
      <div className="row" style={{ gap: 10, marginTop: 6 }}><span style={{ flex: 1, height: 1, background: "var(--line)" }} /><span className="t-label">Accessible sans abonnement</span><span style={{ flex: 1, height: 1, background: "var(--line)" }} /></div>
      <button className="li card" style={{ padding: 14 }} onClick={() => go("search")}><span className="ic" style={{ background: "var(--blue-s)", color: "var(--blue-d)" }}><Icon n="search" s={18} /></span><div className="grow"><div className="t-h">Rechercher un document</div><div className="t-s">Par numéro ou par nom complet</div></div><Icon n="chevR" s={15} /></button>
      <button className="li card" style={{ padding: 14 }} onClick={() => go("found")}><span className="ic" style={{ background: "var(--green-s)", color: "var(--green-d)" }}><Icon n="hand" s={18} /></span><div className="grow"><div className="t-h">J’ai trouvé un document</div><div className="t-s">Signalez-le, ID SECOURS organise la collecte</div></div><Icon n="chevR" s={15} /></button>
      <p style={{ textAlign: "center", margin: "6px 0 0", font: "italic 600 14px var(--f-display)", color: "#16365C" }}>{SLOGAN}</p>
      <p className="t-s" style={{ textAlign: "center", margin: 0 }}>Un projet porté par PROSOFT ACADEMY</p>
    </div>
  </>;
}

export function Login() {
  const app = useApp();
  const [tel, setTel] = useState(""), [pw, setPw] = useState("");
  const submit = async () => {
    if (!tel || pw.length < 4) return app.toast("Renseignez votre numéro et votre mot de passe.", "alert");
    try { const r = await api.post("/auth/login", { tel, password: pw }); await app.login(r.token, r.user); app.reset(["home"]); app.toast(`Bonjour ${r.user.prenom} !`); }
    catch (e) { app.toast(e.message, "alert"); }
  };
  return <>
    <Hdr title="Se connecter" />
    <form className="pad" onSubmit={e => { e.preventDefault(); submit(); }}>
      <div className="hero" style={{ paddingTop: 8 }}><img src="/logo.png" alt="" width="70" height="70" style={{ objectFit: "contain" }} /><p className="t-s">Connectez-vous avec votre numéro vérifié.</p></div>
      <Field label="Téléphone" id="lg-tel"><Input id="lg-tel" inputMode="tel" autoComplete="tel" placeholder="07 00 00 00 00" value={tel} onChange={setTel} /></Field>
      <Field label="Mot de passe" id="lg-pw"><Input id="lg-pw" type="password" autoComplete="current-password" value={pw} onChange={setPw} /></Field>
      <Btn type="submit" onClick={submit}>Se connecter</Btn>
      <button type="button" className="btn sm" style={{ alignSelf: "center", color: "var(--blue-d)" }} onClick={() => app.go("forgot")}>Mot de passe oublié / activer mon compte</button>
      <button type="button" className="btn sm" style={{ alignSelf: "center" }} onClick={() => app.go("signup")}>Pas encore de compte ? Créer mon compte</button>
    </form>
  </>;
}

export function Forgot() {
  const app = useApp();
  const [tel, setTel] = useState(""), [sent, setSent] = useState(null), [code, setCode] = useState(""), [pw, setPw] = useState("");
  const send = async () => { if (tel.replace(/\D/g, "").length < 8) return app.toast("Numéro invalide.", "alert"); const r = await api.post("/auth/forgot", { tel }).catch(e => app.toast(e.message, "alert")); if (r) { setSent(r); app.toast("Si ce numéro possède un compte, un code a été envoyé par SMS.", "send"); } };
  const reset = async () => { try { const r = await api.post("/auth/reset", { tel, code, password: pw }); await app.login(r.token, r.user); app.reset(["home"]); app.toast("Mot de passe modifié."); } catch (e) { app.toast(e.message, "alert"); } };
  return <>
    <Hdr title="Mot de passe oublié / activation" />
    <div className="pad">
      <Note>Votre compte a été préparé par un conseiller ID SECOURS ? Saisissez votre numéro : vous recevrez un code pour l’activer et choisir votre mot de passe.</Note>
      <Field label="Téléphone" id="fg-tel"><Input id="fg-tel" inputMode="tel" value={tel} onChange={setTel} disabled={!!sent} /></Field>
      {!sent ? <Btn onClick={send}>Recevoir un code</Btn> : <>
        <Field label="Code reçu par SMS" id="fg-code"><Input id="fg-code" className="mono" inputMode="numeric" maxLength={6} value={code} onChange={setCode} /></Field>
        <Field label="Nouveau mot de passe" id="fg-pw" hint="6 caractères minimum"><Input id="fg-pw" type="password" autoComplete="new-password" value={pw} onChange={setPw} /></Field>
        <Btn onClick={reset}>Valider</Btn>
        {sent.devCode && <div className="demo"><span className="t-label">Mode test</span><button className="btn ghost sm" onClick={() => setCode(sent.devCode)}>Remplir avec le code reçu</button></div>}
      </>}
    </div>
  </>;
}

export function Signup() {
  const app = useApp();
  const d = app.mem.signup || (app.mem.signup = { ville: "Abidjan", commune: "Cocody" });
  const [, force] = useState(0);
  const [err, setErr] = useState([]);
  const set = k => v => { d[k] = v; force(x => x + 1); };
  const f = (id, l, t = "text", ph = "", req, ac) => <Field label={l} req={req} id={"su-" + id}><Input id={"su-" + id} type={t} placeholder={ph} autoComplete={ac} value={d[id]} onChange={set(id)} err={err.includes(id)} /></Field>;
  const submit = async () => {
    const miss = ["nom", "prenoms", "tel"].filter(k => !(d[k] || "").trim()); setErr(miss);
    if (miss.length) return app.toast("Complétez les champs obligatoires (*).", "alert");
    if ((d.pw || "").length < 6) return app.toast("Mot de passe : 6 caractères minimum.", "alert");
    if (d.pw !== d.pw2) return app.toast("Les mots de passe ne correspondent pas.", "alert");
    if (!(d.c1 && d.c2 && d.c3)) return app.toast("Acceptez les trois conditions pour continuer.", "alert");
    try {
      const r = await api.post("/auth/signup", form({ ...d, password: d.pw, cgu: true, photo: d.photoFile, pw: undefined, pw2: undefined, photoFile: undefined, c1: undefined, c2: undefined, c3: undefined, photoPrev: undefined }));
      app.mem.otp = { tel: r.tel, devCode: r.devCode }; app.go("otp");
    } catch (e) { setErr((e.data && e.data.fields) || []); app.toast(e.message, "alert"); }
  };
  return <>
    <Hdr title="Créer mon compte" />
    <div className="pad">
      <PhotoPick round label="Photo selfie" capture="user" value={d.photoPrev} onPick={async f => { const c = await compress(f, 480); d.photoFile = c; d.photoPrev = c.preview; force(x => x + 1); }} />
      <div className="grid2">{f("nom", "Nom", "text", "Kouadio", 1, "family-name")}{f("prenoms", "Prénom(s)", "text", "Koffi", 1, "given-name")}</div>
      {f("tel", "Téléphone", "tel", "07 00 00 00 00", 1, "tel")}{f("email", "E-mail", "email", "vous@mail.ci", 0, "email")}
      {f("dob", "Date de naissance", "date")}
      <div className="grid2">{f("ville", "Ville")}<Field label="Commune" id="su-commune"><Select id="su-commune" value={d.commune} onChange={set("commune")} options={COMMUNES} /></Field></div>
      <div className="grid2">{f("avenue", "Avenue")}{f("rue", "Rue")}</div>
      {f("compl", "Informations complémentaires de domicile", "text", "Près de la pharmacie…")}
      <div className="grid2">{f("pw", "Mot de passe", "password", "", 1, "new-password")}{f("pw2", "Confirmation", "password", "", 1, "new-password")}</div>
      <Chk checked={d.c1} onChange={set("c1")}>J’accepte les conditions générales</Chk>
      <Chk checked={d.c2} onChange={set("c2")}>J’accepte la politique de confidentialité</Chk>
      <Chk checked={d.c3} onChange={set("c3")}>J’accepte les conditions du service</Chk>
      <Btn onClick={submit}>Recevoir mon code OTP</Btn>
    </div>
  </>;
}

export function Otp() {
  const app = useApp(), o = app.mem.otp || {};
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const refs = useRef([]);
  useEffect(() => { refs.current[0] && refs.current[0].focus(); }, []);
  const setD = (i, v) => { v = v.replace(/\D/g, ""); if (v.length > 1) { const arr = v.slice(0, 6).split(""); setDigits(d => d.map((x, j) => arr[j] ?? x)); return; } setDigits(d => d.map((x, j) => j === i ? v : x)); if (v && refs.current[i + 1]) refs.current[i + 1].focus(); };
  const check = async () => {
    try { const r = await api.post("/auth/signup/verify", { tel: o.tel, code: digits.join("") }); await app.login(r.token, r.user); app.mem.signup = null; app.reset(["home", "verified"]); }
    catch (e) { app.toast(e.message, "alert"); }
  };
  const resend = async () => { try { const r = await api.post("/auth/signup/resend", { tel: o.tel }); app.mem.otp = { ...o, devCode: r.devCode }; app.toast("Nouveau code envoyé.", "send"); } catch (e) { app.toast(e.message, "alert"); } };
  return <>
    <Hdr title="Vérification du numéro" />
    <div className="pad">
      <Hero ic="phone" size={32} bg="var(--blue-s)" color="var(--blue-d)" title="Saisissez le code reçu"><p className="t-s">Un code à 6 chiffres a été envoyé au {o.tel && o.tel.replace(/(\d{2})(?=\d)/g, "$1 ")}.</p></Hero>
      <div className="otp">{digits.map((v, i) => <input key={i} ref={el => refs.current[i] = el} value={v} inputMode="numeric" maxLength={6} aria-label={`Chiffre ${i + 1}`} onChange={e => setD(i, e.target.value)} onKeyDown={e => { if (e.key === "Backspace" && !v && refs.current[i - 1]) refs.current[i - 1].focus(); }} />)}</div>
      <Btn onClick={check}>Valider</Btn>
      <button className="btn sm" style={{ alignSelf: "center", color: "var(--blue-d)" }} onClick={resend}>Renvoyer le code</button>
      {app.mem.otp && app.mem.otp.devCode && <div className="demo"><span className="t-label">Mode test</span><button className="btn ghost sm" onClick={() => setDigits(app.mem.otp.devCode.split(""))}>Remplir avec le code reçu</button></div>}
    </div>
  </>;
}

export function Verified() {
  const { go, tab } = useApp();
  return <div className="pad">
    <Hero ic="check" size={40} bg="var(--green)" color="#fff" title="NUMÉRO VÉRIFIÉ"><p className="t-s">Votre compte ID SECOURS est créé.</p></Hero>
    <Note c="orange">La création du compte n’active aucune protection. Choisissez une protection pour enregistrer vos documents.</Note>
    <Btn ic="shield" onClick={() => go("protChoice")}>Choisir ma protection</Btn>
    <Btn c="ghost" onClick={() => tab("home")}>Plus tard, aller à l’accueil</Btn>
  </div>;
}
