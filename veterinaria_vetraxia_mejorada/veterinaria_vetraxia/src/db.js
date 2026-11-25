const { Pool } = require('pg');

// Acepta la cadena tal como la copia Neon (con comillas, "psql", channel_binding, etc.)
function limpiar(texto) {
  const coincidencia = String(texto || '').match(/postgres(?:ql)?:\/\/[^\s'"]+/);
  if (!coincidencia) return '';
  try {
    const direccion = new URL(coincidencia[0]);
    direccion.searchParams.delete('channel_binding');
    return direccion.toString();
  } catch {
    return coincidencia[0];
  }
}

const url = limpiar(process.env.DATABASE_URL);
const usarSsl = process.env.DB_SSL === 'true' || /sslmode=require|neon\.tech/.test(url);

module.exports = new Pool({
  connectionString: url,
  ssl: usarSsl ? { rejectUnauthorized: false } : false
});
module.exports.urlValida = url;
