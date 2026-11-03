/* C.O.T.A. — Sitio estático */
(() => {
  'use strict';

  const STORAGE_KEY = 'cota_theme_v2';

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  let data = null;
  let selectedKingdom = 'all';
  let selectedRule = 'general';
  let toastTimer = null;
  let lastFocusedElement = null;

  const escapeHTML = value =>
    String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);

  const isPending = value =>
    value === 'PENDIENTE' || value === '' || value == null;

  const emptyState = message =>
    `<div class="empty-inline">${escapeHTML(message)}</div>`;

  const kingdomById = id =>
    data.kingdoms.find(kingdom => kingdom.id === id);

  const kingdomColor = id =>
    data.palette?.kingdoms?.[id] ||
    data.palette?.kingdoms?.elyndra || {};

  const kingdomGlyph = id => ({
    hadalith: '≈',
    avalon: '❧',
    emberia: '♨',
    bryrius: '⌁',
    elyndra: '✧'
  })[id] || '✦';

  const pendingBlock = message => `
    <div class="pending-box">
      <b>CONTENIDO PENDIENTE</b>
      <span>${escapeHTML(message || 'El staff completará este apartado más adelante.')}</span>
    </div>
  `;

  // NOTIFICACIONES PEQUEÑAS

  function toast(message) {
    const node = $('#toast');
    if (!node) return;

    node.textContent = message;
    node.classList.add('show');

    window.clearTimeout(toastTimer);

    toastTimer = window.setTimeout(() => {
      node.classList.remove('show');
    }, 2600);
  }

  // TEMA CLARO Y OSCURO

  function readTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'light';
    } catch {
      return 'light';
    }
  }

  function setTheme(theme) {
    const dark = theme === 'dark';

    document.body.classList.toggle('dark', dark);

    const button = $('#themeToggle');
    const icon = $('#themeIcon');

    if (icon) {
      icon.textContent = dark ? '☀' : '☾';
    }

    if (button) {
      button.setAttribute(
        'aria-label',
        dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
      );

      button.title = dark
        ? 'Cambiar a modo claro'
        : 'Cambiar a modo oscuro';
    }

    try {
      localStorage.setItem(
        STORAGE_KEY,
        dark ? 'dark' : 'light'
      );
    } catch {
      // El tema permanece activo durante esta sesión.
    }
  }

  // CARGAR INFORMACIÓN

  async function loadData() {
    const response = await fetch('./cota.json', {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(
        `No se pudo leer cota.json (HTTP ${response.status}).`
      );
    }

    const json = await response.json();

    if (
      !json ||
      !Array.isArray(json.kingdoms) ||
      !json.roles ||
      !json.rules
    ) {
      throw new Error(
        'cota.json no tiene la estructura esperada.'
      );
    }

    return json;
  }

  // INICIO DE LA APLICACIÓN

  async function init() {
    try {
      data = await loadData();

      document.title =
        `${data.identity?.name || 'C.O.T.A.'} — Crónicas de los Cinco Reinos`;

      const description = data.identity?.description;

      $('#identityDescription').textContent =
        isPending(description)
          ? 'Un mundo dividido por antiguas marcas, unido por historias que todavía esperan ser contadas.'
          : description;

      setTheme(readTheme());

      renderAll();
      bindEvents();
      restoreInitialSection();

    } catch (error) {
      console.error(error);

      document.body.innerHTML = `
        <main class="fatal-error">
          <h1>No se pudo cargar C.O.T.A.</h1>
          <p>${escapeHTML(error.message)}</p>
          <p>
            Comprueba que <strong>cota.json</strong> esté junto a
            index.html, styles.css y script.js.
          </p>
          <p>
            Para probar localmente, utiliza Live Server
            o ejecuta <code>python -m http.server 8000</code>
            desde la carpeta del proyecto.
          </p>
        </main>
      `;
    }
  }

  // RENDERIZAR TODO

  function renderAll() {
    renderHome();
    renderHistory();
    renderKingdoms();
    renderRaces();
    renderRoles();
    renderGroups();
    renderRules();
    renderActivities();
    renderRewards();
  }

  // PORTADA

  function renderHome() {
    const totals = [
      [data.kingdoms.length, 'Reinos por descubrir'],
      [(data.races || []).length, 'Pueblos y linajes'],
      [(data.roles?.general || []).length, 'Oficios generales'],
      [(data.groups || []).length, 'Espacios del team']
    ];

    $('#homeStats').innerHTML = totals.map(([number, label]) => `
      <div class="stat-item">
        <span class="stat-number">${number}</span>
        <span class="stat-label">${escapeHTML(label)}</span>
      </div>
    `).join('');

    $('#homeKingdoms').innerHTML = data.kingdoms.map(kingdom => {
      const colors = kingdomColor(kingdom.id);

      return `
        <button
          class="kingdom-card"
          type="button"
          data-open-kingdom="${escapeHTML(kingdom.id)}"
          style="
            --kingdom-accent:${escapeHTML(colors.accent || '#b99554')};
            --kingdom-light:${escapeHTML(colors.light || '#f7f0ed')};
            --kingdom-deep:${escapeHTML(colors.deep || '#5d5360')}
          "
        >
          <span class="kingdom-symbol">
            ${kingdomGlyph(kingdom.id)}
          </span>

          <span class="kingdom-card-copy">
            <strong>${escapeHTML(kingdom.name)}</strong>
            <small>${escapeHTML(kingdom.mark)}</small>
          </span>

          <span class="card-arrow" aria-hidden="true">↗</span>
        </button>
      `;
    }).join('');
  }

  // HISTORIA

  function renderHistory() {
    const myth = data.lore?.creationMyth;

    $('#creationMyth').innerHTML = isPending(myth)
      ? pendingBlock(
          'El mito de creación está reservado para que el staff incorpore la versión definitiva del lore.'
        )
      : `<p>${escapeHTML(myth).replace(/\n/g, '<br>')}</p>`;

    const timeline = data.lore?.timeline || [];

    $('#timelineList').innerHTML = timeline.length
      ? timeline.map(event => `
          <article class="timeline-item">
            <span class="year">${escapeHTML(event.year)}</span>

            <div>
              <h3>${escapeHTML(event.title)}</h3>

              ${
                isPending(event.description)
                  ? pendingBlock(
                      'La descripción de este acontecimiento está pendiente.'
                    )
                  : `<p>${escapeHTML(event.description)}</p>`
              }
            </div>
          </article>
        `).join('')
      : emptyState(
          'Todavía no hay acontecimientos registrados en la línea temporal.'
        );
  }

  // LISTA DE REINOS

  function renderKingdoms() {
    const filter = $('#kingdomFilter');

    filter.innerHTML = `
      <button
        class="filter-chip ${selectedKingdom === 'all' ? 'active' : ''}"
        type="button"
        data-kingdom="all"
        aria-pressed="${selectedKingdom === 'all'}"
      >
        Todos
      </button>
    ` + data.kingdoms.map(kingdom => `
      <button
        class="filter-chip ${selectedKingdom === kingdom.id ? 'active' : ''}"
        type="button"
        data-kingdom="${escapeHTML(kingdom.id)}"
        aria-pressed="${selectedKingdom === kingdom.id}"
      >
        ${escapeHTML(kingdom.name)}
      </button>
    `).join('');

    const kingdoms = selectedKingdom === 'all'
      ? data.kingdoms
      : data.kingdoms.filter(item => item.id === selectedKingdom);

    $('#kingdomGrid').innerHTML = kingdoms.map(kingdom => {
      const colors = kingdomColor(kingdom.id);

      const race = (data.races || []).find(
        item => item.kingdom === kingdom.id
      );

      return `
        <button
          class="kingdom-detail-card"
          type="button"
          data-open-kingdom="${escapeHTML(kingdom.id)}"
          style="
            --kingdom-base:${escapeHTML(colors.base || '#eee')};
            --kingdom-light:${escapeHTML(colors.light || '#fff')};
            --kingdom-deep:${escapeHTML(colors.deep || '#555')}
          "
        >
          <span class="kingdom-cover">
            <span>${kingdomGlyph(kingdom.id)}</span>
          </span>

          <span class="kingdom-info">
            <span class="eyebrow">
              ${escapeHTML(kingdom.element)} · ${escapeHTML(kingdom.mark)}
            </span>

            <strong>${escapeHTML(kingdom.name)}</strong>

            <span class="kingdom-tagline">
              ${escapeHTML(kingdom.tagline)}
            </span>

            <span class="kingdom-meta">
              <span>${escapeHTML(kingdom.guardian)}</span>
              ${race ? `<span>${escapeHTML(race.name)}</span>` : ''}
            </span>
          </span>

          <span class="kingdom-open-label">
            Descubrir reino ↗
          </span>
        </button>
      `;
    }).join('');
  }

  // IMÁGENES DE LOS REINOS

  function visualSlot(label, visual) {
    const url = String(visual?.url || '').trim();

    const safeUrl =
      /^(https?:\/\/|\.\.?\/|assets\/)/i.test(url)
        ? url
        : '';

    return `
      <div class="image-slot">

        ${
          safeUrl
            ? `
              <img
                src="${escapeHTML(safeUrl)}"
                alt="${escapeHTML(visual?.alt || label)}"
                loading="lazy"
              >
            `
            : `
              <span class="slot-symbol">✧</span>
              <strong>${escapeHTML(label)}</strong>
              <small>Imagen pendiente</small>
            `
        }

        ${
          safeUrl && visual?.credit
            ? `<small class="image-credit">${escapeHTML(visual.credit)}</small>`
            : ''
        }

      </div>
    `;
  }

  // ABRIR INFORMACIÓN COMPLETA DE UN REINO

  function openKingdom(id) {
    const kingdom = kingdomById(id);

    if (!kingdom) return;

    const colors = kingdomColor(id);
    const visuals = kingdom.visuals || {};

    const slots = [
      ['Portada', visuals.hero],
      ['Fondo', visuals.background],
      ['Ilustración', visuals.illustration],
      ['Emblema', visuals.emblem],
      ...(visuals.gallery || []).map(
        (visual, index) => [`Galería ${index + 1}`, visual]
      ),
      ['Decorativo', visuals.decorative]
    ];

    const secrets = (kingdom.secrets || []).length
      ? `
        <ul class="secret-list">
          ${kingdom.secrets.map(secret => `
            <li>
              ${
                isPending(secret)
                  ? 'Pendiente de completar'
                  : escapeHTML(secret)
              }
            </li>
          `).join('')}
        </ul>
      `
      : '<p class="muted">No hay secretos registrados.</p>';

    const race = (data.races || []).find(
      item => item.kingdom === id
    );

    $('#kingdomModalContent').innerHTML = `
      <div
        class="kingdom-modal-head"
        style="
          --kingdom-light:${escapeHTML(colors.light || '#eee')};
          --kingdom-deep:${escapeHTML(colors.deep || '#555')}
        "
      >
        <span class="modal-kingdom-symbol">
          ${kingdomGlyph(id)}
        </span>

        <span class="eyebrow">
          ${escapeHTML(kingdom.element)} · ${escapeHTML(kingdom.mark)}
        </span>

        <h2 id="kingdomModalTitle">
          ${escapeHTML(kingdom.name)}
        </h2>

        <p>${escapeHTML(kingdom.tagline)}</p>
      </div>

      <div class="kingdom-facts">

        <div>
          <small>Guardianes</small>
          <strong>${escapeHTML(kingdom.guardian)}</strong>
        </div>

        <div>
          <small>Gobierno</small>
          <strong>${escapeHTML(kingdom.monarchTitle || 'Sin especificar')}</strong>
        </div>

        <div>
          <small>Territorio</small>
          <strong>${escapeHTML(kingdom.territory)}</strong>
        </div>

        ${
          race
            ? `
              <div>
                <small>Raza asociada</small>
                <strong>${escapeHTML(race.name)}</strong>
              </div>
            `
            : ''
        }

      </div>

      <h3>Descripción</h3>

      ${
        isPending(kingdom.description)
          ? pendingBlock('La descripción del reino está pendiente de completar.')
          : `<p>${escapeHTML(kingdom.description)}</p>`
      }

      <h3>Historia del reino</h3>

      ${
        isPending(kingdom.lore)
          ? pendingBlock('El lore específico de este reino está pendiente.')
          : `<p>${escapeHTML(kingdom.lore)}</p>`
      }

      <h3>Secretos y particularidades</h3>

      ${secrets}

      <h3>Galería y recursos visuales</h3>

      <div class="image-slots">
        ${slots.map(([label, visual]) => visualSlot(label, visual)).join('')}
      </div>

      <p class="muted modal-note">
        Las imágenes están vacías en cota.json para que el propietario
        añada sus enlaces y créditos.
      </p>
    `;

    lastFocusedElement = document.activeElement;

    $('#kingdomModal').hidden = false;

    document.body.classList.add('modal-open');

    $('.modal-close', $('#kingdomModal'))?.focus();
  }

  // RAZAS

  function renderRaces() {
    $('#racesGrid').innerHTML = (data.races || []).map(race => {
      const kingdom = kingdomById(race.kingdom);

      return `
        <article class="race-card">

          <span class="eyebrow">
            ${escapeHTML(kingdom?.name || '')} · ${escapeHTML(race.element)}
          </span>

          <h3>${escapeHTML(race.name)}</h3>

          ${
            isPending(race.description)
              ? pendingBlock(
                  'La descripción de esta raza se completará más adelante.'
                )
              : `<p>${escapeHTML(race.description)}</p>`
          }

          <p class="race-blessing">
            <b>Bendición:</b> ${escapeHTML(race.blessing)}
          </p>

          <div class="tag-list">
            ${(race.traits || []).map(trait => `
              <span class="tag">${escapeHTML(trait)}</span>
            `).join('')}
          </div>

        </article>
      `;
    }).join('') || emptyState('Todavía no hay razas registradas.');
  }

  // OFICIOS

  function renderRoles() {
    const select = $('#roleKingdomFilter');

    select.innerHTML =
      '<option value="all">Todos los reinos</option>' +
      data.kingdoms.map(kingdom => `
        <option value="${escapeHTML(kingdom.id)}">
          ${escapeHTML(kingdom.name)}
        </option>
      `).join('');

    drawRoles('all');
  }

  function roleGlyph(icon) {
    const map = {
      wheat: '✣',
      flask: '⚗',
      herb: '✚',
      book: '▤',
      letter: '✉',
      scale: '⚖',
      eye: '◎',
      compass: '⌖',
      hammer: '⚒',
      anvil: '◇',
      saw: '⌁',
      scissors: '✂',
      bread: '◒',
      cleaver: '⌑',
      bow: '⌒',
      chisel: '◆',
      mask: '◉',
      palette: '◈',
      chalkboard: '▧',
      bell: '♧',
      dagger: '†',
      dash: '—',
      sword: '⚔',
      'wave-note': '♫',
      trident: '♆',
      leaf: '❧',
      flower: '❀',
      flame: '♨',
      wing: '⌁',
      shield: '⬡',
      star: '✧',
      feather: '❋'
    };

    return map[icon] || '✦';
  }

  function drawRoles(kingdomId = 'all') {
    const general = (data.roles?.general || []).filter(role =>
      !role.restricted ||
      kingdomId === 'all' ||
      role.restricted.includes(kingdomId)
    );

    let html = `
      <h3 class="role-section-title">Oficios generales</h3>

      <div class="role-grid">

        ${general.map(role => `
          <article class="role-card">
            <span class="role-icon">
              ${roleGlyph(role.icon)}
            </span>

            <span>
              ${escapeHTML(role.name)}

              ${
                role.restricted
                  ? '<small class="restricted-note">Solo Bryrius y Elyndra</small>'
                  : ''
              }
            </span>
          </article>
        `).join('')}

      </div>
    `;

    const specific = kingdomId === 'all'
      ? Object.entries(data.roles?.kingdomSpecific || {})
      : [[
          kingdomId,
          data.roles?.kingdomSpecific?.[kingdomId] || []
        ]];

    html += specific
      .filter(([, roles]) => roles.length)
      .map(([id, roles]) => `
        <h3 class="role-section-title">
          Oficios de ${escapeHTML(kingdomById(id)?.name || id)}
        </h3>

        <div class="role-grid">

          ${roles.map(role => `
            <article class="role-card">
              <span class="role-icon">
                ${roleGlyph(role.icon)}
              </span>

              <span>${escapeHTML(role.name)}</span>
            </article>
          `).join('')}

        </div>
      `).join('');

    const titles = data.roles?.titles || [];

    if (titles.length) {
      html += `
        <h3 class="role-section-title">Títulos adicionales</h3>

        <div class="role-grid">

          ${titles.map(title => `
            <article class="role-card">
              <span class="role-icon">♕</span>

              <span>
                ${escapeHTML(title.name)}
                <small class="restricted-note">
                  ${escapeHTML(title.grantedBy)}
                </small>
              </span>
            </article>
          `).join('')}

        </div>
      `;
    }

    $('#rolesContent').innerHTML = html;
  }

  // GRUPOS

  function renderGroups() {
    const kindLabels = {
      staff: 'Organización del team',
      roleplay: 'Espacio de roleplay',
      adult: 'Espacio restringido',
      ooc: 'Fuera de personaje'
    };

    $('#groupsContent').innerHTML =
      (data.groups || []).map(group => `
        <article class="group-card">

          <span class="group-kind">
            ${escapeHTML(kindLabels[group.type] || group.type)}
          </span>

          <h3>${escapeHTML(group.name)}</h3>
          <p>${escapeHTML(group.description)}</p>

        </article>
      `).join('') || emptyState('Todavía no hay grupos registrados.');
  }

  // NORMAS

  function renderRules() {
    drawRules(selectedRule);
  }

  function drawRules(type) {
    const list = data.rules?.[type] || [];

    $('#rulesContent').innerHTML = list.length
      ? list.map(rule => `
          <article class="rule-item">

            <span class="rule-mark">✧</span>

            <div>
              <h3>${escapeHTML(rule.title)}</h3>

              ${
                isPending(rule.description)
                  ? pendingBlock(
                      'El staff añadirá aquí la explicación de esta norma.'
                    )
                  : `<p>${escapeHTML(rule.description)}</p>`
              }
            </div>

          </article>
        `).join('')
      : emptyState('No hay normas registradas en esta categoría.');
  }

  // ACTIVIDADES

  function renderActivities() {
    $('#activitiesContent').innerHTML =
      (data.activities || []).map(activity => `
        <article class="activity-card">

          <span class="eyebrow">ACTIVIDAD</span>

          <h3>${escapeHTML(activity.name)}</h3>

          ${
            isPending(activity.description)
              ? pendingBlock('Descripción pendiente de completar.')
              : `<p>${escapeHTML(activity.description)}</p>`
          }

          <span class="points">
            ${escapeHTML(activity.points)} puntos
          </span>

        </article>
      `).join('') || emptyState('Todavía no hay actividades registradas.');
  }

  // RECOMPENSAS

  function renderRewards() {
    $('#rewardsContent').innerHTML =
      (data.rewards || []).map(reward => `
        <article class="reward-card">

          <span class="eyebrow">RECOMPENSA</span>

          <h3>${escapeHTML(reward.name)}</h3>

          ${
            isPending(reward.description)
              ? pendingBlock(
                  'Las condiciones de esta recompensa están pendientes.'
                )
              : `<p>${escapeHTML(reward.description)}</p>`
          }

          <span class="points">
            Duración: ${escapeHTML(reward.duration)}
          </span>

        </article>
      `).join('') || emptyState('Todavía no hay recompensas registradas.');
  }

  // NAVEGACIÓN

  function showSection(section) {
    const target = $(`#view-${section}`);

    if (!target) return;

    $$('.view').forEach(view => {
      view.classList.toggle('active', view === target);
    });

    $$('[data-section].nav-link').forEach(button => {
      const active = button.dataset.section === section;

      button.classList.toggle('active', active);

      if (active) {
        button.setAttribute('aria-current', 'page');
      } else {
        button.removeAttribute('aria-current');
      }
    });

    $('#mobileNav').classList.remove('open');

    $('#mobileMenuButton').setAttribute(
      'aria-expanded',
      'false'
    );

    window.scrollTo({
      top: 0,
      behavior: window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches ? 'auto' : 'smooth'
    });

    try {
      history.replaceState(null, '', `#${section}`);
    } catch {
      // Navegación local disponible sin historial.
    }
  }

  function restoreInitialSection() {
    const section = (location.hash || '').replace('#', '');

    if (section && $(`#view-${CSS.escape(section)}`)) {
      showSection(section);
    }
  }

  // PESTAÑAS DE COMUNIDAD

  function setCommunityTab(name) {
    const target = $(`#community-${name}`);

    if (!target) return;

    $$('#communityTabs [data-community]').forEach(button => {
      const active = button.dataset.community === name;

      button.classList.toggle('active', active);

      button.setAttribute(
        'aria-selected',
        String(active)
      );
    });

    $$('.community-panel').forEach(panel => {
      panel.classList.toggle('active', panel === target);
    });
  }

  // MODO PRESENTACIÓN

  function setPresentation(active) {
    document.body.classList.toggle(
      'presentation-active',
      active
    );

    $('#presentationExit').hidden = !active;

    $('#presentationButton').setAttribute(
      'aria-pressed',
      String(active)
    );

    if (active) {
      closeKingdomModal();

      $('#mobileNav').classList.remove('open');

      $('#mobileMenuButton').setAttribute(
        'aria-expanded',
        'false'
      );

      toast('Modo presentación activado · Esc para salir');

    } else {
      toast('Modo presentación desactivado');
    }
  }

  // CERRAR VENTANA DE REINO

  function closeKingdomModal() {
    $('#kingdomModal').hidden = true;

    document.body.classList.remove('modal-open');

    if (
      lastFocusedElement &&
      typeof lastFocusedElement.focus === 'function'
    ) {
      lastFocusedElement.focus();
    }
  }

  // EVENTOS

  function bindEvents() {

    document.addEventListener('click', event => {

      const target = event.target instanceof Element
        ? event.target
        : event.target.parentElement;

      if (!target) return;

      // Navegación
      const sectionButton = target.closest('[data-section]');

      if (sectionButton) {
        event.preventDefault();
        showSection(sectionButton.dataset.section);
        return;
      }

      // Abrir reino
      const kingdomButton = target.closest('[data-open-kingdom]');

      if (kingdomButton) {
        openKingdom(kingdomButton.dataset.openKingdom);
        return;
      }

      // Cerrar modal
      if (
        target.closest('[data-close-modal]') ||
        target === $('#kingdomModal')
      ) {
        closeKingdomModal();
      }
    });

    // MENÚ MÓVIL

    $('#mobileMenuButton').addEventListener('click', () => {

      const open = $('#mobileNav').classList.toggle('open');

      $('#mobileMenuButton').setAttribute(
        'aria-expanded',
        String(open)
      );

    });

    // CAMBIAR TEMA

    $('#themeToggle').addEventListener('click', () => {

      setTheme(
        document.body.classList.contains('dark')
          ? 'light'
          : 'dark'
      );

    });

    // FILTRO DE REINOS

    $('#kingdomFilter').addEventListener('click', event => {

      const target = event.target instanceof Element
        ? event.target
        : event.target.parentElement;

      const button = target.closest('[data-kingdom]');

      if (!button) return;

      selectedKingdom = button.dataset.kingdom;

      renderKingdoms();

    });

    // PESTAÑAS PRINCIPALES DE COMUNIDAD

    $('#communityTabs').addEventListener('click', event => {

      const target = event.target instanceof Element
        ? event.target
        : event.target.parentElement;

      const button = target.closest('[data-community]');

      if (button) {
        setCommunityTab(button.dataset.community);
      }

    });

    // FILTRO DE OFICIOS

    $('#roleKingdomFilter').addEventListener('change', event => {
      drawRoles(event.target.value);
    });

    // PESTAÑAS DE NORMAS

    $('#rulesTabs').addEventListener('click', event => {

      const target = event.target instanceof Element
        ? event.target
        : event.target.parentElement;

      const button = target.closest('[data-rule]');

      if (!button) return;

      selectedRule = button.dataset.rule;

      $$('#rulesTabs [data-rule]').forEach(item => {

        const active = item === button;

        item.classList.toggle('active', active);

        item.setAttribute(
          'aria-pressed',
          String(active)
        );

      });

      drawRules(selectedRule);

    });

    // PRESENTACIÓN EN ESCRITORIO

    $('#presentationButton').addEventListener('click', () => {

      setPresentation(
        !document.body.classList.contains('presentation-active')
      );

    });

    // PRESENTACIÓN EN MÓVIL

    $('#mobilePresentationButton').addEventListener('click', () => {

      $('#mobileNav').classList.remove('open');

      $('#mobileMenuButton').setAttribute(
        'aria-expanded',
        'false'
      );

      setPresentation(
        !document.body.classList.contains('presentation-active')
      );

    });

    // BOTÓN PARA SALIR

    $('#exitPresentation').addEventListener('click', () => {
      setPresentation(false);
    });

    // ATAJOS DE TECLADO

    document.addEventListener('keydown', event => {

      if (event.key === 'Escape') {

        if (!$('#kingdomModal').hidden) {
          closeKingdomModal();

        } else if (
          document.body.classList.contains('presentation-active')
        ) {
          setPresentation(false);

        } else if ($('#mobileNav').classList.contains('open')) {

          $('#mobileNav').classList.remove('open');

          $('#mobileMenuButton').setAttribute(
            'aria-expanded',
            'false'
          );

        }

      }

      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 'p'
      ) {
        event.preventDefault();

        setPresentation(
          !document.body.classList.contains('presentation-active')
        );
      }

    });

  }

  // INICIAR

  init();

})();
