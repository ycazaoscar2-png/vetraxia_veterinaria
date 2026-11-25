// Envío de correos. Si no hay SMTP configurado, el correo se muestra en la consola del servidor
// (así todo funciona en pruebas y se puede leer el código de recuperación allí).
let nodemailer = null;
try { nodemailer = require('nodemailer'); } catch { /* aún no instalado */ }

let transporte = null;

const configurado = () =>
  !!(nodemailer && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

function obtenerTransporte() {
  if (!transporte) {
    const puerto = +(process.env.SMTP_PORT || 465);
    transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: puerto,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : puerto === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return transporte;
}

// Correo del dueño de la veterinaria: recibe avisos de citas y mensajes de contacto
const correoDueno = () => process.env.CORREO_DUENO || process.env.ADMIN_EMAIL;

// Devuelve true si el correo salió de verdad
async function enviar({ para, asunto, texto, html, responderA }) {
  if (!para) return false;
  if (!configurado()) {
    console.log(`\n[CORREO SIMULADO — sin SMTP configurado]\nPara: ${para}\nAsunto: ${asunto}\n${texto}\n`);
    return false;
  }
  try {
    await obtenerTransporte().sendMail({
      from: process.env.SMTP_FROM || `VETRAXIA <${process.env.SMTP_USER}>`,
      to: para, subject: asunto, text: texto, html, replyTo: responderA
    });
    return true;
  } catch (error) {
    console.error('No se pudo enviar el correo:', error.message);
    return false;
  }
}

module.exports = { enviar, correoDueno, configurado };
