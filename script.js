(function () {
  const API = '/api';
  let token = localStorage.getItem('dcd_token') || null;
  let me = null;
  let site = null;
  let events = [];
  let tab = 'contenido';

  function toast(msg) {
    const box = document.getElementById('toast-box');
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }
  async function api(path, opt = {}) {
    const headers = { 'Content-Type': 'application/json', ...(opt.headers || {}) };
    if (token) headers.Authorization = 'Bearer ' + token;
    const res = await fetch(API + path, { ...opt, headers });
    let data = {};
    try { data = await res.json(); } catch {}
    if (!res.ok) throw new Error(data.error || 'Error');
    return data;
  }
  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderSite() {
    if (!site) return;
    document.title = site.churchName;
    document.getElementById('brand-name').textContent = site.churchName;
    document.getElementById('hero-title').textContent = site.churchName;
    document.getElementById('hero-tagline').textContent = site.tagline || '';
    document.getElementById('hero-verse').textContent = site.heroVerse || '';
    document.getElementById('hero-ref').textContent = site.heroVerseRef || '';
    document.getElementById('about-text').textContent = site.about || '';
    document.getElementById('pastor-name').textContent = site.pastorName || '';
    document.getElementById('pastor-bio').textContent = site.pastorBio || '';
    document.getElementById('footer-name').textContent = site.churchName;
    document.getElementById('contact-address').textContent = site.address || 'Dirección pendiente';
    document.getElementById('contact-phone').textContent = site.phone || 'Se publicará desde el panel';
    document.getElementById('contact-email').textContent = site.email || 'Se publicará desde el panel';
    const social = [];
    if (site.whatsapp) social.push('WhatsApp: ' + site.whatsapp);
    if (site.facebook) social.push('Facebook: ' + site.facebook);
    if (site.instagram) social.push('Instagram: ' + site.instagram);
    document.getElementById('contact-social').textContent = social.join(' · ');
    const maps = document.getElementById('maps-link');
    if (site.mapsUrl) {
      maps.href = site.mapsUrl;
      maps.classList.remove('hidden');
    } else maps.classList.add('hidden');

    const photo = document.getElementById('pastor-photo');
    if (site.pastorImage) photo.innerHTML = '<img src="' + esc(site.pastorImage) + '" alt="Pastor">';
    else photo.textContent = '✝';

    const gal = document.getElementById('gallery');
    const imgs = (site.gallery || []).filter(Boolean);
    gal.innerHTML = imgs.length
      ? imgs.map((u) => '<img src="' + esc(u) + '" alt="Iglesia">').join('')
      : '<p class="lead">Puedes agregar fotos desde el panel (pega el enlace de la imagen).</p>';

    document.getElementById('schedule-grid').innerHTML = (site.schedule || []).map((s, i) => `
      <article class="card" style="animation-delay:${i * 70}ms">
        <p class="meta">${esc(s.day)} · ${esc(s.time)}</p>
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.place || '')}</p>
        <p>${esc(s.note || '')}</p>
      </article>`).join('');

    const verses = site.verses || [];
    const ticker = verses.map((v) => `${v.text} — ${v.ref}`).join('   ·   ');
    document.getElementById('verse-ticker').innerHTML = '<span>' + esc(ticker + '   ·   ' + ticker) + '</span>';

    const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.textContent = val; };
    set('nav-inicio', site.navInicio);
    set('nav-horarios', site.navHorarios);
    set('nav-eventos', site.navEventos);
    set('nav-nosotros', site.navNosotros);
    set('nav-oracion', site.navOracion);
    set('nav-contacto', site.navContacto);
    set('hero-eyebrow', site.heroEyebrow);
    set('btn-horarios', site.btnHorarios);
    set('btn-eventos', site.btnEventos);
    set('title-horarios', site.titleHorarios);
    set('lead-horarios', site.leadHorarios);
    set('title-eventos', site.titleEventos);
    set('lead-eventos', site.leadEventos);
    set('title-nosotros', site.titleNosotros);
    set('label-pastor', site.labelPastor);
    set('title-oracion', site.titleOracion);
    set('lead-oracion', site.leadOracion);
    set('title-contacto', site.titleContacto);
  }

  function renderEvents() {
    const box = document.getElementById('events-grid');
    if (!events.length) {
      box.innerHTML = '<p>Aún no hay eventos publicados.</p>';
      return;
    }
    box.innerHTML = events.map((e, i) => `
      <article class="card" style="animation-delay:${i * 70}ms">
        ${e.image ? '<img src="' + esc(e.image) + '" alt="">' : ''}
        <p class="meta">${esc(e.date || e.time || '')}</p>
        <h3>${esc(e.title)}</h3>
        <p>${esc(e.place || '')} ${e.address ? '· ' + esc(e.address) : ''}</p>
        <p>${esc(e.description || '')}</p>
      </article>`).join('');
  }

  function setLogged(on) {
    const mini = document.getElementById('auth-mini');
    if (on && me) {
      mini.innerHTML = '<button class="linkish" id="open-panel">Panel</button>';
      document.getElementById('open-panel').onclick = () => {
        document.getElementById('admin-panel').classList.remove('hidden');
        renderPanel();
      };
      document.getElementById('admin-who').textContent = me.name || me.username;
    } else {
      mini.innerHTML = '<button class="linkish" id="open-login">Acceso</button>';
      document.getElementById('open-login').onclick = openLogin;
    }
  }

  function openLogin() {
    document.getElementById('login-strip').classList.remove('hidden');
  }

  async function boot() {
    const status = await api('/status');
    if (!status.hasAdmin) document.getElementById('setup-strip').classList.remove('hidden');
    const s = await api('/site');
    site = s.site;
    const ev = await api('/events');
    events = ev.events || [];
    renderSite();
    renderEvents();
    if (token) {
      try {
        const m = await api('/me');
        me = m.user;
        setLogged(true);
      } catch {
        token = null;
        localStorage.removeItem('dcd_token');
        setLogged(false);
      }
    } else setLogged(false);
  }

  document.getElementById('hamburger').onclick = () => {
    document.getElementById('main-nav').classList.toggle('open');
  };
  document.getElementById('open-login') && (document.getElementById('open-login').onclick = openLogin);
  document.getElementById('close-login').onclick = () => document.getElementById('login-strip').classList.add('hidden');

  document.getElementById('login-strip').onsubmit = async (e) => {
    e.preventDefault();
    document.getElementById('login-err').textContent = '';
    try {
      const data = await api('/login', {
        method: 'POST',
        body: JSON.stringify({
          username: document.getElementById('login-user').value,
          password: document.getElementById('login-pass').value
        })
      });
      token = data.token;
      me = data.user;
      localStorage.setItem('dcd_token', token);
      document.getElementById('login-strip').classList.add('hidden');
      setLogged(true);
      document.getElementById('admin-panel').classList.remove('hidden');
      renderPanel();
      toast('Bienvenido, ' + me.name);
    } catch (err) {
      document.getElementById('login-err').textContent = err.message;
    }
  };

  document.getElementById('setup-strip').onsubmit = async (e) => {
    e.preventDefault();
    document.getElementById('setup-err').textContent = '';
    try {
      const data = await api('/setup', {
        method: 'POST',
        body: JSON.stringify({
          name: document.getElementById('setup-name').value,
          username: document.getElementById('setup-user').value,
          password: document.getElementById('setup-pass').value
        })
      });
      token = data.token;
      me = data.user;
      localStorage.setItem('dcd_token', token);
      document.getElementById('setup-strip').classList.add('hidden');
      setLogged(true);
      document.getElementById('admin-panel').classList.remove('hidden');
      renderPanel();
      toast('Administrador creado');
    } catch (err) {
      document.getElementById('setup-err').textContent = err.message;
    }
  };

  document.getElementById('logout-btn').onclick = async () => {
    try { await api('/logout', { method: 'POST' }); } catch {}
    token = null; me = null;
    localStorage.removeItem('dcd_token');
    document.getElementById('admin-panel').classList.add('hidden');
    setLogged(false);
    toast('Sesión cerrada');
  };
  document.getElementById('close-panel').onclick = () => document.getElementById('admin-panel').classList.add('hidden');

  document.querySelectorAll('.panel-tabs button').forEach((b) => {
    b.onclick = () => {
      document.querySelectorAll('.panel-tabs button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      tab = b.dataset.tab;
      renderPanel();
    };
  });

  document.getElementById('prayer-form').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api('/prayers', {
        method: 'POST',
        body: JSON.stringify({
          name: document.getElementById('prayer-name').value,
          message: document.getElementById('prayer-msg').value
        })
      });
      e.target.reset();
      toast('Petición enviada');
    } catch (err) {
      toast(err.message);
    }
  };

  function schRow(i, x) {
    x = x || {};
    return `<div class="prayer-row sch-item">
      <input class="sch-day" value="${esc(x.day || '')}" placeholder="Día (Lunes)">
      <input class="sch-time" value="${esc(x.time || '')}" placeholder="Hora">
      <input class="sch-title" value="${esc(x.title || '')}" placeholder="Nombre (ej. Estudio general)">
      <input class="sch-place" value="${esc(x.place || '')}" placeholder="Lugar">
      <input class="sch-note" value="${esc(x.note || '')}" placeholder="Nota">
    </div>`;
  }
  function verseRow(i, v) {
    v = v || {};
    return `<div class="prayer-row verse-item">
      <textarea class="v-text" rows="2" placeholder="Texto RVR">${esc(v.text || '')}</textarea>
      <input class="v-ref" value="${esc(v.ref || '')}" placeholder="Cita (ej. Juan 3:16 RVR 1909)">
    </div>`;
  }

  function field(id, label, val, area) {
    return `<label>${label}</label>${area
      ? `<textarea id="${id}" rows="3">${esc(val || '')}</textarea>`
      : `<input id="${id}" value="${esc(val || '')}">`}`;
  }

  async function renderPanel() {
    const body = document.getElementById('panel-body');
    if (tab === 'contenido') {
      const s = site || {};
      body.innerHTML = `
        ${field('f-name', 'Nombre de la iglesia', s.churchName)}
        ${field('f-tag', 'Frase', s.tagline)}
        ${field('f-pastor', 'Pastor', s.pastorName)}
        ${field('f-pbio', 'Bio del pastor', s.pastorBio, true)}
        ${field('f-pimg', 'Foto del pastor (URL de imagen)', s.pastorImage)}
        ${field('f-about', 'Quiénes somos', s.about, true)}
        ${field('f-verse', 'Versículo principal', s.heroVerse, true)}
        ${field('f-ref', 'Cita', s.heroVerseRef)}
        ${field('f-addr', 'Dirección', s.address)}
        ${field('f-maps', 'Link de Google Maps', s.mapsUrl)}
        ${field('f-phone', 'Teléfono', s.phone)}
        ${field('f-email', 'Correo', s.email)}
        ${field('f-wa', 'WhatsApp', s.whatsapp)}
        ${field('f-fb', 'Facebook', s.facebook)}
        ${field('f-ig', 'Instagram', s.instagram)}
        <h4>Nombres del menú y títulos (cámbialos todos)</h4>
        ${field('f-nav1', 'Menú: Inicio', s.navInicio || 'Inicio')}
        ${field('f-nav2', 'Menú: Horarios', s.navHorarios || 'Horarios')}
        ${field('f-nav3', 'Menú: Eventos', s.navEventos || 'Eventos')}
        ${field('f-nav4', 'Menú: Nosotros', s.navNosotros || 'Nosotros')}
        ${field('f-nav5', 'Menú: Oración', s.navOracion || 'Oración')}
        ${field('f-nav6', 'Menú: Contacto', s.navContacto || 'Contacto')}
        ${field('f-eye', 'Frase chica arriba', s.heroEyebrow || 'Iglesia en Durango')}
        ${field('f-bh', 'Botón horarios', s.btnHorarios || 'Ver horarios')}
        ${field('f-be', 'Botón eventos', s.btnEventos || 'Próximos eventos')}
        ${field('f-th', 'Título horarios', s.titleHorarios || 'Horarios de la semana')}
        ${field('f-lh', 'Texto bajo horarios', s.leadHorarios || '', true)}
        ${field('f-te', 'Título eventos', s.titleEventos || 'Próximos eventos')}
        ${field('f-le', 'Texto bajo eventos', s.leadEventos || '', true)}
        ${field('f-tn', 'Título nosotros', s.titleNosotros || 'Quiénes somos')}
        ${field('f-lp', 'Etiqueta pastor', s.labelPastor || 'Pastor')}
        ${field('f-to', 'Título oración', s.titleOracion || 'Peticiones de oración')}
        ${field('f-lo', 'Texto bajo oración', s.leadOracion || '', true)}
        ${field('f-tc', 'Título contacto', s.titleContacto || 'Contacto y ubicación')}
        ${field('f-gal', 'Galería (una URL de imagen por línea)', (s.gallery || []).join('\n'), true)}
        <h4>Versículos (Reina-Valera)</h4>
        <div id="verse-rows">${(s.verses || []).map((v, i) => verseRow(i, v)).join('')}</div>
        <p><button type="button" class="btn btn-ghost" id="add-verse">+ Versículo</button></p>
        <h4>Horarios (puedes cambiar cualquier nombre)</h4>
        <div id="sch-rows">${(s.schedule || []).map((x, i) => schRow(i, x)).join('')}</div>
        <p><button type="button" class="btn btn-ghost" id="add-sch">+ Horario</button></p>
        <p style="margin-top:1rem"><button class="btn btn-gold" id="save-site">Guardar contenido</button></p>`;
      document.getElementById('save-site').onclick = saveSite;
      document.getElementById('add-sch').onclick = () => {
        const box = document.getElementById('sch-rows');
        const i = box.children.length;
        box.insertAdjacentHTML('beforeend', schRow(i, { day: '', time: '', title: '', place: '', note: '' }));
      };
      document.getElementById('add-verse').onclick = () => {
        const box = document.getElementById('verse-rows');
        const i = box.children.length;
        box.insertAdjacentHTML('beforeend', verseRow(i, { text: '', ref: '' }));
      };
    }
    if (tab === 'eventos') {
      body.innerHTML = `
        <h4>Nuevo evento</h4>
        <input id="e-title" placeholder="Título">
        <input id="e-date" placeholder="Fecha (ej. 20 sep 2026)">
        <input id="e-time" placeholder="Hora">
        <input id="e-place" placeholder="Lugar">
        <input id="e-addr" placeholder="Dirección">
        <input id="e-img" placeholder="URL de imagen">
        <textarea id="e-desc" rows="3" placeholder="Descripción"></textarea>
        <p><button class="btn btn-gold" id="add-ev">Publicar evento</button></p>
        <h4>Eventos actuales</h4>
        <div id="ev-admin"></div>`;
      document.getElementById('ev-admin').innerHTML = events.map((e) => `
        <div class="prayer-row">
          <strong>${esc(e.title)}</strong><br>${esc(e.date)} ${esc(e.time)} · ${esc(e.place)}
          <div style="margin-top:.4rem">
            <button class="btn btn-danger" data-del="${e.id}">Eliminar</button>
          </div>
        </div>`).join('') || '<p>Sin eventos</p>';
      document.getElementById('add-ev').onclick = addEvent;
      body.querySelectorAll('[data-del]').forEach((b) => {
        b.onclick = async () => {
          if (!confirm('¿Eliminar evento?')) return;
          await api('/events/' + b.dataset.del, { method: 'DELETE' });
          events = (await api('/events')).events;
          renderEvents();
          renderPanel();
          toast('Evento eliminado');
        };
      });
    }
    if (tab === 'peticiones') {
      const data = await api('/prayers');
      body.innerHTML = (data.prayers || []).map((p) => `
        <div class="prayer-row">
          <strong>${esc(p.name)}</strong> · ${new Date(p.at).toLocaleString('es-MX')}<br>
          ${esc(p.message)}
          <div><button class="btn btn-danger" data-delp="${p.id}">Quitar</button></div>
        </div>`).join('') || '<p>No hay peticiones todavía.</p>';
      body.querySelectorAll('[data-delp]').forEach((b) => {
        b.onclick = async () => {
          await api('/prayers/' + b.dataset.delp, { method: 'DELETE' });
          renderPanel();
        };
      });
    }
    if (tab === 'visitas') {
      const data = await api('/visits');
      body.innerHTML = '<p>Últimas visitas a la página (IP y navegador).</p>' +
        (data.visits || []).map((v) => `
          <div class="visit-row">
            ${new Date(v.at).toLocaleString('es-MX')} · IP ${esc(v.ip)} · ${esc(v.path)}<br>
            <span style="opacity:.7">${esc(v.ua)}</span>
          </div>`).join('') || '<p>Aún no hay visitas registradas.</p>';
    }
  }

  async function saveSite() {
    const schedule = [...document.querySelectorAll('.sch-item')].map((row) => ({
      day: row.querySelector('.sch-day').value.trim(),
      time: row.querySelector('.sch-time').value.trim(),
      title: row.querySelector('.sch-title').value.trim(),
      place: row.querySelector('.sch-place').value.trim(),
      note: row.querySelector('.sch-note').value.trim()
    })).filter((x) => x.title || x.day);
    const verses = [...document.querySelectorAll('.verse-item')].map((row) => ({
      text: row.querySelector('.v-text').value.trim(),
      ref: row.querySelector('.v-ref').value.trim()
    })).filter((x) => x.text);
    const gallery = document.getElementById('f-gal').value.split('\n').map((x) => x.trim()).filter(Boolean);
    site = (await api('/site', {
      method: 'PUT',
      body: JSON.stringify({
        churchName: document.getElementById('f-name').value,
        tagline: document.getElementById('f-tag').value,
        pastorName: document.getElementById('f-pastor').value,
        pastorBio: document.getElementById('f-pbio').value,
        pastorImage: document.getElementById('f-pimg').value,
        about: document.getElementById('f-about').value,
        heroVerse: document.getElementById('f-verse').value,
        heroVerseRef: document.getElementById('f-ref').value,
        address: document.getElementById('f-addr').value,
        mapsUrl: document.getElementById('f-maps').value,
        phone: document.getElementById('f-phone').value,
        email: document.getElementById('f-email').value,
        whatsapp: document.getElementById('f-wa').value,
        facebook: document.getElementById('f-fb').value,
        instagram: document.getElementById('f-ig').value,
        navInicio: document.getElementById('f-nav1').value,
        navHorarios: document.getElementById('f-nav2').value,
        navEventos: document.getElementById('f-nav3').value,
        navNosotros: document.getElementById('f-nav4').value,
        navOracion: document.getElementById('f-nav5').value,
        navContacto: document.getElementById('f-nav6').value,
        heroEyebrow: document.getElementById('f-eye').value,
        btnHorarios: document.getElementById('f-bh').value,
        btnEventos: document.getElementById('f-be').value,
        titleHorarios: document.getElementById('f-th').value,
        leadHorarios: document.getElementById('f-lh').value,
        titleEventos: document.getElementById('f-te').value,
        leadEventos: document.getElementById('f-le').value,
        titleNosotros: document.getElementById('f-tn').value,
        labelPastor: document.getElementById('f-lp').value,
        titleOracion: document.getElementById('f-to').value,
        leadOracion: document.getElementById('f-lo').value,
        titleContacto: document.getElementById('f-tc').value,
        gallery, schedule, verses
      })
    })).site;
    renderSite();
    toast('Contenido guardado. Todos lo verán.');
  }

  async function addEvent() {
    await api('/events', {
      method: 'POST',
      body: JSON.stringify({
        title: document.getElementById('e-title').value,
        date: document.getElementById('e-date').value,
        time: document.getElementById('e-time').value,
        place: document.getElementById('e-place').value,
        address: document.getElementById('e-addr').value,
        image: document.getElementById('e-img').value,
        description: document.getElementById('e-desc').value
      })
    });
    events = (await api('/events')).events;
    renderEvents();
    renderPanel();
    toast('Evento publicado');
  }

  boot().catch((e) => toast(e.message));
})();
