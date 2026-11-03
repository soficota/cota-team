/* C.O.T.A. — Aplicación estática. Los datos personales se guardan en localStorage. */
(() => {
  'use strict';
  const STORAGE = {
    theme: 'cota_theme_v1',
    chats: 'cota_chats_v1',
    ngl: 'cota_ngl_v1'
  };
  let data;
  let selectedKingdom = 'all';
  let selectedRule = 'general';
  let selectedVideoTab = 'skits';
  let activeRoomId = null;
  let presentationIndex = 0;
  let toastTimer;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const slugLabel = value => String(value || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const isPending = value => value === 'PENDIENTE' || value === '' || value == null;
  const shortMark = value => (String(value || '✧').trim()[0] || '✧').toUpperCase();
  const showToast = message => {
    const node = $('#toast');
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('show'), 2600);
  };
  const saveLocal = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (error) { showToast('No se pudo guardar. Puede faltar espacio en este navegador.'); return false; }
  };
  const readLocal = (key, fallback) => {
    try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
    catch { return fallback; }
  };
  const download = (filename, content, type = 'application/json') => {
    const blob = new Blob([content], {type});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };
  const pendingBlock = text => `<div class="pending-box"><b>CONTENIDO PENDIENTE</b>${safe(text || 'El staff completará este apartado más adelante.')}</div>`;
  const kingdomColor = id => data?.palette?.kingdoms?.[id] || data?.palette?.kingdoms?.elyndra;
  const kingdomById = id => data.kingdoms.find(k => k.id === id);
  const kingdomGlyph = id => ({hadalith:'≈',avalon:'❧',emberia:'♨',bryrius:'⌁',elyndra:'✧'}[id] || '✦');
  const emptyState = text => `<div class="empty-inline">${safe(text)}</div>`;

  async function init() {
    try {
      const response = await fetch('./cota.json', {cache:'no-store'});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      data = await response.json();
    } catch (error) {
      document.body.innerHTML = `<main style="max-width:760px;margin:10vh auto;padding:24px;font-family:Arial"><h1>No se pudo cargar cota.json</h1><p>Comprueba que <b>cota.json</b> esté junto a index.html y abre el sitio mediante un servidor local o GitHub Pages. Abrir index.html directamente como archivo puede bloquear fetch().</p><p>Detalle: ${safe(error.message)}</p></main>`;
      return;
    }
    applyTheme(readLocal(STORAGE.theme, 'light'));
    renderAll();
    bindNavigation();
    bindCommunityTabs();
    bindToolTabs();
    bindGlobalControls();
    bindKingdomControls();
    bindRoles();
    bindRules();
    bindFaq();
    bindVideoTools();
    bindNgl();
    bindChat();
    bindPresentation();
    $('#identityDescription').textContent = data.identity.description || 'Un mundo dividido por antiguas marcas, unido por historias que todavía esperan ser contadas.';
  }

  function renderAll() {
    document.title = `${data.identity.name} — Crónicas de los Cinco Reinos`;
    renderHome(); renderHistory(); renderKingdoms(); renderRoles(); renderGroups(); renderRules(); renderActivities(); renderRewards(); renderFaq(); renderStaff(); renderVideoTools(); renderNgl(); renderChat();
  }

  function renderHome() {
    const totals = [
      [data.kingdoms.length, 'Reinos por descubrir'],
      [data.races.length, 'Pueblos y linajes'],
      [data.roles.general.length, 'Oficios generales'],
      [data.groups.length, 'Espacios del team']
    ];
    $('#homeStats').innerHTML = totals.map(([n,label]) => `<div class="stat-item"><span class="stat-number">${n}</span><span class="stat-label">${safe(label)}</span></div>`).join('');
    $('#homeKingdoms').innerHTML = data.kingdoms.map(k => {
      const c = kingdomColor(k.id);
      return `<article class="kingdom-card" data-open-kingdom="${safe(k.id)}" style="--kingdom-accent:${c.accent};--kingdom-light:${c.light};--kingdom-deep:${c.deep}"><div class="kingdom-symbol">${kingdomGlyph(k.id)}</div><h3>${safe(k.name)}</h3><p>${safe(k.mark)}</p><span class="card-arrow">↗</span></article>`;
    }).join('');
  }

  function renderHistory() {
    const myth = data.lore.creationMyth;
    $('#creationMyth').innerHTML = isPending(myth) ? pendingBlock('El mito de creación está reservado para que el staff incorpore la versión definitiva del lore.') : `<p>${safe(myth)}</p>`;
    $('#timelineList').innerHTML = (data.lore.timeline || []).map(item => `<div class="timeline-item"><span class="year">${safe(item.year)}</span><h3>${safe(item.title)}</h3>${isPending(item.description) ? pendingBlock('Descripción pendiente.') : `<p>${safe(item.description)}</p>`}</div>`).join('') || emptyState('Todavía no hay eventos en la línea temporal.');
    $('#racesGrid').innerHTML = data.races.map(r => `<article class="race-card"><span class="eyebrow">${safe(kingdomById(r.kingdom)?.name || '')} · ${safe(r.element)}</span><h3>${safe(r.name)}</h3>${isPending(r.description) ? pendingBlock('La descripción de esta raza se completará después.') : `<p>${safe(r.description)}</p>`}<p><b>Bendición:</b> ${safe(r.blessing)}</p><div class="tag-list">${r.traits.map(t=>`<span class="tag">${safe(t)}</span>`).join('')}</div></article>`).join('');
  }

  function renderKingdoms() {
    const filter = $('#kingdomFilter');
    filter.innerHTML = `<button class="filter-chip ${selectedKingdom==='all'?'active':''}" data-kingdom="all">Todos</button>` + data.kingdoms.map(k=>`<button class="filter-chip ${selectedKingdom===k.id?'active':''}" data-kingdom="${safe(k.id)}">${safe(k.name)}</button>`).join('');
    const items = selectedKingdom === 'all' ? data.kingdoms : data.kingdoms.filter(k=>k.id===selectedKingdom);
    $('#kingdomGrid').innerHTML = items.map(k => {
      const c = kingdomColor(k.id);
      return `<article class="kingdom-detail-card" data-open-kingdom="${safe(k.id)}" style="--kingdom-base:${c.base};--kingdom-light:${c.light};--kingdom-deep:${c.deep}"><div class="kingdom-cover"><span>${kingdomGlyph(k.id)}</span></div><div class="kingdom-info"><span class="eyebrow">${safe(k.element)} · ${safe(k.mark)}</span><h3>${safe(k.name)}</h3><p>${safe(k.tagline)}</p><div class="kingdom-meta"><span>${safe(k.guardian)}</span><span>${safe(k.monarchTitle || 'Sin título')}</span></div></div></article>`;
    }).join('');
  }

  function openKingdom(id) {
    const k = kingdomById(id); if (!k) return;
    const c = kingdomColor(id);
    const slots = [ ['hero','Portada'],['background','Fondo'],['illustration','Ilustración'],['emblem','Emblema'],...(k.visuals.gallery||[]).map((x,i)=>[`gallery-${i}`,x.alt]),['decorative','Decorativo'] ];
    const secrets = (k.secrets || []).length ? `<ul>${k.secrets.map(s=>`<li>${isPending(s)?'Pendiente de completar':safe(s)}</li>`).join('')}</ul>` : '<p class="muted">No hay secretos registrados.</p>';
    $('#kingdomModalContent').innerHTML = `<div class="kingdom-modal-head" style="--kingdom-light:${c.light};--kingdom-deep:${c.deep}"><span class="eyebrow">${safe(k.element)} · ${safe(k.mark)}</span><h2 id="kingdomModalTitle">${safe(k.name)}</h2><p>${safe(k.tagline)}</p></div><div class="panel-kicker">DATOS DEL REINO</div><p><b>Guardianes:</b> ${safe(k.guardian)}</p><p><b>Gobierno:</b> ${safe(k.monarchTitle || 'Sin especificar')}</p><p><b>Territorio:</b> ${safe(k.territory)}</p><h3>Descripción</h3>${isPending(k.description)?pendingBlock('La descripción del reino está pendiente de completar.'):`<p>${safe(k.description)}</p>`}<h3>Historia del reino</h3>${isPending(k.lore)?pendingBlock('El lore específico de este reino está pendiente.'):`<p>${safe(k.lore)}</p>`}<h3>Secretos y particularidades</h3>${secrets}<h3>Ranuras visuales</h3><div class="image-slots">${slots.map(([key,label])=>`<div class="image-slot"><span>✧</span>${safe(label)}<small>Imagen pendiente</small></div>`).join('')}</div><p class="muted">Las imágenes están vacías en cota.json para que el propietario añada sus enlaces y créditos.</p>`;
    $('#kingdomModal').hidden = false;
  }

  function renderRoles() {
    const sel = $('#roleKingdomFilter');
    sel.innerHTML = '<option value="all">Todos los reinos</option>'+data.kingdoms.map(k=>`<option value="${safe(k.id)}">${safe(k.name)}</option>`).join('');
    drawRoles('all');
  }
  function drawRoles(kingdom='all') {
    const general = data.roles.general.filter(r=>!r.restricted || kingdom==='all' || r.restricted.includes(kingdom));
    let html = `<h3 class="role-section-title">Oficios generales</h3><div class="role-grid">${general.map(r=>`<div class="role-card"><span class="role-icon">${roleGlyph(r.icon)}</span><span>${safe(r.name)}</span>${r.restricted?`<small class="restricted-note">Bryrius · Elyndra</small>`:''}</div>`).join('')}</div>`;
    const specific = kingdom==='all' ? Object.entries(data.roles.kingdomSpecific) : [[kingdom,data.roles.kingdomSpecific[kingdom]||[]]];
    html += specific.filter(([,arr])=>arr.length).map(([id,arr])=>`<h3 class="role-section-title">Oficios de ${safe(kingdomById(id)?.name || id)}</h3><div class="role-grid">${arr.map(r=>`<div class="role-card"><span class="role-icon">${roleGlyph(r.icon)}</span><span>${safe(r.name)}</span></div>`).join('')}</div>`).join('');
    html += `<h3 class="role-section-title">Títulos adicionales</h3><div class="role-grid">${data.roles.titles.map(r=>`<div class="role-card"><span class="role-icon">♕</span><span>${safe(r.name)}<small style="display:block;color:var(--muted)">${safe(r.grantedBy)}</small></span></div>`).join('')}</div>`;
    $('#rolesContent').innerHTML = html;
  }
  function roleGlyph(icon) { const map={wheat:'✣',flask:'⚗',herb:'✚',book:'▤',letter:'✉',scale:'⚖',eye:'◎',compass:'⌖',hammer:'⚒',anvil:'◇',saw:'⌁',scissors:'✂',bread:'◒',cleaver:'⌑',bow:'⌒',chisel:'◆',mask:'◉',palette:'◈',chalkboard:'▧',bell:'♧',dagger:'†',dash:'—',sword:'⚔', 'wave-note':'♫',trident:'♆',leaf:'❧',flower:'❀',flame:'♨',wing:'⌁',shield:'⬡',star:'✧',feather:'❋'};return map[icon]||'✦'; }

  function renderGroups() {
    $('#groupsContent').innerHTML = data.groups.map(g=>`<article class="group-card"><span class="group-kind">${safe(g.type)}</span><h3>${safe(g.name)}</h3><p>${safe(g.description)}</p></article>`).join('');
  }
  function renderRules() { drawRules(selectedRule); }
  function drawRules(type) {
    const list = data.rules[type] || [];
    $('#rulesContent').innerHTML = list.map(r=>`<article class="rule-item"><h3>${safe(r.title)}</h3>${isPending(r.description)?pendingBlock('El staff añadirá aquí la explicación de esta norma.'):`<p>${safe(r.description)}</p>`}</article>`).join('');
  }
  function renderActivities() {
    $('#activitiesContent').innerHTML = data.activities.map(a=>`<article class="activity-card"><span class="eyebrow">ACTIVIDAD</span><h3>${safe(a.name)}</h3>${isPending(a.description)?pendingBlock('Descripción pendiente de completar.'):`<p>${safe(a.description)}</p>`}<span class="points">${safe(a.points)} puntos</span></article>`).join('');
  }
  function renderRewards() {
    $('#rewardsContent').innerHTML = data.rewards.map(r=>`<article class="reward-card"><span class="eyebrow">RECOMPENSA</span><h3>${safe(r.name)}</h3>${isPending(r.description)?pendingBlock('Condiciones pendientes de completar.'):`<p>${safe(r.description)}</p>`}<span class="points">Duración: ${safe(r.duration)}</span></article>`).join('');
  }
  function renderFaq() {
    $('#faqContent').innerHTML = data.faq.map((f,i)=>`<article class="faq-item"><button class="faq-question" aria-expanded="false" data-faq="${i}">${safe(f.question)}<span>＋</span></button><div class="faq-answer" hidden>${isPending(f.answer)?pendingBlock('Respuesta pendiente de completar.'):`${safe(f.answer)}`}</div></article>`).join('');
  }
  function renderStaff() {
    $('#staffName').textContent = data.staff.name;
    $('#staffDescription').innerHTML = isPending(data.staff.description) ? pendingBlock('El staff puede añadir aquí una presentación del equipo administrativo.') : safe(data.staff.description);
    $('#staffMembers').innerHTML = data.staff.members.length ? data.staff.members.map(m=>`<div class="staff-card"><b>${safe(m.name||'Integrante')}</b><div>${safe(m.role||'')}</div></div>`).join('') : emptyState('Los integrantes del staff se añadirán aquí.');
  }

  function renderVideoTools() { drawVideoTab(selectedVideoTab); }
  function drawVideoTab(tab) {
    const container = $('#videoContent');
    if (tab==='skits') {
      container.innerHTML = `<div class="video-card-grid">${data.videoTools.skitTemplates.map(t=>`<article class="video-card"><span class="eyebrow">${safe(t.format)} · ${safe(t.duration)}</span><h3>${isPending(t.title)?'Plantilla por completar':safe(t.title)}</h3><p>${safe(t.hook)}</p>${isPending(t.script)?pendingBlock('El guion se añadirá más adelante.'):`<pre>${safe(t.script)}</pre>`}<p><b>Estilo:</b> ${safe(t.visualStyle)}</p><div class="tag-list">${(t.hashtags||[]).map(h=>`<span class="tag">${safe(h)}</span>`).join('')}</div><button class="button button-soft button-small copy-template" data-template="${safe(t.id)}">Copiar plantilla</button></article>`).join('')}</div>`;
    } else if (tab==='moods') {
      container.innerHTML = `<div class="video-card-grid">${Object.entries(data.videoTools.moodPresets).map(([id,m])=>`<article class="video-card"><span class="eyebrow">${safe(kingdomById(id)?.name||id)}</span><h3>${safe(slugLabel(id))}</h3><p><b>Iluminación:</b> ${safe(m.lighting)}</p><p><b>Música:</b> ${safe(m.music)}</p><p><b>Color:</b> ${safe(m.colorGrade)}</p><div class="tag-list">${m.filters.map(f=>`<span class="tag">${safe(f)}</span>`).join('')}</div></article>`).join('')}</div>`;
    } else if (tab==='transitions') {
      container.innerHTML = `<div class="video-card-grid">${data.videoTools.transitions.map(t=>`<article class="video-card"><span class="eyebrow">TRANSICIÓN</span><h3>${safe(t.name)}</h3><p>${safe(t.useCase)}</p></article>`).join('')}</div>`;
    } else if (tab==='voices') {
      container.innerHTML = `<div class="video-card-grid">${data.videoTools.voiceGuides.map(v=>`<article class="video-card"><span class="eyebrow">${safe(kingdomById(v.kingdom)?.name||v.kingdom)}</span><h3>Dirección de voz</h3><p><b>Tono:</b> ${safe(v.tone)}</p><p><b>Velocidad:</b> ${safe(v.speed)}</p><p><b>Vocabulario:</b> ${safe(v.vocabulary)}</p></article>`).join('')}</div>`;
    } else {
      container.innerHTML = `<div class="video-card-grid">${data.videoTools.captionTemplates.map(t=>`<article class="video-card"><span class="eyebrow">TEXTO PARA PUBLICACIÓN</span><h3>Plantilla de caption</h3><pre>${safe(t.template)}</pre><p>Variables: ${safe(t.variables.join(', '))}</p><button class="button button-soft button-small copy-caption" data-caption="${safe(t.id)}">Copiar texto</button></article>`).join('')}</div>`;
    }
  }

  function getNgl() { return readLocal(STORAGE.ngl, []); }
  function saveNgl(items) { saveLocal(STORAGE.ngl, items); renderNgl(); }
  function renderNgl() {
    $('#nglCategory').innerHTML = data.ngl.categories.map(c=>`<option value="${safe(c.id)}">${safe(c.name)}</option>`).join('');
    $('#suggestedQuestions').innerHTML = data.ngl.suggestedQuestions.map(q=>`<button class="suggestion-button" data-suggestion="${safe(q.id)}">${safe(q.question)}</button>`).join('');
    const entries = getNgl(); $('#nglCount').textContent = entries.length;
    $('#nglInbox').innerHTML = entries.length ? [...entries].reverse().map(item=>`<article class="ngl-entry"><p>${safe(item.question)}</p><small>${safe(data.ngl.categories.find(c=>c.id===item.category)?.name||'General')} · ${new Date(item.createdAt).toLocaleString('es-PE')} · ${safe(item.status)}</small>${item.answer?`<p><b>Respuesta:</b> ${safe(item.answer)}</p>`:''}<div class="ngl-entry-actions">${item.status==='pending'?`<button class="tiny-button" data-ngl-action="approve" data-id="${safe(item.id)}">Aprobar</button>`:''}<button class="tiny-button" data-ngl-action="answer" data-id="${safe(item.id)}">Responder</button><button class="tiny-button" data-ngl-action="delete" data-id="${safe(item.id)}">Eliminar</button></div></article>`).join('') : emptyState('Todavía no hay preguntas guardadas en este navegador.');
  }

  function getChatState() { return readLocal(STORAGE.chats, {characters:[],rooms:[],activeCharacterId:null}); }
  function saveChatState(state) { const ok = saveLocal(STORAGE.chats,state); if(ok) $('#localSaveStatus').textContent='Guardado en este navegador'; renderChat(); }
  function renderChat() {
    const state = getChatState();
    $('#roomList').innerHTML = state.rooms.length ? state.rooms.map(room=>`<button class="room-button ${room.id===activeRoomId?'active':''}" data-room="${safe(room.id)}"><span class="room-avatar">${safe(shortMark(room.name))}</span><span><strong>${safe(room.name)}</strong><small>${room.messages.length? safe(room.messages[room.messages.length-1].text.slice(0,28)):'Sin mensajes'}</small></span></button>`).join('') : '<div class="empty-inline">Aún no hay chats.</div>';
    $('#characterList').innerHTML = state.characters.length ? state.characters.map(ch=>`<div class="character-row"><span class="character-avatar">${safe(shortMark(ch.name))}</span><span><strong>${safe(ch.name)}</strong><small>${safe(ch.handle)}</small></span></div>`).join('') : '<div class="empty-inline">Crea tu primer personaje.</div>';
    const previousSpeaker = $('#speakerSelect').value;
    const room = state.rooms.find(r=>r.id===activeRoomId);
    if (!room) { $('#chatEmpty').hidden=false; $('#activeChat').hidden=true; return; }
    $('#chatEmpty').hidden=true; $('#activeChat').hidden=false;
    $('#activeRoomName').textContent=room.name;
    const members = room.members.map(id=>state.characters.find(c=>c.id===id)?.name).filter(Boolean);
    $('#activeRoomMembers').textContent=members.join(' · ') || 'Sin participantes';
    const eligible=state.characters.filter(c=>room.members.includes(c.id));
    $('#speakerSelect').innerHTML=eligible.map(c=>`<option value="${safe(c.id)}">${safe(c.handle)} · ${safe(c.name)}</option>`).join('');
    if (!eligible.length) $('#speakerSelect').innerHTML='<option value="">Crea o añade personajes</option>';
    else if (eligible.some(c=>c.id===previousSpeaker)) $('#speakerSelect').value=previousSpeaker;
    const messages=room.messages || [];
    $('#chatMessages').innerHTML=messages.length ? messages.map(messageMarkup).join('') : emptyState('Escribe el primer mensaje de esta conversación.');
    $('#chatMessages').scrollTop=$('#chatMessages').scrollHeight;
  }
  function messageMarkup(m) {
    const state=getChatState(); const ch=state.characters.find(c=>c.id===m.characterId);
    const room=state.rooms.find(r=>r.id===activeRoomId);
    const own=!!room && room.members.indexOf(m.characterId)>0;
    return `<div class="message-row ${own?'mine':''} message-type-${safe(m.type)}"><span class="message-avatar">${safe(shortMark(ch?.name||'C'))}</span><div class="message-bubble"><div class="message-meta"><b>${safe(ch?.name||'Personaje')}</b><span>${new Date(m.createdAt).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})}</span></div><div class="message-content">${safe(m.text)}</div></div></div>`;
  }

  function bindNavigation() {
    document.addEventListener('click', e=>{
      const btn=e.target.closest('[data-section]'); if(!btn) return;
      const section=btn.dataset.section; if(!$('#view-'+section)) return;
      $$('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===section));
      $$('.nav-link').forEach(n=>n.classList.toggle('active',n.dataset.section===section));
      $('#mobileNav').classList.remove('open'); window.scrollTo({top:0,behavior:'smooth'});
    });
    $('#mobileMenuButton').addEventListener('click',()=>$('#mobileNav').classList.toggle('open'));
  }
  function bindCommunityTabs() {
    $('#communityTabs').addEventListener('click',e=>{const b=e.target.closest('[data-community]');if(!b)return;$$('#communityTabs .tab-button').forEach(x=>x.classList.toggle('active',x===b));$$('.community-panel').forEach(p=>p.classList.toggle('active',p.id==='community-'+b.dataset.community));});
  }
  function bindToolTabs() {
    $$('.tool-tabs [data-tool]').forEach(btn=>btn.addEventListener('click',()=>{$$('.tool-tabs .tab-button').forEach(x=>x.classList.toggle('active',x===btn));$$('.tool-panel').forEach(p=>p.classList.toggle('active',p.id==='tool-'+btn.dataset.tool));}));
  }
  function bindGlobalControls() {
    $('#themeToggle').addEventListener('click',()=>{const next=document.body.classList.contains('dark')?'light':'dark';applyTheme(next);saveLocal(STORAGE.theme,next);});
    $('#kingdomGrid').addEventListener('click',e=>{const card=e.target.closest('[data-open-kingdom]');if(card)openKingdom(card.dataset.openKingdom);});
    $('#homeKingdoms').addEventListener('click',e=>{const card=e.target.closest('[data-open-kingdom]');if(card){showSection('reinos');openKingdom(card.dataset.openKingdom);}});
    $('#kingdomModal').addEventListener('click',e=>{if(e.target===e.currentTarget||e.target.closest('[data-close-modal]'))e.currentTarget.hidden=true;});
    $('#genericModal').addEventListener('click',e=>{if(e.target===e.currentTarget||e.target.closest('[data-close-modal]'))e.currentTarget.hidden=true;});
    document.addEventListener('click',e=>{if(e.target.closest('[data-close-modal]'))e.target.closest('.modal-backdrop').hidden=true;});
    $('#exportVideoData').addEventListener('click',()=>download('cota-herramientas-video.json',JSON.stringify(data.videoTools,null,2)));
  }
  function showSection(name) { const btn=$(`[data-section="${name}"]`);if(btn)btn.click(); }
  function applyTheme(theme) { document.body.classList.toggle('dark',theme==='dark'); }
  function bindKingdomControls() {
    $('#kingdomFilter').addEventListener('click',e=>{const b=e.target.closest('[data-kingdom]');if(!b)return;selectedKingdom=b.dataset.kingdom;renderKingdoms();});
  }
  function bindRoles() { $('#roleKingdomFilter').addEventListener('change',e=>drawRoles(e.target.value)); }
  function bindRules() { $('#community-rules').addEventListener('click',e=>{const b=e.target.closest('[data-rule]');if(!b)return;selectedRule=b.dataset.rule;$$('[data-rule]').forEach(x=>x.classList.toggle('active',x===b));drawRules(selectedRule);}); }
  function bindFaq() { $('#faqContent').addEventListener('click',e=>{const b=e.target.closest('[data-faq]');if(!b)return;const answer=b.nextElementSibling;const open=answer.hidden;answer.hidden=!open;b.setAttribute('aria-expanded',String(open));b.querySelector('span').textContent=open?'−':'＋';}); }
  function bindVideoTools() {
    $('#tool-video').addEventListener('click',e=>{
      const tab=e.target.closest('[data-video-tab]');if(tab){selectedVideoTab=tab.dataset.videoTab;$$('[data-video-tab]').forEach(x=>x.classList.toggle('active',x===tab));drawVideoTab(selectedVideoTab);return;}
      const copy=e.target.closest('.copy-template');if(copy){const item=data.videoTools.skitTemplates.find(t=>t.id===copy.dataset.template);if(item)copyText([item.title,item.hook,item.script,item.cta].filter(Boolean).join('\n\n'));}
      const caption=e.target.closest('.copy-caption');if(caption){const item=data.videoTools.captionTemplates.find(t=>t.id===caption.dataset.caption);if(item)copyText(item.template);}
    });
  }
  async function copyText(text) { try { await navigator.clipboard.writeText(text);showToast('Copiado al portapapeles.'); } catch { const area=document.createElement('textarea');area.value=text;document.body.append(area);area.select();document.execCommand('copy');area.remove();showToast('Copiado.'); } }
  function bindNgl() {
    $('#nglQuestion').addEventListener('input',e=>$('#nglCounter').textContent=`${e.target.value.length} / 280`);
    $('#suggestedQuestions').addEventListener('click',e=>{const b=e.target.closest('[data-suggestion]');if(!b)return;const q=data.ngl.suggestedQuestions.find(x=>x.id===b.dataset.suggestion);if(q){$('#nglQuestion').value=q.question;$('#nglCounter').textContent=`${q.question.length} / 280`;$('#nglCategory').value=q.category;}});
    $('#nglForm').addEventListener('submit',e=>{e.preventDefault();const question=$('#nglQuestion').value.trim();if(!question)return;const banned=data.ngl.moderation.bannedWords||[];if(banned.some(word=>word&&question.toLowerCase().includes(word.toLowerCase()))){showToast('La pregunta contiene una palabra no permitida.');return;}const items=getNgl();items.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),question,category:$('#nglCategory').value,status:data.ngl.moderation.requiresApproval?'pending':'approved',createdAt:new Date().toISOString(),answer:'',answerStyle:''});saveNgl(items);e.target.reset();$('#nglCounter').textContent='0 / 280';showToast('Pregunta guardada en este navegador.');});
    $('#nglInbox').addEventListener('click',e=>{const b=e.target.closest('[data-ngl-action]');if(!b)return;const items=getNgl();const item=items.find(x=>x.id===b.dataset.id);if(!item)return;
      if(b.dataset.nglAction==='delete'){saveNgl(items.filter(x=>x.id!==item.id));showToast('Pregunta eliminada.');}
      else if(b.dataset.nglAction==='approve'){item.status='approved';saveNgl(items);showToast('Pregunta aprobada localmente.');}
      else if(b.dataset.nglAction==='answer'){
        const answer=prompt('Escribe la respuesta del personaje:');if(answer===null)return;const style=prompt('Estilo de respuesta (canon, humorous, mystery, ooc):','canon');item.answer=answer.trim();item.answerStyle=(style||'canon').trim();item.status='answered';saveNgl(items);showToast('Respuesta guardada.');
      }
    });
    $('#exportNgl').addEventListener('click',()=>download('cota-ngl-local.json',JSON.stringify(getNgl(),null,2)));
  }

  function bindChat() {
    $('#newCharacterButton').addEventListener('click',openCharacterForm);
    $('#newRoomButton').addEventListener('click',openRoomForm);
    $('#emptyNewRoom').addEventListener('click',openRoomForm);
    $('#roomList').addEventListener('click',e=>{const b=e.target.closest('[data-room]');if(!b)return;activeRoomId=b.dataset.room;renderChat();});
    $('#chatForm').addEventListener('submit',e=>{e.preventDefault();const text=$('#messageInput').value.trim();const characterId=$('#speakerSelect').value;if(!text||!characterId)return;const state=getChatState();const room=state.rooms.find(r=>r.id===activeRoomId);if(!room)return;room.messages.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),characterId,text,type:$('#messageType').value,createdAt:new Date().toISOString()});saveChatState(state);$('#messageInput').value='';});
    $('#exportChats').addEventListener('click',()=>download('cota-chats-local.json',JSON.stringify(getChatState(),null,2)));
    $('#importChats').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const imported=JSON.parse(await file.text());if(!Array.isArray(imported.characters)||!Array.isArray(imported.rooms))throw new Error('Estructura incorrecta');if(!confirm('¿Reemplazar los chats y personajes locales con este archivo?'))return;saveChatState(imported);activeRoomId=imported.rooms[0]?.id||null;renderChat();showToast('Datos importados.');}catch(err){showToast('No se pudo importar: '+err.message);}e.target.value='';});
    $('#deleteLocalData').addEventListener('click',()=>{if(!confirm('Esto eliminará todos los personajes, conversaciones y preguntas guardados en este navegador. ¿Continuar?'))return;localStorage.removeItem(STORAGE.chats);localStorage.removeItem(STORAGE.ngl);activeRoomId=null;renderChat();renderNgl();showToast('Datos locales eliminados.');});
    $('#openPresentation').addEventListener('click',enterPresentation);
  }
  function openCharacterForm() {
    $('#genericModalContent').innerHTML=`<span class="eyebrow">NUEVA IDENTIDAD</span><h2>Crear personaje</h2><form id="characterCreateForm"><label>Nombre del personaje<input name="name" class="select-control" style="width:100%" required maxlength="60" placeholder="Nombre visible"></label><label>Usuario<input name="handle" class="select-control" style="width:100%" maxlength="30" placeholder="@personaje"></label><label>Reino<select name="kingdom" class="select-control" style="width:100%"><option value="">Sin especificar</option>${data.kingdoms.map(k=>`<option value="${safe(k.id)}">${safe(k.name)}</option>`).join('')}</select></label><label>Estilo de voz<input name="voice" class="select-control" style="width:100%" maxlength="100" placeholder="Sereno, impulsivo, alegre..."></label><div style="display:flex;justify-content:flex-end;margin-top:18px"><button class="button button-primary" type="submit">Crear personaje</button></div></form>`;
    $('#genericModal').hidden=false;
    $('#characterCreateForm').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const name=String(fd.get('name')).trim();let handle=String(fd.get('handle')).trim();if(!handle)handle='@'+name.toLowerCase().replace(/[^a-z0-9_]/g,'');if(!handle.startsWith('@'))handle='@'+handle;const state=getChatState();if(state.characters.length>=100){showToast('Has alcanzado el límite local de personajes.');return;}if(state.characters.some(c=>c.handle.toLowerCase()===handle.toLowerCase())){showToast('Ese nombre de usuario ya existe en este navegador.');return;}state.characters.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),name,handle,kingdom:String(fd.get('kingdom')),voiceStyle:String(fd.get('voice')),createdAt:new Date().toISOString()});saveChatState(state);$('#genericModal').hidden=true;showToast('Personaje creado.');});
  }
  function openRoomForm() {
    const state=getChatState();if(!state.characters.length){showToast('Primero crea al menos un personaje.');openCharacterForm();return;}
    $('#genericModalContent').innerHTML=`<span class="eyebrow">NUEVA CONVERSACIÓN</span><h2>Crear sala</h2><form id="roomCreateForm"><label>Nombre del chat<input name="name" class="select-control" style="width:100%" required maxlength="60" placeholder="Ej. Grupo de amigos"></label><label>Tipo<select name="type" class="select-control" style="width:100%"><option value="canon">Canon</option><option value="parallel">Paralelo</option><option value="ooc">Fuera de personaje (OOC)</option></select></label><fieldset style="border:1px solid var(--line);border-radius:13px;padding:13px;margin:14px 0"><legend>Participantes</legend><div class="tag-list" style="display:grid;grid-template-columns:repeat(2,1fr)">${state.characters.map(c=>`<label style="font-size:12px"><input type="checkbox" name="members" value="${safe(c.id)}"> ${safe(c.handle)} · ${safe(c.name)}</label>`).join('')}</div></fieldset><div style="display:flex;justify-content:flex-end"><button class="button button-primary" type="submit">Crear conversación</button></div></form>`;
    $('#genericModal').hidden=false;
    $('#roomCreateForm').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const members=fd.getAll('members');if(!members.length){showToast('Selecciona al menos un personaje.');return;}const latest=getChatState();if(latest.rooms.length>=50){showToast('Límite de 50 conversaciones locales alcanzado.');return;}const room={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),name:String(fd.get('name')).trim(),type:String(fd.get('type')),members,messages:[],createdAt:new Date().toISOString()};latest.rooms.push(room);saveChatState(latest);activeRoomId=room.id;renderChat();$('#genericModal').hidden=true;showToast('Conversación creada.');});
  }

  function bindPresentation() {
    $('#presentationButton').addEventListener('click',enterPresentation);
    $('#exitPresentation').addEventListener('click',exitPresentation);
    $('#presentationPrev').addEventListener('click',()=>movePresentation(-1));
    $('#presentationNext').addEventListener('click',()=>movePresentation(1));
    document.addEventListener('keydown',e=>{
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='p'){e.preventDefault();if($('#presentationOverlay').hidden)enterPresentation();else exitPresentation();}
      if(e.key==='Escape'&&!$('#presentationOverlay').hidden)exitPresentation();
    });
  }
  function enterPresentation() {
    if(!activeRoomId){showToast('Abre una conversación antes de activar la vista limpia.');showSection('herramientas');return;}
    const state=getChatState();const room=state.rooms.find(r=>r.id===activeRoomId);if(!room)return;
    $('#presentationRoomName').textContent=room.name;$('#presentationRoomMembers').textContent=room.members.map(id=>state.characters.find(c=>c.id===id)?.name).filter(Boolean).join(' · ');
    presentationIndex=0;renderPresentationMessages();$('#presentationOverlay').hidden=false;document.body.classList.add('presentation-active');
  }
  function renderPresentationMessages() {
    const state=getChatState();const room=state.rooms.find(r=>r.id===activeRoomId);if(!room)return;
    $('#presentationMessages').innerHTML=room.messages.map((m,index)=>{const ch=state.characters.find(c=>c.id===m.characterId);const mine=room.members.indexOf(m.characterId)>0;return `<div class="presentation-message ${mine?'mine':''}" data-presentation-index="${index}"><small>${safe(ch?.name||'Personaje')}${data.chatSystem.ui.timestamp?' · '+new Date(m.createdAt).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'}):''}</small>${safe(m.text)}</div>`;}).join('')||'<div class="empty-inline">Esta conversación todavía no tiene mensajes.</div>';
    $('#presentationMessages').scrollTop=$('#presentationMessages').scrollHeight;
  }
  function movePresentation(direction) {
    const state=getChatState();const room=state.rooms.find(r=>r.id===activeRoomId);if(!room||!room.messages.length)return;
    presentationIndex=Math.max(0,Math.min(room.messages.length-1,presentationIndex+direction));
    $$('.presentation-message').forEach(node=>node.classList.toggle('focus-message',Number(node.dataset.presentationIndex)===presentationIndex));
    const target=$(`[data-presentation-index="${presentationIndex}"]`,$('#presentationMessages'));
    target?.scrollIntoView({behavior:'smooth',block:'center'});
  }
  function exitPresentation() { $('#presentationOverlay').hidden=true;document.body.classList.remove('presentation-active'); }

  init();
})();
