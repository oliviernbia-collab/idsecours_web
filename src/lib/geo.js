import { COORDS, nearestCommune } from "@shared/constants.js";

/* position réelle (GPS du navigateur) ; repli sur le centre de la commune si refusée ou indisponible */
export function locate(commune, timeout = 8000) {
  const fallback = c => { const [la, ln] = COORDS[c] || COORDS.Cocody; return { commune: c || "Cocody", lat: la, lng: ln, acc: 500, t: Date.now(), src: "Commune" }; };
  if (commune) return Promise.resolve(fallback(commune));
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(fallback());
    navigator.geolocation.getCurrentPosition(
      p => resolve({ commune: nearestCommune(p.coords.latitude, p.coords.longitude), lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6), acc: Math.round(p.coords.accuracy), t: Date.now(), src: "GPS" }),
      () => resolve(fallback()), { enableHighAccuracy: true, timeout, maximumAge: 30000 });
  });
}
export async function battery() { try { const b = await navigator.getBattery(); return Math.round(b.level * 100); } catch { return null; } }
