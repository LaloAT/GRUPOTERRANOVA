'use strict';

/**
 * navbar toggle en mobile
 */
const /** {NodeElement} */ $navbar = document.querySelector('[data-navbar]');
const /** {NodeElement} */ $navToggler = document.querySelector('[data-nav-toggler]');

if ($navToggler) {
  $navToggler.addEventListener('click', () => $navbar.classList.toggle('active'));
}

/**
 * Estado del header al hacer scroll
 */
const /** {NodeElement} */ $header = document.querySelector('[data-header]');

window.addEventListener('scroll', () => {
  if ($header) {
    $header.classList[window.scrollY > 50 ? 'add' : 'remove']('active');
  }
});

/**
 * Toggle de botón "favorito"
 */
const /** {NodeList} */ $toggleBtns = document.querySelectorAll('[data-toggle-btn]');

$toggleBtns.forEach($toggleBtn => {
  $toggleBtn.addEventListener('click', () => {
    $toggleBtn.classList.toggle('active');
  });
});

/* ==========================================================
   FILTRO DE PROPIEDADES + SECCIÓN "VENDER"
   ========================================================== */

// === Selecciones ===
const $sellFormSection  = document.getElementById('owner-form');              // sección del formulario
const $propertySection  = document.querySelector('.section.property');        // sección de cards
const $wantSelect       = document.querySelector('select[name="want-to"]');
const $typeSelect       = document.querySelector('select[name="property-type"]');
const $locationInput    = document.querySelector('input[name="location"]');
const $cards            = Array.from(document.querySelectorAll('.property-list .card'));

// Normaliza texto (minúsculas, sin acentos, trim)
function norm(str) {
  return (str || '').toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/* ---------- Dirección: utilidades ---------- */

// Limitamos SIEMPRE a León, Gto
const CITY_TAGS  = ['leon', 'leon de los aldama'];
const STATE_TAGS = ['gto', 'guanajuato'];

// Mínimo para considerar un término (evita que 'v' filtre todo)
const MIN_QUERY_CHARS = 3;
// Abreviaturas útiles que sí aceptamos cortas
const SHORT_TOKENS = new Set(['av', 'blvd', 'lib', 'col']);

// ¿Vale la pena usar el filtro por ubicación?
function shouldUseLocation(q){
  const toks = norm(q).split(/[,\s]+/).filter(Boolean);
  return toks.some(t => t.length >= MIN_QUERY_CHARS || SHORT_TOKENS.has(t));
}

// Sinónimos/variantes de tokens comunes
function expandToken(t){
  const map = {
    blvd: ['blvd', 'bulevar', 'boulevard', 'blvrd', 'blv'],
    av:   ['av', 'avenida'],
    lib:  ['lib', 'libramiento'],
    col:  ['col', 'colonia'],
    calle:['calle','c','cll']
  };
  return map[t] || [t];
}

function escapeRe(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Coincidencia por PALABRAS (inicio de palabra), respetando sinónimos
function matchesLocation(addrNorm, queryNorm){
  const tokens = queryNorm.split(/[,\s]+/).filter(Boolean);
  for (const t of tokens){
    if (t.length < MIN_QUERY_CHARS && !SHORT_TOKENS.has(t)) continue; // ignora ruido
    let ok = false;
    for (const variant of expandToken(t)){
      const rx = new RegExp(`\\b${escapeRe(variant)}`); // empieza palabra
      if (rx.test(addrNorm)){ ok = true; break; }
    }
    if (!ok) return false; // si un token no aparece, no hay match
  }
  return true;
}

// Mapear "Quiero" -> data-operacion de las cards
function operacionEsperada(want) {
  if (want === 'buy')  return 'comprar';
  if (want === 'rent') return 'rentar';
  return null; // 'sell' no muestra cards
}

function filtrarPropiedades() {
  const want = $wantSelect ? $wantSelect.value : 'buy';
  const tipo = $typeSelect ? $typeSelect.value : 'any';
  const queryUbicacion = $locationInput ? norm($locationInput.value) : '';

  // Si elige VENDER: mostrar form y ocultar cards
  if (want === 'sell') {
    if ($propertySection) $propertySection.hidden = true;
    if ($sellFormSection) $sellFormSection.hidden = false;
    return;
  } else {
    if ($propertySection) $propertySection.hidden = false;
    if ($sellFormSection) $sellFormSection.hidden = true;
  }

  const esperado = operacionEsperada(want);

  $cards.forEach($card => {
    const cOp   = ($card.dataset.operacion || '').toLowerCase();
    const cTipo = ($card.dataset.tipo || '').toLowerCase();
    const addr  = norm($card.querySelector('.card-text')?.textContent || '');

    let visible = cOp === esperado;

    // 1) Limitar SIEMPRE a León, Gto (por seguridad geográfica)
    if (visible) {
      const inLeon = CITY_TAGS.some(t => addr.includes(t))
                  && STATE_TAGS.some(t => addr.includes(t));
      if (!inLeon) visible = false;
    }

    // 2) Tipo
    if (visible && tipo !== 'any') visible = cTipo === tipo;

    // 3) Búsqueda por ubicación (solo si la query es "suficiente")
    if (visible && shouldUseLocation(queryUbicacion)) {
      visible = matchesLocation(addr, queryUbicacion);
    }

    $card.style.display = visible ? '' : 'none';
  });
}

// Eventos de los filtros
$wantSelect?.addEventListener('change', filtrarPropiedades);
$typeSelect?.addEventListener('change', filtrarPropiedades);
$locationInput?.addEventListener('input', filtrarPropiedades);

// Botón "Buscar" del formulario de filtros
document.getElementById('search-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  filtrarPropiedades();
  const target = document.getElementById('property') || document.querySelector('.property');
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Ejecutar al cargar
filtrarPropiedades();

/* ==========================================================
   FORMULARIO DE PROPIETARIO (VENDER/RENTAR)
   ========================================================== */

const publishForm = document.getElementById('publishForm');
const previewBox  = document.getElementById('owner-preview');

function normalizePhoneMx(v) {
  // Deja solo dígitos, quita 52 si ya viene
  const digits = (v || '').replace(/\D+/g, '');
  const trimmed = digits.startsWith('52') ? digits.slice(2) : digits;
  return trimmed;
}

publishForm?.addEventListener('submit', (e) => {
  e.preventDefault();

  // Campos
  const op    = publishForm['owner-operation']?.value || 'vender';
  const type  = publishForm['property-type']?.value || 'cualquiera';
  const name  = publishForm.name?.value?.trim() || '';
  const phone = normalizePhoneMx(publishForm.phone?.value);
  const time  = publishForm['contact-time']?.value || 'cualquier-hora';
  const zone  = publishForm.zone?.value?.trim() || '';   // opcional
  const notes = publishForm.notes?.value?.trim() || '';  // opcional
  const consent = document.getElementById('owner-consent')?.checked;

  // Validación (obligatorios)
  if (!name) { alert('Por favor, escribe tu nombre.'); return; }
  if (!phone || phone.length < 10) { alert('Escribe un teléfono válido (10 dígitos).'); return; }
  if (!consent) { alert('Debes aceptar que te contactemos por teléfono o WhatsApp.'); return; }

  // Vista previa (para pruebas)
  const resumen =
`✅ Datos recibidos
• Operación: ${op}
• Tipo: ${type}
• Nombre: ${name}
• Teléfono: +52 ${phone}
• Horario: ${time}
• Zona: ${zone || '—'}
• Comentarios: ${notes || '—'}`;

  if (previewBox) {
    previewBox.textContent = resumen;
    previewBox.hidden = false;
    previewBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // >>> Futuro: enviar a WhatsApp
  // const msg = encodeURIComponent(
  //   `Hola, quiero ${op} mi propiedad.\n` +
  //   `Tipo: ${type}\n` +
  //   `Nombre: ${name}\n` +
  //   `Tel: +52 ${phone}\n` +
  //   `Horario: ${time}\n` +
  //   `Zona: ${zone || '—'}\n` +
  //   `Comentarios: ${notes || '—'}`
  // );
  // const tuNumero = '524771234567'; // 52 + LADA + número (sin '+')
  // window.open(`https://wa.me/${tuNumero}?text=${msg}`, '_blank');

  // Reset suave
  publishForm.reset();
  // Defaults
  if (publishForm['owner-operation']) publishForm['owner-operation'][0].checked = true;
  const ownerType = document.getElementById('owner-type');
  if (ownerType) ownerType.value = 'cualquiera';
  const ownerTime = document.getElementById('owner-time');
  if (ownerTime) ownerTime.value = 'cualquier-hora';
});

/* ==========================================================
   NAVBAR → atajos (Home únicamente)
========================================================== */
(function setupNavbarShortcuts(){
  // ¿Estamos en Home? (para no tocar páginas de detalle)
  const isHome = !!(document.querySelector('.search-bar') || document.querySelector('.property-list'));
  if (!isHome) return;

  // Referencias
  const $wantSelect      = document.querySelector('#want-to')       || document.querySelector('select[name="want-to"]');
  const $typeSelect      = document.querySelector('#property-type') || document.querySelector('select[name="property-type"]');
  const $locationInput   = document.querySelector('#location')      || document.querySelector('input[name="location"]');

  const $sellFormSection = document.getElementById('owner-form');
  const $propertySection = document.querySelector('.section.property');
  const $searchForm      = document.getElementById('search-form') || document.querySelector('.search-bar');
  const $hero            = document.getElementById('hero')        || document.querySelector('.hero');
  const $featureTop      = document.querySelector('.feature');
  const $navbar          = document.querySelector('[data-navbar]');
  const $header          = document.querySelector('[data-header]');

  function applyFilterIfExists(){
    if (typeof filtrarPropiedades === 'function') filtrarPropiedades();
  }

  function scrollToEl(el){
    if (!el) return;
    const headerH = ($header && $header.classList.contains('active')) ? 72 : 100;
    const y = el.getBoundingClientRect().top + window.scrollY - (headerH + 12);
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  function setWantAndGo(mode){
    if ($wantSelect) { $wantSelect.value = mode; applyFilterIfExists(); }
    const target = (mode === 'sell')
      ? ($sellFormSection || $hero || document.body)
      : ($searchForm || $hero || $propertySection || document.body);
    scrollToEl(target);
  }

  // Reset total para Inicio
  function resetToHomeDefault(clickedEl){
    if ($wantSelect)    $wantSelect.value = 'buy';   // Comprar
    if ($typeSelect)    $typeSelect.value = 'any';   // Cualquiera
    if ($locationInput) $locationInput.value = '';   // Ubicación vacía
    if ($propertySection) $propertySection.hidden = false;
    if ($sellFormSection) $sellFormSection.hidden = true;

    applyFilterIfExists();
    scrollToEl($hero || document.body);

    // activar visualmente
    document.querySelectorAll('.navbar-link[data-nav], .navbar .navbar-link').forEach(a => a.classList.remove('active'));
    clickedEl?.classList.add('active');
  }

document.querySelectorAll('.navbar .navbar-link, .footer .footer-link').forEach(a => {
    a.addEventListener('click', (ev) => {
      const key = (a.dataset.nav || a.textContent || '').toLowerCase();

      if (key.includes('rentar'))       { ev.preventDefault(); setWantAndGo('rent'); }
      else if (key.includes('comprar')) { ev.preventDefault(); setWantAndGo('buy');  }
      else if (key.includes('vender'))  { ev.preventDefault(); setWantAndGo('sell'); }
      else if (key.includes('nosotros')){ ev.preventDefault(); scrollToEl($featureTop || document.body); }
      else if (key.includes('inicio'))  { ev.preventDefault(); resetToHomeDefault(a); }

      // cerrar menú en mobile si estaba abierto
      if ($navbar?.classList.contains('active')) $navbar.classList.remove('active');
    });
  });
})();

/* ==========================================================
   NAVBAR → Botón "Contáctanos" (WhatsApp)
========================================================== */
(function setupNavbarContact(){
  const CONTACT_NUMBER = '5214793139842'; // 52 + LADA + número, solo dígitos
  const $btns = Array.from(document.querySelectorAll('#nav-contact, #footer-contact'));
  if (!$btns.length) return;

  // Referencias (si existen en esta página)
  const $want  = document.getElementById('want-to')       || document.querySelector('select[name="want-to"]');
  const $type  = document.getElementById('property-type') || document.querySelector('select[name="property-type"]');
  const $loc   = document.getElementById('location')      || document.querySelector('input[name="location"]');
  const $nav   = document.querySelector('[data-navbar]');

  const wantMap = { buy: 'comprar', rent: 'rentar', sell: 'vender' };

  function openWhatsApp(msg){
    const url = `https://wa.me/${CONTACT_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }

  function handleClick(e){
    e.preventDefault();
    const want = $want?.value || 'buy';
    const wantTxt = wantMap[want] || 'comprar';
    const typeTxt = ($type?.value && $type.value !== 'any') ? $type.options[$type.selectedIndex].text : 'cualquier tipo';
    const locTxt  = $loc?.value?.trim() ? ` en "${$loc.value.trim()}"` : '';
    const msg = `Hola 👋, me gustaría ${wantTxt} una propiedad (${typeTxt})${locTxt}.\n¿Me pueden apoyar?`;
    openWhatsApp(msg);
    if ($nav?.classList.contains('active')) $nav.classList.remove('active');
  }

  $btns.forEach(btn => btn.addEventListener('click', handleClick));
})();


/* ==========================================================
   VIDEO HERO (reproducción inline con overlay)
========================================================== */
(function setupHeroVideo(){
  const card  = document.getElementById('home-video-card');
  const btn   = document.getElementById('home-video-play');
  const video = document.getElementById('home-video');
  if (!card || !btn || !video) return;

  // Logs de diagnóstico
  console.log('[video] canPlayType mp4:', video.canPlayType('video/mp4'));

  video.addEventListener('error', () => {
    const err = video.error;
    console.error('[video] error', err && err.code, err);
    alert('No se pudo cargar el video. Revisa la ruta ./assets/video/video-card.mp4');
  });

  // Al presionar Play:
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    console.log('[video] click play');
    try {
      card.classList.add('playing');
      video.controls = true;
      video.load();        // fuerza recarga
      await video.play();
      console.log('[video] playing');
    } catch (err) {
      console.warn('[video] play() rechazado:', err);
      card.classList.remove('playing');
      video.controls = true;
      alert('El navegador bloqueó la reproducción automática. Intenta dar play en los controles.');
    }
  });

  // Pausa manual
  video.addEventListener('pause', () => {
    if (!video.ended) {
      card.classList.remove('playing');
      video.controls = false;
    }
  });

  // Al finalizar
  video.addEventListener('ended', () => {
    video.currentTime = 0;
    video.controls = false;
    card.classList.remove('playing');
  });
})();
