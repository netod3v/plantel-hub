
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-analytics.js';
import {
  getDatabase, ref, onValue, get, set, update, remove, onDisconnect, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyALHCtVUCrdTw8rpp3iJOYlnK9KFfhKiic',
  authDomain: 'plantel-hub.firebaseapp.com',
  databaseURL: 'https://plantel-hub-default-rtdb.firebaseio.com',
  projectId: 'plantel-hub',
  storageBucket: 'plantel-hub.firebasestorage.app',
  messagingSenderId: '153898918193',
  appId: '1:153898918193:web:8d13c2225c8277ea56d010',
  measurementId: 'G-47LZM2C7SY'
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);
const auth = getAuth(app);
window.__firebaseApp = app;
window.__firebaseAnalytics = analytics;

async function ensureSignedInUserProfile(user){
  if(!user || !user.uid) return;
  const userRef = ref(db, 'users/'+user.uid);
  const snapshot = await get(userRef);
  if(snapshot.exists()){
    const profile = snapshot.val() || {};
    if(String(profile.name || '').trim()) return;
  }
  const emailName = String(user.email || '').split('@')[0].replace(/[._-]+/g, ' ').trim();
  const fallbackName = String(user.displayName || emailName || 'Usuário').trim();
  await update(userRef, {
    name: fallbackName,
    email: user.email || null,
    createdAt: snapshot.exists() && snapshot.val()?.createdAt ? snapshot.val().createdAt : Date.now()
  });
}

/* ===== login (Firebase Authentication) =====
   O mural só é lido/escrito depois de logar. Crie os usuários (e-mail +
   senha) da equipe no Console do Firebase > Authentication > Users. */
const loadingScreen = document.getElementById('loading-screen');
const loginScreen = document.getElementById('login-screen');
const wrapApp = document.getElementById('wrap-app');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginSubtitle = document.getElementById('login-subtitle');
const loginSubmit = document.getElementById('login-submit');
const loginToggle = document.getElementById('login-toggle');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const forgotPasswordMsg = document.getElementById('forgot-password-msg');
const noteTextarea = document.getElementById('note-textarea');
const noteTabsList = document.getElementById('note-tabs-list');
const closingComments = new Set();
const closingCommentTimers = new Map();
const commentDrafts = new Map();
const replyDrafts = new Map();
const pendingComments = new Set();
const pendingReplies = new Set();
const openPostMenus = new Set();
const trackedPostViews = new Set();
const addNoteTabBtn = document.getElementById('add-note-tab-btn');
const noteTabTitleInput = document.getElementById('note-tab-title-input');
const clearNotesBtn = document.getElementById('clear-notes-btn');
const noteSaveStatus = document.getElementById('note-save-status');
const noteCard = document.getElementById('note-card');
const noteCardHeader = document.getElementById('note-card-header');
const noteCardToggle = document.getElementById('note-card-toggle');
const noteCardLabel = document.getElementById('note-card-label');
const openNoteStudioBtn = document.getElementById('open-note-studio-btn');
const noteStudioModal = document.getElementById('note-studio-modal');
const noteStudioClose = document.getElementById('note-studio-close');
const noteStudioTitle = document.getElementById('note-studio-title');
const noteStudioBody = document.getElementById('note-studio-body');
const noteModeText = document.getElementById('note-mode-text');
const noteModeDraw = document.getElementById('note-mode-draw');
const noteRichEditor = document.getElementById('note-rich-editor');
const noteFormatBar = document.getElementById('note-format-bar');
const noteFontFamily = document.getElementById('note-font-family');
const noteFontSize = document.getElementById('note-font-size');
const noteTextColor = document.getElementById('note-text-color');
const noteToolbar = document.querySelector('.whiteboard-toolbar');
if(noteToolbar){
  const penButton = noteToolbar.querySelector('#note-draw-pen');
  penButton?.insertAdjacentHTML('beforebegin', `<button class="whiteboard-tool" id="note-draw-pan" type="button" title="Panorâmica" aria-label="Panorâmica"><svg viewBox="0 0 24 24"><path d="M8 11V6a1.5 1.5 0 0 1 3 0v4-6a1.5 1.5 0 0 1 3 0v6-4a1.5 1.5 0 0 1 3 0v5-2a1.5 1.5 0 0 1 3 0v5c0 4-3 7-7 7h-1c-3 0-5-2-6-4l-2-4a1.5 1.5 0 0 1 2.5-1.5L8 13"/></svg></button><button class="whiteboard-tool" id="note-draw-select" type="button" title="Selecionar e mover" aria-label="Selecionar e mover"><svg viewBox="0 0 24 24"><path d="M5 3l13 9-6 1 3 6-2 1-3-6-5 4V3z"/></svg></button>`);
  penButton?.insertAdjacentHTML('afterend', `<select class="whiteboard-select" id="note-ink-type" title="Tipo de tinta"><option value="pen">Caneta</option><option value="pencil">Lápis</option><option value="highlighter">Marca-texto</option></select>`);
  const eraserButton = noteToolbar.querySelector('#note-draw-eraser');
  eraserButton?.insertAdjacentHTML('afterend', `<select class="whiteboard-select" id="note-eraser-mode" title="Modo da borracha"><option value="partial">Apagar parcial</option><option value="stroke">Traço inteiro</option></select><select class="whiteboard-select" id="note-shape-tool" title="Adicionar forma"><option value="none">Forma</option><option value="line">Linha</option><option value="rect">Retângulo</option><option value="ellipse">Elipse</option></select>`);
}
const noteDrawCanvas = document.getElementById('note-draw-canvas');
const noteDrawColor = document.getElementById('note-draw-color');
const noteDrawPan = document.getElementById('note-draw-pan');
const noteDrawSelect = document.getElementById('note-draw-select');
const noteInkType = document.getElementById('note-ink-type');
const noteEraserMode = document.getElementById('note-eraser-mode');
const noteShapeTool = document.getElementById('note-shape-tool');
const noteDrawSize = document.getElementById('note-draw-size');
const noteDrawClear = document.getElementById('note-draw-clear');
const noteDrawUndo = document.getElementById('note-draw-undo');
const noteDrawPen = document.getElementById('note-draw-pen');
const noteDrawEraser = document.getElementById('note-draw-eraser');
const noteDrawViewport = document.getElementById('note-draw-viewport');
const noteZoomOut = document.getElementById('note-zoom-out');
const noteZoomIn = document.getElementById('note-zoom-in');
const noteZoomLabel = document.getElementById('note-zoom-label');
let listenersStarted = false;
let currentUid = null;
let noteState = null;
const openComments = new Set();
const openReplies = new Set();
const editingPosts = new Set();
const editingComments = new Set();
const editingReplies = new Set();
const editingMetas = new Set();
const editingDemandas = new Set();
const newMuralPosts = new Set();
const newMuralComments = new Set();
const newMuralReplies = new Set();
const newMuralMetas = new Set();
const newMuralDemandas = new Set();
const expandedPosts = new Set();
const openPostViews = new Set();
let postViewObserver = null;
let muralSearch = '';
let muralSectorFilter = '';
let demandSearch = '';
let demandStatusFilter = 'open';
let demandAssigneeFilter = '';
let demandPriorityFilter = '';
let demandTrashOpen = false;
let demandAssigneeAutoUid = '';

/* ===== aviso de erro do banco =====
   Se uma escrita no Firebase falhar (regras, conexão, etc.), mostra
   o motivo na tela em vez de falhar em silêncio. */
const dbErrorToast = document.getElementById('db-error-toast');
let dbErrorTimer = null;
function handleDbError(err){
  const code = String(err && (err.code || err.message) || '').toLowerCase();
  console.error('Erro no Firebase:', err);
  if(code.includes('permission') || code.includes('denied')){
    showDbError('Sua conta não tem permissão para esta ação. Atualize a página e confira se seu perfil está completo; se continuar, fale com um administrador.');
  } else if(code.includes('network') || code.includes('offline')){
    showDbError('Sem conexão com o servidor. Seu texto foi mantido para você tentar novamente.');
  } else {
    showDbError('Não foi possível salvar. Tente novamente em instantes.');
  }
  return;
  console.error('Erro no Firebase:', err);
  showDbError('Não foi possível salvar: ' + (err && err.message ? err.message : err));
}
function showDbError(message){
  dbErrorToast.textContent = message;
  dbErrorToast.classList.remove('hidden');
  clearTimeout(dbErrorTimer);
  dbErrorTimer = setTimeout(()=> dbErrorToast.classList.add('hidden'), 6000);
}
const successToast = document.getElementById('success-toast');
const successToastMsg = document.getElementById('success-toast-msg');
let successToastTimer = null;
function showSuccessToast(message){
  successToastMsg.textContent = message || 'Salvo!';
  successToast.classList.remove('hidden');
  clearTimeout(successToastTimer);
  successToastTimer = setTimeout(()=> successToast.classList.add('hidden'), 2500);
}
let loginMode = 'login';

/* ===== trocar de conta =====
   Guarda (só neste navegador) e-mail + nome + foto das últimas contas
   usadas pra logar -- NUNCA a senha. Ao sair, a tela de login mostra
   essas contas como atalho: clicar já preenche o e-mail, só falta
   digitar a senha de novo. */
const RECENT_ACCOUNTS_KEY = 'plantel_recent_accounts';
const recentAccountsEl = document.getElementById('recent-accounts');

function getRecentAccounts(){
  try{ return JSON.parse(localStorage.getItem(RECENT_ACCOUNTS_KEY)) || []; }
  catch(e){ return []; }
}
function saveRecentAccounts(list){
  localStorage.setItem(RECENT_ACCOUNTS_KEY, JSON.stringify(list.slice(0, 5)));
}
function rememberAccount(info){
  const list = getRecentAccounts().filter(a => a.uid !== info.uid);
  list.unshift(Object.assign({ uid: info.uid, email: info.email, name: null, photo: null }, info));
  saveRecentAccounts(list);
  renderRecentAccounts();
}
function enrichRecentAccount(uid, extra){
  const list = getRecentAccounts();
  const idx = list.findIndex(a => a.uid === uid);
  if(idx === -1) return;
  list[idx] = Object.assign({}, list[idx], extra);
  saveRecentAccounts(list);
  renderRecentAccounts();
}
function forgetAccount(uid){
  saveRecentAccounts(getRecentAccounts().filter(a => a.uid !== uid));
  renderRecentAccounts();
}
function renderRecentAccounts(){
  const list = getRecentAccounts().filter(a => a.uid !== currentUid);
  const drawerListEl = document.getElementById('account-drawer-list');
  if(loginMode !== 'login' || !list.length){ 
    // escondemos a lista inline e no drawer quando não houver contas
    recentAccountsEl.style.display = 'none'; 
    recentAccountsEl.innerHTML = ''; 
    if(drawerListEl) drawerListEl.innerHTML = '';
    return; 
  }
  // preferimos mostrar via drawer pra não deixar a área de login apertada
  recentAccountsEl.style.display = 'none';
  const html = `
    <div class="recent-accounts-label">Trocar de conta</div>
    ${list.map(a => `
      <button type="button" class="recent-account-chip" data-email="${escapeHtml(a.email || '')}" data-uid="${escapeHtml(a.uid || '')}" data-name="${escapeHtml(a.name || '')}" data-photo="${escapeHtml(a.photo || '')}">
        <div class="avatar">${a.photo ? `<img src="${a.photo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:9px;">` : initials(a.name || a.email || '?')}</div>
        <div class="recent-account-info">
          <div class="recent-account-name">${escapeHtml(a.name || a.email || 'Conta')}</div>
          ${a.name ? `<div class="recent-account-email">${escapeHtml(a.email || '')}</div>` : ''}
        </div>
        <span class="recent-account-remove" data-forget-uid="${a.uid}" title="Esquecer essa conta">
          <svg viewBox="0 0 24 24"><path d="M4 4l16 16M20 4L4 20"/></svg>
        </span>
      </button>`).join('')}
    <button type="button" class="recent-account-add" id="recent-account-add-btn">
      <span class="recent-account-add-icon"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></span>
      Adicionar conta
    </button>
    <div class="recent-accounts-or">ou entre com outra conta</div>`;
  // preenche tanto o container inline (caso queira usar) quanto o drawer
  recentAccountsEl.innerHTML = html;
  if(drawerListEl) drawerListEl.innerHTML = html;
  // reaplica estado visual de pending caso exista
  try{ _restorePendingVisual(); }catch(e){}
}
let _pendingForget = null; // { uid, timer, chipEl }
function _showForgetToast(text){
  const toast = document.getElementById('forget-toast');
  const msg = document.getElementById('forget-toast-msg');
  if(!toast || !msg) return;
  msg.textContent = text || 'Conta será esquecida';
  toast.classList.remove('hidden');
}
function _hideForgetToast(){
  const toast = document.getElementById('forget-toast');
  if(!toast) return; toast.classList.add('hidden');
}
function scheduleForget(uid, chipEl){
  if(!uid) return;
  // cancela pendente anterior
  if(_pendingForget && _pendingForget.uid === uid) return;
  if(_pendingForget){ clearTimeout(_pendingForget.timer); if(_pendingForget.chipEl) _pendingForget.chipEl.classList.remove('chip-pending'); }
  chipEl && chipEl.classList.add('chip-pending');
  _showForgetToast('Conta será esquecida — desfazer?');
  const timer = setTimeout(()=>{
    forgetAccount(uid);
    _pendingForget = null;
    _hideForgetToast();
  }, 6000);
  _pendingForget = { uid, timer, chipEl };
}
function cancelPendingForget(){
  if(!_pendingForget) return;
  clearTimeout(_pendingForget.timer);
  if(_pendingForget.chipEl) _pendingForget.chipEl.classList.remove('chip-pending');
  _pendingForget = null;
  _hideForgetToast();
}

document.getElementById('forget-toast-undo')?.addEventListener('click', ()=>{ cancelPendingForget(); });

function handleRecentAccountsClick(e){
  const forgetBtn = e.target.closest('[data-forget-uid]');
  if(forgetBtn){ e.stopPropagation(); const uid = forgetBtn.dataset.forgetUid; const chip = forgetBtn.closest('.recent-account-chip'); scheduleForget(uid, chip); return; }
  if(e.target.closest('#recent-account-add-btn')){
    setLoginMode('signup');
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    if(!accountDrawerOverlay.classList.contains('hidden')) closeAccountDrawer();
    return;
  }
  const chip = e.target.closest('.recent-account-chip');
  if(!chip) return;
  setLoginMode('login');
  const email = chip.dataset.email || '';
  const uid = chip.dataset.uid || '';
  const name = chip.dataset.name || '';
  const photo = chip.dataset.photo || '';
  const emailEl = document.getElementById('login-email');
  const passEl = document.getElementById('login-password');
  emailEl.value = email;
  if(passEl) passEl.value = '';
  // mostra mini-preview
  showSelectedAccountPreview({ uid, name, photo, email });
  // fecha drawer e foca senha
  if(!accountDrawerOverlay.classList.contains('hidden')) closeAccountDrawer();
  setTimeout(()=>{ if(passEl) passEl.focus(); }, 160);
}
recentAccountsEl.addEventListener('click', handleRecentAccountsClick);
if(document.getElementById('account-drawer-list')) document.getElementById('account-drawer-list').addEventListener('click', handleRecentAccountsClick);
renderRecentAccounts();

// se a lista for re-renderizada enquanto há um pending, conserva o estado visual
function _restorePendingVisual(){
  if(_pendingForget && _pendingForget.uid){
    const found = document.querySelector(`[data-forget-uid="${_pendingForget.uid}"]`);
    if(found){ const chip = found.closest('.recent-account-chip'); if(chip) chip.classList.add('chip-pending'); }
  }
}

function showSelectedAccountPreview(info){
  const preview = document.getElementById('selected-account-preview');
  if(!preview) return;
  const avatar = document.getElementById('selected-account-avatar');
  const nameEl = document.getElementById('selected-account-name');
  const sectorEl = document.getElementById('selected-account-sector');
  const emailEl = document.getElementById('login-email');
  // nome/foto do cache (dados locais) + tenta aprimorar com setor do estado se UID disponível
  // guarda dados no dataset para permitir undo/restore
  preview.dataset.uid = info.uid || '';
  preview.dataset.photo = info.photo || '';
  preview.dataset.email = info.email || '';
  nameEl.textContent = info.name || info.email || 'Conta';
  if(info.photo){ avatar.innerHTML = `<img src="${info.photo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:9px;">`; }
  else { avatar.textContent = initials(info.name || info.email || '?'); }
  // tenta pegar setor do state.users quando possível
  let sector = '';
  if(info.uid && state && state.users && state.users[info.uid]) sector = userSectors(state.users[info.uid]).join(', ');
  sectorEl.textContent = sector || '';
  preview.style.display = 'flex';
  // esconde o campo de e-mail enquanto o cartão da conta estiver visível,
  // pra não sobrar aquela faixinha vazia espremida do lado do avatar
  if(emailEl) emailEl.style.display = 'none';
}

function _ensurePreviewUndoHandler(){
  const undoBtn = document.getElementById('preview-clear-undo');
  if(!undoBtn) return;
  if(undoBtn._hasHandler) return;
  undoBtn.addEventListener('click', ()=>{
    const t = document.getElementById('preview-clear-toast'); if(t) t.classList.add('hidden');
    if(window._pendingPreviewUndo && window._pendingPreviewUndo.prev){
      const p = window._pendingPreviewUndo.prev;
      showSelectedAccountPreview(p);
      const emailEl = document.getElementById('login-email'); if(emailEl) { emailEl.value = p.email || ''; }
      clearTimeout(window._pendingPreviewUndo.timer);
      window._pendingPreviewUndo = null;
    }
  });
  undoBtn._hasHandler = true;
}

function clearSelectedAccountPreview(silent){
  const preview = document.getElementById('selected-account-preview');
  if(!preview) return;
  const avatar = document.getElementById('selected-account-avatar');
  const nameEl = document.getElementById('selected-account-name');
  const sectorEl = document.getElementById('selected-account-sector');
  const emailEl = document.getElementById('login-email');
  // guarda estado anterior para permitir desfazer
  const prev = {
    uid: preview.dataset.uid || '',
    name: nameEl.textContent || '',
    photo: avatar.querySelector('img') ? avatar.querySelector('img').src : (avatar.textContent || ''),
    email: emailEl ? emailEl.value : ''
  };
  // efetua limpeza imediata
  preview.style.display = 'none';
  preview.removeAttribute('data-uid');
  avatar.innerHTML = '?';
  nameEl.textContent = '';
  sectorEl.textContent = '';
  if(emailEl){ emailEl.value = ''; emailEl.style.display = ''; }
  if(silent) return; // ex: ao trocar pro modo "criar conta" — não precisa de toast/desfazer aqui
  // mostra toast de desfazer
  const pToast = document.getElementById('preview-clear-toast');
  const pMsg = document.getElementById('preview-clear-msg');
  if(pMsg) pMsg.textContent = 'Preview limpo';
  if(pToast){ pToast.classList.remove('hidden'); }
  // garante que o botão de undo tenha handler
  _ensurePreviewUndoHandler();
  // prepara undo
  if(window._pendingPreviewUndo) { clearTimeout(window._pendingPreviewUndo.timer); window._pendingPreviewUndo = null; }
  window._pendingPreviewUndo = { prev };
  window._pendingPreviewUndo.timer = setTimeout(()=>{ if(document.getElementById('preview-clear-toast')) document.getElementById('preview-clear-toast').classList.add('hidden'); window._pendingPreviewUndo = null; }, 3500);
}

// wiring: botão de limpar preview
const clearPreviewBtn = document.getElementById('selected-account-clear');
if(clearPreviewBtn) clearPreviewBtn.addEventListener('click', () => clearSelectedAccountPreview());
// obs: o listener de "desfazer" já é conectado dentro de _ensurePreviewUndoHandler()
// (chamada por clearSelectedAccountPreview), então não duplicamos aqui.

function animateAccountChips(){
  const drawer = document.getElementById('account-drawer-list');
  if(!drawer) return;
  const chips = Array.from(drawer.querySelectorAll('.recent-account-chip'));
  chips.forEach((ch,i)=>{
    ch.classList.remove('chip-enter');
    ch.style.transitionDelay = (i * 40) + 'ms';
    // forçar reflow
    void ch.offsetWidth;
    ch.classList.add('chip-enter');
  });
}
function clearChipAnimations(){
  const drawer = document.getElementById('account-drawer-list');
  if(!drawer) return;
  drawer.querySelectorAll('.recent-account-chip').forEach(ch=>{ ch.classList.remove('chip-enter'); ch.style.transitionDelay = ''; });
}

// ripple effect
document.addEventListener('pointerdown', (e)=>{
  const btn = e.target.closest('.icon-btn, .btn, .recent-account-chip, .recent-account-add, .recent-account-remove, .btn-ghost, .btn-outline-accent');
  if(!btn) return;
  const rect = btn.getBoundingClientRect();
  const r = document.createElement('span');
  r.className = 'ripple';
  const size = Math.max(rect.width, rect.height) * 1.2;
  r.style.width = r.style.height = size + 'px';
  r.style.left = (e.clientX - rect.left - size/2) + 'px';
  r.style.top = (e.clientY - rect.top - size/2) + 'px';
  btn.appendChild(r);
  setTimeout(()=> r.remove(), 620);
});

// comportamento do botão '...' e do drawer de contas
const switchAccountsBtn = document.getElementById('switch-accounts-btn');
const accountDrawerOverlay = document.getElementById('account-drawer-overlay');
const accountDrawerClose = document.getElementById('account-drawer-close');
const accountDrawerList = document.getElementById('account-drawer-list');
// focus trap + scroll lock helpers for the account drawer
let _lastFocusedBeforeDrawer = null;
let _drawerFocusables = [];
function _updateDrawerFocusables(){
  const drawer = document.getElementById('account-drawer');
  if(!drawer) { _drawerFocusables = []; return; }
  _drawerFocusables = Array.from(drawer.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'))
    .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
}
function _drawerKeyHandler(e){
  if(e.key !== 'Tab') return;
  if(!_drawerFocusables.length){ e.preventDefault(); return; }
  const first = _drawerFocusables[0];
  const last = _drawerFocusables[_drawerFocusables.length - 1];
  if(e.shiftKey){
    if(document.activeElement === first){ e.preventDefault(); last.focus(); }
  } else {
    if(document.activeElement === last){ e.preventDefault(); first.focus(); }
  }
}

function openAccountDrawer(){
  if(!accountDrawerOverlay) return;
  _lastFocusedBeforeDrawer = document.activeElement;
  _updateDrawerFocusables();
  accountDrawerOverlay.classList.remove('hidden');
  // allow layout, then add open to trigger CSS transition
  requestAnimationFrame(()=> requestAnimationFrame(()=> {
    accountDrawerOverlay.classList.add('open');
    // foco no campo de e-mail do login (se existir), senão no primeiro foco do drawer
    const emailEl = document.getElementById('login-email');
    setTimeout(()=>{
      // só força foco no e-mail quando estamos no modo de cadastro
      if(emailEl && loginMode === 'signup'){ emailEl.focus(); emailEl.select(); }
        else { _updateDrawerFocusables(); if(_drawerFocusables[0]) _drawerFocusables[0].focus(); }
      // anima chips com stagger
      animateAccountChips();
    }, 60);
  }));
  accountDrawerOverlay.setAttribute('aria-hidden','false');
  // block page scroll while drawer is open
  updateBodyScrollLock();
  document.addEventListener('keydown', _drawerKeyHandler);
}

function closeAccountDrawer(){
  if(!accountDrawerOverlay) return;
  accountDrawerOverlay.classList.remove('open');
  accountDrawerOverlay.setAttribute('aria-hidden','true');
  // restore scroll and focus after transition
  const onEnd = (e)=>{
    if(e && e.target !== accountDrawerOverlay) return;
    accountDrawerOverlay.classList.add('hidden');
    accountDrawerOverlay.removeEventListener('transitionend', onEnd);
    updateBodyScrollLock();
    document.removeEventListener('keydown', _drawerKeyHandler);
    try{ if(_lastFocusedBeforeDrawer) _lastFocusedBeforeDrawer.focus(); }catch(err){}
    // limpar animações pendentes
    clearChipAnimations();
  };
  accountDrawerOverlay.addEventListener('transitionend', onEnd);
}
if(switchAccountsBtn){ switchAccountsBtn.addEventListener('click', ()=>{ renderRecentAccounts(); openAccountDrawer(); }); }
if(accountDrawerClose){ accountDrawerClose.addEventListener('click', closeAccountDrawer); }
if(accountDrawerOverlay){ accountDrawerOverlay.addEventListener('click', (e)=>{ if(e.target === accountDrawerOverlay) closeAccountDrawer(); }); }
document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape' && accountDrawerOverlay && !accountDrawerOverlay.classList.contains('hidden')) closeAccountDrawer(); });

function setLoginMode(mode){
  loginMode = mode;
  loginError.classList.remove('show');
  forgotPasswordMsg.classList.remove('show');
  if(mode === 'signup'){
    loginSubtitle.textContent = 'Crie sua conta pra acessar o mural da equipe.';
    loginSubmit.textContent = 'Criar conta';
    loginToggle.textContent = 'Já tem conta? Entrar';
    forgotPasswordLink.style.display = 'none';
    // limpa campos pré-preenchidos ao entrar no modo de cadastro
    const emailEl = document.getElementById('login-email');
    const passEl = document.getElementById('login-password');
    if(emailEl) emailEl.value = '';
    if(passEl) passEl.value = '';
    // foco no e-mail ao entrar no modo signup
    setTimeout(()=>{ if(emailEl){ emailEl.focus(); } }, 50);
    // mostra indicador de força quando em signup
    const pwStrength = document.getElementById('password-strength');
    if(pwStrength){ pwStrength.classList.remove('hidden'); pwStrength.setAttribute('aria-hidden','false'); updatePasswordStrengthUI(); }
    // no modo de cadastro não faz sentido trocar de contas nem manter
    // um preview de conta selecionada (o cartão "Pedro" que ficava preso)
    if(switchAccountsBtn) { switchAccountsBtn.style.display = 'none'; switchAccountsBtn.setAttribute('aria-hidden','true'); }
    clearSelectedAccountPreview(true);
  } else {
    loginSubtitle.textContent = 'Entre com sua conta pra acessar o mural da equipe.';
    loginSubmit.textContent = 'Entrar';
    loginToggle.textContent = 'Ainda não tem conta? Criar conta';
    forgotPasswordLink.style.display = '';
    const pwStrength = document.getElementById('password-strength');
    if(pwStrength){ pwStrength.classList.add('hidden'); pwStrength.setAttribute('aria-hidden','true'); }
    if(switchAccountsBtn) { switchAccountsBtn.style.display = ''; switchAccountsBtn.removeAttribute('aria-hidden'); }
  }
  renderRecentAccounts();
}
loginToggle.addEventListener('click', ()=> setLoginMode(loginMode === 'login' ? 'signup' : 'login'));

const passwordInput = document.getElementById('login-password');
const passwordToggle = document.getElementById('password-toggle');
passwordToggle.addEventListener('click', ()=>{
  const show = passwordInput.type === 'password';
  passwordInput.type = show ? 'text' : 'password';
  passwordToggle.classList.toggle('on', show);
  passwordToggle.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
});

/* ===== indicador de força de senha (signup) ===== */
const passwordStrengthEl = document.getElementById('password-strength');
const passwordStrengthFill = document.getElementById('password-strength-fill');
const passwordStrengthLabel = document.getElementById('password-strength-label');
function evaluatePasswordStrength(pw){
  if(!pw) return {score:0,label:'Muito fraca'};
  let score = 0;
  if(pw.length >= 8) score++;
  if(/[a-z]/.test(pw)) score++;
  if(/[A-Z]/.test(pw)) score++;
  if(/[0-9]/.test(pw)) score++;
  if(/[^A-Za-z0-9]/.test(pw)) score++;
  // normaliza para 0..4 (visual)
  const s = Math.max(0, Math.min(4, score - 1));
  const labels = ['Muito fraca','Fraca','Ok','Forte','Excelente'];
  return { score: s, label: labels[Math.max(0, Math.min(4, s))] };
}
function updatePasswordStrengthUI(){
  if(!passwordStrengthEl) return;
  const pw = passwordInput.value || '';
  const out = evaluatePasswordStrength(pw);
  // mapa para percent
  const pct = Math.round(((out.score+1) / 5) * 100);
  passwordStrengthFill.style.width = pct + '%';
  // ajustar classes
  passwordStrengthEl.classList.remove('strength-0','strength-1','strength-2','strength-3','strength-4');
  passwordStrengthEl.classList.add('strength-'+Math.max(0,Math.min(4,out.score)));
  passwordStrengthLabel.textContent = out.label;
}

passwordInput.addEventListener('input', ()=>{
  if(loginMode === 'signup'){
    passwordStrengthEl.classList.remove('hidden');
    passwordStrengthEl.setAttribute('aria-hidden','false');
    updatePasswordStrengthUI();
  }
});

const AUTH_ERROR_MESSAGES = {
  'auth/email-already-in-use': 'Esse e-mail já tem uma conta. Tente entrar.',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/too-many-requests': 'Muitas tentativas seguidas. Espera um pouco e tenta de novo.'
};

const LOGIN_INFO_ICONS = {
  success: '<svg viewBox="0 0 24 24"><path d="M4 12l6 6L20 6"/></svg>',
  error: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>',
  pending: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>'
};
function showForgotPasswordMsg(text, isError, kind){
  const icon = LOGIN_INFO_ICONS[kind || (isError ? 'error' : 'success')];
  forgotPasswordMsg.innerHTML = `${icon}<span>${escapeHtml(text)}</span>`;
  forgotPasswordMsg.classList.toggle('is-error', !!isError);
  forgotPasswordMsg.classList.add('show');
}
forgotPasswordLink.addEventListener('click', ()=>{
  const email = document.getElementById('login-email').value.trim();
  loginError.classList.remove('show');
  if(!email){
    showForgotPasswordMsg('Digita seu e-mail ali em cima primeiro.', true);
    document.getElementById('login-email').focus();
    return;
  }
  forgotPasswordLink.disabled = true;
  showForgotPasswordMsg('Enviando...', false, 'pending');
  sendPasswordResetEmail(auth, email)
    .then(()=>{
      showForgotPasswordMsg(`Enviamos um link de redefinição para ${email}. Confira sua caixa de entrada (e o spam).`, false);
    })
    .catch(err=>{
      // por segurança, o Firebase às vezes não revela se o e-mail existe —
      // trata como sucesso genérico pra não expor quais e-mails têm conta
      if(err.code === 'auth/invalid-email' || err.code === 'auth/too-many-requests'){
        showForgotPasswordMsg(AUTH_ERROR_MESSAGES[err.code], true);
      } else {
        showForgotPasswordMsg(`Se ${email} tiver uma conta, enviamos um link de redefinição pra ele.`, false);
      }
    })
    .finally(()=>{ forgotPasswordLink.disabled = false; });
});

loginForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  loginError.classList.remove('show');
  forgotPasswordMsg.classList.remove('show');
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const action = loginMode === 'signup'
    ? createUserWithEmailAndPassword(auth, email, password)
    : signInWithEmailAndPassword(auth, email, password);
  action.catch(err=>{
    loginError.textContent = AUTH_ERROR_MESSAGES[err.code] || 'Não foi possível completar. Tente novamente.';
    loginError.classList.add('show');
  });
});

document.getElementById('logout-btn').addEventListener('click', ()=>{
  if(currentUid){ set(ref(db, 'presence/'+currentUid), { online: false, lastSeen: serverTimestamp() }).catch(()=>{}); }
  signOut(auth);
});

/* Se o próprio admin marcar minha conta como banida, isso me
   desconecta na hora, em qualquer aba aberta. */
let banHandled = false;
function enforceBanCheck(){
  if(!currentUid || banHandled) return;
  const profile = state.users[currentUid];
  if(profile && profile.isBanned){
    banHandled = true;
    set(ref(db, 'presence/'+currentUid), { online: false, lastSeen: serverTimestamp() }).catch(()=>{});
    signOut(auth).finally(()=>{
      alert('Sua conta foi removida do Plantel por um administrador. Se acha que isso foi um engano, fale com a equipe.');
    });
  }
}

let authResolved = false;
function updateBodyScrollLock(){
  const loginVisible = !loginScreen.classList.contains('hidden');
  const drawerOpen = accountDrawerOverlay && accountDrawerOverlay.classList.contains('open');
  const modalOpen = !!document.querySelector('.modal-overlay:not(.hidden)');
  const locked = loginVisible || drawerOpen || modalOpen;
  /* Trava só o <html>: overflow:hidden também no body transforma o body em
     contêiner de rolagem e quebra o position:sticky do header e das abas. */
  document.body.style.overflow = '';
  document.documentElement.style.overflow = locked ? 'hidden' : '';
}
updateBodyScrollLock();

onAuthStateChanged(auth, (user)=>{
  authResolved = true;
  if(user){
    currentUid = user.uid;
    ensureSignedInUserProfile(user).catch(handleDbError);
    rememberAccount({ uid: user.uid, email: user.email });
    loadUserNotes();
    loginScreen.classList.add('hidden');
    if(noteCard){ noteCard.classList.remove('hidden'); }
    updateBodyScrollLock();
    // mostra (ou mantém) a tela de carregamento até os dados essenciais chegarem
    if(wrapApp.classList.contains('hidden')) loadingScreen.classList.remove('hidden');
    if(!listenersStarted){ listenersStarted = true; startDataListeners(); }
  } else {
    currentUid = null;
    document.documentElement.removeAttribute('data-labs');
    document.documentElement.removeAttribute('data-labs-member');
    document.title = 'Plantel Hub';
    profileOnboardingShown = false;
    banHandled = false;
    if(listenersStarted) stopDataListeners();
    if(noteTextarea){ noteTextarea.value = ''; }
    if(noteSaveStatus){ noteSaveStatus.textContent = 'Suas notas são salvas automaticamente.'; }
    wrapApp.classList.add('hidden');
    loadingScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    if(noteCard){ noteCard.classList.add('hidden'); }
    updateBodyScrollLock();
    renderRecentAccounts();
  }
});
// segurança extra: se o Firebase Auth demorar demais pra responder
// (rede ruim, storage local corrompido etc.), mostra a tela de login
// de qualquer jeito em vez de travar no carregamento pra sempre
setTimeout(()=>{
  if(authResolved) return;
  loadingScreen.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  updateBodyScrollLock();
}, 10000);

/* ===== reordenar seções (arrastar e soltar) =====
   Cada pessoa pode arrastar Mural/Metas/Demandas pra reordenar do
   jeito que preferir. A ordem fica salva só no navegador dela
   (localStorage) -- é uma preferência pessoal, não algo do grupo. */
const SECTION_ORDER_KEY = 'plantel_section_order';
const SECTION_LAYOUT_KEY = 'plantel_section_layout';
const SECTION_CUSTOMIZE_KEY = 'plantel_section_customize';
const sectionsContainer = document.getElementById('sections-container');
const sectionRestoreBar = document.getElementById('section-restore-bar');
const sectionCustomizeBtn = document.getElementById('section-customize-btn');
const sectionLayoutHint = document.getElementById('section-layout-hint');
let sectionCustomizationEnabled = localStorage.getItem(SECTION_CUSTOMIZE_KEY) === '1';

function applySavedSectionOrder(){
  let order;
  try{ order = JSON.parse(localStorage.getItem(SECTION_ORDER_KEY)); }catch(e){ order = null; }
  if(!Array.isArray(order)) return;
  order.forEach(id=>{
    const el = sectionsContainer.querySelector(`[data-section-id="${id}"]`);
    if(el) sectionsContainer.appendChild(el);
  });
}
function saveSectionOrder(){
  const order = Array.from(sectionsContainer.children)
    .filter(el => el.classList.contains('draggable-section'))
    .map(el => el.dataset.sectionId);
  localStorage.setItem(SECTION_ORDER_KEY, JSON.stringify(order));
}
function applySavedSectionLayout(){
  requestAnimationFrame(initializeFreeSectionLayout);
}
function saveSectionLayout(){
  const mobile = window.matchMedia('(max-width:720px)').matches;
  const layout = mobile ? savedSectionPositions() : {};
  sectionsContainer.querySelectorAll('.draggable-section').forEach(section=>{
    const x = Number.parseFloat(section.style.left);
    const y = Number.parseFloat(section.style.top);
    const width = Number.parseFloat(section.style.width);
    const height = Number.parseFloat(section.style.height);
    const previous = layout[section.dataset.sectionId] || {};
    layout[section.dataset.sectionId] = {
      x:mobile?(previous.x??0):(Number.isFinite(x)?x:0), y:mobile?(previous.y??0):(Number.isFinite(y)?y:0),
      width:mobile?(previous.width??section.offsetWidth):(Number.isFinite(width)?width:section.offsetWidth),
      height:mobile?(previous.height??null):(Number.isFinite(height)?height:null),
      minimized:section.classList.contains('section-minimized'),
      closed:section.classList.contains('section-closed'),
      maximized:section.classList.contains('section-maximized'),
      restore:section._restoreLayout || null
    };
  });
  localStorage.setItem(SECTION_LAYOUT_KEY, JSON.stringify(layout));
}
function sectionTitle(section){ return section.querySelector('.section-head h2')?.textContent.trim() || 'Seção'; }
function updateSectionRestoreBar(){
  const closed = Array.from(sectionsContainer.querySelectorAll('.draggable-section.section-closed'));
  sectionRestoreBar.classList.toggle('hidden', !sectionCustomizationEnabled || closed.length===0);
  sectionRestoreBar.innerHTML = closed.length ? `<span class="section-restore-label">Seções fechadas</span>${closed.map(section=>`<button type="button" class="section-restore-btn" data-action="section-restore" data-section="${section.dataset.sectionId}">+ ${escapeHtml(sectionTitle(section))}</button>`).join('')}` : '';
}
function setupSectionWindows(){
  sectionsContainer.querySelectorAll('.draggable-section').forEach(section=>{
    const head = section.querySelector('.section-head');
    if(!head || head.querySelector('.section-window-controls')) return;
    head.insertAdjacentHTML('beforeend', `<span class="section-window-controls">
      <button type="button" class="section-window-btn" data-action="section-minimize" title="Minimizar" aria-label="Minimizar"><svg viewBox="0 0 24 24"><path d="M6 18h12"/></svg></button>
      <button type="button" class="section-window-btn" data-action="section-maximize" title="Maximizar" aria-label="Maximizar"><svg viewBox="0 0 24 24"><path d="M5 9V5h4M15 5h4v4M19 15v4h-4M9 19H5v-4"/></svg></button>
      <button type="button" class="section-window-btn section-close" data-action="section-close" title="Fechar" aria-label="Fechar"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    </span>`);
    section.insertAdjacentHTML('beforeend', `<span class="section-resize-handle" title="Arraste para ajustar o tamanho" aria-label="Ajustar tamanho"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10L10 20M20 15l-5 5M20 5L5 20"/></svg></span>`);
  });
}
function notesStorageKey(uid){ return `plantel_notes_${uid}`; }
let noteCloudSaveTimer = null;
function getDefaultNoteState(){
  return {
    tabs: [ { id: `tab-${Date.now()}`, title: 'Nova aba', content: '' } ],
    activeTabId: null
  };
}
function getActiveTab(){
  if(!noteState) return null;
  return noteState.tabs.find(tab => tab.id === noteState.activeTabId) || noteState.tabs[0] || null;
}
function renderNoteTabs(){
  if(!noteTabsList || !noteState) return;
  noteTabsList.innerHTML = noteState.tabs.map(tab => {
    const active = tab.id === noteState.activeTabId ? ' active' : '';
    return `
      <button type="button" class="note-tab-button${active}" data-tab-id="${tab.id}">
        <span class="note-tab-title">${escapeHtml(tab.title || 'Sem título')}</span>
        <span class="note-tab-delete" aria-label="Excluir aba" data-delete-tab-id="${tab.id}">×</span>
      </button>`;
  }).join('');
  const activeTab = getActiveTab();
  if(noteTabTitleInput) noteTabTitleInput.value = activeTab ? activeTab.title : '';
  if(noteTextarea) noteTextarea.value = activeTab ? activeTab.content : '';
  if(noteCardLabel){
    noteCardLabel.textContent = activeTab && activeTab.title ? activeTab.title : 'Notas privadas só para você';
  }
  if(noteStudioModal && !noteStudioModal.classList.contains('hidden')) renderNoteStudio();
}
function saveNoteState(){
  if(!currentUid || !noteState) return;
  noteState.updatedAt = Date.now();
  const uidAtSave = currentUid;
  const snapshot = JSON.parse(JSON.stringify(noteState));
  try{ localStorage.setItem(notesStorageKey(uidAtSave), JSON.stringify(snapshot)); }
  catch(e){}
  clearTimeout(noteCloudSaveTimer);
  if(noteSaveStatus){ noteSaveStatus.textContent = 'Salvando...'; }
  noteCloudSaveTimer = setTimeout(()=>{
    set(ref(db, 'private_notes/'+uidAtSave), snapshot).then(()=>{
      if(currentUid === uidAtSave && noteSaveStatus) noteSaveStatus.textContent = 'Notas sincronizadas';
    }).catch(()=>{
      if(currentUid === uidAtSave && noteSaveStatus) noteSaveStatus.textContent = 'Salvas neste dispositivo · sincronização pendente';
    });
  }, 550);
}
async function loadUserNotes(){
  if(!currentUid) return;
  const uidAtLoad = currentUid;
  let localState = null;
  try{
    const stored = localStorage.getItem(notesStorageKey(uidAtLoad));
    localState = stored ? JSON.parse(stored) : null;
  } catch(e){
    localState = null;
  }
  noteState = localState || getDefaultNoteState();
  normalizeNoteState();
  renderNoteTabs();
  if(noteSaveStatus){ noteSaveStatus.textContent = 'Carregando notas da conta...'; }
  try{
    const cloudSnapshot = await get(ref(db, 'private_notes/'+uidAtLoad));
    if(currentUid !== uidAtLoad) return;
    const cloudState = cloudSnapshot.val();
    if(cloudState && Array.isArray(cloudState.tabs) && Number(cloudState.updatedAt || 0) >= Number(noteState.updatedAt || 0)){
      noteState = cloudState;
      normalizeNoteState();
      localStorage.setItem(notesStorageKey(uidAtLoad), JSON.stringify(noteState));
    }else if(!cloudState || Number(noteState.updatedAt || 0) > Number(cloudState.updatedAt || 0)){
      await set(ref(db, 'private_notes/'+uidAtLoad), noteState);
    }
    renderNoteTabs();
    if(noteSaveStatus){ noteSaveStatus.textContent = 'Notas sincronizadas'; }
  }catch(e){
    if(noteSaveStatus){ noteSaveStatus.textContent = 'Notas locais · sem sincronização'; }
  }
}
function normalizeNoteState(){
  if(!noteState || !Array.isArray(noteState.tabs) || noteState.tabs.length === 0){
    noteState = getDefaultNoteState();
  }
  if(!noteState.activeTabId || !noteState.tabs.some(tab => tab.id === noteState.activeTabId)){
    noteState.activeTabId = noteState.tabs[0].id;
  }
}
function updateActiveTabContent(){
  const activeTab = getActiveTab();
  if(!activeTab || !noteTextarea) return;
  activeTab.content = noteTextarea.value;
  activeTab.richContent = escapeHtml(noteTextarea.value).replace(/\n/g,'<br>');
  saveNoteState();
  if(noteSaveStatus){ noteSaveStatus.textContent = 'Notas salvas'; }
}
let noteSavedRange = null;
let noteDrawing = false;
let noteDrawTool = 'pen';
let noteDrawZoom = 1;
let noteDrawObjects = [];
let noteDrawCurrent = null;
let noteSelectedObjectId = null;
let notePointerStart = null;
let notePanStart = null;
let noteLegacyImage = null;
const noteDrawHistory = new Map();
function notePlainToHtml(text){ return escapeHtml(String(text||'')).replace(/\n/g,'<br>'); }
function cloneNoteObjects(value){return JSON.parse(JSON.stringify(value||[]));}
function notePoint(e){const r=noteDrawCanvas.getBoundingClientRect();return{x:(e.clientX-r.left)*noteDrawCanvas.width/r.width,y:(e.clientY-r.top)*noteDrawCanvas.height/r.height};}
function drawNoteObject(ctx,o){
  ctx.save();ctx.strokeStyle=o.color||'#244b35';ctx.lineWidth=o.width||5;ctx.lineCap='round';ctx.lineJoin='round';
  if(o.ink==='pencil')ctx.globalAlpha=.68;
  if(o.ink==='highlighter'){ctx.globalAlpha=.3;ctx.lineWidth=(o.width||5)*4;ctx.globalCompositeOperation='multiply';}
  ctx.beginPath();
  if(o.type==='stroke'&&o.points?.length){ctx.moveTo(o.points[0].x,o.points[0].y);o.points.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));}
  if(o.type==='line'){ctx.moveTo(o.x1,o.y1);ctx.lineTo(o.x2,o.y2);}
  if(o.type==='rect')ctx.rect(Math.min(o.x1,o.x2),Math.min(o.y1,o.y2),Math.abs(o.x2-o.x1),Math.abs(o.y2-o.y1));
  if(o.type==='ellipse'){const x=(o.x1+o.x2)/2,y=(o.y1+o.y2)/2;ctx.ellipse(x,y,Math.abs(o.x2-o.x1)/2,Math.abs(o.y2-o.y1)/2,0,0,Math.PI*2);}
  ctx.stroke();ctx.restore();
}
function noteObjectBounds(o){
  if(o.type==='stroke'){const xs=o.points.map(p=>p.x),ys=o.points.map(p=>p.y);return{x1:Math.min(...xs),y1:Math.min(...ys),x2:Math.max(...xs),y2:Math.max(...ys)};}
  return{x1:Math.min(o.x1,o.x2),y1:Math.min(o.y1,o.y2),x2:Math.max(o.x1,o.x2),y2:Math.max(o.y1,o.y2)};
}
function renderNoteDrawing(){
  const ctx=noteDrawCanvas.getContext('2d');ctx.clearRect(0,0,noteDrawCanvas.width,noteDrawCanvas.height);
  if(noteLegacyImage?.complete)ctx.drawImage(noteLegacyImage,0,0,noteDrawCanvas.width,noteDrawCanvas.height);
  noteDrawObjects.forEach(o=>drawNoteObject(ctx,o));
  if(noteDrawCurrent)drawNoteObject(ctx,noteDrawCurrent);
  const selected=noteDrawObjects.find(o=>o.id===noteSelectedObjectId);
  if(selected){const b=noteObjectBounds(selected);ctx.save();ctx.strokeStyle='#2563eb';ctx.lineWidth=2;ctx.setLineDash([7,5]);ctx.strokeRect(b.x1-8,b.y1-8,b.x2-b.x1+16,b.y2-b.y1+16);ctx.restore();}
}
function pushNoteDrawingHistory(){
  const id=getActiveTab()?.id;if(!id)return;
  const history=noteDrawHistory.get(id)||[];history.push(cloneNoteObjects(noteDrawObjects));
  if(history.length>20)history.shift();noteDrawHistory.set(id,history);
}
function saveNoteDrawing(){const tab=getActiveTab();if(tab){tab.drawingObjects=cloneNoteObjects(noteDrawObjects);saveNoteState();}renderNoteDrawing();}
function distanceToSegment(p,a,b){const l=(b.x-a.x)**2+(b.y-a.y)**2;if(!l)return Math.hypot(p.x-a.x,p.y-a.y);let t=((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/l;t=Math.max(0,Math.min(1,t));return Math.hypot(p.x-(a.x+t*(b.x-a.x)),p.y-(a.y+t*(b.y-a.y)));}
function hitNoteObject(o,p,r=12){
  if(o.type==='stroke')return o.points.some((q,i)=>i&&distanceToSegment(p,o.points[i-1],q)<r+(o.width||5)/2);
  if(o.type==='line')return distanceToSegment(p,{x:o.x1,y:o.y1},{x:o.x2,y:o.y2})<r+(o.width||5)/2;
  const b=noteObjectBounds(o);return p.x>=b.x1-r&&p.x<=b.x2+r&&p.y>=b.y1-r&&p.y<=b.y2+r;
}
function findNoteObject(p){return [...noteDrawObjects].reverse().find(o=>hitNoteObject(o,p));}
function moveNoteObject(o,dx,dy){if(o.type==='stroke')o.points.forEach(p=>{p.x+=dx;p.y+=dy;});else{o.x1+=dx;o.x2+=dx;o.y1+=dy;o.y2+=dy;}}
function eraseNotePartial(p){
  const radius=Math.max(12,Number(noteDrawSize.value)*3),next=[];
  noteDrawObjects.forEach(o=>{
    if(o.type!=='stroke'){next.push(o);return;}
    let part=[];o.points.forEach(q=>{if(Math.hypot(q.x-p.x,q.y-p.y)>radius)part.push(q);else{if(part.length>1)next.push({...o,id:`draw-${Date.now()}-${Math.random()}`,points:part});part=[];}});if(part.length>1)next.push({...o,id:`draw-${Date.now()}-${Math.random()}`,points:part});
  });noteDrawObjects=next;
}
function applyNoteDrawZoom(){
  noteDrawCanvas.style.width=(noteDrawCanvas.width*noteDrawZoom)+'px';noteDrawCanvas.style.height=(noteDrawCanvas.height*noteDrawZoom)+'px';
  noteZoomLabel.textContent=Math.round(noteDrawZoom*100)+'%';
}
function renderNoteStudio(){
  const tab = getActiveTab();
  if(!tab) return;
  noteDrawObjects = cloneNoteObjects(tab.drawingObjects);
  noteSelectedObjectId = null;
  noteLegacyImage=null;if(tab.drawing){noteLegacyImage=new Image();noteLegacyImage.onload=renderNoteDrawing;noteLegacyImage.src=tab.drawing;}
  noteStudioTitle.textContent = tab.title || 'Nota atual';
  noteRichEditor.innerHTML = tab.richContent || notePlainToHtml(tab.content);
  requestAnimationFrame(renderNoteDrawing);
}
function setNoteStudioMode(mode){
  const drawingMode = mode === 'draw';
  noteStudioBody.dataset.mode = drawingMode ? 'draw' : 'text';
  noteModeText.classList.toggle('active', !drawingMode);
  noteModeDraw.classList.toggle('active', drawingMode);
  noteModeText.setAttribute('aria-pressed', String(!drawingMode));
  noteModeDraw.setAttribute('aria-pressed', String(drawingMode));
  if(drawingMode) requestAnimationFrame(renderNoteDrawing);
  else setTimeout(()=>noteRichEditor.focus(),0);
}
function saveRichNote(){
  const tab=getActiveTab();
  if(!tab) return;
  tab.richContent=noteRichEditor.innerHTML;
  tab.content=noteRichEditor.innerText;
  noteTextarea.value=tab.content;
  saveNoteState();
}
function restoreNoteSelection(){
  if(!noteSavedRange) return;
  const selection=window.getSelection();selection.removeAllRanges();selection.addRange(noteSavedRange);
}
function runNoteCommand(command,value=null){
  noteRichEditor.focus();restoreNoteSelection();document.execCommand(command,false,value);saveRichNote();
}
function openNoteStudio(){
  renderNoteStudio();
  noteCard.classList.add('studio-open');
  openModalSmooth(noteStudioModal);
  setTimeout(()=>noteRichEditor.focus(),180);
}
function returnToCompactNotes(){
  saveRichNote();
  closeModalSmooth(noteStudioModal);
  noteCard.classList.remove('studio-open');
  setNoteCardExpanded(true);
  setTimeout(()=>noteTextarea.focus(),260);
}
openNoteStudioBtn.addEventListener('click',openNoteStudio);
noteStudioClose.addEventListener('click',returnToCompactNotes);
noteModeText.addEventListener('click',()=>setNoteStudioMode('text'));
noteModeDraw.addEventListener('click',()=>setNoteStudioMode('draw'));
document.addEventListener('selectionchange',()=>{
  const selection=window.getSelection();
  if(selection.rangeCount && noteRichEditor.contains(selection.anchorNode)) noteSavedRange=selection.getRangeAt(0).cloneRange();
});
noteFormatBar.addEventListener('mousedown',e=>{ if(e.target.closest('[data-note-command]')) e.preventDefault(); });
noteFormatBar.addEventListener('click',e=>{ const button=e.target.closest('[data-note-command]');if(button) runNoteCommand(button.dataset.noteCommand); });
noteFontFamily.addEventListener('change',()=>runNoteCommand('fontName',noteFontFamily.value));
noteFontSize.addEventListener('change',()=>runNoteCommand('fontSize',noteFontSize.value));
noteTextColor.addEventListener('input',()=>runNoteCommand('foreColor',noteTextColor.value));
noteRichEditor.addEventListener('input',saveRichNote);
noteRichEditor.addEventListener('paste',e=>{ e.preventDefault();document.execCommand('insertText',false,e.clipboardData.getData('text/plain')); });
noteDrawCanvas.addEventListener('pointerdown',e=>{
  const p=notePoint(e);noteDrawing=true;noteDrawCanvas.setPointerCapture(e.pointerId);notePointerStart=p;
  if(noteDrawTool==='pan'){notePanStart={x:e.clientX,y:e.clientY,left:noteDrawViewport.scrollLeft,top:noteDrawViewport.scrollTop};return;}
  pushNoteDrawingHistory();
  if(noteDrawTool==='select'){noteSelectedObjectId=findNoteObject(p)?.id||null;renderNoteDrawing();return;}
  if(noteDrawTool==='eraser'){
    if(noteEraserMode.value==='stroke'){const found=findNoteObject(p);if(found)noteDrawObjects=noteDrawObjects.filter(o=>o.id!==found.id);}else eraseNotePartial(p);
    renderNoteDrawing();return;
  }
  const shape=noteShapeTool.value;
  noteDrawCurrent=shape!=='none'?{id:`draw-${Date.now()}`,type:shape,x1:p.x,y1:p.y,x2:p.x,y2:p.y,color:noteDrawColor.value,width:Number(noteDrawSize.value)}:{id:`draw-${Date.now()}`,type:'stroke',points:[p],color:noteDrawColor.value,width:Number(noteDrawSize.value),ink:noteInkType.value};
});
noteDrawCanvas.addEventListener('pointermove',e=>{
  if(!noteDrawing)return;
  const p=notePoint(e);
  if(noteDrawTool==='pan'&&notePanStart){noteDrawViewport.scrollLeft=notePanStart.left-(e.clientX-notePanStart.x);noteDrawViewport.scrollTop=notePanStart.top-(e.clientY-notePanStart.y);return;}
  if(noteDrawTool==='select'&&noteSelectedObjectId){const o=noteDrawObjects.find(x=>x.id===noteSelectedObjectId);if(o){moveNoteObject(o,p.x-notePointerStart.x,p.y-notePointerStart.y);notePointerStart=p;renderNoteDrawing();}return;}
  if(noteDrawTool==='eraser'){if(noteEraserMode.value==='stroke'){const found=findNoteObject(p);if(found)noteDrawObjects=noteDrawObjects.filter(o=>o.id!==found.id);}else eraseNotePartial(p);renderNoteDrawing();return;}
  if(!noteDrawCurrent)return;if(noteDrawCurrent.type==='stroke')noteDrawCurrent.points.push(p);else{noteDrawCurrent.x2=p.x;noteDrawCurrent.y2=p.y;}renderNoteDrawing();
});
function finishNoteDrawing(){
  if(!noteDrawing)return;noteDrawing=false;notePanStart=null;
  if(noteDrawCurrent){noteDrawObjects.push(noteDrawCurrent);noteDrawCurrent=null;}
  if(noteDrawTool!=='pan')saveNoteDrawing();
}
noteDrawCanvas.addEventListener('pointerup',finishNoteDrawing);
noteDrawCanvas.addEventListener('pointercancel',finishNoteDrawing);
function selectNoteDrawTool(tool){noteDrawTool=tool;noteDrawPen.classList.toggle('active',tool==='pen');noteDrawEraser.classList.toggle('active',tool==='eraser');noteDrawPan.classList.toggle('active',tool==='pan');noteDrawSelect.classList.toggle('active',tool==='select');noteDrawCanvas.style.cursor=tool==='pan'?'grab':tool==='select'?'default':tool==='eraser'?'cell':'crosshair';}
noteDrawPen.addEventListener('click',()=>{noteShapeTool.value='none';selectNoteDrawTool('pen');});
noteDrawEraser.addEventListener('click',()=>selectNoteDrawTool('eraser'));
noteDrawPan.addEventListener('click',()=>selectNoteDrawTool('pan'));
noteDrawSelect.addEventListener('click',()=>selectNoteDrawTool('select'));
noteInkType.addEventListener('change',()=>{noteShapeTool.value='none';selectNoteDrawTool('pen');});
noteShapeTool.addEventListener('change',()=>{if(noteShapeTool.value!=='none')selectNoteDrawTool('pen');});
noteDrawUndo.addEventListener('click',()=>{const id=getActiveTab()?.id,history=id?(noteDrawHistory.get(id)||[]):[];if(history.length){noteDrawObjects=cloneNoteObjects(history.pop());noteSelectedObjectId=null;saveNoteDrawing();}});
noteDrawClear.addEventListener('click',()=>{pushNoteDrawingHistory();noteDrawObjects=[];noteSelectedObjectId=null;noteLegacyImage=null;const tab=getActiveTab();if(tab)delete tab.drawing;saveNoteDrawing();});
noteZoomOut.addEventListener('click',()=>{noteDrawZoom=Math.max(.5,noteDrawZoom-.25);applyNoteDrawZoom();});
noteZoomIn.addEventListener('click',()=>{noteDrawZoom=Math.min(2,noteDrawZoom+.25);applyNoteDrawZoom();});
applyNoteDrawZoom();
function updateActiveTabTitle(){
  const activeTab = getActiveTab();
  if(!activeTab || !noteTabTitleInput) return;
  const rawTitle = noteTabTitleInput.value;
  activeTab.title = rawTitle.trim() || 'Sem título';
  saveNoteState();

  // Não re-renderiza as abas enquanto você digita.
  // Isso evita que o input perca o foco/cursor a cada tecla.
  const activeTabButton = noteTabsList?.querySelector(`[data-tab-id="${activeTab.id}"] .note-tab-title`);
  if(activeTabButton){
    activeTabButton.textContent = activeTab.title;
  }
  if(noteCardLabel){
    noteCardLabel.textContent = rawTitle.trim() || 'Notas privadas só para você';
  }
  if(noteSaveStatus){ noteSaveStatus.textContent = 'Título salvo'; }
}
function selectNoteTab(tabId){
  if(!noteState || noteState.activeTabId === tabId) return;
  const currentTab = getActiveTab();
  if(currentTab && noteTextarea){ currentTab.content = noteTextarea.value; }
  noteState.activeTabId = tabId;
  saveNoteState();
  renderNoteTabs();
}
function addNewNoteTab(){
  if(!noteState) noteState = getDefaultNoteState();
  const id = `tab-${Date.now()}`;
  noteState.tabs.push({ id, title: `Nova aba ${noteState.tabs.length + 1}`, content: '' });
  noteState.activeTabId = id;
  saveNoteState();
  renderNoteTabs();
}
function deleteNoteTab(tabId){
  if(!noteState || noteState.tabs.length <= 1) return;
  const index = noteState.tabs.findIndex(tab => tab.id === tabId);
  if(index === -1) return;
  const wasActive = noteState.activeTabId === tabId;
  noteState.tabs.splice(index, 1);
  if(wasActive){ noteState.activeTabId = noteState.tabs[0].id; }
  saveNoteState();
  renderNoteTabs();
}
function clearUserNotes(){
  if(!noteState) return;
  noteState = getDefaultNoteState();
  saveNoteState();
  renderNoteTabs();
  if(noteSaveStatus){ noteSaveStatus.textContent = 'Notas apagadas'; }
}

let noteDragInfo = null;
function onNoteTabPointerDown(event){
  const deleteBtn = event.target.closest('[data-delete-tab-id]');
  if(deleteBtn) return;
  const tabBtn = event.target.closest('.note-tab-button');
  if(!tabBtn) return;
  event.preventDefault();
  noteDragInfo = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
    tabId: tabBtn.dataset.tabId,
    originalButton: tabBtn,
    placeholder: null,
    currentButton: tabBtn,
    startRect: tabBtn.getBoundingClientRect()
  };
  tabBtn.setPointerCapture(event.pointerId);
  document.addEventListener('pointermove', onNoteTabPointerMove);
  document.addEventListener('pointerup', onNoteTabPointerUp);
}
function startNoteTabDrag(){
  if(!noteDragInfo) return;
  const { originalButton, startRect } = noteDragInfo;
  noteDragInfo.moved = true;
  const placeholder = document.createElement('div');
  placeholder.className = 'note-tab-placeholder';
  placeholder.style.width = `${startRect.width}px`;
  placeholder.style.height = `${startRect.height}px`;
  originalButton.parentNode.insertBefore(placeholder, originalButton.nextSibling);
  originalButton.classList.add('dragging');
  originalButton.style.position = 'fixed';
  originalButton.style.left = `${startRect.left}px`;
  originalButton.style.top = `${startRect.top}px`;
  originalButton.style.width = `${startRect.width}px`;
  originalButton.style.zIndex = '500';
  originalButton.style.transform = 'translate(0,0)';
  noteDragInfo.placeholder = placeholder;
  originalButton.parentNode.removeChild(originalButton);
}
function onNoteTabPointerMove(event){
  if(!noteDragInfo) return;
  const dx = event.clientX - noteDragInfo.startX;
  const dy = event.clientY - noteDragInfo.startY;
  if(!noteDragInfo.moved){
    if(Math.hypot(dx, dy) < 8) return;
    startNoteTabDrag();
  }
  if(!noteDragInfo.placeholder) return;
  const button = noteDragInfo.currentButton;
  button.style.transform = `translate(${dx}px, ${dy}px)`;
  const midX = event.clientX;
  const siblings = Array.from(noteTabsList.children).filter(el => el !== noteDragInfo.placeholder && el !== button);
  for(const sibling of siblings){
    const rect = sibling.getBoundingClientRect();
    if(midX < rect.left + rect.width / 2){
      noteTabsList.insertBefore(noteDragInfo.placeholder, sibling);
      break;
    }
    if(sibling === siblings[siblings.length - 1]){
      noteTabsList.appendChild(noteDragInfo.placeholder);
    }
  }
}
function onNoteTabPointerUp(event){
  if(!noteDragInfo) return;
  const { originalButton, placeholder, tabId, moved } = noteDragInfo;
  originalButton.releasePointerCapture(event.pointerId);
  document.removeEventListener('pointermove', onNoteTabPointerMove);
  document.removeEventListener('pointerup', onNoteTabPointerUp);
  if(moved && placeholder){
    placeholder.parentNode.insertBefore(originalButton, placeholder);
    placeholder.remove();
    originalButton.classList.remove('dragging');
    originalButton.style.position = '';
    originalButton.style.left = '';
    originalButton.style.top = '';
    originalButton.style.width = '';
    originalButton.style.zIndex = '';
    originalButton.style.transform = '';
    const targetIndex = Array.from(noteTabsList.children).indexOf(originalButton);
    const currentIndex = noteState.tabs.findIndex(tab => tab.id === tabId);
    if(targetIndex !== -1 && currentIndex !== -1 && targetIndex !== currentIndex){
      const [movedTab] = noteState.tabs.splice(currentIndex, 1);
      noteState.tabs.splice(targetIndex, 0, movedTab);
      saveNoteState();
      renderNoteTabs();
    }
  }
  noteDragInfo = null;
}

function setNoteCardExpanded(isExpanded){
  if(!noteCard) return;
  noteCard.classList.toggle('expanded', isExpanded);
  noteCard.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
  document.body.classList.toggle('note-mobile-open', isExpanded && window.matchMedia('(max-width:720px)').matches);
  noteCardHeader?.setAttribute('aria-label', isExpanded ? 'Recolher bloco de notas' : 'Abrir bloco de notas');
  if(isExpanded && noteTextarea){
    setTimeout(()=> noteTextarea.focus(), 120);
  }
}
function toggleNoteCard(){ setNoteCardExpanded(!noteCard?.classList.contains('expanded')); }

if(noteCardHeader){
  noteCardHeader.addEventListener('click', toggleNoteCard);
  noteCardHeader.addEventListener('keydown', (event)=>{
    if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleNoteCard(); }
  });
}
if(noteCardToggle){ noteCardToggle.addEventListener('click', (event)=>{ event.stopPropagation(); toggleNoteCard(); }); }
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&noteCard?.classList.contains('expanded')&&noteStudioModal?.classList.contains('hidden'))setNoteCardExpanded(false);
});
window.addEventListener('resize',()=>{
  document.body.classList.toggle('note-mobile-open',!!noteCard?.classList.contains('expanded')&&window.matchMedia('(max-width:720px)').matches);
});
if(noteTextarea){
  noteTextarea.addEventListener('input', updateActiveTabContent);
  const syncTabletNoteKeyboard = ()=>{
    const tablet = window.matchMedia('(min-width:721px) and (max-width:1040px)').matches;
    const focused = document.activeElement === noteTextarea;
    const viewport = window.visualViewport;
    const viewportTop = viewport ? Math.max(0, viewport.offsetTop) : 0;
    const keyboardOffset = viewport
      ? Math.max(0, window.innerHeight - viewport.height - viewportTop)
      : 0;
    const keyboardOpen = tablet && focused && noteCard?.classList.contains('expanded') && keyboardOffset > 60;
    document.body.classList.toggle('note-tablet-keyboard-open', keyboardOpen);
    document.documentElement.style.setProperty('--note-keyboard-offset', `${keyboardOffset}px`);
    document.documentElement.style.setProperty('--note-viewport-top', `${viewportTop}px`);
    if(keyboardOpen) requestAnimationFrame(()=>noteTextarea.scrollIntoView({block:'nearest'}));
  };
  noteTextarea.addEventListener('focus', ()=>{
    syncTabletNoteKeyboard();
    setTimeout(syncTabletNoteKeyboard, 180);
    setTimeout(syncTabletNoteKeyboard, 420);
  });
  noteTextarea.addEventListener('blur', ()=>setTimeout(syncTabletNoteKeyboard, 120));
  window.visualViewport?.addEventListener('resize', syncTabletNoteKeyboard);
  window.visualViewport?.addEventListener('scroll', syncTabletNoteKeyboard);
  window.addEventListener('orientationchange', ()=>setTimeout(syncTabletNoteKeyboard, 180));
}
if(noteTabTitleInput){
  noteTabTitleInput.addEventListener('input', updateActiveTabTitle);
}
if(addNoteTabBtn){ addNoteTabBtn.addEventListener('click', addNewNoteTab); }
if(noteTabsList){
  noteTabsList.addEventListener('pointerdown', onNoteTabPointerDown);
  noteTabsList.addEventListener('click', (event)=>{
    const deleteBtn = event.target.closest('[data-delete-tab-id]');
    if(deleteBtn){
      event.stopPropagation();
      deleteNoteTab(deleteBtn.dataset.deleteTabId);
      return;
    }
    const tabBtn = event.target.closest('[data-tab-id]');
    if(tabBtn){
      selectNoteTab(tabBtn.dataset.tabId);
    }
  });
}
if(clearNotesBtn){
  clearNotesBtn.addEventListener('click', (event)=>{ event.stopPropagation(); clearUserNotes(); });
}

setupSectionWindows();
applySavedSectionLayout();

let freeSectionLayoutReady = false;
let dragEl = null, dragCenterGuide = null;
let dragPointerOffsetX = 0, dragPointerOffsetY = 0;
let sectionLayoutSaveTimer = null;
function scheduleSectionLayoutSave(){
  clearTimeout(sectionLayoutSaveTimer);
  sectionLayoutSaveTimer = setTimeout(()=>{ if(freeSectionLayoutReady) saveSectionLayout(); }, 260);
}

function savedSectionPositions(){
  try{
    const value = JSON.parse(localStorage.getItem(SECTION_LAYOUT_KEY)) || {};
    return value && typeof value === 'object' ? value : {};
  }catch(e){ return {}; }
}
function updateFreeLayoutHeight(){
  if(!freeSectionLayoutReady || window.matchMedia('(max-width:720px)').matches) return;
  const sections = Array.from(sectionsContainer.querySelectorAll('.draggable-section'));
  const bottom = sections.reduce((max,section)=>{
    const y = Number.parseFloat(section.style.top) || 0;
    return Math.max(max, y + section.offsetHeight);
  }, 0);
  sectionsContainer.style.height = Math.max(500, bottom + 36) + 'px';
}
function initializeFreeSectionLayout(){
  const mobile = window.matchMedia('(max-width:720px)').matches;
  const sections = Array.from(sectionsContainer.querySelectorAll('.draggable-section'));
  if(!sectionCustomizationEnabled || mobile){
    sectionsContainer.classList.remove('free-layout');
    sectionsContainer.style.height = '';
    sections.forEach(section=>{
      section.style.left='';section.style.top='';section.style.width='';section.style.height='';
      section.classList.remove('section-minimized','section-maximized','section-closed','dragging');
    });
    freeSectionLayoutReady = false;
    updateSectionRestoreBar();
    if(sectionCustomizeBtn){
      sectionCustomizeBtn.classList.toggle('active', sectionCustomizationEnabled && !mobile);
      sectionCustomizeBtn.textContent = sectionCustomizationEnabled && !mobile ? 'Concluir personalização' : 'Personalizar painel';
      sectionLayoutHint.textContent = sectionCustomizationEnabled && !mobile ? 'Arraste, redimensione ou organize os cards' : 'Visualização padrão';
    }
    return;
  }
  if(freeSectionLayoutReady) return;
  ['mural','metas','demandas'].forEach(id=>{
    const section = sectionsContainer.querySelector(`[data-section-id="${id}"]`);
    if(section) sectionsContainer.appendChild(section);
  });
  const orderedSections = Array.from(sectionsContainer.querySelectorAll('.draggable-section'));
  const containerRect = sectionsContainer.getBoundingClientRect();
  const saved = savedSectionPositions();
  const gap = 14;
  const defaultWidth = Math.max(280, (containerRect.width - gap*2) / 3);
  sectionsContainer.classList.add('free-layout');
  orderedSections.forEach((section,index)=>{
    const position = saved[section.dataset.sectionId];
    const valid = position && Number.isFinite(Number(position.x)) && Number.isFinite(Number(position.y)) && Number.isFinite(Number(position.width));
    section.style.left = (valid ? Number(position.x) : index*(defaultWidth+gap)) + 'px';
    section.style.top = (valid ? Number(position.y) : 0) + 'px';
    section.style.width = (valid ? Math.max(280,Number(position.width)) : defaultWidth) + 'px';
    section.style.height = valid && Number.isFinite(Number(position.height)) ? Math.max(170,Number(position.height))+'px' : '';
    section.classList.toggle('section-minimized', !!(valid && position.minimized));
    section.classList.toggle('section-closed', !!(valid && position.closed));
    section.classList.toggle('section-maximized', !!(valid && position.maximized));
    section._restoreLayout = valid && position.restore ? position.restore : null;
    if(section.classList.contains('section-maximized')){
      section.style.left='0px';section.style.top='0px';section.style.width=containerRect.width+'px';section.style.height='min(78vh,760px)';
    }
  });
  freeSectionLayoutReady = true;
  sectionCustomizeBtn.classList.add('active');
  sectionCustomizeBtn.textContent = 'Concluir personalização';
  sectionLayoutHint.textContent = 'Arraste, redimensione ou organize os cards';
  updateSectionRestoreBar();
  updateFreeLayoutHeight();
}

sectionCustomizeBtn.addEventListener('click', ()=>{
  if(sectionCustomizationEnabled && freeSectionLayoutReady) saveSectionLayout();
  sectionCustomizationEnabled = !sectionCustomizationEnabled;
  localStorage.setItem(SECTION_CUSTOMIZE_KEY, sectionCustomizationEnabled ? '1' : '0');
  freeSectionLayoutReady = false;
  initializeFreeSectionLayout();
});

function toggleSectionMinimize(section){
  if(!section) return;
  if(section.classList.contains('section-maximized')) toggleSectionMaximize(section);
  section.classList.toggle('section-minimized');
  const button = section.querySelector('[data-action="section-minimize"]');
  if(button){
    const minimized = section.classList.contains('section-minimized');
    button.title = minimized ? 'Restaurar' : 'Minimizar';
    button.setAttribute('aria-label', button.title);
  }
  saveSectionLayout();updateFreeLayoutHeight();
}
function toggleSectionMaximize(section){
  if(!section) return;
  const maximizing = !section.classList.contains('section-maximized');
  if(maximizing){
    section._restoreLayout = { left:section.style.left, top:section.style.top, width:section.style.width, height:section.style.height };
    section.classList.remove('section-minimized');
    section.classList.add('section-maximized');
    if(!window.matchMedia('(max-width:720px)').matches){
      section.style.left='0px';section.style.top='0px';section.style.width=sectionsContainer.clientWidth+'px';section.style.height='min(78vh,760px)';
    }
  }else{
    section.classList.remove('section-maximized');
    const restore = section._restoreLayout;
    if(restore){ section.style.left=restore.left;section.style.top=restore.top;section.style.width=restore.width;section.style.height=restore.height; }
    section._restoreLayout = null;
  }
  saveSectionLayout();updateFreeLayoutHeight();
}
sectionsContainer.addEventListener('click', e=>{
  const button = e.target.closest('.section-window-btn');
  if(!button) return;
  e.preventDefault();e.stopPropagation();
  const section = button.closest('.draggable-section');
  if(button.dataset.action==='section-minimize') toggleSectionMinimize(section);
  if(button.dataset.action==='section-maximize') toggleSectionMaximize(section);
  if(button.dataset.action==='section-close'){
    section.classList.add('section-closed');
    saveSectionLayout();updateSectionRestoreBar();updateFreeLayoutHeight();
  }
});
sectionRestoreBar.addEventListener('click', e=>{
  const button = e.target.closest('[data-action="section-restore"]');
  if(!button) return;
  const section = sectionsContainer.querySelector(`[data-section-id="${button.dataset.section}"]`);
  if(section){ section.classList.remove('section-closed');saveSectionLayout();updateSectionRestoreBar();updateFreeLayoutHeight(); }
});

let resizingSection = null;
let resizeStartX = 0, resizeStartY = 0, resizeStartWidth = 0, resizeStartHeight = 0;
sectionsContainer.addEventListener('pointerdown', e=>{
  const handle = e.target.closest('.section-resize-handle');
  if(!handle || !sectionCustomizationEnabled || window.matchMedia('(max-width:720px)').matches) return;
  const section = handle.closest('.draggable-section');
  if(!section || section.classList.contains('section-minimized') || section.classList.contains('section-maximized')) return;
  e.preventDefault();e.stopPropagation();
  const rect = section.getBoundingClientRect();
  resizingSection = section;
  resizeStartX=e.clientX;resizeStartY=e.clientY;resizeStartWidth=rect.width;resizeStartHeight=rect.height;
  section.classList.add('section-resizing');
  document.body.style.userSelect='none';
  document.addEventListener('pointermove', onSectionResizeMove);
  document.addEventListener('pointerup', onSectionResizeEnd);
  document.addEventListener('pointercancel', onSectionResizeEnd);
});
function onSectionResizeMove(e){
  if(!resizingSection) return;
  const rect = resizingSection.getBoundingClientRect();
  const maxWidth = Math.max(280, window.innerWidth - rect.left - 12);
  const maxHeight = Math.max(170, window.innerHeight - rect.top - 12);
  const width = Math.min(maxWidth, Math.max(280, resizeStartWidth + e.clientX-resizeStartX));
  const height = Math.min(maxHeight, Math.max(170, resizeStartHeight + e.clientY-resizeStartY));
  resizingSection.style.width=width+'px';
  resizingSection.style.height=height+'px';
  updateFreeLayoutHeight();
}
function onSectionResizeEnd(){
  if(!resizingSection) return;
  resizingSection.classList.remove('section-resizing');
  resizingSection=null;
  document.body.style.userSelect='';
  document.removeEventListener('pointermove',onSectionResizeMove);
  document.removeEventListener('pointerup',onSectionResizeEnd);
  document.removeEventListener('pointercancel',onSectionResizeEnd);
  saveSectionLayout();updateFreeLayoutHeight();
}

sectionsContainer.addEventListener('pointerdown', (e)=>{
  if(!sectionCustomizationEnabled || window.matchMedia('(max-width:720px)').matches) return;
  const handle = e.target.closest('.drag-handle');
  if(!handle) return;
  const section = handle.closest('.draggable-section');
  if(!section) return;
  e.preventDefault();
  initializeFreeSectionLayout();

  const rect = section.getBoundingClientRect();
  dragPointerOffsetX = e.clientX - rect.left;
  dragPointerOffsetY = e.clientY - rect.top;

  dragCenterGuide = document.createElement('div');
  dragCenterGuide.className = 'section-center-guide';
  document.body.appendChild(dragCenterGuide);

  dragEl = section;
  dragEl.classList.add('dragging');
  document.body.style.userSelect = 'none';

  try{ handle.setPointerCapture(e.pointerId); }catch(err){}
  document.addEventListener('pointermove', onSectionDragMove);
  document.addEventListener('pointerup', onSectionDragEnd);
  document.addEventListener('pointercancel', onSectionDragEnd);
});

function onSectionDragMove(e){
  if(!dragEl) return;
  const containerRect = sectionsContainer.getBoundingClientRect();
  const containerCenter = containerRect.left + containerRect.width / 2;
  const nextLeft = e.clientX - containerRect.left - dragPointerOffsetX;
  const nextTop = e.clientY - containerRect.top - dragPointerOffsetY;
  dragEl.style.left = nextLeft + 'px';
  dragEl.style.top = nextTop + 'px';
  const centered = Math.abs((containerRect.left + nextLeft + dragEl.offsetWidth/2) - containerCenter) <= 18;
  if(dragCenterGuide){
    dragCenterGuide.style.left = containerCenter + 'px';
    dragCenterGuide.classList.toggle('visible', centered);
  }
  updateFreeLayoutHeight();
}

function onSectionDragEnd(){
  if(!dragEl) return;
  if(dragCenterGuide) dragCenterGuide.remove();
  dragEl.classList.remove('dragging');
  document.body.style.userSelect = '';
  document.removeEventListener('pointermove', onSectionDragMove);
  document.removeEventListener('pointerup', onSectionDragEnd);
  document.removeEventListener('pointercancel', onSectionDragEnd);
  saveSectionLayout();
  updateFreeLayoutHeight();
  dragEl = null;
  dragCenterGuide = null;
}

if(window.ResizeObserver){
  const sectionLayoutObserver = new ResizeObserver(()=>{ updateFreeLayoutHeight();scheduleSectionLayoutSave(); });
  sectionsContainer.querySelectorAll('.draggable-section').forEach(section=>sectionLayoutObserver.observe(section));
}
let sectionLayoutResizeTimer = null;
window.addEventListener('resize', ()=>{
  clearTimeout(sectionLayoutResizeTimer);
  sectionLayoutResizeTimer = setTimeout(()=>{
    freeSectionLayoutReady = false;
    initializeFreeSectionLayout();
  }, 120);
});

/* ===== tema (claro / escuro / preto) ===== */
const THEME_KEY = 'plantel_theme';
const THEME_CYCLE = ['light', 'dark', 'black'];
const THEME_LABELS = { light: 'Modo claro', dark: 'Modo escuro', black: 'Modo preto' };
const themeBtn = document.getElementById('theme-btn');
function applyTheme(theme){
  if(!THEME_CYCLE.includes(theme)) theme = 'light';
  document.documentElement.setAttribute('data-theme', theme);
  themeBtn.classList.toggle('on', theme === 'dark' || theme === 'black');
  themeBtn.classList.toggle('theme-black', theme === 'black');
  themeBtn.setAttribute('aria-label', 'Tema: ' + THEME_LABELS[theme] + ' (clique pra trocar)');
  localStorage.setItem(THEME_KEY, theme);
}
applyTheme(localStorage.getItem(THEME_KEY) || 'light');
themeBtn.addEventListener('click', ()=>{
  const current = document.documentElement.getAttribute('data-theme');
  const idx = THEME_CYCLE.indexOf(current);
  applyTheme(THEME_CYCLE[(idx + 1) % THEME_CYCLE.length]);
});

/* ===== tela cheia ===== */
const fsBtn = document.getElementById('fullscreen-btn');
fsBtn.addEventListener('click', ()=>{
  if(!document.fullscreenElement){ document.documentElement.requestFullscreen().catch(()=>{}); }
  else{ document.exitFullscreen(); }
});
document.addEventListener('fullscreenchange', ()=>{
  fsBtn.classList.toggle('on', !!document.fullscreenElement);
});

/* ===== menu compacto dos controles secundários ===== */
const headerMoreBtn = document.getElementById('header-more-btn');
const headerMoreMenu = document.getElementById('header-more-menu');
[
  [themeBtn, 'Alternar tema'],
  [fsBtn, 'Tela cheia'],
  [document.getElementById('games-btn'), 'Pausa e jogos'],
  [document.getElementById('support-btn'), 'Suporte'],
  [document.getElementById('logout-btn'), 'Sair']
].forEach(([button,label])=>{
  if(!button) return;
  const text = document.createElement('span');
  text.className = 'header-menu-label';
  text.textContent = label;
  button.appendChild(text);
  button.setAttribute('role','menuitem');
  headerMoreMenu.appendChild(button);
});
function closeHeaderMoreMenu(){
  headerMoreMenu.classList.remove('open');
  headerMoreBtn.setAttribute('aria-expanded','false');
}
headerMoreBtn.addEventListener('click', event=>{
  event.stopPropagation();
  const open = headerMoreMenu.classList.toggle('open');
  headerMoreBtn.setAttribute('aria-expanded', String(open));
});
headerMoreMenu.addEventListener('click', event=>{
  const button = event.target.closest('button');
  if(button && button.id !== 'theme-btn') closeHeaderMoreMenu();
});
document.addEventListener('click', event=>{
  if(!event.target.closest('.header-more')) closeHeaderMoreMenu();
});
document.addEventListener('keydown', event=>{
  if(event.key === 'Escape') closeHeaderMoreMenu();
});

/* ===== navegação das áreas principais ===== */
const workNav=document.getElementById('work-nav');
if(workNav){
  let workNavLockUntil=0;
  const setWorkNavActive=id=>workNav.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.workSection===id));
  workNav.addEventListener('click',event=>{
    const button=event.target.closest('[data-work-section]');
    if(!button)return;
    const section=document.querySelector(`[data-section-id="${button.dataset.workSection}"]`);
    if(section){
      setWorkNavActive(button.dataset.workSection);
      workNavLockUntil=Date.now()+900; // evita o scroll-spy sobrescrever o clique durante a rolagem suave
      section.scrollIntoView({behavior:'smooth',block:'start'});
    }
  });
  const updateWorkNavFromScroll=()=>{
    if(Date.now()<workNavLockUntil)return;
    const sections=[...document.querySelectorAll('.draggable-section[data-section-id]')]
      .filter(sec=>workNav.querySelector(`[data-work-section="${sec.dataset.sectionId}"]`)&&sec.offsetParent!==null);
    if(!sections.length)return;
    const line=window.innerHeight*0.35; // seção ativa = a última cujo topo já passou dessa linha
    let current=sections[0];
    sections.forEach(sec=>{if(sec.getBoundingClientRect().top<=line)current=sec;});
    // no fim da página, as últimas seções nunca chegam à linha: ativa a última visível
    if(window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-4){
      const last=sections[sections.length-1];
      if(last.getBoundingClientRect().top<window.innerHeight)current=last;
    }
    setWorkNavActive(current.dataset.sectionId);
  };
  let workNavTicking=false;
  window.addEventListener('scroll',()=>{
    if(workNavTicking)return;
    workNavTicking=true;
    requestAnimationFrame(()=>{workNavTicking=false;updateWorkNavFromScroll();});
  },{passive:true});
  window.addEventListener('resize',updateWorkNavFromScroll);
}

/* ===== painel de Instagram ===== */
const socialToggle = document.getElementById('social-toggle');
const socialPanel = document.getElementById('social-panel');
if(socialToggle && socialPanel){
  socialToggle.addEventListener('click', ()=>{
    const open = socialPanel.classList.toggle('is-open');
    socialPanel.hidden = !open;
    socialToggle.setAttribute('aria-expanded', String(open));
  });
}

const mobileChannelsToggle = document.getElementById('mobile-channels-toggle');
const previewChannels = document.getElementById('preview-channels');
if(mobileChannelsToggle && previewChannels){
  mobileChannelsToggle.addEventListener('click', ()=>{
    const open = previewChannels.classList.toggle('mobile-open');
    mobileChannelsToggle.setAttribute('aria-expanded', String(open));
    if(!open && socialToggle && socialPanel){
      socialPanel.classList.remove('is-open');
      socialPanel.hidden = true;
      socialToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

/* ===== pré-visualização do Instagram (modal) ===== */
const instaModal = document.getElementById('insta-modal');
const instaModalTitle = document.getElementById('insta-modal-title');
const instaModalUser = document.getElementById('insta-modal-user');
const instaModalFrame = document.getElementById('insta-modal-frame');
const instaModalOpen = document.getElementById('insta-modal-open');
const instaModalClose = document.getElementById('insta-modal-close');

function openInstaModal(name, user, url){
  instaModalTitle.textContent = name;
  instaModalUser.textContent = '@' + user;
  instaModalFrame.src = url;
  instaModalOpen.href = url;
  instaModal.classList.remove('hidden');
}
function closeInstaModal(){
  instaModal.classList.add('hidden');
  instaModalFrame.src = '';
}

document.querySelectorAll('.social-link[data-insta-user]').forEach(link=>{
  link.addEventListener('click', (e)=>{
    e.preventDefault();
    openInstaModal(link.dataset.instaName, link.dataset.instaUser, link.href);
  });
});
instaModalClose.addEventListener('click', closeInstaModal);
instaModal.addEventListener('click', (e)=>{ if(e.target === instaModal) closeInstaModal(); });
document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape' && !instaModal.classList.contains('hidden')) closeInstaModal(); });
document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape' && !viewProfileModal.classList.contains('hidden')) closeViewProfile(); });

/* ===== quem está online (presença) =====
   Usa o recurso de presença do Firebase: cada pessoa logada escreve
   em presence/{uid} que está online, e o Firebase (no servidor)
   automaticamente marca como offline quando a conexão cai — mesmo
   se a pessoa fechar a aba sem querer, sem internet, etc. */
function startPresence(){
  const myPresenceRef = ref(db, 'presence/'+currentUid);
  return onValue(ref(db, '.info/connected'), (snap)=>{
    if(snap.val() === true){
      onDisconnect(myPresenceRef).set({ online: false, lastSeen: serverTimestamp() }).then(()=>{
        set(myPresenceRef, { online: true, lastSeen: serverTimestamp() });
      });
    }
  });
}

const onlineBtn = document.getElementById('online-btn');
const onlineBadge = document.getElementById('online-badge');
const onlineModal = document.getElementById('online-modal');
const onlineModalClose = document.getElementById('online-modal-close');
const onlineModalCount = document.getElementById('online-modal-count');
const onlineListEl = document.getElementById('online-list');
const sidebarProfileCard = document.getElementById('sidebar-profile-card');
const sidebarProfileAvatar = document.getElementById('sidebar-profile-avatar');
const sidebarProfileName = document.getElementById('sidebar-profile-name');
const sidebarProfileSector = document.getElementById('sidebar-profile-sector');
const sidebarOnlineList = document.getElementById('sidebar-online-list');
const sidebarOfflineList = document.getElementById('sidebar-offline-list');
const sidebarSeeOnline = document.getElementById('sidebar-see-online');

function renderOnlineList(){
  const labsMode = document.documentElement.getAttribute('data-labs') === 'true';
  const entries = Object.entries(state.users)
    .filter(([, profile])=> !labsMode || !!(profile && profile.isDev))
    .map(([uid, profile])=>{
      const p = state.presence[uid];
      return { uid, name: profile.name || 'Alguém', sector: userSectors(profile), photo: profile.photo, banned: !!profile.isBanned, online: !!(p && p.online), lastSeen: p && p.lastSeen };
    })
    .sort((a,b)=> (b.online - a.online) || a.name.localeCompare(b.name));

  const onlineCount = entries.filter(e=>e.online).length;
  onlineBadge.classList.toggle('hidden', onlineCount === 0);
  onlineModalCount.textContent = onlineCount + (onlineCount===1 ? ' pessoa online' : ' pessoas online') + (labsMode ? ' no Plantel Labs' : '');

  const own = state.users[currentUid] || {};
  if(sidebarProfileCard) sidebarProfileCard.dataset.uid = currentUid || '';
  if(sidebarProfileName) sidebarProfileName.textContent = own.name || 'Meu perfil';
  if(sidebarProfileSector){
    const sectors = userSectors(own);
    sidebarProfileSector.textContent = sectors.length ? sectors.join(' · ') : 'Ver e editar perfil';
  }
  if(sidebarProfileAvatar){
    sidebarProfileAvatar.textContent = own.photo ? '' : initials(own.name || 'Meu perfil');
    sidebarProfileAvatar.style.backgroundImage = own.photo ? `url("${String(own.photo).replace(/"/g,'%22')}")` : '';
  }
  if(sidebarOnlineList){
    const onlinePeople = entries.filter(e=>e.online && e.uid!==currentUid).slice(0,5);
    sidebarOnlineList.innerHTML = onlinePeople.length ? onlinePeople.map(e=>`
      <button class="sidebar-online-person" type="button" data-action="view-profile" data-uid="${e.uid}" data-name="${escapeHtml(e.name)}">
        ${avatarHtml({name:e.name,photo:e.photo,uid:e.uid},true)}
        <span class="sidebar-online-person-copy"><strong>${escapeHtml(e.name)}</strong><small><span class="status-dot on"></span> online agora</small></span>
      </button>`).join('') : '<div class="sidebar-online-empty">Ningu\u00e9m mais est\u00e1 online agora.</div>';
  }
  if(sidebarOfflineList){
    const offlinePeople = entries.filter(e=>!e.online && e.uid!==currentUid);
    sidebarOfflineList.innerHTML = offlinePeople.length ? offlinePeople.map(e=>{
      const lastSeen = e.lastSeen ? timeAgo(e.lastSeen) : 'offline';
      return `<button class="sidebar-online-person is-offline" type="button" data-action="view-profile" data-uid="${e.uid}" data-name="${escapeHtml(e.name)}">
        ${avatarHtml({name:e.name,photo:e.photo,uid:e.uid},true)}
        <span class="sidebar-online-person-copy"><strong>${escapeHtml(e.name)}</strong><small>${escapeHtml(lastSeen)}</small></span>
      </button>`;
    }).join('') : '<div class="sidebar-online-empty">Todos est\u00e3o online.</div>';
  }

  onlineListEl.innerHTML = entries.length ? entries.map(e=>{
    const info = { name: e.name, sector: e.sector, photo: e.photo, uid: e.uid };
    const statusText = e.online ? 'online agora' : (e.lastSeen ? 'visto por último ' + timeAgo(e.lastSeen) : 'offline');
    return `
    <div class="online-item" data-action="view-profile" data-uid="${e.uid}" data-name="${escapeHtml(e.name)}" style="cursor:pointer;">
      ${avatarHtml(info, true)}
      <div class="online-item-body">
        <div class="online-item-name">${escapeHtml(e.name)}${sectorTagHtml(e.sector, 2)}${bannedTagHtml(e.banned)}</div>
        <div class="online-item-status"><span class="status-dot ${e.online?'on':''}"></span>${statusText}</div>
      </div>
    </div>`;
  }).join('') : `<div class="empty">${labsMode ? 'Nenhum integrante do Plantel Labs encontrado.' : 'Ninguém com perfil criado ainda.'}</div>`;
}
sidebarSeeOnline?.addEventListener('click', ()=> onlineBtn?.click());

function syncMobileNoteWithModals(){
  const hasOpenModal = !!document.querySelector('.modal-overlay:not(.hidden):not(.modal-closing)');
  document.body.classList.toggle('mobile-modal-open', hasOpenModal);
}
function openModalSmooth(modal){
  if(!modal) return;
  clearTimeout(modal._closeTimer);
  modal.classList.remove('hidden','modal-closing');
  syncMobileNoteWithModals();
  updateBodyScrollLock();
  requestAnimationFrame(()=> requestAnimationFrame(()=> modal.classList.add('modal-visible')));
}
function closeModalSmooth(modal){
  if(!modal) return;
  clearTimeout(modal._closeTimer);
  modal.classList.remove('modal-visible');
  modal.classList.add('modal-closing');
  syncMobileNoteWithModals();
  modal._closeTimer = setTimeout(()=>{
    modal.classList.add('hidden');
    modal.classList.remove('modal-closing');
    syncMobileNoteWithModals();
    updateBodyScrollLock();
  }, 240);
}

/* ===== call da equipe (Google Meet; Firebase usado só na presença) ===== */
const callBtn = document.getElementById('call-btn');
const callModal = document.getElementById('call-modal');
const callModalClose = document.getElementById('call-modal-close');
const callStage = document.getElementById('call-stage');
const callCountBadge = document.getElementById('call-count-badge');
const CALL_MEETING_URL = 'https://meet.google.com/tso-ovps-fvd';
let callWindowPoll = null;
let callParticipantUid = null;
let activeCallParticipants = [];
function renderCallPresence(participants){
  const cutoff = Date.now() - 4 * 60 * 60 * 1000;
  const active = Object.values(participants || {}).filter(person=>Number(person.joinedAt || 0) >= cutoff);
  activeCallParticipants = active;
  callBtn.classList.toggle('call-active', active.length > 0);
  callCountBadge.classList.toggle('hidden', active.length === 0);
  callCountBadge.textContent = active.length > 9 ? '9+' : String(active.length);
  const names = active.map(person=>person.name).filter(Boolean);
  callBtn.title = active.length
    ? active.length+' na call'+(names.length ? ': '+names.join(', ') : '')
    : 'Call da equipe';
  callBtn.setAttribute('aria-label', active.length ? 'Call ativa com '+active.length+' participante(s)' : 'Entrar na call da equipe');
  renderTodayPanel();
}
function clearMyCallPresence(){
  clearInterval(callWindowPoll);
  callWindowPoll = null;
  const uid = callParticipantUid;
  callParticipantUid = null;
  if(uid) remove(ref(db, 'team_call/participants/'+uid)).catch(()=>{});
}
function markMyCallPresence(callWindow){
  if(!currentUid) return;
  clearMyCallPresence();
  const uid = currentUid;
  const mine = myProfile() || {};
  const participantRef = ref(db, 'team_call/participants/'+uid);
  callParticipantUid = uid;
  onDisconnect(participantRef).remove().catch(()=>{});
  set(participantRef, { name:mine.name || 'Integrante do Plantel', joinedAt:Date.now() }).catch(()=>{});
  callWindowPoll = setInterval(()=>{
    if(callWindow.closed) clearMyCallPresence();
  }, 1500);
}
function openTeamCall(){
  if(!currentUid) return;
  const roomUrl = CALL_MEETING_URL;
  const callWindow = window.open(roomUrl, '_blank');
  if(callWindow){
    try{ callWindow.opener = null; }catch(e){}
    markMyCallPresence(callWindow);
    showSuccessToast('Call aberta em uma nova aba');
  }else{
    callStage.innerHTML = '<div class="call-loading"><strong>O navegador bloqueou a nova aba.</strong><a class="call-fallback" href="'+roomUrl+'" target="_blank" rel="noopener">Clique aqui para entrar na call</a></div>';
    openModalSmooth(callModal);
  }
}
function closeTeamCall(){
  closeModalSmooth(callModal);
}
callBtn.addEventListener('click', openTeamCall);
callModalClose.addEventListener('click', closeTeamCall);
callModal.addEventListener('click', event=>{ if(event.target === callModal) closeTeamCall(); });
document.addEventListener('keydown', event=>{ if(event.key === 'Escape' && !callModal.classList.contains('hidden')) closeTeamCall(); });

function openOnlineModal(){
  renderOnlineList();
  openModalSmooth(onlineModal);
}
function closeOnlineModal(){ closeModalSmooth(onlineModal); }
onlineBtn.addEventListener('click', openOnlineModal);
onlineModalClose.addEventListener('click', closeOnlineModal);
onlineModal.addEventListener('click', (e)=>{ if(e.target === onlineModal) closeOnlineModal(); });
document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape' && !onlineModal.classList.contains('hidden')) closeOnlineModal(); });

/* ===== notificações do aplicativo ===== */
const mentionNotificationBtn = document.getElementById('mention-notification-btn');
const mentionNotificationBadge = document.getElementById('mention-notification-badge');
const mentionNotificationModal = document.getElementById('mention-notification-modal');
const mentionNotificationClose = document.getElementById('mention-notification-close');
const mentionNotificationList = document.getElementById('mention-notification-list');
const mentionNotificationSummary = document.getElementById('mention-notification-summary');
function mentionSeenKey(){ return 'plantel_mention_seen_'+(currentUid || 'guest'); }
function myMentionNotifications(){
  if(!currentUid) return [];
  return allPosts().filter(p=>p.uid !== currentUid && p.mentions && p.mentions[currentUid]).sort((a,b)=>(b.ts||0)-(a.ts||0));
}
function myAppNotifications(){
  if(!currentUid) return [];
  const mentionedPostIds = new Set();
  const mentions = myMentionNotifications().map(p=>{
    mentionedPostIds.add(p.id);
    return { kind:'mention', ts:p.ts||0, post:p, person:authorInfo(p) };
  });
  const metaMentions=allMetas().filter(m=>m.uid!==currentUid&&m.mentions&&m.mentions[currentUid]).map(m=>({kind:'meta-mention',ts:m.ts||0,item:m,person:authorInfo(m)}));
  const demandaMentions=activeDemandas().filter(d=>d.uid!==currentUid&&d.mentions&&d.mentions[currentUid]).map(d=>({kind:'demanda-mention',ts:d.ts||0,item:d,person:authorInfo(d)}));
  const adminPosts = allPosts().filter(p=>{
    if(p.uid === currentUid || mentionedPostIds.has(p.id)) return false;
    return authorInfo(p).isAdmin;
  }).map(p=>({ kind:'admin-post', ts:p.ts||0, post:p, person:authorInfo(p) }));
  const postLikes = allPosts().filter(p=>p.uid === currentUid).flatMap(p=>
    Object.entries(p.likes || {}).flatMap(([likerUid, like])=>{
      const ts = Number(like && typeof like === 'object' ? like.ts : 0);
      if(likerUid === currentUid || !ts) return [];
      const profile = state.users[likerUid] || {};
      return [{
        kind:'post-like', ts, post:p,
        person:{ uid:likerUid, name:profile.name || 'Alguém', photo:profile.photo || null }
      }];
    })
  );
  const directMessages = Object.entries(dmConversations).filter(([, conversation])=>conversation.lastFrom && conversation.lastFrom !== currentUid && conversation.lastTs).map(([otherUid, conversation])=>({
    kind:'dm', ts:conversation.lastTs||0, otherUid,
    person:{ uid:otherUid, name:nicknameFor(otherUid, conversation.name), photo:conversation.photo || null },
    preview:conversation.lastText || 'Nova mensagem'
  }));
  return [...mentions, ...metaMentions, ...demandaMentions, ...adminPosts, ...postLikes, ...directMessages].sort((a,b)=>b.ts-a.ts).slice(0,60);
}
function renderMentionNotifications(){
  const notifications = myAppNotifications();
  const seenAt = Number(localStorage.getItem(mentionSeenKey()) || 0);
  const unread = notifications.filter(item=>item.ts>seenAt).length;
  mentionNotificationBadge.textContent = unread > 99 ? '99+' : String(unread);
  mentionNotificationBadge.classList.toggle('hidden', unread === 0);
  mentionNotificationSummary.textContent = unread ? `${unread} ${unread===1?'notificação nova':'notificações novas'}` : 'Atividades recentes';
  mentionNotificationList.innerHTML = notifications.length ? notifications.map(item=>{
    const action = item.kind === 'dm' ? `data-action="open-dm" data-uid="${item.otherUid}"` : item.kind==='meta-mention'||item.kind==='demanda-mention' ? `data-action="open-mentioned-item" data-kind="${item.kind==='meta-mention'?'meta':'demanda'}" data-id="${item.item.id}"` : `data-action="open-mentioned-post" data-id="${item.post.id}"`;
    const message = item.kind === 'mention'
      ? `<strong>${escapeHtml(item.person.name)}</strong> mencionou você no mural`
      : item.kind === 'meta-mention'
        ? `<strong>${escapeHtml(item.person.name)}</strong> mencionou você em uma meta`
        : item.kind === 'demanda-mention'
          ? `<strong>${escapeHtml(item.person.name)}</strong> mencionou você em uma demanda`
      : item.kind === 'admin-post'
        ? `<strong>${escapeHtml(item.person.name)}</strong> publicou um novo aviso no mural`
        : item.kind === 'post-like'
          ? `<strong>${escapeHtml(item.person.name)}</strong> curtiu sua publicação no mural`
          : `<strong>${escapeHtml(item.person.name)}</strong> enviou uma mensagem particular<span class="mention-notification-time">${escapeHtml(item.preview)}</span>`;
    return `<button type="button" class="mention-notification-item ${item.ts>seenAt?'is-unread':''}" ${action}>
      ${avatarHtml(item.person, true)}
      <span class="mention-notification-copy">${message}<span class="mention-notification-time">${escapeHtml(formatFullDate(item.ts))}</span></span>
    </button>`;
  }).join('') : '<div class="empty">Nenhuma notificação por enquanto.</div>';
}

function renderTodayPanel(){
  const grid = document.getElementById('today-grid');
  const highlight = document.getElementById('today-highlight');
  if(!grid || !highlight || !currentUid) return;

  const profile = myProfile();
  const firstName = String(profile.name || '').trim().split(/\s+/)[0];
  document.getElementById('today-title').textContent = firstName ? `Hoje no Plantel, ${firstName}` : 'Hoje no Plantel';
  document.getElementById('today-date').textContent = new Date().toLocaleDateString('pt-BR',{ weekday:'long', day:'2-digit', month:'long' });

  const openDemandas = activeDemandas().filter(item=>!item.archived&&!item.done).length;
  const openMetas = allMetas().filter(item=>!item.done).length;
  const callCount = activeCallParticipants.length;

  const cards = [
    { action:'today-section', section:'demandas', count:openDemandas, label:'Demandas pendentes', detail:openDemandas?'Visíveis para você':'Tudo em dia', alert:openDemandas>0, icon:'<path d="M7 12l3 3 7-7"/><rect x="4" y="4" width="16" height="16" rx="3"/>' },
    { action:'today-section', section:'metas', count:openMetas, label:'Metas abertas', detail:openMetas?'Acompanhar progresso':'Nenhuma aberta', alert:false, icon:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M15 9l5-5"/>' },
    { action:'today-call', count:callCount, label:callCount?'Na call agora':'Call da equipe', detail:callCount?'Entrar na sala':'Sala disponível', live:callCount>0, icon:'<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/>' }
  ];
  grid.innerHTML = cards.map(card=>`<button type="button" class="today-card ${card.alert?'is-alert':''} ${card.live?'is-live':''}" data-action="${card.action}" ${card.section?`data-section="${card.section}"`:''}>
    <span class="today-icon"><svg viewBox="0 0 24 24" aria-hidden="true">${card.icon}</svg></span>
    <span class="today-card-copy"><strong>${card.count}</strong><span class="today-label">${card.label}</span><small>${card.detail}</small></span>
  </button>`).join('');

  const latestAdminPost = allPosts().filter(post=>authorInfo(post).isAdmin).sort((a,b)=>(b.ts||0)-(a.ts||0))[0];
  if(latestAdminPost){
    const author = authorInfo(latestAdminPost);
    highlight.dataset.action = 'open-mentioned-post';
    highlight.dataset.id = latestAdminPost.id;
    highlight.innerHTML = `<span class="today-highlight-badge">Último aviso</span><span class="today-highlight-copy"><span class="today-highlight-summary">${renderMarkdown(latestAdminPost.text || 'Nova publicação no mural', latestAdminPost)}</span><small>${escapeHtml(author.name)} · ${timeAgo(latestAdminPost.ts)}</small></span>`;
    highlight.classList.remove('hidden');
  }else{
    highlight.classList.add('hidden');
  }
}
function openMentionNotifications(){
  const notifications = myAppNotifications();
  const newest = notifications.reduce((max,item)=>Math.max(max,Number(item.ts||0)),0);
  if(newest) localStorage.setItem(mentionSeenKey(), String(newest));
  renderMentionNotifications();
  mentionNotificationList.scrollTop=0;
  renderTodayPanel();
  openModalSmooth(mentionNotificationModal);
}
function closeMentionNotifications(){ closeModalSmooth(mentionNotificationModal); }
mentionNotificationBtn.addEventListener('click', openMentionNotifications);
mentionNotificationClose.addEventListener('click', closeMentionNotifications);
mentionNotificationModal.addEventListener('click', e=>{ if(e.target===mentionNotificationModal) closeMentionNotifications(); });

/* ===== suporte ===== */
const supportBtn = document.getElementById('support-btn');
const supportModal = document.getElementById('support-modal');
const supportModalClose = document.getElementById('support-modal-close');
function renderSupportPeopleList(){
  const list = document.getElementById('support-people-list');
  const supportUsers = Object.entries(state.users).filter(([uid, p]) => p && p.isSupport);
  if(!supportUsers.length){ list.innerHTML = ''; return; }
  list.innerHTML = supportUsers.map(([uid, p])=>{
    const info = { name: p.name || 'Alguém', sector: userSectors(p), photo: p.photo, uid };
    return `
    <button type="button" class="social-link" data-action="message-support" data-uid="${uid}" style="width:100%;text-align:left;cursor:pointer;">
      <div style="display:flex;align-items:center;gap:10px;">
        ${avatarHtml(info, true)}
        <div><strong>${escapeHtml(info.name)}</strong><span>Mandar mensagem direta</span></div>
      </div>
      <span>↗</span>
    </button>`;
  }).join('');
}
function openSupportModal(){ renderSupportPeopleList(); openModalSmooth(supportModal); }
function closeSupportModal(){ closeModalSmooth(supportModal); }
supportBtn.addEventListener('click', openSupportModal);
supportModalClose.addEventListener('click', closeSupportModal);
supportModal.addEventListener('click', (e)=>{ if(e.target === supportModal) closeSupportModal(); });
document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape' && !supportModal.classList.contains('hidden')) closeSupportModal(); });

/* ===== perfil (nome + setor/time) =====
   Fica salvo em users/{uid} e é usado pra identificar a pessoa em
   todo lugar do mural (posts, comentários, respostas, metas e
   demandas), em vez de digitar o nome toda vez. */
const profileModal = document.getElementById('profile-modal');
const profileNameInput = document.getElementById('profile-name-input');
const profileSectorPicker = document.getElementById('profile-sector-picker');
const profileSectorCustomInput = document.getElementById('profile-sector-custom-input');
const profileSectorCustomAdd = document.getElementById('profile-sector-custom-add');
const profileBioInput = document.getElementById('profile-bio-input');
const profileBioCount = document.getElementById('profile-bio-count');
const profileSaveBtn = document.getElementById('profile-save-btn');
const profileModalClose = document.getElementById('profile-modal-close');
const profileError = document.getElementById('profile-error');
const profileBtn = document.getElementById('profile-btn');
const profilePhotoPreview = document.getElementById('profile-photo-preview');
const profilePhotoInput = document.getElementById('profile-photo-input');
const profilePhotoPick = document.getElementById('profile-photo-pick');
const profilePhotoRemove = document.getElementById('profile-photo-remove');
let profileOnboarding = false;
let profileOnboardingShown = false;
let profilePendingSectors = [];
let pendingPhoto; // undefined = sem alteração, null = remover, string = nova foto (base64)

function renderSectorPicker(){
  const known = allKnownSectors();
  const all = [...new Set([...known, ...profilePendingSectors])].sort((a,b)=>a.localeCompare(b));
  profileSectorPicker.innerHTML = all.map(s=>{
    const selected = profilePendingSectors.includes(s);
    return `<button type="button" class="sector-chip${selected?' is-selected':''}" data-sector="${escapeHtml(s)}">${escapeHtml(s)}</button>`;
  }).join('');
}
profileSectorPicker.addEventListener('click', (e)=>{
  const chip = e.target.closest('.sector-chip');
  if(!chip) return;
  const s = chip.dataset.sector;
  const idx = profilePendingSectors.indexOf(s);
  if(idx === -1) profilePendingSectors.push(s); else profilePendingSectors.splice(idx, 1);
  renderSectorPicker();
});
function addCustomSector(){
  const val = profileSectorCustomInput.value.trim();
  if(!val) return;
  if(!profilePendingSectors.includes(val)) profilePendingSectors.push(val);
  profileSectorCustomInput.value = '';
  renderSectorPicker();
}
profileSectorCustomAdd.addEventListener('click', addCustomSector);
profileSectorCustomInput.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter'){ e.preventDefault(); addCustomSector(); }
});

function renderPhotoPreview(name, photo){
  if(photo){
    profilePhotoPreview.innerHTML = `<img src="${photo}" alt="">`;
    profilePhotoPreview.classList.add('has-photo');
    profilePhotoRemove.style.display = '';
  } else {
    profilePhotoPreview.textContent = initials(name || '?');
    profilePhotoPreview.classList.remove('has-photo');
    profilePhotoRemove.style.display = 'none';
  }
}

function openProfileModal(forced){
  profileOnboarding = !!forced;
  const mine = (currentUid && state.users[currentUid]) || {};
  profileNameInput.value = mine.name || '';
  profilePendingSectors = userSectors(mine);
  renderSectorPicker();
  profileBioInput.value = mine.bio || '';
  profileBioCount.textContent = (mine.bio || '').length + '/160';
  pendingPhoto = undefined;
  renderPhotoPreview(mine.name, mine.photo);
  profileError.textContent = '';
  profileModalClose.style.display = forced ? 'none' : '';
  openModalSmooth(profileModal);
}
function closeProfileModal(){
  if(profileOnboarding && !(currentUid && state.users[currentUid])) return; // obrigatório na primeira vez
  closeModalSmooth(profileModal);
}
function maybeOpenProfileOnboarding(){
  if(profileOnboardingShown || !currentUid) return;
  if(!state.users[currentUid]){
    profileOnboardingShown = true;
    openProfileModal(true);
  }
}
profileBtn.addEventListener('click', ()=> openProfileModal(false));
profileModalClose.addEventListener('click', closeProfileModal);
profileModal.addEventListener('click', (e)=>{ if(e.target === profileModal) closeProfileModal(); });
profilePhotoPreview.addEventListener('click', ()=>{
  const img = profilePhotoPreview.querySelector('img');
  if(img) openPhotoViewer(img.src);
});
document.getElementById('profile-view-btn').addEventListener('click', ()=>{
  if(!currentUid) return;
  closeProfileModal();
  openViewProfile(currentUid, (state.users[currentUid] && state.users[currentUid].name) || null, true);
});
profileBioInput.addEventListener('input', ()=>{
  profileBioCount.textContent = profileBioInput.value.length + '/160';
});

profilePhotoPick.addEventListener('click', ()=> profilePhotoInput.click());
profilePhotoRemove.addEventListener('click', ()=>{
  pendingPhoto = null;
  profilePhotoInput.value = '';
  renderPhotoPreview(profileNameInput.value, null);
});
profilePhotoInput.addEventListener('change', ()=>{
  const file = profilePhotoInput.files[0];
  if(!file) return;
  const isGif = file.type.toLowerCase() === 'image/gif' || /\.gif$/i.test(file.name);
  if(!isGif && !file.type.startsWith('image/')){
    profileError.textContent = 'Escolha um arquivo de imagem.';
    return;
  }

  // O canvas remove a animação. GIFs são mantidos no formato original.
  if(isGif){
    const maxGifSize = 600 * 1024;
    if(file.size > maxGifSize){
      profileError.textContent = 'O GIF precisa ter no máximo 600 KB para não deixar o Plantel lento.';
      profilePhotoInput.value = '';
      return;
    }
    const gifReader = new FileReader();
    gifReader.onload = (e)=>{
      const dataUrl = String(e.target?.result || '');
      if(!dataUrl.startsWith('data:')){
        profileError.textContent = 'Não foi possível carregar esse GIF.';
        return;
      }
      pendingPhoto = dataUrl;
      profileError.textContent = '';
      renderPhotoPreview(profileNameInput.value, dataUrl);
    };
    gifReader.onerror = ()=>{
      profileError.textContent = 'Não foi possível carregar esse GIF.';
    };
    gifReader.readAsDataURL(file);
    return;
  }

  const reader = new FileReader();
  reader.onload = (e)=>{
    const img = new Image();
    img.onload = ()=>{
      // redimensiona/comprime pra caber num registro pequeno do banco
      const size = 200;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale, h = img.height * scale;
      const offsetX = (size - w) / 2;
      // horizontal sempre centralizado; vertical favorece a parte de cima
      // da foto (onde normalmente está o rosto), pra não cortar a cabeça
      const offsetY = (size - h) * 0.3;
      ctx.drawImage(img, offsetX, offsetY, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      pendingPhoto = dataUrl;
      profileError.textContent = '';
      renderPhotoPreview(profileNameInput.value, dataUrl);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

profileSaveBtn.addEventListener('click', ()=>{
  const name = profileNameInput.value.trim();
  const bio = profileBioInput.value.trim();
  if(!name){ profileError.textContent = 'Digite seu nome pra continuar.'; return; }
  const mine = (currentUid && state.users[currentUid]) || {};
  const photo = pendingPhoto === undefined ? (mine.photo || null) : pendingPhoto;
  const sectors = {};
  profilePendingSectors.forEach(s=>{ sectors[s] = true; });
  update(ref(db, 'users/'+currentUid), { name, sectors: Object.keys(sectors).length ? sectors : null, sector: null, bio: bio || null, photo }).then(()=>{
    profileOnboarding = false;
    pendingPhoto = undefined;
    closeModalSmooth(profileModal);
    showSuccessToast('Perfil salvo!');
  }).catch(err=>{
    profileError.textContent = 'Não foi possível salvar. Tente de novo.';
    handleDbError(err);
  });
});

/* ===== Meu espaço: perfil, time, atribuições e demandas privadas ===== */
const mySpaceBtn=document.getElementById('my-space-btn');
const mySpaceModal=document.getElementById('my-space-modal');
const mySpaceClose=document.getElementById('my-space-close');
const mySpaceProfile=document.getElementById('my-space-profile');
const mySpaceTeam=document.getElementById('my-space-team');
const mySpaceAssigned=document.getElementById('my-space-assigned');
const mySpaceAssignedMetas=document.getElementById('my-space-assigned-metas');
const mySpacePersonalList=document.getElementById('my-space-personal-list');
const mySpacePersonalInput=document.getElementById('my-space-personal-input');
function renderMySpace(){
  if(!mySpaceProfile||!currentUid)return;const mine=myProfile()||{},sectors=userSectors(mine);
  mySpaceProfile.innerHTML=`${avatarHtml({name:mine.name||'Você',photo:mine.photo},true)}<div class="my-space-profile-copy"><strong>${escapeHtml(mine.name||'Complete seu perfil')}</strong><p>${escapeHtml(mine.bio||'Adicione uma descrição para contar ao time no que você está trabalhando.')}</p><div class="my-space-chips">${sectors.length?sectors.map(s=>`<span class="tag tag-demanda">${escapeHtml(s)}</span>`).join(''):'<span class="tag">Sem time definido</span>'}</div></div><button class="btn-ghost" type="button" id="my-space-edit-profile">Editar perfil</button>`;
  const team=Object.entries(state.users).filter(([uid,p])=>uid!==currentUid&&userSectors(p).some(s=>sectors.includes(s)));
  mySpaceTeam.innerHTML=team.length?team.map(([uid,p])=>`<button type="button" class="my-space-person" data-space-profile="${uid}">${avatarHtml({name:p.name,photo:p.photo},true)}<span><strong>${escapeHtml(p.name||'Pessoa')}</strong><br>${escapeHtml(userSectors(p).join(' · ')||'Sem setor')}</span></button>`).join(''):'<div class="empty">Nenhuma outra pessoa encontrada nos seus times.</div>';
  const assigned=activeDemandas().filter(d=>(d.mentions&&d.mentions[currentUid])||(d.assignedTo&&d.assignedTo[currentUid])).sort((a,b)=>(b.ts||0)-(a.ts||0));
  document.getElementById('my-space-assigned-count').textContent=String(assigned.filter(d=>!d.done).length)+' abertas';
  mySpaceAssigned.innerHTML=assigned.length?assigned.map(d=>`<div class="my-space-assigned-item ${d.done?'done':''}"><div class="item-text">${renderTextWithMentions(d.text,d)}</div><div class="item-meta">${escapeHtml(authorInfo(d).name)} · ${timeAgo(d.ts)} ${visibilityTagHtml(d._sector)}</div></div>`).join(''):'<div class="empty">Nenhuma demanda atribuída a você.</div>';
  const assignedMetas=allMetas().filter(m=>m.mentions&&m.mentions[currentUid]).sort((a,b)=>(b.ts||0)-(a.ts||0));
  document.getElementById('my-space-assigned-metas-count').textContent=String(assignedMetas.filter(m=>!m.done).length)+' abertas';
  mySpaceAssignedMetas.innerHTML=assignedMetas.length?assignedMetas.map(m=>`<div class="my-space-assigned-item ${m.done?'done':''}"><div class="item-text">${renderTextWithMentions(m.text,m)}</div><div class="item-meta">${escapeHtml(authorInfo(m).name)} · ${timeAgo(m.ts)} ${visibilityTagHtml(m._sector)}</div></div>`).join(''):'<div class="empty">Nenhuma meta atribuída a você.</div>';
  const personal=[...(state.personalDemandas||[])].sort((a,b)=>(b.ts||0)-(a.ts||0));
  document.getElementById('my-space-personal-count').textContent=`${personal.filter(d=>!d.done).length} pendentes`;
  mySpacePersonalList.innerHTML=personal.length?personal.map(d=>`<div class="my-space-personal-item ${d.done?'done':''}"><button class="check ${d.done?'done':''}" type="button" data-personal-toggle="${d.id}">${CHECK_SVG}</button><div class="item-text">${escapeHtml(d.text)}</div><button class="item-remove" type="button" data-personal-remove="${d.id}">remover</button></div>`).join(''):'<div class="empty">Seu espaço pessoal está vazio.</div>';
}
function openMySpace(){renderMySpace();openModalSmooth(mySpaceModal);}
function closeMySpace(){closeModalSmooth(mySpaceModal);}
function addPersonalDemand(){const text=mySpacePersonalInput.value.trim();if(!text||!currentUid)return;const id=uid();set(ref(db,`personal_demands/${currentUid}/${id}`),{text,done:false,ts:Date.now()}).then(()=>{mySpacePersonalInput.value='';}).catch(handleDbError);}
mySpaceBtn.addEventListener('click',openMySpace);mySpaceClose.addEventListener('click',closeMySpace);mySpaceModal.addEventListener('click',e=>{if(e.target===mySpaceModal)closeMySpace();});
document.getElementById('my-space-personal-add').addEventListener('click',addPersonalDemand);mySpacePersonalInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addPersonalDemand();}});
mySpaceModal.addEventListener('click',e=>{const edit=e.target.closest('#my-space-edit-profile'),person=e.target.closest('[data-space-profile]'),toggle=e.target.closest('[data-personal-toggle]'),removeBtn=e.target.closest('[data-personal-remove]');if(edit){closeMySpace();openProfileModal(false);}else if(person){closeMySpace();openViewProfile(person.dataset.spaceProfile,null,true);}else if(toggle){const item=state.personalDemandas.find(d=>d.id===toggle.dataset.personalToggle);if(item)update(ref(db,`personal_demands/${currentUid}/${item.id}`),{done:!item.done}).catch(handleDbError);}else if(removeBtn)remove(ref(db,`personal_demands/${currentUid}/${removeBtn.dataset.personalRemove}`)).catch(handleDbError);});

/* ===== ver perfil de outra pessoa (somente leitura) ===== */
const viewProfileModal = document.getElementById('view-profile-modal');
const viewProfileModalClose = document.getElementById('view-profile-modal-close');
const viewProfileBack = document.getElementById('view-profile-back');
const viewProfilePhoto = document.getElementById('view-profile-photo');
const viewProfileName = document.getElementById('view-profile-name');
const viewProfileSector = document.getElementById('view-profile-sector');
const viewProfileBio = document.getElementById('view-profile-bio');
const viewProfileMessageBtn = document.getElementById('view-profile-message-btn');
const viewProfileBanBtn = document.getElementById('view-profile-ban-btn');
const viewProfileSupportBtn = document.getElementById('view-profile-support-btn');
const viewProfileDevBtn = document.getElementById('view-profile-dev-btn');

function openViewProfile(uid, fallbackName, showBack){
  viewingProfileUid = uid;
  const profile = uid ? state.users[uid] : null;
  const name = (profile && profile.name) || fallbackName || 'Alguém';
  const sector = userSectors(profile);
  const admin = !!(profile && profile.isAdmin);
  const banned = !!(profile && profile.isBanned);
  const support = !!(profile && profile.isSupport);
  const dev = !!(profile && profile.isDev);
  const photo = profile && profile.photo ? profile.photo : null;
  const bio = profile && profile.bio
    ? profile.bio
    : 'Essa pessoa ainda não personalizou o perfil por aqui (sem foto ou descrição salvas).';
  if(photo){ viewProfilePhoto.innerHTML = `<img src="${photo}" alt="">`; viewProfilePhoto.classList.add('has-photo'); }
  else { viewProfilePhoto.textContent = initials(name); viewProfilePhoto.classList.remove('has-photo'); }
  viewProfileName.textContent = name;
  viewProfileSector.innerHTML = sectorTagHtml(sector) + adminTagHtml(admin) + supportTagHtml(support) + devTagHtml(dev) + bannedTagHtml(banned);
  viewProfileBio.textContent = bio;
  viewProfileMessageBtn.style.display = (uid && uid !== currentUid) ? '' : 'none';
  viewProfileBack.style.display = showBack ? '' : 'none';

  const canModerate = isAdmin() && uid && uid !== currentUid && !admin;
  if(canModerate){
    viewProfileBanBtn.style.display = '';
    viewProfileBanBtn.textContent = banned ? 'Desbanir' : 'Banir da comunidade';
    viewProfileBanBtn.className = banned ? 'btn' : 'btn btn-danger';
  } else {
    viewProfileBanBtn.style.display = 'none';
  }

  const canManageSupport = isAdmin() && uid && uid !== currentUid;
  if(canManageSupport){
    viewProfileSupportBtn.style.display = '';
    viewProfileSupportBtn.textContent = support ? 'Remover marca de suporte' : 'Marcar como suporte';
    viewProfileSupportBtn.className = 'btn';
  } else {
    viewProfileSupportBtn.style.display = 'none';
  }

  const canManageDev = isAdmin() && uid && uid !== currentUid;
  if(canManageDev){
    viewProfileDevBtn.style.display = '';
    viewProfileDevBtn.textContent = dev ? 'Remover marca do Plantel Labs' : 'Marcar como dev (Plantel Labs)';
    viewProfileDevBtn.className = 'btn';
  } else {
    viewProfileDevBtn.style.display = 'none';
  }
  openModalSmooth(viewProfileModal);
}
function closeViewProfile(){ closeModalSmooth(viewProfileModal); }

// Clique nos avatares de outras pessoas: a foto abre ampliada;
// áreas de perfil que não são a foto continuam abrindo o perfil completo.
document.addEventListener('input',e=>{
  if(e.target.matches('[data-comment-input]')) commentDrafts.set(e.target.dataset.commentInput,e.target.value);
  if(e.target.matches('[data-reply-input]')) replyDrafts.set(e.target.dataset.replyInput,e.target.value);
});
document.addEventListener('click', (e)=>{
  const img = e.target.closest('[data-action="view-profile"] img');
  if(img){
    e.preventDefault();
    e.stopPropagation();
    openPhotoViewer(img.src);
    return;
  }

  const profileTarget = e.target.closest('[data-action="view-profile"]');
  if(!profileTarget) return;
  if(e.target.closest('.note-tab-delete')) return;

  const uid = profileTarget.dataset.uid || null;
  const fallbackName = profileTarget.dataset.name || '';
  if(uid){
    openViewProfile(uid, fallbackName, false);
  }
});


/* ===== prévia da foto de perfil ao passar o mouse ===== */
const profilePhotoHoverPreview = document.getElementById('profile-photo-hover-preview');
let profilePhotoHoverTimer = null;
let profilePhotoHoverTarget = null;

function positionProfilePhotoPreview(target){
  if(!profilePhotoHoverPreview) return;
  const rect = target.getBoundingClientRect();
  const size = 220, gap = 12, margin = 12;
  let left = rect.right + gap;
  let top = rect.top + (rect.height - size) / 2;
  if(left + size > window.innerWidth - margin) left = rect.left - size - gap;
  if(left < margin) left = margin;
  if(top + size > window.innerHeight - margin) top = window.innerHeight - size - margin;
  if(top < margin) top = margin;
  profilePhotoHoverPreview.style.left = `${left}px`;
  profilePhotoHoverPreview.style.top = `${top}px`;
}

function showProfilePhotoPreview(target){
  if(!profilePhotoHoverPreview || !target || !target.classList.contains('has-photo')) return;
  const img = target.querySelector('img');
  if(!img || !img.src) return;
  clearTimeout(profilePhotoHoverTimer);
  profilePhotoHoverTarget = target;
  profilePhotoHoverPreview.innerHTML = `<img src="${img.src}" alt="Pré-visualização da foto de perfil">`;
  profilePhotoHoverPreview.classList.add('visible');
  profilePhotoHoverPreview.setAttribute('aria-hidden','false');
  positionProfilePhotoPreview(target);
}

function hideProfilePhotoPreview(){
  clearTimeout(profilePhotoHoverTimer);
  profilePhotoHoverTarget = null;
  if(!profilePhotoHoverPreview) return;
  profilePhotoHoverPreview.classList.remove('visible');
  profilePhotoHoverPreview.setAttribute('aria-hidden','true');
  profilePhotoHoverTimer = setTimeout(()=>{
    if(!profilePhotoHoverTarget) profilePhotoHoverPreview.innerHTML='';
  }, 180);
}

if(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches){
  document.addEventListener('mouseover', (e)=>{
    const target = e.target.closest('#profile-photo-preview, #view-profile-photo');
    if(!target || !target.classList.contains('has-photo')) return;
    if(target.contains(e.relatedTarget)) return;
    clearTimeout(profilePhotoHoverTimer);
    profilePhotoHoverTimer = setTimeout(()=>showProfilePhotoPreview(target), 180);
  });
  document.addEventListener('mouseout', (e)=>{
    const target = e.target.closest('#profile-photo-preview, #view-profile-photo');
    if(!target) return;
    if(target.contains(e.relatedTarget)) return;
    clearTimeout(profilePhotoHoverTimer);
    if(target === profilePhotoHoverTarget) hideProfilePhotoPreview();
  });
  window.addEventListener('resize', ()=>{
    if(profilePhotoHoverTarget) positionProfilePhotoPreview(profilePhotoHoverTarget);
  });
  window.addEventListener('scroll', ()=>{
    if(profilePhotoHoverTarget) positionProfilePhotoPreview(profilePhotoHoverTarget);
  }, {passive:true});
}

/* ===== card de perfil ao passar o mouse (hover) =====
   Igual ao balãozinho do GitHub quando você passa o mouse no @ de
   alguém: mostra foto, nome, setor e bio sem precisar clicar. Só em
   telas com mouse de verdade (hover:hover) — em touch, o toque já
   abre o perfil completo direto, então o hover não faz sentido lá. */
const hoverCard = document.getElementById('hover-profile-card');
const hoverCardAvatar = document.getElementById('hover-card-avatar');
const hoverCardName = document.getElementById('hover-card-name');
const hoverCardStatus = document.getElementById('hover-card-status');
const hoverCardBio = document.getElementById('hover-card-bio');
const hoverCardSector = document.getElementById('hover-card-sector');
const supportsHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
let hoverShowTimer = null, hoverHideTimer = null, hoverCardTargetEl = null;
let hoverCardPinned = false;
const HOVER_CARD_DELAY = 650;
const HOVER_CARD_HIDE_DELAY = 120;

function fillHoverCard(uid, fallbackName){
  const profile = uid ? state.users[uid] : null;
  const name = (profile && profile.name) || fallbackName || 'Alguém';
  const sector = userSectors(profile);
  const admin = !!(profile && profile.isAdmin);
  const banned = !!(profile && profile.isBanned);
  const support = !!(profile && profile.isSupport);
  const dev = !!(profile && profile.isDev);
  const photo = profile && profile.photo ? profile.photo : null;
  const bio = profile && profile.bio ? profile.bio : 'Ainda sem descrição no perfil.';
  const presence = uid && state.presence[uid] ? state.presence[uid] : null;
  const online = !!(presence && presence.online);
  const statusText = online
    ? 'online agora'
    : (presence && presence.lastSeen ? 'visto por último ' + timeAgo(presence.lastSeen) : 'offline');

  hoverCardAvatar.innerHTML = photo ? `<img src="${photo}" alt="">` : '';
  if(!photo) hoverCardAvatar.textContent = initials(name);
  hoverCardName.innerHTML = `${escapeHtml(name)}${adminTagHtml(admin)}${supportTagHtml(support)}${devTagHtml(dev)}${bannedTagHtml(banned)}`;
  hoverCardStatus.innerHTML = `<span class="status-dot ${online?'on':''}"></span>${escapeHtml(statusText)}`;
  hoverCardBio.textContent = bio;
  hoverCardSector.innerHTML = sectorTagHtml(sector);
  hoverCardSector.style.display = sector.length ? '' : 'none';
}

function positionHoverCard(targetEl){
  const rect = targetEl.getBoundingClientRect();
  const cardW = 290, cardH = hoverCard.offsetHeight || 160, margin = 10;
  let left = rect.left;
  let top = rect.bottom + 8;
  if(left + cardW + margin > window.innerWidth) left = window.innerWidth - cardW - margin;
  if(left < margin) left = margin;
  if(top + cardH + margin > window.innerHeight) top = rect.top - cardH - 8;
  if(top < margin) top = margin;
  hoverCard.style.left = left + 'px';
  hoverCard.style.top = top + 'px';
}

function showHoverCard(targetEl){
  const uid = targetEl.dataset.uid || null;
  const name = targetEl.dataset.name || '';
  fillHoverCard(uid, name);
  hoverCard.classList.remove('hidden');
  positionHoverCard(targetEl);
  requestAnimationFrame(()=> hoverCard.classList.add('visible'));
}
function hideHoverCardNow(){
  if(hoverCardPinned) return;
  clearTimeout(hoverShowTimer);
  clearTimeout(hoverHideTimer);
  hoverCard.classList.remove('visible');
  hoverCardTargetEl = null;
  hoverHideTimer = setTimeout(()=>{
    if(!hoverCard.classList.contains('visible')) hoverCard.classList.add('hidden');
  }, 130);
}

if(supportsHover){
  document.addEventListener('mouseover', (e)=>{
    const el = e.target.closest('[data-action="view-profile"]');
    if(el && el.contains(e.relatedTarget)) return;
    if(!el || el === hoverCardTargetEl) return;
    clearTimeout(hoverHideTimer);
    clearTimeout(hoverShowTimer);
    hoverCardTargetEl = el;
    hoverShowTimer = setTimeout(()=>{
      if(hoverCardTargetEl === el) showHoverCard(el);
    }, HOVER_CARD_DELAY);
  });
  document.addEventListener('mouseout', (e)=>{
    const el = e.target.closest('[data-action="view-profile"]');
    if(el && el.contains(e.relatedTarget)) return;
    if(!el || el !== hoverCardTargetEl || hoverCardPinned) return;
    clearTimeout(hoverShowTimer);
    hoverCardTargetEl = null;
    hoverHideTimer = setTimeout(hideHoverCardNow, HOVER_CARD_HIDE_DELAY);
  });
  document.addEventListener('scroll', hideHoverCardNow, true);
  document.addEventListener('click', e=>{
    if(hoverCardPinned && (hoverCard.contains(e.target) || sidebarProfileCard?.contains(e.target))) return;
    hoverCardPinned = false;
    hideHoverCardNow();
  });
}

sidebarProfileCard?.addEventListener('click', e=>{
  e.preventDefault();
  e.stopPropagation();
  hoverCardPinned = false;
  hideHoverCardNow();
  profileBtn?.click();
});

/* ===== ver foto de perfil ampliada (com zoom) ===== */
const photoViewerModal = document.getElementById('photo-viewer-modal');
const photoViewerImg = document.getElementById('photo-viewer-img');
const photoViewerBack = document.getElementById('photo-viewer-back');
const photoZoomIn = document.getElementById('photo-zoom-in');
const photoZoomOut = document.getElementById('photo-zoom-out');
const photoZoomReset = document.getElementById('photo-zoom-reset');
const photoZoomLevel = document.getElementById('photo-zoom-level');

const PHOTO_ZOOM_MIN = 1, PHOTO_ZOOM_MAX = 4, PHOTO_ZOOM_STEP = 0.5;
let photoZoom = 1, photoPanX = 0, photoPanY = 0;
let photoDragging = false, photoDragStartX = 0, photoDragStartY = 0, photoPanStartX = 0, photoPanStartY = 0;

function applyPhotoTransform(){
  photoViewerImg.style.transform = `translate(${photoPanX}px, ${photoPanY}px) scale(${photoZoom})`;
  photoViewerImg.style.cursor = photoZoom > PHOTO_ZOOM_MIN ? 'grab' : 'zoom-in';
  photoZoomLevel.textContent = Math.round(photoZoom * 100) + '%';
  photoZoomOut.disabled = photoZoom <= PHOTO_ZOOM_MIN;
  photoZoomIn.disabled = photoZoom >= PHOTO_ZOOM_MAX;
}
function setPhotoZoom(z, cx, cy){
  const next = Math.min(PHOTO_ZOOM_MAX, Math.max(PHOTO_ZOOM_MIN, z));
  if(next === PHOTO_ZOOM_MIN){ photoPanX = 0; photoPanY = 0; }
  photoZoom = next;
  applyPhotoTransform();
}
function resetPhotoZoom(){ photoZoom = 1; photoPanX = 0; photoPanY = 0; applyPhotoTransform(); }

function openPhotoViewer(src){
  if(!src) return;
  photoViewerImg.src = src;
  resetPhotoZoom();
  photoViewerModal.classList.remove('hidden');
}
function closePhotoViewer(){ photoViewerModal.classList.add('hidden'); photoViewerImg.src = ''; resetPhotoZoom(); }
photoViewerBack.addEventListener('click', closePhotoViewer);
photoViewerModal.addEventListener('click', (e)=>{ if(e.target === photoViewerModal) closePhotoViewer(); });
document.addEventListener('keydown', (e)=>{
  if(e.target.matches('[data-reply-edit]') && e.key === 'Escape'){
    e.preventDefault();
    document.querySelector(`[data-action="cancel-reply-edit"][data-id="${e.target.dataset.replyEdit}"]`)?.click();
    return;
  }
  if(e.target.matches('[data-reply-edit]') && e.key === 'Enter' && (e.ctrlKey || e.metaKey)){
    e.preventDefault();
    document.querySelector(`[data-action="save-reply-edit"][data-id="${e.target.dataset.replyEdit}"]`)?.click();
    return;
  }
  if(e.target.matches('[data-comment-edit]') && e.key === 'Escape'){
    e.preventDefault();
    document.querySelector(`[data-action="cancel-comment-edit"][data-id="${e.target.dataset.commentEdit}"]`)?.click();
    return;
  }
  if(e.target.matches('[data-comment-edit]') && e.key === 'Enter' && (e.ctrlKey || e.metaKey)){
    e.preventDefault();
    document.querySelector(`[data-action="save-comment-edit"][data-id="${e.target.dataset.commentEdit}"]`)?.click();
    return;
  }
  if(photoViewerModal.classList.contains('hidden')) return;
  if(e.key === 'Escape') closePhotoViewer();
  else if(e.key === '+' || e.key === '=') setPhotoZoom(photoZoom + PHOTO_ZOOM_STEP);
  else if(e.key === '-') setPhotoZoom(photoZoom - PHOTO_ZOOM_STEP);
});

photoZoomIn.addEventListener('click', ()=> setPhotoZoom(photoZoom + PHOTO_ZOOM_STEP));
photoZoomOut.addEventListener('click', ()=> setPhotoZoom(photoZoom - PHOTO_ZOOM_STEP));
photoZoomReset.addEventListener('click', resetPhotoZoom);

// roda do mouse pra dar zoom
photoViewerImg.addEventListener('wheel', (e)=>{
  e.preventDefault();
  setPhotoZoom(photoZoom + (e.deltaY < 0 ? 0.25 : -0.25));
}, { passive: false });

// duplo clique alterna entre normal e 2x
photoViewerImg.addEventListener('dblclick', ()=>{
  setPhotoZoom(photoZoom > PHOTO_ZOOM_MIN ? 1 : 2);
});

// arrastar pra mover a foto quando estiver com zoom
photoViewerImg.addEventListener('pointerdown', (e)=>{
  if(photoZoom <= PHOTO_ZOOM_MIN) return;
  photoDragging = true;
  photoDragStartX = e.clientX; photoDragStartY = e.clientY;
  photoPanStartX = photoPanX; photoPanStartY = photoPanY;
  photoViewerImg.classList.add('dragging');
  photoViewerImg.style.cursor = 'grabbing';
  photoViewerImg.setPointerCapture(e.pointerId);
});
photoViewerImg.addEventListener('pointermove', (e)=>{
  if(!photoDragging) return;
  photoPanX = photoPanStartX + (e.clientX - photoDragStartX);
  photoPanY = photoPanStartY + (e.clientY - photoDragStartY);
  applyPhotoTransform();
});
function endPhotoDrag(){
  photoDragging = false;
  photoViewerImg.classList.remove('dragging');
  if(photoZoom > PHOTO_ZOOM_MIN) photoViewerImg.style.cursor = 'grab';
}
photoViewerImg.addEventListener('pointerup', endPhotoDrag);
photoViewerImg.addEventListener('pointerleave', endPhotoDrag);
photoViewerImg.addEventListener('pointercancel', endPhotoDrag);

viewProfilePhoto.addEventListener('click', ()=>{
  const img = viewProfilePhoto.querySelector('img');
  if(img) openPhotoViewer(img.src);
});
viewProfileModalClose.addEventListener('click', closeViewProfile);
viewProfileBack.addEventListener('click', ()=>{
  closeViewProfile();
  openProfileModal(false);
});
viewProfileModal.addEventListener('click', (e)=>{ if(e.target === viewProfileModal) closeViewProfile(); });
viewProfileMessageBtn.addEventListener('click', ()=>{
  if(!viewingProfileUid) return;
  closeViewProfile();
  openDmThread(viewingProfileUid, viewProfileName.textContent, viewProfilePhoto.querySelector('img') ? viewProfilePhoto.querySelector('img').src : null);
});
viewProfileBanBtn.addEventListener('click', ()=>{
  if(!viewingProfileUid || !isAdmin()) return;
  const profile = state.users[viewingProfileUid] || {};
  const banned = !!profile.isBanned;
  const name = viewProfileName.textContent || 'essa pessoa';
  const ok = confirm(
    banned
      ? `Desbanir ${name}? A pessoa volta a conseguir entrar e usar o mural normalmente.`
      : `Banir ${name}? Ela é desconectada na hora e não consegue mais entrar no Plantel até você desbanir.`
  );
  if(!ok) return;
  update(ref(db, 'users/'+viewingProfileUid), { isBanned: !banned }).then(()=>{
    closeViewProfile();
  }).catch(handleDbError);
});
viewProfileSupportBtn.addEventListener('click', ()=>{
  if(!viewingProfileUid || !isAdmin()) return;
  const profile = state.users[viewingProfileUid] || {};
  const support = !!profile.isSupport;
  const name = viewProfileName.textContent || 'essa pessoa';
  const ok = confirm(
    support
      ? `Remover a marca de suporte de ${name}?`
      : `Marcar ${name} como suporte? A etiqueta amarela "suporte" vai aparecer no nome dela em todo o site, e ela passa a aparecer como opção de contato no botão de Suporte.`
  );
  if(!ok) return;
  update(ref(db, 'users/'+viewingProfileUid), { isSupport: !support }).then(()=>{
    closeViewProfile();
  }).catch(handleDbError);
});
viewProfileDevBtn.addEventListener('click', ()=>{
  if(!viewingProfileUid || !isAdmin()) return;
  const profile = state.users[viewingProfileUid] || {};
  const dev = !!profile.isDev;
  const name = viewProfileName.textContent || 'essa pessoa';
  const ok = confirm(
    dev
      ? `Remover a marca do Plantel Labs de ${name}?`
      : `Marcar ${name} como parte do Plantel Labs? A etiqueta roxa "plantel labs" vai aparecer no nome dela em todo o site, indicando que faz parte do time de desenvolvimento do Plantel Hub.`
  );
  if(!ok) return;
  update(ref(db, 'users/'+viewingProfileUid), { isDev: !dev }).then(()=>{
    closeViewProfile();
  }).catch(handleDbError);
});
/* ===== mensagens diretas (DM) =====
   Cada conversa fica em dms/{chatId}/messages, onde chatId é os dois
   uids ordenados e unidos por '__'. Também mantemos um índice
   conversations/{meuUid}/{outroUid} pra listar as conversas de cada
   pessoa sem precisar varrer todo o banco. */
let viewingProfileUid = null;
const dmListModal = document.getElementById('dm-list-modal');
const dmListModalClose = document.getElementById('dm-list-modal-close');
const dmListBody = document.getElementById('dm-list-body');
const dmThreadModal = document.getElementById('dm-thread-modal');
const dmThreadBack = document.getElementById('dm-thread-back');
const dmThreadClose = document.getElementById('dm-thread-close');
const dmThreadProfileLink = document.getElementById('dm-thread-profile-link');
const dmThreadAvatar = document.getElementById('dm-thread-avatar');
const dmThreadName = document.getElementById('dm-thread-name');
const dmNicknameBtn = document.getElementById('dm-nickname-btn');
const dmDeleteBtn = document.getElementById('dm-delete-btn');
const dmMessages = document.getElementById('dm-messages');
const dmInput = document.getElementById('dm-input');
const dmSendBtn = document.getElementById('dm-send-btn');
const dmBtn = document.getElementById('dm-btn');
const dmBadge = document.getElementById('dm-badge');
const syncDmKeyboardViewport = ()=>{
  const responsive = window.matchMedia('(max-width:1040px)').matches;
  const focused = document.activeElement === dmInput;
  const viewport = window.visualViewport;
  const viewportTop = viewport ? Math.max(0, viewport.offsetTop) : 0;
  const keyboardOffset = viewport
    ? Math.max(0, window.innerHeight - viewport.height - viewportTop)
    : 0;
  const keyboardOpen = responsive && focused && !dmThreadModal?.classList.contains('hidden') && keyboardOffset > 60;
  document.body.classList.toggle('dm-keyboard-open', keyboardOpen);
  document.documentElement.style.setProperty('--dm-keyboard-offset', `${keyboardOffset}px`);
  document.documentElement.style.setProperty('--dm-viewport-top', `${viewportTop}px`);
  if(keyboardOpen) requestAnimationFrame(()=>{
    dmMessages.scrollTop = dmMessages.scrollHeight;
    dmInput.scrollIntoView({block:'nearest',inline:'nearest'});
  });
};
dmInput?.addEventListener('focus', ()=>{
  syncDmKeyboardViewport();
  setTimeout(syncDmKeyboardViewport, 180);
  setTimeout(syncDmKeyboardViewport, 420);
});
dmInput?.addEventListener('blur', ()=>setTimeout(syncDmKeyboardViewport, 120));
window.visualViewport?.addEventListener('resize', syncDmKeyboardViewport);
window.visualViewport?.addEventListener('scroll', syncDmKeyboardViewport);
window.addEventListener('orientationchange', ()=>setTimeout(syncDmKeyboardViewport, 180));
let dmConversations = {};
let dmThreadUid = null;
let dmThreadUnsub = null;
let myNicknames = {};
const DM_SEEN_KEY = 'plantel_dm_seen_ts';

const AUDIO_MAX_SECONDS = 30;
const AUDIO_MAX_BYTES = 500 * 1024;
let activeAudioRecorder = null;
function audioMimeType(){
  if(!window.MediaRecorder) return '';
  return ['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus']
    .find(type=>MediaRecorder.isTypeSupported(type)) || '';
}
function createAudioRecorder(button, status, preview){
  let recorder = null, stream = null, chunks = [], pending = null, startedAt = 0, timer = null;
  const originalHtml = button.innerHTML;
  const stopTracks = ()=>{ if(stream){ stream.getTracks().forEach(track=>track.stop()); stream=null; } };
  const updateTimer = ()=>{
    const elapsed = Math.min(AUDIO_MAX_SECONDS, Math.floor((Date.now()-startedAt)/1000));
    status.textContent = `Gravando ${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(elapsed%60).padStart(2,'0')} / 00:30`;
    if(elapsed >= AUDIO_MAX_SECONDS && recorder?.state === 'recording') recorder.stop();
  };
  const drawPreview = ()=>{
    if(!pending){ preview.classList.add('hidden'); preview.innerHTML=''; return; }
    preview.classList.remove('hidden');
    preview.innerHTML = `<audio controls preload="metadata" src="${escapeHtml(pending.data)}"></audio><button class="btn btn-ghost audio-preview-remove" type="button" aria-label="Remover áudio" title="Remover áudio">×</button>`;
    preview.querySelector('.audio-preview-remove').addEventListener('click', clear);
  };
  function finishUi(){
    clearInterval(timer); timer=null; stopTracks();
    button.classList.remove('is-recording'); button.innerHTML=originalHtml;
    button.setAttribute('aria-label','Gravar áudio');
    if(activeAudioRecorder === api) activeAudioRecorder=null;
  }
  function stop(){ if(recorder?.state === 'recording') recorder.stop(); }
  function clear(){ pending=null; status.textContent=''; drawPreview(); }
  async function start(){
    if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder){ showDbError('Este navegador não oferece suporte à gravação de áudio.'); return; }
    if(activeAudioRecorder && activeAudioRecorder !== api) activeAudioRecorder.stop();
    try{
      stream = await navigator.mediaDevices.getUserMedia({audio:true});
      chunks=[]; pending=null; drawPreview();
      const mimeType=audioMimeType();
      const options={audioBitsPerSecond:24000};
      if(mimeType) options.mimeType=mimeType;
      recorder=new MediaRecorder(stream,options);
      recorder.addEventListener('dataavailable',event=>{ if(event.data.size) chunks.push(event.data); });
      recorder.addEventListener('stop',()=>{
        const duration=Math.max(1,Math.min(AUDIO_MAX_SECONDS,Math.round((Date.now()-startedAt)/1000)));
        const blob=new Blob(chunks,{type:recorder.mimeType || mimeType || 'audio/webm'});
        finishUi();
        if(!blob.size){ status.textContent='Não foi possível gravar o áudio.'; return; }
        if(blob.size > AUDIO_MAX_BYTES){ status.textContent='O áudio ficou maior que 500 KB. Tente novamente.'; return; }
        const reader=new FileReader();
        reader.addEventListener('load',()=>{
          pending={data:String(reader.result),mime:blob.type,duration,size:blob.size};
          status.textContent=`Áudio pronto · ${duration}s`; drawPreview();
        });
        reader.readAsDataURL(blob);
      });
      recorder.start(250); activeAudioRecorder=api; startedAt=Date.now();
      button.classList.add('is-recording'); button.textContent='■ Parar';
      button.setAttribute('aria-label','Parar gravação'); updateTimer(); timer=setInterval(updateTimer,500);
    }catch(error){
      finishUi();
      status.textContent = error?.name === 'NotAllowedError' ? 'Permita o acesso ao microfone.' : 'Não foi possível acessar o microfone.';
    }
  }
  const api={start,stop,clear,getPending:()=>pending,isRecording:()=>recorder?.state==='recording'};
  button.addEventListener('click',()=>api.isRecording()?stop():start());
  return api;
}
const dmAudioRecorder=createAudioRecorder(document.getElementById('dm-audio-record'),document.getElementById('dm-audio-status'),document.getElementById('dm-audio-preview'));

function chatId(a, b){ return [a, b].sort().join('__'); }
function nicknameFor(otherUid, fallbackName){
  return (myNicknames && otherUid && myNicknames[otherUid]) || fallbackName || 'Alguém';
}
function dmDayKey(ts){
  const d = new Date(ts || 0);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function formatDmDay(ts){
  const date = new Date(ts || 0);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const key = dmDayKey(ts);
  if(key === dmDayKey(today.getTime())) return 'Hoje';
  if(key === dmDayKey(yesterday.getTime())) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
}
function formatDmTime(ts){
  return new Date(ts || 0).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
}
function formatDmFullDateTime(ts){
  return new Date(ts || 0).toLocaleString('pt-BR', {
    day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'
  });
}
function renderDmMessages(msgs, otherReadAt){
  if(!msgs.length) return `<div class="dm-empty">Nenhuma mensagem ainda. Diga oi!</div>`;
  let lastDay = '';
  return msgs.map(m=>{
    const mine = m.from === currentUid;
    const day = dmDayKey(m.ts);
    const divider = day !== lastDay ? `<div class="dm-date-divider">${escapeHtml(formatDmDay(m.ts))}</div>` : '';
    lastDay = day;
    const read = mine && Number(otherReadAt || 0) >= Number(m.ts || 0);
    const status = mine
      ? `<span class="dm-message-status ${read ? 'is-read' : ''}" title="${read ? 'Visualizada' : 'Enviada'}" aria-label="${read ? 'Visualizada' : 'Enviada'}">${read ? '✓✓' : '✓'}</span>`
      : '';
    return `${divider}
      <div class="dm-bubble ${mine?'dm-bubble-mine':'dm-bubble-theirs'}">
        ${m.text ? escapeHtml(m.text) : ''}
        ${renderAudioPlayer(m.audio,'dm-audio-message')}
        <div class="dm-bubble-meta" title="${escapeHtml(formatDmFullDateTime(m.ts))}">
          <time class="dm-bubble-time" datetime="${new Date(m.ts || 0).toISOString()}">${formatDmTime(m.ts)}</time>${status}
        </div>
      </div>`;
  }).join('');
}

/* ===== som de notificação =====
   Um "pling" curto gerado no próprio navegador (sem precisar de
   arquivo de áudio). Navegadores só deixam tocar som depois de uma
   primeira interação da pessoa na página, então o contexto de áudio
   é criado/"destravado" no primeiro clique. */
let audioCtx = null;
function ensureAudioCtx(){
  if(!audioCtx){
    try{ audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e){ return null; }
  }
  if(audioCtx.state === 'suspended'){ audioCtx.resume().catch(()=>{}); }
  return audioCtx;
}
document.addEventListener('click', ()=> ensureAudioCtx(), { once: true });

function playNotificationSound(){
  const ctx = ensureAudioCtx();
  if(!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.setValueAtTime(1175, now + 0.09);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.3);
}

function renderDmList(){
  const entries = Object.entries(dmConversations).sort((a,b)=> (b[1].lastTs||0) - (a[1].lastTs||0));
  dmListBody.innerHTML = entries.length ? entries.map(([otherUid, c])=>{
    const displayName = nicknameFor(otherUid, c.name);
    const av = c.photo
      ? `<div class="avatar"><img src="${c.photo}" alt=""></div>`
      : `<div class="avatar">${initials(displayName)}</div>`;
    return `
    <div class="dm-conversation-item">
      <button class="dm-conversation-open" data-action="open-dm" data-uid="${otherUid}">
        ${av}
        <div class="dm-conversation-text">
          <div class="dm-conversation-name">${escapeHtml(displayName)}</div>
          <div class="dm-conversation-last">${escapeHtml(c.lastText || '')}</div>
        </div>
        <div class="dm-conversation-time">${c.lastTs ? timeAgo(c.lastTs) : ''}</div>
      </button>
      <button class="dm-conversation-remove" data-action="delete-dm-list" data-uid="${otherUid}" title="Apagar conversa e contato">
        <svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>
      </button>
    </div>`;
  }).join('') : `<div class="dm-empty">Nenhuma conversa ainda. Abra o perfil de alguém e clique em "Mandar mensagem".</div>`;
}

function updateDmBadge(){
  const seen = Number(localStorage.getItem(DM_SEEN_KEY) || 0);
  const hasNew = Object.values(dmConversations).some(c => (c.lastTs||0) > seen && c.lastFrom && c.lastFrom !== currentUid);
  dmBadge.classList.toggle('hidden', !hasNew);
}

function openDmList(){
  renderDmList();
  openModalSmooth(dmListModal);
  localStorage.setItem(DM_SEEN_KEY, String(Date.now()));
  updateDmBadge();
  renderTodayPanel();
}
function closeDmList(){ closeModalSmooth(dmListModal); }
dmBtn.addEventListener('click', openDmList);
dmListModalClose.addEventListener('click', closeDmList);
dmListModal.addEventListener('click', (e)=>{ if(e.target === dmListModal) closeDmList(); });

function updateDmThreadHeader(){
  if(!dmThreadUid) return;
  const known = dmConversations[dmThreadUid];
  const displayName = nicknameFor(dmThreadUid, known && known.name);
  dmThreadName.textContent = displayName;
  dmThreadProfileLink.dataset.uid = dmThreadUid;
  dmThreadProfileLink.dataset.name = displayName;
  const displayPhoto = known && known.photo;
  if(!dmThreadAvatar.querySelector('img')){ dmThreadAvatar.textContent = initials(displayName); }
}

function openDmThread(otherUid, name, photo){
  dmThreadUid = otherUid;
  const known = dmConversations[otherUid];
  const displayName = nicknameFor(otherUid, (known && known.name) || name);
  const displayPhoto = (known && known.photo) || photo || null;
  dmThreadName.textContent = displayName;
  dmThreadProfileLink.dataset.uid = otherUid;
  dmThreadProfileLink.dataset.name = displayName;
  dmThreadAvatar.innerHTML = displayPhoto ? `<img src="${displayPhoto}" alt="">` : initials(displayName);
  dmMessages.innerHTML = '';
  if(dmThreadUnsub) dmThreadUnsub();
  const cid = chatId(currentUid, otherUid);
  dmThreadUnsub = onValue(ref(db, 'dms/'+cid), snap => {
    const chat = snap.val() || {};
    const msgs = objToArray(chat.messages).sort((a,b)=>a.ts-b.ts);
    const readBy = chat.readBy || {};
    dmMessages.innerHTML = renderDmMessages(msgs, readBy[otherUid]);
    dmMessages.scrollTop = dmMessages.scrollHeight;
    const newestReceivedAt = msgs.reduce((latest, m)=>m.from === otherUid ? Math.max(latest, Number(m.ts || 0)) : latest, 0);
    if(newestReceivedAt > Number(readBy[currentUid] || 0)){
      update(ref(db, 'dms/'+cid+'/readBy'), { [currentUid]: newestReceivedAt }).catch(handleDbError);
    }
  }, handleDbError);
  closeModalSmooth(dmListModal);
  openModalSmooth(dmThreadModal);
  localStorage.setItem(DM_SEEN_KEY, String(Date.now()));
  updateDmBadge();
  setTimeout(()=> dmInput.focus(), 50);
}
function closeDmThread(){
  closeModalSmooth(dmThreadModal);
  if(dmThreadUnsub){ dmThreadUnsub(); dmThreadUnsub = null; }
  dmThreadUid = null;
}
dmThreadClose.addEventListener('click', closeDmThread);
dmThreadBack.addEventListener('click', ()=>{ closeDmThread(); openDmList(); });
dmThreadModal.addEventListener('click', (e)=>{ if(e.target === dmThreadModal) closeDmThread(); });
dmThreadProfileLink.addEventListener('keydown', event=>{
  if(event.key === 'Enter' || event.key === ' '){
    event.preventDefault();
    dmThreadProfileLink.click();
  }
});

dmNicknameBtn.addEventListener('click', ()=>{
  if(!dmThreadUid || !currentUid) return;
  const current = myNicknames[dmThreadUid] || '';
  const value = prompt('Apelido pra essa pessoa (só você vê, em vez do nome real).\nPra voltar ao nome normal, apague o texto e confirme:', current);
  if(value === null) return; // cancelou
  const trimmed = value.trim();
  const nickRef = ref(db, 'contactNicknames/'+currentUid+'/'+dmThreadUid);
  (trimmed ? set(nickRef, trimmed) : remove(nickRef)).then(()=>{
    myNicknames[dmThreadUid] = trimmed || undefined;
    updateDmThreadHeader();
    if(!dmListModal.classList.contains('hidden')) renderDmList();
  }).catch(handleDbError);
});

function deleteConversation(otherUid, name){
  if(!otherUid || !currentUid) return Promise.resolve();
  const ok = confirm(`Apagar a conversa com ${name || 'essa pessoa'}? As mensagens somem pra você e pra essa pessoa, e não dá pra desfazer.`);
  if(!ok) return Promise.resolve();
  const cid = chatId(currentUid, otherUid);
  return Promise.allSettled([
    remove(ref(db, 'dms/'+cid)),
    remove(ref(db, 'conversations/'+currentUid+'/'+otherUid)),
    remove(ref(db, 'conversations/'+otherUid+'/'+currentUid))
  ]);
}

dmDeleteBtn.addEventListener('click', ()=>{
  if(!dmThreadUid) return;
  const known = dmConversations[dmThreadUid];
  const name = nicknameFor(dmThreadUid, known && known.name);
  deleteConversation(dmThreadUid, name).then(()=>{
    closeDmThread();
    openDmList();
  }).catch(handleDbError);
});

function sendDmMessage(){
  const text = dmInput.value.trim();
  const audio = dmAudioRecorder.getPending();
  if((!text && !audio) || !dmThreadUid || !currentUid) return;
  const cid = chatId(currentUid, dmThreadUid);
  const mine = myProfile() || {};
  set(ref(db, 'dms/'+cid+'/messages/'+uid()), { from: currentUid, text, audio, ts: Date.now() }).catch(handleDbError);
  const now = Date.now();
  const lastText = text || '🎙 Áudio';
  update(ref(db, 'conversations/'+currentUid+'/'+dmThreadUid), {
    name: dmThreadName.textContent, photo: (dmThreadAvatar.querySelector('img')||{}).src || null,
    lastText, lastTs: now, lastFrom: currentUid
  }).catch(handleDbError);
  update(ref(db, 'conversations/'+dmThreadUid+'/'+currentUid), {
    name: mine.name || 'Alguém', photo: mine.photo || null,
    lastText, lastTs: now, lastFrom: currentUid
  }).catch(handleDbError);
  dmInput.value = '';
  dmAudioRecorder.clear();
}
dmSendBtn.addEventListener('click', sendDmMessage);
dmInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter'){ e.preventDefault(); sendDmMessage(); } });

document.addEventListener('keydown', (e)=>{
  if(e.key !== 'Escape') return;
  if(!dmThreadModal.classList.contains('hidden')) closeDmThread();
  else if(!dmListModal.classList.contains('hidden')) closeDmList();
});


/* ===== estado compartilhado (Firebase Realtime Database) =====
   Itens públicos ficam em posts/metas/demandas (todo mundo lê).
   Itens privados ficam em posts_private/{setor}/..., e só quem tem
   aquele setor no perfil consegue ler — isso é reforçado pelas REGRAS
   do Firebase (não só escondido na tela), então é privacidade de
   verdade, aplicada no servidor. */
let state = {
  posts: [], postsPrivate: [],
  metas: [], metasPrivate: [],
  demandas: [], demandasPrivate: [],
  personalDemandas: [],
  users: {},
  presence: {}
};
function allPosts(){ return [...state.posts, ...state.postsPrivate]; }
function allMetas(){ return [...state.metas, ...state.metasPrivate]; }
function allDemandas(){ return [...state.demandas, ...state.demandasPrivate]; }
function activeDemandas(){ return allDemandas().filter(d=>!d.deletedAt); }
function postPath(item){ return item._sector ? `posts_private/${item._sector}/${item.id}` : `posts/${item.id}`; }
function metaPath(item){ return item._sector ? `metas_private/${item._sector}/${item.id}` : `metas/${item.id}`; }
function demandaPath(item){ return item._sector ? `demandas_private/${item._sector}/${item.id}` : `demandas/${item.id}`; }

function objToArray(obj, sector){
  return obj ? Object.entries(obj).map(([id, v]) => ({ id, ...v, _sector: sector || null })) : [];
}
function flattenAllSectors(obj){
  if(!obj) return [];
  return Object.entries(obj).flatMap(([sector, items]) => objToArray(items, sector));
}

let privateUnsub = { posts: null, metas: null, demandas: null };
let mySubscribedKey = undefined; // combina setor + modo admin

/* Assina uma lista de setores dentro de basePath (ex: 'posts_private'),
   um listener por setor — o Firebase só garante permissão de leitura
   nesse nível exato (posts_private/{setor}), então ler o nó raiz de
   uma vez só pode ser negado mesmo quando cada setor individualmente
   seria permitido. Junta tudo num só array e chama onUpdate a cada
   mudança em qualquer setor. Retorna uma função pra cancelar tudo.
   Importante: é ESPERADO que a maioria dos setores negue a leitura
   (só o seu próprio setor ou admin tem acesso) — isso não é um erro
   de verdade, então usamos um handler silencioso em vez do
   handleDbError, que mostraria um aviso vermelho assustador toda
   vez que a pessoa entrasse no site. */
function subscribeSectorsMerged(basePath, sectors, onUpdate){
  const bucket = {};
  const silentDenyHandler = (err)=>{
    const isPermissionDenied = err && (err.code === 'PERMISSION_DENIED' || /permission_denied/i.test(err.message || ''));
    if(!isPermissionDenied) handleDbError(err);
  };
  const unsubs = sectors.map(sector => onValue(ref(db, basePath+'/'+sector), snap => {
    bucket[sector] = objToArray(snap.val(), sector);
    onUpdate(Object.values(bucket).flat());
  }, silentDenyHandler));
  return () => unsubs.forEach(u => u && u());
}

function allKnownSectors(){
  return [...new Set([...FIXED_SECTORS, ...Object.values(state.users).flatMap(u=>userSectors(u))])];
}

function syncPrivateSubscription(){
  const mySectors = userSectors(myProfile());
  const admin = isAdmin();
  const key = admin ? 'admin' : (mySectors.length ? [...mySectors].sort().join(',') : 'none');
  if(key === mySubscribedKey) return;
  if(privateUnsub.posts) privateUnsub.posts();
  if(privateUnsub.metas) privateUnsub.metas();
  if(privateUnsub.demandas) privateUnsub.demandas();
  privateUnsub = { posts: null, metas: null, demandas: null };
  state.postsPrivate = []; state.metasPrivate = []; state.demandasPrivate = [];
  mySubscribedKey = key;

  const sectors = allKnownSectors();

  if(admin){
    // admin enxerga o privado de todos os setores, pra poder moderar/apagar um a um
    privateUnsub.posts = subscribeSectorsMerged('posts_private', sectors, list => { state.postsPrivate = list; scheduleRender(); });
    privateUnsub.metas = subscribeSectorsMerged('metas_private', sectors, list => { state.metasPrivate = list; scheduleRender(); });
    privateUnsub.demandas = subscribeSectorsMerged('demandas_private', sectors, list => { state.demandasPrivate = list; scheduleRender(); });
    return;
  }
  // vê o mural privado de qualquer um dos próprios setores + qualquer coisa
  // que ela mesma tenha mandado pra outros setores (senão a pessoa "perde
  // de vista" o que postou pra um setor diferente do seu)
  privateUnsub.posts = subscribeSectorsMerged('posts_private', sectors, list => {
    state.postsPrivate = list.filter(p => mySectors.includes(p._sector) || p.uid === currentUid);
    scheduleRender();
  });
  privateUnsub.metas = subscribeSectorsMerged('metas_private', sectors, list => {
    state.metasPrivate = list.filter(m => mySectors.includes(m._sector) || m.uid === currentUid);
    scheduleRender();
  });
  privateUnsub.demandas = subscribeSectorsMerged('demandas_private', sectors, list => {
    state.demandasPrivate = list.filter(d => mySectors.includes(d._sector) || d.uid === currentUid);
    scheduleRender();
  });
}

let appLoaded = { posts: false, users: false };
function markLoaded(key){
  appLoaded[key] = true;
  if(appLoaded.posts && appLoaded.users){
    loadingScreen.classList.add('hidden');
    wrapApp.classList.remove('hidden');
  }
}
// segurança: se algo travar (rede lenta, erro silencioso), não deixa o
// usuário preso na tela de carregamento pra sempre
setTimeout(()=>{
  if(!wrapApp.classList.contains('hidden')) return;
  loadingScreen.classList.add('hidden');
  wrapApp.classList.remove('hidden');
}, 10000);

let dataUnsubs = [];
function stopDataListeners(){
  clearMyCallPresence();
  renderCallPresence({});
  dataUnsubs.forEach(u => { if(u) u(); });
  dataUnsubs = [];
  listenersStarted = false;
  appLoaded = { posts: false, users: false };
  if(privateUnsub.posts) privateUnsub.posts();
  if(privateUnsub.metas) privateUnsub.metas();
  if(privateUnsub.demandas) privateUnsub.demandas();
  privateUnsub = { posts: null, metas: null, demandas: null };
  mySubscribedKey = undefined;
  state.posts = []; state.metas = []; state.demandas = []; state.personalDemandas = []; state.users = {};
  state.postsPrivate = []; state.metasPrivate = []; state.demandasPrivate = [];
  dmConversations = {};
}

function startDataListeners(){
  dataUnsubs.push(onValue(ref(db, 'posts'), snap => { state.posts = objToArray(snap.val()); markLoaded('posts'); scheduleRender(); }, handleDbError));
  dataUnsubs.push(onValue(ref(db, 'metas'), snap => { state.metas = objToArray(snap.val()); scheduleRender(); }, handleDbError));
  dataUnsubs.push(onValue(ref(db, 'demandas'), snap => { state.demandas = objToArray(snap.val()); scheduleRender(); }, handleDbError));
  if(currentUid)dataUnsubs.push(onValue(ref(db, 'personal_demands/'+currentUid),snap=>{state.personalDemandas=objToArray(snap.val());renderMySpace();},(err)=>{
    const isPermissionDenied = err && (err.code === 'PERMISSION_DENIED' || /permission_denied/i.test(err.message || ''));
    if(!isPermissionDenied) handleDbError(err);
  }));
  dataUnsubs.push(onValue(ref(db, 'users'), snap => {
    state.users = snap.val() || {};
    refreshSectorOptions();
    syncPrivateSubscription();
    scheduleRender();
    renderOnlineList();
    maybeOpenProfileOnboarding();
    enforceBanCheck();
    if(currentUid && state.users[currentUid]){
      enrichRecentAccount(currentUid, { name: state.users[currentUid].name, photo: state.users[currentUid].photo || null });
    }
    markLoaded('users');
  }, handleDbError));
  dataUnsubs.push(onValue(ref(db, 'presence'), snap => {
    state.presence = snap.val() || {};
    renderOnlineList();
  }, handleDbError));
  dataUnsubs.push(onValue(ref(db, 'team_call/participants'), snap => {
    renderCallPresence(snap.val() || {});
  }, ()=> renderCallPresence({})));
  dataUnsubs.push(startPresence());
  let dmConversationsLoaded = false;
  const dmSeenLastTs = {};
  dataUnsubs.push(onValue(ref(db, 'conversations/'+currentUid), snap => {
    const data = snap.val() || {};
    if(dmConversationsLoaded){
      Object.entries(data).forEach(([otherUid, c])=>{
        const prevTs = dmSeenLastTs[otherUid] || 0;
        if(c.lastTs && c.lastTs > prevTs && c.lastFrom && c.lastFrom !== currentUid){
          playNotificationSound();
        }
      });
    }
    Object.entries(data).forEach(([otherUid, c])=>{ dmSeenLastTs[otherUid] = c.lastTs || 0; });
    dmConversationsLoaded = true;
    dmConversations = data;
    if(!dmListModal.classList.contains('hidden')) renderDmList();
    updateDmBadge();
    renderMentionNotifications();
    renderTodayPanel();
  }, handleDbError));
  dataUnsubs.push(onValue(ref(db, 'contactNicknames/'+currentUid), snap => {
    myNicknames = snap.val() || {};
    if(!dmListModal.classList.contains('hidden')) renderDmList();
    updateDmThreadHeader();
  }, handleDbError));
}

/* ===== busca e filtro por setor no mural ===== */
const muralSearchInput = document.getElementById('mural-search');
const muralSectorSelect = document.getElementById('mural-sector-filter');
muralSearchInput.addEventListener('input', ()=>{
  muralSearch = muralSearchInput.value.trim().toLowerCase();
  render();
});
muralSectorSelect.addEventListener('change', ()=>{
  muralSectorFilter = muralSectorSelect.value;
  render();
});
const demandSearchInput=document.getElementById('demand-search');
const demandStatusSelect=document.getElementById('demand-status-filter');
const demandPrioritySelect=document.getElementById('demand-priority-filter');
demandSearchInput?.addEventListener('input',()=>{demandSearch=demandSearchInput.value.trim().toLocaleLowerCase('pt-BR');render();});
demandStatusSelect?.addEventListener('change',()=>{demandStatusFilter=demandStatusSelect.value;render();});
demandPrioritySelect?.addEventListener('change',()=>{demandPriorityFilter=demandPrioritySelect.value;render();});
document.getElementById('demand-assignee-filter')?.addEventListener('change',e=>{demandAssigneeFilter=e.target.value;render();});
document.getElementById('demanda-add-assignee')?.addEventListener('change',()=>{demandAssigneeAutoUid='';});
const FIXED_SECTORS = ['Marketing', 'Administrador do Listas', 'Monitoria', 'Parceiros', 'Desenvolvedor'];
function refreshSectorOptions(){
  const fromUsers = Object.values(state.users).flatMap(u=>userSectors(u));
  const sectors = [...new Set([...FIXED_SECTORS, ...fromUsers])].sort((a,b)=>a.localeCompare(b));
  const current = muralSectorSelect.value;
  muralSectorSelect.innerHTML = `<option value="">Todos os setores</option>` +
    sectors.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  if(sectors.includes(current)) muralSectorSelect.value = current;

  const mySectors = userSectors(myProfile());
  const visibilityOptions = isAdmin() ? sectors : (mySectors.length ? sectors.filter(s=>mySectors.includes(s)) : sectors);
  const visibilitySelectIds = ['msg-visibility', 'meta-add-visibility', 'demanda-add-visibility'];
  visibilitySelectIds.forEach(selId=>{
    const sel = document.getElementById(selId);
    const cur = sel.value;
    sel.innerHTML = `<option value="">Todos</option>` +
      visibilityOptions.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    if(visibilityOptions.includes(cur)) sel.value = cur;
  });
  const assigneeSelect=document.getElementById('demanda-add-assignee');
  if(assigneeSelect){
    const cur=assigneeSelect.value;
    assigneeSelect.innerHTML=`<option value="">Selecione o responsável</option>${demandUserOptions(cur)}`;
    if(state.users[cur])assigneeSelect.value=cur;
  }
  const assigneeFilter=document.getElementById('demand-assignee-filter');
  if(assigneeFilter){
    const cur=demandAssigneeFilter;
    assigneeFilter.innerHTML=`<option value="">Todas as pessoas</option>${demandUserOptions(cur)}`;
    if(cur&&state.users[cur])assigneeFilter.value=cur;else{assigneeFilter.value='';demandAssigneeFilter='';}
  }
}

const CHECK_SVG = '<svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-10"/></svg>';
const DEMAND_PRIORITIES={low:['Baixa','priority-low'],medium:['Média','priority-medium'],high:['Alta','priority-high'],urgent:['Urgente','priority-urgent']};
function demandUserOptions(selected=''){return Object.entries(state.users).filter(([,user])=>!user.isBanned).sort((a,b)=>(a[1].name||'').localeCompare(b[1].name||'')).map(([uid,user])=>`<option value="${escapeHtml(uid)}" ${uid===selected?'selected':''}>${escapeHtml(user.name||'Sem nome')}</option>`).join('')}
function demandAssigneeUid(item){return Object.keys(item?.assignedTo||{})[0]||''}
function firstMentionedUid(text){
  const value=String(text||'');
  return Object.entries(state.users).map(([uid,user])=>{
    const name=String(user?.name||'').trim();
    if(!name)return null;
    const match=value.match(new RegExp(`(^|\\s)@${escapeRegExp(name)}(?=$|[\\s.,!?;:)])`,'iu'));
    return match?{uid,index:match.index+match[1].length}:null;
  }).filter(Boolean).sort((a,b)=>a.index-b.index)[0]?.uid||'';
}
function syncDemandAssigneeFromMention(){
  const input=document.getElementById('demanda-add-input'),select=document.getElementById('demanda-add-assignee');
  if(!input||!select)return;
  const first=firstMentionedUid(input.value);
  if(demandAssigneeAutoUid&&select.value===demandAssigneeAutoUid){
    select.value=first;
    demandAssigneeAutoUid=first;
  }else if(!select.value&&first){
    select.value=first;
    demandAssigneeAutoUid=first;
  }
}
function demandToday(){const now=new Date();return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`}
function demandWeekRange(){
  const now=new Date(),day=(now.getDay()+6)%7;
  const monday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-day);
  const sunday=new Date(monday.getFullYear(),monday.getMonth(),monday.getDate()+6);
  const fmt=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return {start:fmt(monday),end:fmt(sunday)};
}
function demandDueThisWeek(d){const {start,end}=demandWeekRange();return !!d.dueDate&&d.dueDate>=start&&d.dueDate<=end}
function demandCompletedThisWeek(d){
  const ts=Number(d?.doneAt||d?.archivedAt||0);
  if(!ts)return false;
  const date=new Date(ts),day=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const {start,end}=demandWeekRange();
  return day>=start&&day<=end;
}
function isDemandInHistory(d){return !!d.archived||((!!d.done||itemStatus(d)==='done')&&!demandCompletedThisWeek(d))}
function demandHistoryGroupKey(d){
  const archivedAt=Number(d.archiveBatch||d.archivedAt||0);
  if(archivedAt)return String(archivedAt);
  const completedAt=Number(d.doneAt||0);
  if(!completedAt)return '0';
  const date=new Date(completedAt);date.setHours(0,0,0,0);
  return String(date.getTime());
}
const DEMAND_WIP_LIMIT_KEY='plantel_demand_wip_limit';
function getDemandWipLimit(){const n=Number(localStorage.getItem(DEMAND_WIP_LIMIT_KEY));return Number.isInteger(n)&&n>0?n:0}
document.addEventListener('change',e=>{
  if(e.target?.id!=='demand-wip-limit')return;
  const n=Number(e.target.value);
  if(Number.isInteger(n)&&n>0)localStorage.setItem(DEMAND_WIP_LIMIT_KEY,String(n));
  else localStorage.removeItem(DEMAND_WIP_LIMIT_KEY);
  render();
});
function demandDetailsHtml(item){
  const priority=DEMAND_PRIORITIES[item.priority]||DEMAND_PRIORITIES.medium,assignee=demandAssigneeUid(item),due=item.dueDate||'',overdue=!!due&&!item.done&&due<demandToday();
  const dueText=due?new Date(`${due}T12:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}):'';
  return `<div class="demand-badges"><span class="demand-badge ${priority[1]}">${priority[0]}</span>${due?`<span class="demand-badge ${overdue?'overdue':''}">${overdue?'Atrasada':'Prazo'} · ${dueText}</span>`:''}${assignee?`<span class="demand-badge">Responsável · ${escapeHtml(state.users[assignee]?.name||'Usuário')}</span>`:`<span class="demand-badge unassigned">Sem responsável</span>`}${item.blocked?'<span class="demand-badge blocked">Bloqueada</span>':''}</div>${item.blocked?`<div class="demand-block-reason"><strong>Motivo do bloqueio:</strong> ${escapeHtml(item.blockReason||'Motivo não informado')}</div>`:''}`;
}
function demandEditFieldsHtml(item){const priority=item.priority||'medium',assignee=demandAssigneeUid(item);return `<div class="demand-edit-fields"><select class="field" data-edit-priority><option value="low" ${priority==='low'?'selected':''}>Baixa</option><option value="medium" ${priority==='medium'?'selected':''}>Média</option><option value="high" ${priority==='high'?'selected':''}>Alta</option><option value="urgent" ${priority==='urgent'?'selected':''}>Urgente</option></select><input class="field" data-edit-due type="date" value="${escapeHtml(item.dueDate||'')}"><select class="field" data-edit-assignee><option value="">Sem responsável</option>${demandUserOptions(assignee)}</select></div>`}

function initials(name){
  return (name||'?').trim().split(/\s+/).map(p=>p[0]).slice(0,2).join('').toUpperCase() || '?';
}
function timeAgo(ts){
  const diff = Math.floor((Date.now()-ts)/1000);
  if(diff < 60) return 'agora';
  if(diff < 3600) return Math.floor(diff/60)+' min';
  if(diff < 86400) return Math.floor(diff/3600)+'h';
  return Math.floor(diff/86400)+'d';
}
function formatFullDate(ts){
  if(!ts) return '';
  const d = new Date(ts);
  const dia = String(d.getDate()).padStart(2,'0');
  const mes = String(d.getMonth()+1).padStart(2,'0');
  const ano = d.getFullYear();
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  return `${dia}/${mes}/${ano} às ${hh}:${mm}`;
}
const POST_TEXT_LIMIT = 320;
function escapeRegExp(value){ return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function renderTextWithMentions(text, p, searchTerm){
  const mentionEntries = Object.keys((p && p.mentions) || {}).map(uid=>({ uid, name:(state.users[uid] || {}).name })).filter(x=>x.name).sort((a,b)=>b.name.length-a.name.length);
  const hasAllMention = /(^|\s)@all(?=\s|$|[.,!?])/i.test(text);
  if(!mentionEntries.length && !hasAllMention) return highlightSearch(text, searchTerm);
  const byName = new Map(mentionEntries.map(x=>[x.name.toLocaleLowerCase('pt-BR'), x]));
  const mentionNames = [...mentionEntries.map(x=>x.name), ...(hasAllMention ? ['all'] : [])];
  const regex = new RegExp('@(' + mentionNames.map(escapeRegExp).join('|') + ')', 'gi');
  let html = '', cursor = 0, match;
  while((match = regex.exec(text))){
    html += highlightSearch(text.slice(cursor, match.index), searchTerm);
    const matchedName = match[1].toLocaleLowerCase('pt-BR');
    const person = byName.get(matchedName);
    html += matchedName === 'all'
      ? `<span class="post-mention" title="Todos foram mencionados">${escapeHtml(match[0])}</span>`
      : `<span class="post-mention" data-action="view-profile" data-uid="${person.uid}" data-name="${escapeHtml(person.name)}" style="cursor:pointer;">${escapeHtml(match[0])}</span>`;
    cursor = match.index + match[0].length;
  }
  return html + highlightSearch(text.slice(cursor), searchTerm);
}
function renderMarkdownInline(text, p, searchTerm){
  let html = renderTextWithMentions(text, p, searchTerm);
  const codes = [];
  html = html.replace(/\x60([^\x60\n]+)\x60/g, (_,value)=>{
    const token = '@@INLINECODE'+codes.length+'@@';
    codes.push('<code>'+value+'</code>');
    return token;
  });
  html = html.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/gi, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  html = html.replace(/\*\*([^\n*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^\n_]+)__/g, '<strong>$1</strong>');
  html = html.replace(/~~([^\n~]+)~~/g, '<del>$1</del>');
  html = html.replace(/(^|[^*])\*([^\n*]+)\*(?!\*)/g, '$1<em>$2</em>');
  codes.forEach((value,index)=>{ html = html.replace('@@INLINECODE'+index+'@@', value); });
  return html;
}
function normalizeLegacyAiFormatting(text){
  let value = String(text || '').replace(/\r\n?/g,'\n');
  // Conte�dos antigos eram colados em inputs de uma linha. Recupera listas
  // numeradas e marcadores que ficaram grudados no meio do par�grafo.
  value = value.replace(/([^\n])\s+(?=\d{1,2}[.)]\s+[A-Za-z������])/g, '$1\n');
  value = value.replace(/([^\n])\s+(?=[�?�]\s+)/g, '$1\n');
  value = value.replace(/([^\n])\s+(?=\d{1,2}[.)]\s+\p{L})/gu, '$1\n');
  value = value.replace(/([^\n])\s+(?=[\u2022\u2023\u25E6\u2043\u2219]\s+)/g, '$1\n');
  value = value.replace(/^[\u2022\u2023\u25E6\u2043\u2219]\s+/gm, '- ');
  return value;
}
function renderMarkdown(text, p, searchTerm){
  const lines = normalizeLegacyAiFormatting(text).split('\n');
  let html = '', listType = '';
  const closeList = ()=>{ if(listType){ html += '</'+listType+'>'; listType = ''; } };
  for(let i=0;i<lines.length;i++){
    const line = lines[i];
    if(/^\x60{3}/.test(line)){
      closeList();
      const code = [];
      while(++i < lines.length && !/^\x60{3}/.test(lines[i])) code.push(lines[i]);
      html += '<pre><code>'+escapeHtml(code.join('\n'))+'</code></pre>';
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if(heading){ closeList(); const level=heading[1].length; html += '<h'+level+'>'+renderMarkdownInline(heading[2],p,searchTerm)+'</h'+level+'>'; continue; }
    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if(bullet || numbered){
      const type = bullet ? 'ul' : 'ol';
      if(listType !== type){ closeList(); listType=type; html+='<'+type+'>'; }
      html += '<li>'+renderMarkdownInline((bullet||numbered)[1],p,searchTerm)+'</li>';
      continue;
    }
    closeList();
    const quote = line.match(/^>\s?(.*)$/);
    if(quote){ html += '<blockquote>'+renderMarkdownInline(quote[1],p,searchTerm)+'</blockquote>'; continue; }
    html += line.trim() ? '<p>'+renderMarkdownInline(line,p,searchTerm)+'</p>' : '<br>';
  }
  closeList();
  return html;
}
function renderPostText(p, searchTerm = ''){
  const editedTag = p.editedAt ? ' <span class="post-edited-tag">(editado)</span>' : '';
  const isLong = p.text.length > POST_TEXT_LIMIT;
  const isExpanded = expandedPosts.has(p.id) || !!searchTerm;
  if(!isLong){
    return `<div class="post-text">${renderMarkdown(p.text, p, searchTerm)}${editedTag}</div>`;
  }
  if(isExpanded){
    return `<div class="post-text">${renderMarkdown(p.text, p, searchTerm)}${editedTag}${searchTerm ? '' : ` <span class="read-more-toggle" data-action="toggle-expand-post" data-id="${p.id}">ler menos</span>`}</div>`;
  }
  const truncated = p.text.slice(0, POST_TEXT_LIMIT).trimEnd();
  return `<div class="post-text">${renderMarkdown(truncated, p, '')}… <span class="read-more-toggle" data-action="toggle-expand-post" data-id="${p.id}">ler mais</span>${editedTag}</div>`;
}
function renderPostPoll(p){
  if(!p.poll || !p.poll.options) return '';
  const options = Array.isArray(p.poll.options) ? p.poll.options.filter(Boolean) : Object.values(p.poll.options);
  const votes = p.poll.votes || {};
  const voteValues = Object.values(votes);
  const total = voteValues.length;
  const myVote = currentUid ? votes[currentUid] : null;
  return `<div class="post-poll">${options.map(option=>{
    const count = voteValues.filter(value=>value === option.id).length;
    const percent = total ? Math.round((count / total) * 100) : 0;
    return `<button class="poll-choice ${myVote===option.id?'is-selected':''}" type="button" data-action="vote-poll" data-id="${p.id}" data-option="${escapeHtml(option.id)}" style="--poll-percent:${percent}%">
      <span class="poll-choice-fill"></span>
      <span class="poll-choice-content"><span class="poll-choice-label">${myVote===option.id?'✓ ':''}${escapeHtml(option.label)}</span><span class="poll-choice-result">${percent}% · ${count}</span></span>
    </button>`;
  }).join('')}<div class="poll-total">${total} ${total===1?'voto':'votos'}${myVote ? ' · você já votou' : ''}</div></div>`;
}
function renderPostViews(p){
  return Object.entries(p.views || {}).sort((a,b)=>b[1]-a[1]).map(([viewerUid, viewedAt])=>{
    const profile = state.users[viewerUid] || {};
    const info = { uid:viewerUid, name:profile.name || 'Alguém', photo:profile.photo || null };
    return `<div class="post-view-row">${avatarHtml(info, true)}<span class="post-view-name">${escapeHtml(info.name)}</span><time class="post-view-time" title="${escapeHtml(formatFullDate(viewedAt))}">${escapeHtml(formatFullDate(viewedAt))}</time></div>`;
  }).join('') || '<div class="empty-small">Ninguém visualizou ainda.</div>';
}
function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function renderAudioPlayer(audio,className=''){
  const src=String(audio?.data || '');
  if(!/^data:audio\/(?:webm|ogg|mp4|mpeg|wav|x-m4a);base64,/i.test(src)) return '';
  const duration=Number(audio?.duration || 0);
  const label=duration ? `Mensagem de áudio, ${duration} segundos` : 'Mensagem de áudio';
  return `<div class="${escapeHtml(className)}"><audio controls preload="metadata" aria-label="${escapeHtml(label)}" src="${escapeHtml(src)}"></audio></div>`;
}
function highlightSearch(value, searchTerm){
  const text = String(value ?? '');
  const term = String(searchTerm ?? '').trim();
  if(!term) return escapeHtml(text);
  const lowerText = text.toLocaleLowerCase('pt-BR');
  const lowerTerm = term.toLocaleLowerCase('pt-BR');
  let html = '';
  let cursor = 0;
  let matchIndex;
  while((matchIndex = lowerText.indexOf(lowerTerm, cursor)) !== -1){
    html += escapeHtml(text.slice(cursor, matchIndex));
    html += `<mark class="search-highlight">${escapeHtml(text.slice(matchIndex, matchIndex + term.length))}</mark>`;
    cursor = matchIndex + term.length;
  }
  return html + escapeHtml(text.slice(cursor));
}
function authorInfo(item){
  const uid = item && item.uid ? item.uid : null;
  const profile = uid ? state.users[uid] : null;
  return {
    uid,
    name: (profile && profile.name) || (item && item.author) || 'Alguém',
    sector: userSectors(profile),
    bio: profile && profile.bio ? profile.bio : null,
    photo: profile && profile.photo ? profile.photo : null,
    isAdmin: !!(profile && profile.isAdmin),
    isSupport: !!(profile && profile.isSupport),
    isDev: !!(profile && profile.isDev)
  };
}
function avatarHtml(info, sm){
  const cls = sm ? 'avatar avatar-sm' : 'avatar';
  const clickable = ` data-action="view-profile" data-uid="${info.uid || ''}" data-name="${escapeHtml(info.name)}" style="cursor:pointer;"`;
  return info.photo
    ? `<div class="${cls}"${clickable}><img src="${info.photo}" alt=""></div>`
    : `<div class="${cls}"${clickable}>${initials(info.name)}</div>`;
}
function authorNameAttr(info){
  return ` data-action="view-profile" data-uid="${info.uid || ''}" data-name="${escapeHtml(info.name)}" style="cursor:pointer;"`;
}
function updateProfileBtnAvatar(){
  const mine = (currentUid && state.users[currentUid]) || null;
  const labsMember = !!(mine && mine.isDev);
  const labsMode = labsMember && localStorage.getItem('plantel_labs_ui_'+currentUid) !== 'off';
  if(labsMember) document.documentElement.setAttribute('data-labs-member', 'true');
  else document.documentElement.removeAttribute('data-labs-member');
  if(labsMode) document.documentElement.setAttribute('data-labs', 'true');
  else document.documentElement.removeAttribute('data-labs');
  const labsModeBtn = document.getElementById('labs-mode-label');
  if(labsModeBtn) labsModeBtn.textContent = labsMode ? 'Labs mode · sair' : 'Ativar Labs mode';
  const brandSubtitle = document.getElementById('brand-subtitle');
  if(brandSubtitle){
    brandSubtitle.textContent = labsMode
      ? 'Ambiente de criação e desenvolvimento do Plantel Labs'
      : 'Mural da equipe — poste, transforme em meta ou demanda';
  }
  document.title = labsMode ? 'Plantel Labs · Hub' : 'Plantel Hub';
  if(mine && mine.photo){
    profileBtn.innerHTML = `<img src="${mine.photo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
  } else {
    profileBtn.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6"/></svg>`;
  }
}
document.getElementById('labs-mode-label').addEventListener('click', ()=>{
  const mine = (currentUid && state.users[currentUid]) || null;
  if(!mine || !mine.isDev) return;
  const active = document.documentElement.getAttribute('data-labs') === 'true';
  localStorage.setItem('plantel_labs_ui_'+currentUid, active ? 'off' : 'on');
  updateProfileBtnAvatar();
  renderOnlineList();
});
function userSectors(profile){
  if(!profile) return [];
  if(profile.sectors && typeof profile.sectors === 'object') return Object.keys(profile.sectors).filter(k=>profile.sectors[k]);
  if(profile.sector) return [profile.sector];
  return [];
}
function sectorTagHtml(sectors, max){
  const arr = Array.isArray(sectors) ? sectors : (sectors ? [sectors] : []);
  if(max && arr.length > max){
    const shown = arr.slice(0, max);
    const rest = arr.length - max;
    return shown.map(s=>`<span class="sector-tag">${escapeHtml(s)}</span>`).join('')
      + `<span class="sector-tag-more" title="${escapeHtml(arr.slice(max).join(', '))}">+${rest}</span>`;
  }
  return arr.map(s=>`<span class="sector-tag">${escapeHtml(s)}</span>`).join('');
}
function adminTagHtml(flag){
  return flag ? `<span class="admin-tag" title="Admin: pode moderar e apagar conteúdo de qualquer setor">🛡 admin</span>` : '';
}
function supportTagHtml(flag){
  return flag ? `<span class="support-tag" title="Fala com essa pessoa se precisar de ajuda com o Plantel Hub">💬 suporte</span>` : '';
}
function devTagHtml(flag){
  return flag ? `<span class="dev-tag" title="Faz parte do Plantel Labs, o time que desenvolve o Plantel Hub">🛠 plantel labs</span>` : '';
}
function compactPostRoleHtml(info){
  const roles = [];
  if(info.isDev) roles.push('Plantel Labs');
  if(info.isAdmin) roles.push('Admin');
  if(info.isSupport) roles.push('Suporte');
  if(!roles.length && info.sector && info.sector.length) roles.push(info.sector[0]);
  if(!roles.length) return '';
  const extra = roles.length - 1;
  return `<span class="post-role-compact" title="${escapeHtml(roles.join(' · '))}">${escapeHtml(roles[0])}${extra ? ` +${extra}` : ''}</span>`;
}
function bannedTagHtml(flag){
  return flag ? `<span class="banned-tag" title="Essa conta foi banida e não consegue mais entrar">🚫 banido</span>` : '';
}
function visibilityTagHtml(sector){
  return sector ? `<span class="visibility-tag" title="Visível só pro setor ${escapeHtml(sector)}">🔒 ${escapeHtml(sector)}</span>` : '';
}
function privacyIconHtml(sector){
  return sector ? `<span class="privacy-icon" title="Visível só pro setor ${escapeHtml(sector)}"><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></span>` : '';
}
function setupPostViewTracking(){
  if(postViewObserver) postViewObserver.disconnect();
  if(!currentUid || !('IntersectionObserver' in window)) return;
  postViewObserver = new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting || entry.intersectionRatio < .5) return;
      const post = allPosts().find(p=>p.id === entry.target.dataset.postId);
      const viewKey = post ? `${currentUid}:${postPath(post)}` : '';
      if(!post || post.uid === currentUid || (post.views && post.views[currentUid]) || trackedPostViews.has(viewKey)){
        postViewObserver.unobserve(entry.target);
        return;
      }
      postViewObserver.unobserve(entry.target);
      trackedPostViews.add(viewKey);
      update(ref(db, postPath(post)+'/views'), { [currentUid]: Date.now() }).catch(()=> trackedPostViews.delete(viewKey));
    });
  }, { threshold:[.5] });
  document.querySelectorAll('#mural-list .post[data-post-id]').forEach(el=>postViewObserver.observe(el));
}

function renderReplyTree(replyObject, post, commentId, basePath=''){
  const replies = objToArray(replyObject).sort((a,b)=>a.ts-b.ts);
  if(!replies.length) return '';
  return `<div class="reply-list">${replies.map(r=>{
    const nodePath = basePath ? `${basePath}/replies/${r.id}` : `replies/${r.id}`;
    const threadKey = `${commentId}:${nodePath}`;
    const rInfo = authorInfo(r);
    const likes = r.likes || {};
    const likeCount = Object.keys(likes).length;
    const liked = !!(currentUid && likes[currentUid]);
    const replyOpen = openReplies.has(threadKey);
    const childCount = Object.keys(r.replies || {}).length;
    const isTopLevel = !basePath;
    const isEditingReply = isTopLevel && editingReplies.has(r.id);
    return `<div class="reply ${newMuralReplies.has(r.id)?'mural-enter':''}" data-reply-id="${r.id}">
      ${avatarHtml(rInfo,true)}
      <div class="reply-body">
        <div class="reply-author"><span${authorNameAttr(rInfo)}>${escapeHtml(rInfo.name)}</span>${sectorTagHtml(rInfo.sector,2)}${adminTagHtml(rInfo.isAdmin)}${supportTagHtml(rInfo.isSupport)}${devTagHtml(rInfo.isDev)} <span class="post-time" title="${formatFullDate(r.ts)}">· ${timeAgo(r.ts)} · ${formatFullDate(r.ts)}</span></div>
        ${isEditingReply ? `<div class="comment-edit-form"><textarea class="field" rows="3" data-reply-edit="${r.id}">${escapeHtml(r.text)}</textarea><button class="btn btn-primary" data-action="save-reply-edit" data-post="${post.id}" data-comment="${commentId}" data-id="${r.id}">Salvar</button><button class="btn-ghost" data-action="cancel-reply-edit" data-id="${r.id}">Cancelar</button></div>` : `<div class="reply-text">${renderMarkdown(r.text,r,'')}${r.editedAt?' <span class="post-edited-tag">(editado)</span>':''}</div>`}
        <div class="comment-actions">
          <button class="comment-like ${liked?'is-liked':''}" data-action="like-thread-reply" data-post="${post.id}" data-comment="${commentId}" data-path="${nodePath}" data-id="${r.id}"><svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-10-9.3C.5 8 2 4 6 4c2.2 0 3.7 1.2 6 3.6C14.3 5.2 15.8 4 18 4c4 0 5.5 4 4 7.7C19.5 16.4 12 21 12 21z"/></svg>${likeCount||'curtir'}</button>
          <button class="comment-reply-btn" data-action="toggle-thread-reply" data-key="${threadKey}" data-id="${r.id}">${replyOpen?'fechar':'responder'}${childCount?` (${childCount})`:''}</button>
          ${isTopLevel && canManageUserContent(r) ? `<button class="comment-reply-btn" data-action="edit-reply" data-post="${post.id}" data-comment="${commentId}" data-id="${r.id}">editar</button><button class="comment-remove" data-action="remove-reply" data-post="${post.id}" data-comment="${commentId}" data-id="${r.id}">excluir</button>` : ''}
        </div>
        ${renderReplyTree(r.replies,post,commentId,nodePath)}
        ${replyOpen ? `<div class="reply-form"><textarea class="field" rows="2" placeholder="Escreva uma resposta..." data-thread-reply-input="${threadKey}"></textarea><button class="btn-ghost" data-action="send-thread-reply" data-post="${post.id}" data-comment="${commentId}" data-path="${nodePath}" data-key="${threadKey}" data-id="${r.id}">enviar</button></div>` : ''}
      </div>
    </div>`;
  }).join('')}</div>`;
}

// Agrupa várias chamadas de render() que cheguem no mesmo instante (ex: várias
// "visualizações" de posts sendo gravadas enquanto alguém rola o mural) em um
// único redesenho por frame, em vez de reconstruir a lista inteira repetidas
// vezes em sequência — o que era a causa de comentários e o menu "..." falharem
// no meio do clique/digitação.
let renderDebounceTimer = null;
let renderDeferredByEditor = false;
function scheduleRender(){
  if(renderDebounceTimer) clearTimeout(renderDebounceTimer);
  renderDebounceTimer = setTimeout(()=>{
    renderDebounceTimer = null;
    // N�o substitui o bot�o enquanto o ponteiro est� sobre ele. Isso evita
    // o "pisca-pisca" causado por atualiza��es de views/posts em tempo real.
    const activeMuralField = document.activeElement?.matches?.('[data-comment-input],[data-reply-input],[data-thread-reply-input],[data-comment-edit],[data-reply-edit]');
    if(activeMuralField){
      renderDeferredByEditor = true;
      return;
    }
    if(document.querySelector('.post-comment-toggle:hover')){
      scheduleRender();
      return;
    }
    render();
  }, 200);
}
document.addEventListener('focusout', event=>{
  if(!renderDeferredByEditor || !event.target.matches?.('[data-comment-input],[data-reply-input],[data-thread-reply-input],[data-comment-edit],[data-reply-edit]')) return;
  renderDeferredByEditor = false;
  scheduleRender();
});

function render(){
  updateProfileBtnAvatar();
  renderMentionNotifications();
  renderTodayPanel();
  renderMySpace();
  const clearMuralBtn = document.getElementById('clear-mural-btn');
  clearMuralBtn.classList.toggle('hidden', !isAdmin());

  // Preserva foco e posição do cursor de quem está digitando um comentário/resposta
  // no mural quando o redesenho é disparado por uma atualização em tempo real
  // (like, view, comentário de outra pessoa etc). Sem isso, o campo de texto era
  // destruído e recriado a cada atualização, tirando o foco/teclado no meio da digitação.
  const muralListEl = document.getElementById('mural-list');
  let muralFocusRestore = null;
  const activeEl = document.activeElement;
  if(activeEl && muralListEl && muralListEl.contains(activeEl)){
    let selector = null;
    if(activeEl.matches && activeEl.matches('[data-comment-input]')) selector = `[data-comment-input="${activeEl.dataset.commentInput}"]`;
    else if(activeEl.matches && activeEl.matches('[data-reply-input]')) selector = `[data-reply-input="${activeEl.dataset.replyInput}"]`;
    else if(activeEl.matches && activeEl.matches('[data-thread-reply-input]')) selector = `[data-thread-reply-input="${activeEl.dataset.threadReplyInput}"]`;
    else if(activeEl.matches && activeEl.matches('[data-comment-edit]')) selector = `[data-comment-edit="${activeEl.dataset.commentEdit}"]`;
    else if(activeEl.matches && activeEl.matches('[data-reply-edit]')) selector = `[data-reply-edit="${activeEl.dataset.replyEdit}"]`;
    if(selector){
      muralFocusRestore = { selector, value:activeEl.value, start: activeEl.selectionStart, end: activeEl.selectionEnd };
    }
  }

  const allPostsList = allPosts();
  let posts = [...allPostsList].sort((a,b)=> (b.pinned?1:0) - (a.pinned?1:0) || b.ts-a.ts);
  const search = muralSearch;
  const sectorFilter = muralSectorFilter;
  if(search){
    posts = posts.filter(p => String(p.text || '').toLowerCase().includes(search) || authorInfo(p).name.toLowerCase().includes(search));
  }
  if(sectorFilter){
    posts = posts.filter(p => authorInfo(p).sector.includes(sectorFilter) || p._sector === sectorFilter);
  }
  document.getElementById('post-count').textContent = allPostsList.length + (allPostsList.length===1?' mensagem':' mensagens');
  document.getElementById('mural-list').innerHTML = posts.length ? posts.map(p=>{
    const likes = p.likes || {};
    const likeCount = Object.keys(likes).length;
    const liked = !!(currentUid && likes[currentUid]);
    const comments = objToArray(p.comments).sort((a,b)=>a.ts-b.ts);
    const commentsOpen = openComments.has(p.id) || closingComments.has(p.id);
    const pInfo = authorInfo(p);
    const isEditing = editingPosts.has(p.id);
    const viewCount = Object.keys(p.views || {}).length;
    return `
    <div class="post ${p.pinned ? 'is-pinned ' : ''}${newMuralPosts.has(p.id) ? 'mural-enter' : ''}" data-post-id="${p.id}">
      ${p.pinned ? `
      <div class="pinned-banner">
        <svg viewBox="0 0 24 24"><path d="M12 2l2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5L12 2z"/></svg>
        Extremamente importante
      </div>` : ''}
      <div class="post-head">
        ${avatarHtml(pInfo)}
        <div>
          <div class="post-author"><span class="post-author-main"><span${authorNameAttr(pInfo)}>${highlightSearch(pInfo.name, search)}</span>${compactPostRoleHtml(pInfo)}${privacyIconHtml(p._sector)}</span> <span class="post-time" title="${formatFullDate(p.ts)}">· ${timeAgo(p.ts)}</span></div>
        </div>
      </div>
      ${isEditing ? `
      <div class="post-edit-form">
        <textarea id="edit-post-textarea-${p.id}">${escapeHtml(p.text)}</textarea>
        <div class="post-edit-actions">
          <button class="btn btn-primary" data-action="save-post-edit" data-id="${p.id}">Salvar</button>
          <button class="btn-ghost" data-action="cancel-post-edit" data-id="${p.id}">Cancelar</button>
        </div>
      </div>` : `
      ${p.text ? renderPostText(p, search) : ''}
      ${renderPostPoll(p)}
      <div class="post-actions">
        <button class="btn-ghost post-like ${liked?'is-liked':''}" data-action="like-post" data-id="${p.id}">
          <svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-10-9.3C.5 8 2 4 6 4c2.2 0 3.7 1.2 6 3.6C14.3 5.2 15.8 4 18 4c4 0 5.5 4 4 7.7C19.5 16.4 12 21 12 21z"/></svg>
          ${likeCount>0?likeCount:'curtir'}
        </button>
        <button class="btn-ghost post-comment-toggle ${closingComments.has(p.id) ? 'is-closing' : ''}" data-action="toggle-comments" data-id="${p.id}">${openComments.has(p.id) || closingComments.has(p.id)?'fechar':'comentar'}${comments.length?` (${comments.length})`:''}</button>
        ${(p.uid === currentUid || isAdmin()) ? `<button class="btn-ghost" data-action="toggle-post-views" data-id="${p.id}">${viewCount} ${viewCount===1?'visualização':'visualizações'}</button>` : ''}
        <details class="post-more" data-post-menu="${p.id}" ${openPostMenus.has(p.id) ? 'open' : ''}>
          <summary aria-label="Mais ações">•••</summary>
          <div class="post-more-menu">
            ${p.metaId ? `<button class="btn-ghost" data-action="undo-meta" data-id="${p.id}">Desfazer meta</button>` : `<button class="btn-ghost" data-action="to-meta" data-id="${p.id}">Virar meta</button>`}
            ${p.demandaId ? (allDemandas().find(x=>x.id===p.demandaId)?.deletedAt ? `<span class="item-completed-label" title="A demanda relacionada está na lixeira">Demanda na lixeira</span>` : (allDemandas().find(x=>x.id===p.demandaId)?.done ? `<span class="item-completed-label" title="Demandas concluídas ficam guardadas em Demandas > Post-its">Demanda concluída ✓</span>` : `<button class="btn-ghost" data-action="undo-demanda" data-id="${p.id}">Desfazer demanda</button>`)) : `<button class="btn-ghost" data-action="to-demanda" data-id="${p.id}">Virar demanda</button>`}
            <button class="btn-ghost pin-toggle ${p.pinned?'is-pinned':''}" data-action="toggle-pin" data-id="${p.id}">${p.pinned ? 'Desafixar' : 'Fixar'}</button>
            ${p.uid === currentUid ? `<button class="btn-ghost" data-action="edit-post" data-id="${p.id}">Editar</button>` : ''}
            ${(p.uid === currentUid || isAdmin()) ? `<button class="btn-ghost post-remove" data-action="remove-post" data-id="${p.id}">Excluir</button>` : ''}
          </div>
        </details>
      </div>`}
      ${openPostViews.has(p.id) && (p.uid === currentUid || isAdmin()) ? `<div class="post-views-panel">${renderPostViews(p)}</div>` : ''}
      ${commentsOpen ? `
      <div class="post-comments ${openComments.has(p.id) ? 'open' : 'closing'}">
        ${comments.length ? comments.map(c=>{
          const cLikes = c.likes || {};
          const cLikeCount = Object.keys(cLikes).length;
          const cLiked = !!(currentUid && cLikes[currentUid]);
          const replies = objToArray(c.replies).sort((a,b)=>a.ts-b.ts);
          const replyOpen = openReplies.has(c.id);
          const isEditingComment = editingComments.has(c.id);
          const cInfo = authorInfo(c);
          return `
          <div class="comment ${newMuralComments.has(c.id) ? 'mural-enter' : ''}" data-comment-id="${c.id}">
            ${avatarHtml(cInfo, true)}
            <div class="comment-body">
              <div class="comment-author"><span${authorNameAttr(cInfo)}>${escapeHtml(cInfo.name)}</span>${sectorTagHtml(cInfo.sector, 2)}${adminTagHtml(cInfo.isAdmin)}${supportTagHtml(cInfo.isSupport)}${devTagHtml(cInfo.isDev)} <span class="post-time" title="${formatFullDate(c.ts)}">· ${timeAgo(c.ts)} · ${formatFullDate(c.ts)}</span></div>
              ${isEditingComment ? `<div class="comment-edit-form"><textarea class="field" rows="3" data-comment-edit="${c.id}">${escapeHtml(c.text)}</textarea><button class="btn btn-primary" data-action="save-comment-edit" data-post="${p.id}" data-id="${c.id}">Salvar</button><button class="btn-ghost" data-action="cancel-comment-edit" data-post="${p.id}" data-id="${c.id}">Cancelar</button></div>` : `<div class="comment-text">${renderMarkdown(c.text, c, '')}${c.editedAt?' <span class="post-edited-tag">(editado)</span>':''}</div>`}
              <div class="comment-actions">
                <button class="comment-like ${cLiked?'is-liked':''}" data-action="like-comment" data-post="${p.id}" data-id="${c.id}">
                  <svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-10-9.3C.5 8 2 4 6 4c2.2 0 3.7 1.2 6 3.6C14.3 5.2 15.8 4 18 4c4 0 5.5 4 4 7.7C19.5 16.4 12 21 12 21z"/></svg>
                  ${cLikeCount>0?cLikeCount:'curtir'}
                </button>
                <button class="comment-reply-btn" data-action="toggle-reply" data-post="${p.id}" data-id="${c.id}">${replyOpen?'fechar':'responder'}${replies.length?` (${replies.length})`:''}</button>
                ${canManageUserContent(c) ? `<button class="comment-reply-btn" data-action="edit-comment" data-post="${p.id}" data-id="${c.id}">editar</button><button class="comment-remove" data-action="remove-comment" data-post="${p.id}" data-id="${c.id}">excluir</button>` : ''}
              </div>
              ${replies.length ? `
              <div class="reply-list">
                ${replies.map(r=>{
                  const rInfo = authorInfo(r);
                  const isEditingReply = editingReplies.has(r.id);
                  return `
                  <div class="reply ${newMuralReplies.has(r.id) ? 'mural-enter' : ''}" data-reply-id="${r.id}">
                    ${avatarHtml(rInfo, true)}
                    <div class="reply-body">
                      <div class="reply-author"><span${authorNameAttr(rInfo)}>${escapeHtml(rInfo.name)}</span>${sectorTagHtml(rInfo.sector, 2)}${adminTagHtml(rInfo.isAdmin)}${supportTagHtml(rInfo.isSupport)}${devTagHtml(rInfo.isDev)} <span class="post-time" title="${formatFullDate(r.ts)}">· ${timeAgo(r.ts)} · ${formatFullDate(r.ts)}</span></div>
                      ${isEditingReply ? `<div class="comment-edit-form"><textarea class="field" rows="3" data-reply-edit="${r.id}">${escapeHtml(r.text)}</textarea><button class="btn btn-primary" data-action="save-reply-edit" data-post="${p.id}" data-comment="${c.id}" data-id="${r.id}">Salvar</button><button class="btn-ghost" data-action="cancel-reply-edit" data-id="${r.id}">Cancelar</button></div>` : `<div class="reply-text">${renderMarkdown(r.text, r, '')}${r.editedAt?' <span class="post-edited-tag">(editado)</span>':''}</div>`}
                      <div class="comment-actions"><button class="comment-like ${currentUid&&r.likes?.[currentUid]?'is-liked':''}" data-action="like-thread-reply" data-post="${p.id}" data-comment="${c.id}" data-path="replies/${r.id}" data-id="${r.id}"><svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-10-9.3C.5 8 2 4 6 4c2.2 0 3.7 1.2 6 3.6C14.3 5.2 15.8 4 18 4c4 0 5.5 4 4 7.7C19.5 16.4 12 21 12 21z"/></svg>${Object.keys(r.likes||{}).length||'curtir'}</button><button class="comment-reply-btn" data-action="toggle-thread-reply" data-key="${c.id}:replies/${r.id}" data-id="${r.id}">${openReplies.has(`${c.id}:replies/${r.id}`)?'fechar':'responder'}${Object.keys(r.replies||{}).length?` (${Object.keys(r.replies||{}).length})`:''}</button></div>
                      ${canManageUserContent(r) ? `<div class="comment-actions"><button class="comment-reply-btn" data-action="edit-reply" data-post="${p.id}" data-comment="${c.id}" data-id="${r.id}">editar</button><button class="comment-remove" data-action="remove-reply" data-post="${p.id}" data-comment="${c.id}" data-id="${r.id}">excluir</button></div>` : ''}
                      ${renderReplyTree(r.replies,p,c.id,`replies/${r.id}`)}
                      ${openReplies.has(`${c.id}:replies/${r.id}`)?`<div class="reply-form"><textarea class="field" rows="2" placeholder="Escreva uma resposta..." data-thread-reply-input="${c.id}:replies/${r.id}"></textarea><button class="btn-ghost" data-action="send-thread-reply" data-post="${p.id}" data-comment="${c.id}" data-path="replies/${r.id}" data-key="${c.id}:replies/${r.id}" data-id="${r.id}">enviar</button></div>`:''}
                    </div>
                  </div>`;}).join('')}
              </div>` : ''}
              ${replyOpen ? `
              <div class="reply-form">
                <textarea class="field" rows="2" placeholder="Escreva uma resposta..." data-reply-input="${c.id}"></textarea>
                <button class="btn-ghost" data-action="send-reply" data-post="${p.id}" data-id="${c.id}">enviar</button>
              </div>` : ''}
            </div>
          </div>`;
        }).join('') : `<div class="empty-small">Nenhum comentário ainda.</div>`}
        <div class="comment-form">
          <textarea class="field" rows="2" placeholder="Escreva um comentário..." data-comment-input="${p.id}"></textarea>
          <button class="btn-ghost" data-action="send-comment" data-id="${p.id}">enviar</button>
        </div>
      </div>` : ''}
    </div>`;
  }).join('') : `<div class="empty">${(search || sectorFilter) ? 'Nenhuma mensagem encontrada com esse filtro.' : 'Nenhuma mensagem ainda. Escreva a primeira ali em cima.'}</div>`;

  setupPostViewTracking();


  if(newMuralPosts.size || newMuralComments.size || newMuralReplies.size || newMuralMetas.size || newMuralDemandas.size){
    setTimeout(()=>{ newMuralPosts.clear(); newMuralComments.clear(); newMuralReplies.clear(); newMuralMetas.clear(); newMuralDemandas.clear(); }, 520);
  }

  const visibleMetas = allMetas();
  const openMetas = visibleMetas.filter(m=>!m.done).length;
  document.getElementById('meta-count').textContent = openMetas + (openMetas===1?' aberta':' abertas');
  const metaDone = visibleMetas.length - openMetas;
  const metaPct = visibleMetas.length ? Math.round((metaDone/visibleMetas.length)*100) : 0;
  document.getElementById('meta-progress-fill').style.width = metaPct + '%';
  document.getElementById('meta-progress-label').textContent = `${metaDone}/${visibleMetas.length} concluídas (${metaPct}%)`;
  document.getElementById('meta-list').innerHTML = visibleMetas.length ? visibleMetas.map(m=>{
    const mInfo = authorInfo(m);
    const canManageMeta = canManageWorkItem(m);
    const isEditingMeta = editingMetas.has(m.id) && canManageMeta;
    return `
    <div class="item ${m.done?'done ':''}${newMuralMetas.has(m.id)?'mural-enter':''}" data-meta-id="${m.id}">
      <div class="check ${m.done?'done':''}" data-action="${canManageMeta?'toggle-meta':''}" data-id="${m.id}" style="${canManageMeta?'':'pointer-events:none;opacity:.5;'}">${CHECK_SVG}</div>
      <div class="item-body">
        ${isEditingMeta ? `<div class="item-edit-form"><input class="field" id="edit-meta-input-${m.id}" value="${escapeHtml(m.text)}" aria-label="Editar meta"><button class="btn btn-primary" data-action="save-meta-edit" data-id="${m.id}">Salvar</button><button class="btn-ghost" data-action="cancel-meta-edit" data-id="${m.id}">Cancelar</button></div>` : `<div class="item-text">${renderTextWithMentions(m.text,m)}${m.editedAt?' <span class="post-edited-tag">(editado)</span>':''}</div>`}
        <div class="item-meta"><span${authorNameAttr(mInfo)}>${escapeHtml(mInfo.name)}</span>${privacyIconHtml(m._sector)} · ${timeAgo(m.ts)}</div>
      </div>
      <button class="item-cal" data-action="cal-meta" data-id="${m.id}" title="Adicionar ao Google Agenda"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg></button>
      ${canManageMeta && !isEditingMeta ? `<button class="item-edit-button" data-action="edit-meta" data-id="${m.id}">editar</button><button class="item-remove" data-action="remove-meta" data-id="${m.id}">remover</button>` : ''}
    </div>`;}).join('') : `<div class="empty">Nenhuma meta ainda.</div>`;

  const visibleDemandas = activeDemandas().filter(d=>!isDemandInHistory(d));
  const archivedDemandas = activeDemandas().filter(isDemandInHistory);
  const openDemandas = visibleDemandas.filter(d=>!d.done).length;
  document.getElementById('demanda-count').textContent = openDemandas + (openDemandas===1?' pendente':' pendentes');
  const weeklyDemandas=activeDemandas().filter(demandDueThisWeek);
  const demandaDone=weeklyDemandas.filter(d=>d.done||itemStatus(d)==='done').length;
  const demandaPct=weeklyDemandas.length?Math.round((demandaDone/weeklyDemandas.length)*100):0;
  document.getElementById('demanda-progress-fill').style.width = demandaPct + '%';
  document.getElementById('demanda-progress-label').textContent = `${demandaDone}/${weeklyDemandas.length} concluídas nesta semana (${demandaPct}%)`;
  const overdueCount=visibleDemandas.filter(d=>!d.done&&d.dueDate&&d.dueDate<demandToday()).length;
  const blockedCount=visibleDemandas.filter(d=>d.blocked&&!d.done).length;
  const statusOptions=demandStatusSelect?.options;
  if(statusOptions){for(const option of statusOptions){if(option.value==='overdue')option.textContent=`Atrasadas (${overdueCount})`;if(option.value==='blocked')option.textContent=`Bloqueadas (${blockedCount})`;}}
  const priorityWeight={urgent:0,high:1,medium:2,low:3};
  const filteredDemandas=visibleDemandas.filter(d=>{
    const assignee=demandAssigneeUid(d),assigneeName=state.users[assignee]?.name||'',haystack=`${d.text||''} ${assigneeName} ${authorInfo(d).name||''}`.toLocaleLowerCase('pt-BR');
    if(demandSearch&&!haystack.includes(demandSearch))return false;
    if(demandPriorityFilter&&(d.priority||'medium')!==demandPriorityFilter)return false;
    if(demandAssigneeFilter&&assignee!==demandAssigneeFilter)return false;
    if(demandStatusFilter==='open'&&d.done)return false;
    if(demandStatusFilter==='done'&&!d.done)return false;
    if(demandStatusFilter==='week'&&!demandDueThisWeek(d))return false;
    if(demandStatusFilter==='mine'&&assignee!==currentUid&&!(d.mentions&&d.mentions[currentUid]))return false;
    if(demandStatusFilter==='unassigned'&&assignee)return false;
    if(demandStatusFilter==='overdue'&&(d.done||!d.dueDate||d.dueDate>=demandToday()))return false;
    if(demandStatusFilter==='blocked'&&(!d.blocked||d.done))return false;
    return true;
  }).sort((a,b)=>(priorityWeight[a.priority||'medium']-priorityWeight[b.priority||'medium'])||((a.dueDate||'9999-99-99').localeCompare(b.dueDate||'9999-99-99'))||((b.ts||0)-(a.ts||0)));
  document.getElementById('demand-filter-count').textContent=`${filteredDemandas.length} de ${visibleDemandas.length}`;
  document.getElementById('demanda-list').innerHTML = filteredDemandas.length ? filteredDemandas.map(d=>{
    const dInfo = authorInfo(d);
    const canManageDemanda = canAllocateDemand(d);
    const canWorkOnDemanda = canAllocateDemand(d);
    const isEditingDemanda = editingDemandas.has(d.id) && canManageDemanda;
    return `
    <div class="item ${d.done?'done ':''}${d.blocked?'is-blocked ':''}${newMuralDemandas.has(d.id)?'mural-enter':''}" data-demanda-id="${d.id}">
      <div class="check ${d.done?'done':''}" data-action="${canWorkOnDemanda?'toggle-demanda':''}" data-id="${d.id}" style="${canWorkOnDemanda?'':'pointer-events:none;opacity:.5;'}">${CHECK_SVG}</div>
      <div class="item-body">
        ${isEditingDemanda ? `<div class="item-edit-form"><input class="field" id="edit-demanda-input-${d.id}" value="${escapeHtml(d.text)}" aria-label="Editar demanda">${demandEditFieldsHtml(d)}<button class="btn btn-primary" data-action="save-demanda-edit" data-id="${d.id}">Salvar</button><button class="btn-ghost" data-action="cancel-demanda-edit" data-id="${d.id}">Cancelar</button></div>` : `<div class="item-text">${renderTextWithMentions(d.text,d)}${d.editedAt?' <span class="post-edited-tag">(editado)</span>':''}</div>${demandDetailsHtml(d)}`}
        <div class="item-meta"><span${authorNameAttr(dInfo)}>${escapeHtml(dInfo.name)}</span>${privacyIconHtml(d._sector)} · ${timeAgo(d.ts)}</div>
      </div>
      ${canManageDemanda && !isEditingDemanda ? `<button class="item-edit-button" data-action="edit-demanda" data-id="${d.id}">editar</button>${d.done?'<span class="item-completed-label">Concluído</span>':''}<button class="item-remove" data-action="remove-demanda" data-id="${d.id}">remover</button>${demandBlockActionsHtml(d)}` : ''}
    </div>`;}).join('') : `<div class="empty">Nenhuma demanda encontrada com esses filtros.</div>`;

  const boardDemandas = demandStatusFilter==='open'
    ? visibleDemandas.filter(d=>!d.done&&matchesDemandFilters(d)).sort((a,b)=>(priorityWeight[a.priority||'medium']-priorityWeight[b.priority||'medium'])||((a.dueDate||'9999-99-99').localeCompare(b.dueDate||'9999-99-99'))||((b.ts||0)-(a.ts||0)))
    : filteredDemandas;
  const wipCount=visibleDemandas.filter(d=>itemStatus(d)==='doing').length;
  renderKanbanBoard('demanda', boardDemandas,{wipCount});
  renderDemandHistory(archivedDemandas.filter(matchesDemandFilters), visibleDemandas.filter(d=>d.done).filter(matchesDemandFilters));
  const finalizable = visibleDemandas.filter(d=>d.done && canAllocateDemand(d)).length;
  const finBtn = document.getElementById('demand-finalize-btn'), histBtn = document.getElementById('demand-history-btn');
  if(finBtn){ finBtn.disabled = finalizable === 0; finBtn.textContent = finalizable ? `Finalizar tudo (${finalizable})` : 'Finalizar tudo'; }
  if(histBtn) histBtn.textContent = `Histórico (${archivedDemandas.length})`;
  const trashItems=allDemandas().filter(d=>d.deletedAt&&canAllocateDemand(d)).sort((a,b)=>(b.deletedAt||0)-(a.deletedAt||0));
  const trashBtn=document.getElementById('demand-trash-btn');
  if(trashBtn)trashBtn.textContent=`Lixeira (${trashItems.length})`;
  renderDemandTrash(trashItems);
  renderPostits(visibleDemandas.filter(matchesDemandFilters).sort((a,b)=>((b.ts||0)-(a.ts||0))), archivedDemandas.filter(matchesDemandFilters));
  requestAnimationFrame(()=>document.querySelectorAll('[id^="edit-meta-input-"],[id^="edit-demanda-input-"]').forEach(enableEditMentions));
  requestAnimationFrame(()=>{
    document.querySelectorAll('[data-comment-input]').forEach(input=>{const draft=commentDrafts.get(input.dataset.commentInput);if(draft!==undefined&&input.value!==draft)input.value=draft;});
    document.querySelectorAll('[data-reply-input]').forEach(input=>{const draft=replyDrafts.get(input.dataset.replyInput);if(draft!==undefined&&input.value!==draft)input.value=draft;});
    if(muralFocusRestore && muralFocusRestore.selector){
      const el = document.querySelector(muralFocusRestore.selector);
      if(el){
        if(typeof muralFocusRestore.value === 'string') el.value = muralFocusRestore.value;
        el.focus();
        if(typeof muralFocusRestore.start === 'number' && el.setSelectionRange){
          try{ el.setSelectionRange(muralFocusRestore.start, muralFocusRestore.end); }catch(err){}
        }
      }
    }
  });
}

const KANBAN_COLUMNS = [
  { key: 'todo', label: 'A fazer' },
  { key: 'doing', label: 'Fazendo' },
  { key: 'done', label: 'Concluído' }
];
const DEMAND_KANBAN_COLUMNS = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'todo', label: 'A fazer' },
  { key: 'doing', label: 'Fazendo' },
  { key: 'review', label: 'Revisão' },
  { key: 'done', label: 'Concluído' }
];
function kanbanColumnsFor(kind){return kind==='demanda'?DEMAND_KANBAN_COLUMNS:KANBAN_COLUMNS}
function itemStatus(item){
  return item.status || (item.done ? 'done' : 'todo');
}
function isLegacyWorkItemOwner(item){
  const mine=myProfile(),author=String(item?.author||'').trim().toLocaleLowerCase('pt-BR'),myName=String(mine?.name||'').trim().toLocaleLowerCase('pt-BR');
  return !item?.uid && !!author && !!myName && author===myName;
}
function canManageWorkItem(item){return item?.uid===currentUid||isLegacyWorkItemOwner(item)||isAdmin();}
function canAllocateDemand(item){return canManageWorkItem(item)||!!(item?.mentions&&item.mentions[currentUid])||!!(item?.assignedTo&&item.assignedTo[currentUid]);}
function canManageUserContent(item){return item?.uid===currentUid||isLegacyWorkItemOwner(item)||isAdmin();}
const DEMANDA_TRASH_RETENTION_DAYS=30;
const DEMANDA_TRASH_RETENTION_MS=DEMANDA_TRASH_RETENTION_DAYS*24*60*60*1000;
function demandTrashAge(item){return Date.now()-Number(item?.deletedAt||0);}
function canRestoreDemand(item){return canAllocateDemand(item)&&(demandTrashAge(item)<=DEMANDA_TRASH_RETENTION_MS||isAdmin());}
function moveDemandToTrash(item){
  if(!item||item.deletedAt||!canAllocateDemand(item))return Promise.resolve(false);
  return update(ref(db,demandaPath(item)),{deletedAt:Date.now(),deletedBy:currentUid})
    .then(()=>{showSuccessToast('Demanda movida para a lixeira. Você pode restaurá-la por 30 dias.');return true;})
    .catch(err=>{handleDbError(err);return false;});
}
function demandBlockActionsHtml(item){
  if(item.done||item.archived||!canAllocateDemand(item))return '';
  return item.blocked
    ?`<span class="demand-block-actions"><button type="button" data-action="block-demanda" data-id="${item.id}">Editar motivo</button><button type="button" data-action="unblock-demanda" data-id="${item.id}">Desbloquear</button></span>`
    :`<span class="demand-block-actions"><button type="button" data-action="block-demanda" data-id="${item.id}">Bloquear</button></span>`;
}
function renderKanbanBoard(kind, items, options={}){
  const board = document.getElementById(kind+'-board');
  if(!board || board.classList.contains('hidden')) return; // não gasta trabalho escondido
  const columns=kanbanColumnsFor(kind);
  const byStatus=Object.fromEntries(columns.map(col=>[col.key,[]]));
  items.forEach(item => { (byStatus[itemStatus(item)] || byStatus.todo).push(item); });

  board.innerHTML = columns.map(col=>{
    const colItems = byStatus[col.key];
    const wipLimit=kind==='demanda'&&col.key==='doing'?getDemandWipLimit():0;
    const wipCount=kind==='demanda'&&col.key==='doing'?Number(options.wipCount??colItems.length):0;
    const wipReached=!!wipLimit&&wipCount>=wipLimit;
    return `
    <div class="kanban-col" data-status="${col.key}">
      <div class="kanban-col-head"><span class="kanban-col-title">${col.label}<span class="count">${colItems.length}</span></span>${kind==='demanda'&&col.key==='doing'?`<span class="kanban-col-tools"><label class="kanban-wip-label" for="demand-wip-limit">Limite WIP</label><input class="kanban-wip-input" id="demand-wip-limit" type="number" min="1" step="1" value="${wipLimit||''}" placeholder="∞" aria-label="Limite WIP da coluna Fazendo" title="Limite salvo neste navegador; vazio significa sem limite"></span>`:''}</div>
      <div class="kanban-col-body">
        ${kind==='demanda'&&col.key==='doing'?`<div class="kanban-wip-warning ${wipReached?'is-reached':''}" role="status" aria-live="polite">${wipLimit?(wipReached?`Limite WIP alcançado (${wipCount}/${wipLimit}). O aviso não bloqueia novas movimentações.`:`WIP: ${wipCount}/${wipLimit} demandas em andamento.`):`WIP: ${wipCount} demandas em andamento · sem limite configurado.`}</div>`:''}
        ${colItems.length ? colItems.map(item=>{
          const info = authorInfo(item);
          const idx = columns.findIndex(c=>c.key===col.key);
          const canManageItem = kind === 'demanda' ? canAllocateDemand(item) : canManageWorkItem(item);
          const canMoveItem = kind === 'demanda' ? canAllocateDemand(item) : canManageItem;
          const isEditingItem = (kind==='meta'?editingMetas:editingDemandas).has(item.id) && canManageItem;
          return `
          <div class="kanban-card ${kind==='demanda'&&item.blocked?'is-blocked':''}" draggable="${canMoveItem&&!isEditingItem}" data-id="${item.id}" data-kind="${kind}">
            ${isEditingItem?`<div class="item-edit-form"><input class="field" id="edit-${kind}-input-${item.id}" value="${escapeHtml(item.text)}">${kind==='demanda'?demandEditFieldsHtml(item):''}<button class="btn btn-primary" data-action="save-${kind}-edit" data-id="${item.id}">Salvar</button><button class="btn-ghost" data-action="cancel-${kind}-edit" data-id="${item.id}">Cancelar</button></div>`:`<div class="kanban-card-text">${renderTextWithMentions(item.text,item)}${item.editedAt?' <span class="post-edited-tag">(editado)</span>':''}</div>${kind==='demanda'?demandDetailsHtml(item):''}`}
            <div class="kanban-card-meta">${avatarHtml(info, true)}<span class="kanban-card-author"${authorNameAttr(info)}>${escapeHtml(info.name)}</span></div>
            <div class="kanban-card-foot">
              ${visibilityTagHtml(item._sector)}
              ${canMoveItem ? `
              <div class="kanban-card-move">
                <button type="button" data-action="kanban-move" data-kind="${kind}" data-id="${item.id}" data-dir="-1" ${idx===0?'disabled':''} aria-label="Mover pra trás">‹</button>
                <button type="button" data-action="kanban-move" data-kind="${kind}" data-id="${item.id}" data-dir="1" ${idx===columns.length-1?'disabled':''} aria-label="Mover pra frente">›</button>
              </div>
              ` : ''}
              ${canManageItem ? `
              ${!isEditingItem?`<button type="button" data-action="edit-${kind}" data-id="${item.id}">editar</button>`:''}
              ${kind==='demanda'&&itemStatus(item)==='done'?'<span class="item-completed-label">Concluído</span>':`<button type="button" class="kanban-card-remove" data-action="remove-${kind}" data-id="${item.id}">remover</button>`}
              ` : ''}
              ${kind==='demanda'?demandBlockActionsHtml(item):''}
            </div>
          </div>`;
        }).join('') : `<div class="kanban-empty">Vazio</div>`}
      </div>
    </div>`;
  }).join('');
}

/* ===== post-its (Demandas): abertas viram notas; concluídas ficam guardadas no arquivo ===== */
let postitArchiveOpen=false;
function postitRot(id){let n=0;String(id).split('').forEach(ch=>{n=(n*31+ch.charCodeAt(0))%97;});return ((n%7)-3)*0.6;}
let postitHistoryOpen=false, demandHistoryOpen=false, demandDoneOpen=false;
function matchesDemandFilters(d){
  const assignee=demandAssigneeUid(d),assigneeName=state.users[assignee]?.name||'',haystack=`${d.text||''} ${assigneeName} ${authorInfo(d).name||''}`.toLocaleLowerCase('pt-BR');
  if(demandSearch&&!haystack.includes(demandSearch))return false;
  if(demandPriorityFilter&&(d.priority||'medium')!==demandPriorityFilter)return false;
  if(demandAssigneeFilter&&assignee!==demandAssigneeFilter)return false;
  if(demandStatusFilter==='week'&&!demandDueThisWeek(d))return false;
  if(demandStatusFilter==='blocked'&&(!d.blocked||d.done))return false;
  return true;
}
function renderDemandHistory(archived, waiting=[]){
  const el=document.getElementById('demanda-history');
  if(!el)return;
  const fmt=(ts,withYear)=>ts?new Date(Number(ts)).toLocaleDateString('pt-BR',withYear?{day:'2-digit',month:'short',year:'numeric'}:{day:'2-digit',month:'short'}):'';
  const batches=new Map();
  archived.forEach(d=>{const k=demandHistoryGroupKey(d);if(!batches.has(k))batches.set(k,[]);batches.get(k).push(d);});
  const rowHtml=d=>{
    const info=authorInfo(d),can=canAllocateDemand(d),pr=DEMAND_PRIORITIES[d.priority]||DEMAND_PRIORITIES.medium,isEditing=editingDemandas.has(d.id)&&can;
    const body=isEditing?`<div class="item-edit-form"><input class="field" id="edit-demanda-input-${d.id}" value="${escapeHtml(d.text)}" aria-label="Editar demanda">${demandEditFieldsHtml(d)}<button class="btn btn-primary" data-action="save-demanda-edit" data-id="${d.id}">Salvar</button><button class="btn-ghost" data-action="cancel-demanda-edit" data-id="${d.id}">Cancelar</button></div>`:`<div class="item-text">${renderTextWithMentions(d.text,d)}</div><div class="item-meta"><span>${escapeHtml(info.name)}</span> · ${pr[0]}${d.doneAt?` · concluída em ${fmt(d.doneAt)}`:''}</div>`;
    return `<div class="item done" data-demanda-id="${d.id}"><div class="check done" style="pointer-events:none;">${CHECK_SVG}</div><div class="item-body">${body}</div>${can?(isEditing?'':`<button class="item-edit-button" data-action="edit-demanda" data-id="${d.id}">editar</button><button class="item-edit-button" data-action="toggle-demanda" data-id="${d.id}">↺ reabrir</button><button class="item-remove" data-action="remove-demanda" data-id="${d.id}">remover</button>`):''}</div>`;
  };
  const body=batches.size?[...batches.entries()].sort((a,b)=>b[0]-a[0]).map(([k,list])=>{
    list.sort((a,b)=>(b.doneAt||b.ts||0)-(a.doneAt||a.ts||0));
    return `<details class="postit-batch"><summary>Finalizadas em ${Number(k)?fmt(k,true):'data desconhecida'} · ${list.length} ${list.length===1?'demanda':'demandas'}<button type="button" class="batch-reopen" data-action="reopen-batch" data-batch="${k}">↺ Reabrir todas</button></summary>${list.map(rowHtml).join('')}</details>`;
  }).join(''):'<div class="postit-empty">Nada finalizado ainda. Quando você usar "Finalizar tudo", as demandas ficam guardadas aqui.</div>';
  const waitingSorted=[...waiting].sort((a,b)=>(b.doneAt||b.ts||0)-(a.doneAt||a.ts||0));
  const waitingBody=waitingSorted.length?waitingSorted.map(rowHtml).join(''):'<div class="postit-empty">Ao concluir uma demanda, ela aparece aqui. Use "Finalizar tudo" para mandar para o histórico.</div>';
  el.innerHTML=`<details class="postit-archive" id="demand-done-details" ${demandDoneOpen?'open':''}><summary class="archive-summary archive-summary--done" aria-label="Concluídas aguardando finalizar: ${waitingSorted.length}" data-tooltip="Concluídas — aguardando arquivamento"><span class="demand-archive-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/><path d="M21 12a9 9 0 1 1-5.2-8.2"/></svg></span><span>${waitingSorted.length}</span></summary>${waitingBody}</details>
  <details class="postit-archive" id="demand-history-details" ${demandHistoryOpen?'open':''}><summary class="archive-summary archive-summary--history" aria-label="Histórico de finalizadas: ${archived.length}" data-tooltip="Histórico — demandas arquivadas"><span class="demand-archive-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 7h18v13H3z"/><path d="M1.5 3.5h21v3.5h-21z"/><path d="M10 11h4"/></svg></span><span>${archived.length}</span></summary>${body}</details>`;
}
function renderDemandTrash(items){
  const el=document.getElementById('demanda-trash');
  if(!el)return;
  const rows=items.map(d=>{
    const age=demandTrashAge(d),withinWindow=age<=DEMANDA_TRASH_RETENTION_MS,canRestoreItem=canRestoreDemand(d);
    const deletedBy=state.users[d.deletedBy]?.name||'Usuário';
    const deletedAt=formatFullDate(Number(d.deletedAt));
    const retention=withinWindow?'Pode ser restaurada por até 30 dias após a exclusão.':'Prazo de restauração encerrado. Só um administrador pode apagar definitivamente.';
    const purgeButton=isAdmin()&&!withinWindow?`<button type="button" class="item-remove" data-action="purge-demanda" data-id="${d.id}">Apagar definitivamente</button>`:'';
    const restoreButton=canRestoreItem?`<button type="button" class="item-edit-button" data-action="restore-demanda" data-id="${d.id}">Restaurar</button>`:'';
    return `<div class="demand-trash-item" data-demanda-id="${d.id}"><div class="item-body"><div class="item-text">${renderTextWithMentions(d.text,d)}</div>${demandDetailsHtml(d)}<div class="item-meta">Excluída por ${escapeHtml(deletedBy)} · ${escapeHtml(deletedAt)}. ${retention}</div></div><div class="demand-trash-actions">${restoreButton}${purgeButton}</div></div>`;
  }).join('');
  const empty=items.length?'':`<div class="postit-empty">A lixeira está vazia.</div>`;
  el.innerHTML=`<details class="postit-archive" id="demand-trash-details" ${demandTrashOpen?'open':''}><summary class="archive-summary archive-summary--trash" aria-label="Lixeira de demandas: ${items.length}" data-tooltip="Lixeira — demandas excluídas"><span class="demand-archive-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg></span><span>${items.length}</span></summary><div class="demand-trash"><p class="demand-trash-note">Demandas podem ser restauradas por 30 dias. Depois desse prazo, apenas um administrador pode apagá-las definitivamente.</p>${rows||empty}</div></details>`;
}
function renderPostits(items, archived=[]){
  const el=document.getElementById('demanda-notes');
  if(!el)return;
  const open=items.filter(d=>!d.done),done=items.filter(d=>d.done).sort((a,b)=>(b.doneAt||b.ts||0)-(a.doneAt||a.ts||0));
  const noteHtml=d=>{
    const can=canAllocateDemand(d),info=authorInfo(d),pr=d.priority||'medium',assignee=demandAssigneeUid(d),due=d.dueDate||'';
    const overdue=!!due&&!d.done&&due<demandToday();
    const dueText=due?new Date(`${due}T12:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}):'';
    const editing=editingDemandas.has(d.id)&&can;
    const doneAt=d.doneAt||0;
    const body=editing
      ?`<div class="item-edit-form"><input class="field" id="edit-demanda-input-${d.id}" value="${escapeHtml(d.text)}" aria-label="Editar demanda">${demandEditFieldsHtml(d)}<div class="postit-actions"><button class="postit-done-btn" data-action="save-demanda-edit" data-id="${d.id}">Salvar</button><button class="postit-link" data-action="cancel-demanda-edit" data-id="${d.id}">Cancelar</button></div></div>`
      :`<div class="postit-text">${renderTextWithMentions(d.text,d)}${d.editedAt?' <span class="post-edited-tag">(editado)</span>':''}</div>
        <div class="postit-meta"><span>${escapeHtml(info.name)}</span>${assignee?`<span>→ ${escapeHtml(state.users[assignee]?.name||'Usuário')}</span>`:''}${due?`<span>${overdue?'⚠ Atrasada':'Prazo'} · ${dueText}</span>`:''}${d.blocked?'<span class="demand-badge blocked">Bloqueada</span>':''}${d.done?`<span>✓ Concluída ${doneAt?new Date(doneAt).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}):''}</span>`:`<span>${timeAgo(d.ts)}</span>`}</div>
        ${d.blocked?`<div class="demand-block-reason"><strong>Motivo do bloqueio:</strong> ${escapeHtml(d.blockReason||'Motivo não informado')}</div>`:''}
        ${can?`<div class="postit-actions">${d.done?`<button class="postit-done-btn" data-action="toggle-demanda" data-id="${d.id}">↺ Reabrir</button><button class="postit-link" data-action="remove-demanda" data-id="${d.id}">remover</button>`:`<button class="postit-done-btn" data-action="toggle-demanda" data-id="${d.id}">✓ Concluir</button><button class="postit-link" data-action="edit-demanda" data-id="${d.id}">editar</button><button class="postit-link" data-action="remove-demanda" data-id="${d.id}">remover</button>`}${demandBlockActionsHtml(d)}</div>`:(d.done?'':'<div class="postit-meta">Só quem criou, foi marcado ou é admin pode concluir.</div>')}`;
    return `<div class="postit p-${pr} ${d.done?'is-done':''} ${d.blocked?'is-blocked':''}" data-demanda-id="${d.id}" style="--rot:${postitRot(d.id)}deg">${body}</div>`;
  };
  const batches=new Map();
  archived.forEach(d=>{const k=demandHistoryGroupKey(d);if(!batches.has(k))batches.set(k,[]);batches.get(k).push(d);});
  const historyHtml=batches.size?[...batches.entries()].sort((a,b)=>b[0]-a[0]).map(([k,list])=>{
    list.sort((a,b)=>(b.doneAt||b.ts||0)-(a.doneAt||a.ts||0));
    const when=Number(k)?new Date(Number(k)).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}):'data desconhecida';
    return `<details class="postit-batch"><summary>Finalizadas em ${when} · ${list.length} ${list.length===1?'demanda':'demandas'}<button type="button" class="batch-reopen" data-action="reopen-batch" data-batch="${k}">↺ Reabrir todas</button></summary><div class="postit-grid">${list.map(noteHtml).join('')}</div></details>`;
  }).join(''):'<div class="postit-empty">Nada finalizado ainda. Quando você usar "Finalizar tudo", as demandas ficam guardadas aqui.</div>';
  el.innerHTML=`<div class="postit-grid">${open.length?open.map(noteHtml).join(''):''}</div>${open.length?'':'<div class="postit-empty">Nenhum post-it em aberto. Escreva uma demanda abaixo 👇</div>'}
    <details class="postit-archive" id="postit-archive" ${postitArchiveOpen?'open':''}><summary>Concluídas aguardando finalizar (${done.length})</summary>${done.length?`<div class="postit-grid">${done.map(noteHtml).join('')}</div>`:'<div class="postit-empty">Ao concluir um post-it, ele aparece aqui. Use "Finalizar tudo" para mandar para o histórico.</div>'}</details>
    <details class="postit-archive" id="postit-history" ${postitHistoryOpen?'open':''}><summary>Histórico de finalizadas (${archived.length})</summary>${historyHtml}</details>`;
}
document.addEventListener('toggle',e=>{if(!e.target)return;if(e.target.id==='postit-archive')postitArchiveOpen=e.target.open;if(e.target.id==='postit-history')postitHistoryOpen=e.target.open;if(e.target.id==='demand-history-details')demandHistoryOpen=e.target.open;if(e.target.id==='demand-done-details')demandDoneOpen=e.target.open;if(e.target.id==='demand-trash-details')demandTrashOpen=e.target.open;},true);
function setItemStatus(kind, id, status){
  const item = (kind === 'meta' ? allMetas() : activeDemandas()).find(x=>x.id===id);
  if(!item || (kind === 'demanda' ? !canAllocateDemand(item) : !canManageWorkItem(item))) return;
  if(!kanbanColumnsFor(kind).some(col=>col.key===status))return;
  if(kind==='demanda'&&!demandAssigneeUid(item)&&!isAdmin()){showDbError('Defina um responsável antes de alterar esta demanda.');return;}
  if(kind==='demanda'&&status==='done'&&item.blocked){showDbError('Desbloqueie a demanda antes de concluí-la.');return;}
  const path = kind === 'meta' ? metaPath(item) : demandaPath(item);
  update(ref(db, path), kind === 'demanda' ? Object.assign({ status, done: status === 'done', doneAt: status === 'done' ? Date.now() : null }, status === 'done' ? {} : { archived: false, archivedAt: null, archiveBatch: null }) : { status, done: status === 'done' }).catch(handleDbError);
}

/* ===== alternar Lista / Quadro (Metas e Demandas) =====
   A preferência é só local (por navegador) — cada pessoa escolhe como
   prefere ver, não é algo compartilhado com a equipe. */
document.querySelectorAll('.view-toggle').forEach(toggle=>{
  const target = toggle.dataset.target; // 'meta' | 'demanda'
  const listEl = document.getElementById(target+'-list');
  const boardEl = document.getElementById(target+'-board');
  const notesEl = document.getElementById(target+'-notes');
  const saved = localStorage.getItem('plantel_view_'+target) || 'list';
  function applyView(view){
    toggle.querySelectorAll('.view-toggle-btn').forEach(b=> b.classList.toggle('active', b.dataset.view === view));
    if(view === 'notes' && !notesEl) view = 'list';
    listEl.classList.toggle('hidden', view !== 'list');
    boardEl.classList.toggle('hidden', view !== 'board');
    if(notesEl) notesEl.classList.toggle('hidden', view !== 'notes');
    if(target === 'demanda') document.querySelector('[data-section-id="demandas"] .info-tip')?.setAttribute('data-view', view);
    const histEl = document.getElementById(target+'-history');
    if(histEl) histEl.classList.toggle('hidden', view === 'notes');
    toggle.querySelectorAll('.view-toggle-btn').forEach(b=> b.classList.toggle('active', b.dataset.view === view));
    const activeViewBtn = toggle.querySelector('.view-toggle-btn.active');
    requestAnimationFrame(()=>{
      if(!activeViewBtn || toggle.scrollWidth <= toggle.clientWidth) return;
      const centeredLeft = activeViewBtn.offsetLeft - (toggle.clientWidth - activeViewBtn.offsetWidth) / 2;
      toggle.scrollTo({left:Math.max(0, centeredLeft),behavior:'smooth'});
    });
    localStorage.setItem('plantel_view_'+target, view);
    if(view === 'board') renderKanbanBoard(target, target === 'meta' ? allMetas() : activeDemandas().filter(d=>!isDemandInHistory(d)));
  }
  toggle.querySelectorAll('.view-toggle-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{ applyView(btn.dataset.view); render(); });
  });
  applyView(saved);
});

// arrastar e soltar cartões entre colunas
document.addEventListener('dragstart', (e)=>{
  const card = e.target.closest('.kanban-card');
  if(!card) return;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', JSON.stringify({ id: card.dataset.id, kind: card.dataset.kind }));
  setTimeout(()=> card.classList.add('dragging'), 0);
});
document.addEventListener('dragend', (e)=>{
  const card = e.target.closest('.kanban-card');
  if(card) card.classList.remove('dragging');
});
document.addEventListener('dragover', (e)=>{
  const col = e.target.closest('.kanban-col');
  if(!col) return;
  e.preventDefault();
  col.classList.add('drag-over');
});
document.addEventListener('dragleave', (e)=>{
  const col = e.target.closest('.kanban-col');
  if(col && !col.contains(e.relatedTarget)) col.classList.remove('drag-over');
});
document.addEventListener('drop', (e)=>{
  const col = e.target.closest('.kanban-col');
  if(!col) return;
  e.preventDefault();
  col.classList.remove('drag-over');
  let data;
  try{ data = JSON.parse(e.dataTransfer.getData('text/plain') || '{}'); }catch(err){ return; }
  if(!data.id || !data.kind) return;
  if(col.closest('.kanban-board')?.id!==`${data.kind}-board`)return;
  setItemStatus(data.kind, data.id, col.dataset.status);
});

function uid(){ return Date.now()+'-'+Math.random().toString(36).slice(2,7); }

function myProfile(){
  return (currentUid && state.users[currentUid]) || null;
}
function ensureProfileBeforeAction(){
  if(!currentUid){
    showDbError('Sua sessão terminou. Entre novamente para interagir.');
    return false;
  }
  const profile = myProfile();
  if(!profile || !String(profile.name || '').trim()){
    showDbError('Complete seu perfil antes de comentar ou interagir.');
    openProfileModal(true);
    return false;
  }
  if(profile.isBanned){
    showDbError('Esta conta não pode interagir no momento.');
    return false;
  }
  return true;
}
function isAdmin(){
  const p = myProfile();
  return !!(p && p.isAdmin);
}

/* ===== limpar mural (só admin) =====
   Apaga TODAS as mensagens do mural público e dos murais privados de
   cada setor, uma por uma (em vez de derrubar o nó inteiro de uma
   vez — apagar post a post usa o mesmo caminho/regra que o "excluir"
   individual já validado, evitando falha de permissão do Firebase
   em exclusões de nó inteiro). Só aparece pra quem tem "isAdmin: true"
   no próprio perfil (users/{uid}/isAdmin) — e as REGRAS do Firebase
   também exigem isso, então não dá pra burlar pelo app. */
document.getElementById('clear-mural-btn').addEventListener('click', async ()=>{
  if(!isAdmin()) return;
  const total = allPosts().length;
  if(!total){ return; }
  const ok = confirm(`Isso vai apagar TODAS as mensagens do mural (pelo menos ${total}, incluindo comentários) e não pode ser desfeito. Continuar?`);
  if(!ok) return;
  const btn = document.getElementById('clear-mural-btn');
  btn.disabled = true;
  btn.textContent = 'Limpando...';
  let failCount = 0;
  try{
    // posts públicos
    const publicResults = await Promise.allSettled(
      state.posts.map(post => remove(ref(db, 'posts/'+post.id)))
    );
    failCount += publicResults.filter(r=>r.status==='rejected').length;

    // posts privados de cada setor (mesmo os que o app não tem carregado agora)
    const sectors = allKnownSectors();
    for(const sector of sectors){
      const snap = await get(ref(db, 'posts_private/'+sector));
      const val = snap.val();
      if(!val) continue;
      const results = await Promise.allSettled(
        Object.keys(val).map(postId => remove(ref(db, `posts_private/${sector}/${postId}`)))
      );
      failCount += results.filter(r=>r.status==='rejected').length;
    }
    if(failCount > 0) showDbError(`Mural limpo, mas ${failCount} mensagem(ns) não puderam ser apagadas.`);
  }catch(err){
    handleDbError(err);
  }finally{
    btn.disabled = false;
    btn.textContent = 'Limpar mural';
  }
});

const muralMsgInput = document.getElementById('msg-input');
const mentionSuggestions = document.getElementById('mention-suggestions');
let mentionMatches = [], mentionActiveIndex = 0, mentionContext = null;
function collectMentions(text){
  const lower = String(text).toLocaleLowerCase('pt-BR');
  const mentions = {};
  const mentionsAll = /(^|\s)@all(?=\s|$|[.,!?])/i.test(text);
  Object.entries(state.users).forEach(([userUid, profile])=>{
    const name = profile && profile.name ? profile.name.trim() : '';
    if(mentionsAll || (name && lower.includes('@'+name.toLocaleLowerCase('pt-BR')))) mentions[userUid] = true;
  });
  return mentions;
}
function currentMentionContext(){
  const cursor = muralMsgInput.selectionStart;
  const before = muralMsgInput.value.slice(0, cursor);
  const match = before.match(/(?:^|\s)@([^\s@\n]*)$/);
  if(!match) return null;
  return { query:match[1], start:cursor-match[1].length-1, end:cursor };
}
function closeMentionSuggestions(){
  mentionSuggestions.classList.add('hidden');
  mentionSuggestions.innerHTML = '';
  mentionMatches = [];
  mentionContext = null;
}
function renderMentionSuggestions(){
  mentionContext = currentMentionContext();
  if(!mentionContext){ closeMentionSuggestions(); return; }
  const query = mentionContext.query.trim().toLocaleLowerCase('pt-BR');
  const people = Object.entries(state.users).map(([uid, profile])=>({ uid, ...profile })).filter(p=>p.name && (!query || p.name.toLocaleLowerCase('pt-BR').includes(query))).sort((a,b)=>a.name.localeCompare(b.name));
  const allOption = !query || 'all'.includes(query) || 'todos'.includes(query) ? [{ uid:'__all__', name:'all', _all:true }] : [];
  mentionMatches = [...allOption, ...people].slice(0,8);
  mentionActiveIndex = Math.min(mentionActiveIndex, Math.max(0, mentionMatches.length-1));
  mentionSuggestions.innerHTML = mentionMatches.map((p,index)=>{
    const avatar = p._all ? `<div class="avatar">@</div>` : (p.photo ? `<div class="avatar"><img src="${p.photo}" alt=""></div>` : `<div class="avatar">${initials(p.name)}</div>`);
    const label = p._all ? '@all' : p.name;
    const detail = p._all ? 'Mencionar todas as pessoas' : (userSectors(p).join(' · ') || 'Sem setor');
    return `<button type="button" class="mention-option ${index===mentionActiveIndex?'active':''}" data-mention-index="${index}">${avatar}<span><span class="mention-option-name">${escapeHtml(label)}</span><span class="mention-option-sector">${escapeHtml(detail)}</span></span></button>`;
  }).join('');
  mentionSuggestions.classList.toggle('hidden', !mentionMatches.length);
}
function insertMention(index){
  const person = mentionMatches[index];
  if(!person || !mentionContext) return;
  const before = muralMsgInput.value.slice(0, mentionContext.start);
  const after = muralMsgInput.value.slice(mentionContext.end);
  const inserted = '@'+person.name+' ';
  muralMsgInput.value = before + inserted + after;
  const cursor = before.length + inserted.length;
  muralMsgInput.focus();
  muralMsgInput.setSelectionRange(cursor, cursor);
  closeMentionSuggestions();
  autoGrowMsgInput();
}
mentionSuggestions.addEventListener('mousedown', e=>{
  const option = e.target.closest('[data-mention-index]');
  if(!option) return;
  e.preventDefault();
  insertMention(Number(option.dataset.mentionIndex));
});
function setupInlineMentions(inputId, suggestionsId){
  const input=typeof inputId==='string'?document.getElementById(inputId):inputId,box=typeof suggestionsId==='string'?document.getElementById(suggestionsId):suggestionsId;if(!input||!box)return;
  let matches=[],active=0,context=null;
  function close(){box.classList.add('hidden');box.innerHTML='';matches=[];context=null;}
  function update(){
    const cursor=input.selectionStart,before=input.value.slice(0,cursor),match=before.match(/(?:^|\s)@([^\s@\n]*)$/);
    if(!match){close();return;}
    context={start:cursor-match[1].length-1,end:cursor};const query=match[1].trim().toLocaleLowerCase('pt-BR');
    const people=Object.entries(state.users).map(([uid,profile])=>({uid,...profile})).filter(p=>p.name&&(!query||p.name.toLocaleLowerCase('pt-BR').includes(query))).sort((a,b)=>a.name.localeCompare(b.name));
    const all=!query||'all'.includes(query)||'todos'.includes(query)?[{uid:'__all__',name:'all',_all:true}]:[];matches=[...all,...people].slice(0,8);active=Math.min(active,Math.max(0,matches.length-1));
    box.innerHTML=matches.map((p,i)=>{const avatar=p._all?'<div class="avatar">@</div>':(p.photo?`<div class="avatar"><img src="${p.photo}" alt=""></div>`:`<div class="avatar">${initials(p.name)}</div>`);const detail=p._all?'Mencionar todas as pessoas':(userSectors(p).join(' · ')||'Sem setor');return `<button type="button" class="mention-option ${i===active?'active':''}" data-inline-mention="${i}">${avatar}<span><span class="mention-option-name">${escapeHtml(p._all?'@all':p.name)}</span><span class="mention-option-sector">${escapeHtml(detail)}</span></span></button>`;}).join('');
    box.classList.toggle('hidden',!matches.length);
  }
  function insert(index){const p=matches[index];if(!p||!context)return;const before=input.value.slice(0,context.start),after=input.value.slice(context.end),value='@'+p.name+' ';input.value=before+value+after;const cursor=before.length+value.length;input.focus();input.setSelectionRange(cursor,cursor);close();input.dispatchEvent(new Event('input',{bubbles:true}));}
  input.addEventListener('input',()=>{active=0;update();});
  input.addEventListener('keydown',e=>{if(box.classList.contains('hidden'))return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();active=(active+(e.key==='ArrowDown'?1:-1)+matches.length)%matches.length;update();}else if(e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();insert(active);}else if(e.key==='Escape'){e.preventDefault();close();}});
  box.addEventListener('mousedown',e=>{const option=e.target.closest('[data-inline-mention]');if(!option)return;e.preventDefault();insert(Number(option.dataset.inlineMention));});
  document.addEventListener('mousedown',e=>{if(e.target!==input&&!box.contains(e.target))close();});
}
function enableEditMentions(input){
  if(!input||input.dataset.mentionsReady)return;input.dataset.mentionsReady='1';
  const box=document.createElement('div');box.className='mention-suggestions hidden';input.closest('.item-edit-form')?.appendChild(box);setupInlineMentions(input,box);
}
setupInlineMentions('meta-add-input','meta-mention-suggestions');
setupInlineMentions('demanda-add-input','demanda-mention-suggestions');
document.getElementById('demanda-add-input')?.addEventListener('input',syncDemandAssigneeFromMention);
document.addEventListener('mousedown', e=>{
  if(!e.target.closest('.composer-top')) closeMentionSuggestions();
});
function richHtmlToMarkdown(html){
  const doc = new DOMParser().parseFromString(html, 'text/html');
  function walk(node, listIndex){
    if(node.nodeType === Node.TEXT_NODE) return node.nodeValue || '';
    if(node.nodeType !== Node.ELEMENT_NODE) return '';
    const tag = node.tagName.toLowerCase();
    const children = Array.from(node.childNodes).map(child=>walk(child)).join('');
    if(tag === 'strong' || tag === 'b') return '**'+children.trim()+'**';
    if(tag === 'em' || tag === 'i') return '*'+children.trim()+'*';
    if(tag === 'del' || tag === 's') return '~~'+children.trim()+'~~';
    if(tag === 'code' && node.parentElement?.tagName.toLowerCase() !== 'pre') return String.fromCharCode(96)+children+String.fromCharCode(96);
    if(tag === 'pre') return '\n'+String.fromCharCode(96).repeat(3)+'\n'+(node.textContent || '').trimEnd()+'\n'+String.fromCharCode(96).repeat(3)+'\n';
    if(/^h[1-3]$/.test(tag)) return '\n'+'#'.repeat(Number(tag[1]))+' '+children.trim()+'\n';
    if(tag === 'a'){
      const href = node.getAttribute('href') || '';
      return /^https?:\/\//i.test(href) ? '['+children.trim()+']('+href+')' : children;
    }
    if(tag === 'br') return '\n';
    if(tag === 'li'){
      const parentTag = node.parentElement?.tagName.toLowerCase();
      const index = Array.from(node.parentElement?.children || []).indexOf(node)+1;
      return (parentTag === 'ol' ? index+'. ' : '- ')+children.trim()+'\n';
    }
    if(tag === 'blockquote') return '\n'+children.trim().split('\n').map(line=>'> '+line).join('\n')+'\n';
    if(tag === 'p' || tag === 'div' || tag === 'ul' || tag === 'ol') return children+'\n';
    return children;
  }
  return walk(doc.body).replace(/\n{3,}/g,'\n\n').trim();
}
const muralMessageInput = document.getElementById('msg-input');
if(muralMessageInput){
  muralMessageInput.addEventListener('paste', event=>{
    const html = event.clipboardData?.getData('text/html');
    if(!html) return;
    const markdown = richHtmlToMarkdown(html);
    if(!markdown) return;
    event.preventDefault();
    muralMessageInput.setRangeText(markdown, muralMessageInput.selectionStart, muralMessageInput.selectionEnd, 'end');
    muralMessageInput.dispatchEvent(new Event('input', { bubbles:true }));
  });
}
document.addEventListener('paste', event=>{
  const input = event.target.closest?.('[data-comment-input],[data-reply-input],[data-thread-reply-input],[data-comment-edit],[data-reply-edit]');
  if(!input) return;
  const html = event.clipboardData?.getData('text/html');
  if(!html) return;
  const markdown = richHtmlToMarkdown(html);
  if(!markdown) return;
  event.preventDefault();
  input.setRangeText(markdown, input.selectionStart, input.selectionEnd, 'end');
  input.dispatchEvent(new Event('input', { bubbles:true }));
});
const pollComposerToggle = document.getElementById('poll-composer-toggle');
const pollComposerPanel = document.getElementById('poll-composer-panel');
const pollOptionList = document.getElementById('poll-option-list');
const pollAddOption = document.getElementById('poll-add-option');
function pollOptionRow(value=''){
  const row = document.createElement('div');
  row.className = 'poll-option-row';
  row.innerHTML = '<input class="field poll-option-input" maxlength="120" placeholder="Opção da enquete"><button class="btn btn-ghost poll-remove-option" type="button" aria-label="Remover opção">×</button>';
  row.querySelector('input').value = value;
  return row;
}
function resetPollComposer(close=true){
  pollOptionList.innerHTML = '';
  pollOptionList.append(pollOptionRow(), pollOptionRow());
  if(close){
    pollComposerPanel.classList.add('hidden');
    pollComposerToggle.setAttribute('aria-expanded','false');
    pollComposerToggle.textContent = '＋ Criar enquete';
  }
}
pollComposerToggle.addEventListener('click', ()=>{
  const open = pollComposerPanel.classList.toggle('hidden') === false;
  pollComposerToggle.setAttribute('aria-expanded',String(open));
  pollComposerToggle.textContent = open ? '× Remover enquete' : '＋ Criar enquete';
  if(open && !pollOptionList.children.length) resetPollComposer(false);
});
pollAddOption.addEventListener('click', ()=>{
  if(pollOptionList.children.length >= 6) return;
  const row = pollOptionRow();
  pollOptionList.appendChild(row);
  row.querySelector('input').focus();
});
pollOptionList.addEventListener('click', event=>{
  const removeBtn = event.target.closest('.poll-remove-option');
  if(!removeBtn || pollOptionList.children.length <= 2) return;
  removeBtn.closest('.poll-option-row').remove();
});
resetPollComposer();
document.getElementById('post-btn').addEventListener('click', ()=>{
  if(!ensureProfileBeforeAction()) return;
  const msgInput = document.getElementById('msg-input');
  const text = msgInput.value.trim();
  if(!text) return;
  const visibility = document.getElementById('msg-visibility').value || null;
  const pollOpen = !pollComposerPanel.classList.contains('hidden');
  const pollOptions = Array.from(pollOptionList.querySelectorAll('.poll-option-input')).map(input=>input.value.trim()).filter(Boolean);
  if(pollOpen && pollOptions.length < 2){
    showDbError('A enquete precisa ter pelo menos duas opções preenchidas.');
    return;
  }
  const id = uid();
  const path = visibility ? `posts_private/${visibility}/${id}` : `posts/${id}`;
  newMuralPosts.add(id);
  const mentions = collectMentions(text);
  const poll = pollOpen ? {
    options: pollOptions.map((label,index)=>({ id:'option-'+index, label })),
    votes: null
  } : null;
  set(ref(db, path), { author: myProfile().name, uid: currentUid, text, poll, mentions:Object.keys(mentions).length ? mentions : null, ts: Date.now(), metaId: null, demandaId: null }).catch(err=>{ newMuralPosts.delete(id); handleDbError(err); });
  msgInput.value = '';
  resetPollComposer();
  closeMentionSuggestions();
  autoGrowMsgInput();
});
function autoGrowMsgInput(){
  const el = document.getElementById('msg-input');
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 340) + 'px';
}
// o bloco de notas flutuante é position:fixed e, no celular, quando o
// teclado abre ele "sobe" e pode acabar sobrepondo o campo do mural,
// atrapalhando o toque/digitação. Escondemos ele enquanto o campo
// estiver em foco no celular pra evitar esse conflito.
document.getElementById('msg-input').addEventListener('focus', ()=>{
  if(window.matchMedia('(max-width:720px)').matches) document.body.classList.add('composer-focused');
});
document.getElementById('msg-input').addEventListener('blur', ()=>{
  document.body.classList.remove('composer-focused');
});
document.getElementById('msg-input').addEventListener('input', ()=>{ autoGrowMsgInput(); mentionActiveIndex=0; renderMentionSuggestions(); });
document.getElementById('msg-input').addEventListener('keydown', e=>{
  if(!mentionSuggestions.classList.contains('hidden')){
    if(e.key==='ArrowDown' || e.key==='ArrowUp'){
      e.preventDefault();
      mentionActiveIndex = (mentionActiveIndex + (e.key==='ArrowDown'?1:-1) + mentionMatches.length) % mentionMatches.length;
      renderMentionSuggestions();
      return;
    }
    if(e.key==='Enter' && !e.ctrlKey && !e.metaKey){ e.preventDefault(); insertMention(mentionActiveIndex); return; }
    if(e.key==='Escape'){ e.preventDefault(); closeMentionSuggestions(); return; }
  }
  if(e.key==='Enter' && (e.metaKey || e.ctrlKey)){
    e.preventDefault();
    document.getElementById('post-btn').click();
  }
});

function addMetaToGoogleCalendar(meta){
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth()+1).padStart(2,'0');
  const d = String(today.getDate()).padStart(2,'0');
  const dateStr = `${y}${m}${d}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: meta.text,
    dates: `${dateStr}/${dateStr}`,
    details: `Meta do Plantel Hub · responsável: ${authorInfo(meta).name}`
  });
  window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank');
}
function addMeta(text, author, itemUid, visibility){
  if(!text.trim()) return null;
  const id = uid();
  const path = visibility ? `metas_private/${visibility}/${id}` : `metas/${id}`;
  const mentions=collectMentions(text);
  set(ref(db, path), { text: text.trim(), author, uid: itemUid || null, ts: Date.now(), done:false, mentions:Object.keys(mentions).length?mentions:null }).catch(handleDbError);
  return id;
}
function addDemanda(text, author, itemUid, visibility, priority='medium', dueDate='', assignee=''){
  if(!text.trim()) return null;
  assignee=assignee||firstMentionedUid(text);
  if(!assignee)return null;
  const id = uid();
  const path = visibility ? `demandas_private/${visibility}/${id}` : `demandas/${id}`;
  const mentions=collectMentions(text);
  if(assignee)mentions[assignee]=true;
  set(ref(db, path), { text: text.trim(), author, uid: itemUid || null, ts: Date.now(), done:false, status:'todo', priority, dueDate:dueDate||null, assignedTo:assignee?{[assignee]:true}:null, mentions:Object.keys(mentions).length?mentions:null }).catch(handleDbError);
  return id;
}

function submitMeta(){
  if(!ensureProfileBeforeAction()) return;
  const input = document.getElementById('meta-add-input');
  const visibility = document.getElementById('meta-add-visibility').value || null;
  const text = input.value.trim();
  if(!text) return;
  const id = addMeta(text, myProfile().name, currentUid, visibility);
  if(id){
    newMuralMetas.add(id);
    input.value='';
    render();
  }
}
function submitDemanda(){
  if(!ensureProfileBeforeAction()) return;
  const input = document.getElementById('demanda-add-input');
  const visibility = document.getElementById('demanda-add-visibility').value || null;
  const priority = document.getElementById('demanda-add-priority').value || 'medium';
  const dueDate = document.getElementById('demanda-add-due').value || '';
  const assigneeSelect=document.getElementById('demanda-add-assignee');
  const text = input.value.trim();
  if(!text) return;
  const mentionedAssignee=firstMentionedUid(text);
  if(!assigneeSelect.value&&mentionedAssignee){assigneeSelect.value=mentionedAssignee;demandAssigneeAutoUid=mentionedAssignee;}
  const assignee=assigneeSelect.value||'';
  if(!assignee){assigneeSelect.setCustomValidity('Selecione um responsável ou mencione alguém no texto da demanda.');assigneeSelect.reportValidity();assigneeSelect.setCustomValidity('');assigneeSelect.focus();return;}
  const id = addDemanda(text, myProfile().name, currentUid, visibility, priority, dueDate, assignee);
  if(id){
    newMuralDemandas.add(id);
    input.value='';
    document.getElementById('demanda-add-due').value='';
    assigneeSelect.value='';
    demandAssigneeAutoUid='';
    render();
  }
}
document.getElementById('meta-add-btn').addEventListener('click', submitMeta);
document.getElementById('demanda-add-btn').addEventListener('click', submitDemanda);
document.getElementById('meta-add-input').addEventListener('keydown', e=>{
  if(e.key === 'Enter'){ e.preventDefault(); submitMeta(); }
});
document.getElementById('demanda-add-input').addEventListener('keydown', e=>{
  if(e.key === 'Enter'){ e.preventDefault(); submitDemanda(); }
});

const demandExpandBtn = document.getElementById('demand-expand-btn');
function setDemandExpanded(expanded){
  document.body.classList.toggle('demand-expanded', expanded);
  demandExpandBtn?.setAttribute('aria-expanded', String(expanded));
  if(demandExpandBtn){
    demandExpandBtn.title = expanded ? 'Fechar visualiza\u00e7\u00e3o expandida' : 'Expandir demandas';
    demandExpandBtn.setAttribute('aria-label', demandExpandBtn.title);
  }
}
demandExpandBtn?.addEventListener('click', e=>{
  e.preventDefault();
  e.stopPropagation();
  setDemandExpanded(!document.body.classList.contains('demand-expanded'));
});
document.addEventListener('keydown', e=>{
  if(e.key === 'Escape' && document.body.classList.contains('demand-expanded')) setDemandExpanded(false);
});

document.addEventListener('click', (e)=>{
  document.querySelectorAll('.post-more[open]').forEach(menu=>{
    if(!menu.contains(e.target)){
      menu.removeAttribute('open');
      if(menu.dataset.postMenu) openPostMenus.delete(menu.dataset.postMenu);
    }
  });
  const t = e.target.closest('[data-action]');
  if(!t) return;
  const action = t.dataset.action, id = t.dataset.id;

  if(action === 'today-section'){
    const section = document.querySelector(`[data-section-id="${t.dataset.section}"]`);
    if(section){
      section.scrollIntoView({ behavior:'smooth', block:'start' });
      section.classList.add('today-focus');
      setTimeout(()=>section.classList.remove('today-focus'), 1300);
    }
  } else if(action === 'today-messages'){
    openDmList();
    renderTodayPanel();
  } else if(action === 'today-notifications'){
    openMentionNotifications();
    renderTodayPanel();
  } else if(action === 'today-call'){
    callBtn.click();
  } else if(action === 'view-profile'){
    const uid = t.dataset.uid || null;
    const fallbackName = t.dataset.name || null;
    openViewProfile(uid, fallbackName);
  } else if(action === 'open-mentioned-post'){
    closeMentionNotifications();
    muralSearch = '';
    muralSectorFilter = '';
    muralSearchInput.value = '';
    muralSectorSelect.value = '';
    render();
    setTimeout(()=>{
      const postEl = document.querySelector(`[data-post-id="${id}"]`);
      if(postEl){
        postEl.scrollIntoView({ behavior:'smooth', block:'center' });
        postEl.classList.add('mention-focus');
        setTimeout(()=>postEl.classList.remove('mention-focus'), 1900);
      }
    }, 280);
  } else if(action === 'open-mentioned-item'){
    closeMentionNotifications();
    const kind=t.dataset.kind,section=document.querySelector(`[data-section-id="${kind==='meta'?'metas':'demandas'}"]`);
    section?.scrollIntoView({behavior:'smooth',block:'center'});
    setTimeout(()=>{const item=document.querySelector(kind==='meta'?`[data-meta-id="${id}"]`:`[data-demanda-id="${id}"]`);if(item){item.scrollIntoView({behavior:'smooth',block:'center'});item.classList.add('mention-focus');setTimeout(()=>item.classList.remove('mention-focus'),1900);}},280);
  } else if(action === 'open-dm'){
    const otherUid = t.dataset.uid;
    const c = dmConversations[otherUid] || {};
    if(!mentionNotificationModal.classList.contains('hidden')) closeMentionNotifications();
    openDmThread(otherUid, c.name, c.photo);
  } else if(action === 'message-support'){
    const otherUid = t.dataset.uid;
    const p = state.users[otherUid] || {};
    closeSupportModal();
    openDmThread(otherUid, p.name || 'Suporte', p.photo || null);
  } else if(action === 'delete-dm-list'){
    const otherUid = t.dataset.uid;
    const c = dmConversations[otherUid] || {};
    const name = nicknameFor(otherUid, c.name);
    deleteConversation(otherUid, name).then(()=>{ renderDmList(); }).catch(handleDbError);
  } else if(action === 'to-meta'){
    const post = allPosts().find(p=>p.id===id);
    if(post && !post.metaId){
      const metaId = addMeta(post.text, post.author, post.uid, post._sector);
      update(ref(db, postPath(post)), { metaId }).catch(handleDbError);
    }
  } else if(action === 'to-demanda'){
    const post = allPosts().find(p=>p.id===id);
    if(post && !post.demandaId){
      const mentionedAssignee=firstMentionedUid(post.text);
      const demandaId = addDemanda(post.text, post.author, post.uid, post._sector, 'medium', '', mentionedAssignee||currentUid);
      if(demandaId){update(ref(db, postPath(post)), { demandaId }).catch(handleDbError);if(!mentionedAssignee)showSuccessToast('Você foi definido como responsável.');}
    }
  } else if(action === 'undo-meta'){
    const post = allPosts().find(p=>p.id===id);
    if(post && post.metaId){
      const meta = allMetas().find(m=>m.id===post.metaId);
      if(meta) remove(ref(db, metaPath(meta))).catch(handleDbError);
      update(ref(db, postPath(post)), { metaId: null }).catch(handleDbError);
    }
  } else if(action === 'undo-demanda'){
    const post = allPosts().find(p=>p.id===id);
    if(post && post.demandaId){
      const demanda = allDemandas().find(d=>d.id===post.demandaId);
      if(demanda && demanda.done) return; // concluídas ficam guardadas: nunca apagar por aqui
      if(demanda && !demanda.deletedAt && !confirm('Mover a demanda relacionada para a lixeira? Ela poderá ser restaurada por 30 dias.')) return;
      const movePromise=demanda&&!demanda.deletedAt?moveDemandToTrash(demanda):Promise.resolve(true);
      movePromise.then(moved=>{if(moved)update(ref(db, postPath(post)), { demandaId: null }).catch(handleDbError);});
    }
  } else if(action === 'cal-meta'){
    const m = allMetas().find(x=>x.id===id);
    if(m) addMetaToGoogleCalendar(m);
  } else if(action === 'toggle-meta'){
    const m = allMetas().find(x=>x.id===id);
    if(m){ const newDone = !m.done; update(ref(db, metaPath(m)), { done: newDone, status: newDone ? 'done' : 'todo' }).catch(handleDbError); }
  } else if(action === 'finalize-demandas'){
    const list = activeDemandas().filter(d=>d.done && !d.archived && demandCompletedThisWeek(d) && canAllocateDemand(d));
    if(!list.length) return;
    if(!confirm(`Finalizar ${list.length} ${list.length===1?'demanda concluída':'demandas concluídas'}?\n\nElas saem do quadro, mas ficam guardadas no Histórico e podem ser reabertas quando você quiser.`)) return;
    const batch = Date.now();
    list.forEach(d=>update(ref(db, demandaPath(d)), { archived: true, archivedAt: batch, archiveBatch: batch }).catch(handleDbError));
  } else if(action === 'open-history'){
    postitHistoryOpen = true; demandHistoryOpen = true;
    render();
    requestAnimationFrame(()=>{
      const target=[document.getElementById('postit-history'),document.getElementById('demand-history-details')].find(x=>x&&x.offsetParent!==null);
      target?.scrollIntoView({behavior:'smooth',block:'center'});
    });
  } else if(action === 'open-trash'){
    demandTrashOpen=true;
    render();
    requestAnimationFrame(()=>document.getElementById('demand-trash-details')?.scrollIntoView({behavior:'smooth',block:'center'}));
  } else if(action === 'restore-demanda'){
    const d=allDemandas().find(x=>x.id===id);
    if(!d||!d.deletedAt||!canRestoreDemand(d))return;
    update(ref(db,demandaPath(d)),{deletedAt:null,deletedBy:null})
      .then(()=>showSuccessToast('Demanda restaurada.'))
      .catch(handleDbError);
  } else if(action === 'purge-demanda'){
    const d=allDemandas().find(x=>x.id===id);
    if(!d||!d.deletedAt||!isAdmin()||demandTrashAge(d)<DEMANDA_TRASH_RETENTION_MS)return;
    if(!confirm('Apagar esta demanda definitivamente? Esta ação não pode ser desfeita.'))return;
    remove(ref(db,demandaPath(d))).then(()=>{
      const linkedPosts=allPosts().filter(p=>p.demandaId===id&&(p.uid===currentUid||isAdmin()));
      return Promise.all(linkedPosts.map(p=>update(ref(db,postPath(p)),{demandaId:null})));
    }).then(()=>showSuccessToast('Demanda apagada definitivamente.')).catch(handleDbError);
  } else if(action === 'block-demanda'){
    const d=activeDemandas().find(x=>x.id===id);
    if(!d||d.done||d.archived||!canAllocateDemand(d))return;
    const answer=window.prompt(d.blocked?'Edite o motivo do bloqueio:':'Informe o motivo do bloqueio:',d.blockReason||'');
    if(answer===null)return;
    const blockReason=answer.trim();
    if(!blockReason){showDbError('Informe um motivo para bloquear esta demanda.');return;}
    if(blockReason.length>500){showDbError('O motivo do bloqueio deve ter no máximo 500 caracteres.');return;}
    update(ref(db,demandaPath(d)),{blocked:true,blockReason,blockedAt:Date.now(),blockedBy:currentUid}).catch(handleDbError);
  } else if(action === 'unblock-demanda'){
    const d=activeDemandas().find(x=>x.id===id);
    if(!d||!d.blocked||d.done||d.archived||!canAllocateDemand(d))return;
    if(!confirm('Desbloquear esta demanda? O motivo será removido.'))return;
    update(ref(db,demandaPath(d)),{blocked:false,blockReason:null,blockedAt:null,blockedBy:null}).catch(handleDbError);
  } else if(action === 'reopen-batch'){
    e.preventDefault();
    const batch = t.dataset.batch;
    const list = activeDemandas().filter(d=>isDemandInHistory(d) && demandHistoryGroupKey(d)===batch && canAllocateDemand(d));
    if(!list.length) return;
    if(!confirm(`Reabrir ${list.length} ${list.length===1?'demanda':'demandas'}? Elas voltam para "A fazer".`)) return;
    list.forEach(d=>update(ref(db, demandaPath(d)), { done:false, status:'todo', doneAt:null, archived:false, archivedAt:null, archiveBatch:null }).catch(handleDbError));
  } else if(action === 'toggle-demanda'){
    const d = activeDemandas().find(x=>x.id===id);
    if(d && canAllocateDemand(d)){ const newDone = !d.done;if(newDone&&!demandAssigneeUid(d)&&!isAdmin()){showDbError('Defina um responsável antes de concluir esta demanda.');return;}if(newDone&&d.blocked){showDbError('Desbloqueie a demanda antes de concluí-la.');return;}update(ref(db, demandaPath(d)), Object.assign({ done: newDone, status: newDone ? 'done' : 'todo', doneAt: newDone ? Date.now() : null }, newDone ? {} : { archived: false, archivedAt: null, archiveBatch: null })).catch(handleDbError); }
  } else if(action === 'edit-meta' || action === 'edit-demanda'){
    const kind=action==='edit-meta'?'meta':'demanda',item=(kind==='meta'?allMetas():activeDemandas()).find(x=>x.id===id);
    if(!item || (kind==='demanda'?!canAllocateDemand(item):!canManageWorkItem(item)))return;
    (kind==='meta'?editingMetas:editingDemandas).add(id);render();
    requestAnimationFrame(()=>{const inputs=[...document.querySelectorAll(`[id="edit-${kind}-input-${id}"]`)];const input=inputs.find(el=>el.offsetParent!==null)||inputs[0];if(input){enableEditMentions(input);input.focus();input.setSelectionRange(input.value.length,input.value.length);}});
  } else if(action === 'cancel-meta-edit' || action === 'cancel-demanda-edit'){
    (action==='cancel-meta-edit'?editingMetas:editingDemandas).delete(id);render();
  } else if(action === 'save-meta-edit' || action === 'save-demanda-edit'){
    const kind=action==='save-meta-edit'?'meta':'demanda',item=(kind==='meta'?allMetas():activeDemandas()).find(x=>x.id===id),container=t.closest('.item,.kanban-card,.postit'),input=container?.querySelector(`[id^="edit-${kind}-input-"]`);
    const text=input?.value.trim();if(!item||!text||(kind==='demanda'?!canAllocateDemand(item):!canManageWorkItem(item)))return;
    const mentions=collectMentions(text),path=kind==='meta'?metaPath(item):demandaPath(item);
    const changes={text,mentions:Object.keys(mentions).length?mentions:null,editedAt:Date.now()};if(isLegacyWorkItemOwner(item))changes.uid=currentUid;
    if(kind==='demanda'){
      const assignee=container?.querySelector('[data-edit-assignee]')?.value||'';
      if(!assignee){const assigneeInput=container?.querySelector('[data-edit-assignee]');if(assigneeInput){assigneeInput.setCustomValidity('Selecione um responsável para salvar a demanda.');assigneeInput.reportValidity();assigneeInput.addEventListener('change',()=>assigneeInput.setCustomValidity(''),{once:true});}return;}
      if(assignee)mentions[assignee]=true;
      changes.priority=container?.querySelector('[data-edit-priority]')?.value||'medium';
      changes.dueDate=container?.querySelector('[data-edit-due]')?.value||null;
      changes.assignedTo=assignee?{[assignee]:true}:null;
      changes.mentions=Object.keys(mentions).length?mentions:null;
    }
    (kind==='meta'?editingMetas:editingDemandas).delete(id);
    update(ref(db,path),changes).catch(handleDbError);render();
  } else if(action === 'kanban-move'){
    const kind = t.dataset.kind, dir = parseInt(t.dataset.dir, 10);
    const item = (kind === 'meta' ? allMetas() : activeDemandas().filter(d=>!isDemandInHistory(d))).find(x=>x.id===id);
    if(!item) return;
    const columns=kanbanColumnsFor(kind),curIdx=columns.findIndex(c=>c.key===itemStatus(item));
    const nextIdx=Math.min(columns.length-1,Math.max(0,curIdx+dir));
    setItemStatus(kind,id,columns[nextIdx].key);
  } else if(action === 'remove-meta'){
    const m = allMetas().find(x=>x.id===id);
    if(m) remove(ref(db, metaPath(m))).catch(handleDbError);
    const linkedPost = allPosts().find(p=>p.metaId===id);
    if(linkedPost) update(ref(db, postPath(linkedPost)), { metaId: null }).catch(handleDbError);
  } else if(action === 'remove-demanda'){
    const d = allDemandas().find(x=>x.id===id);
    if(!d || d.deletedAt || !canAllocateDemand(d)) return;
    const confirmed = confirm('Mover esta demanda para a lixeira? Ela poderá ser restaurada por 30 dias.');
    if(!confirmed) return;
    const linkedPost = allPosts().find(p=>p.demandaId===id);
    moveDemandToTrash(d).then(moved=>{
      if(moved&&linkedPost&&(linkedPost.uid===currentUid||isAdmin()))update(ref(db,postPath(linkedPost)),{demandaId:null}).catch(handleDbError);
    });
  } else if(action === 'toggle-pin'){
    const post = allPosts().find(p=>p.id===id);
    if(post) update(ref(db, postPath(post)), { pinned: !post.pinned }).catch(handleDbError);
  } else if(action === 'remove-post'){
    const post = allPosts().find(p=>p.id===id);
    if(post && (post.uid === currentUid || isAdmin())) remove(ref(db, postPath(post))).catch(handleDbError);
    editingPosts.delete(id);
  } else if(action === 'edit-post'){
    const post = allPosts().find(p=>p.id===id);
    if(!post || post.uid !== currentUid) return;
    editingPosts.add(id);
    render();
    const ta = document.getElementById('edit-post-textarea-'+id);
    if(ta){ ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  } else if(action === 'cancel-post-edit'){
    editingPosts.delete(id);
    render();
  } else if(action === 'save-post-edit'){
    const ta = document.getElementById('edit-post-textarea-'+id);
    const text = ta ? ta.value.trim() : '';
    if(!text) return;
    const post = allPosts().find(p=>p.id===id);
    editingPosts.delete(id);
    if(post && post.uid === currentUid){
      const mentions = collectMentions(text);
      update(ref(db, postPath(post)), { text, mentions:Object.keys(mentions).length ? mentions : null, editedAt: Date.now() }).catch(handleDbError);
    }
    render();
  } else if(action === 'vote-poll'){
    if(!ensureProfileBeforeAction()) return;
    const post = allPosts().find(p=>p.id===id);
    const optionId = t.dataset.option;
    if(!post || !post.poll || !optionId) return;
    const currentVote = post.poll.votes && post.poll.votes[currentUid];
    const voteRef = ref(db, postPath(post)+'/poll/votes/'+currentUid);
    (currentVote === optionId ? remove(voteRef) : set(voteRef, optionId)).catch(handleDbError);
  } else if(action === 'like-post'){
    if(!ensureProfileBeforeAction()) return;
    const post = allPosts().find(p=>p.id===id);
    if(!post) return;
    const liked = !!(post.likes && post.likes[currentUid]);
    const likeRef = ref(db, postPath(post)+'/likes/'+currentUid);
    (liked ? remove(likeRef) : set(likeRef, { ts:Date.now() })).catch(handleDbError);
  } else if(action === 'toggle-comments'){
    if(openComments.has(id)){
      openComments.delete(id);
      closingComments.add(id);
      if(closingCommentTimers.has(id)){
        clearTimeout(closingCommentTimers.get(id));
      }
      closingCommentTimers.set(id, setTimeout(()=>{
        closingComments.delete(id);
        closingCommentTimers.delete(id);
        render();
      }, 360));
      render();
    } else {
      if(closingCommentTimers.has(id)){
        clearTimeout(closingCommentTimers.get(id));
        closingCommentTimers.delete(id);
      }
      closingComments.delete(id);
      openComments.add(id);
      render();
      if(window.matchMedia('(max-width:520px)').matches)setTimeout(()=>document.querySelector(`[data-comment-input="${id}"]`)?.scrollIntoView({behavior:'smooth',block:'center'}),180);
    }
  } else if(action === 'send-comment'){
    if(pendingComments.has(id)) return;
    const input = document.querySelector(`[data-comment-input="${id}"]`);
    const text = input ? input.value.trim() : '';
    if(!text) return;
    if(!ensureProfileBeforeAction()) return;
    const post = allPosts().find(p=>p.id===id);
    if(!post) return;
    const commentId = uid();
    const profile = myProfile();
    commentDrafts.set(id, text);
    pendingComments.add(id);
    if(input) input.disabled = true;
    t.disabled = true;
    newMuralComments.add(commentId);
    openComments.add(id);
    set(ref(db, postPath(post)+'/comments/'+commentId), { author: profile.name, uid: currentUid, text, ts: Date.now() })
      .then(()=>{ commentDrafts.delete(id); })
      .catch(err=>{ newMuralComments.delete(commentId); commentDrafts.set(id,text); handleDbError(err); })
      .finally(()=>{ pendingComments.delete(id); render(); });
  } else if(action === 'like-comment'){
    if(!ensureProfileBeforeAction()) return;
    const postId = t.dataset.post, commentId = id;
    const post = allPosts().find(p=>p.id===postId);
    if(!post) return;
    const comment = post.comments ? post.comments[commentId] : null;
    const liked = !!(comment && comment.likes && comment.likes[currentUid]);
    const likeRef = ref(db, postPath(post)+'/comments/'+commentId+'/likes/'+currentUid);
    (liked ? remove(likeRef) : set(likeRef, true)).catch(handleDbError);
  } else if(action === 'toggle-expand-post'){
    if(expandedPosts.has(id)) expandedPosts.delete(id); else expandedPosts.add(id);
    render();
  } else if(action === 'toggle-post-views'){
    if(openPostViews.has(id)) openPostViews.delete(id); else openPostViews.add(id);
    render();
  } else if(action === 'like-thread-reply'){
    if(!ensureProfileBeforeAction()) return;
    const post = allPosts().find(p=>p.id===t.dataset.post);
    const commentId = t.dataset.comment, nodePath = t.dataset.path || '';
    if(!post || !/^replies\/[A-Za-z0-9_-]+(?:\/replies\/[A-Za-z0-9_-]+)*$/.test(nodePath)) return;
    const likeRef = ref(db, `${postPath(post)}/comments/${commentId}/${nodePath}/likes/${currentUid}`);
    const liked = t.classList.contains('is-liked');
    (liked ? remove(likeRef) : set(likeRef,true)).catch(handleDbError);
  } else if(action === 'toggle-thread-reply'){
    const key = t.dataset.key;
    if(!key) return;
    if(openReplies.has(key)) openReplies.delete(key); else openReplies.add(key);
    render();
  } else if(action === 'send-thread-reply'){
    if(!ensureProfileBeforeAction()) return;
    const post = allPosts().find(p=>p.id===t.dataset.post);
    const commentId = t.dataset.comment, nodePath = t.dataset.path || '', key = t.dataset.key;
    const input = [...document.querySelectorAll('[data-thread-reply-input]')].find(el=>el.dataset.threadReplyInput===key);
    const text = input?.value.trim();
    if(!post || !text || !key || !/^replies\/[A-Za-z0-9_-]+(?:\/replies\/[A-Za-z0-9_-]+)*$/.test(nodePath)) return;
    const replyId = uid(), profile = myProfile();
    t.disabled = true;
    set(ref(db, `${postPath(post)}/comments/${commentId}/${nodePath}/replies/${replyId}`), { author:profile.name, uid:currentUid, text, ts:Date.now() })
      .then(()=>{ newMuralReplies.add(replyId); })
      .catch(handleDbError)
      .finally(()=>render());
  } else if(action === 'toggle-reply'){
    if(openReplies.has(id)) openReplies.delete(id); else openReplies.add(id);
    render();
  } else if(action === 'edit-comment'){
    const post = allPosts().find(p=>p.id===t.dataset.post);
    const comment = post?.comments?.[id];
    if(!comment || !canManageUserContent(comment)) return;
    editingComments.add(id);
    render();
    requestAnimationFrame(()=>document.querySelector(`[data-comment-edit="${id}"]`)?.focus());
  } else if(action === 'cancel-comment-edit'){
    editingComments.delete(id);
    render();
  } else if(action === 'save-comment-edit'){
    const post = allPosts().find(p=>p.id===t.dataset.post);
    const comment = post?.comments?.[id];
    const input = document.querySelector(`[data-comment-edit="${id}"]`);
    const text = input?.value.trim();
    if(!post || !comment || !text || !canManageUserContent(comment)) return;
    t.disabled = true;
    update(ref(db, postPath(post)+'/comments/'+id), { text, editedAt:Date.now() })
      .then(()=> editingComments.delete(id))
      .catch(handleDbError)
      .finally(()=> render());
  } else if(action === 'remove-comment'){
    const postId = t.dataset.post;
    const post = allPosts().find(p=>p.id===postId);
    const comment = post?.comments?.[id];
    if(!post || !comment || !canManageUserContent(comment)){
      showDbError('Você não tem permissão para excluir este comentário.');
      return;
    }
    remove(ref(db, postPath(post)+'/comments/'+id)).catch(handleDbError);
    editingComments.delete(id);
    openReplies.delete(id);
  } else if(action === 'edit-reply'){
    const post = allPosts().find(p=>p.id===t.dataset.post);
    const reply = post?.comments?.[t.dataset.comment]?.replies?.[id];
    if(!reply || !canManageUserContent(reply)) return;
    editingReplies.add(id);
    render();
    requestAnimationFrame(()=>document.querySelector(`[data-reply-edit="${id}"]`)?.focus());
  } else if(action === 'cancel-reply-edit'){
    editingReplies.delete(id);
    render();
  } else if(action === 'save-reply-edit'){
    const post = allPosts().find(p=>p.id===t.dataset.post);
    const commentId = t.dataset.comment;
    const reply = post?.comments?.[commentId]?.replies?.[id];
    const input = document.querySelector(`[data-reply-edit="${id}"]`);
    const text = input?.value.trim();
    if(!post || !reply || !text || !canManageUserContent(reply)) return;
    t.disabled = true;
    update(ref(db, postPath(post)+'/comments/'+commentId+'/replies/'+id), { text, editedAt:Date.now() })
      .then(()=> editingReplies.delete(id))
      .catch(handleDbError)
      .finally(()=> render());
  } else if(action === 'remove-reply'){
    const post = allPosts().find(p=>p.id===t.dataset.post);
    const commentId = t.dataset.comment;
    const reply = post?.comments?.[commentId]?.replies?.[id];
    if(!post || !reply || !canManageUserContent(reply)){
      showDbError('Você não tem permissão para excluir esta resposta.');
      return;
    }
    const originalLabel = t.textContent;
    t.disabled = true;
    t.textContent = 'excluindo...';
    update(ref(db, postPath(post)+'/comments'), { [`${commentId}/replies/${id}`]:null })
      .then(()=>{
        editingReplies.delete(id);
        showSuccessToast('Resposta excluída.');
      })
      .catch(err=>{
        t.disabled = false;
        t.textContent = originalLabel;
        handleDbError(err);
      });
  } else if(action === 'send-reply'){
    const postId = t.dataset.post, commentId = id;
    if(pendingReplies.has(commentId)) return;
    const input = document.querySelector(`[data-reply-input="${commentId}"]`);
    const text = input ? input.value.trim() : '';
    if(!text) return;
    if(!ensureProfileBeforeAction()) return;
    const post = allPosts().find(p=>p.id===postId);
    if(!post) return;
    const replyId = uid();
    const profile = myProfile();
    replyDrafts.set(commentId, text);
    pendingReplies.add(commentId);
    if(input) input.disabled = true;
    t.disabled = true;
    newMuralReplies.add(replyId);
    openReplies.add(commentId);
    set(ref(db, postPath(post)+'/comments/'+commentId+'/replies/'+replyId), { author: profile.name, uid: currentUid, text, ts: Date.now() })
      .then(()=>{ replyDrafts.delete(commentId); })
      .catch(err=>{ newMuralReplies.delete(replyId); replyDrafts.set(commentId,text); handleDbError(err); })
      .finally(()=>{ pendingReplies.delete(commentId); render(); });
  }
});

document.addEventListener('toggle', (e)=>{
  const menu = e.target;
  if(!menu.matches?.('.post-more[data-post-menu]')) return;
  if(menu.open) openPostMenus.add(menu.dataset.postMenu);
  else openPostMenus.delete(menu.dataset.postMenu);
}, true);

document.addEventListener('keydown', (e)=>{
  if((e.key==='Enter'||e.key==='Escape')&&e.target.matches('[id^="edit-meta-input-"],[id^="edit-demanda-input-"]')){
    e.preventDefault();const container=e.target.closest('.item,.kanban-card');
    const action=e.key==='Enter'?(e.target.id.startsWith('edit-meta-')?'save-meta-edit':'save-demanda-edit'):(e.target.id.startsWith('edit-meta-')?'cancel-meta-edit':'cancel-demanda-edit');
    container?.querySelector(`[data-action="${action}"]`)?.click();return;
  }
  if(e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target.matches('[data-comment-input]')){
    e.preventDefault();
    const id = e.target.dataset.commentInput;
    const btn = document.querySelector(`[data-action="send-comment"][data-id="${id}"]`);
    if(btn) btn.click();
  }
  if(e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target.matches('[data-reply-input]')){
    e.preventDefault();
    const commentId = e.target.dataset.replyInput;
    const btn = document.querySelector(`[data-action="send-reply"][data-id="${commentId}"]`);
    if(btn) btn.click();
  }
  if(e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target.matches('[data-thread-reply-input]')){
    e.preventDefault();
    const key = e.target.dataset.threadReplyInput;
    const btn = [...document.querySelectorAll('[data-action="send-thread-reply"]')].find(el=>el.dataset.key===key);
    if(btn) btn.click();
  }
  if(e.key === 'Enter' && (e.metaKey || e.ctrlKey) && e.target.matches('[id^="edit-post-textarea-"]')){
    e.preventDefault();
    const id = e.target.id.replace('edit-post-textarea-', '');
    const btn = document.querySelector(`[data-action="save-post-edit"][data-id="${id}"]`);
    if(btn) btn.click();
  }
  if(e.key === 'Escape' && e.target.matches('[id^="edit-post-textarea-"]')){
    const id = e.target.id.replace('edit-post-textarea-', '');
    const btn = document.querySelector(`[data-action="cancel-post-edit"][data-id="${id}"]`);
    if(btn) btn.click();
  }
});

/* ===== central de minijogos ===== */
const gamesBtn=document.getElementById('games-btn'),gamesModal=document.getElementById('games-modal'),gamesClose=document.getElementById('games-close'),gameArena=document.getElementById('game-arena');
const GAME_SCORE_KEY='plantel_minigames_scores';
function gameScores(){try{return JSON.parse(localStorage.getItem(GAME_SCORE_KEY)||'{}')}catch{return {}}}
function addGameScore(game,points){const scores=gameScores(),name=(state.users[currentUid]?.name||'Voc\u00ea');scores[name]=scores[name]||{total:0,games:{}};scores[name].total+=points;scores[name].games[game]=(scores[name].games[game]||0)+points;localStorage.setItem(GAME_SCORE_KEY,JSON.stringify(scores));}
function gameHead(icon,title,score=''){return `<div class="game-title"><h3>${icon} ${title}</h3>${score?`<span class="game-score">${score}</span>`:''}</div>`}
gamesBtn?.addEventListener('click',()=>openModalSmooth(gamesModal));gamesClose?.addEventListener('click',()=>closeModalSmooth(gamesModal));gamesModal?.addEventListener('click',e=>{if(e.target===gamesModal)closeModalSmooth(gamesModal);const b=e.target.closest('[data-game]');if(b){document.querySelectorAll('.game-menu-btn').forEach(x=>x.classList.toggle('active',x===b));renderMiniGame(b.dataset.game)}});
function renderMiniGame(game){
 if(game==='quiz') renderQuiz(); else if(game==='memory') renderMemory(); else if(game==='mines') renderMines(); else if(game==='word') renderWord(); else if(game==='rps') renderRps(); else if(game==='sudoku') renderSudoku(); else renderRanking();
}
const quizQuestions=[['Qual planeta é conhecido como Planeta Vermelho?',['Vênus','Marte','Júpiter','Mercúrio'],1],['Quanto é 9 × 7?',['56','63','72','67'],1],['Qual linguagem roda nativamente no navegador?',['Python','Java','JavaScript','C#'],2],['A capital do Brasil é...',['Brasília','Rio de Janeiro','Salvador','São Paulo'],0]];
function renderQuiz(){const q=quizQuestions[Math.floor(Math.random()*quizQuestions.length)];gameArena.innerHTML=gameHead('🧠','Quiz diário','10 pontos')+`<p><strong>${q[0]}</strong></p><div>${q[1].map((o,i)=>`<button class="game-option" data-quiz="${i}">${o}</button>`).join('')}</div><div class="game-result" id="quiz-result"></div>`;gameArena.onclick=e=>{const b=e.target.closest('[data-quiz]');if(!b)return;const ok=+b.dataset.quiz===q[2];document.getElementById('quiz-result').textContent=ok?'Acertou! +10 pontos 🎉':'Quase! A resposta era '+q[1][q[2]];if(ok)addGameScore('Quiz',10);gameArena.querySelectorAll('[data-quiz]').forEach(x=>x.disabled=true)}}
function renderMemory(){const icons=['🌱','🚀','🎯','💡','🍀','🎨','🧠','⚡'],cards=[...icons,...icons].sort(()=>Math.random()-.5);let first=null,lock=false,pairs=0,moves=0;gameArena.innerHTML=gameHead('🃏','Jogo da memória','0/8 pares')+`<div class="memory-grid">${cards.map((v,i)=>`<button class="memory-card" data-memory="${i}" data-value="${v}">${v}</button>`).join('')}</div>`;gameArena.onclick=e=>{const b=e.target.closest('[data-memory]');if(!b||lock||b.classList.contains('open')||b.classList.contains('done'))return;b.classList.add('open');if(!first){first=b;return}moves++;if(first.dataset.value===b.dataset.value){first.classList.add('done');b.classList.add('done');first=null;pairs++;gameArena.querySelector('.game-score').textContent=`${pairs}/8 pares`;if(pairs===8){const pts=Math.max(10,100-moves*3);addGameScore('Memória',pts);setTimeout(()=>alert(`Você venceu! +${pts} pontos`),100)}}else{lock=true;setTimeout(()=>{first.classList.remove('open');b.classList.remove('open');first=null;lock=false},650)}}}
function renderMines(){const total=64,bombs=new Set;while(bombs.size<10)bombs.add(Math.floor(Math.random()*total));let ended=false,opened=0;gameArena.innerHTML=gameHead('💣','Campo minado','10 bombas')+`<div class="mine-grid">${Array.from({length:total},(_,i)=>`<button class="mine-cell" data-mine="${i}"></button>`).join('')}</div><div class="game-result" id="mine-result"></div>`;gameArena.onclick=e=>{const b=e.target.closest('[data-mine]');if(!b||ended||b.classList.contains('open'))return;const i=+b.dataset.mine;if(bombs.has(i)){b.textContent='💣';b.classList.add('bomb');ended=true;document.getElementById('mine-result').textContent='A bomba explodiu! Tente novamente.';return}const r=Math.floor(i/8),c=i%8;let n=0;for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++){const j=(r+y)*8+c+x;if(r+y>=0&&r+y<8&&c+x>=0&&c+x<8&&bombs.has(j))n++}b.textContent=n||'';b.classList.add('open');opened++;if(opened===54){ended=true;addGameScore('Campo minado',80);document.getElementById('mine-result').textContent='Campo limpo! +80 pontos 🎉'}}}
function renderWord(){const words=['METAS','FOCAR','EQUIPE','IDEIA','PLANO'],answer=words[Math.floor(Math.random()*words.length)],tries=[];let ended=false;gameArena.innerHTML=gameHead('🔤','Termo','5 letras')+`<div id="word-board"></div><div class="word-input-row"><input class="field" id="word-input" maxlength="5" placeholder="PALAVRA"><button class="btn btn-primary" id="word-send">Tentar</button></div><div class="game-result" id="word-result"></div>`;const send=()=>{if(ended)return;const input=document.getElementById('word-input'),guess=input.value.toUpperCase().trim();if(guess.length!==5)return;tries.push(guess);document.getElementById('word-board').innerHTML=tries.map(w=>`<div class="word-row">${[...w].map((l,i)=>`<span class="word-cell ${l===answer[i]?'hit':answer.includes(l)?'near':''}">${l}</span>`).join('')}</div>`).join('');input.value='';if(guess===answer){ended=true;input.disabled=true;addGameScore('Termo',Math.max(20,70-tries.length*10));document.getElementById('word-result').textContent='Acertou! 🎉'}else if(tries.length>=6){ended=true;document.getElementById('word-result').textContent='A palavra era '+answer;input.disabled=true}};document.getElementById('word-send').onclick=send;document.getElementById('word-input').onkeydown=e=>{if(e.key==='Enter')send()}}
function renderRps(){gameArena.innerHTML=gameHead('✊','Pedra, papel e tesoura','melhor de uma')+`<div class="rps-grid"><button class="rps-choice" data-rps="0">✊<small>Pedra</small></button><button class="rps-choice" data-rps="1">✋<small>Papel</small></button><button class="rps-choice" data-rps="2">✌️<small>Tesoura</small></button></div><div class="game-result" id="rps-result"></div>`;gameArena.onclick=e=>{const b=e.target.closest('[data-rps]');if(!b)return;const me=+b.dataset.rps,cpu=Math.floor(Math.random()*3),names=['Pedra','Papel','Tesoura'],win=(me-cpu+3)%3;document.getElementById('rps-result').textContent=`Você: ${names[me]} · Plantel: ${names[cpu]} — ${win===0?'Empate!':win===1?'Você venceu! +10 pontos':'Plantel venceu!'}`;if(win===1)addGameScore('PPT',10)}}
const sudokuPuzzle='530070000600195000098000060800060003400803001700020006060000280000419005000080079',sudokuSolution='534678912672195348198342567859761423426853791713924856961537284287419635345286179';
function renderSudoku(){let rewarded=false;gameArena.innerHTML=gameHead('🔢','Sudoku','clássico')+`<div class="sudoku-grid">${[...sudokuPuzzle].map((v,i)=>v!=='0'?`<input class="sudoku-cell fixed" value="${v}" disabled>`:`<input class="sudoku-cell" data-sudoku="${i}" maxlength="1" inputmode="numeric">`).join('')}</div><div style="text-align:center;margin-top:14px"><button class="btn btn-primary" id="sudoku-check">Conferir</button></div><div class="game-result" id="sudoku-result"></div>`;document.getElementById('sudoku-check').onclick=()=>{let complete=true,correct=true;gameArena.querySelectorAll('[data-sudoku]').forEach(i=>{i.value=i.value.replace(/[^1-9]/g,'');const ok=i.value===sudokuSolution[+i.dataset.sudoku];i.classList.toggle('bad',i.value&&!ok);if(!i.value)complete=false;if(!ok)correct=false});const result=document.getElementById('sudoku-result');if(complete&&correct){result.textContent='Sudoku concluído! +150 pontos 🎉';if(!rewarded){rewarded=true;addGameScore('Sudoku',150)}}else result.textContent=complete?'Existem números incorretos.':'Continue: ainda faltam casas.'}}
function renderRanking(){const rows=Object.entries(gameScores()).sort((a,b)=>b[1].total-a[1].total);gameArena.innerHTML=gameHead('🏆','Ranking semanal','local neste navegador')+`<div class="ranking-list">${rows.length?rows.map(([name,s],i)=>`<div class="ranking-row"><strong>${i+1}º</strong><span>${escapeHtml(name)}</span><span class="game-score">${s.total} pts</span></div>`).join(''):'<div class="empty">Jogue uma partida para inaugurar o ranking.</div>'}</div>`}

render();
