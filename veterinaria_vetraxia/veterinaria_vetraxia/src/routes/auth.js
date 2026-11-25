const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const firmar = usuario =>
  jwt.sign({ id: usuario.id, rol: usuario.rol, nombre: usuario.nombre }, process.env.JWT_SECRET, { expiresIn: '8h' });

router.post('/registro', async (req, res) => {
  const { nombre, email, password } = req.body;
  if (!nombre || !email || !password || password.length < 6)
    return res.status(400).json({ error: 'Completa todo. La clave debe tener mínimo 6 caracteres.' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const resultado = await db.query(
      "INSERT INTO usuarios(nombre,email,password_hash) VALUES($1,$2,$3) RETURNING id,nombre,rol",
      [nombre.trim(), email.trim().toLowerCase(), hash]);
    const usuario = resultado.rows[0];
    res.json({ token: firmar(usuario), rol: usuario.rol, nombre: usuario.nombre });
  } catch (error) {
    // 23505 = correo repetido (restricción UNIQUE de la tabla)
    if (error.code === '23505') return res.status(409).json({ error: 'Ese correo ya está registrado' });
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const resultado = await db.query('SELECT * FROM usuarios WHERE email=$1', [(email || '').trim().toLowerCase()]);
  const usuario = resultado.rows[0];
  if (!usuario || !(await bcrypt.compare(password || '', usuario.password_hash)))
    return res.status(401).json({ error: 'Correo o clave incorrectos' });
  res.json({ token: firmar(usuario), rol: usuario.rol, nombre: usuario.nombre });
});

module.exports = router;
