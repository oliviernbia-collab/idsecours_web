/* Formats partagés web + mobile */
export const pad = (n, l = 2) => String(n).padStart(l, "0");
const asDate = t => (typeof t === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t)) ? new Date(t + "T12:00:00") : new Date(t);
export const fmtD = t => { if (!t) return "—"; const d = asDate(t); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
export const fmtT = (t, s) => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}${s ? ":" + pad(d.getSeconds()) : ""}`; };
export const fmtDT = t => `${fmtD(t)} à ${fmtT(t)}`;
export const fcfa = n => `${Number(n || 0).toLocaleString("fr-FR").replace(/\s/g, " ")} FCFA`;
export const fmtTel = t => String(t || "").replace(/\D/g, "").replace(/(\d{2})(?=\d)/g, "$1 ").trim();
export const fmtLeft = ms => { ms = Math.max(0, ms); const m = Math.floor(ms / 60000), s = Math.floor(ms % 60000 / 1000); return m >= 60 ? `${Math.floor(m / 60)} h ${pad(m % 60)} min` : `${pad(m)}:${pad(s)}`; };
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const norm = s => String(s || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, " ").trim();
export const plural = (n, s, p = s + "s") => `${n} ${n > 1 ? p : s}`;
