const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const { enviar } = require('../correo');

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

const sha = texto => crypto.createHash('sha256').update(texto).digest('hex');
const MIN_RECUPERACION = 15;
const MAX_INTENTOS = 5;

// Oculta parte del correo: juan.perez@gmail.com -> ju*****@gmail.com
function ocultarCorreo(correo) {
  const [usuario, dominio] = correo.split('@');
  return usuario.slice(0, 2) + '*'.repeat(Math.max(usuario.length - 2, 3)) + '@' + dominio;
}

// 1) Pide el código: siempre responde igual, exista o no el correo (no revela quién tiene cuenta)
router.post('/olvide', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  try {
    const usuario = (await db.query('SELECT id,nombre FROM usuarios WHERE email=$1', [email])).rows[0];
    if (usuario) {
      const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
      await db.query('UPDATE recuperaciones SET usado=TRUE WHERE usuario_id=$1 AND NOT usado', [usuario.id]);
      await db.query(
        `INSERT INTO recuperaciones(usuario_id,codigo_hash,expira) VALUES($1,$2,NOW() + interval '${MIN_RECUPERACION} minutes')`,
        [usuario.id, sha(codigo)]);
      enviar({
        para: email,
        asunto: 'VETRAXIA · Código para recuperar tu clave',
        texto: `Hola ${usuario.nombre},\n\nTu código de recuperación es: ${codigo}\nVence en ${MIN_RECUPERACION} minutos. Si no lo pediste, ignora este mensaje.`,
        html: `<p>Hola ${usuario.nombre.replace(/[<>&]/g, '')},</p><p>Tu código de recuperación es:</p><h2 style="letter-spacing:4px">${codigo}</h2><p>Vence en ${MIN_RECUPERACION} minutos. Si no lo pediste, ignora este mensaje.</p>`
      });
    }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// 2) Cambia la clave con el código recibido
router.post('/restablecer', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const codigo = String(req.body.codigo || '').trim();
  const password = String(req.body.password || '');
  if (password.length < 6) return res.status(400).json({ error: 'La clave debe tener mínimo 6 caracteres.' });
  const invalido = () => res.status(400).json({ error: 'Código incorrecto o vencido' });
  try {
    const fila = (await db.query(
      `SELECT r.id,r.codigo_hash,r.intentos,u.id usuario_id FROM recuperaciones r JOIN usuarios u ON u.id=r.usuario_id
       WHERE u.email=$1 AND NOT r.usado AND r.expira > NOW() ORDER BY r.id DESC LIMIT 1`, [email])).rows[0];
    if (!fila || fila.intentos >= MAX_INTENTOS) return invalido();
    if (sha(codigo) !== fila.codigo_hash) {
      await db.query('UPDATE recuperaciones SET intentos=intentos+1 WHERE id=$1', [fila.id]);
      return invalido();
    }
    await db.query('UPDATE usuarios SET password_hash=$1 WHERE id=$2', [await bcrypt.hash(password, 10), fila.usuario_id]);
    await db.query('UPDATE recuperaciones SET usado=TRUE WHERE usuario_id=$1', [fila.usuario_id]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Recuperar el USUARIO (correo): se verifica con el nombre completo + el nombre de una de sus mascotas
router.post('/recuperar-usuario', async (req, res) => {
  const nombre = String(req.body.nombre || '').trim();
  const mascota = String(req.body.mascota || '').trim();
  if (nombre.length < 3 || !mascota) return res.status(400).json({ error: 'Escribe tu nombre completo y el nombre de tu mascota' });
  try {
    const resultado = await db.query(
      `SELECT DISTINCT u.email FROM usuarios u JOIN mascotas m ON m.usuario_id=u.id
       WHERE lower(u.nombre)=lower($1) AND lower(m.nombre)=lower($2) AND u.rol='cliente'`, [nombre, mascota]);
    if (resultado.rowCount !== 1)
      return res.status(404).json({ error: 'No encontramos una cuenta con esos datos' });
    res.json({ email: ocultarCorreo(resultado.rows[0].email) });
  } catch {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
