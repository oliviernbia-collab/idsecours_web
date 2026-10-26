import { createApi } from "@shared/api.js";

const storage = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* stockage indisponible */ } },
  del: k => { try { localStorage.removeItem(k); } catch { /* stockage indisponible */ } }
};
export const api = createApi({ baseUrl: import.meta.env.VITE_API_URL || "/api", storage });
export const adminApi = createApi({ baseUrl: import.meta.env.VITE_API_URL || "/api", storage });
export { storage };

/* FormData à partir d'un objet (fichiers compris) */
export function form(obj) {
  const fd = new FormData();
  Object.entries(obj).forEach(([k, v]) => { if (v === undefined || v === null || v === "") return; if (v instanceof Blob) fd.append(k, v, v.name || k + ".jpg"); else fd.append(k, typeof v === "object" ? JSON.stringify(v) : String(v)); });
  return fd;
}

/* compression des images pour connexions faibles (§69) */
export function compress(file, max = 1280, quality = .78) {
  return new Promise(resolve => {
    if (!file || !file.type.startsWith("image/")) return resolve(file);
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement("canvas");
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      c.toBlob(b => { URL.revokeObjectURL(url); resolve(b ? Object.assign(new File([b], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }), { preview: c.toDataURL("image/jpeg", .6) }) : file); }, "image/jpeg", quality);
    };
    im.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    im.src = url;
  });
}
