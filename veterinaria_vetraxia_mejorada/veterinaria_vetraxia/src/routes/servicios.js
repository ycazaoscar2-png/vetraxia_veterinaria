const router = require('express').Router();
const db = require('../db');
const { requiere, soloAdmin } = require('../auth');

router.get('/', requiere, async (_req, res) => {
  const resultado = await db.query('SELECT id,nombre,duracion_min,precio FROM servicios WHERE activo ORDER BY nombre');
  res.json(resultado.rows);
});

router.post('/', requiere, soloAdmin, async (req, res) => {
  const { nombre, duracion_min, precio } = req.body;
  if (!nombre || !(duracion_min > 0) || !(precio >= 0))
    return res.status(400).json({ error: 'Datos del servicio inválidos' });
  const resultado = await db.query(
    'INSERT INTO servicios(nombre,duracion_min,precio) VALUES($1,$2,$3) RETURNING *',
    [nombre.trim(), duracion_min, precio]);
  res.status(201).json(resultado.rows[0]);
});

router.delete('/:id', requiere, soloAdmin, async (req, res) => {
  await db.query('UPDATE servicios SET activo=FALSE WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
