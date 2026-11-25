guardia('cliente');
quien.textContent = localStorage.getItem('nombre');

// Fecha de hoy en la zona horaria del navegador (AAAA-MM-DD)
const hoyLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

fecha.min = hoyLocal();
fecha.value = fecha.min;
let editId = null; // id de la cita que se está reprogramando (null = reserva nueva)

async function cargarServicios() {
  const lista = await API.f('/api/servicios');
  servicio.innerHTML = lista
    .map(x => `<option value="${x.id}">${esc(x.nombre)} · ${x.duracion_min} min · $${x.precio}</option>`)
    .join('');
}

async function cargarMascotas() {
  const lista = await API.f('/api/mascotas');
  mascota.innerHTML = lista.length
    ? lista.map(x => `<option value="${x.id}">${esc(x.nombre)} (${esc(x.especie)})</option>`).join('')
    : '<option value="">Registra una mascota primero</option>';
  listaMascotas.innerHTML = lista.map(x => `<tr><td>${esc(x.nombre)}</td><td>${esc(x.especie)}</td><td>${esc(x.raza || '')}</td><td>${esc(x.edad || '')}</td>
    <td><button class="suave" onclick="verHistorial(${x.id},'${esc(x.nombre)}')">Historial</button> <button class="peligro" onclick="quitarMascota(${x.id})">Quitar</button></td></tr>`).join('');
}

async function agregarMascota() {
  try {
    await API.f('/api/mascotas', 'POST', {
      nombre: m_nombre.value,
      especie: m_especie.value,
      raza: m_raza.value,
      edad: m_edad.value
    });
    m_nombre.value = m_raza.value = m_edad.value = '';
    mensaje('m_msg', 'Mascota registrada', true);
    cargarMascotas();
  } catch (error) {
    mensaje('m_msg', error.message, false);
  }
}

async function quitarMascota(id) {
  await API.f('/api/mascotas/' + id, 'DELETE');
  cargarMascotas();
}

async function verHistorial(id, nombre) {
  const atenciones = await API.f(`/api/mascotas/${id}/historial`);
  const tabla = '<table><thead><tr><th>Fecha</th><th>Servicio</th><th>Motivo</th><th>Notas del veterinario</th></tr></thead><tbody>' +
    atenciones.map(x => `<tr><td>${x.fecha}</td><td>${esc(x.servicio)}</td><td>${esc(x.motivo || '')}</td><td>${esc(x.notas || '')}</td></tr>`).join('') +
    '</tbody></table>';
  historial.innerHTML = `<h3>Historial de ${esc(nombre)}</h3>` +
    (atenciones.length ? tabla : '<p>Aún no tiene atenciones registradas.</p>');
}

// Llena la lista de horas del día elegido; las ocupadas salen deshabilitadas
async function cargarHoras() {
  if (!fecha.value || !servicio.value) return;
  const url = `/api/citas/horas?fecha=${fecha.value}&servicio_id=${servicio.value}` + (editId ? '&excluir=' + editId : '');
  const espacios = await API.f(url);
  hora.innerHTML = espacios.length
    ? espacios.map(x => `<option value="${x.hora}" ${x.libre ? '' : 'disabled'}>${x.hora}${x.libre ? '' : ' (ocupada)'}</option>`).join('')
    : '<option value="">Sin atención ese día</option>';
}

async function cargarCitas() {
  const lista = await API.f('/api/citas');
  citas.innerHTML = lista.map(x => `<tr><td>${x.fecha}</td><td>${x.hora}</td><td>${esc(x.mascota || '')}</td><td>${esc(x.servicio)}</td><td>${x.estado.replace('_', ' ')}</td>
    <td>${x.estado === 'reservada' ? `<button class="suave" onclick="reprogramar(${x.id},${x.servicio_id})">Reprogramar</button> <button class="peligro" onclick="cancelar(${x.id})">Cancelar</button>` : ''}</td></tr>`).join('');
}

// Pasa el formulario a "modo edición": solo se puede cambiar fecha y hora
function reprogramar(id, servicioId) {
  editId = id;
  servicio.value = servicioId;
  servicio.disabled = mascota.disabled = true;
  btnReservar.textContent = 'Guardar cambio';
  btnCancelarEdicion.style.display = '';
  mensaje('msg', 'Elige la nueva fecha y hora y pulsa Guardar cambio', true);
  cargarHoras();
  window.scrollTo(0, 0);
}

function cancelarEdicion() {
  editId = null;
  servicio.disabled = mascota.disabled = false;
  btnReservar.textContent = 'Reservar';
  btnCancelarEdicion.style.display = 'none';
  mensaje('msg', '', true);
  cargarHoras();
}

async function reservar() {
  try {
    if (editId) {
      await API.f(`/api/citas/${editId}/reprogramar`, 'PATCH', { fecha: fecha.value, hora: hora.value });
      cancelarEdicion();
      mensaje('msg', 'Cita reprogramada', true);
    } else {
      await API.f('/api/citas', 'POST', {
        servicio_id: +servicio.value,
        mascota_id: +mascota.value,
        fecha: fecha.value,
        hora: hora.value,
        motivo: motivo.value
      });
      motivo.value = '';
      mensaje('msg', '¡Cita reservada!', true);
    }
    cargarHoras();
    cargarCitas();
  } catch (error) {
    mensaje('msg', error.message, false);
    cargarHoras();
  }
}

async function cancelar(id) {
  if (!confirm('¿Cancelar esta cita?')) return;
  await API.f(`/api/citas/${id}/cancelar`, 'PATCH');
  cargarHoras();
  cargarCitas();
}

fecha.addEventListener('change', cargarHoras);
servicio.addEventListener('change', cargarHoras);
cargarServicios().then(cargarHoras);
cargarMascotas();
cargarCitas();
