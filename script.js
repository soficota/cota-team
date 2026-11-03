/* C.O.T.A. — Script con soporte completo para imágenes */
(() => {
  'use strict';
  const STORAGE = { theme: 'cota_theme_v1' };
  let data;
  let selectedKingdom = 'all';
  let selectedRule = 'general';
  let toastTimer;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const safe = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isPending = v => v === 'PENDIENTE' || v === '' || v == null;
  const kingdomById = id => data?.kingdoms?.find(k => k.id === id);
  const kingdomColor = id => data?.palette?.kingdoms?.[id] || data?.palette?.kingdoms?.elyndra;
  const kingdomGlyph = id => ({hadalith:'≈',avalon:'❧',emberia:'♨',bryrius:'⌁',elyndra:'✧'}[id] || '✦');
  
  const showToast = msg => {
    const node = $('#toast');
    if (!node) return;
    node.textContent = msg;
    node.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('show'), 2400);
  };
  const pendingBlock = text => `<div class="pending-box"><b>CONTENIDO PENDIENTE</b>${safe(text || 'El staff completará este apartado más adelante.')}</div>`;
  const emptyState = text => `<div class="empty-inline">${safe(text)}</div>`;

  async function init() {
    try {
      const response = await fetch('./cota.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      data = await response.json();
    } catch (error) {
      document.body.innerHTML = `<main style="max-width:760px;margin:10vh auto;padding:24px;font-family:Arial"><h1>No se pudo cargar cota.json</h1><p>Comprueba que <b>cota.json</b> esté junto a index.html y abre el sitio mediante un servidor local o GitHub Pages.</p><p>Detalle: ${safe(error.message)}</p></main>`;
      return;
    }
    applyTheme(localStorage.getItem(STORAGE.theme) || 'light');
    renderAll();
    bindAllEvents();
    
    const desc = $('#identityDescription');
    if (desc) desc.textContent = data.identity.description || 'Un mundo dividido por antiguas marcas, unido por historias que todavía esperan ser contadas.';
  }

  function renderAll() {
    document.title = `${data.identity.name} — Crónicas de los Cinco Reinos`;
    renderHome();
    renderHistory();
    renderKingdoms();
    renderRaces();
    renderRoles();
    renderGroups();
    renderRules();
    renderActivities();
    renderRewards();
    renderFaq();
  }

  function renderHome() {
    const statsEl = $('#homeStats');
    if (statsEl) {
      const totals = [
        [data.kingdoms.length, 'Reinos por descubrir'],
        [data.races.length, 'Pueblos y linajes'],
        [data.roles.general.length, 'Oficios generales'],
        [data.groups.length, 'Espacios del team']
      ];
      statsEl.innerHTML = totals.map(([n, label]) => `<div class="stat-item"><span class="stat-number">${n}</span><span class="stat-label">${safe(label)}</span></div>`).join('');
    }

    const kingdomsEl = $('#homeKingdoms');
    if (kingdomsEl) {
      kingdomsEl.innerHTML = data.kingdoms.map(k => {
        const c = kingdomColor(k.id);
        const bgImg = k.visuals?.hero?.url ? `background-image: url('${k.visuals.hero.url}'); background-size: cover; background-position: center; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.8);` : '';
        const fallbackBg = `background-color: ${c.light}; color: ${c.deep};`;
        
        return `<article class="kingdom-card" data-open-kingdom="${safe(k.id)}" style="--kingdom-accent:${c.accent}; ${k.visuals?.hero?.url ? bgImg : fallbackBg}">
          ${!k.visuals?.hero?.url ? `<div class="kingdom-symbol">${kingdomGlyph(k.id)}</div>` : ''}
          <div class="kingdom-card-copy">
            <strong>${safe(k.name)}</strong>
            <small style="${k.visuals?.hero?.url ? 'color:#fff;' : ''}">${safe(k.mark)}</small>
          </div>
          <span class="card-arrow">↗</span>
        </article>`;
      }).join('');
    }
  }

  function renderHistory() {
    const mythEl = $('#creationMyth');
    if (mythEl) {
      mythEl.innerHTML = isPending(data.lore.creationMyth)
        ? pendingBlock('El mito de creación está reservado para que el staff incorpore la versión definitiva del lore.')
        : `<p>${safe(data.lore.creationMyth)}</p>`;
    }

    const timelineEl = $('#timelineList');
    if (timelineEl) {
      timelineEl.innerHTML = (data.lore.timeline || []).map(item => `
        <div class="timeline-item">
          <span class="year">${safe(item.year)}</span>
          <h3>${safe(item.title)}</h3>
          ${isPending(item.description) ? pendingBlock('Descripción pendiente.') : `<p>${safe(item.description)}</p>`}
        </div>
      `).join('') || emptyState('Todavía no hay eventos en la línea temporal.');
    }
  }

  function renderKingdoms() {
    const filter = $('#kingdomFilter');
    const grid = $('#kingdomGrid');
    if (!filter || !grid) return;

    filter.innerHTML = `<button class="filter-chip ${selectedKingdom === 'all' ? 'active' : ''}" data-kingdom="all">Todos</button>` +
      data.kingdoms.map(k => `<button class="filter-chip ${selectedKingdom === k.id ? 'active' : ''}" data-kingdom="${safe(k.id)}">${safe(k.name)}</button>`).join('');

    const items = selectedKingdom === 'all' ? data.kingdoms : data.kingdoms.filter(k => k.id === selectedKingdom);
    grid.innerHTML = items.map(k => {
      const c = kingdomColor(k.id);
      const bgImg = k.visuals?.hero?.url ? `background-image: url('${k.visuals.hero.url}'); background-size: cover; background-position: center;` : '';
      const fallbackBg = `background: linear-gradient(145deg,${c.light},${c.base});`;
      
      return `<article class="kingdom-detail-card" data-open-kingdom="${safe(k.id)}">
        <div class="kingdom-cover" style="${bgImg || fallbackBg}">
          ${!k.visuals?.hero?.url ? `<span>${kingdomGlyph(k.id)}</span>` : ''}
        </div>
        <div class="kingdom-info">
          <span class="eyebrow">${safe(k.element)} · ${safe(k.mark)}</span>
          <strong>${safe(k.name)}</strong>
          <p class="kingdom-tagline">${safe(k.tagline)}</p>
          <div class="kingdom-meta"><span>${safe(k.guardian)}</span><span>${safe(k.monarchTitle || 'Sin título')}</span></div>
        </div>
      </article>`;
    }).join('');
  }

  function openKingdom(id) {
    const k = kingdomById(id); if (!k) return;
    const c = kingdomColor(id);
    const modalContent = $('#kingdomModalContent');
    const modal = $('#kingdomModal');
    if (!modalContent || !modal) return;

    const heroImg = k.visuals?.hero?.url 
      ? `<img src="${k.visuals.hero.url}" style="width:100%; height:250px; object-fit:cover; border-radius:16px; margin-bottom:20px;">` 
      : '';

    const illustration = k.visuals?.illustration?.url
      ? `<h3>Ilustración</h3><img src="${k.visuals.illustration.url}" style="width:100%; border-radius:16px; margin-bottom:15px;">`
      : '';

    const gallery = (k.visuals?.gallery || []).length > 0 
      ? `<h3>Galería</h3><div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; margin-bottom:15px;">
          ${k.visuals.gallery.map(img => img.url ? `<img src="${img.url}" style="width:100%; height:120px; object-fit:cover; border-radius:12px;">` : '').join('')}
         </div>`
      : '';

    const secrets = (k.secrets || []).filter(s => !isPending(s)).length
      ? `<ul>${k.secrets.map(s => `<li>${isPending(s) ? 'Pendiente de completar' : safe(s)}</li>`).join('')}</ul>`
      : '<p class="muted">No hay secretos registrados.</p>';

    modalContent.innerHTML = `
      ${heroImg}
      <div class="kingdom-modal-head" style="--kingdom-light:${c.light};--kingdom-deep:${c.deep}">
        <span class="eyebrow">${safe(k.element)} · ${safe(k.mark)}</span>
        <h2 id="kingdomModalTitle">${safe(k.name)}</h2>
        <p>${safe(k.tagline)}</p>
      </div>
      <div class="panel-kicker">DATOS DEL REINO</div>
      <p><b>Guardianes:</b> ${safe(k.guardian)}</p>
      <p><b>Gobierno:</b> ${safe(k.monarchTitle || 'Sin especificar')}</p>
      <p><b>Territorio:</b> ${safe(k.territory)}</p>
      <h3>Descripción</h3>
      ${isPending(k.description) ? pendingBlock('La descripción del reino está pendiente de completar.') : `<p>${safe(k.description)}</p>`}
      <h3>Historia del reino</h3>
      ${isPending(k.lore) ? pendingBlock('El lore específico de este reino está pendiente.') : `<p>${safe(k.lore)}</p>`}
      <h3>Secretos y particularidades</h3>
      ${secrets}
      ${illustration}
      ${gallery}
    `;
    modal.hidden = false;
  }

  function renderRaces() {
    const el = $('#racesGrid');
    if (!el) return;
    el.innerHTML = data.races.map(r => `
      <article class="race-card">
        <span class="eyebrow">${safe(kingdomById(r.kingdom)?.name || '')} · ${safe(r.element)}</span>
        <h3>${safe(r.name)}</h3>
        ${isPending(r.description) ? pendingBlock('La descripción de esta raza se completará después.') : `<p>${safe(r.description)}</p>`}
        <p class="race-blessing"><b>Bendición:</b> ${safe(r.blessing)}</p>
        <div class="tag-list">${r.traits.map(t => `<span class="tag">${safe(t)}</span>`).join('')}</div>
      </article>
    `).join('');
  }

  function roleGlyph(icon) {
    const map = { wheat:'✣', flask:'⚗', herb:'✚', book:'▤', letter:'✉', scale:'⚖', eye:'◎', compass:'⌖', hammer:'⚒', anvil:'◇', saw:'⌁', scissors:'✂', bread:'◒', cleaver:'⌑', bow:'⌒', chisel:'◆', mask:'◉', palette:'◈', chalkboard:'▧', bell:'♧', dagger:'†', dash:'—', sword:'⚔', 'wave-note':'♫', trident:'♆', leaf:'❧', flower:'❀', flame:'♨', wing:'⌁', shield:'⬡', star:'✧', feather:'❋' };
    return map[icon] || '✦';
  }

  function renderRoles() {
    const sel = $('#roleKingdomFilter');
    if (sel) {
      sel.innerHTML = '<option value="all">Todos los reinos</option>' + data.kingdoms.map(k => `<option value="${safe(k.id)}">${safe(k.name)}</option>`).join('');
    }
    drawRoles('all');
  }

  function drawRoles(kingdom = 'all') {
    const el = $('#rolesContent');
    if (!el) return;

    const general = data.roles.general.filter(r => !r.restricted || kingdom === 'all' || r.restricted.includes(kingdom));
    let html = `<h3 class="role-section-title">Oficios generales</h3>
      <div class="role-grid">${general.map(r => `<div class="role-card"><span class="role-icon">${roleGlyph(r.icon)}</span><span>${safe(r.name)}</span>${r.restricted ? `<small class="restricted-note">Bryrius · Elyndra</small>` : ''}</div>`).join('')}</div>`;

    const specific = kingdom === 'all' ? Object.entries(data.roles.kingdomSpecific) : [[kingdom, data.roles.kingdomSpecific[kingdom] || []]];
    html += specific.filter(([, arr]) => arr.length).map(([id, arr]) => `
      <h3 class="role-section-title">Oficios de ${safe(kingdomById(id)?.name || id)}</h3>
      <div class="role-grid">${arr.map(r => `<div class="role-card"><span class="role-icon">${roleGlyph(r.icon)}</span><span>${safe(r.name)}</span></div>`).join('')}</div>
    `).join('');

    html += `<h3 class="role-section-title">Títulos adicionales</h3>
      <div class="role-grid">${data.roles.titles.map(r => `<div class="role-card"><span class="role-icon">♕</span><span>${safe(r.name)}<small style="display:block;color:var(--muted)">${safe(r.grantedBy)}</small></span></div>`).join('')}</div>`;

    el.innerHTML = html;
  }

  function renderGroups() {
    const el = $('#groupsContent');
    if (!el) return;
    el.innerHTML = data.groups.map(g => `
      <article class="group-card">
        <span class="group-kind">${safe(g.type)}</span>
        <h3>${safe(g.name)}</h3>
        <p>${safe(g.description)}</p>
      </article>
    `).join('');
  }

  function renderRules() { drawRules(selectedRule); }

  function drawRules(type) {
    const el = $('#rulesContent');
    if (!el) return;
    const list = data.rules[type] || [];
    el.innerHTML = list.map(r => `
      <article class="rule-item">
        <div class="rule-mark">✦</div>
        <div>
          <h3>${safe(r.title)}</h3>
          ${isPending(r.description) ? pendingBlock('El staff añadirá aquí la explicación de esta norma.') : `<p>${safe(r.description)}</p>`}
        </div>
      </article>
    `).join('');
  }

  function renderActivities() {
    const el = $('#activitiesContent');
    if (!el) return;
    el.innerHTML = data.activities.map(a => `
      <article class="activity-card">
        <span class="eyebrow">ACTIVIDAD</span>
        <h3>${safe(a.name)}</h3>
        ${isPending(a.description) ? pendingBlock('Descripción pendiente de completar.') : `<p>${safe(a.description)}</p>`}
        <span class="points">${safe(a.points)} puntos</span>
      </article>
    `).join('');
  }

  function renderRewards() {
    const el = $('#rewardsContent');
    if (!el) return;
    el.innerHTML = data.rewards.map(r => `
      <article class="reward-card">
        <span class="eyebrow">RECOMPENSA</span>
        <h3>${safe(r.name)}</h3>
        ${isPending(r.description) ? pendingBlock('Condiciones pendientes de completar.') : `<p>${safe(r.description)}</p>`}
        <span class="points">Duración: ${safe(r.duration)}</span>
      </article>
    `).join('');
  }

  function renderFaq() {
    const el = $('#faqContent');
    if (!el) return;
    el.innerHTML = data.faq.map((f, i) => `
      <article class="faq-item">
        <button class="faq-question" aria-expanded="false" data-faq="${i}">${safe(f.question)}<span>＋</span></button>
        <div class="faq-answer" hidden>${isPending(f.answer) ? pendingBlock('Respuesta pendiente de completar.') : safe(f.answer)}</div>
      </article>
    `).join('');
  }

  function bindAllEvents() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-section]');
      if (btn) {
        const section = btn.dataset.section;
        if ($('#view-' + section)) {
          showSection(section);
          const mob = $('#mobileNav');
          if (mob) mob.classList.remove('open');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
      }

      const filterBtn = e.target.closest('[data-kingdom]');
      if (filterBtn) {
        selectedKingdom = filterBtn.dataset.kingdom;
        renderKingdoms();
        return;
      }
      
      const openBtn = e.target.closest('[data-open-kingdom]');
      if (openBtn) {
        if (openBtn.closest('#homeKingdoms')) showSection('reinos');
        openKingdom(openBtn.dataset.openKingdom);
      }
    });
    
    const mobBtn = $('#mobileMenuButton');
    const mobNav = $('#mobileNav');
    if (mobBtn && mobNav) mobBtn.addEventListener('click', () => mobNav.classList.toggle('open'));

    const tabs = $('#communityTabs');
    if (tabs) {
      tabs.addEventListener('click', e => {
        const b = e.target.closest('[data-community]');
        if (!b) return;
        $$('#communityTabs .tab-button').forEach(x => x.classList.toggle('active', x === b));
        $$('.community-panel').forEach(p => p.classList.toggle('active', p.id === 'community-' + b.dataset.community));
      });
    }

    const modal = $('#kingdomModal');
    if (modal) {
      modal.addEventListener('click', e => {
        if (e.target === e.currentTarget || e.target.closest('[data-close-modal]')) e.currentTarget.hidden = true;
      });
    }

    const roleSel = $('#roleKingdomFilter');
    if (roleSel) roleSel.addEventListener('change', e => drawRoles(e.target.value));

    const rulesTab = $('#community-rules');
    if (rulesTab) {
      rulesTab.addEventListener('click', e => {
        const b = e.target.closest('[data-rule]');
        if (!b) return;
        selectedRule = b.dataset.rule;
        $$('[data-rule]').forEach(x => x.classList.toggle('active', x === b));
        drawRules(selectedRule);
      });
    }

    const faqEl = $('#faqContent');
    if (faqEl) {
      faqEl.addEventListener('click', e => {
        const b = e.target.closest('[data-faq]');
        if (!b) return;
        const answer = b.nextElementSibling;
        const isHidden = answer.hidden;
        answer.hidden = !isHidden;
        b.setAttribute('aria-expanded', String(isHidden));
        b.querySelector('span').textContent = isHidden ? '−' : '＋';
      });
    }

    const themeBtn = $('#themeToggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const next = document.body.classList.contains('dark') ? 'light' : 'dark';
        applyTheme(next);
        localStorage.setItem(STORAGE.theme, next);
      });
    }

    const presBtn = $('#presentationButton');
    if (presBtn) presBtn.addEventListener('click', togglePresentation);
    
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        togglePresentation();
      }
      if (e.key === 'Escape' && document.body.classList.contains('presentation-active')) {
        togglePresentation();
      }
    });
  }

  function showSection(name) {
    $$('.view').forEach(v => v.classList.toggle('active', v.dataset.view === name));
    $$('.nav-link').forEach(n => n.classList.toggle('active', n.dataset.section === name));
  }

  function applyTheme(theme) {
    document.body.classList.toggle('dark', theme === 'dark');
  }

  function togglePresentation() {
    const active = document.body.classList.toggle('presentation-active');
    if (active) {
      showToast('Modo presentación activo · Esc para salir');
      if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    } else {
      showToast('Modo presentación desactivado');
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    }
  }

  init();
})();
