/* =========================================================
   MEDCIA — INTERAÇÕES DO SITE
   1. Navegação suave e indicação da seção atual
   2. Carrossel de médicos (setas + avanço automático)
   3. Carrossel de avaliações (setas + avanço automático)
   ========================================================= */

// Navegação suave para os links internos da página.
const sectionLinks = Array.from(document.querySelectorAll('.nav-dot'));
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const selector = link.getAttribute('href');
    if (!selector || selector === '#') return;
    const target = document.querySelector(selector);
    if (target) {
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Mantém a navegação lateral sincronizada com a posição da página.
const navSections = sectionLinks.map(link => ({link, section: document.querySelector(link.getAttribute('href'))})).filter(item => item.section);
let navTicking = false;
function updateActiveNavigation() {
  const triggerY = window.scrollY + window.innerHeight * .42;
  let current = navSections[0];
  for (const item of navSections) {
    if (item.section.offsetTop <= triggerY) current = item;
  }
  navSections.forEach(({link}) => {
    const isActive = link === current?.link;
    link.classList.toggle('is-active', isActive);
    if (isActive) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  navTicking = false;
}
window.addEventListener('scroll', () => {
  if (!navTicking) { navTicking = true; requestAnimationFrame(updateActiveNavigation); }
}, {passive: true});
window.addEventListener('resize', updateActiveNavigation, {passive: true});
updateActiveNavigation();

// Função auxiliar: pausa o avanço automático enquanto o mouse está sobre o carrossel.
function autoplay(elements, step, ms) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      window.matchMedia('(pointer: coarse)').matches) return;
  let paused = false;
  const timer = window.setInterval(() => {
    if (!paused && document.visibilityState === 'visible') step();
  }, ms);
  elements.forEach(el => {
    el?.addEventListener('mouseenter', () => { paused = true; });
    el?.addEventListener('mouseleave', () => { paused = false; });
    el?.addEventListener('focusin', () => { paused = true; });
    el?.addEventListener('focusout', () => { paused = false; });
  });
  return timer;
}

// Carrossel de médicos: troca um perfil a cada 8 segundos.
const doctorTrack = document.querySelector('.doctor-track');
const doctorSlides = Array.from(document.querySelectorAll('.doctor-slide'));
const doctorPrev = document.querySelector('.carousel-arrow.prev');
const doctorNext = document.querySelector('.carousel-arrow.next');
const doctorStatus = document.querySelector('.carousel-status');
let doctorIndex = 0;
function showDoctor(index) {
  if (!doctorTrack || !doctorSlides.length) return;
  doctorIndex = (index + doctorSlides.length) % doctorSlides.length;
  doctorTrack.style.transform = `translateX(-${doctorIndex * 100}%)`;
  if (doctorStatus) doctorStatus.textContent = `Médico ${doctorIndex + 1} de ${doctorSlides.length}`;
  doctorSlides.forEach((slide, i) => slide.setAttribute('aria-hidden', String(i !== doctorIndex)));
}
doctorPrev?.addEventListener('click', () => showDoctor(doctorIndex - 1));
doctorNext?.addEventListener('click', () => showDoctor(doctorIndex + 1));
showDoctor(0);
autoplay([doctorPrev, doctorNext, doctorTrack], () => showDoctor(doctorIndex + 1), 8000);

// Carrossel de avaliações: mostra 3 cartões (2 em tablet, 1 no celular) e avança um por vez.
const reviewTrack = document.querySelector('#reviewTrack');
const reviewCards = Array.from(document.querySelectorAll('.review-card'));
const reviewPrev = document.querySelector('.review-prev');
const reviewNext = document.querySelector('.review-next');
const reviewStatus = document.querySelector('.review-status');
let reviewIndex = 0;
function showReviews(index) {
  if (!reviewTrack || !reviewCards.length) return;
  const gap = parseFloat(getComputedStyle(reviewTrack).gap) || 0;
  const cardWidth = reviewCards[0].getBoundingClientRect().width;
  const step = cardWidth + gap;
  const visible = Math.max(1, Math.round((reviewTrack.parentElement.clientWidth + gap) / step));
  const lastIndex = Math.max(0, reviewCards.length - visible);
  reviewIndex = index > lastIndex ? 0 : index < 0 ? lastIndex : index;
  reviewTrack.style.transform = `translateX(-${reviewIndex * step}px)`;
  if (reviewStatus) {
    const total = reviewCards.length;
    reviewStatus.textContent = visible === 1
      ? `Avaliação ${reviewIndex + 1} de ${total}`
      : `Avaliações ${reviewIndex + 1}–${reviewIndex + visible} de ${total}`;
  }
}
reviewPrev?.addEventListener('click', () => showReviews(reviewIndex - 1));
reviewNext?.addEventListener('click', () => showReviews(reviewIndex + 1));
showReviews(0);
autoplay([reviewPrev, reviewNext, reviewTrack], () => showReviews(reviewIndex + 1), 8000);
window.addEventListener('resize', () => showReviews(reviewIndex));


/* ===================== EXPERIÊNCIA MOBILE ===================== */
// Permite trocar os profissionais e avaliações com o dedo no celular.
function swipeCarousel(viewport, prev, next) {
  if (!viewport) return;
  let startX = null, startY = null;
  viewport.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) return;
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
  }, {passive: true});
  viewport.addEventListener('touchend', event => {
    if (startX === null || !event.changedTouches.length) return;
    const diffX = event.changedTouches[0].clientX - startX;
    const diffY = event.changedTouches[0].clientY - startY;
    if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.25) {
      (diffX < 0 ? next : prev)?.click();
    }
    startX = startY = null;
  }, {passive: true});
}
swipeCarousel(document.querySelector('.doctor-viewport'), doctorPrev, doctorNext);
swipeCarousel(document.querySelector('.review-viewport'), reviewPrev, reviewNext);

// O conteúdo integral de cada especialidade abre em uma janela acessível.
(() => {
  const overlay = document.querySelector('#specialty-modal');
  if (!overlay) return;
  const dialog = overlay.querySelector('[role="dialog"]');
  const closeButton = overlay.querySelector('.specialty-modal-close');
  const backButton = overlay.querySelector('.specialty-modal-ok');
  const titleEl = overlay.querySelector('#specialty-modal-title');
  const copyEl = overlay.querySelector('#specialty-modal-copy');
  const ctaEl = overlay.querySelector('.specialty-modal-cta');
  let returnFocus = null;
  let previousOverflow = '';

  function closeModal() {
    if (overlay.hidden) return;
    overlay.classList.remove('is-visible');
    overlay.hidden = true;
    document.body.classList.remove('modal-open');
    document.body.style.overflow = previousOverflow;
    returnFocus?.focus({preventScroll: true});
  }
  function openModal(card, button) {
    const title = card.querySelector('h3')?.textContent.trim() || 'Especialidade';
    const detail = card.querySelector('.spec-description');
    const extra = card.querySelector('small');
    titleEl.textContent = title;
    copyEl.replaceChildren();
    if (detail) {
      const p = document.createElement('p');
      p.innerHTML = detail.innerHTML;
      copyEl.append(p);
    }
    if (extra?.textContent.trim()) {
      const p = document.createElement('p');
      p.className = 'specialty-modal-extra';
      p.textContent = extra.textContent.trim().replace(/\s*•\s*/g, ' • ').trim();
      copyEl.append(p);
    }
    ctaEl.href = 'https://wa.me/554132059056?text=' + encodeURIComponent(
      'Olá, conheci a MedCia pelo site e gostaria de informações sobre ' + title + '.');
    returnFocus = button;
    previousOverflow = document.body.style.overflow;
    overlay.hidden = false;
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => overlay.classList.add('is-visible'));
    closeButton.focus({preventScroll: true});
  }

  document.querySelectorAll('.spec-more').forEach(button => {
    button.addEventListener('click', () => {
      const card = button.closest('.spec-card');
      if (card) openModal(card, button);
    });
  });
  closeButton.addEventListener('click', closeModal);
  backButton.addEventListener('click', closeModal);
  overlay.querySelector('.specialty-modal-backdrop').addEventListener('click', closeModal);
  document.addEventListener('keydown', event => {
    if (overlay.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); closeModal(); return; }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(dialog.querySelectorAll('button:not([disabled]), a[href]'));
    if (!focusable.length) {event.preventDefault(); dialog.focus(); return;}
    if (event.shiftKey && document.activeElement === focusable[0]) {
      event.preventDefault(); focusable.at(-1).focus();
    } else if (!event.shiftKey && document.activeElement === focusable.at(-1)) {
      event.preventDefault(); focusable[0].focus();
    }
  });
})();
