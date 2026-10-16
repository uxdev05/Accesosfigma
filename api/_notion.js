// Utilidades para hablar con la API de Notion.
// La llave (NOTION_TOKEN) solo vive en las variables de entorno de Vercel.
const NOTION_VERSION = "2022-06-28";
const BASE = process.env.NOTION_API_BASE || "https://api.notion.com/v1";

const DB_TITULOS = {
  leads: "Accesos Figma · Leads",
  miembros: "Accesos Figma · Miembros",
  solicitudes: "Accesos Figma · Solicitudes",
};

function token() {
  const t = process.env.NOTION_TOKEN;
  if (!t) throw httpError(500, "Falta la variable NOTION_TOKEN en Vercel.");
  return t;
}

function pageIdRaiz() {
  const raw = process.env.NOTION_PAGE_ID || "";
  // Acepta el ID solo o la URL completa de la página.
  const limpio = raw.replace(/-/g, "");
  const m = limpio.match(/[0-9a-f]{32}(?![0-9a-f])/i);
  if (!m) throw httpError(500, "Falta o es inválida la variable NOTION_PAGE_ID en Vercel.");
  return m[0];
}

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function notion(method, path, body, intento = 0) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 429 && intento < 4) {
    const s = Number(res.headers.get("retry-after")) || 1;
    await esperar(s * 1000);
    return notion(method, path, body, intento + 1);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    let msg = data.message || `Error de Notion (${res.status})`;
    if (res.status === 401) msg = "La llave de Notion no es válida (revisa NOTION_TOKEN).";
    if (res.status === 404) msg = "Notion no encuentra la página. ¿Conectaste la integración a la página? (Menú ··· → Conexiones).";
    throw httpError(res.status === 404 || res.status === 401 ? 500 : 502, msg);
  }
  return data;
}

// Ejecuta tareas de pocas en pocas para respetar el límite de Notion (~3 por segundo).
async function enLotes(items, fn, tam = 3) {
  const out = [];
  for (let i = 0; i < items.length; i += tam) {
    out.push(...(await Promise.all(items.slice(i, i + tam).map(fn))));
  }
  return out;
}

let cacheDbs = null;
async function buscarDbs() {
  if (cacheDbs) return cacheDbs;
  const encontrados = {};
  let cursor;
  do {
    const r = await notion("GET", `/blocks/${pageIdRaiz()}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ""}`);
    for (const b of r.results) {
      if (b.type !== "child_database") continue;
      for (const [k, titulo] of Object.entries(DB_TITULOS)) if (b.child_database.title === titulo) encontrados[k] = b.id;
    }
    cursor = r.has_more ? r.next_cursor : null;
  } while (cursor);
  if (encontrados.leads && encontrados.miembros && encontrados.solicitudes) cacheDbs = encontrados;
  return encontrados;
}

async function dbs() {
  const d = await buscarDbs();
  if (!d.leads || !d.miembros || !d.solicitudes)
    throw httpError(500, "Todavía no existen las bases en Notion. Abre /api/setup?admin=TU_ADMIN_KEY una vez para crearlas.");
  return d;
}

async function consultar(dbId, filter) {
  const out = [];
  let cursor;
  do {
    const r = await notion("POST", `/databases/${dbId}/query`, { page_size: 100, start_cursor: cursor, filter });
    out.push(...r.results);
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  return out;
}

// Lectura de propiedades
const P = {
  texto(p) {
    if (!p) return "";
    if (p.type === "title") return p.title.map((t) => t.plain_text).join("");
    if (p.type === "rich_text") return p.rich_text.map((t) => t.plain_text).join("");
    if (p.type === "email") return p.email || "";
    if (p.type === "select") return p.select ? p.select.name : "";
    if (p.type === "date") return p.date ? p.date.start : "";
    if (p.type === "checkbox") return p.checkbox;
    return "";
  },
  rel(p) {
    return p && p.type === "relation" ? p.relation.map((r) => r.id) : [];
  },
};

// Escritura de propiedades
const W = {
  titulo: (v) => ({ title: [{ type: "text", text: { content: String(v || "").slice(0, 1900) } }] }),
  texto: (v) => ({ rich_text: v ? [{ type: "text", text: { content: String(v).slice(0, 1900) } }] : [] }),
  email: (v) => ({ email: v || null }),
  select: (v) => ({ select: v ? { name: v } : null }),
  fecha: (v) => ({ date: v ? { start: v } : null }),
  rel: (ids) => ({ relation: (ids || []).map((id) => ({ id })) }),
};

const crearPagina = (dbId, properties) => notion("POST", "/pages", { parent: { database_id: dbId }, properties });
const actualizarPagina = (id, properties) => notion("PATCH", `/pages/${id}`, { properties });
const hoy = () => new Date().toISOString().slice(0, 10);
const normId = (id) => String(id || "").replace(/-/g, "");

module.exports = {
  notion, dbs, buscarDbs, consultar, crearPagina, actualizarPagina, enLotes,
  P, W, hoy, normId, httpError, pageIdRaiz, DB_TITULOS,
  resetCache: () => { cacheDbs = null; },
};
