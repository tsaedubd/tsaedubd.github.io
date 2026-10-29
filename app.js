'use strict';
/* ============================================================
   The Sun Academy — app.js
   Login (Academy ID + মোবাইল) · রুটিন · পরীক্ষা · PDF · হাজিরা · সদস্য
   বাংলা / English দুই ভাষা
   ============================================================ */
const CFG = window.TSA_CONFIG || {};
const app = document.getElementById('app');
let sb = null, tmpClient = null;
const S = { me: null, batches: [], f: {} };
const MAX_FILE = 50 * 1024 * 1024; // Supabase free: ৫০ MB / ফাইল
const BN_DIG = '০১২৩৪৫৬৭৮৯';

/* ---------- ভাষা (Language) ---------- */
let LANG = 'bn';
try { LANG = localStorage.getItem('tsa-lang') === 'en' ? 'en' : 'bn'; } catch (e) {}

const EN = {
  // general
  'লোড হচ্ছে…': 'Loading…',
  'সংযোগ হয়নি': 'Not connected',
  'ইন্টারনেট চেক করে পেজটা আবার খোলো।': 'Check your internet and reopen the page.',
  'সেটআপ বাকি': 'Setup pending',
  'সমস্যা: {m}': 'Problem: {m}',
  'লোড করা যায়নি। আবার চেষ্টা করো।': 'Could not load. Please try again.',
  'মুছে ফেলবে?': 'Delete this?',
  'মুছে ফেলা হয়েছে': 'Deleted',
  'মুছুন': 'Delete',
  'যোগ করো': 'Add',
  'যোগ': 'Add',
  'যোগ হচ্ছে…': 'Adding…',
  'সেভ': 'Save',
  'সেভ করো': 'Save',
  'সেভ হচ্ছে…': 'Saving…',
  'সেভ হয়েছে': 'Saved',
  'বাতিল': 'Cancel',
  'এডিট': 'Edit',
  'ব্যাচ': 'Batch',
  'সব ব্যাচ': 'All batches',
  '— ব্যাচ নেই —': '— No batch —',
  'ব্যাচ নেই': 'No batch',
  'বিষয়': 'Subject',
  'তারিখ': 'Date',
  'সময়': 'Time',
  // roles / status / days
  'অ্যাডমিন': 'Admin', 'শিক্ষক': 'Teacher', 'শিক্ষার্থী': 'Student',
  'উপস্থিত': 'Present', 'অনুপস্থিত': 'Absent', 'দেরি': 'Late',
  'শনিবার': 'Saturday', 'রবিবার': 'Sunday', 'সোমবার': 'Monday', 'মঙ্গলবার': 'Tuesday',
  'বুধবার': 'Wednesday', 'বৃহস্পতিবার': 'Thursday', 'শুক্রবার': 'Friday',
  // login
  'শিক্ষার্থী ও শিক্ষক লগইন': 'Student & Teacher Login',
  'যেমন: tsa2601': 'e.g. tsa2601',
  'মোবাইল নম্বর': 'Mobile number',
  'লগইন': 'Login',
  'লগআউট': 'Logout',
  'অপেক্ষা করো…': 'Please wait…',
  'Academy ID বা মোবাইল নম্বর ভুল হয়েছে।': 'Wrong Academy ID or mobile number.',
  'লগইন হয়নি: {m}': 'Login failed: {m}',
  'সংযোগে সমস্যা: {m}': 'Connection problem: {m}',
  'এই অ্যাকাউন্টটি রেজিস্টার্ড নয়। অ্যাডমিনের সাথে যোগাযোগ করো।': 'This account is not registered. Please contact the admin.',
  // tabs
  'হোম': 'Home', 'রুটিন': 'Routine', 'পরীক্ষা': 'Exams', 'হাজিরা': 'Attendance', 'সদস্য': 'Members',
  // home
  'হ্যালো, {n}': 'Hello, {n}',
  'তোমাকে এখনো কোনো ব্যাচে যোগ করা হয়নি। অ্যাডমিনকে জানাও।': 'You have not been added to a batch yet. Please tell the admin.',
  'উপস্থিতি': 'Attendance',
  'উপস্থিত দিন': 'Days present',
  'অনুপস্থিত দিন': 'Days absent',
  'আজকের ক্লাস · {d}': "Today's classes · {d}",
  'আজ কোনো ক্লাস নেই': 'No classes today',
  'সামনের পরীক্ষা': 'Upcoming exams',
  'সামনে কোনো পরীক্ষা নেই': 'No upcoming exams',
  'সব পরীক্ষা →': 'All exams →',
  'নতুন PDF': 'New PDFs',
  'এখনো কোনো PDF নেই': 'No PDFs yet',
  'সব PDF →': 'All PDFs →',
  // exams
  'শেষ': 'Done', 'আজ': 'Today', 'আগামীকাল': 'Tomorrow',
  '{n} দিন বাকি': '{n} days left',
  'পূর্ণমান {n}': 'Full marks {n}',
  'সিলেবাস: {s}': 'Syllabus: {s}',
  'নতুন পরীক্ষা যোগ করো': 'Add a new exam',
  'পরীক্ষার নাম': 'Exam name',
  'সাপ্তাহিক পরীক্ষা ১': 'Weekly test 1',
  'পূর্ণমান': 'Full marks',
  'সিলেবাস': 'Syllabus',
  'অধ্যায় ১, ২…': 'Chapter 1, 2…',
  'আগের পরীক্ষা': 'Past exams',
  'এখনো কিছু নেই': 'Nothing yet',
  'এই পরীক্ষাটি মুছে ফেলবে?': 'Delete this exam?',
  'পরীক্ষা যোগ হয়েছে': 'Exam added',
  // routine
  'আগে "সদস্য" ট্যাব থেকে একটি ব্যাচ তৈরি করো।': 'First create a batch from the "Members" tab.',
  'এখনো কোনো ব্যাচ তৈরি হয়নি।': 'No batch has been created yet.',
  'তোমাকে এখনো কোনো ব্যাচে যোগ করা হয়নি।': 'You have not been added to a batch yet.',
  'সাপ্তাহিক রুটিন · {b}': 'Weekly routine · {b}',
  'ক্লাস নেই': 'No class',
  'নতুন ক্লাস যোগ করো · {b}': 'Add a class · {b}',
  'দিন': 'Day', 'শুরু': 'Start', 'শেষ সময়': 'End',
  'পদার্থবিজ্ঞান': 'Physics',
  'শিক্ষকের নাম': "Teacher's name",
  'ক্লাস যোগ হয়েছে': 'Class added',
  'এই ক্লাসটি রুটিন থেকে মুছে ফেলবে?': 'Remove this class from the routine?',
  // pdf
  'খোঁজো': 'Search',
  'নাম বা বিষয়': 'Name or subject',
  'PDF আপলোড করো': 'Upload a PDF',
  'শিরোনাম': 'Title',
  'অধ্যায় ৩ নোট': 'Chapter 3 notes',
  'কোন ব্যাচ': 'Which batch',
  'ফাইল (সর্বোচ্চ ৫০ MB)': 'File (max 50 MB)',
  'আপলোড': 'Upload',
  'আপলোড হচ্ছে…': 'Uploading…',
  'আপলোড হয়েছে': 'Uploaded',
  'সব PDF ({n})': 'All PDFs ({n})',
  'খুলো': 'Open',
  'ফাইল নেই': 'No file',
  'কোনো PDF পাওয়া যায়নি': 'No PDFs found',
  'ফাইলটা ৫০ MB-এর বেশি। ছোট করে আপলোড করো।': 'File is over 50 MB. Please upload a smaller one.',
  'এই PDF মুছে ফেলবে?': 'Delete this PDF?',
  // attendance
  'হাজিরা নাও': 'Take attendance',
  'মাসিক রিপোর্ট': 'Monthly report',
  'আগে একটি ব্যাচ তৈরি করো।': 'Create a batch first.',
  'এই দিনের হাজিরা সেভ করা আছে। বদলে আবার সেভ করতে পারো।': "This day's attendance is saved. You can change it and save again.",
  'এই দিনের হাজিরা এখনো নেওয়া হয়নি। সবাই "উপস্থিত" ধরা আছে — যারা আসেনি তাদের বদলাও।': 'Attendance not taken for this day yet. Everyone is marked "Present" — change the ones who are absent.',
  'এই ব্যাচে কোনো শিক্ষার্থী নেই': 'No students in this batch',
  'সবাই উপস্থিত': 'All present',
  'হাজিরা সেভ হয়েছে ✓': 'Attendance saved ✓',
  'মাস': 'Month',
  'মোট ক্লাসের দিন: {n}': 'Total class days: {n}',
  'নাম': 'Name',
  '৭৫%-এর কম উপস্থিতি লাল রঙে দেখানো হয়েছে।': 'Attendance below 75% is shown in red.',
  'মোট উপস্থিতি': 'Overall',
  'এই মাসে': 'This month',
  'আমার হাজিরা': 'My attendance',
  'এখনো কোনো হাজিরা নেওয়া হয়নি': 'No attendance recorded yet',
  // members
  'শিক্ষক/অ্যাডমিন': 'Teachers/Admins',
  'এখনো কোনো ব্যাচ নেই': 'No batches yet',
  'নতুন ব্যাচ (যেমন HSC 2027)': 'New batch (e.g. HSC 2027)',
  'নতুন সদস্য যোগ করো': 'Add a new member',
  'ভূমিকা': 'Role',
  'সদস্য লগইন করবে: Academy ID + এই মোবাইল নম্বর দিয়ে। ID-তে শুধু ইংরেজি অক্ষর ও সংখ্যা।': 'Members log in with Academy ID + this mobile number. Use only English letters and numbers in the ID.',
  'সব সদস্য': 'All members',
  'সব ভূমিকা': 'All roles',
  'নাম / ID / নম্বর': 'Name / ID / number',
  'কেউ নেই': 'No one',
  'এই নামে ব্যাচ আগেই আছে': 'A batch with this name already exists',
  'ব্যাচ যোগ হয়েছে': 'Batch added',
  '"{b}" ব্যাচ মুছবে? এর রুটিন, পরীক্ষা ও PDF-ও মুছে যাবে। শিক্ষার্থীরা থাকবে, কিন্তু ব্যাচ ছাড়া।': 'Delete batch "{b}"? Its routine, exams and PDFs will also be deleted. Students stay, but without a batch.',
  'ব্যাচ মুছে ফেলা হয়েছে': 'Batch deleted',
  'Academy ID-তে শুধু ইংরেজি অক্ষর/সংখ্যা দাও (যেমন tsa2601)': 'Use only English letters/numbers in the Academy ID (e.g. tsa2601)',
  'মোবাইল নম্বর ঠিক নেই': 'Mobile number is not valid',
  'শিক্ষার্থীর জন্য ব্যাচ বেছে নাও': 'Choose a batch for the student',
  'এই Academy ID আগেই আছে': 'This Academy ID already exists',
  'এই ID দিয়ে আগেই একটি লগইন আছে': 'A login with this ID already exists',
  'যোগ হয়েছে, কিন্তু Supabase-এ "Confirm email" চালু আছে — README-র ধাপ ৩ দেখো': 'Added, but "Confirm email" is on in Supabase — see README step 3',
  'যোগ হয়েছে ✓ লগইন: {a} + {p}': 'Added ✓ Login: {a} + {p}',
  'সদস্য এডিট · {a}': 'Edit member · {a}',
  'মোবাইল নম্বর (এটাই পাসওয়ার্ড)': 'Mobile number (this is the password)',
  'মুছে ফেলো': 'Delete',
  '{n}-কে পুরোপুরি মুছে ফেলবে? তার হাজিরার রেকর্ডও মুছে যাবে।': 'Delete {n} completely? Their attendance records will be deleted too.',
  'সদস্য মুছে ফেলা হয়েছে': 'Member deleted',
};

function t(s, vars) {
  let out = LANG === 'en' ? (EN[s] ?? s) : s;
  if (vars) for (const k in vars) out = out.split(`{${k}}`).join(vars[k]);
  return out;
}
const num = n => (LANG === 'bn' ? String(n).replace(/\d/g, d => BN_DIG[d]) : String(n));
function setLang(l) {
  LANG = l;
  try { localStorage.setItem('tsa-lang', l); } catch (e) {}
  document.documentElement.lang = l;
}
document.documentElement.lang = LANG;
const langBtn = (cls = '') => `<button type="button" class="lang ${cls}" data-lang title="Language / ভাষা">${LANG === 'bn' ? 'English' : 'বাংলা'}</button>`;
function bindLang(root, rerender) {
  root.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => { setLang(LANG === 'bn' ? 'en' : 'bn'); rerender(); });
}

const DAYS = ['শনিবার', 'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার'];
const ROLE_BN = { admin: 'অ্যাডমিন', teacher: 'শিক্ষক', student: 'শিক্ষার্থী' };
const STATUS_BN = { present: 'উপস্থিত', absent: 'অনুপস্থিত', late: 'দেরি' };
const day = i => t(DAYS[i]);
const role = r => t(ROLE_BN[r]);
const status = s => t(STATUS_BN[s]);

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
const batchName = id => (id == null ? t('সব ব্যাচ') : (S.batches.find(b => b.id === id)?.name || '—'));
const todayIdx = () => (new Date().getDay() + 1) % 7; // শনিবার = 0

function fmtDate(s, opts) {
  if (!s) return '';
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(LANG === 'en' ? 'en-GB' : 'bn-BD', opts || { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtTime(tm) {
  if (!tm) return '';
  let [h, m] = tm.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${pad(m)} ${ap}`;
}
function daysLeft(s) {
  const [y, m, d] = s.split('-').map(Number);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const n = Math.round((new Date(y, m - 1, d) - now) / 86400000);
  if (n < 0) return `<span class="tag navy">${t('শেষ')}</span>`;
  if (n === 0) return `<span class="tag red pulse">${t('আজ')}</span>`;
  if (n === 1) return `<span class="tag red">${t('আগামীকাল')}</span>`;
  return `<span class="tag">${t('{n} দিন বাকি', { n: num(n) })}</span>`;
}
function toast(msg, bad = false) {
  const el = document.createElement('div');
  el.className = 'toast' + (bad ? ' bad' : '');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 3200);
}
function fail(err) { console.error(err); toast(t('সমস্যা: {m}', { m: err?.message || err }), true); }
const card = (inner, cls = '') => `<section class="card ${cls}">${inner}</section>`;
const empty = s => `<p class="empty">${esc(s)}</p>`;
const stat = (n, label) => `<div class="stat"><b data-count="${esc(n)}">${esc(n)}</b><span>${esc(label)}</span></div>`;
const logoImg = (cls = '') => `<img class="logo ${cls}" src="logo.png" alt="" onerror="this.remove()">`;
function batchOptions(sel, o = {}) {
  let h = o.all ? `<option value="">${t('সব ব্যাচ')}</option>` : o.none ? `<option value="">${t('— ব্যাচ নেই —')}</option>` : '';
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
  btn.disabled = true; btn.textContent = text; btn.classList.add('loading');
  try { await fn(); } finally { if (btn.isConnected) { btn.disabled = false; btn.textContent = old; btn.classList.remove('loading'); } }
}
function bindDelete(el, table, msg = 'মুছে ফেলবে?') {
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if (!confirm(t(msg))) return;
    const row = b.closest('.row');
    const { error } = await sb.from(table).delete().eq('id', b.dataset.del);
    if (error) return fail(error);
    toast(t('মুছে ফেলা হয়েছে'));
    if (row) { row.classList.add('leaving'); setTimeout(route, 260); } else route();
  });
}

/* ---------- animations ---------- */
const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function animateIn(root) {
  const items = root.querySelectorAll('.card, .stat, .hello, .toolbar, .seg-tabs, .daygrid > .card');
  items.forEach((el, i) => { el.classList.add('rise'); el.style.animationDelay = `${Math.min(i, 10) * 55}ms`; });
  if (reduceMotion()) return;
  // সংখ্যা গুনে গুনে বাড়ানো (count-up)
  root.querySelectorAll('.stat b[data-count]').forEach(b => {
    const raw = enDigits(b.dataset.count);
    const m = raw.match(/^(\d+)(%?)$/);
    if (!m) return;
    const target = Number(m[1]), suffix = m[2];
    if (!target) return;
    const t0 = performance.now(), dur = 700;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      b.textContent = num(Math.round(target * e)) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
function ripple(e) {
  const b = e.target.closest('button, .btn, .tabs a, .seg-tabs a');
  if (!b || b.disabled || reduceMotion()) return;
  const r = b.getBoundingClientRect(), s = document.createElement('span');
  const size = Math.max(r.width, r.height);
  s.className = 'ripple';
  s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
  b.appendChild(s);
  setTimeout(() => s.remove(), 600);
}
document.addEventListener('pointerdown', ripple);

/* ---------- start ---------- */
async function init() {
  if (!window.supabase) { app.innerHTML = `<main>${card(`<h3>${t('সংযোগ হয়নি')}</h3><p>${t('ইন্টারনেট চেক করে পেজটা আবার খোলো।')}</p>`)}</main>`; return; }
  if (!CFG.SUPABASE_URL || CFG.SUPABASE_URL.includes('YOUR')) {
    app.innerHTML = `<main>${card(`<h3>${t('সেটআপ বাকি')}</h3><p>config.js → SUPABASE_URL / SUPABASE_ANON_KEY</p>`)}</main>`;
    return;
  }
  sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
  const { data: { session } } = await sb.auth.getSession();
  if (session) await loadMe(session.user); else renderLogin();
}

function renderLogin(msg = '') {
  app.innerHTML = `<div class="login-wrap">
    <div class="sunrays" aria-hidden="true"></div>
    <form class="card login" id="lf">
      ${langBtn('corner')}
      <div class="logo-wrap">${logoImg('big')}</div>
      <h1>${esc(CFG.ACADEMY_NAME)}</h1>
      <p class="muted">${t('শিক্ষার্থী ও শিক্ষক লগইন')}</p>
      ${msg ? `<div class="alert shake">${esc(msg)}</div>` : ''}
      <label>Academy ID<input name="aid" required autocomplete="username" autocapitalize="none" autocorrect="off" placeholder="${t('যেমন: tsa2601')}"></label>
      <label>${t('মোবাইল নম্বর')}<input name="phone" type="password" required inputmode="numeric" autocomplete="current-password" placeholder="01XXXXXXXXX"></label>
      <button class="primary" type="submit">${t('লগইন')}</button>
    </form>
    <p class="foot muted">${esc(CFG.ADDRESS || '')}</p>
  </div>`;
  const f = document.getElementById('lf');
  bindLang(f, () => renderLogin(msg));
  f.onsubmit = async e => {
    e.preventDefault();
    const btn = f.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = t('অপেক্ষা করো…'); btn.classList.add('loading');
    const { data, error } = await sb.auth.signInWithPassword({ email: idToEmail(normId(val(f, 'aid'))), password: normPhone(val(f, 'phone')) });
    if (error) {
      renderLogin(/invalid/i.test(error.message) ? t('Academy ID বা মোবাইল নম্বর ভুল হয়েছে।') : t('লগইন হয়নি: {m}', { m: error.message }));
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
    renderLogin(error ? t('সংযোগে সমস্যা: {m}', { m: error.message }) : t('এই অ্যাকাউন্টটি রেজিস্টার্ড নয়। অ্যাডমিনের সাথে যোগাযোগ করো।'));
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
    .map(([k, v]) => `<a href="#${k}" class="${k === active ? 'on' : ''}">${t(v.label)}</a>`).join('');
  const sub = role(S.me.role) + (S.me.role === 'student' && S.me.batch_id ? ' · ' + batchName(S.me.batch_id) : '');
  app.innerHTML = `
    <header class="top">
      <div class="brand">${logoImg()}<b>${esc(CFG.ACADEMY_NAME)}</b></div>
      <div class="who"><span>${esc(S.me.name)}<small>${esc(sub)}</small></span>${langBtn('ghost')}<button class="ghost" id="logout">${t('লগআউট')}</button></div>
    </header>
    <nav class="tabs">${tabs}</nav>
    <main id="view"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton short"></div></main>`;
  bindLang(app.querySelector('.top'), route);
  document.getElementById('logout').onclick = async () => {
    await sb.auth.signOut(); S.me = null; S.f = {};
    history.replaceState(null, '', location.pathname);
    renderLogin();
  };
  const on = app.querySelector('.tabs a.on');
  if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
}

async function route() {
  if (!S.me) return;
  let v = location.hash.slice(1) || 'home';
  if (!VIEWS[v] || (VIEWS[v].admin && !isAdmin())) v = 'home';
  renderShell(v);
  const el = document.getElementById('view');
  try { await VIEWS[v].fn(el); } catch (e) { el.innerHTML = card(empty(t('লোড করা যায়নি। আবার চেষ্টা করো।'))); fail(e); }
  animateIn(el);
}

/* ---------- shared rows ---------- */
const routineRow = (x, showBatch, delBtn) => `<div class="row">
  <span class="time">${fmtTime(x.start_time)}${x.end_time ? ' – ' + fmtTime(x.end_time) : ''}</span>
  <span class="grow"><b>${esc(x.subject)}</b>${x.teacher ? `<small>${esc(x.teacher)}</small>` : ''}</span>
  ${showBatch ? `<span class="tag navy">${esc(batchName(x.batch_id))}</span>` : ''}
  ${delBtn ? `<button class="danger" data-del="${x.id}">${t('মুছুন')}</button>` : ''}
</div>`;

const examRow = (x, showBatch, delBtn) => `<div class="row">
  <span class="grow"><b>${esc(x.title)}</b>
    <small>${esc([x.subject, fmtDate(x.exam_date), x.start_time ? fmtTime(x.start_time) : '', x.full_marks ? t('পূর্ণমান {n}', { n: num(x.full_marks) }) : ''].filter(Boolean).join(' · '))}</small>
    ${x.syllabus ? `<small>${esc(t('সিলেবাস: {s}', { s: x.syllabus }))}</small>` : ''}
    ${showBatch ? `<span class="tag navy">${esc(batchName(x.batch_id))}</span>` : ''}
  </span>
  ${daysLeft(x.exam_date)}
  ${delBtn ? `<button class="danger" data-del="${x.id}">${t('মুছুন')}</button>` : ''}
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

  let html = `<div class="hello"><h2>${esc(t('হ্যালো, {n}', { n: me.name }))} <span class="wave">👋</span></h2><p class="muted">${fmtDate(todayStr())}</p></div>`;
  if (student) {
    const s = attSummary(a);
    if (!me.batch_id) html += `<div class="note">${t('তোমাকে এখনো কোনো ব্যাচে যোগ করা হয়নি। অ্যাডমিনকে জানাও।')}</div>`;
    html += `<div class="stats">${stat(s.total ? num(s.pct) + '%' : '—', t('উপস্থিতি'))}${stat(num(s.present + s.late), t('উপস্থিত দিন'))}${stat(num(s.absent), t('অনুপস্থিত দিন'))}</div>`;
  }
  html += card(`<h3>${t('আজকের ক্লাস · {d}', { d: day(td) })}</h3>${r.length ? r.map(x => routineRow(x, !student)).join('') : empty(t('আজ কোনো ক্লাস নেই'))}`);
  html += card(`<h3>${t('সামনের পরীক্ষা')}</h3>${e.length ? e.map(x => examRow(x, !student)).join('') : empty(t('সামনে কোনো পরীক্ষা নেই'))}<a class="more" href="#exams">${t('সব পরীক্ষা →')}</a>`);
  html += card(`<h3>${t('নতুন PDF')}</h3>${m.length ? m.map(x => `<div class="row"><span class="grow"><b>${esc(x.title)}</b><small>${esc([x.subject, fmtDate(x.created_at.slice(0, 10))].filter(Boolean).join(' · '))}</small></span></div>`).join('') : empty(t('এখনো কোনো PDF নেই'))}<a class="more" href="#pdf">${t('সব PDF →')}</a>`);
  el.innerHTML = html;
}

/* ---------- রুটিন ---------- */
async function viewRoutine(el) {
  const staff = isStaff();
  const bid = staff ? (S.f.rBatch ?? S.batches[0]?.id) : S.me.batch_id;
  if (!bid) {
    el.innerHTML = card(empty(staff ? (isAdmin() ? t('আগে "সদস্য" ট্যাব থেকে একটি ব্যাচ তৈরি করো।') : t('এখনো কোনো ব্যাচ তৈরি হয়নি।')) : t('তোমাকে এখনো কোনো ব্যাচে যোগ করা হয়নি।')));
    return;
  }
  const { data, error } = await sb.from('routines').select('*').eq('batch_id', bid).order('day').order('start_time');
  if (error) throw error;
  const td = todayIdx();

  let html = staff
    ? `<div class="toolbar"><label>${t('ব্যাচ')}<select id="rb">${batchOptions(bid)}</select></label></div>`
    : `<h2>${esc(t('সাপ্তাহিক রুটিন · {b}', { b: batchName(bid) }))}</h2>`;
  html += `<div class="daygrid">${DAYS.map((d, i) => {
    const items = data.filter(x => x.day === i);
    return card(`<h3>${day(i)}${i === td ? `<span class="tag">${t('আজ')}</span>` : ''}</h3>${items.length ? items.map(x => routineRow(x, false, staff)).join('') : empty(t('ক্লাস নেই'))}`, 'day' + (i === td ? ' today' : ''));
  }).join('')}</div>`;

  if (staff) html += card(`<h3>${esc(t('নতুন ক্লাস যোগ করো · {b}', { b: batchName(bid) }))}</h3>
    <form id="rf" class="grid">
      <label>${t('দিন')}<select name="day">${DAYS.map((d, i) => `<option value="${i}">${day(i)}</option>`).join('')}</select></label>
      <label>${t('শুরু')}<input name="st" type="time" required></label>
      <label>${t('শেষ সময়')}<input name="et" type="time"></label>
      <label>${t('বিষয়')}<input name="subject" required placeholder="${t('পদার্থবিজ্ঞান')}"></label>
      <label>${t('শিক্ষক')}<input name="teacher" placeholder="${t('শিক্ষকের নাম')}"></label>
      <button class="primary">${t('যোগ করো')}</button>
    </form>`);
  el.innerHTML = html;

  if (!staff) return;
  el.querySelector('#rb').onchange = e => { S.f.rBatch = Number(e.target.value); route(); };
  const f = el.querySelector('#rf');
  f.onsubmit = async e => {
    e.preventDefault();
    await busy(f.querySelector('button'), t('যোগ হচ্ছে…'), async () => {
      const { error } = await sb.from('routines').insert({
        batch_id: bid, day: Number(val(f, 'day')), start_time: val(f, 'st'), end_time: val(f, 'et') || null,
        subject: val(f, 'subject'), teacher: val(f, 'teacher') || null,
      });
      if (error) return fail(error);
      toast(t('ক্লাস যোগ হয়েছে')); S.f.rBatch = bid; route();
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
  const td = todayStr();
  const up = data.filter(x => x.exam_date >= td);
  const past = data.filter(x => x.exam_date < td).reverse().slice(0, 30);
  const showBatch = staff && !S.f.eBatch;

  let html = staff ? `<div class="toolbar"><label>${t('ব্যাচ')}<select id="eb">${batchOptions(S.f.eBatch, { all: true })}</select></label></div>` : '';
  html += card(`<h3>${t('সামনের পরীক্ষা')}</h3>${up.length ? up.map(x => examRow(x, showBatch, staff)).join('') : empty(t('সামনে কোনো পরীক্ষা নেই'))}`);
  if (staff && S.batches.length) html += card(`<h3>${t('নতুন পরীক্ষা যোগ করো')}</h3>
    <form id="ef" class="grid">
      <label>${t('ব্যাচ')}<select name="batch" required>${batchOptions(S.f.eBatch || S.batches[0]?.id)}</select></label>
      <label>${t('পরীক্ষার নাম')}<input name="etitle" required placeholder="${t('সাপ্তাহিক পরীক্ষা ১')}"></label>
      <label>${t('বিষয়')}<input name="subject" placeholder="${t('পদার্থবিজ্ঞান')}"></label>
      <label>${t('তারিখ')}<input name="date" type="date" required></label>
      <label>${t('সময়')}<input name="time" type="time"></label>
      <label>${t('পূর্ণমান')}<input name="marks" type="number" min="0" inputmode="numeric"></label>
      <label class="wide">${t('সিলেবাস')}<textarea name="syllabus" placeholder="${t('অধ্যায় ১, ২…')}"></textarea></label>
      <button class="primary">${t('যোগ করো')}</button>
    </form>`);
  html += card(`<h3>${t('আগের পরীক্ষা')}</h3>${past.length ? past.map(x => examRow(x, showBatch, staff)).join('') : empty(t('এখনো কিছু নেই'))}`);
  el.innerHTML = html;

  if (!staff) return;
  el.querySelector('#eb').onchange = e => { S.f.eBatch = numOrNull(e.target.value); route(); };
  const f = el.querySelector('#ef');
  if (f) f.onsubmit = async e => {
    e.preventDefault();
    await busy(f.querySelector('button'), t('যোগ হচ্ছে…'), async () => {
      const { error } = await sb.from('exams').insert({
        batch_id: Number(val(f, 'batch')), title: val(f, 'etitle'), subject: val(f, 'subject') || null,
        exam_date: val(f, 'date'), start_time: val(f, 'time') || null,
        full_marks: numOrNull(val(f, 'marks')), syllabus: val(f, 'syllabus') || null,
      });
      if (error) return fail(error);
      toast(t('পরীক্ষা যোগ হয়েছে')); route();
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
    ${staff ? `<label>${t('ব্যাচ')}<select id="pb">${batchOptions(S.f.pBatch, { all: true })}</select></label>` : ''}
    <label>${t('খোঁজো')}<input id="pq" value="${esc(S.f.pq || '')}" placeholder="${t('নাম বা বিষয়')}"></label></div>`;
  if (staff) html += card(`<h3>${t('PDF আপলোড করো')}</h3>
    <form id="pf" class="grid">
      <label>${t('শিরোনাম')}<input name="ptitle" required placeholder="${t('অধ্যায় ৩ নোট')}"></label>
      <label>${t('বিষয়')}<input name="subject" placeholder="${t('পদার্থবিজ্ঞান')}"></label>
      <label>${t('কোন ব্যাচ')}<select name="batch">${batchOptions(S.f.pBatch, { all: true })}</select></label>
      <label>${t('ফাইল (সর্বোচ্চ ৫০ MB)')}<input name="file" type="file" accept="application/pdf,.pdf,image/*" required></label>
      <button class="primary">${t('আপলোড')}</button>
    </form>`);
  html += card(`<h3>${t('সব PDF ({n})', { n: num(rows.length) })}</h3>${rows.length ? rows.map(x => `<div class="row">
      <span class="pdf-ico" aria-hidden="true">PDF</span>
      <span class="grow"><b>${esc(x.title)}</b>
        <small>${esc([x.subject, fmtDate(x.created_at.slice(0, 10)), staff ? batchName(x.batch_id) : ''].filter(Boolean).join(' · '))}</small></span>
      ${urls[x.file_path] ? `<a class="btn sun small" href="${esc(urls[x.file_path])}" target="_blank" rel="noopener">${t('খুলো')}</a>` : `<span class="muted">${t('ফাইল নেই')}</span>`}
      ${staff ? `<button class="danger" data-delpdf="${x.id}">${t('মুছুন')}</button>` : ''}
    </div>`).join('') : empty(t('কোনো PDF পাওয়া যায়নি'))}`);
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
    if (file.size > MAX_FILE) return toast(t('ফাইলটা ৫০ MB-এর বেশি। ছোট করে আপলোড করো।'), true);
    await busy(f.querySelector('button'), t('আপলোড হচ্ছে…'), async () => {
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
      toast(t('আপলোড হয়েছে')); route();
    });
  };
  el.querySelectorAll('[data-delpdf]').forEach(b => b.onclick = async () => {
    if (!confirm(t('এই PDF মুছে ফেলবে?'))) return;
    const item = data.find(x => String(x.id) === b.dataset.delpdf);
    const rm = await sb.storage.from('materials').remove([item.file_path]);
    if (rm.error) return fail(rm.error);
    const { error } = await sb.from('materials').delete().eq('id', item.id);
    if (error) return fail(error);
    toast(t('মুছে ফেলা হয়েছে')); route();
  });
}

/* ---------- হাজিরা ---------- */
async function viewAttendance(el) {
  if (!isStaff()) return viewMyAttendance(el);
  const mode = S.f.aMode || 'take';
  const bid = S.f.aBatch ?? S.batches[0]?.id;
  const tabs = `<div class="seg-tabs"><a href="#attendance" data-mode="take" class="${mode === 'take' ? 'on' : ''}">${t('হাজিরা নাও')}</a><a href="#attendance" data-mode="report" class="${mode === 'report' ? 'on' : ''}">${t('মাসিক রিপোর্ট')}</a></div>`;
  const bindModes = () => el.querySelectorAll('[data-mode]').forEach(a => a.onclick = ev => { ev.preventDefault(); S.f.aMode = a.dataset.mode; route(); });
  if (!bid) { el.innerHTML = tabs + card(empty(t('আগে একটি ব্যাচ তৈরি করো।'))); bindModes(); return; }

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
        <label>${t('ব্যাচ')}<select id="ab">${batchOptions(bid)}</select></label>
        <label>${t('তারিখ')}<input id="ad" type="date" value="${date}" max="${todayStr()}"></label></div>` +
      card(`<h3>${esc(batchName(bid))} · ${fmtDate(date)}</h3>
        <div class="note">${done ? t('এই দিনের হাজিরা সেভ করা আছে। বদলে আবার সেভ করতে পারো।') : t('এই দিনের হাজিরা এখনো নেওয়া হয়নি। সবাই "উপস্থিত" ধরা আছে — যারা আসেনি তাদের বদলাও।')}</div>
        <div class="counts" id="cnt"></div>
        <div id="list">${students.length ? students.map(s => `<div class="att-row" data-id="${s.id}">
            <span><b>${esc(s.name)}</b><small>${esc(s.academy_id)}</small></span>
            <span class="seg">${['present', 'absent', 'late'].map(k => `<button type="button" data-s="${k}">${status(k)}</button>`).join('')}</span>
          </div>`).join('') : empty(t('এই ব্যাচে কোনো শিক্ষার্থী নেই'))}</div>
        ${students.length ? `<div class="savebar"><button class="light" id="allp">${t('সবাই উপস্থিত')}</button><button class="primary" id="save">${t('সেভ করো')}</button></div>` : ''}`);

    const paint = changed => {
      el.querySelectorAll('.att-row').forEach(row => row.querySelectorAll('button').forEach(b => {
        const on = marks[row.dataset.id] === b.dataset.s;
        b.className = on ? 'on ' + b.dataset.s : '';
        if (on && changed === row.dataset.id) { b.classList.add('pop'); }
      }));
      const c = { present: 0, absent: 0, late: 0 }; Object.values(marks).forEach(v => c[v]++);
      el.querySelector('#cnt').innerHTML = ['present', 'absent', 'late'].map(k => `<span class="pill ${k}">${status(k)}: ${num(c[k])}</span>`).join('');
    };
    paint();
    el.querySelector('#ab').onchange = e => { S.f.aBatch = Number(e.target.value); route(); };
    el.querySelector('#ad').onchange = e => { S.f.aDate = e.target.value || todayStr(); route(); };
    el.querySelectorAll('.att-row').forEach(row => row.querySelectorAll('button').forEach(b => b.onclick = () => { marks[row.dataset.id] = b.dataset.s; paint(row.dataset.id); }));
    const allp = el.querySelector('#allp');
    if (allp) allp.onclick = () => { ids.forEach(id => { marks[id] = 'present'; }); paint(); };
    const save = el.querySelector('#save');
    if (save) save.onclick = () => busy(save, t('সেভ হচ্ছে…'), async () => {
      const rows = students.map(s => ({ student_id: s.id, batch_id: bid, att_date: date, status: marks[s.id], marked_by: S.me.id }));
      const { error: e2 } = await sb.from('attendance').upsert(rows, { onConflict: 'student_id,att_date' });
      if (e2) return fail(e2);
      toast(t('হাজিরা সেভ হয়েছে ✓')); route();
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
        <label>${t('ব্যাচ')}<select id="ab">${batchOptions(bid)}</select></label>
        <label>${t('মাস')}<input id="am" type="month" value="${month}"></label></div>` +
      card(`<h3>${esc(batchName(bid))} · ${fmtDate(month + '-01', { month: 'long', year: 'numeric' })}</h3>
        <p class="muted">${t('মোট ক্লাসের দিন: {n}', { n: num(days) })}</p>
        ${rows.length ? `<div class="tbl-wrap"><table><thead><tr><th>${t('নাম')}</th><th>${status('present')}</th><th>${status('absent')}</th><th>${status('late')}</th><th>%</th></tr></thead><tbody>
          ${rows.map(({ s, sum }) => `<tr><td><b>${esc(s.name)}</b><small>${esc(s.academy_id)}</small></td><td>${num(sum.present)}</td><td>${num(sum.absent)}</td><td>${num(sum.late)}</td>
            <td class="${sum.total && sum.pct < 75 ? 'low' : ''}">${sum.total ? `<span class="bar"><i style="width:${sum.pct}%"></i></span>${num(sum.pct)}%` : '—'}</td></tr>`).join('')}
        </tbody></table></div><p class="hint">${t('৭৫%-এর কম উপস্থিতি লাল রঙে দেখানো হয়েছে।')}</p>` : empty(t('এই ব্যাচে কোনো শিক্ষার্থী নেই'))}`);
    el.querySelector('#ab').onchange = e => { S.f.aBatch = Number(e.target.value); route(); };
    el.querySelector('#am').onchange = e => { if (/^\d{4}-\d{2}$/.test(e.target.value)) { S.f.aMonth = e.target.value; route(); } };
  }
  bindModes();
}

async function viewMyAttendance(el) {
  const { data, error } = await sb.from('attendance').select('att_date,status').eq('student_id', S.me.id).order('att_date', { ascending: false });
  if (error) throw error;
  const all = attSummary(data);
  const mon = attSummary(data.filter(r => r.att_date.startsWith(todayStr().slice(0, 7))));
  el.innerHTML = `<div class="stats">${stat(all.total ? num(all.pct) + '%' : '—', t('মোট উপস্থিতি'))}${stat(mon.total ? num(mon.pct) + '%' : '—', t('এই মাসে'))}${stat(num(all.absent), t('অনুপস্থিত দিন'))}</div>` +
    card(`<h3>${t('আমার হাজিরা')}</h3>
      <div class="counts">${['present', 'absent', 'late'].map(k => `<span class="pill ${k}">${status(k)}: ${num(all[k])}</span>`).join('')}</div>
      ${data.length ? data.slice(0, 90).map(r => `<div class="row"><span class="grow">${fmtDate(r.att_date)}</span><span class="pill ${r.status}">${status(r.status)}</span></div>`).join('') : empty(t('এখনো কোনো হাজিরা নেওয়া হয়নি'))}`);
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
  const roleOpts = ['student', 'teacher', 'admin'].map(r => `<option value="${r}">${role(r)}</option>`).join('');

  el.innerHTML = `<div class="stats">${stat(num(c.student), t('শিক্ষার্থী'))}${stat(num(c.teacher + c.admin), t('শিক্ষক/অ্যাডমিন'))}${stat(num(S.batches.length), t('ব্যাচ'))}</div>` +
    card(`<h3>${t('ব্যাচ')}</h3>
      <div class="chips">${S.batches.length ? S.batches.map(b => `<span class="chip">${esc(b.name)}<button data-delb="${b.id}" title="${t('মুছুন')}">×</button></span>`).join('') : `<span class="muted">${t('এখনো কোনো ব্যাচ নেই')}</span>`}</div>
      <form id="bf" class="inline"><input name="bname" required placeholder="${t('নতুন ব্যাচ (যেমন HSC 2027)')}"><button class="primary">${t('যোগ')}</button></form>`) +
    card(`<h3>${t('নতুন সদস্য যোগ করো')}</h3>
      <form id="mf" class="grid">
        <label>${t('নাম')}<input name="mname" required></label>
        <label>Academy ID<input name="aid" required autocapitalize="none" autocorrect="off" placeholder="tsa2601"></label>
        <label>${t('মোবাইল নম্বর')}<input name="phone" required inputmode="numeric" placeholder="01XXXXXXXXX"></label>
        <label>${t('ভূমিকা')}<select name="role">${roleOpts}</select></label>
        <label>${t('ব্যাচ')}<select name="batch">${batchOptions(S.batches[0]?.id, { none: true })}</select></label>
        <button class="primary">${t('যোগ করো')}</button>
        <p class="hint wide">${t('সদস্য লগইন করবে: Academy ID + এই মোবাইল নম্বর দিয়ে। ID-তে শুধু ইংরেজি অক্ষর ও সংখ্যা।')}</p>
      </form>`) +
    card(`<h3>${t('সব সদস্য')}</h3>
      <div class="filters">
        <select id="fr"><option value="">${t('সব ভূমিকা')}</option>${roleOpts}</select>
        <select id="fb">${batchOptions('', { all: true })}</select>
        <input id="fq" placeholder="${t('নাম / ID / নম্বর')}">
      </div><div id="ml"></div>`);

  const ml = el.querySelector('#ml');
  const renderList = () => {
    const r = el.querySelector('#fr').value, b = el.querySelector('#fb').value, q = el.querySelector('#fq').value.trim().toLowerCase();
    const list = data.filter(m => (!r || m.role === r) && (!b || String(m.batch_id) === b) && (!q || `${m.name} ${m.academy_id} ${m.phone}`.toLowerCase().includes(q)));
    ml.innerHTML = list.length ? list.map(m => `<div class="row mem">
        <span class="avatar" aria-hidden="true">${esc((m.name || '?').trim().charAt(0).toUpperCase())}</span>
        <span class="grow"><b>${esc(m.name)}</b><small>${esc(m.academy_id)} · ${esc(m.phone)}</small></span>
        <span class="tag ${m.role === 'student' ? '' : 'navy'}">${role(m.role)}${m.role === 'student' ? ' · ' + esc(m.batch_id ? batchName(m.batch_id) : t('ব্যাচ নেই')) : ''}</span>
        <span class="acts"><button class="light small" data-edit="${m.id}">${t('এডিট')}</button></span>
      </div>`).join('') : empty(t('কেউ নেই'));
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
    if (be) return fail(be.code === '23505' ? t('এই নামে ব্যাচ আগেই আছে') : be);
    await loadBatches(); toast(t('ব্যাচ যোগ হয়েছে')); route();
  };
  el.querySelectorAll('[data-delb]').forEach(b => b.onclick = async () => {
    if (!confirm(t('"{b}" ব্যাচ মুছবে? এর রুটিন, পরীক্ষা ও PDF-ও মুছে যাবে। শিক্ষার্থীরা থাকবে, কিন্তু ব্যাচ ছাড়া।', { b: batchName(Number(b.dataset.delb)) }))) return;
    const { error: de } = await sb.from('batches').delete().eq('id', b.dataset.delb);
    if (de) return fail(de);
    await loadBatches(); toast(t('ব্যাচ মুছে ফেলা হয়েছে')); route();
  });

  // সদস্য যোগ
  const mf = el.querySelector('#mf');
  mf.onsubmit = async e => {
    e.preventDefault();
    const name = val(mf, 'mname'), aid = normId(val(mf, 'aid')), phone = normPhone(val(mf, 'phone'));
    const rl = val(mf, 'role'), batch_id = numOrNull(val(mf, 'batch'));
    if (!/^[a-z0-9._-]{2,30}$/.test(aid)) return toast(t('Academy ID-তে শুধু ইংরেজি অক্ষর/সংখ্যা দাও (যেমন tsa2601)'), true);
    if (!/^\d{6,15}$/.test(phone)) return toast(t('মোবাইল নম্বর ঠিক নেই'), true);
    if (rl === 'student' && !batch_id) return toast(t('শিক্ষার্থীর জন্য ব্যাচ বেছে নাও'), true);
    if (data.some(m => m.academy_id === aid)) return toast(t('এই Academy ID আগেই আছে'), true);

    await busy(mf.querySelector('button'), t('যোগ হচ্ছে…'), async () => {
      const { data: su, error: se } = await signupClient().auth.signUp({ email: idToEmail(aid), password: phone });
      if (se) return fail(/registered|exists/i.test(se.message) ? t('এই ID দিয়ে আগেই একটি লগইন আছে') : se);
      if (!su.user || (su.user.identities && su.user.identities.length === 0)) return toast(t('এই ID দিয়ে আগেই একটি লগইন আছে'), true);
      const { error: ie } = await sb.from('members').insert({ id: su.user.id, academy_id: aid, name, phone, role: rl, batch_id: rl === 'student' ? batch_id : null });
      if (ie) { await sb.rpc('admin_delete_user', { target: su.user.id }); return fail(ie); }
      await signupClient().auth.signOut().catch(() => {});
      if (!su.session) toast(t('যোগ হয়েছে, কিন্তু Supabase-এ "Confirm email" চালু আছে — README-র ধাপ ৩ দেখো'), true);
      else toast(t('যোগ হয়েছে ✓ লগইন: {a} + {p}', { a: aid, p: phone }));
      route();
    });
  };
}

function editMember(m) {
  const self = m.id === S.me.id;
  openDialog(`<form method="dialog" id="ed">
    <h3>${esc(t('সদস্য এডিট · {a}', { a: m.academy_id }))}</h3>
    <label>${t('নাম')}<input name="mname" required value="${esc(m.name)}"></label>
    <label>${t('মোবাইল নম্বর (এটাই পাসওয়ার্ড)')}<input name="phone" required inputmode="numeric" value="${esc(m.phone)}"></label>
    <label>${t('ভূমিকা')}<select name="role" ${self ? 'disabled' : ''}>${['student', 'teacher', 'admin'].map(r => `<option value="${r}" ${m.role === r ? 'selected' : ''}>${role(r)}</option>`).join('')}</select></label>
    <label>${t('ব্যাচ')}<select name="batch">${batchOptions(m.batch_id, { none: true })}</select></label>
    <div class="acts">
      ${self ? '' : `<button type="button" class="danger" id="del">${t('মুছে ফেলো')}</button>`}
      <span style="flex:1"></span>
      <button type="button" class="light" id="cancel">${t('বাতিল')}</button>
      <button type="submit" class="primary" id="ok">${t('সেভ')}</button>
    </div></form>`, d => {
    const f = d.querySelector('#ed');
    d.querySelector('#cancel').onclick = () => d.close();
    const del = d.querySelector('#del');
    if (del) del.onclick = async () => {
      if (!confirm(t('{n}-কে পুরোপুরি মুছে ফেলবে? তার হাজিরার রেকর্ডও মুছে যাবে।', { n: m.name }))) return;
      const { error } = await sb.rpc('admin_delete_user', { target: m.id });
      if (error) return fail(error);
      d.close(); toast(t('সদস্য মুছে ফেলা হয়েছে')); route();
    };
    f.onsubmit = async e => {
      e.preventDefault();
      const phone = normPhone(val(f, 'phone'));
      const rl = self ? m.role : val(f, 'role');
      const batch_id = numOrNull(val(f, 'batch'));
      if (!/^\d{6,15}$/.test(phone)) return toast(t('মোবাইল নম্বর ঠিক নেই'), true);
      if (rl === 'student' && !batch_id) return toast(t('শিক্ষার্থীর জন্য ব্যাচ বেছে নাও'), true);
      await busy(d.querySelector('#ok'), t('সেভ হচ্ছে…'), async () => {
        if (phone !== m.phone) {
          const { error: pe } = await sb.rpc('admin_set_password', { target: m.id, new_password: phone });
          if (pe) return fail(pe);
        }
        const { error } = await sb.from('members').update({ name: val(f, 'mname'), phone, role: rl, batch_id: rl === 'student' ? batch_id : null }).eq('id', m.id);
        if (error) return fail(error);
        d.close(); toast(t('সেভ হয়েছে')); route();
      });
    };
  });
}

init().catch(fail);
