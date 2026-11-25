const router = require('express').Router();
const db = require('../db');
const { requiere } = require('../auth');

router.get('/', requiere, async (req, res) => {
  const resultado = await db.query(
    'SELECT id,nombre,especie,raza,edad FROM mascotas WHERE usuario_id=$1 AND activo ORDER BY nombre',
    [req.usuario.id]);
  res.json(resultado.rows);
});

router.post('/', requiere, async (req, res) => {
  const { nombre, especie, raza, edad } = req.body;
  if (!nombre || !especie) return res.status(400).json({ error: 'Nombre y especie son obligatorios' });
  const resultado = await db.query(
    'INSERT INTO mascotas(usuario_id,nombre,especie,raza,edad) VALUES($1,$2,$3,$4,$5) RETURNING id',
    [req.usuario.id, nombre.trim(), especie.trim(), (raza || '').trim(), (edad || '').trim()]);
  res.status(201).json(resultado.rows[0]);
});

// No se borra de verdad: solo se marca como inactiva para conservar el historial
router.delete('/:id', requiere, async (req, res) => {
  await db.query('UPDATE mascotas SET activo=FALSE WHERE id=$1 AND usuario_id=$2', [req.params.id, req.usuario.id]);
  res.json({ ok: true });
});

router.get('/:id/historial', requiere, async (req, res) => {
  const resultado = await db.query(
    `SELECT to_char(c.fecha,'YYYY-MM-DD') fecha, s.nombre servicio, c.motivo, c.notas
     FROM citas c JOIN servicios s ON s.id=c.servicio_id JOIN mascotas m ON m.id=c.mascota_id
     WHERE c.mascota_id=$1 AND c.estado='atendida' AND ($2 OR m.usuario_id=$3) ORDER BY c.fecha DESC, c.hora DESC`,
    [req.params.id, req.usuario.rol === 'admin', req.usuario.id]);
  res.json(resultado.rows);
});

module.exports = router;
