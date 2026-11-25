// Crea el archivo .env. Acepta la cadena completa de Neon O SOLO la contrasena.
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Datos de tu proyecto en Neon (tomados de tu pantalla de Connect)
const USUARIO = 'neondb_owner';
const HOST = 'ep-floral-meadow-b5pf7tb1-pooler.c-7.us-east-2.aws.neon.tech';
const BASE = 'neondb';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log('\n=== Configuracion de Quedamos ===');
console.log('Pega SOLO LA CONTRASENA de Neon (Show password) y presiona Enter.');
console.log('Tambien puedes pegar la cadena completa que empieza con postgresql://');
console.log('Para pegar en esta ventana: clic derecho con el mouse.\n');

rl.question('> ', (texto) => {
  pedirCorreos(texto);
});

// Después de la base de datos se piden (opcional) el correo del dueño y la clave de aplicación de Gmail
function pedirCorreos(texto) {
  rl.question('\nCorreo del DUENO de la veterinaria (recibe avisos de citas y mensajes). Enter para omitir:\n> ', (dueno) => {
    dueno = dueno.trim();
    if (!dueno) return terminar(texto, '', '');
    console.log('\nPara que los correos salgan de verdad: en Gmail activa la verificacion en 2 pasos y crea una');
    console.log('"Contrasena de aplicacion" (myaccount.google.com/apppasswords). Pegala aqui (Enter para omitir):');
    rl.question('> ', (app) => terminar(texto, dueno, app.replace(/\s/g, '')));
  });
}

function terminar(texto, dueno, appClave) {
  texto = texto.trim().replace(/^['"]|['"]$/g, '');
  let url;
  const m = texto.match(/postgres(?:ql)?:\/\/[^\s'"]+/);
  if (m) url = m[0];
  else if (texto && !/\s/.test(texto)) {
    url = `postgresql://${USUARIO}:${encodeURIComponent(texto)}@${HOST}/${BASE}?sslmode=require`;
  } else { console.log('\nNo escribiste una contrasena valida.'); process.exit(1); }

  if (/\.\.\.|\*{3}|•|\(tu clave\)/.test(url)) {
    console.log('\nLa contrasena sale oculta. En Neon haz clic en "Show password" y copia otra vez.');
    process.exit(1);
  }
  fs.writeFileSync(path.join(__dirname, '..', '.env'), [
    'DATABASE_URL=' + url, 'PORT=3000', 'DB_SSL=true',
    'JWT_SECRET=quedamos-itb-2026-secreto-largo-cambiar',
    'ADMIN_EMAIL=admin@quedamos.com', 'ADMIN_PASSWORD=Admin12345',
    'CORREO_DUENO=' + dueno,
    'SMTP_HOST=' + (appClave ? 'smtp.gmail.com' : ''),
    'SMTP_PORT=465',
    'SMTP_USER=' + (appClave ? dueno : ''),
    'SMTP_PASS=' + appClave, ''
  ].join('\n'));
  console.log('\nListo: archivo .env creado.\n');
  rl.close();
}
