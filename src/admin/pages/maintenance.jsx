/* Support technique : maintenance du système (organigramme) */
import { adminApi as api } from "../../lib/api.js";
import Icon from "../../ui/Icon.jsx";
import { Page, Panel, Table, Kpi, P, useData, useAct, Loading } from "../kit.jsx";

const dur = s => `${Math.floor(s / 86400)} j ${Math.floor(s % 86400 / 3600)} h ${Math.floor(s % 3600 / 60)} min`;

export function SystemPage() {
  const [d, reload] = useData("/admin/system", [], 30000);
  const act = useAct(reload);
  if (!d) return <Loading />;
  return <Page title="Maintenance du système" sub="État de l’API, de la base de données, des fichiers et de la sécurité"
    actions={<button className="btn sm ghost" onClick={() => act(() => api.post("/admin/system/purge"), "Codes OTP expirés purgés.")}><Icon n="trash" s={14} /> Purger les OTP expirés ({d.otp_purgeables})</button>}>
    <div className="kpis">
      <Kpi ic="server" label={`API en ligne depuis ${dur(d.api.uptime_s)}`} value="Opérationnelle" color="var(--green-d)" bg="var(--green-s)" />
      <Kpi ic="gauge" label={`Mémoire de l’API · Node ${d.api.node}`} value={`${d.api.memoire_mo} Mo`} />
      <Kpi ic="file" label={`Fichiers privés stockés · ${d.uploads.files} fichiers`} value={`${d.uploads.mo} Mo`} color="var(--ink)" bg="var(--soft)" />
      <Kpi ic="lock" label={`Connexions agents 24 h · ${d.securite.echecs_24h} échec(s)`} value={d.securite.connexions_24h} color={d.securite.echecs_24h > 5 ? "#fff" : "var(--orange)"} bg={d.securite.echecs_24h > 5 ? "var(--red)" : "var(--orange-s)"} />
      <Kpi ic="send" label="SMS envoyés sur 24 h" value={d.sms_24h} />
    </div>
    <div className="grid-2">
      <Panel title="Configuration" ic="sliders"><dl className="kv"><dt>Environnement</dt><dd>{d.api.env}</dd><dt>Base de données</dt><dd>{d.db.version}</dd>
        <dt>Paiements</dt><dd>{d.api.paiement === "live" ? <P c="green">Agrégateur réel</P> : <P c="orange">Simulation</P>}</dd><dt>SMS</dt><dd>{d.api.sms === "live" ? <P c="green">Passerelle réelle</P> : <P c="orange">Simulation</P>}</dd></dl>
        {d.api.env !== "production" && <div className="note n-orange" style={{ marginTop: 10 }}><Icon n="alert" s={16} /><span>Mode développement : les codes OTP sont renvoyés à l’application. Passez NODE_ENV=production avant la mise en ligne.</span></div>}</Panel>
      <Panel title="Tables les plus volumineuses" ic="server"><Table rows={d.db.tables} keyf={r => r.t} cols={[["Table", r => <span className="mono">{r.t}</span>], ["Lignes (approx.)", r => r.n], ["Taille", r => `${r.kb} Ko`]]} /></Panel>
    </div>
  </Page>;
}
