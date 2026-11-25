require('dotenv').config();

// Valores por defecto: solo DATABASE_URL es obligatoria
process.env.JWT_SECRET = process.env.JWT_SECRET || 'quedamos-itb-2026-secreto-largo-cambiar';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@quedamos.com';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin12345';

const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/servicios', require('./routes/servicios'));
app.use('/api/mascotas', require('./routes/mascotas'));
app.use('/api/horarios', require('./routes/horarios'));
app.use('/api/citas', require('./routes/citas'));
app.use('/api/contacto', require('./routes/contacto'));
app.get('/salud', (_req, res) => res.json({ ok: true }));

// nombre, duración en minutos, precio
const SERVICIOS_BASE = [
  ['Consulta general', 30, 15],
  ['Vacunación', 30, 12],
  ['Desparasitación', 30, 8],
  ['Baño y corte', 60, 20],
  ['Cirugía menor', 90, 60]
];

async function crearAdministrador() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;
  const existe = await db.query('SELECT 1 FROM usuarios WHERE email=$1', [ADMIN_EMAIL]);
  if (existe.rowCount) return;
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await db.query(
    "INSERT INTO usuarios(nombre,email,password_hash,rol) VALUES('Administrador',$1,$2,'admin')",
    [ADMIN_EMAIL, hash]);
}

async function crearServiciosBase() {
  for (const [nombre, duracion, precio] of SERVICIOS_BASE) {
    await db.query(
      'INSERT INTO servicios(nombre,duracion_min,precio) SELECT $1::text,$2::int,$3::numeric WHERE NOT EXISTS (SELECT 1 FROM servicios WHERE nombre=$1::text)',
      [nombre, duracion, precio]);
  }
}

async function iniciar() {
  if (!db.urlValida || /\.\.\.|\*{3}|•/.test(db.urlValida)) {
    console.error('\nERROR: falta la cadena de conexion de la base de datos (DATABASE_URL).');
    console.error('Ejecuta INICIAR.bat o: node scripts/configurar.js\n');
    process.exit(1);
  }
  // Crea las tablas si todavía no existen
  await db.query(fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8'));
  await crearAdministrador();
  await crearServiciosBase();

  const puerto = process.env.PORT || 3000;
  app.listen(puerto, () => console.log('VETRAXIA funcionando en el puerto ' + puerto));
}

iniciar().catch(error => {
  console.error('\nNo se pudo iniciar: ' + error.message);
  console.error('Revisa que la cadena de Neon este completa y con la contrasena real.\n');
  process.exit(1);
});
