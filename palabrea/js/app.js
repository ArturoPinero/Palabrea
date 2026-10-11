// Palabrea — lógica del juego
// Depende de palabras.js (SOLUCIONES y VALIDAS), que se carga antes.

const LARGO = 5;
const INTENTOS = 6;
const INICIO = new Date(2026, 0, 1); // día 1 de la palabra diaria
const KEY_ESTADO = 'palabrea-diaria';
const KEY_STATS = 'palabrea-estadisticas';
const REDUCIR = matchMedia('(prefers-reduced-motion: reduce)').matches;
const T_GIRO = REDUCIR ? 0 : 280;

const $ = (s) => document.querySelector(s);

// ---------- Utilidades ----------
function leer(clave, porDefecto) {
  try { const v = localStorage.getItem(clave); return v ? JSON.parse(v) : porDefecto; }
  catch (e) { return porDefecto; }
}
function escribir(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) {}
}
// Quita tildes y diéresis pero conserva la ñ
function normalizar(txt) {
  return txt.toLowerCase().replace(/ñ/g, '\u0001')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\u0001/g, 'ñ');
}
// Generador pseudoaleatorio con semilla, para que la palabra del día sea la misma para todos
function mezclar(lista, semilla) {
  const a = lista.slice();
  let s = semilla;
  const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const ORDEN_DIARIO = mezclar(SOLUCIONES, 20260101);

function numeroDelDia() {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.floor((hoy - INICIO) / 86400000) + 1;
}
function palabraDelDia(n) {
  return ORDEN_DIARIO[((n - 1) % ORDEN_DIARIO.length + ORDEN_DIARIO.length) % ORDEN_DIARIO.length];
}

// Compara un intento con la solución. Gestiona bien las letras repetidas:
// primero marca los aciertos exactos y después reparte las letras sobrantes.
function evaluar(intento, solucion) {
  const res = Array(LARGO).fill('ausente');
  const quedan = {};
  for (let i = 0; i < LARGO; i++) {
    if (intento[i] === solucion[i]) res[i] = 'acierto';
    else quedan[solucion[i]] = (quedan[solucion[i]] || 0) + 1;
  }
  for (let i = 0; i < LARGO; i++) {
    if (res[i] !== 'acierto' && quedan[intento[i]] > 0) {
      res[i] = 'presente';
      quedan[intento[i]]--;
    }
  }
  return res;
}

// ---------- Estado ----------
let modo = 'diaria';
let juego;            // { solucion, intentos: [], resultados: [], actual: '', fin: false, gano: false, dia }
let bloqueado = false;

function nuevaPartida(m) {
  modo = m;
  if (m === 'diaria') {
    const dia = numeroDelDia();
    const guardado = leer(KEY_ESTADO, null);
    if (guardado && guardado.dia === dia) juego = guardado;
    else juego = { dia, solucion: palabraDelDia(dia), intentos: [], resultados: [], fin: false, gano: false };
  } else {
    const sol = SOLUCIONES[Math.floor(Math.random() * SOLUCIONES.length)];
    juego = { dia: null, solucion: sol, intentos: [], resultados: [], fin: false, gano: false };
  }
  juego.actual = '';
  document.querySelectorAll('#modos button').forEach((b) =>
    b.setAttribute('aria-pressed', b.dataset.modo === m));
  $('#subtitulo').textContent = m === 'diaria'
    ? `Palabra del día n.º ${juego.dia}`
    : 'Partida libre: palabra al azar';
  pintarTablero();
  pintarTeclado();
}

function guardarDiaria() {
  if (modo === 'diaria') escribir(KEY_ESTADO, { ...juego, actual: '' });
}

// ---------- Pintado ----------
function construirTablero() {
  const t = $('#tablero');
  t.innerHTML = '';
  for (let f = 0; f < INTENTOS; f++) {
    const fila = document.createElement('div');
    fila.className = 'fila';
    fila.setAttribute('role', 'row');
    for (let c = 0; c < LARGO; c++) {
      const celda = document.createElement('div');
      celda.className = 'celda';
      celda.setAttribute('role', 'gridcell');
      fila.appendChild(celda);
    }
    t.appendChild(fila);
  }
}

function pintarTablero() {
  const filas = $('#tablero').children;
  for (let f = 0; f < INTENTOS; f++) {
    const celdas = filas[f].children;
    filas[f].className = 'fila';
    const palabra = f < juego.intentos.length ? juego.intentos[f]
      : f === juego.intentos.length ? juego.actual : '';
    const res = juego.resultados[f];
    for (let c = 0; c < LARGO; c++) {
      const letra = palabra[c] || '';
      celdas[c].textContent = letra;
      celdas[c].className = 'celda' + (res ? ' ' + res[c] : letra ? ' llena' : '');
      celdas[c].setAttribute('aria-label', letra ? `${letra.toUpperCase()}${res ? ', ' + textoEstado(res[c]) : ''}` : 'vacía');
    }
  }
}
function textoEstado(e) {
  return { acierto: 'en su sitio', presente: 'en otra posición', ausente: 'no está' }[e];
}

const FILAS_TECLADO = ['qwertyuiop', 'asdfghjklñ', '>zxcvbnm<'];
function construirTeclado() {
  const k = $('#teclado');
  k.innerHTML = '';
  FILAS_TECLADO.forEach((linea) => {
    const fila = document.createElement('div');
    fila.className = 'tfila';
    for (const ch of linea) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tecla';
      if (ch === '>') { b.textContent = 'ENVIAR'; b.dataset.k = 'Enter'; b.classList.add('ancha'); }
      else if (ch === '<') { b.textContent = '⌫'; b.dataset.k = 'Backspace'; b.classList.add('ancha'); b.setAttribute('aria-label', 'Borrar'); }
      else { b.textContent = ch; b.dataset.k = ch; }
      fila.appendChild(b);
    }
    k.appendChild(fila);
  });
}

function pintarTeclado() {
  const prioridad = { acierto: 3, presente: 2, ausente: 1 };
  const mejor = {};
  juego.intentos.forEach((p, f) => {
    [...p].forEach((l, i) => {
      const e = juego.resultados[f][i];
      if (!mejor[l] || prioridad[e] > prioridad[mejor[l]]) mejor[l] = e;
    });
  });
  document.querySelectorAll('.tecla').forEach((b) => {
    const l = b.dataset.k;
    b.classList.remove('acierto', 'presente', 'ausente');
    if (mejor[l]) b.classList.add(mejor[l]);
  });
}

let toastTimer;
function aviso(txt, ms = 1600) {
  const t = $('#toast');
  t.textContent = txt;
  t.hidden = false;
  clearTimeout(toastTimer);
  if (ms) toastTimer = setTimeout(() => (t.hidden = true), ms);
}

// ---------- Entrada ----------
function pulsar(tecla) {
  if (bloqueado || juego.fin) return;
  if (tecla === 'Enter') return enviar();
  if (tecla === 'Backspace') { juego.actual = juego.actual.slice(0, -1); return pintarTablero(); }
  const l = normalizar(tecla);
  if (/^[a-zñ]$/.test(l) && juego.actual.length < LARGO) {
    juego.actual += l;
    pintarTablero();
  }
}

function enviar() {
  const fila = $('#tablero').children[juego.intentos.length];
  const p = juego.actual;
  if (p.length < LARGO) { sacudir(fila); return aviso('Faltan letras'); }
  if (!VALIDAS.has(p)) { sacudir(fila); return aviso('Esa palabra no está en la lista'); }

  const res = evaluar(p, juego.solucion);
  juego.intentos.push(p);
  juego.resultados.push(res);
  juego.actual = '';
  juego.gano = p === juego.solucion;
  juego.fin = juego.gano || juego.intentos.length === INTENTOS;
  guardarDiaria();
  revelar(fila, p, res);
}

function sacudir(fila) {
  fila.classList.remove('sacude');
  void fila.offsetWidth;
  fila.classList.add('sacude');
}

function revelar(fila, p, res) {
  bloqueado = true;
  const celdas = fila.children;
  for (let i = 0; i < LARGO; i++) {
    setTimeout(() => {
      celdas[i].classList.add('gira');
      setTimeout(() => {
        celdas[i].classList.remove('llena');
        celdas[i].classList.add(res[i]);
      }, T_GIRO / 2);
    }, i * T_GIRO);
  }
  setTimeout(() => {
    bloqueado = false;
    pintarTablero();
    pintarTeclado();
    if (juego.fin) terminar(fila);
  }, LARGO * T_GIRO + 100);
}

const FRASES = ['¡Genio!', '¡Magnífico!', '¡Muy bien!', '¡Bien hecho!', '¡Uf, por poco!', '¡Al límite!'];
function terminar(fila) {
  if (juego.gano) {
    fila.classList.add('gana');
    aviso(FRASES[juego.intentos.length - 1]);
  } else {
    aviso(`La palabra era ${juego.solucion.toUpperCase()}`, 2600);
  }
  if (modo === 'diaria') registrarEstadistica();
  setTimeout(() => abrirStats(), REDUCIR ? 300 : 1600);
}

// ---------- Estadísticas ----------
function statsVacias() {
  return { jugadas: 0, ganadas: 0, racha: 0, mejorRacha: 0, dist: [0, 0, 0, 0, 0, 0], ultimoDia: null };
}
function registrarEstadistica() {
  const s = leer(KEY_STATS, statsVacias());
  if (s.ultimoDia === juego.dia) return; // ya contada
  s.jugadas++;
  if (juego.gano) {
    s.ganadas++;
    s.dist[juego.intentos.length - 1]++;
    s.racha = s.ultimoGanado === juego.dia - 1 ? s.racha + 1 : 1;
    s.ultimoGanado = juego.dia;
    s.mejorRacha = Math.max(s.mejorRacha, s.racha);
  } else {
    s.racha = 0;
  }
  s.ultimoDia = juego.dia;
  escribir(KEY_STATS, s);
}

function abrirStats() {
  const s = leer(KEY_STATS, statsVacias());
  $('#nJugadas').textContent = s.jugadas;
  $('#nPct').textContent = s.jugadas ? Math.round((s.ganadas / s.jugadas) * 100) : 0;
  $('#nRacha').textContent = s.racha;
  $('#nMejor').textContent = s.mejorRacha;

  const max = Math.max(1, ...s.dist);
  const actual = modo === 'diaria' && juego.fin && juego.gano ? juego.intentos.length : 0;
  $('#dist').innerHTML = s.dist.map((n, i) =>
    `<div class="barra${actual === i + 1 ? ' actual' : ''}"><span>${i + 1}</span>
      <div style="width:${Math.max(8, (n / max) * 100)}%">${n}</div></div>`).join('');

  const res = $('#resultado');
  if (juego.fin) {
    res.hidden = false;
    res.innerHTML = juego.gano
      ? `Acertaste <span class="sol">${juego.solucion}</span> en ${juego.intentos.length} de ${INTENTOS}.`
      : `La palabra era <span class="sol">${juego.solucion}</span>.`;
  } else res.hidden = true;

  $('#btnCompartir').hidden = !juego.fin;
  $('#btnOtra').textContent = modo === 'diaria' ? 'Jugar partida libre' : 'Otra palabra';
  $('#copia').hidden = true;
  $('#copiaMsg').textContent = '';
  actualizarCuenta();
  $('#dlgStats').showModal();
}

function actualizarCuenta() {
  const ahora = new Date();
  const manana = new Date(ahora); manana.setHours(24, 0, 0, 0);
  const seg = Math.floor((manana - ahora) / 1000);
  const hh = String(Math.floor(seg / 3600)).padStart(2, '0');
  const mm = String(Math.floor((seg % 3600) / 60)).padStart(2, '0');
  const ss = String(seg % 60).padStart(2, '0');
  $('#proxima').textContent = `Nueva palabra del día en ${hh}:${mm}:${ss}`;
}
setInterval(() => { if ($('#dlgStats').open) actualizarCuenta(); }, 1000);

function textoCompartir() {
  const cuadros = { acierto: '🟩', presente: '🟨', ausente: '⬛' };
  const cab = modo === 'diaria'
    ? `Palabrea n.º ${juego.dia} ${juego.gano ? juego.intentos.length : 'X'}/${INTENTOS}`
    : `Palabrea (libre) ${juego.gano ? juego.intentos.length : 'X'}/${INTENTOS}`;
  return cab + '\n\n' + juego.resultados.map((r) => r.map((e) => cuadros[e]).join('')).join('\n');
}

$('#btnCompartir').addEventListener('click', () => {
  const txt = textoCompartir();
  const caja = $('#copia');
  caja.value = txt;
  const fallback = () => {
    caja.hidden = false;
    caja.select();
    $('#copiaMsg').textContent = 'Selecciona el texto y cópialo.';
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt)
      .then(() => { $('#copiaMsg').textContent = 'Resultado copiado. Pégalo donde quieras.'; })
      .catch(fallback);
  } else fallback();
});

$('#btnOtra').addEventListener('click', () => {
  $('#dlgStats').close();
  nuevaPartida('libre');
});

// ---------- Eventos ----------
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (document.querySelector('dialog[open]')) return;
  if (e.key === 'Enter' || e.key === 'Backspace' || e.key.length === 1) {
    e.preventDefault();
    pulsar(e.key);
  }
});
$('#teclado').addEventListener('click', (e) => {
  const b = e.target.closest('.tecla');
  if (b) { pulsar(b.dataset.k); b.blur(); }
});
$('#modos').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b && !bloqueado) nuevaPartida(b.dataset.modo);
});
$('#btnAyuda').addEventListener('click', () => $('#dlgAyuda').showModal());
$('#btnStats').addEventListener('click', abrirStats);
document.querySelectorAll('[data-cerrar]').forEach((b) =>
  b.addEventListener('click', () => b.closest('dialog').close()));

// ---------- Arranque ----------
construirTablero();
construirTeclado();
nuevaPartida('diaria');
