// POST /api/accion  (header x-acceso: CODIGO)  body: { accion, ...datos }
const N = require("./_notion");
const M = require("./_modelo");
const { respuesta } = require("./data");

const CORREO_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clave = (a) => `${a.plataforma}|${a.tipo}|${a.archivo}`;

function validarAccesos(accesos) {
  if (!Array.isArray(accesos)) throw N.httpError(400, "Lista de accesos inválida.");
  const vistos = new Set();
  return accesos.filter((a) => {
    const ok = M.CATALOGO.archivos[a.plataforma] && M.TIPOS.includes(a.tipo) && M.CATALOGO.archivos[a.plataforma].includes(a.archivo);
    if (!ok) throw N.httpError(400, `Acceso inválido: ${a.plataforma} · ${a.tipo} · ${a.archivo}`);
    if (a.estatus && !["Solicitado", "Pendiente", "Activo", "A eliminar"].includes(a.estatus)) throw N.httpError(400, "Estatus inválido.");
    const k = clave(a);
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}

function propsSolicitud(correo, miembroId, leadId, a, estatus) {
  return {
    Solicitud: N.W.titulo(`${correo} · ${a.plataforma} · ${a.tipo} · ${a.archivo}`),
    Correo: N.W.email(correo),
    Miembro: N.W.rel([miembroId]),
    Lead: N.W.rel([leadId]),
    Plataforma: N.W.select(a.plataforma),
    Tipo: N.W.select(a.tipo),
    Archivo: N.W.select(a.archivo),
    Estatus: N.W.select(estatus),
    "Fecha de solicitud": N.W.fecha(N.hoy()),
  };
}

async function miembroDelLead(s, miembroId) {
  const p = await N.notion("GET", `/pages/${miembroId}`);
  const lead = N.P.rel(p.properties.Lead)[0];
  if (s.rol !== "admin" && N.normId(lead) !== N.normId(s.leadId)) throw N.httpError(403, "Ese miembro no es de tu equipo.");
  return { page: p, leadId: lead, correo: N.P.texto(p.properties.Correo), estatus: N.P.texto(p.properties.Estatus) };
}

async function solicitudesDe(miembroId) {
  const d = await N.dbs();
  return N.consultar(d.solicitudes, {
    and: [
      { property: "Miembro", relation: { contains: miembroId } },
      { property: "Estatus", select: { does_not_equal: "Retirado" } },
    ],
  });
}

const acciones = {
  // ----- Lead -----
  async crearMiembro(s, b) {
    if (s.rol !== "lead") throw N.httpError(403, "Solo un lead puede dar de alta miembros.");
    const nombre = String(b.nombre || "").trim(), correo = String(b.correo || "").trim().toLowerCase();
    if (!nombre) throw N.httpError(400, "Escribe el nombre del miembro.");
    if (!CORREO_OK.test(correo)) throw N.httpError(400, "Escribe un correo válido.");
    const accesos = validarAccesos(b.accesos || []);
    const d = await N.dbs();
    const dup = await N.consultar(d.miembros, { property: "Correo", email: { equals: correo } });
    if (dup.some((p) => N.P.texto(p.properties.Estatus) !== "Dado de baja"))
      throw N.httpError(409, "Ya existe un miembro activo con ese correo.");
    const m = await N.crearPagina(d.miembros, {
      Nombre: N.W.titulo(nombre),
      Correo: N.W.email(correo),
      Lead: N.W.rel([s.leadId]),
      Licencia: N.W.select(b.dev ? "Figma Dev" : "Estándar"),
      Estatus: N.W.select("Activo"),
    });
    await N.enLotes(accesos, (a) => N.crearPagina(d.solicitudes, propsSolicitud(correo, m.id, s.leadId, a, "Solicitado")));
  },

  async guardarMiembro(s, b) {
    if (s.rol !== "lead") throw N.httpError(403, "Solo el lead del miembro puede editarlo.");
    const mb = await miembroDelLead(s, b.miembroId);
    if (mb.estatus === "Dado de baja") throw N.httpError(400, "Este miembro ya fue dado de baja.");
    const deseados = validarAccesos(b.accesos || []);
    const d = await N.dbs();
    const actuales = await solicitudesDe(b.miembroId);
    const mapa = new Map(actuales.map((p) => [
      clave({ plataforma: N.P.texto(p.properties.Plataforma), tipo: N.P.texto(p.properties.Tipo), archivo: N.P.texto(p.properties.Archivo) }), p,
    ]));
    const tareas = [];
    for (const a of deseados) {
      const p = mapa.get(clave(a));
      const est = a.estatus || "Solicitado";
      if (!p) tareas.push(() => N.crearPagina(d.solicitudes, propsSolicitud(mb.correo, b.miembroId, mb.leadId, a, est)));
      else {
        mapa.delete(clave(a));
        const actual = N.P.texto(p.properties.Estatus);
        let nuevo = a.estatus || actual;
        if (!a.estatus && actual === "A eliminar") nuevo = "Activo"; // lo volvió a marcar
        if (nuevo !== actual) tareas.push(() => N.actualizarPagina(p.id, { Estatus: N.W.select(nuevo) }));
      }
    }
    for (const p of mapa.values()) {
      const actual = N.P.texto(p.properties.Estatus);
      if (actual === "Activo" || actual === "A eliminar") {
        if (actual !== "A eliminar") tareas.push(() => N.actualizarPagina(p.id, { Estatus: N.W.select("A eliminar") }));
      } else tareas.push(() => N.notion("PATCH", `/pages/${p.id}`, { archived: true }));
    }
    if (typeof b.dev === "boolean") tareas.push(() => N.actualizarPagina(b.miembroId, { Licencia: N.W.select(b.dev ? "Figma Dev" : "Estándar") }));
    await N.enLotes(tareas, (t) => t());
  },

  async baja(s, b) {
    if (s.rol !== "lead") throw N.httpError(403, "Solo el lead puede solicitar la baja.");
    const mb = await miembroDelLead(s, b.miembroId);
    if (mb.estatus === "Dado de baja") throw N.httpError(400, "Este miembro ya fue dado de baja.");
    const nuevo = mb.estatus === "Baja solicitada" ? "Activo" : "Baja solicitada";
    await N.actualizarPagina(b.miembroId, { Estatus: N.W.select(nuevo) });
  },

  // ----- Admin -----
  async estatus(s, b) {
    if (s.rol !== "admin") throw N.httpError(403, "Solo admins.");
    if (!["Pendiente", "Activo", "Retirado"].includes(b.estatus)) throw N.httpError(400, "Estatus inválido.");
    const ids = Array.isArray(b.ids) ? b.ids.slice(0, 200) : [];
    const props = { Estatus: N.W.select(b.estatus) };
    if (b.estatus !== "Pendiente") props["Fecha de resolución"] = N.W.fecha(N.hoy());
    await N.enLotes(ids, (id) => N.actualizarPagina(id, props));
  },

  async confirmarBaja(s, b) {
    if (s.rol !== "admin") throw N.httpError(403, "Solo admins.");
    const sols = await solicitudesDe(b.miembroId);
    await N.enLotes(sols, (p) => N.actualizarPagina(p.id, { Estatus: N.W.select("Retirado"), "Fecha de resolución": N.W.fecha(N.hoy()) }));
    await N.actualizarPagina(b.miembroId, { Estatus: N.W.select("Dado de baja") });
  },

  async crearLead(s, b) {
    if (s.rol !== "admin") throw N.httpError(403, "Solo admins.");
    const nombre = String(b.nombre || "").trim(), correo = String(b.correo || "").trim().toLowerCase();
    if (!nombre) throw N.httpError(400, "Escribe el nombre del lead.");
    if (!CORREO_OK.test(correo)) throw N.httpError(400, "Escribe un correo válido.");
    const d = await N.dbs();
    const dup = await N.consultar(d.leads, { property: "Correo", email: { equals: correo } });
    if (dup.length) throw N.httpError(409, "Ya existe un lead con ese correo.");
    await N.crearPagina(d.leads, {
      Nombre: N.W.titulo(nombre),
      Correo: N.W.email(correo),
      Puesto: N.W.texto(String(b.puesto || "").trim() || "Lead"),
      "Área": N.W.texto(String(b.area || "").trim()),
      Rol: N.W.select(b.rol === "Admin" ? "Admin" : "Lead"),
      "Código de acceso": N.W.texto(M.generarCodigo()),
    });
  },

  async nuevoCodigo(s, b) {
    if (s.rol !== "admin") throw N.httpError(403, "Solo admins.");
    await N.actualizarPagina(b.leadId, { "Código de acceso": N.W.texto(M.generarCodigo()) });
  },
};

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method !== "POST") throw N.httpError(405, "Usa POST.");
    const s = await M.sesion(M.leerCodigo(req));
    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const fn = acciones[b.accion];
    if (!fn) throw N.httpError(400, "Acción desconocida.");
    await fn(s, b);
    res.status(200).json(await respuesta(s));
  } catch (e) {
    M.responderError(res, e);
  }
};
