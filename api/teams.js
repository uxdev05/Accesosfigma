// Prueba del aviso por Teams: /api/teams?admin=TU_ADMIN_KEY&correo=tu@bankaool.com
const T = require("./_teams");

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  const pagina = (msg, ok) => res.status(ok ? 200 : 400).send(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:system-ui,sans-serif;background:#f9f7f1;color:#1c1c1c;padding:40px 20px"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e4e0d3;border-radius:20px;padding:24px 26px;line-height:1.55"><h2 style="margin-top:0">${ok ? "✅" : "⚠️"} Prueba de aviso por Teams</h2>${msg}</div></body>`);
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey || req.query.admin !== adminKey) return pagina("<p>Agrega <code>?admin=TU_ADMIN_KEY&correo=tu@bankaool.com</code> al link.</p>");
  if (!process.env.TEAMS_WEBHOOK_URL) return pagina("<p>Falta la variable <b>TEAMS_WEBHOOK_URL</b> en Vercel. Agrégala y vuelve a desplegar.</p>");
  const correo = String(req.query.correo || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return pagina("<p>Agrega tu correo al link: <code>&correo=tu@bankaool.com</code></p>");
  const accesos = [{ plataforma: "Justo App", tipo: "Review Only", archivo: "App Credits" }];
  const { html, texto } = T.armarMensaje({ nombre: "Prueba", correo, lead: "Accesos a Figma", accesos });
  try {
    await T.enviar({ correo, nombre: "Prueba", lead: "Accesos a Figma", accesos, mensaje: html, mensajeTexto: texto });
    return pagina(`<p>Mensaje enviado al flujo de Teams para <b>${correo.replace(/</g, "")}</b>. Revisa tu Teams en unos segundos (te llega del bot de Workflows).</p>`, true);
  } catch (e) {
    return pagina(`<p>No se pudo enviar: ${String(e.message).replace(/</g, "&lt;")}</p><p>Revisa que la URL de <b>TEAMS_WEBHOOK_URL</b> esté completa y que el flujo esté encendido.</p>`);
  }
};
