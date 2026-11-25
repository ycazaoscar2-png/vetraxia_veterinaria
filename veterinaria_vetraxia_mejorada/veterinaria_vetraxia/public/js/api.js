// Cliente mínimo para hablar con la API: envía el token y lanza un error si algo sale mal
const API = {
  async f(url, metodo = 'GET', cuerpo) {
    const respuesta = await fetch(url, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (localStorage.getItem('token') || '')
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined
    });
    const datos = await respuesta.json().catch(() => ({}));
    // Sesión vencida o inválida: se cierra la sesión y se vuelve al inicio
    if (respuesta.status === 401 && localStorage.getItem('token')) {
      localStorage.clear();
      location.href = '/';
    }
    if (!respuesta.ok) throw new Error(datos.error || 'Error');
    return datos;
  }
};

// Evita que el texto escrito por los usuarios se interprete como HTML
const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = texto => String(texto).replace(/[&<>"']/g, caracter => ENTIDADES[caracter]);

function salir() {
  localStorage.clear();
  location.href = '/';
}

// Si no hay sesión o el rol no corresponde a la página, vuelve al inicio
function guardia(rol) {
  const sinPermiso = !localStorage.getItem('token') || localStorage.getItem('rol') !== rol;
  if (sinPermiso) location.href = '/';
}

function mensaje(id, texto, ok) {
  const elemento = document.getElementById(id);
  elemento.textContent = texto;
  elemento.className = 'msg ' + (ok ? 'ok' : 'error');
}
