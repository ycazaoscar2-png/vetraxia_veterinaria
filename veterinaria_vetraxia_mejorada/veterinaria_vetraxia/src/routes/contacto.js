// Formulario de contacto (lo usa la mascota del menú): llega al correo del dueño de la veterinaria
const router = require('express').Router();
const { enviar, correoDueno, configurado } = require('../correo');

// Límite simple por IP: 5 mensajes cada 10 minutos
const intentos = new Map();
function permitido(ip) {
  const ahora = Date.now();
  const lista = (intentos.get(ip) || []).filter(t => ahora - t < 600e3);
  if (lista.length >= 5) return false;
  lista.push(ahora);
  intentos.set(ip, lista);
  return true;
}

router.post('/', async (req, res) => {
  const nombre = String(req.body.nombre || '').trim().slice(0, 100);
  const email = String(req.body.email || '').trim().slice(0, 120);
  const mensaje = String(req.body.mensaje || '').trim().slice(0, 1000);
  if (!nombre || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || mensaje.length < 3)
    return res.status(400).json({ error: 'Completa tu nombre, un correo válido y el mensaje' });
  if (!permitido(req.ip)) return res.status(429).json({ error: 'Demasiados mensajes. Intenta en unos minutos.' });

  const enviado = await enviar({
    para: correoDueno(),
    asunto: `Mensaje desde la web de VETRAXIA · ${nombre}`,
    texto: `De: ${nombre} <${email}>\n\n${mensaje}`,
    responderA: email
  });
  // Si el correo no pudo salir, se avisa para que la web ofrezca el correo directo
  res.json({ ok: true, enviado, correo: enviado || configurado() ? undefined : correoDueno() });
});

module.exports = router;
