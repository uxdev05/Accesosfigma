// Conexión con Notion por OAuth (para cuando no puedes crear un "API token").
// 1) Abre: https://TU-APP.vercel.app/api/oauth?admin=TU_ADMIN_KEY
// 2) Notion te pide elegir la página "Accesos Figma" y autorizar.
// 3) Te regresa aquí y te muestra la llave para pegarla en NOTION_TOKEN.
const crypto = require("crypto");

function pagina(res, html, ok) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(ok ? 200 : 400).send(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:system-ui,sans-serif;background:#f9f7f1;color:#1c1c1c;padding:40px 20px"><div style="max-width:600px;margin:auto;background:#fff;border:1px solid #e4e0d3;border-radius:20px;padding:24px 26px;line-height:1.55"><h2 style="margin-top:0">${ok ? "✅" : "⚠️"} Conexión con Notion</h2>${html}</div></body>`);
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

module.exports = async (req, res) => {
  const { NOTION_CLIENT_ID: id, NOTION_CLIENT_SECRET: secreto, ADMIN_KEY: adminKey } = process.env;
  if (!id || !secreto) return pagina(res, "<p>Faltan las variables <b>NOTION_CLIENT_ID</b> y <b>NOTION_CLIENT_SECRET</b> en Vercel. Agrégalas y vuelve a desplegar.</p>");
  if (!adminKey || adminKey.length < 12) return pagina(res, "<p>Falta la variable <b>ADMIN_KEY</b> en Vercel (mínimo 12 caracteres).</p>");
  const redirect = `https://${req.headers.host}/api/oauth`;
  const state = crypto.createHmac("sha256", adminKey).update("notion-oauth").digest("hex").slice(0, 24);

  if (!req.query.code) {
    if (req.query.error) return pagina(res, `<p>Notion canceló la autorización (${esc(req.query.error)}). Vuelve a intentarlo.</p>`);
    if (req.query.admin !== adminKey) return pagina(res, "<p>Abre este link agregando <code>?admin=TU_ADMIN_KEY</code> al final.</p>");
    const url = `https://api.notion.com/v1/oauth/authorize?client_id=${encodeURIComponent(id)}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirect)}&state=${state}`;
    res.statusCode = 302;
    res.setHeader("Location", url);
    return res.end();
  }

  if (req.query.state !== state) return pagina(res, "<p>La autorización no coincide. Empieza de nuevo desde <code>/api/oauth?admin=TU_ADMIN_KEY</code>.</p>");
  try {
    const r = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${id}:${secreto}`).toString("base64"),
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({ grant_type: "authorization_code", code: req.query.code, redirect_uri: redirect }),
    });
    const d = await r.json();
    if (!r.ok || !d.access_token) return pagina(res, `<p>Notion respondió: ${esc(d.error_description || d.message || d.error || r.status)}</p><p>Revisa que el <b>Redirect URI</b> de tu conexión en Notion sea exactamente:<br><code>${esc(redirect)}</code></p>`);
    return pagina(res, `
      <p>¡Listo! Notion autorizó la conexión${d.workspace_name ? ` con <b>${esc(d.workspace_name)}</b>` : ""}.</p>
      <p><b>1.</b> Copia esta llave:</p>
      <textarea readonly onfocus="this.select()" rows="3" style="width:100%;box-sizing:border-box;font-family:monospace;font-size:13px;padding:10px;border-radius:10px;border:1px solid #e4e0d3;background:#f1eee4">${esc(d.access_token)}</textarea>
      <p><b>2.</b> En Vercel → tu proyecto → <b>Settings → Environment Variables</b>, crea <b>NOTION_TOKEN</b> y pega la llave.</p>
      <p><b>3.</b> Ve a <b>Deployments → ··· → Redeploy</b>.</p>
      <p><b>4.</b> Abre <code>/api/setup?admin=TU_ADMIN_KEY</code> para crear las bases.</p>
      <p style="color:#6b6558;font-size:13px">No compartas esta llave con nadie. Cierra esta página cuando termines.</p>`, true);
  } catch (e) {
    return pagina(res, `<p>No se pudo hablar con Notion: ${esc(e.message)}</p>`);
  }
};
