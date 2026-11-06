import { firebaseConfig, ADMIN_EMAIL, API_BASE_URL, APP_CHECK_SITE_KEY } from './config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, orderBy, limit, serverTimestamp, Timestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const $ = id => document.getElementById(id);
const app = initializeApp(firebaseConfig);
if (APP_CHECK_SITE_KEY) {
  try {
    const { initializeAppCheck, ReCaptchaV3Provider } = await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-check.js');
    initializeAppCheck(app, { provider: new ReCaptchaV3Provider(APP_CHECK_SITE_KEY), isTokenAutoRefreshEnabled: true });
  } catch (e) { console.warn('App Check not started', e); }
}
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
let currentUser = null, toastTimer;
let users = [], ents = [], subs = [], anns = [], promos = [], feedback = [], logs = [];

$('ownerEmailLabel').textContent = ADMIN_EMAIL;
$('footerProject').textContent = `Project: ${firebaseConfig.projectId}`;
$('googleBtn').addEventListener('click', async () => {
  $('authStatus').textContent = 'Opening Google sign-in…';
  try { await signInWithPopup(auth, provider); } catch (e) { $('authStatus').textContent = friendlyError(e); }
});
$('signOutBtn').addEventListener('click', () => signOut(auth));

function friendlyError(e) {
  const map = {
    'auth/unauthorized-domain': 'This website domain is not authorized. Add its hostname in Firebase Authentication settings.',
    'auth/popup-blocked': 'The sign-in popup was blocked. Allow popups for this site and try again.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled.',
    'permission-denied': 'Firestore denied this action. Check that the latest rules file has been published.'
  };
  return map[e?.code] || e?.message || 'Something went wrong. Please try again.';
}
function notify(m) { const t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3200); }
const esc = (v = '') => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const millis = v => v?.toDate ? v.toDate().getTime() : (v ? new Date(v).getTime() : 0);
function dateText(v) { if (!v) return '—'; const d = v?.toDate ? v.toDate() : new Date(v); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(); }
function showApp(u) { $('authView').classList.add('hidden'); $('appView').classList.remove('hidden'); $('signedInEmail').textContent = u.email || u.uid; $('connectionState').textContent = 'Firebase connected'; $('connectionState').className = 'pill good'; }
function showAuth(m = 'Sign in with your authorized Google account.') { $('appView').classList.add('hidden'); $('authView').classList.remove('hidden'); $('authStatus').textContent = m; }

onAuthStateChanged(auth, async user => {
  if (!user) { currentUser = null; showAuth(); return; }
  if ((user.email || '').toLowerCase() !== ADMIN_EMAIL.toLowerCase() || !user.emailVerified) { await signOut(auth); showAuth(`Access denied. Sign in with ${ADMIN_EMAIL}.`); return; }
  currentUser = user; showApp(user); await loadAll();
});
setPersistence(auth, browserLocalPersistence).catch(() => {});

// ---- navigation -------------------------------------------------------------------------------------------
const TITLES = { overview: 'Overview', users: 'Users', payments: 'Payments', announcements: 'Announcements', promos: 'Promo codes', feedback: 'Feedback', audit: 'Audit log' };
for (const b of document.querySelectorAll('.nav')) b.addEventListener('click', () => openPage(b.dataset.page));
function openPage(name) {
  document.querySelectorAll('.nav').forEach(b => b.classList.toggle('active', b.dataset.page === name));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === `page-${name}`));
  $('pageTitle').textContent = TITLES[name] || 'Overview';
}

// ---- server + audit helpers ---------------------------------------------------------------------------------
async function api(path, body) {
  if (!API_BASE_URL) throw new Error('Set API_BASE_URL in assets/config.js (the Halloween AI server address) first.');
  const token = await currentUser.getIdToken();
  const r = await fetch(API_BASE_URL.replace(/\/$/, '') + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Server error ${r.status}`);
  return data;
}
async function logAction(action, target = null, detail = null) {
  try { await addDoc(collection(db, 'adminLog'), { admin: currentUser.email, action, target, detail, createdAt: serverTimestamp() }); } catch (e) { console.warn('audit log failed', e); }
}

// ---- loading ----------------------------------------------------------------------------------------------------
async function loadAll() {
  $('connectionState').textContent = 'Loading data…'; $('connectionState').className = 'pill';
  try {
    await Promise.all([loadUsers(), loadEnts(), loadSubs(), loadAnns(), loadPromos(), loadFeedback(), loadLogs()]);
    $('connectionState').textContent = 'Firebase connected'; $('connectionState').className = 'pill good';
    renderUsers(); updateStats();
  } catch (e) { $('connectionState').textContent = 'Database error'; $('connectionState').className = 'pill bad'; notify(friendlyError(e)); }
}
const docs = snap => snap.docs.map(d => ({ id: d.id, ...d.data() }));
async function loadUsers() { users = docs(await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')))).map(u => ({ ...u, uid: u.id })); renderUsers(); }
async function loadEnts() { ents = docs(await getDocs(collection(db, 'entitlements'))); }
async function loadSubs() { subs = docs(await getDocs(query(collection(db, 'subscriptions'), orderBy('updatedAt', 'desc')))); renderSubs(); }
async function loadAnns() { anns = docs(await getDocs(query(collection(db, 'announcements'), orderBy('createdAt', 'desc')))); renderAnns(); }
async function loadPromos() { promos = docs(await getDocs(query(collection(db, 'promoCodes'), orderBy('createdAt', 'desc')))); renderPromos(); }
async function loadFeedback() { feedback = docs(await getDocs(query(collection(db, 'feedback'), orderBy('createdAt', 'desc'), limit(200)))); renderFeedback(); }
async function loadLogs() { logs = docs(await getDocs(query(collection(db, 'adminLog'), orderBy('createdAt', 'desc'), limit(100)))); renderLogs(); }

function accessOf(uid) {
  const e = ents.find(x => x.id === uid); if (!e) return { label: 'none', on: false };
  if (e.blocked === true) return { label: 'blocked', on: false, blocked: true };
  const now = Date.now();
  if (e.paymentStatus === 'active' && (!e.paidUntil || millis(e.paidUntil) > now)) return { label: 'paid', on: true };
  if (millis(e.promoUntil) > now) return { label: 'promo', on: true };
  return { label: 'none', on: false };
}
function updateStats() {
  $('statUsers').textContent = users.length;
  $('statUnlocked').textContent = ents.filter(e => accessOf(e.id).on).length;
  $('statFeedback').textContent = feedback.filter(f => f.status !== 'done').length;
  $('statBlocked').textContent = ents.filter(e => e.blocked === true).length;
  $('setupList').innerHTML = [
    [!!API_BASE_URL, 'Halloween AI server address set (API_BASE_URL)'],
    [subs.length > 0, 'At least one verified payment recorded'],
    [true, 'Entitlements are written only by the server (rules block everything else)'],
    [!!APP_CHECK_SITE_KEY, 'App Check key set for this dashboard']
  ].map(([ok, t]) => `<li><span class="${ok ? 'check' : 'pending'}">${ok ? '✓' : '!'}</span> ${esc(t)}</li>`).join('');
}

// ---- users / blocking -------------------------------------------------------------------------------------------------
function renderUsers() {
  const q = ($('userSearch').value || '').toLowerCase();
  const rows = users.filter(u => `${u.email || ''} ${u.uid}`.toLowerCase().includes(q));
  $('userCount').textContent = `${users.length} profiles`;
  $('userRows').innerHTML = rows.length ? rows.map(u => { const a = accessOf(u.uid);
    return `<tr><td><b>${esc(u.displayName || u.email || 'User')}</b><small>${esc(u.email || '')}</small></td><td class="mono">${esc(u.uid)}</td><td>${esc(dateText(u.createdAt))}</td><td>${esc(dateText(u.lastSeenAt))}</td><td><span class="tag ${a.on ? 'green' : ''}">${a.label}</span></td><td><button class="table-btn ${a.blocked ? '' : 'danger'}" data-block="${esc(u.uid)}" data-state="${a.blocked ? 'blocked' : 'ok'}">${a.blocked ? 'Unblock' : 'Block'}</button></td></tr>`; }).join('')
    : '<tr><td colspan="6" class="empty">No matching user profiles.</td></tr>';
  document.querySelectorAll('[data-block]').forEach(b => b.onclick = () => toggleBlock(b.dataset.block, b.dataset.state !== 'blocked'));
}
async function toggleBlock(uid, block) {
  let reason = '';
  if (block) { reason = prompt(`Block ${uid}? They lose Imagine and cannot send feedback or redeem codes.\nReason (only you see it):`); if (reason === null) return; }
  else if (!confirm(`Unblock ${uid}?`)) return;
  try { await api('/admin/block', { uid, blocked: block, reason }); await loadEnts(); await loadLogs(); renderUsers(); updateStats(); notify(block ? 'Account blocked.' : 'Account unblocked.'); }
  catch (e) { notify(friendlyError(e)); }
}

// ---- payments (read only) -----------------------------------------------------------------------------------------
function renderSubs() {
  const q = ($('subSearch').value || '').toLowerCase();
  const rows = subs.filter(s => `${s.uid || ''} ${s.providerSubscriptionId || ''}`.toLowerCase().includes(q));
  $('subCount').textContent = `${subs.length} records`;
  $('subRows').innerHTML = rows.length ? rows.map(s => `<tr><td class="mono">${esc(s.uid || '—')}</td><td><span class="tag green">${esc(s.status || 'unknown')}</span></td><td class="mono">${esc(s.providerSubscriptionId || s.id)}</td><td>${esc(dateText(s.periodEnd))}</td><td>${esc(dateText(s.updatedAt))}</td></tr>`).join('') : '<tr><td colspan="5" class="empty">No matching payment records.</td></tr>';
}

// ---- announcements ------------------------------------------------------------------------------------------------------
function renderAnns() {
  $('announcementList').innerHTML = anns.length ? anns.map(a => `<article class="announcement"><div><b>${esc(a.title || 'Untitled')}</b><p>${esc(a.body || '')}</p><small>${a.published ? 'Published' : 'Draft'} · ${esc(dateText(a.createdAt))}</small></div><div class="ann-actions"><button class="table-btn" data-toggle-ann="${esc(a.id)}">${a.published ? 'Unpublish' : 'Publish'}</button><button class="table-btn danger" data-delete-ann="${esc(a.id)}">Delete</button></div></article>`).join('') : '<p class="empty">No announcements yet.</p>';
  document.querySelectorAll('[data-toggle-ann]').forEach(b => b.onclick = async () => { const a = anns.find(x => x.id === b.dataset.toggleAnn); if (!a) return;
    try { await updateDoc(doc(db, 'announcements', a.id), { published: !a.published, updatedAt: serverTimestamp() }); await logAction(a.published ? 'unpublish_announcement' : 'publish_announcement', a.id, a.title); await Promise.all([loadAnns(), loadLogs()]); notify('Announcement updated.'); } catch (e) { notify(friendlyError(e)); } });
  document.querySelectorAll('[data-delete-ann]').forEach(b => b.onclick = async () => { if (!confirm('Delete this announcement?')) return; const a = anns.find(x => x.id === b.dataset.deleteAnn);
    try { await deleteDoc(doc(db, 'announcements', b.dataset.deleteAnn)); await logAction('delete_announcement', b.dataset.deleteAnn, a?.title || null); await Promise.all([loadAnns(), loadLogs()]); notify('Announcement deleted.'); } catch (e) { notify(friendlyError(e)); } });
}
$('announcementForm').addEventListener('submit', async e => {
  e.preventDefault();
  const title = $('announcementTitle').value.trim(), body = $('announcementBody').value.trim();
  const wantPush = $('announcementPush').checked && $('announcementPublished').checked;
  try {
    const ref = await addDoc(collection(db, 'announcements'), { title, body, type: $('announcementType').value, published: $('announcementPublished').checked, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdBy: currentUser.uid });
    await logAction('create_announcement', ref.id, title);
    let pushNote = '';
    if (wantPush) { try { await api('/admin/push', { title, body }); pushNote = ' Push sent.'; } catch (err) { pushNote = ` Saved, but push failed: ${err.message}`; } }
    e.target.reset(); $('announcementPublished').checked = true; await Promise.all([loadAnns(), loadLogs()]); updateStats(); notify('Announcement saved.' + pushNote);
  } catch (err) { notify(friendlyError(err)); }
});

// ---- promo codes ----------------------------------------------------------------------------------------------------------
function renderPromos() {
  $('promoCount').textContent = `${promos.length} codes`;
  $('promoList').innerHTML = promos.length ? promos.map(p => `<article class="announcement"><div><b class="mono">${esc(p.id)}</b><p>${esc(p.days)} days · used ${esc(p.uses || 0)}${p.maxUses ? ' / ' + esc(p.maxUses) : ' (unlimited)'}${p.expiresAt ? ' · expires ' + esc(dateText(p.expiresAt)) : ''}</p><small>${p.active ? 'Active' : 'Disabled'} · ${esc(dateText(p.createdAt))}</small></div><div class="ann-actions"><button class="table-btn ${p.active ? 'danger' : ''}" data-toggle-promo="${esc(p.id)}">${p.active ? 'Disable' : 'Enable'}</button></div></article>`).join('') : '<p class="empty">No promo codes yet.</p>';
  document.querySelectorAll('[data-toggle-promo]').forEach(b => b.onclick = async () => { const p = promos.find(x => x.id === b.dataset.togglePromo); if (!p) return;
    try { await updateDoc(doc(db, 'promoCodes', p.id), { active: !p.active }); await logAction(p.active ? 'disable_promo' : 'enable_promo', p.id); await Promise.all([loadPromos(), loadLogs()]); notify('Promo code updated.'); } catch (e) { notify(friendlyError(e)); } });
}
$('promoForm').addEventListener('submit', async e => {
  e.preventDefault();
  const code = $('promoCode').value.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) { notify('Code: 3 to 40 letters, numbers, - or _.'); return; }
  const days = Math.min(Math.max(parseInt($('promoDays').value, 10) || 1, 1), 366);
  const maxUses = Math.max(parseInt($('promoMax').value, 10) || 0, 0);
  const exp = $('promoExpires').value;
  try {
    if ((await getDoc(doc(db, 'promoCodes', code))).exists()) { notify('That code already exists.'); return; }
    const data = { days, maxUses, uses: 0, active: true, createdAt: serverTimestamp(), createdBy: currentUser.uid };
    if (exp) data.expiresAt = Timestamp.fromDate(new Date(exp + 'T23:59:59'));
    await setDoc(doc(db, 'promoCodes', code), data);
    await logAction('create_promo', code, `${days} days, max ${maxUses}`);
    e.target.reset(); $('promoDays').value = 7; $('promoMax').value = 0; await Promise.all([loadPromos(), loadLogs()]); notify('Promo code created.');
  } catch (err) { notify(friendlyError(err)); }
});

// ---- feedback ------------------------------------------------------------------------------------------------------------------
function renderFeedback() {
  $('feedbackList').innerHTML = feedback.length ? feedback.map(f => `<article class="announcement"><div><b>${esc(f.category || 'feedback')} · ${f.status === 'done' ? 'Done' : 'New'}</b><p>${esc(f.message || '')}</p><small>${esc(dateText(f.createdAt))} · v${esc(f.appVersion || '?')} · ${esc(f.device || '')} · <span class="mono">${esc(f.uid || '')}</span></small></div><div class="ann-actions"><button class="table-btn" data-done-fb="${esc(f.id)}">${f.status === 'done' ? 'Reopen' : 'Mark done'}</button><button class="table-btn danger" data-delete-fb="${esc(f.id)}">Delete</button></div></article>`).join('') : '<p class="empty">No feedback yet.</p>';
  document.querySelectorAll('[data-done-fb]').forEach(b => b.onclick = async () => { const f = feedback.find(x => x.id === b.dataset.doneFb); if (!f) return;
    try { await updateDoc(doc(db, 'feedback', f.id), { status: f.status === 'done' ? 'new' : 'done' }); await loadFeedback(); updateStats(); } catch (e) { notify(friendlyError(e)); } });
  document.querySelectorAll('[data-delete-fb]').forEach(b => b.onclick = async () => { if (!confirm('Delete this message?')) return;
    try { await deleteDoc(doc(db, 'feedback', b.dataset.deleteFb)); await loadFeedback(); updateStats(); } catch (e) { notify(friendlyError(e)); } });
}

// ---- audit log --------------------------------------------------------------------------------------------------------------------
function renderLogs() {
  $('auditRows').innerHTML = logs.length ? logs.map(l => `<tr><td>${esc(dateText(l.createdAt))}</td><td>${esc(l.action)}</td><td class="mono">${esc(l.target || '—')}</td><td>${esc(l.detail || '')}</td></tr>`).join('') : '<tr><td colspan="4" class="empty">Nothing logged yet.</td></tr>';
}

$('userSearch').addEventListener('input', renderUsers);
$('subSearch').addEventListener('input', renderSubs);
const refresh = (fn) => () => fn().then(() => { renderUsers(); updateStats(); }).catch(e => notify(friendlyError(e)));
$('refreshUsers').onclick = refresh(async () => { await Promise.all([loadUsers(), loadEnts()]); });
$('refreshSubs').onclick = refresh(loadSubs);
$('refreshAnnouncements').onclick = refresh(loadAnns);
$('refreshPromos').onclick = refresh(loadPromos);
$('refreshFeedback').onclick = refresh(loadFeedback);
$('refreshAudit').onclick = refresh(loadLogs);
