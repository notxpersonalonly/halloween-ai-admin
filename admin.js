import { firebaseConfig, ADMIN_EMAIL } from './config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, Timestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const $ = id => document.getElementById(id);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
let currentUser = null;
let usersCache = [], entitlementsCache = [], subscriptionsCache = [], announcementsCache = [];
let toastTimer;

$('ownerEmailLabel').textContent = ADMIN_EMAIL;
$('footerProject').textContent = `Project: ${firebaseConfig.projectId}`;
$('googleBtn').addEventListener('click', async () => {
  $('authStatus').textContent = 'Opening Google sign-in…';
  try { await signInWithPopup(auth, provider); }
  catch (e) { $('authStatus').textContent = friendlyError(e); }
});
$('signOutBtn').addEventListener('click', () => signOut(auth));

function friendlyError(e) {
  const map = {
    'auth/unauthorized-domain': 'This website domain is not authorized. Add its hostname in Firebase Authentication settings.',
    'auth/popup-blocked': 'The sign-in popup was blocked. Allow popups for this site and try again.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled.',
    'permission-denied': 'Firestore denied this action. Check that the Firestore rules file has been published.'
  };
  return map[e?.code] || e?.message || 'Something went wrong. Please try again.';
}
function notify(message) {
  const t = $('toast'); t.textContent = message; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}
function esc(v='') { return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function dateText(v) {
  if (!v) return '—';
  const d = v?.toDate ? v.toDate() : new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}
function showApp(user) {
  $('authView').classList.add('hidden'); $('appView').classList.remove('hidden');
  $('signedInEmail').textContent = user.email || user.uid;
  $('connectionState').textContent = 'Firebase connected'; $('connectionState').className = 'pill good';
}
function showAuth(message='Sign in with your authorized Google account.') {
  $('appView').classList.add('hidden'); $('authView').classList.remove('hidden'); $('authStatus').textContent = message;
}

onAuthStateChanged(auth, async user => {
  if (!user) { currentUser = null; showAuth('Sign in with the authorized Google account.'); return; }
  if ((user.email || '').toLowerCase() !== ADMIN_EMAIL.toLowerCase() || !user.emailVerified) {
    await signOut(auth); showAuth(`Access denied. Sign in with ${ADMIN_EMAIL}.`); return;
  }
  currentUser = user; showApp(user); await loadAll();
});
setPersistence(auth, browserLocalPersistence).catch(() => {});

// Navigation
for (const b of document.querySelectorAll('.nav')) b.addEventListener('click', () => openPage(b.dataset.page));
function openPage(name) {
  document.querySelectorAll('.nav').forEach(b => b.classList.toggle('active', b.dataset.page === name));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === `page-${name}`));
  $('pageTitle').textContent = ({overview:'Overview',users:'Users',entitlements:'Imagine access',subscriptions:'Subscriptions',announcements:'Announcements',settings:'App settings'})[name] || 'Overview';
}

async function loadAll() {
  $('connectionState').textContent = 'Loading data…'; $('connectionState').className = 'pill';
  try {
    await Promise.all([loadUsers(), loadEntitlements(), loadSubscriptions(), loadAnnouncements(), loadSettings()]);
    $('connectionState').textContent = 'Firebase connected'; $('connectionState').className = 'pill good';
    updateStats();
  } catch (e) {
    $('connectionState').textContent = 'Database error'; $('connectionState').className = 'pill bad';
    notify(friendlyError(e));
  }
}
async function loadUsers() {
  const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
  usersCache = snap.docs.map(d => ({ uid:d.id, ...d.data() })); renderUsers();
}
async function loadEntitlements() {
  const snap = await getDocs(collection(db, 'entitlements'));
  entitlementsCache = snap.docs.map(d => ({ uid:d.id, ...d.data() })); renderEntitlements();
}
async function loadSubscriptions() {
  const snap = await getDocs(collection(db, 'subscriptions'));
  subscriptionsCache = snap.docs.map(d => ({ id:d.id, ...d.data() })); renderSubscriptions();
}
async function loadAnnouncements() {
  const snap = await getDocs(query(collection(db, 'announcements'), orderBy('createdAt', 'desc')));
  announcementsCache = snap.docs.map(d => ({ id:d.id, ...d.data() })); renderAnnouncements();
}
async function loadSettings() {
  const snap = await getDoc(doc(db, 'appConfig', 'public'));
  const s = snap.exists() ? snap.data() : {};
  $('appVersion').value = s.version || '';
  $('minVersion').value = s.minVersion || '';
  $('updateMessage').value = s.updateMessage || '';
  $('maintenanceMode').checked = !!s.maintenance;
  $('maintenanceMessage').value = s.maintenanceMessage || '';
}
function updateStats() {
  const now = Date.now();
  const unlocked = entitlementsCache.filter(e => {
    const paid = e.paymentStatus === 'active' && (!e.paidUntil || (e.paidUntil.toDate ? e.paidUntil.toDate().getTime() : new Date(e.paidUntil).getTime()) > now);
    const manualUntil = e.manualAccessUntil?.toDate ? e.manualAccessUntil.toDate().getTime() : (e.manualAccessUntil ? new Date(e.manualAccessUntil).getTime() : 0);
    return paid || manualUntil > now;
  }).length;
  $('statUsers').textContent = usersCache.length;
  $('statSubs').textContent = subscriptionsCache.filter(s => ['active','in_grace_period'].includes(s.status)).length;
  $('statUnlocked').textContent = unlocked;
  $('statAnnouncements').textContent = announcementsCache.filter(a => a.published).length;
}

function renderUsers() {
  const q = ($('userSearch').value || '').toLowerCase();
  const rows = usersCache.filter(u => `${u.email||''} ${u.uid}`.toLowerCase().includes(q));
  $('userCount').textContent = `${usersCache.length} profiles`;
  $('userRows').innerHTML = rows.length ? rows.map(u => `<tr><td><b>${esc(u.displayName || u.email || 'User')}</b><small>${esc(u.email || '')}</small></td><td class="mono">${esc(u.uid)}</td><td>${esc(dateText(u.createdAt))}</td><td>${esc(dateText(u.lastSeenAt))}</td></tr>`).join('') : '<tr><td colspan="4" class="empty">No matching user profiles.</td></tr>';
}
function renderEntitlements() {
  const q = ($('entSearch').value || '').toLowerCase();
  const rows = entitlementsCache.filter(e => e.uid.toLowerCase().includes(q));
  $('entRows').innerHTML = rows.length ? rows.map(e => `<tr><td class="mono">${esc(e.uid)}</td><td>${esc(e.paymentStatus || 'none')}</td><td>${esc(dateText(e.paidUntil))}</td><td>${esc(dateText(e.manualAccessUntil))}</td><td><button class="table-btn" data-grant="${esc(e.uid)}">Grant 7 days</button> <button class="table-btn danger" data-revoke="${esc(e.uid)}">Remove manual access</button></td></tr>`).join('') : '<tr><td colspan="5" class="empty">No matching entitlement records.</td></tr>';
  document.querySelectorAll('[data-grant]').forEach(b => b.onclick = () => grantManual(b.dataset.grant));
  document.querySelectorAll('[data-revoke]').forEach(b => b.onclick = () => revokeManual(b.dataset.revoke));
}
async function grantManual(uid) {
  if (!confirm(`Grant a 7-day MANUAL trial to ${uid}? This does not record a payment.`)) return;
  const until = Timestamp.fromDate(new Date(Date.now() + 7*24*60*60*1000));
  await setDoc(doc(db, 'entitlements', uid), { manualAccessUntil:until, manualGrantBy:currentUser.uid, manualGrantEmail:currentUser.email, updatedAt:serverTimestamp(), source:'manual_admin' }, { merge:true });
  await loadEntitlements(); updateStats(); notify('Seven-day manual access granted.');
}
async function revokeManual(uid) {
  if (!confirm(`Remove manual access for ${uid}? Verified paid access, if any, is not changed.`)) return;
  await setDoc(doc(db, 'entitlements', uid), { manualAccessUntil:Timestamp.fromDate(new Date(0)), manualGrantBy:currentUser.uid, updatedAt:serverTimestamp(), source:'manual_admin' }, { merge:true });
  await loadEntitlements(); updateStats(); notify('Manual access removed.');
}
function renderSubscriptions() {
  const q = ($('subSearch').value || '').toLowerCase();
  const rows = subscriptionsCache.filter(s => `${s.uid||''} ${s.providerSubscriptionId||''} ${s.provider||''}`.toLowerCase().includes(q));
  $('subCount').textContent = `${subscriptionsCache.length} records`;
  $('subRows').innerHTML = rows.length ? rows.map(s => `<tr><td class="mono">${esc(s.uid || '—')}</td><td><span class="tag ${s.status==='active'?'green':''}">${esc(s.status || 'unknown')}</span></td><td>${esc(s.provider || '—')}</td><td>${esc(dateText(s.periodEnd))}</td><td>${esc(dateText(s.updatedAt))}</td></tr>`).join('') : '<tr><td colspan="5" class="empty">No matching subscription records.</td></tr>';
}
function renderAnnouncements() {
  $('announcementList').innerHTML = announcementsCache.length ? announcementsCache.map(a => `<article class="announcement"><div><b>${esc(a.title || 'Untitled')}</b><p>${esc(a.body || '')}</p><small>${a.published ? 'Published' : 'Draft'} · ${esc(dateText(a.createdAt))}</small></div><div class="ann-actions"><button class="table-btn" data-toggle-ann="${esc(a.id)}">${a.published?'Unpublish':'Publish'}</button><button class="table-btn danger" data-delete-ann="${esc(a.id)}">Delete</button></div></article>`).join('') : '<p class="empty">No announcements yet.</p>';
  document.querySelectorAll('[data-toggle-ann]').forEach(b => b.onclick = async () => { const a = announcementsCache.find(x => x.id === b.dataset.toggleAnn); if (!a) return; await updateDoc(doc(db,'announcements',a.id),{published:!a.published,updatedAt:serverTimestamp()}); await loadAnnouncements(); updateStats(); notify('Announcement updated.'); });
  document.querySelectorAll('[data-delete-ann]').forEach(b => b.onclick = async () => { if (!confirm('Delete this announcement?')) return; await deleteDoc(doc(db,'announcements',b.dataset.deleteAnn)); await loadAnnouncements(); updateStats(); notify('Announcement deleted.'); });
}

$('userSearch').addEventListener('input', renderUsers);
$('entSearch').addEventListener('input', renderEntitlements);
$('subSearch').addEventListener('input', renderSubscriptions);
$('refreshUsers').onclick = () => loadUsers().then(updateStats).catch(e=>notify(friendlyError(e)));
$('refreshEntitlements').onclick = () => loadEntitlements().then(updateStats).catch(e=>notify(friendlyError(e)));
$('refreshSubs').onclick = () => loadSubscriptions().then(updateStats).catch(e=>notify(friendlyError(e)));
$('refreshAnnouncements').onclick = () => loadAnnouncements().then(updateStats).catch(e=>notify(friendlyError(e)));
$('announcementForm').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await addDoc(collection(db,'announcements'), { title:$('announcementTitle').value.trim(), body:$('announcementBody').value.trim(), type:$('announcementType').value, published:$('announcementPublished').checked, createdAt:serverTimestamp(), updatedAt:serverTimestamp(), createdBy:currentUser.uid });
    e.target.reset(); $('announcementPublished').checked = true; await loadAnnouncements(); updateStats(); notify('Announcement saved.');
  } catch (err) { notify(friendlyError(err)); }
});
$('settingsForm').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await setDoc(doc(db,'appConfig','public'), { version:$('appVersion').value.trim(), minVersion:$('minVersion').value.trim(), updateMessage:$('updateMessage').value.trim(), maintenance:$('maintenanceMode').checked, maintenanceMessage:$('maintenanceMessage').value.trim(), updatedAt:serverTimestamp(), updatedBy:currentUser.uid }, { merge:true });
    notify('App settings saved to Firestore.');
  } catch (err) { notify(friendlyError(err)); }
});
