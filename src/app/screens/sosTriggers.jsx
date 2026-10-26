/* Déclenchement d'une alerte SOS + reconnaissance de la séquence de boutons (niveau 2) */
import { api } from "../../lib/api.js";
import { locate, battery } from "../../lib/geo.js";

export async function triggerSOS(app, type) {
  try {
    const [loc, bat] = await Promise.all([locate(null, 4000), battery()]);
    const r = await api.post("/sos/incidents", { type, loc, battery: bat, network: navigator.onLine ? "Internet" : "Hors connexion" });
    app.setLocked(false);
    app.go("incident", { id: r.ref });
    return r.ref;
  } catch (e) { app.toast(e.message, "alert"); return null; }
}

let keyBuf = [];
/* renvoie true si la touche a complété la séquence configurée */
export function pressKey(app, k, testOnly = false, onFeedback) {
  const s = app.sos; if (!s) return false;
  const now = Date.now();
  if (keyBuf.length && now - keyBuf[keyBuf.length - 1].t > s.seqDelay * 1000) keyBuf = [];
  keyBuf.push({ k, t: now }); keyBuf = keyBuf.slice(-6);
  if (onFeedback) onFeedback(keyBuf.map(x => x.k));
  const seq = s.seq, tail = keyBuf.slice(-seq.length).map(x => x.k);
  if (seq.length >= 2 && tail.length === seq.length && tail.every((x, i) => x === seq[i])) {
    keyBuf = [];
    if (testOnly) return "test";
    if (!(app.user && s.enabled && s.seqEnabled)) return false;
    triggerSOS(app, "invisible");
    return true;
  }
  return false;
}
