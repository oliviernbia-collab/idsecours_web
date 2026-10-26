/* Constantes d'affichage partagées (libellés, statuts, communes) — identiques au prototype */
export const COLORS = {
  red: "#E3141B", redD: "#B30E13", redS: "#FDECEC", green: "#13A043", greenD: "#0B7A32", greenS: "#E7F6EC",
  blue: "#1A7EE0", blueD: "#1262B3", blueS: "#E7F1FC", orange: "#F28C12", orangeS: "#FEF2E2",
  ink: "#16201B", ink2: "#3B4742", muted: "#6A7570", line: "#E3E8E5", soft: "#F3F6F4", card: "#FFFFFF", stage: "#EDF1EE", gold: "#C9A227"
};
export const COMMUNES = ["Cocody", "Plateau", "Yopougon", "Abobo", "Adjamé", "Marcory", "Treichville", "Koumassi", "Port-Bouët", "Attécoubé", "Bingerville", "Anyama", "Songon"];
export const COORDS = { Cocody: [5.3599, -3.981], Plateau: [5.3197, -4.0168], Yopougon: [5.3456, -4.0892], Abobo: [5.4162, -4.0159], "Adjamé": [5.3655, -4.0234], Marcory: [5.302, -3.9817], Treichville: [5.296, -4.0047], Koumassi: [5.2962, -3.9467], "Port-Bouët": [5.255, -3.926], "Attécoubé": [5.333, -4.04], Bingerville: [5.355, -3.885], Anyama: [5.495, -4.052], Songon: [5.308, -4.258] };
/* commune la plus proche d'une coordonnée GPS */
export const nearestCommune = (lat, lng) => Object.entries(COORDS).sort((a, b) => Math.hypot(a[1][0] - lat, a[1][1] - lng) - Math.hypot(b[1][0] - lat, b[1][1] - lng))[0][0];

export const DOC_ST = {
  PRESENT: { l: "Présent", c: "green" }, PERDU: { l: "Perdu / Déclaré", c: "red" }, RECHERCHE: { l: "Recherche active", c: "orange" },
  POT: { l: "Potentiellement retrouvé", c: "blue" }, RETROUVE: { l: "Retrouvé / Pris en charge", c: "blue" },
  RECUP: { l: "Récupération en cours", c: "orange" }, RECUPERE: { l: "Récupéré", c: "green" }
};
export const shortSt = st => st === "PRESENT" ? "Présent" : st === "PERDU" ? "Perdu" : st === "RECUPERE" ? "Récupéré" : "Suivi";
export const isLost = st => !["PRESENT", "RECUPERE"].includes(st);
export const LOST_STEPS = [["PERDU", "Déclaration enregistrée"], ["RECHERCHE", "Recherche active"], ["POT", "Correspondance détectée"], ["RETROUVE", "Vérification & contrôle"], ["RECUP", "Récupération autorisée"], ["RECUPERE", "Document récupéré"]];
export const CIRCS = ["Perte dans un transport (gbaka, taxi, bus)", "Perte dans un lieu public", "Vol / agression", "Oubli dans un établissement", "Autre"];
export const ADMINS = ["Commissariat de police", "Brigade de gendarmerie", "Mairie", "Ambassade / Consulat", "Autre administration"];
export const OFFI_ST = { "NON TRANSMISE": "grey", "TRANSMISE": "blue", "EN VÉRIFICATION": "orange", "VALIDÉE": "green", "COMPLÉMENT REQUIS": "red", "REJETÉE": "red" };
export const OFFI_CHAIN = ["NON TRANSMISE", "TRANSMISE", "EN VÉRIFICATION", "VALIDÉE"];
/* cahier des charges : livreur → Réception en agence (double confirmation) → Vérification & Contrôle → conservé et recherchable */
export const COL_STEPS = ["Signalement", "Collecte demandée", "Partenaire sélectionné", "Mission transmise au livreur", "Livreur en route", "Document remis au livreur", "Reçu en agence par Réception & Restitution", "Contrôlé par Vérification & Contrôle", "Conservé et recherchable"];
export const STEP_RECEIVED = 8;
/* organigramme (①–⑥) concilié avec le cahier des charges : le document physique est reçu par la Réception,
   la Vérification contrôle puis transmet le dossier validé à la Réception, qui restitue */
export const FLOW = [
  { n: 1, l: "Signalement d’un document trouvé", s: "Utilisateurs (grand public)", c: "#16365C" },
  { n: 2, l: "Déploiement d’un livreur", s: "Collecte & Livraison → partenaire", c: "#F28C12" },
  { n: 3, l: "Dépôt du document collecté", s: "Livreur → agence (réception physique)", c: "#13A043" },
  { n: 4, l: "Contrôle des documents reçus", s: "Vérification & Contrôle", c: "#1A7EE0" },
  { n: 5, l: "Transmission des dossiers validés", s: "Vérification → Réception & Restitution", c: "#E3141B" },
  { n: 6, l: "Récupération du document", s: "Par l’utilisateur uniquement", c: "#0B7A32" }
];
export const SLOGAN = "Ensemble pour une société plus sûre !";
export const ECOSYSTEM = "Un écosystème connecté pour des documents en sécurité.";
export const SLOTS = ["Aujourd’hui · 17h – 19h", "Demain · 8h – 12h", "Demain · 14h – 18h", "Samedi · 9h – 13h"];
export const PUB_CONSENTS = ["J’autorise ID SECOURS à publier cet avis de perte.", "Je comprends que le numéro complet ne sera jamais publié (R42).", "Je comprends qu’aucune image privée de mon document ne sera utilisée (R41).", "Je comprends qu’une publication n’est pas une preuve de propriété (R45)."];
export const SLIDES = [
  { h: "Protégez vos documents, vivez l’esprit tranquille.", p: "ID SECOURS, toujours à vos côtés.", bg: ["#E3F3E8", "#BFE3C8", "#9ED2AE"], go: "protChoice", card: 1 },
  { h: "Document perdu ? Déclarez-le en une minute.", p: "Vos informations sont déjà enregistrées.", bg: ["#FDECEC", "#F9C9CA"], go: "declare", ic: "alert", c: "#E3141B" },
  { h: "Vous avez trouvé un document ?", p: "Signalez-le, un partenaire agréé le collecte.", bg: ["#E7F1FC", "#C3DDF8"], go: "found", ic: "hand", c: "#1A7EE0" },
  { h: "En danger ? Vos proches sont prévenus.", p: "SOS discret, position partagée.", bg: ["#FEF2E2", "#FAD9AE"], go: "sosHome", ic: "siren", c: "#F28C12" }
];
export const INDIV_IN = ["Enregistrement sécurisé", "Déclaration rapide", "Suivi et notifications", "Rapprochement", "Procédure de récupération"];
export const INDIV_OUT = ["Collecte gratuite", "Livraison gratuite", "Publication de perte", "Avantages VIP"];
export const PRIVACY = ["Les informations privées du propriétaire et du déposant ne sont jamais échangées automatiquement. ID SECOURS reste l’intermédiaire.", "Les images de vos documents sont privées et ne sont jamais publiées.", "Aucune recherche par nom ne permet d’explorer la base.", "La géolocalisation est utilisée uniquement pour une déclaration, une trouvaille, une collecte, un SOS ou un Mode Protection.", "Vos contacts d’urgence ne peuvent pas vous suivre en permanence."];

/* ---------- SOS ---------- */
export const SOS_FLOW = ["CRÉÉ", "DÉCLENCHÉ", "TRANSMISSION_EN_COURS", "ALERTES_ENVOYÉES", "PRIS_EN_CHARGE", "INTERVENTION_EN_COURS", "RÉSOLU", "CLÔTURÉ"];
export const TRIG = { immediat: "SOS immédiat (bouton)", invisible: "SOS invisible (boutons physiques)", taps: "SOS invisible (tapotements)", vocal: "Code vocal (Mode Protection)", bluetooth: "Déclencheur Bluetooth", contrainte: "Code sous contrainte", test: "Test du SOS" };
export const C_ST = { ATTENTE: ["En attente", "grey"], ENVOYEE: ["Notification envoyée", "blue"], LIVREE: ["Livrée", "blue"], OUVERTE: ["Ouverte", "orange"], PRIS: ["Prend en charge", "green"], REFUSEE: ["Indisponible", "red"], EXPIREE: ["Sans réponse · expirée", "red"], TEST_OK: ["Test reçu", "green"] };
export const DIAG_ROWS = [["app", "SOS application"], ["notif", "Notifications"], ["gps", "GPS"], ["bg", "Fonctionnement arrière-plan"], ["lock", "Écran verrouillé"], ["btn", "Boutons physiques"], ["taps", "Tapotements"], ["vocal", "Code vocal"], ["bt", "Bluetooth"], ["sms", "SMS de secours"]];
export const KEYL = { "V+": "Volume +", "V-": "Volume −", "P": "Latéral" };
export const RELATIONS = ["Mère", "Père", "Frère", "Sœur", "Conjoint(e)", "Ami(e)", "Collègue", "Autre"];
export const invLabel = s => ({ ENVOYEE: "Invitation envoyée", ACCEPTEE: "Application installée", REFUSEE: "Refusée" })[s] || s;
export const BT_FOUND = [["BTN-4F2A", "Bouton SOS ID SECOURS", "IDS-B1", "Bouton SOS certifié", 92], ["BLE-77C1", "Porte-clés BLE iTag", "iTag v2", "Dispositif BLE", 64], ["EAR-200", "Écouteurs BT-200", "BT-200", "Écouteur (validation technique requise)", 80]];
export const URGENCES = [["Police secours", "110 · 111 · 170"], ["Sapeurs-pompiers", "180"], ["SAMU", "185"]];
