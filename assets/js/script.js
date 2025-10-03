'use strict';

/* ==========================================================
   NAV: toggle en mobile
========================================================== */
const /** @type {HTMLElement|null} */ $navbar = document.querySelector('[data-navbar]');
const /** @type {HTMLElement|null} */ $navToggler = document.querySelector('[data-nav-toggler]');

if ($navToggler) {
  $navToggler.addEventListener('click', () => $navbar?.classList.toggle('active'));
}

/* ==========================================================
   Header: estado al hacer scroll
========================================================== */
const /** @type {HTMLElement|null} */ $header = document.querySelector('[data-header]');

window.addEventListener('scroll', () => {
  if ($header) $header.classList[window.scrollY > 50 ? 'add' : 'remove']('active');
});

/* ==========================================================
   Botones "favorito"
========================================================== */
const $toggleBtns = document.querySelectorAll('[data-toggle-btn]');
$toggleBtns.forEach(btn => btn.addEventListener('click', () => btn.classList.toggle('active')));

/* ==========================================================
   FILTRO DE PROPIEDADES + SECCIÓN "VENDER"
========================================================== */

// Selecciones
const $sellFormSection  = document.getElementById('owner-form');              // sección del formulario
const $propertySection  = document.querySelector('.section.property');        // sección de cards
const $wantSelect       = document.querySelector('select[name="want-to"]');
const $typeSelect       = document.querySelector('select[name="property-type"]');
const $locationInput    = document.querySelector('input[name="location"]');
const $cards            = Array.from(document.querySelectorAll('.property-list .card'));

// Normaliza texto
function norm(str) {
  return (str || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Utilidades de dirección
const CITY_TAGS  = ['leon', 'leon de los aldama'];
const STATE_TAGS = ['gto', 'guanajuato'];

const MIN_QUERY_CHARS = 3;
const SHORT_TOKENS = new Set(['av', 'blvd', 'lib', 'col']);

function shouldUseLocation(q){
  const toks = norm(q).split(/[,\s]+/).filter(Boolean);
  return toks.some(t => t.length >= MIN_QUERY_CHARS || SHORT_TOKENS.has(t));
}
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

function matchesLocation(addrNorm, queryNorm){
  const tokens = queryNorm.split(/[,\s]+/).filter(Boolean);
  for (const t of tokens){
    if (t.length < MIN_QUERY_CHARS && !SHORT_TOKENS.has(t)) continue;
    let ok = false;
    for (const variant of expandToken(t)){
      const rx = new RegExp(`\\b${escapeRe(variant)}`);
      if (rx.test(addrNorm)){ ok = true; break; }
    }
    if (!ok) return false;
  }
  return true;
}

function operacionEsperada(want) {
  if (want === 'buy')  return 'comprar';
  if (want === 'rent') return 'rentar';
  return null;
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

    // 1) Limitar SIEMPRE a León, Gto
    if (visible) {
      const inLeon = CITY_TAGS.some(t => addr.includes(t))
                  && STATE_TAGS.some(t => addr.includes(t));
      if (!inLeon) visible = false;
    }

    // 2) Tipo
    if (visible && tipo !== 'any') visible = cTipo === tipo;

    // 3) Ubicación (si la query es suficiente)
    if (visible && shouldUseLocation(queryUbicacion)) {
      visible = matchesLocation(addr, queryUbicacion);
    }

    $card.style.display = visible ? '' : 'none';
  });
}

// Eventos de filtros
$wantSelect?.addEventListener('change', filtrarPropiedades);
$typeSelect?.addEventListener('change', filtrarPropiedades);
$locationInput?.addEventListener('input', filtrarPropiedades);

// Form de búsqueda
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
  const digits = (v || '').replace(/\D+/g, '');
  const trimmed = digits.startsWith('52') ? digits.slice(2) : digits;
  return trimmed;
}

publishForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const op    = publishForm['owner-operation']?.value || 'vender';
  const type  = publishForm['property-type']?.value || 'cualquiera';
  const name  = publishForm.name?.value?.trim() || '';
  const phone = normalizePhoneMx(publishForm.phone?.value);
  const time  = publishForm['contact-time']?.value || 'cualquier-hora';
  const zone  = publishForm.zone?.value?.trim() || '';
  const notes = publishForm.notes?.value?.trim() || '';
  const consent = document.getElementById('owner-consent')?.checked;

  if (!name) { alert('Por favor, escribe tu nombre.'); return; }
  if (!phone || phone.length < 10) { alert('Escribe un teléfono válido (10 dígitos).'); return; }
  if (!consent) { alert('Debes aceptar que te contactemos por teléfono o WhatsApp.'); return; }

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

  // Enviar correo (Apps Script)
  await sendEmailWebhook({
    _subject: `Lead propietario — ${op}/${type}`,
    _origin:  "Formulario: Publica tu propiedad",
    operation: op,
    type,
    name,
    phone,              // Apps Script antepone +52 al renderizar
    contact_time: time,
    zone,
    notes
  });

  // Reset suave
  publishForm.reset();
  if (publishForm['owner-operation']) publishForm['owner-operation'][0].checked = true;
  const ownerType = document.getElementById('owner-type');
  if (ownerType) ownerType.selectedIndex = 0;
  const ownerTime = document.getElementById('owner-time');
  if (ownerTime) ownerTime.value = 'cualquier-hora';
});

/* ==========================================================
   NAVBAR → atajos (Home) + Deep links
========================================================== */
(function setupNavbarShortcuts(){
  const isHome = !!(document.querySelector('.search-bar') || document.querySelector('.property-list'));
  if (!isHome) return;

  // Referencias
  const $wantSelect      = document.getElementById('want-to')       || document.querySelector('select[name="want-to"]');
  const $typeSelect      = document.getElementById('property-type') || document.querySelector('select[name="property-type"]');
  const $locationInput   = document.getElementById('location')      || document.querySelector('input[name="location"]');

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

  function resetToHomeDefault(clickedEl){
    if ($wantSelect)    $wantSelect.value = 'buy';
    if ($typeSelect)    $typeSelect.value = 'any';
    if ($locationInput) $locationInput.value = '';
    if ($propertySection) $propertySection.hidden = false;
    if ($sellFormSection) $sellFormSection.hidden = true;

    applyFilterIfExists();
    scrollToEl($hero || document.body);

    document.querySelectorAll('.navbar-link[data-nav], .navbar .navbar-link')
      .forEach(a => a.classList.remove('active'));
    clickedEl?.classList.add('active');
  }

  document.querySelectorAll('.navbar .navbar-link, .footer .footer-link').forEach(a => {
    a.addEventListener('click', (ev) => {
      // Si tiene href real (no #/ancla), no interceptar
      const href = a.getAttribute('href') || '';
      if (href && href !== '#' && !href.startsWith('#')) return;

      const key = (a.dataset.nav || a.textContent || '').toLowerCase();

      if (key.includes('rentar'))       { ev.preventDefault(); setWantAndGo('rent'); }
      else if (key.includes('comprar')) { ev.preventDefault(); setWantAndGo('buy');  }
      else if (key.includes('vender'))  { ev.preventDefault(); setWantAndGo('sell'); }
      else if (key.includes('nosotros') || href === '#nosotros'){ ev.preventDefault(); scrollToEl($featureTop || document.body); }
      else if (key.includes('inicio'))  { ev.preventDefault(); resetToHomeDefault(a); }

      if ($navbar?.classList.contains('active')) $navbar.classList.remove('active');
    });
  });

  // Deep links (#go=rent|buy|sell, #nosotros, #property) o ?go=
  function handleDeepLink() {
    const rawHash = (window.location.hash || '').replace(/^#/, '').trim();
    const qsGo = new URLSearchParams(window.location.search).get('go');

    let action = null;
    if (rawHash.startsWith('go=')) action = rawHash.split('=')[1];
    else if (qsGo) action = qsGo;

    if (action && ['buy','rent','sell'].includes(action)) {
      if ($wantSelect) { $wantSelect.value = action; applyFilterIfExists(); }
      const target = (action === 'sell') ? ($sellFormSection || $hero || document.body)
                                         : ($searchForm || $hero || $propertySection || document.body);
      scrollToEl(target);
      return;
    }

    if (rawHash === 'nosotros') {
      scrollToEl($featureTop || document.body);
    } else if (rawHash === 'property') {
      scrollToEl($propertySection || document.body);
    }
  }

  handleDeepLink();
  window.addEventListener('hashchange', handleDeepLink);
})();

/* ==========================================================
   NAVBAR/FOOTER → Botón "Contáctanos" (WhatsApp)
========================================================== */
(function setupNavbarContact(){
  const CONTACT_NUMBER = '5214793139842'; // 52 + LADA + número, solo dígitos
  const $btns = Array.from(document.querySelectorAll('#nav-contact, #footer-contact'));
  if (!$btns.length) return;

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

  console.log('[video] canPlayType mp4:', video.canPlayType('video/mp4'));

  video.addEventListener('error', () => {
    const err = video.error;
    console.error('[video] error', err && err.code, err);
    alert('No se pudo cargar el video. Revisa la ruta ./assets/video/video-card.mp4');
  });

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      card.classList.add('playing');
      video.controls = true;
      video.load();
      await video.play();
    } catch (err) {
      console.warn('[video] play() rechazado:', err);
      card.classList.remove('playing');
      video.controls = true;
      alert('El navegador bloqueó la reproducción automática. Intenta dar play en los controles.');
    }
  });

  video.addEventListener('pause', () => {
    if (!video.ended) {
      card.classList.remove('playing');
      video.controls = false;
    }
  });

  video.addEventListener('ended', () => {
    video.currentTime = 0;
    video.controls = false;
    card.classList.remove('playing');
  });
})();

/* ==========================================================
   EMAIL WEBHOOK (Google Apps Script)
========================================================== */
const EMAIL_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbz_aqPfufe-L9Tv3G57UbNO875xPcCrfUcmaBvz1kWsnnCFnBI4PwUcPkvMhqDE3_KhPw/exec";

// ¡OJO! tu secreto tiene "\" y debe escaparse con "\\" en JS:
const EMAIL_SECRET = "416SsVD>0@zMt-+lLw59S]aE";

/** Envía payload al Apps Script para que te llegue el correo */
async function sendEmailWebhook(payload){
  try {
    const body = JSON.stringify({ ...payload, secret: EMAIL_SECRET });

    // Preferir Beacon (no bloquea la navegación)
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
      navigator.sendBeacon(EMAIL_WEBHOOK_URL, blob);
      return;
    }

    // Fallback
    await fetch(EMAIL_WEBHOOK_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body
    });
  } catch (err) {
    console.warn("Webhook email falló:", err);
  }
}
