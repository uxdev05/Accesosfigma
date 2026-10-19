// Crea las 3 bases en Notion dentro de la página NOTION_PAGE_ID.
// Se abre una sola vez: https://TU-APP.vercel.app/api/setup?admin=TU_ADMIN_KEY
const N = require("./_notion");
const M = require("./_modelo");

const opciones = (arr) => ({ options: arr.map((name) => ({ name })) });
const titulo = (t) => [{ type: "text", text: { content: t } }];

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  const pagina = (msg, ok) =>
    res.status(ok ? 200 : 400).send(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:system-ui,sans-serif;background:#f9f7f1;color:#1c1c1c;padding:40px 20px"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e4e0d3;border-radius:20px;padding:24px 26px"><h2 style="margin-top:0">${ok ? "✅" : "⚠️"} Configuración</h2>${msg}</div></body>`);
  try {
    const adminKey = process.env.ADMIN_KEY;
    if (!adminKey || adminKey.length < 12) return pagina("<p>Primero agrega la variable <b>ADMIN_KEY</b> en Vercel (mínimo 12 caracteres) y vuelve a desplegar.</p>");
    if (req.query.admin !== adminKey) return pagina("<p>El parámetro <code>?admin=</code> no coincide con tu ADMIN_KEY.</p>");

    N.resetCache();
    const raiz = N.pageIdRaiz();
    const existentes = await N.buscarDbs();
    const creadas = [];
    const crearDb = (title, properties) =>
      N.notion("POST", "/databases", { parent: { type: "page_id", page_id: raiz }, title: titulo(title), properties });

    let leads = existentes.leads;
    if (!leads) {
      leads = (await crearDb(N.DB_TITULOS.leads, {
        Nombre: { title: {} },
        Correo: { email: {} },
        Puesto: { rich_text: {} },
        "Área": { rich_text: {} },
        Rol: { select: opciones(M.ROLES) },
        "Código de acceso": { rich_text: {} },
      })).id;
      creadas.push("Leads");
    }
    let miembros = existentes.miembros;
    if (!miembros) {
      miembros = (await crearDb(N.DB_TITULOS.miembros, {
        Nombre: { title: {} },
        Correo: { email: {} },
        Lead: { relation: { database_id: leads, type: "single_property", single_property: {} } },
        Licencia: { select: opciones(["Estándar", "Figma Dev"]) },
        Estatus: { select: opciones(M.ESTATUS_MIEMBRO) },
      })).id;
      creadas.push("Miembros");
    }
    if (!existentes.solicitudes) {
      await crearDb(N.DB_TITULOS.solicitudes, {
        Solicitud: { title: {} },
        Correo: { email: {} },
        Miembro: { relation: { database_id: miembros, type: "single_property", single_property: {} } },
        Lead: { relation: { database_id: leads, type: "single_property", single_property: {} } },
        Plataforma: { select: opciones(M.PLATAFORMAS) },
        Tipo: { select: opciones(M.TIPOS) },
        Archivo: { select: opciones([...M.ARCHIVOS_APP, "General"]) },
        Estatus: { select: opciones(M.ESTATUS) },
        "Fecha de solicitud": { date: {} },
        "Fecha de resolución": { date: {} },
      });
      creadas.push("Solicitudes");
    }
    N.resetCache();
    const base = `https://${req.headers.host}`;
    return pagina(
      `<p>${creadas.length ? `Se crearon las bases: <b>${creadas.join(", ")}</b>.` : "Las 3 bases ya existían, no se cambió nada."}</p>
       <p>Tu link de admin es:</p>
       <p style="word-break:break-all;background:#f1eee4;padding:10px 12px;border-radius:10px;font-family:monospace">${base}/?k=${encodeURIComponent(adminKey)}</p>
       <p>Guárdalo en un lugar seguro: quien lo tenga entra como admin.</p>
       <p><a href="${base}/?k=${encodeURIComponent(adminKey)}" style="display:inline-block;background:#2ecc71;color:#0f3d22;padding:10px 18px;border-radius:999px;font-weight:700;text-decoration:none">Abrir el dashboard</a></p>`,
      true
    );
  } catch (e) {
    return pagina(`<p>${String(e.message || e).replace(/</g, "&lt;")}</p>`);
  }
};
