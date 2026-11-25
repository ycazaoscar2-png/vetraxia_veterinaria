guardia('admin');
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Fecha de hoy en la zona horaria del navegador (AAAA-MM-DD)
const hoyLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

// Filtro de fechas que se manda a los reportes
const rango = () => `?desde=${desde.value}&hasta=${hasta.value}`;

async function cargarReporte() {
  const datos = await API.f('/api/citas/reporte' + rango());
  const ingresosTotales = datos.porServicio.reduce((suma, x) => suma + x.ingresos, 0);
  reporte.innerHTML = '<b>Por estado:</b> ' + (datos.porEstado.map(x => `${x.estado}: ${x.total}`).join(' · ') || 'sin datos') +
    '<div class="tabla"><table><thead><tr><th>Servicio</th><th>Citas</th><th>Ingresos (atendidas)</th></tr></thead><tbody>' +
    datos.porServicio.map(x => `<tr><td>${esc(x.nombre)}</td><td>${x.total}</td><td>$${x.ingresos.toFixed(2)}</td></tr>`).join('') +
    `</tbody></table></div><b>Ingresos totales: $${ingresosTotales.toFixed(2)}</b>`;
}

async function descargarCSV() {
  const respuesta = await fetch('/api/citas/reporte.csv' + rango(), {
    headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
  });
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(await respuesta.blob());
  enlace.download = 'reporte_citas.csv';
  enlace.click();
}

async function cargarServicios() {
  const lista = await API.f('/api/servicios');
  servicios.innerHTML = lista.map(x => `<tr><td>${esc(x.nombre)}</td><td>${x.duracion_min} min</td><td>$${x.precio}</td>
    <td><button class="peligro" onclick="borrarServicio(${x.id})">Quitar</button></td></tr>`).join('');
}

async function crearServicio() {
  try {
    await API.f('/api/servicios', 'POST', { nombre: s_nombre.value, duracion_min: +s_dur.value, precio: +s_precio.value });
    s_nombre.value = '';
    mensaje('s_msg', 'Servicio agregado', true);
    cargarServicios();
  } catch (error) {
    mensaje('s_msg', error.message, false);
  }
}

async function borrarServicio(id) {
  await API.f('/api/servicios/' + id, 'DELETE');
  cargarServicios();
}

async function cargarCitas() {
  const lista = await API.f('/api/citas' + (filtro.value ? '?fecha=' + filtro.value : ''));
  citasCache = lista;
  pintarCitas();
}

let citasCache = [];
function pintarCitas() {
  const q = buscar.value.trim().toLowerCase();
  const lista = citasCache.filter(x => !q || [x.codigo, x.cliente, x.mascota].some(v => String(v || '').toLowerCase().includes(q)));
  citas.innerHTML = lista.map(x => `<tr><td><b>${esc(x.codigo || '')}</b></td><td>${x.fecha}</td><td>${x.hora}</td><td>${esc(x.cliente)}</td><td>${esc(x.mascota || '')}</td><td>${esc(x.servicio)}</td><td>${esc(x.motivo || '')}</td><td>${x.estado.replace('_', ' ')}${x.notas ? '<br><small>' + esc(x.notas) + '</small>' : ''}</td>
    <td>${x.estado === 'reservada' ? `<button onclick="atender(${x.id})">Atender</button><button class="suave" onclick="accion(${x.id},'noasistio')">No asistió</button><button class="peligro" onclick="accion(${x.id},'cancelar')">Cancelar</button>` : ''}</td></tr>`).join('');
}

// tipo: 'atender', 'noasistio' o 'cancelar' (coincide con la ruta del servidor)
async function accion(id, tipo, cuerpo) {
  await API.f(`/api/citas/${id}/${tipo}`, 'PATCH', cuerpo);
  cargarCitas();
  cargarReporte();
}

async function atender(id) {
  const notas = prompt('Notas de la atención (diagnóstico, tratamiento, indicaciones). Puede dejarse vacío:');
  if (notas === null) return;
  accion(id, 'atender', { notas });
}

function hoy() {
  filtro.value = hoyLocal();
  cargarCitas();
}

async function cargarHorarios() {
  const lista = await API.f('/api/horarios');
  horarios.innerHTML = lista.map(x => `<tr><td>${DIAS[x.dia]}</td><td><input type="time" id="a${x.dia}" value="${x.abre}"></td><td><input type="time" id="c${x.dia}" value="${x.cierra}"></td>
    <td><input type="checkbox" id="v${x.dia}" ${x.activo ? 'checked' : ''}></td><td><button onclick="guardarHorario(${x.dia})">Guardar</button></td></tr>`).join('');
}

// Los campos de cada día tienen id a0..a6 (abre), c0..c6 (cierra) y v0..v6 (activo)
async function guardarHorario(dia) {
  try {
    await API.f('/api/horarios/' + dia, 'PUT', {
      abre: document.getElementById('a' + dia).value,
      cierra: document.getElementById('c' + dia).value,
      activo: document.getElementById('v' + dia).checked
    });
    mensaje('h_msg', DIAS[dia] + ': horario guardado', true);
  } catch (error) {
    mensaje('h_msg', error.message, false);
  }
}

filtro.addEventListener('change', cargarCitas);
buscar.addEventListener('input', pintarCitas);
cargarReporte();
cargarHorarios();
cargarServicios();
cargarCitas();
