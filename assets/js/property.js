// assets/js/property.js
'use strict';

// === Ajusta estas 2 constantes si cambias rutas o número de WhatsApp ===
const DATA_URL = './data/properties.json'; // tu JSON (arreglo plano)
const WHATSAPP_NUMBER = '5214793139842';   // solo dígitos, con 52

// Helpers
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const cap = (s = '') => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const fmtMoney = (n, currency = 'MXN') =>
  typeof n === 'number'
    ? new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0
      }).format(n)
    : '';

const params = new URLSearchParams(window.location.search);
const idParam = params.get('id');

document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    if (!idParam) return renderNotFound('Falta el parámetro ?id en la URL.');

    const res = await fetch(DATA_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`No pude leer ${DATA_URL}: ${res.status}`);

    const list = await res.json();
    const p = Array.isArray(list)
      ? list.find((x) => String(x.id) === String(idParam))
      : null;

    if (!p) return renderNotFound('No encontramos esa propiedad.');

    renderProperty(p);
  } catch (err) {
    console.error(err);
    renderNotFound('Hubo un problema al cargar la propiedad.');
  }
}

function renderNotFound(msg) {
  $('#prop-title').textContent = 'Propiedad no disponible';
  $('#prop-address').textContent = msg || '—';
  $('#prop-availability').textContent = '—';
  $('#prop-price').textContent = '—';
  $('#prop-op').textContent = '—';
  $('#prop-type').textContent = '—';
  $('#prop-beds').textContent = '—';
  $('#prop-baths').textContent = '—';
  $('#prop-size').textContent = '—';
  $('#prop-thumbs') && ($('#prop-thumbs').innerHTML = '');
  $('#prop-features').innerHTML = '';
  $('#prop-description').textContent = '';
}

function renderProperty(p) {
  // Imagen principal (hero)
  const hero = (p.images && p.images[0]) || './assets/images/property-1.jpg';
  const $hero = $('#prop-hero');
  if ($hero) {
    $hero.src = hero;
    $hero.alt = p.title || 'Imagen de la propiedad';
  }

  // Título, dirección, disponibilidad
  $('#prop-title').textContent = p.title || 'Propiedad';
  $('#prop-address').textContent = p.address || '';
  $('#prop-availability').textContent = p.status || 'Disponible';

  // Precio (price o price_from)
  const priceText =
    typeof p.price === 'number'
      ? fmtMoney(p.price, p.currency || 'MXN')
      : typeof p.price_from === 'number'
      ? `Desde ${fmtMoney(p.price_from, p.currency || 'MXN')}`
      : '';
  $('#prop-price').textContent = priceText;

  // Badges operación / tipo
  const opText = p.operation === 'rentar' ? 'Renta' : 'Venta';
  $('#prop-op').textContent = opText;
  $('#prop-type').textContent = cap(p.type || '');

  // Meta
  $('#prop-beds').textContent = `${p.bedrooms ?? 0} rec`;
  $('#prop-baths').textContent = `${p.bathrooms ?? 0} baños`;
  $('#prop-size').textContent = `${p.area_m2 ?? p.built_m2 ?? 0} m²`;

  // Amenidades / features (píldoras)
  const feats = Array.isArray(p.features) ? p.features : [];
  $('#prop-features').innerHTML = feats.map((f) => `<span class="pill">${f}</span>`).join('');

  // Descripción
  $('#prop-description').textContent =
    p.description_long || p.description || p.excerpt || '';

  // WhatsApp CTA
  const msg = encodeURIComponent(`Hola, me interesa "${p.title}".`);
  const wa = WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}` : '#';
  const $wa = $('#prop-whats');
  if ($wa) $wa.href = wa;

  // ======================
  // Carrusel + Lightbox
  // ======================
  setupGallery(p);

  // ======================
  // Mapa
  // ======================
  setupMap(p);

  // Igualar altura mapa = panel izquierdo (desktop)
  equalizeMapHeight();
  setupVisitForm(p);

}
/* ------------- Formulario de visita (debajo del detalle) ------------- */
function setupVisitForm(p){
  const $section   = document.getElementById('visit-form');
  const $titleSpan = document.getElementById('visit-prop-title');
  const $btnCTA    = document.getElementById('prop-cta');

  if (!$section || !$btnCTA) return;

  // Pone el nombre de la propiedad en el título del formulario
  if ($titleSpan) $titleSpan.textContent = p.title || 'esta propiedad';

  // Abre y hace scroll al formulario cuando se pulsa el CTA
  $btnCTA.addEventListener('click', (e) => {
    // si tu CTA apunta a #contacto, evitamos que cambie la URL
    e.preventDefault();
    $section.hidden = false;
    $section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // sugerencia de foco
    const $name = document.getElementById('visit-name');
    setTimeout(() => $name?.focus(), 300);
  });

  // Cancelar = ocultar
  document.getElementById('visit-cancel')?.addEventListener('click', () => {
    $section.hidden = true;
  });

  // Envío (demo + preview)
  const $form = document.getElementById('visitForm');
  const $preview = document.getElementById('visit-preview');

  $form?.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const data = {
      property_id: p.id,
      property_title: p.title,
      name:  document.getElementById('visit-name')?.value.trim(),
      phone: document.getElementById('visit-phone')?.value.trim(),
      contact_time: document.getElementById('visit-time')?.value,
      notes: document.getElementById('visit-notes')?.value.trim(),
      consent: document.getElementById('visit-consent')?.checked === true
    };

    // Aquí harías tu fetch() al backend o enviarías a tu WhatsApp/CRM.
    // Por ahora, mostramos una previsualización de prueba:
    if ($preview){
      $preview.hidden = false;
      $preview.textContent = JSON.stringify(data, null, 2);
    }

    // Feedback simple
    alert('¡Gracias! Te contactaremos para confirmar tu visita.');
    $form.reset();
  });
}


/* ---------- Galería / Carrusel + Lightbox ---------- */
function setupGallery(p) {
  const $carousel = document.getElementById('prop-carousel');
  const $track    = document.getElementById('prop-carousel-track');
  if (!$carousel || !$track) return;

  // Arma las 5 rutas: ./assets/images/property-<id>-carrusel-1..5.jpg
  const slides = [];
  for (let i = 1; i <= 5; i++) {
    slides.push(`./assets/images/property-${p.id}-carrusel-${i}.jpg`);
  }

  // Pinta miniaturas con su índice
  $track.innerHTML = slides.map((src, i) => `
    <figure class="carousel-item">
      <img src="${src}" alt="Foto de ${p.title}" data-index="${i}" />
    </figure>
  `).join('');

  const itemImgs = Array.from($track.querySelectorAll('.carousel-item img'));
  let currentIndex = 0;

  // Navegación del carrusel (scroll suave)
  const $btnPrev = $carousel.querySelector('.carousel-btn.prev');
  const $btnNext = $carousel.querySelector('.carousel-btn.next');

  function snapTo(i){
    if (!itemImgs.length) return;
    currentIndex = Math.max(0, Math.min(i, itemImgs.length - 1));
    itemImgs[currentIndex].scrollIntoView({ behavior:'smooth', inline:'center', block:'nearest' });
  }
  $btnPrev?.addEventListener('click', () => snapTo(currentIndex - 1));
  $btnNext?.addEventListener('click', () => snapTo(currentIndex + 1));

  // ===== Lightbox =====
  const $lightbox   = document.getElementById('lightbox');
  const $lbImg      = document.getElementById('lightbox-image');
  const $lbClose    = document.getElementById('lightbox-close');
  const $lbPrev     = document.getElementById('lightbox-prev');
  const $lbNext     = document.getElementById('lightbox-next');
  const $lbBackdrop = document.getElementById('lightbox-backdrop');

  function openLightbox(i){
    currentIndex = i;
    $lbImg.src = itemImgs[currentIndex].src;
    $lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox(){
    $lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  function showPrev(){
    currentIndex = (currentIndex - 1 + itemImgs.length) % itemImgs.length;
    $lbImg.src = itemImgs[currentIndex].src;
  }
  function showNext(){
    currentIndex = (currentIndex + 1) % itemImgs.length;
    $lbImg.src = itemImgs[currentIndex].src;
  }

  // Click en miniatura abre lightbox
  itemImgs.forEach(img => {
    img.addEventListener('click', () => openLightbox(Number(img.dataset.index)));
  });

  // Controles lightbox
  $lbClose?.addEventListener('click', closeLightbox);
  $lbBackdrop?.addEventListener('click', closeLightbox);
  $lbPrev?.addEventListener('click', showPrev);
  $lbNext?.addEventListener('click', showNext);

  // Teclado
  document.addEventListener('keydown', (e) => {
    if ($lightbox.getAttribute('aria-hidden') === 'true') return;
    if (e.key === 'Escape')      closeLightbox();
    if (e.key === 'ArrowLeft')   showPrev();
    if (e.key === 'ArrowRight')  showNext();
  });

  // Centra la primera miniatura
  snapTo(0);
}



/* ------------------------ Mapa ------------------------ */
function setupMap(p) {
  const $map = $('#prop-map');
  if (!$map) return;

  let mapQuery = '';
  if (typeof p.lat === 'number' && typeof p.lng === 'number') {
    mapQuery = `${p.lat},${p.lng}`;
  } else if (p.map_query) {
    mapQuery = p.map_query;
  } else {
    mapQuery = p.address || '';
  }

  const q = encodeURIComponent(mapQuery);
  const zoom = 15;
  const iframeSrc = `https://www.google.com/maps?q=${q}&z=${zoom}&output=embed`;

  $map.innerHTML = `
    <iframe
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade"
      src="${iframeSrc}"
      allowfullscreen
    ></iframe>
    <div style="padding:12px">
      <a class="btn btn-outline label-medium" href="https://www.google.com/maps?q=${q}" target="_blank" rel="noopener">
        Abrir en Google Maps
      </a>
    </div>
  `;
}

/* ----- Igualar la altura del mapa al panel izquierdo (desktop) ----- */
function equalizeMapHeight() {
  const leftPanel = document.querySelector('.property-detail .panel:not(.map-panel)');
  const mapPanel = document.querySelector('.map-panel');
  const mapBox = document.getElementById('prop-map');

  if (!leftPanel || !mapPanel || !mapBox) return;

  function sync() {
    const desktop = window.matchMedia('(min-width: 992px)').matches;

    if (desktop) {
      const h = leftPanel.getBoundingClientRect().height;
      mapPanel.style.height = h + 'px';
      mapBox.style.height = '100%';
    } else {
      mapPanel.style.height = '';
      mapBox.style.height = '';
    }
  }

  const ro = new ResizeObserver(sync);
  ro.observe(leftPanel);

  window.addEventListener('load', sync);
  window.addEventListener('resize', sync);
  sync();
}



const visitForm = document.getElementById('visitForm');
const visitPreview = document.getElementById('visit-preview');

function normalizePhoneMxPlain(v){
  return (v || '').replace(/\D+/g, '').replace(/^52/, ''); // 10 dígitos MX
}

visitForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name  = visitForm.name?.value?.trim() || '';
  const phone = normalizePhoneMxPlain(visitForm.phone?.value);
  const time  = visitForm['contact-time']?.value || 'cualquier-hora';
  const notes = visitForm.notes?.value?.trim() || '';
  const consent = document.getElementById('visit-consent')?.checked;
  const propTitle = document.getElementById('visit-prop-title')?.textContent?.trim() || 'Propiedad';

  if (!name) { alert('Por favor, escribe tu nombre.'); return; }
  if (!phone || phone.length < 10) { alert('Teléfono inválido.'); return; }
  if (!consent) { alert('Debes aceptar el contacto.'); return; }

  // (Tu vista previa si la usas...)
  if (visitPreview) {
    visitPreview.textContent = JSON.stringify({
      property_title: propTitle, name, phone, contact_time: time, notes
    }, null, 2);
    visitPreview.hidden = false;
  }

  // === Enviar correo (Apps Script)
  await sendEmailWebhook({
    _subject: `Visita — ${propTitle}`,
    _origin:  "Formulario: Agenda una visita",
    property_title: propTitle,
    name,
    phone,
    contact_time: time,
    notes
  });

  // Reset suave
  visitForm.reset();
});
