import { Welcome, Login, Forgot, Signup, Otp, Verified } from "./onboarding.jsx";
import { Home, Notifs } from "./home.jsx";
import { Docs, DocDetail, AddDoc, ProtRequired, AddDocForm, AddDocPhotos, AddDocRecap, DocSaved } from "./docs.jsx";
import { Protections, ProtDetail, ProtChoice, ProtIndiv, Packs, Formules, Compare, Payment, PayProcessing, PayOk } from "./protections.jsx";
import { Declare, Declared, Dossier, OffiDecl, VipPub } from "./declare.jsx";
import { Search, Searching, NotFound, SrchHit, RecFound, RecDossier, RecVerify, RecChecking, RecResult, RecFees, RecAuth, RecDone } from "./search.jsx";
import { Found, FdControl, FoundOk, ColPos, Collecte } from "./found.jsx";
import { Chat, Profile, EditProfile, Dossiers, Receipts, AuditLog } from "./profile.jsx";
import { SosHome, SosWizard, SosContacts, SosContactAdd, SosImmediate, SosInvisible, SosTaps, SosProtection, SosVoice, SosBluetooth, SosBtPair, SosDuress, SosTest, SosDiag, SosHistory, Incident } from "./sos.jsx";

/* registre des écrans (noms identiques au prototype) */
export const SCREENS = {
  welcome: Welcome, login: Login, forgot: Forgot, signup: Signup, otp: Otp, verified: Verified,
  home: Home, notifs: Notifs,
  docs: Docs, docDetail: DocDetail, addDoc: AddDoc, protRequired: ProtRequired, addDocForm: AddDocForm, addDocPhotos: AddDocPhotos, addDocRecap: AddDocRecap, docSaved: DocSaved,
  protections: Protections, protDetail: ProtDetail, protChoice: ProtChoice, protIndiv: ProtIndiv, packs: Packs, formules: Formules, compare: Compare,
  payment: Payment, payProcessing: PayProcessing, payOk: PayOk,
  declare: Declare, declared: Declared, dossier: Dossier, offiDecl: OffiDecl, vipPub: VipPub,
  search: Search, searching: Searching, notFound: NotFound, srchHit: SrchHit,
  recFound: RecFound, recDossier: RecDossier, recVerify: RecVerify, recChecking: RecChecking, recResult: RecResult, recFees: RecFees, recAuth: RecAuth, recDone: RecDone,
  found: Found, fdControl: FdControl, foundOk: FoundOk, colPos: ColPos, collecte: Collecte,
  chat: Chat, profile: Profile, editProfile: EditProfile, dossiers: Dossiers, receipts: Receipts, auditLog: AuditLog,
  sosHome: SosHome, sosWizard: SosWizard, sosContacts: SosContacts, sosContactAdd: SosContactAdd, sosImmediate: SosImmediate, sosInvisible: SosInvisible,
  sosTaps: SosTaps, sosProtection: SosProtection, sosVoice: SosVoice, sosBluetooth: SosBluetooth, sosBtPair: SosBtPair, sosDuress: SosDuress,
  sosTest: SosTest, sosDiag: SosDiag, sosHistory: SosHistory, incident: Incident
};

/* écrans qui exigent une session */
export const PUBLIC = ["welcome", "login", "forgot", "signup", "otp", "search", "searching", "notFound", "srchHit", "recDossier", "recVerify", "recChecking", "recResult", "recFees", "recAuth", "recDone", "found", "fdControl", "foundOk", "colPos", "collecte", "chat", "payment", "payProcessing", "payOk", "declare"];
