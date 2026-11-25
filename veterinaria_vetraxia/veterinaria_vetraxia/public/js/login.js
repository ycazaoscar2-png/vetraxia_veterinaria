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
