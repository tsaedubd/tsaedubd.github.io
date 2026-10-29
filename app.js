'use strict';
/* ============================================================
   The Sun Academy LMS — app.js
   Login (Academy ID + মোবাইল) · রুটিন · পরীক্ষা · PDF · হাজিরা · সদস্য
   ============================================================ */
const CFG = window.TSA_CONFIG || {};
const app = document.getElementById('app');
let sb = null, tmpClient = null;
const S = { me: null, batches: [], f: {} };

const DAYS = ['শনিবার', 'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার'];
const ROLE_BN = { admin: 'অ্যাডমিন', teacher: 'শিক্ষক', student: 'শিক্ষার্থী' };
const STATUS_BN = { present: 'উপস্থিত', absent: 'অনুপস্থিত', late: 'দেরি' };
const BN_DIG = '০১২৩৪৫৬৭৮৯';
const MAX_FILE = 50 * 1024 * 1024; // Supabase free: ৫০ MB / ফাইল

/* ---------- helpers ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const val = (f, n) => (f.elements[n]?.value ?? '').trim();
const enDigits = s => String(s ?? '').replace(/[০-৯]/g, d => BN_DIG.indexOf(d));
const normId = s => enDigits(s).trim().toLowerCase().replace(/\s+/g, '');
function normPhone(s) {
  let p = enDigits(s).replace(/\D/g, '');
  if (p.startsWith('880') && p.length === 13) p = '0' + p.slice(3);
  return p;
}
const idToEmail = id => `${id}@${CFG.EMAIL_DOMAIN}`;
const pad = n => String(n).padStart(2, '0');
const todayStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isStaff = () => ['admin', 'teacher'].includes(S.me?.role);
const isAdmin = () => S.me?.role === 'admin';
const batchName = id => (id == null ? 'সব ব্যাচ' : (S.batches.find(b => b.id === id)?.name || '—'));
const todayIdx = () => (new Date().getDay() + 1) % 7; // শনিবার = 0

function fmtDate(s, opts) {
  if (!s) return '';
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('bn-BD', opts || { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtTime(t) {
  if (!t) return '';
  let [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${pad(m)} ${ap}`;
}
function daysLeft(s) {
  const [y, m, d] = s.split('-').map(Number);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const n = Math.round((new Date(y, m - 1, d) - t) / 86400000);
  if (n < 0) return '<span class="tag navy">শেষ</span>';
  if (n === 0) return '<span class="tag red">আজ</span>';
  if (n === 1) return '<span class="tag red">আগামীকাল</span>';
  return `<span class="tag">${n} দিন বাকি</span>`;
}
function toast(msg, bad = false) {
  const t = document.createElement('div');
  t.className = 'toast' + (bad ? ' bad' : '');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
function fail(err) { console.error(err); toast('সমস্যা: ' + (err?.message || err), true); }
const card = (inner, cls = '') => `<section class="card ${cls}">${inner}</section>`;
const empty = t => `<p class="empty">${esc(t)}</p>`;
const stat = (n, label) => `<div class="stat"><b>${esc(n)}</b><span>${esc(label)}</span></div>`;
const logoImg = (cls = '') => `<img class="logo ${cls}" src="logo.png" alt="" onerror="this.remove()">`;
function batchOptions(sel, o = {}) {
  let h = o.all ? '<option value="">সব ব্যাচ</option>' : o.none ? '<option value="">— ব্যাচ নেই —</option>' : '';
  for (const b of S.batches) h += `<option value="${b.id}" ${String(b.id) === String(sel ?? '') ? 'selected' : ''}>${esc(b.name)}</option>`;
  return h;
}
const numOrNull = v => (v === '' || v == null ? null : Number(v));
function attSummary(rows) {
  const s = { total: rows.length, present: 0, absent: 0, late: 0 };
  rows.forEach(r => { s[r.status]++; });
  s.pct = s.total ? Math.round((s.present + s.late) * 100 / s.total) : 0;
  return s;
}
function openDialog(html, onMount) {
  const d = document.createElement('dialog');
  d.className = 'dlg';
  d.innerHTML = html;
  document.body.appendChild(d);
  d.addEventListener('close', () => d.remove());
  d.showModal();
  onMount(d);
}
async function busy(btn, text, fn) {
  const old = btn.textContent;
  btn.disabled = true; btn.textContent = text;
  try { await fn(); } finally { if (btn.isConnected) { btn.disabled = false; btn.textContent = old; } }
}
function bindDelete(el, table, msg = 'মুছে ফেলবে?') {
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if (!confirm(msg)) return;
    const { error } = await sb.from(table).delete().eq('id', b.dataset.del);
    if (error) return fail(error);
    toast('মুছে ফেলা হয়েছে'); route();
  });
}

/* ---------- start ---------- */
async function init() {
  if (!window.supabase) { app.innerHTML = `<main>${card('<h3>সংযোগ হয়নি</h3><p>ইন্টারনেট চেক করে পেজটা আবার খোলো।</p>')}</main>`; return; }
  if (!CFG.SUPABASE_URL || CFG.SUPABASE_URL.includes('YOUR')) {
    app.innerHTML = `<main>${card('<h3>সেটআপ বাকি</h3><p><b>config.js</b> ফাইলে Supabase URL আর anon key বসাও (README-র ধাপ ৬)।</p>')}</main>`;
    return;
  }
  sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
  const { data: { session } } = await sb.auth.getSession();
  if (session) await loadMe(session.user); else renderLogin();
}

function renderLogin(msg = '') {
  app.innerHTML = `<div class="login-wrap">
    <form class="card login" id="lf">
      ${logoImg('big')}
      <h1>${esc(CFG.ACADEMY_NAME)}</h1>
      <p class="muted">শিক্ষার্থী ও শিক্ষক লগইন</p>
      ${msg ? `<div class="alert">${esc(msg)}</div>` : ''}
      <label>Academy ID<input name="aid" required autocomplete="username" autocapitalize="none" autocorrect="off" placeholder="যেমন: tsa2601"></label>
      <label>মোবাইল নম্বর<input name="phone" type="password" required inputmode="numeric" autocomplete="current-password" placeholder="01XXXXXXXXX"></label>
      <button class="primary" type="submit">লগইন</button>
    </form>
    <p class="foot muted">${esc(CFG.ADDRESS || '')}</p>
  </div>`;
  const f = document.getElementById('lf');
  f.onsubmit = async e => {
    e.preventDefault();
    const btn = f.querySelector('button');
    btn.disabled = true; btn.textContent = 'অপেক্ষা করো…';
    const { data, error } = await sb.auth.signInWithPassword({ email: idToEmail(normId(val(f, 'aid'))), password: normPhone(val(f, 'phone')) });
    if (error) {
      renderLogin(/invalid/i.test(error.message) ? 'Academy ID বা মোবাইল নম্বর ভুল হয়েছে।' : 'লগইন হয়নি: ' + error.message);
      return;
    }
    await loadMe(data.user);
  };
}

async function loadBatches() {
  const { data, error } = await sb.from('batches').select('*').order('name');
  if (error) throw error;
  S.batches = data;
}

async function loadMe(user) {
  const { data, error } = await sb.from('members').select('*').eq('id', user.id).maybeSingle();
  if (error || !data) {
    await sb.auth.signOut();
    renderLogin(error ? 'সংযোগে সমস্যা: ' + error.message : 'এই অ্যাকাউন্টটি রেজিস্টার্ড নয়। অ্যাডমিনের সাথে যোগাযোগ করো।');
    return;
  }
  S.me = data;
  try { await loadBatches(); } catch (e) { fail(e); }
  window.onhashchange = route;
  route();
}

/* ---------- shell + routing ---------- */
const VIEWS = {
  home:       { label: 'হোম',     fn: viewHome },
  routine:    { label: 'রুটিন',    fn: viewRoutine },
  exams:      { label: 'পরীক্ষা',   fn: viewExams },
  pdf:        { label: 'PDF',     fn: viewPdf },
  attendance: { label: 'হাজিরা',   fn: viewAttendance },
  members:    { label: 'সদস্য',    fn: viewMembers, admin: true },
};

function renderShell(active) {
  const tabs = Object.entries(VIEWS).filter(([, v]) => !v.admin || isAdmin())
    .map(([k, v]) => `<a href="#${k}" class="${k === active ? 'on' : ''}">${v.label}</a>`).join('');
  const sub = ROLE_BN[S.me.role] + (S.me.role === 'student' && S.me.batch_id ? ' · ' + batchName(S.me.batch_id) : '');
  app.innerHTML = `
    <header class="top">
      <div class="brand">${logoImg()}<div><b>${esc(CFG.ACADEMY_NAME)}</b><small>LMS</small></div></div>
      <div class="who"><span>${esc(S.me.name)}<small>${esc(sub)}</small></span><button class="ghost" id="logout">লগআউট</button></div>
    </header>
    <nav class="tabs">${tabs}</nav>
    <main id="view"><div class="loading">লোড হচ্ছে…</div></main>`;
  document.getElementById('logout').onclick = async () => {
    await sb.auth.signOut(); S.me = null; S.f = {};
    history.replaceState(null, '', location.pathname);
    renderLogin();
  };
}

async function route() {
  if (!S.me) return;
  let v = location.hash.slice(1) || 'home';
  if (!VIEWS[v] || (VIEWS[v].admin && !isAdmin())) v = 'home';
  renderShell(v);
  const el = document.getElementById('view');
  try { await VIEWS[v].fn(el); } catch (e) { el.innerHTML = card(empty('লোড করা যায়নি। আবার চেষ্টা করো।')); fail(e); }
}

/* ---------- shared rows ---------- */
const routineRow = (x, showBatch, delBtn) => `<div class="row">
  <span class="time">${fmtTime(x.start_time)}${x.end_time ? ' – ' + fmtTime(x.end_time) : ''}</span>
  <span class="grow"><b>${esc(x.subject)}</b>${x.teacher ? `<small>${esc(x.teacher)}</small>` : ''}</span>
  ${showBatch ? `<span class="tag navy">${esc(batchName(x.batch_id))}</span>` : ''}
  ${delBtn ? `<button class="danger" data-del="${x.id}">মুছুন</button>` : ''}
</div>`;

const examRow = (x, showBatch, delBtn) => `<div class="row">
  <span class="grow"><b>${esc(x.title)}</b>
    <small>${esc([x.subject, fmtDate(x.exam_date), x.start_time ? fmtTime(x.start_time) : '', x.full_marks ? 'পূর্ণমান ' + x.full_marks : ''].filter(Boolean).join(' · '))}</small>
    ${x.syllabus ? `<small>সিলেবাস: ${esc(x.syllabus)}</small>` : ''}
    ${showBatch ? `<span class="tag navy">${esc(batchName(x.batch_id))}</span>` : ''}
  </span>
  ${daysLeft(x.exam_date)}
  ${delBtn ? `<button class="danger" data-del="${x.id}">মুছুন</button>` : ''}
</div>`;

/* ---------- হোম ---------- */
async function viewHome(el) {
  const me = S.me, student = me.role === 'student', td = todayIdx();
  const res = await Promise.all([
    sb.from('routines').select('*').eq('day', td).order('start_time'),
    sb.from('exams').select('*').gte('exam_date', todayStr()).order('exam_date').limit(5),
    sb.from('materials').select('id,title,subject,batch_id,created_at').order('created_at', { ascending: false }).limit(5),
    student ? sb.from('attendance').select('status').eq('student_id', me.id) : Promise.resolve({ data: [] }),
  ]);
  const bad = res.find(x => x.error); if (bad) throw bad.error;
  const [r, e, m, a] = res.map(x => x.data);

  let html = `<div class="hello"><h2>হ্যালো, ${esc(me.name)}</h2><p class="muted">${fmtDate(todayStr())}</p></div>`;
  if (student) {
    const s = attSummary(a);
    if (!me.batch_id) html += `<div class="note">তোমাকে এখনো কোনো ব্যাচে যোগ করা হয়নি। অ্যাডমিনকে জানাও।</div>`;
    html += `<div class="stats">${stat(s.total ? s.pct + '%' : '—', 'উপস্থিতি')}${stat(s.present + s.late, 'উপস্থিত দিন')}${stat(s.absent, 'অনুপস্থিত দিন')}</div>`;
  }
  html += card(`<h3>আজকের ক্লাস · ${DAYS[td]}</h3>${r.length ? r.map(x => routineRow(x, !student)).join('') : empty('আজ কোনো ক্লাস নেই')}`);
  html += card(`<h3>সামনের পরীক্ষা</h3>${e.length ? e.map(x => examRow(x, !student)).join('') : empty('সামনে কোনো পরীক্ষা নেই')}<a href="#exams">সব পরীক্ষা →</a>`);
  html += card(`<h3>নতুন PDF</h3>${m.length ? m.map(x => `<div class="row"><span class="grow"><b>${esc(x.title)}</b><small>${esc([x.subject, fmtDate(x.created_at.slice(0, 10))].filter(Boolean).join(' · '))}</small></span></div>`).join('') : empty('এখনো কোনো PDF নেই')}<a href="#pdf">সব PDF →</a>`);
  el.innerHTML = html;
}

/* ---------- রুটিন ---------- */
async function viewRoutine(el) {
  const staff = isStaff();
  const bid = staff ? (S.f.rBatch ?? S.batches[0]?.id) : S.me.batch_id;
  if (!bid) {
    el.innerHTML = card(empty(staff ? (isAdmin() ? 'আগে "সদস্য" ট্যাব থেকে একটি ব্যাচ তৈরি করো।' : 'এখনো কোনো ব্যাচ তৈরি হয়নি।') : 'তোমাকে এখনো কোনো ব্যাচে যোগ করা হয়নি।'));
    return;
  }
  const { data, error } = await sb.from('routines').select('*').eq('batch_id', bid).order('day').order('start_time');
  if (error) throw error;
  const td = todayIdx();

  let html = staff
    ? `<div class="toolbar"><label>ব্যাচ<select id="rb">${batchOptions(bid)}</select></label></div>`
    : `<h2>সাপ্তাহিক রুটিন · ${esc(batchName(bid))}</h2>`;
  html += `<div class="daygrid">${DAYS.map((d, i) => {
    const items = data.filter(x => x.day === i);
    return card(`<h3>${d}${i === td ? '<span class="tag">আজ</span>' : ''}</h3>${items.length ? items.map(x => routineRow(x, false, staff)).join('') : empty('ক্লাস নেই')}`, 'day' + (i === td ? ' today' : ''));
  }).join('')}</div>`;

  if (staff) html += card(`<h3>নতুন ক্লাস যোগ করো · ${esc(batchName(bid))}</h3>
    <form id="rf" class="grid">
      <label>দিন<select name="day">${DAYS.map((d, i) => `<option value="${i}">${d}</option>`).join('')}</select></label>
      <label>শুরু<input name="st" type="time" required></label>
      <label>শেষ<input name="et" type="time"></label>
      <label>বিষয়<input name="subject" required placeholder="পদার্থবিজ্ঞান"></label>
      <label>শিক্ষক<input name="teacher" placeholder="শিক্ষকের নাম"></label>
      <button class="primary">যোগ করো</button>
    </form>`);
  el.innerHTML = html;

  if (!staff) return;
  el.querySelector('#rb').onchange = e => { S.f.rBatch = Number(e.target.value); route(); };
  const f = el.querySelector('#rf');
  f.onsubmit = async e => {
    e.preventDefault();
    await busy(f.querySelector('button'), 'যোগ হচ্ছে…', async () => {
      const { error } = await sb.from('routines').insert({
        batch_id: bid, day: Number(val(f, 'day')), start_time: val(f, 'st'), end_time: val(f, 'et') || null,
        subject: val(f, 'subject'), teacher: val(f, 'teacher') || null,
      });
      if (error) return fail(error);
      toast('ক্লাস যোগ হয়েছে'); S.f.rBatch = bid; route();
    });
  };
  bindDelete(el, 'routines', 'এই ক্লাসটি রুটিন থেকে মুছে ফেলবে?');
}

/* ---------- পরীক্ষা ---------- */
async function viewExams(el) {
  const staff = isStaff();
  let q = sb.from('exams').select('*').order('exam_date');
  if (staff && S.f.eBatch) q = q.eq('batch_id', S.f.eBatch);
  const { data, error } = await q;
  if (error) throw error;
  const t = todayStr();
  const up = data.filter(x => x.exam_date >= t);
  const past = data.filter(x => x.exam_date < t).reverse().slice(0, 30);
  const showBatch = staff && !S.f.eBatch;

  let html = staff ? `<div class="toolbar"><label>ব্যাচ<select id="eb">${batchOptions(S.f.eBatch, { all: true })}</select></label></div>` : '';
  html += card(`<h3>সামনের পরীক্ষা</h3>${up.length ? up.map(x => examRow(x, showBatch, staff)).join('') : empty('সামনে কোনো পরীক্ষা নেই')}`);
  if (staff && S.batches.length) html += card(`<h3>নতুন পরীক্ষা যোগ করো</h3>
    <form id="ef" class="grid">
      <label>ব্যাচ<select name="batch" required>${batchOptions(S.f.eBatch || S.batches[0]?.id)}</select></label>
      <label>পরীক্ষার নাম<input name="etitle" required placeholder="সাপ্তাহিক পরীক্ষা ১"></label>
      <label>বিষয়<input name="subject" placeholder="পদার্থবিজ্ঞান"></label>
      <label>তারিখ<input name="date" type="date" required></label>
      <label>সময়<input name="time" type="time"></label>
      <label>পূর্ণমান<input name="marks" type="number" min="0" inputmode="numeric"></label>
      <label class="wide">সিলেবাস<textarea name="syllabus" placeholder="অধ্যায় ১, ২…"></textarea></label>
      <button class="primary">যোগ করো</button>
    </form>`);
  html += card(`<h3>আগের পরীক্ষা</h3>${past.length ? past.map(x => examRow(x, showBatch, staff)).join('') : empty('এখনো কিছু নেই')}`);
  el.innerHTML = html;

  if (!staff) return;
  el.querySelector('#eb').onchange = e => { S.f.eBatch = numOrNull(e.target.value); route(); };
  const f = el.querySelector('#ef');
  if (f) f.onsubmit = async e => {
    e.preventDefault();
    await busy(f.querySelector('button'), 'যোগ হচ্ছে…', async () => {
      const { error } = await sb.from('exams').insert({
        batch_id: Number(val(f, 'batch')), title: val(f, 'etitle'), subject: val(f, 'subject') || null,
        exam_date: val(f, 'date'), start_time: val(f, 'time') || null,
        full_marks: numOrNull(val(f, 'marks')), syllabus: val(f, 'syllabus') || null,
      });
      if (error) return fail(error);
      toast('পরীক্ষা যোগ হয়েছে'); route();
    });
  };
  bindDelete(el, 'exams', 'এই পরীক্ষাটি মুছে ফেলবে?');
}

/* ---------- PDF ---------- */
async function viewPdf(el) {
  const staff = isStaff();
  let q = sb.from('materials').select('*').order('created_at', { ascending: false });
  if (staff && S.f.pBatch) q = q.or(`batch_id.eq.${S.f.pBatch},batch_id.is.null`);
  const { data, error } = await q;
  if (error) throw error;

  const urls = {};
  if (data.length) {
    const { data: signed, error: se } = await sb.storage.from('materials').createSignedUrls(data.map(x => x.file_path), 3600);
    if (se) fail(se); else (signed || []).forEach(s => { if (s.signedUrl) urls[s.path] = s.signedUrl; });
  }
  const search = (S.f.pq || '').toLowerCase();
  const rows = data.filter(x => !search || (x.title + ' ' + (x.subject || '')).toLowerCase().includes(search));

  let html = `<div class="toolbar">
    ${staff ? `<label>ব্যাচ<select id="pb">${batchOptions(S.f.pBatch, { all: true })}</select></label>` : ''}
    <label>খোঁজো<input id="pq" value="${esc(S.f.pq || '')}" placeholder="নাম বা বিষয়"></label></div>`;
  if (staff) html += card(`<h3>PDF আপলোড করো</h3>
    <form id="pf" class="grid">
      <label>শিরোনাম<input name="ptitle" required placeholder="অধ্যায় ৩ নোট"></label>
      <label>বিষয়<input name="subject" placeholder="পদার্থবিজ্ঞান"></label>
      <label>কোন ব্যাচ<select name="batch">${batchOptions(S.f.pBatch, { all: true })}</select></label>
      <label>ফাইল (সর্বোচ্চ ৫০ MB)<input name="file" type="file" accept="application/pdf,.pdf,image/*" required></label>
      <button class="primary">আপলোড</button>
    </form>`);
  html += card(`<h3>সব PDF (${rows.length})</h3>${rows.length ? rows.map(x => `<div class="row">
      <span class="grow"><b>${esc(x.title)}</b>
        <small>${esc([x.subject, fmtDate(x.created_at.slice(0, 10)), staff ? batchName(x.batch_id) : ''].filter(Boolean).join(' · '))}</small></span>
      ${urls[x.file_path] ? `<a class="btn sun small" href="${esc(urls[x.file_path])}" target="_blank" rel="noopener">খুলো</a>` : '<span class="muted">ফাইল নেই</span>'}
      ${staff ? `<button class="danger" data-delpdf="${x.id}">মুছুন</button>` : ''}
    </div>`).join('') : empty('কোনো PDF পাওয়া যায়নি')}`);
  el.innerHTML = html;

  const pq = el.querySelector('#pq');
  pq.onchange = () => { S.f.pq = pq.value; route(); };
  if (!staff) return;
  el.querySelector('#pb').onchange = e => { S.f.pBatch = numOrNull(e.target.value); route(); };

  const f = el.querySelector('#pf');
  f.onsubmit = async e => {
    e.preventDefault();
    const file = f.elements.file.files[0];
    if (!file) return;
    if (file.size > MAX_FILE) return toast('ফাইলটা ৫০ MB-এর বেশি। ছোট করে আপলোড করো।', true);
    await busy(f.querySelector('button'), 'আপলোড হচ্ছে…', async () => {
      const batch_id = numOrNull(val(f, 'batch'));
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
      const path = `${batch_id ?? 'all'}/${Date.now()}-${safe}`;
      const up = await sb.storage.from('materials').upload(path, file, { contentType: file.type || 'application/pdf', upsert: false });
      if (up.error) return fail(up.error);
      const { error } = await sb.from('materials').insert({
        batch_id, title: val(f, 'ptitle'), subject: val(f, 'subject') || null,
        file_path: path, file_name: file.name, uploaded_by: S.me.id,
      });
      if (error) { await sb.storage.from('materials').remove([path]); return fail(error); }
      toast('আপলোড হয়েছে'); route();
    });
  };
  el.querySelectorAll('[data-delpdf]').forEach(b => b.onclick = async () => {
    if (!confirm('এই PDF মুছে ফেলবে?')) return;
    const item = data.find(x => String(x.id) === b.dataset.delpdf);
    const rm = await sb.storage.from('materials').remove([item.file_path]);
    if (rm.error) return fail(rm.error);
    const { error } = await sb.from('materials').delete().eq('id', item.id);
    if (error) return fail(error);
    toast('মুছে ফেলা হয়েছে'); route();
  });
}

/* ---------- হাজিরা ---------- */
async function viewAttendance(el) {
  if (!isStaff()) return viewMyAttendance(el);
  const mode = S.f.aMode || 'take';
  const bid = S.f.aBatch ?? S.batches[0]?.id;
  const tabs = `<div class="seg-tabs"><a href="#attendance" data-mode="take" class="${mode === 'take' ? 'on' : ''}">হাজিরা নাও</a><a href="#attendance" data-mode="report" class="${mode === 'report' ? 'on' : ''}">মাসিক রিপোর্ট</a></div>`;
  if (!bid) { el.innerHTML = tabs + card(empty('আগে একটি ব্যাচ তৈরি করো।')); return; }

  const { data: students, error } = await sb.from('members').select('id,name,academy_id').eq('role', 'student').eq('batch_id', bid).order('academy_id');
  if (error) throw error;
  const ids = students.map(s => s.id);

  if (mode === 'take') {
    const date = S.f.aDate || todayStr();
    let recs = [];
    if (ids.length) {
      const r = await sb.from('attendance').select('student_id,status').in('student_id', ids).eq('att_date', date);
      if (r.error) throw r.error;
      recs = r.data;
    }
    const saved = Object.fromEntries(recs.map(r => [r.student_id, r.status]));
    const marks = Object.fromEntries(students.map(s => [s.id, saved[s.id] || 'present']));
    const done = recs.length > 0;

    el.innerHTML = tabs + `<div class="toolbar">
        <label>ব্যাচ<select id="ab">${batchOptions(bid)}</select></label>
        <label>তারিখ<input id="ad" type="date" value="${date}" max="${todayStr()}"></label></div>` +
      card(`<h3>${esc(batchName(bid))} · ${fmtDate(date)}</h3>
        <div class="note">${done ? 'এই দিনের হাজিরা সেভ করা আছে। বদলে আবার সেভ করতে পারো।' : 'এই দিনের হাজিরা এখনো নেওয়া হয়নি। সবাই "উপস্থিত" ধরা আছে — যারা আসেনি তাদের বদলাও।'}</div>
        <div class="counts" id="cnt"></div>
        <div id="list">${students.length ? students.map(s => `<div class="att-row" data-id="${s.id}">
            <span><b>${esc(s.name)}</b><small>${esc(s.academy_id)}</small></span>
            <span class="seg">${['present', 'absent', 'late'].map(k => `<button type="button" data-s="${k}">${STATUS_BN[k]}</button>`).join('')}</span>
          </div>`).join('') : empty('এই ব্যাচে কোনো শিক্ষার্থী নেই')}</div>
        ${students.length ? `<div class="savebar"><button class="light" id="allp">সবাই উপস্থিত</button><button class="primary" id="save">সেভ করো</button></div>` : ''}`);

    const paint = () => {
      el.querySelectorAll('.att-row').forEach(row => row.querySelectorAll('button').forEach(b => {
        const on = marks[row.dataset.id] === b.dataset.s;
        b.className = on ? 'on ' + b.dataset.s : '';
      }));
      const c = { present: 0, absent: 0, late: 0 }; Object.values(marks).forEach(v => c[v]++);
      el.querySelector('#cnt').innerHTML = ['present', 'absent', 'late'].map(k => `<span class="pill ${k}">${STATUS_BN[k]}: ${c[k]}</span>`).join('');
    };
    paint();
    el.querySelector('#ab').onchange = e => { S.f.aBatch = Number(e.target.value); route(); };
    el.querySelector('#ad').onchange = e => { S.f.aDate = e.target.value || todayStr(); route(); };
    el.querySelectorAll('.att-row').forEach(row => row.querySelectorAll('button').forEach(b => b.onclick = () => { marks[row.dataset.id] = b.dataset.s; paint(); }));
    const allp = el.querySelector('#allp');
    if (allp) allp.onclick = () => { ids.forEach(id => { marks[id] = 'present'; }); paint(); };
    const save = el.querySelector('#save');
    if (save) save.onclick = () => busy(save, 'সেভ হচ্ছে…', async () => {
      const rows = students.map(s => ({ student_id: s.id, batch_id: bid, att_date: date, status: marks[s.id], marked_by: S.me.id }));
      const { error: e2 } = await sb.from('attendance').upsert(rows, { onConflict: 'student_id,att_date' });
      if (e2) return fail(e2);
      toast('হাজিরা সেভ হয়েছে ✓'); route();
    });
  } else {
    const month = S.f.aMonth || todayStr().slice(0, 7);
    const [y, m] = month.split('-').map(Number);
    const end = m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01`;
    let recs = [];
    if (ids.length) {
      const r = await sb.from('attendance').select('student_id,status,att_date').in('student_id', ids).gte('att_date', `${month}-01`).lt('att_date', end);
      if (r.error) throw r.error;
      recs = r.data;
    }
    const days = new Set(recs.map(r => r.att_date)).size;
    const rows = students.map(s => ({ s, sum: attSummary(recs.filter(r => r.student_id === s.id)) }));
    el.innerHTML = tabs + `<div class="toolbar">
        <label>ব্যাচ<select id="ab">${batchOptions(bid)}</select></label>
        <label>মাস<input id="am" type="month" value="${month}"></label></div>` +
      card(`<h3>${esc(batchName(bid))} · ${fmtDate(month + '-01', { month: 'long', year: 'numeric' })}</h3>
        <p class="muted">মোট ক্লাসের দিন: ${days}</p>
        ${rows.length ? `<div class="tbl-wrap"><table><thead><tr><th>নাম</th><th>উপস্থিত</th><th>অনুপস্থিত</th><th>দেরি</th><th>%</th></tr></thead><tbody>
          ${rows.map(({ s, sum }) => `<tr><td><b>${esc(s.name)}</b><small>${esc(s.academy_id)}</small></td><td>${sum.present}</td><td>${sum.absent}</td><td>${sum.late}</td>
            <td class="${sum.total && sum.pct < 75 ? 'low' : ''}">${sum.total ? sum.pct + '%' : '—'}</td></tr>`).join('')}
        </tbody></table></div><p class="hint">৭৫%-এর কম উপস্থিতি লাল রঙে দেখানো হয়েছে।</p>` : empty('এই ব্যাচে কোনো শিক্ষার্থী নেই')}`);
    el.querySelector('#ab').onchange = e => { S.f.aBatch = Number(e.target.value); route(); };
    el.querySelector('#am').onchange = e => { if (/^\d{4}-\d{2}$/.test(e.target.value)) { S.f.aMonth = e.target.value; route(); } };
  }
  el.querySelectorAll('[data-mode]').forEach(a => a.onclick = ev => { ev.preventDefault(); S.f.aMode = a.dataset.mode; route(); });
}

async function viewMyAttendance(el) {
  const { data, error } = await sb.from('attendance').select('att_date,status').eq('student_id', S.me.id).order('att_date', { ascending: false });
  if (error) throw error;
  const all = attSummary(data);
  const mon = attSummary(data.filter(r => r.att_date.startsWith(todayStr().slice(0, 7))));
  el.innerHTML = `<div class="stats">${stat(all.total ? all.pct + '%' : '—', 'মোট উপস্থিতি')}${stat(mon.total ? mon.pct + '%' : '—', 'এই মাসে')}${stat(all.absent, 'অনুপস্থিত দিন')}</div>` +
    card(`<h3>আমার হাজিরা</h3>
      <div class="counts">${['present', 'absent', 'late'].map(k => `<span class="pill ${k}">${STATUS_BN[k]}: ${all[k]}</span>`).join('')}</div>
      ${data.length ? data.slice(0, 90).map(r => `<div class="row"><span class="grow">${fmtDate(r.att_date)}</span><span class="pill ${r.status}">${STATUS_BN[r.status]}</span></div>`).join('') : empty('এখনো কোনো হাজিরা নেওয়া হয়নি')}`);
}

/* ---------- সদস্য (শুধু অ্যাডমিন) ---------- */
function signupClient() {
  if (!tmpClient) tmpClient = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'tsa-signup-tmp' },
  });
  return tmpClient;
}

async function viewMembers(el) {
  const { data, error } = await sb.from('members').select('*').order('role').order('academy_id');
  if (error) throw error;
  const c = { admin: 0, teacher: 0, student: 0 }; data.forEach(m => c[m.role]++);

  el.innerHTML = `<div class="stats">${stat(c.student, 'শিক্ষার্থী')}${stat(c.teacher + c.admin, 'শিক্ষক/অ্যাডমিন')}${stat(S.batches.length, 'ব্যাচ')}</div>` +
    card(`<h3>ব্যাচ</h3>
      <div class="chips">${S.batches.length ? S.batches.map(b => `<span class="chip">${esc(b.name)}<button data-delb="${b.id}" title="মুছুন">×</button></span>`).join('') : '<span class="muted">এখনো কোনো ব্যাচ নেই</span>'}</div>
      <form id="bf" class="inline"><input name="bname" required placeholder="নতুন ব্যাচ (যেমন HSC 2027)"><button class="primary">যোগ</button></form>`) +
    card(`<h3>নতুন সদস্য যোগ করো</h3>
      <form id="mf" class="grid">
        <label>নাম<input name="mname" required></label>
        <label>Academy ID<input name="aid" required autocapitalize="none" autocorrect="off" placeholder="tsa2601"></label>
        <label>মোবাইল নম্বর<input name="phone" required inputmode="numeric" placeholder="01XXXXXXXXX"></label>
        <label>ভূমিকা<select name="role"><option value="student">শিক্ষার্থী</option><option value="teacher">শিক্ষক</option><option value="admin">অ্যাডমিন</option></select></label>
        <label>ব্যাচ<select name="batch">${batchOptions(S.batches[0]?.id, { none: true })}</select></label>
        <button class="primary">যোগ করো</button>
        <p class="hint wide">সদস্য লগইন করবে: Academy ID + এই মোবাইল নম্বর দিয়ে। ID-তে শুধু ইংরেজি অক্ষর ও সংখ্যা।</p>
      </form>`) +
    card(`<h3>সব সদস্য</h3>
      <div class="filters">
        <select id="fr"><option value="">সব ভূমিকা</option><option value="student">শিক্ষার্থী</option><option value="teacher">শিক্ষক</option><option value="admin">অ্যাডমিন</option></select>
        <select id="fb">${batchOptions('', { all: true })}</select>
        <input id="fq" placeholder="নাম / ID / নম্বর">
      </div><div id="ml"></div>`);

  const ml = el.querySelector('#ml');
  const renderList = () => {
    const r = el.querySelector('#fr').value, b = el.querySelector('#fb').value, q = el.querySelector('#fq').value.trim().toLowerCase();
    const list = data.filter(m => (!r || m.role === r) && (!b || String(m.batch_id) === b) && (!q || `${m.name} ${m.academy_id} ${m.phone}`.toLowerCase().includes(q)));
    ml.innerHTML = list.length ? list.map(m => `<div class="row mem">
        <span class="grow"><b>${esc(m.name)}</b><small>${esc(m.academy_id)} · ${esc(m.phone)}</small></span>
        <span class="tag ${m.role === 'student' ? '' : 'navy'}">${ROLE_BN[m.role]}${m.role === 'student' ? ' · ' + esc(m.batch_id ? batchName(m.batch_id) : 'ব্যাচ নেই') : ''}</span>
        <span class="acts"><button class="light small" data-edit="${m.id}">এডিট</button></span>
      </div>`).join('') : empty('কেউ নেই');
    ml.querySelectorAll('[data-edit]').forEach(btn => btn.onclick = () => editMember(data.find(m => m.id === btn.dataset.edit)));
  };
  ['#fr', '#fb'].forEach(s => { el.querySelector(s).onchange = renderList; });
  el.querySelector('#fq').oninput = renderList;
  renderList();

  // ব্যাচ যোগ/মোছা
  const bf = el.querySelector('#bf');
  bf.onsubmit = async e => {
    e.preventDefault();
    const { error: be } = await sb.from('batches').insert({ name: val(bf, 'bname') });
    if (be) return fail(be.code === '23505' ? 'এই নামে ব্যাচ আগেই আছে' : be);
    await loadBatches(); toast('ব্যাচ যোগ হয়েছে'); route();
  };
  el.querySelectorAll('[data-delb]').forEach(b => b.onclick = async () => {
    if (!confirm(`"${batchName(Number(b.dataset.delb))}" ব্যাচ মুছবে? এর রুটিন, পরীক্ষা ও PDF-ও মুছে যাবে। শিক্ষার্থীরা থাকবে, কিন্তু ব্যাচ ছাড়া।`)) return;
    const { error: de } = await sb.from('batches').delete().eq('id', b.dataset.delb);
    if (de) return fail(de);
    await loadBatches(); toast('ব্যাচ মুছে ফেলা হয়েছে'); route();
  });

  // সদস্য যোগ
  const mf = el.querySelector('#mf');
  mf.onsubmit = async e => {
    e.preventDefault();
    const name = val(mf, 'mname'), aid = normId(val(mf, 'aid')), phone = normPhone(val(mf, 'phone'));
    const role = val(mf, 'role'), batch_id = numOrNull(val(mf, 'batch'));
    if (!/^[a-z0-9._-]{2,30}$/.test(aid)) return toast('Academy ID-তে শুধু ইংরেজি অক্ষর/সংখ্যা দাও (যেমন tsa2601)', true);
    if (!/^\d{6,15}$/.test(phone)) return toast('মোবাইল নম্বর ঠিক নেই', true);
    if (role === 'student' && !batch_id) return toast('শিক্ষার্থীর জন্য ব্যাচ বেছে নাও', true);
    if (data.some(m => m.academy_id === aid)) return toast('এই Academy ID আগেই আছে', true);

    await busy(mf.querySelector('button'), 'যোগ হচ্ছে…', async () => {
      const { data: su, error: se } = await signupClient().auth.signUp({ email: idToEmail(aid), password: phone });
      if (se) return fail(/registered|exists/i.test(se.message) ? 'এই ID দিয়ে আগেই একটি লগইন আছে' : se);
      if (!su.user || (su.user.identities && su.user.identities.length === 0)) return toast('এই ID দিয়ে আগেই একটি লগইন আছে', true);
      const { error: ie } = await sb.from('members').insert({ id: su.user.id, academy_id: aid, name, phone, role, batch_id: role === 'student' ? batch_id : null });
      if (ie) { await sb.rpc('admin_delete_user', { target: su.user.id }); return fail(ie); }
      await signupClient().auth.signOut().catch(() => {});
      if (!su.session) toast('যোগ হয়েছে, কিন্তু Supabase-এ "Confirm email" চালু আছে — README-র ধাপ ৩ দেখো', true);
      else toast(`যোগ হয়েছে ✓ লগইন: ${aid} + ${phone}`);
      route();
    });
  };
}

function editMember(m) {
  const self = m.id === S.me.id;
  openDialog(`<form method="dialog" id="ed">
    <h3>সদস্য এডিট · ${esc(m.academy_id)}</h3>
    <label>নাম<input name="mname" required value="${esc(m.name)}"></label>
    <label>মোবাইল নম্বর (এটাই পাসওয়ার্ড)<input name="phone" required inputmode="numeric" value="${esc(m.phone)}"></label>
    <label>ভূমিকা<select name="role" ${self ? 'disabled' : ''}>${['student', 'teacher', 'admin'].map(r => `<option value="${r}" ${m.role === r ? 'selected' : ''}>${ROLE_BN[r]}</option>`).join('')}</select></label>
    <label>ব্যাচ<select name="batch">${batchOptions(m.batch_id, { none: true })}</select></label>
    <div class="acts">
      ${self ? '' : '<button type="button" class="danger" id="del">মুছে ফেলো</button>'}
      <span style="flex:1"></span>
      <button type="button" class="light" id="cancel">বাতিল</button>
      <button type="submit" class="primary" id="ok">সেভ</button>
    </div></form>`, d => {
    const f = d.querySelector('#ed');
    d.querySelector('#cancel').onclick = () => d.close();
    const del = d.querySelector('#del');
    if (del) del.onclick = async () => {
      if (!confirm(`${m.name}-কে পুরোপুরি মুছে ফেলবে? তার হাজিরার রেকর্ডও মুছে যাবে।`)) return;
      const { error } = await sb.rpc('admin_delete_user', { target: m.id });
      if (error) return fail(error);
      d.close(); toast('সদস্য মুছে ফেলা হয়েছে'); route();
    };
    f.onsubmit = async e => {
      e.preventDefault();
      const phone = normPhone(val(f, 'phone'));
      const role = self ? m.role : val(f, 'role');
      const batch_id = numOrNull(val(f, 'batch'));
      if (!/^\d{6,15}$/.test(phone)) return toast('মোবাইল নম্বর ঠিক নেই', true);
      if (role === 'student' && !batch_id) return toast('শিক্ষার্থীর জন্য ব্যাচ বেছে নাও', true);
      await busy(d.querySelector('#ok'), 'সেভ হচ্ছে…', async () => {
        if (phone !== m.phone) {
          const { error: pe } = await sb.rpc('admin_set_password', { target: m.id, new_password: phone });
          if (pe) return fail(pe);
        }
        const { error } = await sb.from('members').update({ name: val(f, 'mname'), phone, role, batch_id: role === 'student' ? batch_id : null }).eq('id', m.id);
        if (error) return fail(error);
        d.close(); toast('সেভ হয়েছে'); route();
      });
    };
  });
}

init().catch(fail);
