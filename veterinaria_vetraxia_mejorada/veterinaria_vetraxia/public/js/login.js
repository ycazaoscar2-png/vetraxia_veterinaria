// Guarda la sesión y manda a cada usuario a su pantalla
function ir(datos) {
  localStorage.setItem('token', datos.token);
  localStorage.setItem('rol', datos.rol);
  localStorage.setItem('nombre', datos.nombre);
  location.href = datos.rol === 'admin' ? '/admin.html' : '/cliente.html';
}

async function entrar() {
  try {
    ir(await API.f('/api/auth/login', 'POST', { email: l_email.value, password: l_clave.value }));
  } catch (error) {
    mensaje('l_msg', error.message, false);
  }
}

async function registrar() {
  try {
    ir(await API.f('/api/auth/registro', 'POST', {
      nombre: r_nombre.value,
      email: r_email.value,
      password: r_clave.value
    }));
  } catch (error) {
    mensaje('r_msg', error.message, false);
  }
}

// ---------- Recuperar acceso ----------
function abrirRecuperar() {
  recuperar.style.display = '';
  c_email.value = c_email.value || l_email.value;
}
if (location.hash === '#recuperar') abrirRecuperar();
addEventListener('hashchange', () => { if (location.hash === '#recuperar') abrirRecuperar(); });

function pestana(cual) {
  p_clave.style.display = cual === 'clave' ? '' : 'none';
  p_usuario.style.display = cual === 'usuario' ? '' : 'none';
  t_clave.classList.toggle('activa', cual === 'clave');
  t_usuario.classList.toggle('activa', cual === 'usuario');
}

async function pedirCodigo() {
  try {
    await API.f('/api/auth/olvide', 'POST', { email: c_email.value });
    c_paso2.style.display = '';
    mensaje('c_msg', 'Si el correo está registrado, te enviamos un código.', true);
  } catch (error) {
    mensaje('c_msg', error.message, false);
  }
}

async function cambiarClave() {
  try {
    await API.f('/api/auth/restablecer', 'POST', { email: c_email.value, codigo: c_codigo.value, password: c_nueva.value });
    mensaje('c_msg', '¡Clave cambiada! Ya puedes iniciar sesión.', true);
    l_email.value = c_email.value;
    c_paso2.style.display = 'none';
    location.hash = '#sec-entrar';
  } catch (error) {
    mensaje('c_msg', error.message, false);
  }
}

async function buscarUsuario() {
  try {
    const r = await API.f('/api/auth/recuperar-usuario', 'POST', { nombre: u_nombre.value, mascota: u_mascota.value });
    mensaje('u_msg', 'Tu usuario es: ' + r.email, true);
  } catch (error) {
    mensaje('u_msg', error.message, false);
  }
}
