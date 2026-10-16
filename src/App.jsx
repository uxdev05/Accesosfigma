import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

// ---------- Tema ----------
const w = {
  base200: "#f9f7f1", base100: "#ffffff", base300: "#f1eee4", border: "#e4e0d3",
  text: "#1c1c1c", sub: "#6b6558", primary: "#2ecc71", primaryText: "#0f3d22",
  successBg: "#e3f6e9", successText: "#1e8a4c", warningBg: "#fdf1de", warningText: "#b6791a",
  infoBg: "#e7f0fb", infoText: "#2e6fc9", errorBg: "#fbe9e7", errorText: "#c0392b",
  heading: "'Poppins', 'Nunito', -apple-system, BlinkMacSystemFont, sans-serif",
  body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
};
const ESTATUS = {
  Solicitado: { bg: w.infoBg, text: w.infoText },
  Pendiente: { bg: w.warningBg, text: w.warningText },
  Activo: { bg: w.successBg, text: w.successText },
  "A eliminar": { bg: w.errorBg, text: w.errorText },
};
const ESTATUS_LEAD = ["Solicitado", "Pendiente", "Activo", "A eliminar"];
const card = { background: w.base100, border: `1px solid ${w.border}`, borderRadius: 20, boxShadow: "0 1px 3px rgba(20,20,20,0.04), 0 5px 22px rgba(20,20,20,0.03)" };
const label = { fontSize: 12, color: w.sub, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 700, fontFamily: w.body };
const input = { width: "100%", boxSizing: "border-box", padding: "11px 14px", borderRadius: 12, border: `1px solid ${w.border}`, background: w.base200, fontSize: 14.5, fontFamily: w.body, color: w.text, outline: "none" };
const btn = (prim, extra) => ({ background: prim ? w.primary : w.base100, border: prim ? "none" : `1px solid ${w.border}`, borderRadius: 999, color: prim ? w.primaryText : w.text, fontSize: 13, fontWeight: 700, padding: "8px 15px", cursor: "pointer", fontFamily: w.body, whiteSpace: "nowrap", ...extra });
const linkBtn = (color) => ({ background: "none", border: "none", color: color || w.sub, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: w.body, padding: "8px 10px" });
const chip = (on) => ({ padding: "7px 13px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: w.body, border: `1px solid ${on ? w.primary : w.border}`, background: on ? w.successBg : w.base100, color: on ? w.successText : w.sub });
const CORREO_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fechaCorta = (f) => (f ? new Date(f + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "");
const clave = (a) => `${a.plataforma}|${a.tipo}|${a.archivo}`;

// ---------- Iconos ----------
const Ico = ({ d, size = 16, color = "currentColor", sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const ChevD = (p) => <Ico {...p} d={<path d="m6 9 6 6 6-6" />} />;
const ChevR = (p) => <Ico {...p} d={<path d="m9 6 6 6-6 6" />} />;
const Mail = (p) => <Ico {...p} d={<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>} />;
const Plus = (p) => <Ico {...p} d={<path d="M12 5v14M5 12h14" />} />;
const X = (p) => <Ico {...p} d={<path d="M18 6 6 18M6 6l12 12" />} />;
const Check = (p) => <Ico {...p} sw={3} d={<path d="m5 12 5 5 9-10" />} />;

function Pill({ label: l, bg, text, small, onClick }) {
  return (
    <span onClick={onClick} style={{ display: "inline-flex", alignItems: "center", background: bg, color: text, borderRadius: 999, fontSize: small ? 11.5 : 12.5, fontWeight: 600, padding: small ? "3px 9px" : "5px 12px", cursor: onClick ? "pointer" : "default", fontFamily: w.body, whiteSpace: "nowrap" }}>{l}</span>
  );
}
const PillEstatus = ({ e, small = true }) => <Pill small={small} label={e} bg={(ESTATUS[e] || {}).bg || w.base300} text={(ESTATUS[e] || {}).text || w.sub} />;

// ---------- API ----------
const codigo = new URLSearchParams(location.search).get("k") || "";
async function api(path, body) {
  const r = await fetch(path, body
    ? { method: "POST", headers: { "Content-Type": "application/json", "x-acceso": codigo }, body: JSON.stringify(body) }
    : { headers: { "x-acceso": codigo } });
  const data = await r.json().catch(() => ({ error: "No se pudo leer la respuesta del servidor." }));
  if (!r.ok) throw new Error(data.error || "Error inesperado");
  return data;
}
async function copiarTexto(txt) {
  try { await navigator.clipboard.writeText(txt); return true; } catch (_) {}
  try {
    const ta = document.createElement("textarea"); ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select(); const ok = document.execCommand("copy"); document.body.removeChild(ta); return ok;
  } catch (_) { return false; }
}

// ---------- Editor de accesos de una plataforma ----------
function PlataformaEditor({ plataforma, archivos, accesos, onToggle, onEstatus, onQuitar, editable }) {
  const [abierto, setAbierto] = useState(true);
  const deEsta = accesos.filter((a) => a.plataforma === plataforma);
  return (
    <div style={{ background: w.base300, border: `1px solid ${w.border}`, borderRadius: 18, padding: "14px 16px", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setAbierto(!abierto)}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {abierto ? <ChevD color={w.sub} /> : <ChevR color={w.sub} />}
          <span style={{ fontSize: 15.5, fontWeight: 700, fontFamily: w.heading }}>{plataforma}</span>
          {deEsta.length > 0 && <Pill small label={`${deEsta.length}`} bg={w.successBg} text={w.successText} />}
        </div>
        {editable && <button onClick={(e) => { e.stopPropagation(); onQuitar(); }} title="Quitar plataforma" style={{ background: "none", border: "none", color: w.sub, cursor: "pointer", padding: 4 }}><X size={15} /></button>}
      </div>
      {abierto && (
        <div style={{ marginTop: 12 }}>
          {["Review Only", "Handoff"].map((tipo) => (
            <div key={tipo} style={{ marginBottom: 14 }}>
              <div style={{ ...label, fontSize: 11.5, marginBottom: 4 }}>{tipo}</div>
              {archivos.map((ar) => {
                const a = deEsta.find((x) => x.tipo === tipo && x.archivo === ar);
                return (
                  <div key={ar} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "9px 4px", borderBottom: `1px solid ${w.border}` }}>
                    <label onClick={() => editable && onToggle({ plataforma, tipo, archivo: ar })} style={{ display: "flex", alignItems: "center", gap: 10, cursor: editable ? "pointer" : "default", color: a ? w.text : w.sub, fontSize: 14, fontWeight: a ? 600 : 400, minWidth: 0 }}>
                      <span style={{ width: 20, height: 20, borderRadius: 7, border: `1.5px solid ${a ? w.primary : "#c9c4b4"}`, background: a ? w.primary : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{a && <Check size={13} color="#fff" />}</span>
                      {ar}
                    </label>
                    {a && (editable && a.id ? <SelectorEstatus valor={a.estatus} onChange={(v) => onEstatus(a, v)} /> : <PillEstatus e={a.estatus || "Solicitado"} />)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SelectorEstatus({ valor, onChange }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <Pill small label={`${valor} ▾`} bg={(ESTATUS[valor] || {}).bg} text={(ESTATUS[valor] || {}).text} onClick={() => setAbierto(!abierto)} />
      {abierto && (
        <div style={{ position: "absolute", top: "120%", right: 0, background: w.base100, border: `1px solid ${w.border}`, borderRadius: 14, zIndex: 30, minWidth: 150, boxShadow: "0 10px 30px rgba(0,0,0,0.10)", padding: 6 }}>
          {ESTATUS_LEAD.map((e) => (
            <div key={e} onClick={() => { onChange(e); setAbierto(false); }} style={{ padding: "8px 10px", borderRadius: 10, cursor: "pointer" }}
              onMouseEnter={(ev) => (ev.currentTarget.style.background = w.base300)} onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}>
              <PillEstatus e={e} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MenuPlataformas({ disponibles, onElegir, texto = "Agregar plataforma" }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button type="button" disabled={!disponibles.length} onClick={() => setAbierto(!abierto)} style={btn(false, { display: "flex", alignItems: "center", gap: 6, opacity: disponibles.length ? 1 : 0.4, border: "none", boxShadow: "0 1px 3px rgba(20,20,20,0.06), 0 4px 14px rgba(20,20,20,0.06)" })}><Plus size={14} /> {texto}</button>
      {abierto && disponibles.length > 0 && (
        <div style={{ position: "absolute", top: "115%", right: 0, background: w.base100, border: `1px solid ${w.border}`, borderRadius: 16, zIndex: 20, minWidth: 210, boxShadow: "0 10px 30px rgba(0,0,0,0.10)", padding: 6 }}>
          {disponibles.map((p) => (
            <div key={p} onClick={() => { onElegir(p); setAbierto(false); }} style={{ padding: "10px 12px", borderRadius: 10, fontSize: 13.5, cursor: "pointer" }}
              onMouseEnter={(ev) => (ev.currentTarget.style.background = w.base300)} onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}>{p}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Vista de lead ----------
function NuevoMiembro({ catalogo, onGuardar, onCancelar, ocupado }) {
  const [nombre, setNombre] = useState(""), [correo, setCorreo] = useState(""), [dev, setDev] = useState(false);
  const [plats, setPlats] = useState([]), [accesos, setAccesos] = useState([]), [error, setError] = useState("");
  const toggle = (a) => setAccesos(accesos.some((x) => clave(x) === clave(a)) ? accesos.filter((x) => clave(x) !== clave(a)) : [...accesos, a]);
  const guardar = (e) => {
    e.preventDefault();
    if (!nombre.trim()) return setError("Escribe el nombre del miembro.");
    if (!CORREO_OK.test(correo.trim())) return setError("Escribe un correo válido.");
    if (plats.length && !accesos.length) return setError("Marca al menos un archivo en las plataformas que agregaste.");
    onGuardar({ nombre: nombre.trim(), correo: correo.trim().toLowerCase(), dev, accesos }).catch((er) => setError(er.message));
  };
  return (
    <form onSubmit={guardar} style={{ ...card, border: `1.5px solid ${w.primary}`, marginBottom: 12, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 17, fontWeight: 800, fontFamily: w.heading }}>Nuevo miembro</div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <label style={{ flex: "1 1 220px", minWidth: 0 }}><span style={{ ...label, display: "block", marginBottom: 6 }}>Nombre completo</span>
          <input autoFocus value={nombre} onChange={(e) => { setNombre(e.target.value); setError(""); }} placeholder="Ej. María López" style={input} /></label>
        <label style={{ flex: "1 1 220px", minWidth: 0 }}><span style={{ ...label, display: "block", marginBottom: 6 }}>Correo</span>
          <input type="email" value={correo} onChange={(e) => { setCorreo(e.target.value); setError(""); }} placeholder="nombre@bankaool.com" style={input} /></label>
      </div>
      <div><span style={{ ...label, display: "block", marginBottom: 6 }}>Tipo de licencia</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setDev(false)} style={chip(!dev)}>Estándar</button>
          <button type="button" onClick={() => setDev(true)} style={chip(dev)}>Figma Dev</button>
        </div></div>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={label}>Accesos (opcional)</span>
          <MenuPlataformas disponibles={catalogo.plataformas.filter((p) => !plats.includes(p))} onElegir={(p) => setPlats([...plats, p])} />
        </div>
        {plats.map((p) => (
          <PlataformaEditor key={p} plataforma={p} archivos={catalogo.archivos[p]} accesos={accesos} editable onToggle={toggle}
            onQuitar={() => { setPlats(plats.filter((x) => x !== p)); setAccesos(accesos.filter((a) => a.plataforma !== p)); }} />
        ))}
      </div>
      {error && <div style={{ color: w.errorText, background: w.errorBg, fontSize: 13, padding: "8px 12px", borderRadius: 10 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button type="button" onClick={onCancelar} style={linkBtn()}>Cancelar</button>
        <button type="submit" disabled={ocupado} style={btn(true, { opacity: ocupado ? 0.6 : 1 })}>{ocupado ? "Guardando…" : "Agregar miembro"}</button>
      </div>
    </form>
  );
}

function TarjetaMiembro({ m, catalogo, accion, ocupado }) {
  const [abierto, setAbierto] = useState(false);
  const [borrador, setBorrador] = useState(null); // {dev, accesos, plats}
  const [error, setError] = useState("");
  const editando = borrador !== null;
  const base = { dev: m.dev, accesos: m.solicitudes, plats: [...new Set(m.solicitudes.map((s) => s.plataforma))] };
  const v = borrador || base;
  const baja = m.estatus === "Baja solicitada", dadoBaja = m.estatus === "Dado de baja";
  const empezar = () => borrador || base;
  const cambiar = (patch) => setBorrador({ ...empezar(), ...patch });
  const toggle = (a) => { const b = empezar(); cambiar({ accesos: b.accesos.some((x) => clave(x) === clave(a)) ? b.accesos.filter((x) => clave(x) !== clave(a)) : [...b.accesos, a] }); };
  const resumen = useMemo(() => Object.entries(m.solicitudes.reduce((o, s) => ((o[s.plataforma] = (o[s.plataforma] || 0) + 1), o), {})), [m.solicitudes]);
  const guardar = async () => {
    setError("");
    try {
      await accion({ accion: "guardarMiembro", miembroId: m.id, dev: v.dev, accesos: v.accesos.map((a) => ({ plataforma: a.plataforma, tipo: a.tipo, archivo: a.archivo, ...(a.id ? { estatus: a.estatus } : {}) })) });
      setBorrador(null);
    } catch (e) { setError(e.message); }
  };
  return (
    <div style={{ ...card, marginBottom: 12, opacity: (baja || dadoBaja) && !editando ? 0.6 : 1, outline: editando ? `1.5px solid ${w.primary}` : "none", boxShadow: editando ? "0 6px 24px rgba(46,204,113,0.14)" : card.boxShadow }}>
      <div onClick={() => !editando && setAbierto(!abierto)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "16px 18px", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          {abierto ? <ChevD size={18} color={w.sub} /> : <ChevR size={18} color={w.sub} />}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 16.5, fontWeight: 700, fontFamily: w.heading }}>{m.nombre}</span>
              {v.dev && <Pill small label="Figma Dev" bg={w.infoBg} text={w.infoText} />}
              {baja && <Pill small label="Baja solicitada" bg={w.errorBg} text={w.errorText} />}
              {dadoBaja && <Pill small label="Dado de baja" bg={w.base300} text={w.sub} />}
              {editando && <Pill small label="Modo edición" bg={w.successBg} text={w.successText} />}
            </div>
            <div style={{ fontSize: 13, color: w.sub, display: "flex", alignItems: "center", gap: 5, marginTop: 2, wordBreak: "break-all" }}><Mail size={12} /> {m.correo}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {resumen.map(([p, n]) => <Pill key={p} small label={`${p.split(" ")[0]} · ${n}`} bg={w.base300} text={w.sub} />)}
        </div>
      </div>
      {abierto && (
        <div style={{ padding: "0 18px 18px" }}>
          {!dadoBaja && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={label}>Licencia</span>
                <button type="button" onClick={() => cambiar({ dev: false })} style={chip(!v.dev)}>Estándar</button>
                <button type="button" onClick={() => cambiar({ dev: true })} style={chip(v.dev)}>Figma Dev</button>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {!editando && <button onClick={() => accion({ accion: "baja", miembroId: m.id }).catch((e) => setError(e.message))} style={linkBtn(w.errorText)}>{baja ? "Cancelar baja" : "Solicitar baja"}</button>}
                <MenuPlataformas disponibles={catalogo.plataformas.filter((p) => !v.plats.includes(p))} onElegir={(p) => { const b = empezar(); setBorrador({ ...b, plats: [...b.plats, p] }); }} />
              </div>
            </div>
          )}
          {v.plats.length === 0 && <div style={{ color: w.sub, fontSize: 13.5, padding: "20px 0", textAlign: "center", border: `1.5px dashed ${w.border}`, borderRadius: 14 }}>{dadoBaja ? "Este miembro fue dado de baja." : "Sin plataformas asignadas."}</div>}
          {v.plats.map((p) => (
            <PlataformaEditor key={p} plataforma={p} archivos={catalogo.archivos[p] || ["General"]} accesos={v.accesos} editable={!dadoBaja} onToggle={toggle}
              onEstatus={(a, est) => { const b = empezar(); cambiar({ accesos: b.accesos.map((x) => (clave(x) === clave(a) ? { ...x, estatus: est } : x)) }); }}
              onQuitar={() => { const b = empezar(); setBorrador({ ...b, plats: b.plats.filter((x) => x !== p), accesos: b.accesos.filter((a) => a.plataforma !== p) }); }} />
          ))}
          {error && <div style={{ color: w.errorText, background: w.errorBg, fontSize: 13, padding: "8px 12px", borderRadius: 10, marginTop: 8 }}>{error}</div>}
          {editando && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginTop: 14, paddingTop: 14, borderTop: `1px solid ${w.border}` }}>
              <span style={{ fontSize: 12.5, color: w.sub }}>Tienes cambios sin guardar. Si quitas un acceso activo, quedará “A eliminar” para el admin.</span>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { setBorrador(null); setError(""); }} style={linkBtn()}>Cancelar</button>
                <button onClick={guardar} disabled={ocupado} style={btn(true, { opacity: ocupado ? 0.6 : 1 })}>{ocupado ? "Guardando…" : "Guardar cambios"}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VistaLead({ lead, catalogo, accion, ocupado }) {
  const [nuevo, setNuevo] = useState(false);
  return (
    <Contenedor ancho={720}>
      <div style={{ ...label, marginBottom: 14 }}>Encargado</div>
      <div style={{ ...card, padding: "20px 22px", marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: w.heading }}>{lead.nombre}</div>
          <div style={{ fontSize: 13.5, color: w.sub, marginTop: 2 }}>{lead.correo} · {lead.puesto}</div>
        </div>
        {lead.area && <Pill label={lead.area} bg={w.successBg} text={w.successText} />}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={label}>Miembros del equipo ({lead.miembros.length})</span>
        {!nuevo && <button onClick={() => setNuevo(true)} style={btn(true, { display: "flex", alignItems: "center", gap: 6, boxShadow: "0 6px 18px rgba(46,204,113,0.22)" })}><Plus size={14} /> Agregar miembro</button>}
      </div>
      {nuevo && <NuevoMiembro catalogo={catalogo} ocupado={ocupado} onCancelar={() => setNuevo(false)} onGuardar={async (d) => { await accion({ accion: "crearMiembro", ...d }); setNuevo(false); }} />}
      {lead.miembros.length === 0 && !nuevo && <div style={{ color: w.sub, fontSize: 14, padding: "28px 0", textAlign: "center", border: `1.5px dashed ${w.border}`, borderRadius: 14 }}>Aún no tienes miembros. Agrega al primero para solicitar sus accesos.</div>}
      {lead.miembros.map((m) => <TarjetaMiembro key={m.id} m={m} catalogo={catalogo} accion={accion} ocupado={ocupado} />)}
    </Contenedor>
  );
}

// ---------- Vista de admin ----------
function filasDe(leads) {
  const r = [];
  for (const L of leads) for (const m of L.miembros) for (const s of m.solicitudes) r.push({ ...s, L, m });
  return r;
}

function Kpi({ n, texto, color, activo, onClick }) {
  return (
    <button onClick={onClick} style={{ ...card, flex: "1 1 150px", textAlign: "left", padding: "16px 18px", cursor: "pointer", outline: activo ? `2px solid ${color}` : "none", fontFamily: w.body }}>
      <div style={{ fontSize: 28, fontWeight: 800, fontFamily: w.heading, color }}>{n}</div>
      <div style={{ fontSize: 13, color: w.sub, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 99, background: color }} />{texto}</div>
    </button>
  );
}

const ROLES = [["Lead", "Lead"], ["Lead y Admin", "Lead y Admin"], ["Admin", "Solo admin"]];
function NuevoLead({ existentes, onGuardar, onCancelar, ocupado, inicial, titulo = "Nuevo lead", textoBoton = "Agregar", sinMargen }) {
  const [f, setF] = useState(inicial || { nombre: "", correo: "", puesto: "", area: "", rol: "Lead" }), [error, setError] = useState("");
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setError(""); };
  const guardar = (e) => {
    e.preventDefault();
    if (!f.nombre.trim()) return setError("Escribe el nombre.");
    if (!CORREO_OK.test(f.correo.trim())) return setError("Escribe un correo válido.");
    if (existentes.some((L) => L.id !== (inicial && inicial.id) && L.correo.toLowerCase() === f.correo.trim().toLowerCase())) return setError("Ya existe un lead con ese correo.");
    onGuardar(f).catch((er) => setError(er.message));
  };
  const campo = (k, t, ph, extra) => (
    <label style={{ flex: "1 1 220px", minWidth: 0 }}><span style={{ ...label, display: "block", marginBottom: 6 }}>{t}</span><input {...extra} value={f[k]} onChange={set(k)} placeholder={ph} style={input} /></label>
  );
  return (
    <form onSubmit={guardar} style={{ ...card, border: `1.5px solid ${w.primary}`, padding: "20px 22px", marginBottom: sinMargen ? 0 : 14, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 17, fontWeight: 800, fontFamily: w.heading }}>{titulo}</div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>{campo("nombre", "Nombre completo", "Ej. Laura Gómez", { autoFocus: true })}{campo("correo", "Correo", "nombre@bankaool.com", { type: "email" })}</div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>{campo("puesto", "Puesto", "Ej. Lead de Producto")}{campo("area", "Área", "Ej. Producto")}</div>
      <div><span style={{ ...label, display: "block", marginBottom: 6 }}>Rol</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {ROLES.map(([v, t]) => <button key={v} type="button" onClick={() => setF({ ...f, rol: v })} style={chip(f.rol === v)}>{t}</button>)}
        </div>
        <div style={{ fontSize: 12.5, color: w.sub, marginTop: 6 }}>{f.rol === "Lead" ? "Da de alta a su equipo y pide accesos." : f.rol === "Admin" ? "Ve todas las solicitudes y otorga accesos. No tiene equipo propio." : "Tiene su propio equipo y además ve el panel de admin."}</div></div>
      {error && <div style={{ color: w.errorText, background: w.errorBg, fontSize: 13, padding: "8px 12px", borderRadius: 10 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button type="button" onClick={onCancelar} style={linkBtn()}>Cancelar</button>
        <button type="submit" disabled={ocupado} style={btn(true, { opacity: ocupado ? 0.6 : 1 })}>{ocupado ? "Guardando…" : textoBoton}</button>
      </div>
    </form>
  );
}

function VistaAdmin({ leads, accion, ocupado, avisar }) {
  const [tab, setTab] = useState("sol"), [fil, setFil] = useState("atender"), [fl, setFl] = useState("todos"), [q, setQ] = useState("");
  const [modoLote, setModoLote] = useState("otorgar"), [copiado, setCopiado] = useState(""), [verTxt, setVerTxt] = useState({});
  const [abiertos, setAbiertos] = useState({}), [nuevoLead, setNuevoLead] = useState(false), [editando, setEditando] = useState(null);
  const soloLeads = leads.filter((L) => L.rol !== "Admin" || L.miembros.length);
  const filas = filasDe(leads);
  const cnt = (e) => filas.filter((f) => f.estatus === e).length;
  const bajas = [];
  for (const L of leads) for (const m of L.miembros) if (m.estatus === "Baja solicitada") bajas.push({ L, m });
  const hacer = (body, msg) => accion(body).then(() => msg && avisar(msg)).catch((e) => avisar(e.message, true));
  // Cambia estatus y ofrece "Deshacer" en el aviso (regresa cada solicitud a su estatus anterior).
  const estatus = (ids, e, msg) => {
    const previo = {};
    for (const f of filas) if (ids.includes(f.id)) previo[f.id] = f.estatus;
    return accion({ accion: "estatus", ids, estatus: e })
      .then(() => avisar(msg || (e === "Activo" ? "Marcado como activo." : e === "Pendiente" ? "Marcado como en proceso." : "Retiro confirmado."), false, async () => {
        const porEstatus = {};
        for (const [id, est] of Object.entries(previo)) (porEstatus[est] ||= []).push(id);
        try { for (const [est, grupo] of Object.entries(porEstatus)) await accion({ accion: "estatus", ids: grupo, estatus: est }); avisar("Cambio deshecho."); }
        catch (er) { avisar(er.message, true); }
      }))
      .catch((er) => avisar(er.message, true));
  };
  const copiar = async (id, txt) => {
    if (await copiarTexto(txt)) { setCopiado(id); setTimeout(() => setCopiado((x) => (x === id ? "" : x)), 2200); }
    else setVerTxt({ ...verTxt, [id]: true });
  };
  const ql = q.trim().toLowerCase();
  const vis = filas.filter((f) => (fil === "todas" || (fil === "atender" ? f.estatus !== "Activo" : f.estatus === fil)) && (fl === "todos" || f.L.id === fl) && (!ql || `${f.m.nombre} ${f.m.correo} ${f.archivo} ${f.plataforma}`.toLowerCase().includes(ql)));
  const grupos = [];
  for (const f of vis) { let g = grupos.find((x) => x.m.id === f.m.id); if (!g) grupos.push((g = { L: f.L, m: f.m, filas: [] })); g.filas.push(f); }
  const fChip = (k, t, n) => <button onClick={() => setFil(k)} style={{ ...chip(fil === k), fontSize: 12.5, padding: "6px 12px" }}>{t}{n != null ? ` · ${n}` : ""}</button>;
  const selectLead = (
    <select value={fl} onChange={(e) => setFl(e.target.value)} style={{ padding: "10px 12px", borderRadius: 12, border: `1px solid ${w.border}`, background: w.base100, fontSize: 14, fontFamily: w.body, color: w.text }}>
      <option value="todos">Todos los leads</option>
      {soloLeads.map((L) => <option key={L.id} value={L.id}>{L.nombre}</option>)}
    </select>
  );
  const vacio = (t) => <div style={{ color: w.sub, fontSize: 13.5, padding: "28px 0", textAlign: "center", border: `1.5px dashed ${w.border}`, borderRadius: 14 }}>{t}</div>;
  const acciones = (f) =>
    f.estatus === "Solicitado" ? [<button key="t" disabled={ocupado} onClick={() => estatus([f.id], "Pendiente")} style={btn(false, { fontSize: 12.5, padding: "6px 13px" })}>Tomar</button>, <button key="a" disabled={ocupado} onClick={() => estatus([f.id], "Activo")} style={btn(true, { fontSize: 12.5, padding: "6px 13px" })}>Marcar activo</button>]
    : f.estatus === "Pendiente" ? [<button key="a" disabled={ocupado} onClick={() => estatus([f.id], "Activo")} style={btn(true, { fontSize: 12.5, padding: "6px 13px" })}>Marcar activo</button>]
    : f.estatus === "A eliminar" ? [<button key="r" disabled={ocupado} onClick={() => estatus([f.id], "Retirado")} style={btn(false, { fontSize: 12.5, padding: "6px 13px", color: w.errorText })}>Confirmar retiro</button>]
    : f.estatus === "Activo" ? [<button key="d" disabled={ocupado} title="Regresar a En proceso" onClick={() => estatus([f.id], "Pendiente", "Regresado a Pendiente.")} style={btn(false, { fontSize: 12.5, padding: "6px 13px", color: w.sub })}>↶ Deshacer</button>] : [];

  // Lotes
  const estLote = modoLote === "otorgar" ? ["Solicitado", "Pendiente"] : ["A eliminar"];
  const lotes = [];
  for (const f of filas) {
    if (!estLote.includes(f.estatus) || (fl !== "todos" && f.L.id !== fl)) continue;
    const k = clave(f); let g = lotes.find((x) => x.k === k);
    if (!g) lotes.push((g = { k, plataforma: f.plataforma, tipo: f.tipo, archivo: f.archivo, filas: [] }));
    g.filas.push(f);
  }
  lotes.sort((a, b) => b.filas.length - a.filas.length || a.k.localeCompare(b.k));

  const tabBtn = (k, t) => <button onClick={() => setTab(k)} style={{ background: tab === k ? w.base100 : "transparent", border: "none", borderRadius: 999, padding: "8px 14px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", color: tab === k ? w.text : w.sub, boxShadow: tab === k ? "0 1px 3px rgba(20,20,20,0.08)" : "none", fontFamily: w.body, whiteSpace: "nowrap" }}>{t}</button>;

  return (
    <Contenedor ancho={980}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div><div style={{ ...label, marginBottom: 6 }}>Administración</div><div style={{ fontSize: 26, fontWeight: 800, fontFamily: w.heading }}>Accesos a Figma</div></div>
        <div style={{ display: "flex", background: w.base300, borderRadius: 999, padding: 4, overflowX: "auto", maxWidth: "100%" }}>{tabBtn("sol", "Solicitudes")}{tabBtn("lotes", "Lotes para Figma")}{tabBtn("leads", `Leads (${leads.length})`)}</div>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
        <Kpi n={cnt("Solicitado")} texto="Solicitudes nuevas" color={w.infoText} activo={tab === "sol" && fil === "Solicitado"} onClick={() => { setTab("sol"); setFil("Solicitado"); }} />
        <Kpi n={cnt("Pendiente")} texto="En proceso" color={w.warningText} activo={tab === "sol" && fil === "Pendiente"} onClick={() => { setTab("sol"); setFil("Pendiente"); }} />
        <Kpi n={cnt("A eliminar")} texto="Accesos por retirar" color={w.errorText} activo={tab === "sol" && fil === "A eliminar"} onClick={() => { setTab("sol"); setFil("A eliminar"); }} />
        <Kpi n={bajas.length} texto="Bajas por confirmar" color={w.errorText} onClick={() => { setTab("sol"); setFil("atender"); }} />
      </div>

      {tab === "sol" && (
        <div>
          {bajas.length > 0 && (
            <div style={{ ...card, padding: "16px 18px", marginBottom: 18, background: "#fffaf9", border: `1px solid ${w.errorBg}` }}>
              <div style={{ ...label, color: w.errorText, marginBottom: 10 }}>Bajas por confirmar ({bajas.length})</div>
              {bajas.map(({ L, m }) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", padding: "10px 0", borderTop: `1px solid ${w.border}` }}>
                  <div style={{ minWidth: 0 }}><div style={{ fontWeight: 700, fontFamily: w.heading }}>{m.nombre}</div>
                    <div style={{ fontSize: 12.5, color: w.sub }}>{m.correo} · Lead: {L.nombre} · {m.solicitudes.length} acceso{m.solicitudes.length === 1 ? "" : "s"} por retirar en Figma</div></div>
                  <button disabled={ocupado} onClick={() => hacer({ accion: "confirmarBaja", miembroId: m.id }, `Baja de ${m.nombre} confirmada.`)} style={btn(false, { color: w.errorText, fontSize: 12.5 })}>Confirmar baja</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {fChip("atender", "Por atender", filas.filter((f) => f.estatus !== "Activo").length)}{fChip("Solicitado", "Solicitado", cnt("Solicitado"))}{fChip("Pendiente", "Pendiente", cnt("Pendiente"))}{fChip("A eliminar", "A eliminar", cnt("A eliminar"))}{fChip("Activo", "Activo", cnt("Activo"))}{fChip("todas", "Todas")}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar miembro, correo o archivo…" style={{ ...input, background: w.base100, flex: "1 1 240px", width: "auto" }} />
            {selectLead}
          </div>
          {grupos.length === 0 && vacio("No hay solicitudes con estos filtros.")}
          {grupos.map((g) => {
            const pend = g.filas.filter((f) => f.estatus === "Solicitado" || f.estatus === "Pendiente");
            return (
              <div key={g.m.id} style={{ ...card, marginBottom: 12, padding: "14px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><span style={{ fontSize: 16, fontWeight: 700, fontFamily: w.heading }}>{g.m.nombre}</span>{g.m.dev && <Pill small label="Figma Dev" bg={w.infoBg} text={w.infoText} />}{g.m.estatus === "Baja solicitada" && <Pill small label="Baja solicitada" bg={w.errorBg} text={w.errorText} />}</div>
                    <div style={{ fontSize: 12.5, color: w.sub, marginTop: 2 }}>{g.m.correo} · Lead: {g.L.nombre}</div>
                  </div>
                  {pend.length > 1 && <button disabled={ocupado} onClick={() => estatus(pend.map((f) => f.id), "Activo", `${pend.length} accesos marcados como activos.`)} style={btn(true, { fontSize: 12.5, padding: "6px 13px" })}>Marcar {pend.length} como activos</button>}
                </div>
                {g.filas.map((f) => (
                  <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", padding: "10px 0", borderTop: `1px solid ${w.border}` }}>
                    <div style={{ minWidth: 0, flex: "1 1 260px" }}><div style={{ fontSize: 14, fontWeight: 600 }}>{f.archivo}</div>
                      <div style={{ fontSize: 12.5, color: w.sub, marginTop: 1 }}>{f.plataforma} · {f.tipo}{f.fecha ? ` · solicitado ${fechaCorta(f.fecha)}` : ""}</div></div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><PillEstatus e={f.estatus} />{acciones(f)}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {tab === "lotes" && (
        <div>
          <div style={{ fontSize: 13.5, color: w.sub, marginBottom: 14, lineHeight: 1.55, maxWidth: 640 }}>Agrupa a todas las personas que necesitan el mismo archivo y tipo de acceso, sin importar el lead. Copia los correos (separados por coma) y pégalos en Figma al compartir el archivo.</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
            <button onClick={() => setModoLote("otorgar")} style={{ ...chip(modoLote === "otorgar"), fontSize: 12.5 }}>Por otorgar</button>
            <button onClick={() => setModoLote("retirar")} style={{ ...chip(modoLote === "retirar"), fontSize: 12.5 }}>Por retirar</button>
            <div style={{ marginLeft: "auto" }}>{selectLead}</div>
          </div>
          {lotes.length === 0 && vacio(modoLote === "otorgar" ? "No hay accesos por otorgar." : "No hay accesos por retirar.")}
          {lotes.map((g) => {
            const correos = [...new Set(g.filas.map((f) => f.m.correo))], txt = correos.join(", "), cp = copiado === g.k;
            return (
              <div key={g.k} style={{ ...card, marginBottom: 12, padding: "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><span style={{ fontSize: 16, fontWeight: 700, fontFamily: w.heading }}>{g.archivo}</span><Pill small label={g.tipo} bg={g.tipo === "Handoff" ? w.infoBg : w.base300} text={g.tipo === "Handoff" ? w.infoText : w.sub} /></div>
                    <div style={{ fontSize: 12.5, color: w.sub, marginTop: 2 }}>{g.plataforma} · {correos.length} persona{correos.length === 1 ? "" : "s"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => copiar(g.k, txt)} style={btn(true, { fontSize: 12.5, padding: "6px 13px", background: cp ? w.successBg : w.primary, color: cp ? w.successText : w.primaryText })}>{cp ? "✓ Copiado" : `Copiar ${correos.length} correo${correos.length === 1 ? "" : "s"}`}</button>
                    <button disabled={ocupado} onClick={() => estatus(g.filas.map((f) => f.id), modoLote === "otorgar" ? "Activo" : "Retirado", modoLote === "otorgar" ? "Lote marcado como activo." : "Retiro del lote confirmado.")} style={btn(false, { fontSize: 12.5, padding: "6px 13px", color: modoLote === "otorgar" ? w.text : w.errorText })}>{modoLote === "otorgar" ? "Marcar lote como activo" : "Confirmar retiro del lote"}</button>
                  </div>
                </div>
                <div onClick={() => setVerTxt({ ...verTxt, [g.k]: true })} style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap", cursor: "text" }}>
                  {g.filas.map((f) => <span key={f.id} title={`${f.m.nombre} · Lead: ${f.L.nombre}`} style={{ fontSize: 12.5, background: w.base300, borderRadius: 8, padding: "4px 9px", fontFamily: w.mono, wordBreak: "break-all" }}>{f.m.correo}<span style={{ color: w.sub, fontFamily: w.body }}> · {f.L.nombre.split(" ")[0]}</span></span>)}
                </div>
                {verTxt[g.k] && <textarea readOnly value={txt} onFocus={(e) => e.target.select()} rows={2} style={{ ...input, marginTop: 10, fontFamily: w.mono, fontSize: 13, resize: "vertical" }} />}
              </div>
            );
          })}
        </div>
      )}

      {tab === "leads" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>{!nuevoLead && <button onClick={() => setNuevoLead(true)} style={btn(true, { display: "flex", alignItems: "center", gap: 6, boxShadow: "0 6px 18px rgba(46,204,113,0.22)" })}><Plus size={14} /> Agregar lead</button>}</div>
          {nuevoLead && <NuevoLead existentes={leads} ocupado={ocupado} onCancelar={() => setNuevoLead(false)} onGuardar={async (f) => { await accion({ accion: "crearLead", ...f }); setNuevoLead(false); avisar(`${f.nombre} agregado. Copia su link y envíaselo.`); }} />}
          {leads.length === 0 && vacio("Aún no hay leads. Agrega el primero.")}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
            {leads.map((L) => {
              const fs = filasDe([L]), ab = !!abiertos[L.id], link = `${location.origin}/?k=${encodeURIComponent(L.codigo || "")}`;
              const stats = [["Miembros activos", L.miembros.filter((m) => m.estatus === "Activo").length], ["Accesos activos", fs.filter((f) => f.estatus === "Activo").length], ["Por atender", fs.filter((f) => f.estatus !== "Activo").length]];
              if (editando === L.id) return (
                <NuevoLead key={L.id} sinMargen existentes={leads} ocupado={ocupado} titulo={`Editar a ${L.nombre}`} textoBoton="Guardar cambios"
                  inicial={{ id: L.id, nombre: L.nombre, correo: L.correo, puesto: L.puesto, area: L.area, rol: L.rol }}
                  onCancelar={() => setEditando(null)}
                  onGuardar={async (f) => { await accion({ accion: "editarLead", leadId: L.id, nombre: f.nombre, correo: f.correo, puesto: f.puesto, area: f.area, rol: f.rol }); setEditando(null); avisar(`${f.nombre} actualizado.`); }} />
              );
              return (
                <div key={L.id} style={{ ...card, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, fontFamily: w.heading }}>{L.nombre}</div>
                      <div style={{ fontSize: 12.5, color: w.sub, marginTop: 2 }}>{L.puesto}</div>
                      <div style={{ fontSize: 12.5, color: w.sub, display: "flex", alignItems: "center", gap: 4, marginTop: 2, wordBreak: "break-all" }}><Mail size={12} />{L.correo}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>{L.rol !== "Lead" && <Pill small label={L.rol === "Admin" ? "Solo admin" : "Lead y Admin"} bg={w.infoBg} text={w.infoText} />}{L.area && <Pill small label={L.area} bg={w.successBg} text={w.successText} />}</div>
                  </div>
                  {L.rol !== "Admin" && <div style={{ display: "flex", gap: 8 }}>{stats.map(([k, v]) => (
                    <div key={k} style={{ flex: 1, background: w.base300, borderRadius: 12, padding: "8px 10px" }}><div style={{ fontSize: 18, fontWeight: 800, fontFamily: w.heading, color: k === "Por atender" && v > 0 ? w.warningText : w.text }}>{v}</div><div style={{ fontSize: 11.5, color: w.sub }}>{k}</div></div>
                  ))}</div>}
                  {ab && <div>{L.miembros.length === 0 ? <div style={{ fontSize: 13, color: w.sub }}>Sin miembros todavía.</div> : L.miembros.map((m) => (
                    <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "8px 0", borderTop: `1px solid ${w.border}`, opacity: m.estatus === "Dado de baja" ? 0.5 : 1 }}>
                      <div style={{ minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 600 }}>{m.nombre}</div><div style={{ fontSize: 12, color: w.sub }}>{m.dev ? "Figma Dev" : "Estándar"} · {m.solicitudes.length} acceso{m.solicitudes.length === 1 ? "" : "s"}</div></div>
                      {m.estatus !== "Activo" && <Pill small label={m.estatus} bg={m.estatus === "Dado de baja" ? w.base300 : w.errorBg} text={m.estatus === "Dado de baja" ? w.sub : w.errorText} />}
                    </div>))}</div>}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "auto" }}>
                    <button onClick={async () => avisar((await copiarTexto(link)) ? `Link de ${L.nombre} copiado.` : link)} style={btn(true, { fontSize: 12.5, padding: "6px 13px" })}>Copiar link de acceso</button>
                    {L.rol !== "Admin" && <button onClick={() => { setFl(L.id); setFil("atender"); setTab("sol"); }} style={btn(false, { fontSize: 12.5, padding: "6px 13px" })}>Ver solicitudes</button>}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    {L.rol !== "Admin" ? <button onClick={() => setAbiertos({ ...abiertos, [L.id]: !ab })} style={{ ...linkBtn(), padding: 0, fontSize: 12.5 }}>{ab ? "Ocultar equipo" : `Ver equipo (${L.miembros.length})`}</button> : <span />}
                    <span style={{ display: "flex", gap: 14 }}>
                    <button onClick={() => setEditando(L.id)} style={{ ...linkBtn(w.text), padding: 0, fontSize: 12.5 }}>Editar</button>
                    <button disabled={ocupado} onClick={() => { if (confirm(`¿Cambiar el link de ${L.nombre}? El link anterior dejará de funcionar.`)) hacer({ accion: "nuevoCodigo", leadId: L.id }, "Link cambiado. Copia el nuevo y envíaselo."); }} style={{ ...linkBtn(), padding: 0, fontSize: 12.5 }}>Cambiar link</button>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Contenedor>
  );
}

// ---------- Estructura ----------
function Contenedor({ ancho, children }) {
  return <div style={{ padding: "28px 16px 48px" }}><div style={{ maxWidth: ancho, margin: "0 auto" }}>{children}</div></div>;
}

function Pantalla({ titulo, texto }) {
  return (
    <Contenedor ancho={520}>
      <div style={{ ...card, padding: "28px 26px", marginTop: 40, textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 800, fontFamily: w.heading, marginBottom: 8 }}>{titulo}</div>
        <div style={{ fontSize: 14, color: w.sub, lineHeight: 1.6 }}>{texto}</div>
      </div>
    </Contenedor>
  );
}

function App() {
  const [datos, setDatos] = useState(null), [modo, setModo] = useState("admin"), [error, setError] = useState(""), [ocupado, setOcupado] = useState(false), [aviso, setAviso] = useState(null);
  const cargar = () => api("/api/data").then((d) => { setDatos(d); setError(""); }).catch((e) => setError(e.message));
  useEffect(() => { if (codigo) cargar(); }, []);
  const avisar = (texto, esError, deshacer) => { const id = Date.now() + Math.random(); setAviso({ id, texto, esError, deshacer }); setTimeout(() => setAviso((a) => (a && a.id === id ? null : a)), deshacer ? 7000 : 3500); };
  const accion = async (body) => {
    setOcupado(true);
    try { const d = await api("/api/accion", body); setDatos(d); return d; }
    finally { setOcupado(false); }
  };
  let contenido;
  if (!codigo) contenido = <Pantalla titulo="Accesos a Figma" texto="Para entrar necesitas tu link personal. Pídeselo a un admin del área." />;
  else if (error && !datos) contenido = <Pantalla titulo="No pudimos abrir el dashboard" texto={error} />;
  else if (!datos) contenido = <Pantalla titulo="Cargando…" texto="Consultando la información en Notion." />;
  const dual = datos && datos.yo.rol === "admin" && datos.yo.esLead;
  const miLead = datos && (datos.yo.rol === "admin" ? datos.leads.find((L) => L.id === datos.yo.leadId) : datos.leads[0]);
  if (contenido) {}
  else if (datos.yo.rol === "admin" && !(dual && modo === "equipo")) contenido = <VistaAdmin leads={datos.leads} accion={accion} ocupado={ocupado} avisar={avisar} />;
  else contenido = miLead ? <VistaLead lead={miLead} catalogo={datos.catalogo} accion={accion} ocupado={ocupado} /> : <Pantalla titulo="Sin equipo" texto="No encontramos tu registro de lead." />;
  return (
    <div style={{ minHeight: "100vh", background: w.base200, color: w.text, fontFamily: w.body }}>
      {datos && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: `1px solid ${w.border}`, background: "rgba(249,247,241,0.92)", position: "sticky", top: 0, zIndex: 40, backdropFilter: "blur(8px)" }}>
          <span style={{ fontWeight: 800, fontFamily: w.heading, fontSize: 14.5 }}>Accesos a Figma</span>
          <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: w.sub }}>
            {ocupado && <span>Guardando en Notion…</span>}
            {dual ? (
              <span style={{ display: "flex", background: w.base300, borderRadius: 999, padding: 3 }}>
                {[["admin", "Admin"], ["equipo", "Mi equipo"]].map(([k, t]) => <button key={k} onClick={() => setModo(k)} style={{ background: modo === k ? w.base100 : "transparent", border: "none", borderRadius: 999, padding: "5px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", color: modo === k ? w.text : w.sub, fontFamily: w.body, boxShadow: modo === k ? "0 1px 3px rgba(20,20,20,0.08)" : "none" }}>{t}</button>)}
              </span>
            ) : null}
            <span>{datos.yo.nombre}{dual ? "" : ` · ${datos.yo.rol === "admin" ? "Admin" : "Lead"}`}</span>
            <button onClick={cargar} title="Actualizar" style={{ ...linkBtn(), padding: "4px 6px" }}>↻</button>
          </span>
        </div>
      )}
      {contenido}
      {aviso && <div role="status" style={{ position: "fixed", left: "50%", bottom: 22, transform: "translateX(-50%)", background: aviso.esError ? w.errorText : "#2b2925", color: "#fff", padding: "11px 18px", borderRadius: 14, fontSize: 13.5, boxShadow: "0 10px 30px rgba(0,0,0,0.2)", maxWidth: "calc(100% - 32px)", wordBreak: "break-word", zIndex: 60, display: "flex", alignItems: "center", gap: 14 }}><span>{aviso.texto}</span>{aviso.deshacer && <button disabled={ocupado} onClick={() => { const fn = aviso.deshacer; setAviso(null); fn(); }} style={{ background: "none", border: "none", color: "#7ee2a8", fontWeight: 800, fontSize: 13.5, cursor: "pointer", padding: 0, fontFamily: w.body, whiteSpace: "nowrap" }}>Deshacer</button>}</div>}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
