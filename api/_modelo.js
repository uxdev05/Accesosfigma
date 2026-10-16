// Catálogo de plataformas/archivos, sesión (quién entra) y lectura de datos.
const crypto = require("crypto");
const N = require("./_notion");

const ARCHIVOS_APP = [
  "Access & Authentication",
  "App Security",
  "Payment Methods and Rails",
  "Support & Settings",
  "Financial Wellness",
  "Value Added Services",
  "App Credits",
  "Core Banking",
  "Core App",
];
const PLATAFORMAS = ["Plataformas internas", "Banca en Línea", "Business Center", "Web", "Justo App", "Bankaool App"];
const TIPOS = ["Review Only", "Handoff"];
const ESTATUS = ["Solicitado", "Pendiente", "Activo", "A eliminar", "Retirado"];
const ESTATUS_MIEMBRO = ["Activo", "Baja solicitada", "Dado de baja"];
const ROLES = ["Lead", "Admin", "Lead y Admin"];

function archivosDe(plataforma) {
  return ["Justo App", "Bankaool App"].includes(plataforma) ? ARCHIVOS_APP : ["General"];
}
const CATALOGO = {
  plataformas: PLATAFORMAS,
  tipos: TIPOS,
  archivos: Object.fromEntries(PLATAFORMAS.map((p) => [p, archivosDe(p)])),
};

function generarCodigo() {
  return crypto.randomBytes(12).toString("base64url");
}

function igualSeguro(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Lee las tres bases. Si leadId viene, solo trae lo de ese lead.
async function leerTodo(leadId) {
  const d = await N.dbs();
  const filtroLead = leadId ? { property: "Lead", relation: { contains: leadId } } : undefined;
  const [pl, pm, ps] = await Promise.all([
    N.consultar(d.leads),
    N.consultar(d.miembros, filtroLead),
    N.consultar(d.solicitudes, filtroLead
      ? { and: [filtroLead, { property: "Estatus", select: { does_not_equal: "Retirado" } }] }
      : { property: "Estatus", select: { does_not_equal: "Retirado" } }),
  ]);
  const leads = pl.map((p) => ({
    id: p.id,
    nombre: N.P.texto(p.properties.Nombre),
    correo: N.P.texto(p.properties.Correo),
    puesto: N.P.texto(p.properties.Puesto),
    area: N.P.texto(p.properties["Área"]),
    rol: N.P.texto(p.properties.Rol) || "Lead",
    codigo: N.P.texto(p.properties["Código de acceso"]),
    miembros: [],
  }));
  const porLead = new Map(leads.map((l) => [N.normId(l.id), l]));
  const miembros = pm.map((p) => ({
    id: p.id,
    nombre: N.P.texto(p.properties.Nombre),
    correo: N.P.texto(p.properties.Correo),
    dev: N.P.texto(p.properties.Licencia) === "Figma Dev",
    estatus: N.P.texto(p.properties.Estatus) || "Activo",
    leadId: N.P.rel(p.properties.Lead)[0] || null,
    creado: p.created_time,
    solicitudes: [],
  }));
  const porMiembro = new Map(miembros.map((m) => [N.normId(m.id), m]));
  for (const p of ps) {
    const mid = N.P.rel(p.properties["Miembro"])[0];
    const m = mid && porMiembro.get(N.normId(mid));
    if (!m) continue;
    m.solicitudes.push({
      id: p.id,
      plataforma: N.P.texto(p.properties.Plataforma),
      tipo: N.P.texto(p.properties.Tipo),
      archivo: N.P.texto(p.properties.Archivo),
      estatus: N.P.texto(p.properties.Estatus),
      fecha: N.P.texto(p.properties["Fecha de solicitud"]),
    });
  }
  for (const m of miembros) {
    const l = m.leadId && porLead.get(N.normId(m.leadId));
    if (l) l.miembros.push(m);
  }
  for (const l of leads) l.miembros.sort((a, b) => (b.creado || "").localeCompare(a.creado || ""));
  return { leads };
}

// Determina quién es a partir del código ?k= del link.
async function sesion(codigo) {
  if (!codigo) throw N.httpError(401, "Falta tu link de acceso.");
  const adminKey = process.env.ADMIN_KEY;
  if (adminKey && igualSeguro(codigo, adminKey)) return { rol: "admin", nombre: process.env.ADMIN_NOMBRE || "Administración" };
  const d = await N.dbs();
  const r = await N.consultar(d.leads, { property: "Código de acceso", rich_text: { equals: String(codigo) } });
  const p = r[0];
  if (!p || String(codigo).length < 12) throw N.httpError(401, "Este link no es válido o ya fue cambiado. Pide uno nuevo a un admin.");
  const rolNotion = N.P.texto(p.properties.Rol) || "Lead";
  const rol = rolNotion === "Admin" || rolNotion === "Lead y Admin" ? "admin" : "lead";
  // esLead: puede tener equipo propio (Lead o Lead y Admin)
  return { rol, esLead: rolNotion !== "Admin", nombre: N.P.texto(p.properties.Nombre), leadId: p.id };
}

function leerCodigo(req) {
  return (req.query && req.query.k) || req.headers["x-acceso"] || "";
}

function responderError(res, e) {
  const status = e.status || 500;
  if (status >= 500) console.error(e);
  res.status(status).json({ error: e.message || "Error inesperado" });
}

module.exports = { ROLES, CATALOGO, ESTATUS, ESTATUS_MIEMBRO, TIPOS, PLATAFORMAS, ARCHIVOS_APP, archivosDe, leerTodo, sesion, leerCodigo, responderError, generarCodigo };
