const router = require('express').Router();
const crypto = require('crypto');
const db = require('../db');
const { enviar, correoDueno } = require('../correo');
const { requiere, soloAdmin } = require('../auth');

const PASO = 30; // los espacios de agenda se manejan cada 30 minutos

// Código de ticket único, ej: VTX-261124-K7M2QH (sin letras que se confunden: 0/O, 1/I)
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function nuevoCodigo(fecha) {
  let sufijo = '';
  for (let i = 0; i < 6; i++) sufijo += LETRAS[crypto.randomInt(LETRAS.length)];
  return 'VTX-' + fecha.slice(2, 4) + fecha.slice(5, 7) + fecha.slice(8, 10) + '-' + sufijo;
}

const rango = consulta => [consulta.desde || '1900-01-01', consulta.hasta || '2999-12-31'];

// "08:30" -> 510
const aMinutos = texto => {
  const [horas, minutos] = texto.split(':');
  return +horas * 60 + +minutos;
};

// 510 -> "08:30"
const aHHMM = minutos =>
  String(Math.floor(minutos / 60)).padStart(2, '0') + ':' + String(minutos % 60).padStart(2, '0');

// Fecha y hora actuales de Ecuador (UTC-5, sin horario de verano)
function horaEcuador() {
  const d = new Date(Date.now() - 5 * 3600e3);
  return { hoy: d.toISOString().slice(0, 10), ahora: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

// Espacios libres de un día para un servicio de 'duracion' minutos
async function disponibilidad(conexion, fecha, duracion, excluirId, hoy, ahora) {
  const dia = new Date(fecha + 'T00:00:00Z').getUTCDay();
  const horario = (await conexion.query(
    "SELECT to_char(abre,'HH24:MI') abre,to_char(cierra,'HH24:MI') cierra,activo FROM horarios WHERE dia=$1",
    [dia])).rows[0];
  if (!horario || !horario.activo) return [];

  const ocupados = (await conexion.query(
    `SELECT EXTRACT(EPOCH FROM hora)/60 ini, EXTRACT(EPOCH FROM COALESCE(hora_fin, hora + interval '60 minutes'))/60 fin
    FROM citas WHERE fecha=$1 AND estado<>'cancelada' AND ($2::int IS NULL OR id<>$2::int)`,
    [fecha, excluirId || null])).rows.map(x => [+x.ini, +x.fin]);

  const espacios = [];
  for (let t = aMinutos(horario.abre); t + duracion <= aMinutos(horario.cierra); t += PASO) {
    const yaPaso = fecha === hoy && t <= ahora;
    const choca = ocupados.some(([inicio, fin]) => t < fin && t + duracion > inicio);
    espacios.push({ hora: aHHMM(t), libre: !yaPaso && !choca });
  }
  return espacios;
}

// Verifica disponibilidad y guarda dentro de una transacción con bloqueo por fecha (evita cruces simultáneos)
async function colocar(fecha, hora, duracion, excluirId, guardar) {
  const { hoy, ahora } = horaEcuador();
  if (fecha < hoy) return { codigo: 400, error: 'No puedes reservar en una fecha pasada' };

  const conexion = await db.connect();
  try {
    await conexion.query('BEGIN');
    await conexion.query('SELECT pg_advisory_xact_lock(hashtext($1))', [fecha]);
    const espacios = await disponibilidad(conexion, fecha, duracion, excluirId, hoy, ahora);
    const espacio = espacios.find(x => x.hora === hora);
    if (!espacio || !espacio.libre) {
      await conexion.query('ROLLBACK');
      return { codigo: 409, error: 'Esa hora ya no está disponible' };
    }
    await guardar(conexion, aHHMM(aMinutos(hora) + duracion));
    await conexion.query('COMMIT');
    return { codigo: 200 };
  } catch (error) {
    await conexion.query('ROLLBACK').catch(() => {});
    return { codigo: 500, error: 'Error del servidor' };
  } finally {
    conexion.release();
  }
}

const responder = (res, resultado) =>
  res.status(resultado.codigo).json(resultado.error ? { error: resultado.error } : { ok: true });

router.get('/horas', requiere, async (req, res) => {
  const servicio = await db.query('SELECT duracion_min FROM servicios WHERE id=$1', [req.query.servicio_id || 0]);
  const { hoy, ahora } = horaEcuador();
  const duracion = servicio.rowCount ? servicio.rows[0].duracion_min : PASO;
  res.json(await disponibilidad(db, req.query.fecha, duracion, +req.query.excluir || null, hoy, ahora));
});

router.get('/reporte', requiere, soloAdmin, async (req, res) => {
  const [desde, hasta] = rango(req.query);
  const porEstado = await db.query(
    'SELECT estado,COUNT(*)::int total FROM citas WHERE fecha BETWEEN $1 AND $2 GROUP BY estado',
    [desde, hasta]);
  const porServicio = await db.query(
    `SELECT s.nombre,COUNT(*)::int total,
    COALESCE(SUM(CASE WHEN c.estado='atendida' THEN s.precio END),0)::float ingresos
    FROM citas c JOIN servicios s ON s.id=c.servicio_id
    WHERE c.estado NOT IN ('cancelada','no_asistio') AND c.fecha BETWEEN $1 AND $2 GROUP BY s.nombre ORDER BY total DESC`,
    [desde, hasta]);
  res.json({ porEstado: porEstado.rows, porServicio: porServicio.rows });
});

router.get('/reporte.csv', requiere, soloAdmin, async (req, res) => {
  const [desde, hasta] = rango(req.query);
  const citas = await db.query(
    `SELECT c.codigo,to_char(c.fecha,'YYYY-MM-DD') fecha,to_char(c.hora,'HH24:MI') hora,u.nombre cliente,
    COALESCE(m.nombre,'') mascota,s.nombre servicio,c.estado,s.precio
    FROM citas c JOIN usuarios u ON u.id=c.usuario_id JOIN servicios s ON s.id=c.servicio_id
    LEFT JOIN mascotas m ON m.id=c.mascota_id WHERE c.fecha BETWEEN $1 AND $2 ORDER BY c.fecha,c.hora`,
    [desde, hasta]);
  const entrecomillar = valor => '"' + String(valor ?? '').replace(/"/g, '""') + '"';
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="reporte_citas.csv"' });
  res.send('\ufeffTicket,Fecha,Hora,Cliente,Mascota,Servicio,Estado,Precio\n' +
    citas.rows.map(x => [x.codigo, x.fecha, x.hora, x.cliente, x.mascota, x.servicio, x.estado, x.precio].map(entrecomillar).join(',')).join('\n'));
});

// Lista de citas: el cliente solo ve las suyas, el administrador ve todas
router.get('/', requiere, async (req, res) => {
  const parametros = [];
  let donde = 'WHERE 1=1';
  if (req.usuario.rol !== 'admin') {
    parametros.push(req.usuario.id);
    donde += ` AND c.usuario_id=$${parametros.length}`;
  }
  if (req.query.fecha) {
    parametros.push(req.query.fecha);
    donde += ` AND c.fecha=$${parametros.length}`;
  }
  const citas = await db.query(
    `SELECT c.id, c.codigo, c.servicio_id, to_char(c.fecha,'YYYY-MM-DD') fecha, to_char(c.hora,'HH24:MI') hora, c.estado, c.motivo, c.notas,
            s.nombre servicio, u.nombre cliente, m.nombre mascota
     FROM citas c JOIN servicios s ON s.id=c.servicio_id JOIN usuarios u ON u.id=c.usuario_id
     LEFT JOIN mascotas m ON m.id=c.mascota_id ${donde} ORDER BY c.fecha, c.hora`, parametros);
  res.json(citas.rows);
});

router.post('/', requiere, async (req, res) => {
  const { servicio_id, mascota_id, fecha, hora, motivo } = req.body;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) return res.status(400).json({ error: 'Fecha no válida' });
  if (!servicio_id || !mascota_id || !fecha || !hora)
    return res.status(400).json({ error: 'Elige servicio, mascota, fecha y hora' });

  const mascota = await db.query('SELECT 1 FROM mascotas WHERE id=$1 AND usuario_id=$2 AND activo', [mascota_id, req.usuario.id]);
  if (!mascota.rowCount) return res.status(400).json({ error: 'Esa mascota no es tuya' });

  const servicio = await db.query('SELECT duracion_min FROM servicios WHERE id=$1 AND activo', [servicio_id]);
  if (!servicio.rowCount) return res.status(400).json({ error: 'Servicio no válido' });

  // El ticket se genera dentro de la misma transacción; si el código chocara (muy improbable) se repite
  let ticket = null;
  const resultado = await colocar(fecha, hora, servicio.rows[0].duracion_min, null, async (conexion, horaFin) => {
    for (let intento = 0; intento < 5; intento++) {
      const codigo = nuevoCodigo(fecha);
      const libre = await conexion.query('SELECT 1 FROM citas WHERE codigo=$1', [codigo]);
      if (libre.rowCount) continue;
      await conexion.query(
        'INSERT INTO citas(usuario_id,servicio_id,mascota_id,fecha,hora,hora_fin,motivo,codigo) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
        [req.usuario.id, servicio_id, mascota_id, fecha, hora, horaFin, (motivo || '').slice(0, 200), codigo]);
      ticket = codigo;
      return;
    }
    throw new Error('No se pudo generar el código');
  });
  if (!ticket) return responder(res, resultado);

  const detalle = (await db.query(
    `SELECT c.codigo, to_char(c.fecha,'YYYY-MM-DD') fecha, to_char(c.hora,'HH24:MI') hora, c.motivo,
            s.nombre servicio, s.precio, m.nombre mascota, m.especie, u.nombre cliente, u.email
     FROM citas c JOIN servicios s ON s.id=c.servicio_id JOIN mascotas m ON m.id=c.mascota_id JOIN usuarios u ON u.id=c.usuario_id
     WHERE c.codigo=$1`, [ticket])).rows[0];
  avisarCita(detalle);
  res.json({ ok: true, ticket: { codigo: detalle.codigo, fecha: detalle.fecha, hora: detalle.hora, servicio: detalle.servicio,
    precio: detalle.precio, mascota: detalle.mascota } });
});

// Correos (sin esperar): ticket para el cliente y aviso para el dueño de la veterinaria
function avisarCita(c) {
  const lineas = `Ticket: ${c.codigo}\nFecha: ${c.fecha} a las ${c.hora}\nServicio: ${c.servicio}\nMascota: ${c.mascota} (${c.especie})` +
    (c.motivo ? `\nMotivo: ${c.motivo}` : '');
  enviar({
    para: c.email,
    asunto: `VETRAXIA · Tu cita ${c.codigo}`,
    texto: `Hola ${c.cliente},\n\nTu cita quedó reservada.\n\n${lineas}\n\nPresenta este código al llegar.`
  });
  enviar({
    para: correoDueno(),
    asunto: `Nueva cita ${c.codigo} · ${c.fecha} ${c.hora}`,
    texto: `Nueva cita en la veterinaria.\n\nCliente: ${c.cliente} (${c.email})\n${lineas}`,
    responderA: c.email
  });
}

router.patch('/:id/reprogramar', requiere, async (req, res) => {
  const { fecha, hora } = req.body;
  const cita = (await db.query(
    "SELECT c.id,c.usuario_id,s.duracion_min dur FROM citas c JOIN servicios s ON s.id=c.servicio_id WHERE c.id=$1 AND c.estado='reservada'",
    [req.params.id])).rows[0];
  if (!cita || (req.usuario.rol !== 'admin' && cita.usuario_id !== req.usuario.id))
    return res.status(404).json({ error: 'Cita no encontrada' });

  const resultado = await colocar(fecha, hora, cita.dur, cita.id, (conexion, horaFin) =>
    conexion.query('UPDATE citas SET fecha=$1,hora=$2,hora_fin=$3 WHERE id=$4', [fecha, hora, horaFin, cita.id]));
  responder(res, resultado);
});

// Sirve para "atendida" y "no asistió": solo cambia citas que siguen reservadas
const cambiarEstado = estado => async (req, res) => {
  const notas = (req.body && req.body.notas || '').slice(0, 500) || null;
  const resultado = await db.query(
    "UPDATE citas SET estado=$1, notas=COALESCE($2,notas) WHERE id=$3 AND estado='reservada' RETURNING id",
    [estado, notas, req.params.id]);
  if (!resultado.rowCount) return res.status(404).json({ error: 'Cita no encontrada' });
  res.json({ ok: true });
};
router.patch('/:id/atender', requiere, soloAdmin, cambiarEstado('atendida'));
router.patch('/:id/noasistio', requiere, soloAdmin, cambiarEstado('no_asistio'));

router.patch('/:id/cancelar', requiere, async (req, res) => {
  const resultado = await db.query(
    "UPDATE citas SET estado='cancelada' WHERE id=$1 AND estado='reservada' AND ($2 OR usuario_id=$3) RETURNING id",
    [req.params.id, req.usuario.rol === 'admin', req.usuario.id]);
  if (!resultado.rowCount) return res.status(404).json({ error: 'Cita no encontrada' });
  res.json({ ok: true });
});

module.exports = router;
