// Mascota juguetona que vive en el menú: sigue al mouse por las opciones, salta, juega a la pelota,
// se duerme si no la tocas y permite escribirle al dueño de la veterinaria.
(function () {
  const cabecera = document.querySelector('header');
  if (!cabecera) return;
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const SVG = `<svg viewBox="0 0 64 48" aria-hidden="true">
    <path class="cola" d="M12 24 Q1 14 6 5" stroke="#b9772f" stroke-width="5" fill="none" stroke-linecap="round"/>
    <rect class="pata a" x="15" y="33" width="6" height="12" rx="3" fill="#b9772f"/>
    <rect class="pata b" x="23" y="33" width="6" height="12" rx="3" fill="#a5651f"/>
    <g class="cuerpo-g">
      <ellipse cx="30" cy="28" rx="20" ry="11" fill="#d9923f"/>
      <rect class="pata a" x="37" y="33" width="6" height="12" rx="3" fill="#b9772f" transform="translate(0,0)"/>
      <rect class="pata b" x="45" y="33" width="6" height="12" rx="3" fill="#a5651f"/>
      <circle cx="50" cy="19" r="11" fill="#e3a050"/>
      <ellipse cx="42" cy="19" rx="4.5" ry="9" fill="#8a5524" transform="rotate(12 42 19)"/>
      <ellipse cx="58" cy="24" rx="6.5" ry="4.8" fill="#f3d3a5"/>
      <circle cx="62" cy="22.5" r="2.2" fill="#2b1b10"/>
      <circle class="ojo" cx="52" cy="16" r="2.3" fill="#2b1b10"/><circle class="ojo" cx="52.8" cy="15.2" r=".8" fill="#fff"/>
      <path class="ojo-c" d="M49.5 16 q2.5 2 5 0" stroke="#2b1b10" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path class="lengua" d="M57 28 q2 6 4.5 1 z" fill="#f43f5e"/>
      <path d="M39 27 q5 4 10 0" stroke="#dc2626" stroke-width="3" fill="none" stroke-linecap="round"/>
      <text class="zz" x="52" y="2" font-size="10" fill="#fff" font-weight="bold">z</text>
    </g></svg>`;

  const pista = document.createElement('div');
  pista.className = 'pista';
  pista.title = 'Toca el suelo para lanzar la pelota';
  const perro = document.createElement('div');
  perro.className = 'perro';
  perro.setAttribute('role', 'button');
  perro.setAttribute('aria-label', 'Mascota de la veterinaria: toca para jugar o escribir al dueño');
  perro.tabIndex = 0;
  perro.innerHTML = SVG;
  const pelota = document.createElement('div');
  pelota.className = 'pelota';
  pelota.style.display = 'none';
  const burbuja = document.createElement('div');
  burbuja.className = 'burbuja';
  pista.append(pelota, perro);
  cabecera.append(pista, burbuja);

  let x = 20, ocupado = false, dormido = false, tiempoBurbuja, ultimaActividad = Date.now();
  const ANCHO = 60;
  const limite = () => Math.max(pista.clientWidth - ANCHO - 4, 0);
  const esperar = ms => new Promise(r => setTimeout(r, ms));

  function poner(nuevoX) {
    perro.style.left = (x = Math.min(Math.max(nuevoX, 0), limite())) + 'px';
  }
  poner(x);

  async function irA(destino) {
    destino = Math.min(Math.max(destino, 0), limite());
    const dist = Math.abs(destino - x);
    if (dist < 4) return;
    const seg = reducido ? 0.01 : dist / 170;
    perro.classList.toggle('izq', destino < x);
    perro.classList.add('camina');
    perro.style.transitionDuration = seg + 's';
    x = destino;
    perro.style.left = x + 'px';
    await esperar(seg * 1000 + 30);
    perro.classList.remove('camina');
  }

  function saltar() {
    perro.classList.remove('salta');
    void perro.offsetWidth;
    perro.classList.add('salta');
  }

  function decir(html, ms = 2600) {
    clearTimeout(tiempoBurbuja);
    burbuja.innerHTML = html;
    burbuja.classList.add('ver');
    const ancho = burbuja.offsetWidth;
    const izq = Math.min(Math.max(x + ANCHO / 2 - ancho / 2, 8), Math.max(cabecera.clientWidth - ancho - 8, 8));
    burbuja.style.left = izq + 'px';
    burbuja.style.setProperty('--flecha', Math.min(Math.max(x + ANCHO / 2 - izq - 6, 10), ancho - 22) + 'px');
    if (ms) tiempoBurbuja = setTimeout(() => burbuja.classList.remove('ver'), ms);
  }

  function corazones(n = 3) {
    for (let i = 0; i < n; i++) {
      const c = document.createElement('div');
      c.className = 'corazon';
      c.textContent = ['💚', '❤️', '🐾'][i % 3];
      c.style.left = x + 14 + Math.random() * 30 + 'px';
      c.style.bottom = 36 + 'px';
      c.style.animationDelay = i * 0.12 + 's';
      pista.append(c);
      setTimeout(() => c.remove(), 1400);
    }
  }

  function feliz(ms = 1800) {
    perro.classList.add('feliz');
    setTimeout(() => perro.classList.remove('feliz'), ms);
  }

  function despertar() {
    ultimaActividad = Date.now();
    if (dormido) {
      dormido = false;
      perro.classList.remove('dormido');
      saltar();
      decir('¡Guau! 😄 ¡Estoy despierto!', 1800);
    }
  }

  // ---- Interacción con el menú ----
  const enlaces = () => [...cabecera.querySelectorAll('nav a')];
  async function acercarseA(enlace) {
    despertar();
    if (ocupado) return;
    const r = enlace.getBoundingClientRect(), p = pista.getBoundingClientRect();
    await irA(r.left - p.left + r.width / 2 - ANCHO / 2);
    saltar();
    feliz(1200);
    decir('¡Aquí está <b>' + enlace.textContent.trim() + '</b>! 👆', 1800);
  }
  enlaces().forEach(a => {
    a.addEventListener('mouseenter', () => acercarseA(a));
    a.addEventListener('focus', () => acercarseA(a));
    a.addEventListener('click', () => { saltar(); corazones(2); });
  });

  // ---- Tocar al perro: menú de la mascota ----
  async function abrirMenu() {
    despertar();
    saltar();
    feliz(2500);
    corazones();
    decir(`<b>¡Guau! 🐶</b> ¿Qué hacemos?
      <button data-a="correo">✉️ Escribir a la veterinaria</button>
      <button data-a="jugar">🎾 Jugar a la pelota</button>
      <button data-a="premio">🦴 Darle un premio</button>`, 0);
  }
  perro.addEventListener('click', e => { e.stopPropagation(); abrirMenu(); });
  perro.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirMenu(); } });
  burbuja.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const accion = b.dataset.a;
    burbuja.classList.remove('ver');
    if (accion === 'correo') formularioContacto();
    if (accion === 'jugar') jugar();
    if (accion === 'premio') { saltar(); feliz(3000); corazones(6); decir('¡Ñam ñam! 🦴 ¡Gracias!', 2500); }
  });
  document.addEventListener('click', e => { if (!burbuja.contains(e.target)) burbuja.classList.remove('ver'); });

  // ---- Jugar a la pelota ----
  async function lanzar(destino) {
    ocupado = true;
    despertar();
    destino = Math.min(Math.max(destino, 0), limite());
    pelota.style.display = '';
    pelota.style.left = Math.min(x + 30, limite() + 40) + 'px';
    pelota.classList.remove('vuela'); void pelota.offsetWidth; pelota.classList.add('vuela');
    pelota.style.left = destino + 22 + 'px';
    await esperar(550);
    await irA(destino);
    feliz(1000);
    pelota.style.display = 'none';
    saltar();
    await esperar(250);
    ocupado = false;
  }
  async function jugar() {
    decir('¡A jugar! 🎾', 1200);
    for (let i = 0; i < 3; i++) await lanzar(Math.random() * limite());
    decir('¡Qué divertido! 🐕💨 ¿Otra vez?', 2400);
  }
  pista.addEventListener('click', e => {
    if (ocupado || e.target.closest('.perro')) return;
    lanzar(e.clientX - pista.getBoundingClientRect().left - ANCHO / 2);
  });

  // ---- Contacto con el dueño ----
  function formularioContacto() {
    const velo = document.createElement('div');
    velo.className = 'velo';
    velo.innerHTML = `<div class="card" role="dialog" aria-label="Escribir a la veterinaria">
      <h2>✉️ Escribir a la veterinaria</h2>
      <p class="chico">Tu mensaje le llega directo al correo del dueño.</p>
      <input id="ct_nombre" placeholder="Tu nombre" maxlength="100">
      <input id="ct_email" type="email" placeholder="Tu correo" maxlength="120">
      <textarea id="ct_mensaje" placeholder="¿En qué te ayudamos?" maxlength="1000"></textarea>
      <button id="ct_enviar">Enviar</button> <button class="suave" id="ct_cerrar">Cerrar</button>
      <div id="ct_msg" class="msg"></div></div>`;
    document.body.append(velo);
    const q = id => velo.querySelector('#' + id);
    const cerrar = () => velo.remove();
    q('ct_nombre').value = localStorage.getItem('nombre') || '';
    q('ct_nombre').focus();
    q('ct_cerrar').onclick = cerrar;
    velo.addEventListener('click', e => { if (e.target === velo) cerrar(); });
    velo.addEventListener('keydown', e => { if (e.key === 'Escape') cerrar(); });
    const aviso = (t, ok) => { q('ct_msg').textContent = t; q('ct_msg').className = 'msg ' + (ok ? 'ok' : 'error'); };

    q('ct_enviar').onclick = async () => {
      q('ct_enviar').disabled = true;
      try {
        const r = await fetch('/api/contacto', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: q('ct_nombre').value, email: q('ct_email').value, mensaje: q('ct_mensaje').value })
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || 'No se pudo enviar');
        if (d.enviado) {
          aviso('¡Mensaje enviado! Te responderán a tu correo.', true);
          setTimeout(() => { cerrar(); saltar(); feliz(3000); corazones(5); decir('¡Mensaje enviado! 💌', 2500); }, 1500);
        } else if (d.correo) {
          q('ct_msg').className = 'msg error';
          q('ct_msg').innerHTML = 'El envío automático aún no está configurado. Escríbenos directo a <a href="mailto:' +
            encodeURI(d.correo) + '">' + d.correo.replace(/[<>&"]/g, '') + '</a>';
        } else aviso('No pudimos enviarlo ahora. Intenta de nuevo en unos minutos.', false);
      } catch (error) {
        aviso(error.message, false);
      }
      q('ct_enviar').disabled = false;
    };
  }

  // ---- Vida propia: pasea sola y se duerme ----
  addEventListener('mousemove', () => { if (dormido) despertar(); ultimaActividad = Date.now(); }, { passive: true });
  addEventListener('keydown', () => { ultimaActividad = Date.now(); });
  addEventListener('resize', () => poner(x));
  if (!reducido) setInterval(async () => {
    if (ocupado || document.hidden) return;
    const inactivo = Date.now() - ultimaActividad;
    if (!dormido && inactivo > 30000) {
      dormido = true;
      perro.classList.add('dormido');
      perro.classList.remove('feliz');
      return;
    }
    if (!dormido && Math.random() < 0.6) {
      ocupado = true;
      await irA(Math.random() * limite());
      ocupado = false;
    }
  }, 6000);

  setTimeout(() => decir('¡Guau! Soy tu guía 🐾 Pasa el mouse por el menú o tócame.', 3500), 900);
})();
