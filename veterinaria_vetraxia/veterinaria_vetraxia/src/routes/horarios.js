const router = require('express').Router();
const db = require('../db');
const { requiere, soloAdmin } = require('../auth');

const FORMATO_HORA = /^\d\d:\d\d$/;

router.get('/', requiere, async (_req, res) => {
  const resultado = await db.query(
    "SELECT dia,to_char(abre,'HH24:MI') abre,to_char(cierra,'HH24:MI') cierra,activo FROM horarios ORDER BY dia");
  res.json(resultado.rows);
});

router.put('/:dia', requiere, soloAdmin, async (req, res) => {
  const { abre, cierra, activo } = req.body;
  if (!FORMATO_HORA.test(abre) || !FORMATO_HORA.test(cierra) || abre >= cierra)
    return res.status(400).json({ error: 'Revisa las horas: la apertura debe ser antes del cierre' });
  await db.query('UPDATE horarios SET abre=$1,cierra=$2,activo=$3 WHERE dia=$4', [abre, cierra, !!activo, req.params.dia]);
  res.json({ ok: true });
});

module.exports = router;
