// GET /api/data?k=CODIGO → datos visibles para quien entra.
const M = require("./_modelo");

async function respuesta(s) {
  const { leads } = await M.leerTodo(s.rol === "lead" ? s.leadId : undefined);
  const visibles = s.rol === "admin" ? leads : leads.filter((l) => l.id === s.leadId);
  if (s.rol !== "admin") for (const l of visibles) delete l.codigo;
  return { yo: s, catalogo: M.CATALOGO, leads: visibles };
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const s = await M.sesion(M.leerCodigo(req));
    res.status(200).json(await respuesta(s));
  } catch (e) {
    M.responderError(res, e);
  }
};
module.exports.respuesta = respuesta;
