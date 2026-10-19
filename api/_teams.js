// Avisos automáticos por Teams usando un flujo de "Workflows" (Power Automate).
// Variable en Vercel: TEAMS_WEBHOOK_URL (la URL que te da el flujo).
const N = require("./_notion");

const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function armarMensaje({ nombre, correo, lead, accesos }) {
  const primer = String(nombre || "").trim().split(/\s+/)[0] || "";
  const lista = accesos.map((a) => `• ${esc(a.plataforma)} · ${esc(a.tipo)} · ${esc(a.archivo)}`).join("<br>");
  const html =
    `Hola ${esc(primer)} 👋<br>` +
    `${lead ? `<b>${esc(lead)}</b> solicitó tu acceso a Figma y ya está listo:` : "Tu acceso a Figma ya está listo:"}<br>` +
    `${lista}<br><br>` +
    `Revisa que tengas cuenta de Figma con tu correo <b>${esc(correo)}</b> y acepta la invitación que te llegó a ese correo.`;
  const texto = html.replace(/<br>/g, "\n").replace(/<\/?b>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
  return { html, texto };
}

async function enviar(payload) {
  const url = process.env.TEAMS_WEBHOOK_URL;
  if (!url) return false;
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!r.ok) throw new Error(`Teams respondió ${r.status}`);
  return true;
}

// pages: páginas de Solicitudes (ya leídas) que acaban de pasar a Activo.
async function avisarActivados(pages) {
  if (!process.env.TEAMS_WEBHOOK_URL || !pages.length) return { enviados: 0, errores: 0 };
  const cache = new Map();
  const leer = async (id) => {
    if (!id) return null;
    if (!cache.has(id)) cache.set(id, N.notion("GET", `/pages/${id}`).catch(() => null));
    return cache.get(id);
  };
  const porMiembro = new Map();
  for (const p of pages) {
    const mid = N.P.rel(p.properties.Miembro)[0];
    if (!mid) continue;
    if (!porMiembro.has(mid)) porMiembro.set(mid, { leadId: N.P.rel(p.properties.Lead)[0], correo: N.P.texto(p.properties.Correo), accesos: [] });
    porMiembro.get(mid).accesos.push({ plataforma: N.P.texto(p.properties.Plataforma), tipo: N.P.texto(p.properties.Tipo), archivo: N.P.texto(p.properties.Archivo) });
  }
  let enviados = 0, errores = 0;
  for (const [mid, g] of porMiembro) {
    try {
      const [m, l] = await Promise.all([leer(mid), leer(g.leadId)]);
      const nombre = m ? N.P.texto(m.properties.Nombre) : "";
      const correo = (m && N.P.texto(m.properties.Correo)) || g.correo;
      if (!correo) continue;
      const lead = l ? N.P.texto(l.properties.Nombre) : "";
      const { html, texto } = armarMensaje({ nombre, correo, lead, accesos: g.accesos });
      await enviar({ correo, nombre, lead, accesos: g.accesos, mensaje: html, mensajeTexto: texto });
      enviados++;
    } catch (e) {
      console.error("Aviso Teams", e);
      errores++;
    }
  }
  return { enviados, errores };
}

module.exports = { avisarActivados, armarMensaje, enviar };
