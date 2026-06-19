// DocSign Application Logic - Hebrew & RTL Support

// ================= STATE MANAGEMENT =================
const state = {
    contracts: [],
    signatures: []
};

async function loadStateFromServer() {
    try {
        const [contractsRes, signaturesRes] = await Promise.all([
            fetch('/api/contracts'),
            fetch('/api/signatures')
        ]);
        state.contracts = await contractsRes.json();
        state.signatures = await signaturesRes.json();
        updateDashboardStats();
    } catch (err) {
        console.error('Failed to load state from server:', err);
    }
}

// ================= AUTH (Client) =================
async function initAuth() {
    try {
        // Fetch current session
        const curRes = await fetch('/api/current-user');
        const cur = await curRes.json();
        window.currentUser = cur.authenticated ? cur.user : null;

        renderAuthControls();
    } catch (err) {
        console.error('initAuth failed:', err);
    }
}

function renderAuthControls() {
    const shell = document.getElementById('auth-shell');
    if (!shell) return;
    shell.innerHTML = '';

    if (window.currentUser) {
        const span = document.createElement('span');
        span.style.fontSize = '0.95rem';
        span.style.color = 'var(--text-secondary)';
        span.textContent = window.currentUser.name || window.currentUser.username || 'משתמש';
        shell.appendChild(span);

        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary btn-sm';
        btn.style.marginInlineStart = '8px';
        btn.textContent = 'התנתק';
        btn.onclick = async () => { await signOut(); };
        shell.appendChild(btn);

        const adminCard = document.getElementById('admin-management-card');
        if (adminCard) adminCard.style.display = (window.currentUser.isAdmin ? 'block' : 'none');
        if (window.currentUser.isAdmin) fetchAndRenderAdmins();
    } else {
        const loginBtn = document.createElement('button');
        loginBtn.className = 'btn btn-primary btn-sm';
        loginBtn.textContent = 'כניסה למנהל';
        loginBtn.onclick = showLoginModal;
        shell.appendChild(loginBtn);

        const adminCard = document.getElementById('admin-management-card');
        if (adminCard) adminCard.style.display = 'none';
    }
}

function showLoginModal() {
    let modal = document.getElementById('login-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'login-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-card">
                <div class="modal-header">
                    <h3>כניסת מנהל</h3>
                    <button class="modal-close" id="login-modal-close">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="login-username">שם משתמש</label>
                        <input id="login-username" class="form-control" autocomplete="username" />
                    </div>
                    <div class="form-group">
                        <label for="login-password">סיסמה</label>
                        <input id="login-password" type="password" class="form-control" autocomplete="current-password" />
                    </div>
                    <div id="login-error" class="text-danger" style="display:none;margin-bottom:12px;"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="login-modal-cancel">ביטול</button>
                    <button class="btn btn-primary" id="login-modal-submit">התחבר</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('login-modal-close').onclick = closeLoginModal;
        document.getElementById('login-modal-cancel').onclick = closeLoginModal;
        document.getElementById('login-modal-submit').onclick = loginAdmin;
    }
    modal.style.display = 'flex';
}

function closeLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) modal.style.display = 'none';
}

async function loginAdmin() {
    const username = document.getElementById('login-username')?.value || '';
    const password = document.getElementById('login-password')?.value || '';
    const error = document.getElementById('login-error');
    if (error) {
        error.style.display = 'none';
        error.textContent = '';
    }

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text || '{}');
        } catch (jsonErr) {
            throw new Error('Invalid server response: ' + text);
        }

        if (!res.ok) {
            throw new Error(data.error || 'Login failed');
        }

        window.currentUser = data.user;
        closeLoginModal();
        renderAuthControls();
        handleRoute();
    } catch (err) {
        if (error) {
            error.style.display = 'block';
            error.textContent = err.message || 'שגיאה בכניסה';
        }
    }
}

async function signOut() {
    try {
        await fetch('/api/auth/signout', { method: 'POST' });
    } catch (e) {
        console.error('Signout failed', e);
    }
    window.currentUser = null;
    renderAuthControls();
}

async function fetchAndRenderAdmins() {
    try {
        const res = await fetch('/api/admins');
        if (!res.ok) throw new Error('not allowed');
        const admins = await res.json();
        const list = document.getElementById('admins-list');
        if (!list) return;
        list.innerHTML = '';
        admins.forEach(a => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.padding = '6px 0';
            row.innerHTML = `<div>${a}</div>`;
            const del = document.createElement('button');
            del.className = 'btn btn-secondary btn-sm';
            del.textContent = 'הסר';
            del.onclick = async () => {
                await fetch('/api/admins', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: a }) });
                await fetchAndRenderAdmins();
            };
            row.appendChild(del);
            list.appendChild(row);
        });
    } catch (err) {
        console.error('Failed to fetch admins:', err);
    }
}

document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'btn-add-admin') {
        const input = document.getElementById('admin-email-input');
        if (!input) return;
        const email = input.value && input.value.trim();
        if (!email) { showToast('הזן דוא"ל תקין', 'error'); return; }
        fetch('/api/admins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
            .then(r => r.json())
            .then(() => { input.value = ''; fetchAndRenderAdmins(); showToast('מנהל נוסף בהצלחה', 'success'); })
            .catch(err => { console.error(err); showToast('שגיאה בהוספת מנהל', 'error'); });
    }
});

// ================= TOAST NOTIFICATIONS =================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast-notification');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');
    
    toastMessage.textContent = message;
    
    // Reset classes
    toast.className = 'toast';
    toast.classList.add('active');
    
    if (type === 'success') {
        toast.classList.add('toast-success');
        toastIcon.className = 'fa-solid fa-circle-check';
        toastIcon.style.color = 'var(--success)';
    } else if (type === 'error') {
        toast.classList.add('toast-error');
        toastIcon.className = 'fa-solid fa-circle-xmark';
        toastIcon.style.color = 'var(--error)';
    } else {
        toastIcon.className = 'fa-solid fa-info-circle';
        toastIcon.style.color = 'var(--primary)';
    }
    
    setTimeout(() => {
        toast.classList.remove('active');
    }, 4000);
}

// ================= UTF-8 BASE64 ENCODERS & PARSERS =================
function utf8Btoa(str) {
    const base64 = btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode(parseInt(p1, 16));
    }));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function utf8Atob(str) {
    // Restore padding and URL-safe characters
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
    while (base64.length % 4) {
        base64 += '=';
    }
    try {
        return decodeURIComponent(Array.prototype.map.call(atob(base64), function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    } catch (e) {
        try {
            return atob(base64); // Fallback
        } catch (err) {
            console.error('Base64 decode failed:', err);
            return '';
        }
    }
}

function parseHashParams() {
    let hash = window.location.hash || '';
    
    // Decodes URL-encoded hash components (%3F for ?, %3D for =, %26 for &) 
    // which are often aggressively encoded by mobile browsers and WhatsApp.
    if (hash.includes('%3F') || hash.includes('%3f') || hash.includes('%3D') || hash.includes('%3d')) {
        hash = decodeURIComponent(hash);
    }
    
    const paramIndex = hash.indexOf('?');
    if (paramIndex === -1) return {};
    
    const paramString = hash.substring(paramIndex + 1);
    const params = {};
    const pairs = paramString.split('&');
    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i].split('=');
        if (pair.length === 2) {
            params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
        }
    }
    return params;
}

// ================= ROUTER LOGIC =================
function initRouter() {
    window.addEventListener('hashchange', handleRoute);
    // Initial route check
    handleRoute();
}

function handleRoute() {
    const pathname = window.location.pathname || '/';
    const cleanPath = pathname.replace(/\/+$/, '');
    const validPathRoutes = ['/admin', '/sign', '/create-contract'];

    if (!window.location.hash && validPathRoutes.includes(cleanPath)) {
        let hashValue = '#sign';
        if (cleanPath === '/admin') hashValue = '#admin';
        else if (cleanPath === '/create-contract') hashValue = '#create-contract';

        const query = window.location.search || '';
        window.location.replace(`${window.location.origin}/#${hashValue.substring(1)}${query}`);
        return;
    }

    const defaultHash = (window.currentUser && window.currentUser.isAdmin) ? '#admin' : '#sign';
    const hash = window.location.hash || defaultHash;
    const adminView = document.getElementById('admin-view');
    const clientView = document.getElementById('client-view');
    const mainNav = document.getElementById('main-nav');

    // Reset nav link active states
    document.querySelectorAll('.btn-nav').forEach(link => link.classList.remove('active'));

    if (hash.startsWith('#import-sig')) {
        // Admin importing signature via link
        adminView.style.display = 'none';
        mainNav.style.display = 'none';
        clientView.style.display = 'none';

        const params = parseHashParams();
        importSignature(params);
        return;
    }

    if (hash.startsWith('#sign')) {
        // Recipient Signing view
        adminView.style.display = 'none';
        mainNav.style.display = 'none';
        clientView.style.display = 'block';

        const params = parseHashParams();
        let contractId = params.id;
        let title = params.t ? utf8Atob(params.t) : '';
        let body = params.b ? utf8Atob(params.b) : '';

        // Fallback for old link format #sign-CONTRACT_ID
        const oldMatch = hash.match(/^#sign-(con_[a-zA-Z0-9_]+)$/);
        if (oldMatch && !contractId) {
            contractId = oldMatch[1];
        }

        // Secondary fallback checking URL search params
        if (!contractId) {
            const urlParams = new URLSearchParams(window.location.search);
            contractId = urlParams.get('contractId') || urlParams.get('id');
        }

        loadClientSigningView(contractId, title, body);
        return;
    }

    // Admin routes are only allowed for authenticated admins.
    if (!window.currentUser || !window.currentUser.isAdmin) {
        showToast('נדרש כניסה עם חשבון מנהל כדי לגשת לממשק הניהול.', 'error');
        window.location.hash = '#sign';
        return;
    }

    // Show Admin Panels
    clientView.style.display = 'none';
    adminView.style.display = 'block';
    mainNav.style.display = 'flex';

    if (hash === '#create-contract') {
        document.getElementById('nav-create').classList.add('active');
        document.getElementById('create-contract-card').scrollIntoView({ behavior: 'smooth' });
    } else {
        document.getElementById('nav-dashboard').classList.add('active');
    }

    loadAdminDashboard();
}

// ================= SIGNATURE DRAWING PAD CLASS =================
class SignaturePad {
    constructor(canvasId, clearBtnId, instructionTextId) {
        this.canvas = document.getElementById(canvasId);
        this.clearBtn = document.getElementById(clearBtnId);
        this.instructionText = document.getElementById(instructionTextId);
        this.ctx = this.canvas.getContext('2d');
        
        this.isDrawing = false;
        this.hasDrawn = false;
        
        // P2P stroke coordinate logger
        this.strokes = [];
        this.currentStroke = null;
        
        // Configure line styles for ultra premium signature look
        this.ctx.strokeStyle = '#0f172a'; // Deep slate dark blue ink
        this.ctx.lineWidth = 2.5;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.initEvents();
        this.resizeCanvas();
        
        // Handle screen resizing
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        
        // Do not resize if hidden (width is 0)
        if (rect.width === 0) return;
        
        // Only resize if the width has actually changed
        if (this.canvas.width === Math.round(rect.width)) return;
        
        this.canvas.width = rect.width;
        this.canvas.height = 180; // Keep fixed layout height
        
        // Restore styles as resizing clears canvas state
        this.ctx.strokeStyle = '#0f172a';
        this.ctx.lineWidth = 2.5;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Synchronously redraw all stroke paths
        if (this.strokes && this.strokes.length > 0) {
            this.strokes.forEach(stroke => {
                if (stroke.length === 0) return;
                this.ctx.beginPath();
                this.ctx.moveTo(stroke[0].x, stroke[0].y);
                for (let i = 1; i < stroke.length; i++) {
                    this.ctx.lineTo(stroke[i].x, stroke[i].y);
                }
                this.ctx.stroke();
            });
        }
    }
    
    initEvents() {
        // Mouse drawing
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        window.addEventListener('mouseup', () => this.stopDrawing());
        
        // Mobile Touch drawing
        this.canvas.addEventListener('touchstart', (e) => this.startDrawing(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.draw(e), { passive: false });
        window.addEventListener('touchend', () => this.stopDrawing());
        
        // Clear canvas functionality
        this.clearBtn.addEventListener('click', () => this.clear());
    }
    
    getXY(e) {
        const rect = this.canvas.getBoundingClientRect();
        
        // Handle mobile touch coordinates
        if (e.touches && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
        
        // Handle mouse coordinates
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
    
    startDrawing(e) {
        // Prevents page scrolling on mobile swipe while drawing
        if (e.cancelable) e.preventDefault();
        
        this.isDrawing = true;
        this.hasDrawn = true;
        this.instructionText.style.opacity = '0';
        
        const coords = this.getXY(e);
        this.ctx.beginPath();
        this.ctx.moveTo(coords.x, coords.y);
        
        // Start stroke logging
        this.currentStroke = [{ x: Math.round(coords.x), y: Math.round(coords.y) }];
    }
    
    draw(e) {
        if (!this.isDrawing) return;
        if (e.cancelable) e.preventDefault();
        
        const coords = this.getXY(e);
        this.ctx.lineTo(coords.x, coords.y);
        this.ctx.stroke();
        
        // Log point
        if (this.currentStroke) {
            this.currentStroke.push({ x: Math.round(coords.x), y: Math.round(coords.y) });
        }
    }
    
    stopDrawing() {
        this.isDrawing = false;
        
        // Commit stroke log
        if (this.currentStroke && this.currentStroke.length > 0) {
            this.strokes.push(this.currentStroke);
            this.currentStroke = null;
        }
    }
    
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.hasDrawn = false;
        this.strokes = [];
        this.currentStroke = null;
        this.instructionText.style.opacity = '1';
    }
    
    isEmpty() {
        return !this.hasDrawn;
    }
    
    getDataUrl() {
        return this.canvas.toDataURL();
    }
    
    getCompressedStrokes() {
        // Encodes coordinates compactly to fit WhatsApp link sizes perfectly
        // Format: X,Y;X,Y;X,Y|X,Y;X,Y...
        return this.strokes.map(stroke => 
            stroke.map(p => `${p.x},${p.y}`).join(';')
        ).join('|');
    }
}

// Global reference for Signature Pad instances
let signaturePadInstance = null;

// ================= CLIENT SIGNING VIEW =================
async function loadClientSigningView(contractId, urlTitle = '', urlBody = '') {
    let contract = state.contracts.find(c => c.id === contractId);
    
    // Try to load direct contract data from server if not cached locally
    if (!contract && contractId) {
        try {
            const res = await fetch(`/api/contracts/${contractId}`);
            if (res.ok) {
                contract = await res.json();
            }
        } catch (err) {
            console.error('Failed to fetch contract from server:', err);
        }
    }
    
    // Decodes the contract from the URL parameters if not stored locally! (Solves "Contract not found" on different devices)
    if (!contract && urlTitle && urlBody) {
        contract = {
            id: contractId,
            title: urlTitle,
            body: urlBody,
            createdAt: new Date().toISOString()
        };
    }
    
    const clientContractTitle = document.getElementById('client-contract-title');
    const clientContractBody = document.getElementById('client-contract-body');
    const signingScreen = document.getElementById('signing-screen');
    const successScreen = document.getElementById('success-screen');
    const signForm = document.getElementById('sign-form');
    
    // Reset screens
    signingScreen.style.display = 'block';
    successScreen.style.display = 'none';
    signForm.reset();
    
    if (!contract) {
        clientContractTitle.textContent = "החוזה לא נמצא";
        clientContractBody.innerHTML = `<div style="color: var(--error); text-align: center; font-weight: bold; padding: 20px 0;">
            שגיאה: החוזה המבוקש אינו קיים במערכת או שהקישור אינו תקין.
        </div>`;
        signForm.style.display = 'none';
        return;
    }
    
    // Populate contract text
    signForm.style.display = 'block';
    clientContractTitle.textContent = contract.title;

    let fileBlock = '';
    if (contract.fileName && contract.fileData) {
        const dataUrl = `data:${contract.fileType || 'application/octet-stream'};base64,${contract.fileData}`;
        const isMainlyPdf = (contract.fileType || '').includes('pdf') || contract.fileName.toLowerCase().endsWith('.pdf');
        
        if (isMainlyPdf) {
            fileBlock = `
                <div style="border: 1px solid var(--border-color); border-radius: 10px; margin-bottom: 16px; overflow: hidden; background: #f5f5f5;">
                    <embed src="${dataUrl}" type="application/pdf" style="width: 100%; height: 90vh; border: none;" title="Contract PDF"></embed>
                </div>`;
        } else {
            fileBlock = `
                <div style="border: 1px solid var(--border-color); padding: 16px; border-radius: 10px; margin-bottom: 16px; background: rgba(255,255,255,0.95);">
                    <p style="margin: 0 0 8px; color: var(--text-secondary);"><i class="fa-solid fa-file"></i> קובץ חוזה מצורף: ${escapeHtml(contract.fileName)}</p>
                    <p style="margin: 0; color: var(--text-muted); font-size: 0.9rem;">קובץ זה אינו ניתן להצגה בתצוגה מקוונת. אנא קרא את הפרטים המוצגים להלן או צור קשר למנהל.</p>
                </div>`;
        }
    }

    if (contract.body && contract.body.trim()) {
        clientContractBody.innerHTML = `${fileBlock}<div class="contract-body-text">${escapeHtml(contract.body).replace(/\n/g, '<br>')}</div>`;
    } else if (fileBlock) {
        clientContractBody.innerHTML = fileBlock;
    } else {
        clientContractBody.textContent = contract.body;
    }
    
    // Initialize Signature Pad for client safely (lazy loaded)
    setTimeout(() => {
        if (!signaturePadInstance) {
            signaturePadInstance = new SignaturePad('signature-canvas', 'btn-clear-canvas', 'canvas-instruction-text');
        } else {
            signaturePadInstance.resizeCanvas();
        }
        signaturePadInstance.clear();
    }, 100);
}

// Handle client form submit and sign save
document.getElementById('sign-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    
    if (!signaturePadInstance || signaturePadInstance.isEmpty()) {
        showToast('אנא חתום בתיבת החתימה המיועדת לפני השליחה.', 'error');
        return;
    }
    
    const params = parseHashParams();
    let contractId = params.id;
    if (!contractId) {
        const hash = window.location.hash || '';
        const oldMatch = hash.match(/^#sign-(con_[a-zA-Z0-9_]+)$/);
        contractId = oldMatch ? oldMatch[1] : 'con_custom';
    }
    
    const name = document.getElementById('client-name').value.trim();
    const idNumber = document.getElementById('client-id').value.trim();
    const apartmentNumber = document.getElementById('client-apartment').value.trim();
    const phone = document.getElementById('client-phone').value.trim();
    
    const signatureDataUrl = signaturePadInstance.getDataUrl();
    const compressedStrokes = signaturePadInstance.getCompressedStrokes();
    
    const contractTitle = document.getElementById('client-contract-title').textContent;
    const contractBody = document.getElementById('client-contract-body').textContent;
    
    // Archive exact contract contents inside signature object to preserve original document state
    const newSignature = {
        id: 'sig_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        contractId: contractId,
        name: name,
        idNumber: idNumber,
        apartmentNumber: apartmentNumber,
        phone: phone,
        signatureDataUrl: signatureDataUrl,
        signedAt: new Date().toISOString(),
        contractTitle: contractTitle,
        contractBody: contractBody
    };
    
    try {
        const response = await fetch('/api/signatures', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSignature)
        });
        
        if (response.status === 409) {
            showToast('כבר קיימת חתימה עם תעודת זהות זו עבור חוזה זה.', 'error');
            return;
        }
        
        if (!response.ok) throw new Error('Failed to save signature on server');
        
        // Render dynamic Hebrew timestamp for success screen
        const now = new Date();
        const formattedDate = now.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const formattedTime = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        document.getElementById('success-timestamp').textContent = `נחתם בתאריך ${formattedDate} בשעה ${formattedTime}`;
        
        // Build simple notice WhatsApp link (as database is synced!)
        const whatsappMessage = `היי! חתמתי כעת על החוזה "${contractTitle}".\n\nלהלן פרטי האישור שלי:\n👤 שם מלא: ${name}\n🆔 תעודת זהות: ${idNumber}\n🏠 דירה: ${apartmentNumber}\n📞 טלפון: ${phone}\n\nהחתימה נקלטה ונשמרה בלוח הבקרה שלך.`;
        
        const whatsappBtn = document.getElementById('btn-share-whatsapp');
        whatsappBtn.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;
        
        // Display WhatsApp Sync UI Block
        document.getElementById('whatsapp-share-container').style.display = 'block';
        
        // Transitions UI to success
        document.getElementById('signing-screen').style.display = 'none';
        document.getElementById('success-screen').style.display = 'block';
        
        // Scroll window smoothly to success message
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast('החתימה שלך נרשמה בהצלחה!', 'success');
    } catch (err) {
        console.error(err);
        showToast('שגיאה בשמירת החתימה בשרת.', 'error');
    }
});

// ================= ADMIN DASHBOARD PANELS =================
async function loadAdminDashboard() {
    await loadStateFromServer();
    renderContractsList();
    renderSignaturesTable();
    updateDashboardStats();
    populateContractFilters();
}

function updateDashboardStats() {
    const activeContractsCount = state.contracts.length;
    const totalSignaturesCount = state.signatures.length;
    
    document.getElementById('stats-total-contracts').textContent = activeContractsCount;
    document.getElementById('stats-total-signatures').textContent = totalSignaturesCount;
    
    // Calculate basic progress estimate (signatures per active contract)
    let completionPercentage = 0;
    if (activeContractsCount > 0) {
        completionPercentage = Math.min(Math.round((totalSignaturesCount / (activeContractsCount * 10)) * 100), 100);
    }
    document.getElementById('stats-completion-rate').textContent = `${completionPercentage}%`;
}

// Generate shareable link containing full contract text encoded in base64
function getShareableLink(contractId) {
    const contract = state.contracts.find(c => c.id === contractId);
    if (!contract) return window.location.href.split('#')[0];
    
    const cleanUrl = window.location.href.split('#')[0].split('?')[0];
    const encodedTitle = utf8Btoa(contract.title);
    const encodedBody = utf8Btoa(contract.body);
    
    return `${cleanUrl}#sign?id=${contract.id}&t=${encodedTitle}&b=${encodedBody}`;
}

function renderContractsList() {
    const container = document.getElementById('contracts-list-container');
    const placeholder = document.getElementById('no-contracts-placeholder');
    
    // Clear only rendered contract items, leaving the placeholder intact in the DOM
    const items = container.querySelectorAll('.contract-list-item');
    items.forEach(item => item.remove());
    
    if (state.contracts.length === 0) {
        if (placeholder) placeholder.style.display = 'block';
        return;
    }
    
    if (placeholder) placeholder.style.display = 'none';
    
    state.contracts.forEach(contract => {
        const item = document.createElement('div');
        item.className = 'contract-list-item';
        
        const count = state.signatures.filter(s => s.contractId === contract.id).length;
        const creationDate = new Date(contract.createdAt).toLocaleDateString('he-IL');
        
        item.innerHTML = `
            <div class="contract-meta">
                <h4>${escapeHtml(contract.title)}</h4>
                <span>נוצר ב-${creationDate} | סך הכל חתמו: <strong>${count}</strong> אנשים</span>
            </div>
            <div class="contract-actions">
                <button class="btn btn-secondary btn-sm" onclick="copyShareLink('${contract.id}')" title="העתק קישור לחתימה">
                    <i class="fa-solid fa-share-nodes"></i> העתק קישור
                </button>
                <button class="btn btn-sm btn-secondary" onclick="scrollToSignatures('${contract.id}')" title="צפה בחתימות">
                    <i class="fa-solid fa-list"></i> צפה בחתימות
                </button>
                <button class="btn btn-sm btn-secondary" onclick="downloadContractPDF('${contract.id}')" title="הורד חוזה כ-PDF">
                    <i class="fa-solid fa-file-pdf"></i> הורד PDF
                </button>
                <button class="btn btn-sm btn-secondary" onclick="openEditContract('${contract.id}')" title="ערוך חוזה">
                    <i class="fa-solid fa-pen-to-square"></i> ערוך
                </button>
                <button class="btn btn-sm" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3);" onclick="deleteContract('${contract.id}')" title="מחק חוזה">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(item);
    });
}

function copyShareLink(contractId) {
    const link = getShareableLink(contractId);
    
    // Check if navigator.clipboard is available (only in secure HTTPS contexts)
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link)
            .then(() => {
                showToast('הקישור לחתימת החוזה הועתק ללוח בהצלחה!', 'success');
            })
            .catch(err => {
                fallbackCopy(link);
            });
    } else {
        fallbackCopy(link);
    }
}

function fallbackCopy(link) {
    try {
        const input = document.createElement('textarea');
        input.value = link;
        input.style.position = 'fixed';
        input.style.top = '0';
        input.style.left = '0';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.focus();
        input.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(input);
        
        if (successful) {
            showToast('הקישור לחתימת החוזה הועתק ללוח!', 'success');
        } else {
            promptCopy(link);
        }
    } catch (err) {
        promptCopy(link);
    }
}

function promptCopy(link) {
    window.prompt("לא הצלחנו להעתיק אוטומטית. העתק את הקישור מכאן:", link);
}

// Delete contract
window.deleteContract = async function(contractId) {
    if (confirm('האם אתה בטוח שברצונך למחוק את החוזה? פעולה זו תמחק גם את כל החתימות המשויכות אליו!')) {
        try {
            const response = await fetch(`/api/contracts/${contractId}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete contract');
            
            await loadAdminDashboard();
            showToast('החוזה והחתימות המשויכות אליו נמחקו בהצלחה.', 'success');
        } catch (err) {
            console.error(err);
            showToast('שגיאה במחיקת החוזה מהשרת.', 'error');
        }
    }
};

window.copyShareLink = copyShareLink;
window.scrollToSignatures = function(contractId) {
    const filterSelect = document.getElementById('filter-contract-select');
    filterSelect.value = contractId;
    renderSignaturesTable(contractId);
    document.getElementById('signatures-section').scrollIntoView({ behavior: 'smooth' });
};

// ================= EDIT CONTRACT =================
window.openEditContract = function(contractId) {
    const contract = state.contracts.find(c => c.id === contractId);
    if (!contract) return;
    
    document.getElementById('edit-contract-id').value = contract.id;
    document.getElementById('edit-contract-title').value = contract.title;
    document.getElementById('edit-contract-body').value = contract.body || '';
    document.getElementById('edit-contract-current-file').textContent = contract.fileName ? `קובץ נוכחי: ${contract.fileName}` : 'אין קובץ מצורף';
    document.getElementById('edit-contract-file').value = '';
    document.getElementById('edit-contract-modal').classList.add('active');
    // Render attachments list
    const attachList = document.getElementById('edit-contract-attachments-list');
    if (attachList) {
        attachList.innerHTML = '';
        const attachments = contract.attachments || [];
        if (attachments.length === 0) {
            attachList.textContent = 'אין נספחים מצורפים';
        } else {
            attachments.forEach(a => {
                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.justifyContent = 'space-between';
                row.style.alignItems = 'center';
                row.style.padding = '4px 0';
                const left = document.createElement('div');
                left.textContent = a.fileName;
                const del = document.createElement('button');
                del.className = 'btn btn-secondary btn-sm';
                del.textContent = 'הסרה';
                del.onclick = async () => {
                    try {
                        const res = await fetch(`/api/contracts/${contract.id}/attachments`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: a.fileName }) });
                        if (!res.ok) throw new Error('Failed');
                        const data = await res.json();
                        contract.attachments = data.attachments || [];
                        openEditContract(contractId);
                    } catch (err) {
                        console.error(err);
                        showToast('שגיאה בהסרת נספח', 'error');
                    }
                };
                row.appendChild(left);
                row.appendChild(del);
                attachList.appendChild(row);
            });
        }
    }
};

function closeEditModal() {
    document.getElementById('edit-contract-modal').classList.remove('active');
}

document.getElementById('btn-close-edit-modal').addEventListener('click', closeEditModal);
document.getElementById('btn-cancel-edit').addEventListener('click', closeEditModal);
document.getElementById('edit-contract-modal').addEventListener('click', function(e) {
    if (e.target === this) closeEditModal();
});

async function readContractFileInput(inputId) {
    const fileInput = document.getElementById(inputId);
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) return null;

    const file = fileInput.files[0];
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type) && !/\.(pdf|docx)$/i.test(file.name)) {
        showToast('סוג הקובץ חייב להיות PDF או DOCX.', 'error');
        return false;
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            if (typeof result !== 'string') {
                return reject(new Error('Invalid file reader result'));
            }
            const base64 = result.split(',')[1] || '';
            resolve({
                fileName: file.name,
                fileType: file.type || (file.name.toLowerCase().endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf'),
                fileData: base64
            });
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

document.getElementById('edit-contract-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const contractId = document.getElementById('edit-contract-id').value;
    const newTitle = document.getElementById('edit-contract-title').value.trim();
    const newBody  = document.getElementById('edit-contract-body').value.trim();
    const filePayload = await readContractFileInput('edit-contract-file');
    if (filePayload === false) return;

    if (!newTitle) {
        showToast('הזן שם חוזה תקין.', 'error');
        return;
    }

    const updatePayload = { title: newTitle, body: newBody };
    if (filePayload) {
        updatePayload.fileName = filePayload.fileName;
        updatePayload.fileType = filePayload.fileType;
        updatePayload.fileData = filePayload.fileData;
    }

    try {
        const response = await fetch(`/api/contracts/${contractId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatePayload)
        });
        
        if (!response.ok) throw new Error('Failed to update contract');
        
        await loadAdminDashboard();
        closeEditModal();
        showToast('החוזה עודכן בהצלחה!', 'success');
    } catch (err) {
        console.error(err);
        showToast('שגיאה בעדכון החוזה בשרת.', 'error');
    }
});

// Upload attachment button
document.getElementById('btn-upload-attachment').addEventListener('click', async function() {
    const contractId = document.getElementById('edit-contract-id').value;
    const fileInput = document.getElementById('edit-contract-attachment');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) { showToast('בחר קובץ PDF להעלאה', 'error'); return; }
    const file = fileInput.files[0];
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') { showToast('הנספח חייב להיות PDF.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
        const base64 = (reader.result || '').split(',')[1] || '';
        try {
            const resp = await fetch(`/api/contracts/${contractId}/attachments`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: file.name, fileType: file.type || 'application/pdf', fileData: base64 })
            });
            if (!resp.ok) throw new Error('Upload failed');
            const data = await resp.json();
            const contract = state.contracts.find(c => c.id === contractId);
            if (contract) contract.attachments = data.attachments || [];
            openEditContract(contractId);
            showToast('נספח נוסף בהצלחה', 'success');
            fileInput.value = '';
        } catch (err) {
            console.error(err);
            showToast('שגיאה בהעלאת נספח', 'error');
        }
    };
    reader.readAsDataURL(file);
});

// ================= DELETE SINGLE SIGNATURE =================
window.deleteSignature = async function(sigId) {
    if (!confirm('האם אתה בטוח שברצונך למחוק את החתימה הזו?')) return;
    try {
        const response = await fetch(`/api/signatures/${sigId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete signature');
        
        await loadStateFromServer();
        const filterVal = document.getElementById('filter-contract-select').value;
        renderSignaturesTable(filterVal);
        updateDashboardStats();
        showToast('החתימה נמחקה בהצלחה.', 'success');
    } catch (err) {
        console.error(err);
        showToast('שגיאה במחיקת החתימה מהשרת.', 'error');
    }
};

// ================= PDF GENERATION =================
let assistantFontBase64 = null;

async function fetchFontAsBase64(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const buffer = await response.arrayBuffer();
    
    // Convert ArrayBuffer to base64 safely
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

async function loadHebrewFonts() {
    if (assistantFontBase64) return true;
    
    showToast('טוען גופנים בעברית להפקת PDF...', 'info');
    
    try {
        assistantFontBase64 = await fetchFontAsBase64('/fonts/Assistant-wght.ttf');
        return true;
    } catch (err) {
        console.error('Failed to load Hebrew fonts:', err);
        return false;
    }
}

function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

async function mergePdfBuffers(...pdfBuffers) {
    if (!window.PDFLib || !PDFLib.PDFDocument) {
        throw new Error('PDFLib is not available.');
    }

    const mergedPdf = await PDFLib.PDFDocument.create();
    for (const buffer of pdfBuffers) {
        const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
        const pdfDoc = await PDFLib.PDFDocument.load(bytes);
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
    }
    return mergedPdf.save();
}

window.downloadSignaturePDF = async function(sigId) {
    const sig = state.signatures.find(s => s.id === sigId);
    if (!sig) return;
    
    // Lazy load Hebrew font asset for PDF generation
    const fontsLoaded = await loadHebrewFonts();
    if (!fontsLoaded) {
        showToast('אזהרה: לא ניתן היה לטעון את גופני העברית. ה-PDF יופק עם גופני ברירת מחדל.', 'error');
    }
    
    const contractTitle = sig.contractTitle || (state.contracts.find(c => c.id === sig.contractId)?.title || 'חוזה');
    const contractBody  = sig.contractBody  || (state.contracts.find(c => c.id === sig.contractId)?.body || '');
    const contractFile = state.contracts.find(c => c.id === sig.contractId) || {};
    await generateSignedPDF(contractTitle, contractBody, [sig], contractFile);
};

window.downloadContractPDF = async function(contractId) {
    let contract = state.contracts.find(c => c.id === contractId);
    if (!contract && contractId) {
        try {
            const res = await fetch(`/api/contracts/${contractId}`);
            if (res.ok) contract = await res.json();
        } catch (err) {
            console.error('Failed to fetch contract for PDF:', err);
        }
    }

    if (!contract) {
        showToast('לא ניתן למצוא את החוזה ליצירת PDF.', 'error');
        return;
    }

    const fontsLoaded = await loadHebrewFonts();
    if (!fontsLoaded) {
        showToast('אזהרה: לא ניתן היה לטעון את גופני העברית. ה-PDF יופק עם גופני ברירת מחדל.', 'error');
    }

    await generateSignedPDF(contract.title, contract.body, [], contract);
};

window.downloadContractAsset = function(contractId) {
    const contract = state.contracts.find(c => c.id === contractId);
    if (!contract || !contract.fileData || !contract.fileName) {
        showToast('לא קיים קובץ להצגה עבור חוזה זה.', 'error');
        return;
    }

    const blob = b64toBlob(contract.fileData, contract.fileType || 'application/octet-stream');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = contract.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

function b64toBlob(base64, contentType = '', sliceSize = 512) {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
};

window.downloadCurrentContractPDF = function() {
    const params = parseHashParams();
    let contractId = params.id;
    if (!contractId) {
        const hash = window.location.hash || '';
        const oldMatch = hash.match(/^#sign-(con_[a-zA-Z0-9_]+)$/);
        contractId = oldMatch ? oldMatch[1] : null;
    }
    if (contractId) {
        downloadContractPDF(contractId);
    } else {
        showToast('לא ניתן למצוא את מספר החוזה בקישור.', 'error');
    }
};

async function generateSignedPDF(title, body, signatures, contractFile = {}) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

    // Inject Hebrew font in jsPDF Virtual File System and enable Right-to-Left (RTL)
    if (assistantFontBase64) {
        doc.addFileToVFS('Assistant.ttf', assistantFontBase64);
        doc.addFont('Assistant.ttf', 'Assistant', 'normal');
        doc.addFont('Assistant.ttf', 'Assistant', 'bold');
        doc.setFont('Assistant', 'normal');
        if (typeof doc.setR2L === 'function') {
            doc.setR2L(true);
        }
    }

    // --- fonts & dimensions ---
    const pageW  = doc.internal.pageSize.getWidth();   // 210
    const pageH  = doc.internal.pageSize.getHeight();  // 297
    const margin = 15;
    const contentW = pageW - margin * 2;

    // Helper: set font family and style safely
    function setDocFont(style = 'normal') {
        if (assistantFontBase64) {
            doc.setFont('Assistant', style);
        } else {
            doc.setFont(undefined, style);
        }
    }

    // Helper: ensure RTL text rendering with strong RTL embedding
    function ensureRTL(text) {
        return '\u202B' + String(text) + '\u202C';
    }

    // Helper: ensure LTR text rendering with strong LTR isolation
    function ensureLTR(text) {
        return '\u2066' + String(text) + '\u2069';
    }

    // Helper: add right-aligned text (RTL)
    function addRTLText(text, x, y, options = {}) {
        doc.text(ensureRTL(text), x, y, { align: 'right', direction: 'rtl', ...options });
    }

    // Helper: draw wrapped body text, returns final Y
    function addWrappedText(text, startY) {
        const lines = doc.splitTextToSize(text, contentW, { align: 'right' });
        let y = startY;
        const lineH = 7;
        for (const line of lines) {
            if (y + lineH > pageH - 30) {
                // Footer on this page, then new page
                drawFooter(doc, pageW, pageH, margin);
                doc.addPage();
                y = margin + 10;
            }
            addRTLText(line, pageW - margin, y);
            y += lineH;
        }
        return y;
    }

    function drawFooter(doc, pageW, pageH, margin) {
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.3);
        doc.line(margin, pageH - 25, pageW - margin, pageH - 25);
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        setDocFont('normal');
        doc.text('DocSign - \u05de\u05e2\u05e8\u05db\u05ea \u05d7\u05ea\u05d9\u05de\u05ea \u05d7\u05d5\u05d6\u05d9\u05dd \u05d3\u05d9\u05d2\u05d9\u05d8\u05dc\u05d9\u05ea', pageW / 2, pageH - 18, { align: 'center' });
        doc.setTextColor(40, 40, 40);
    }

    // ---- Check if there's an uploaded contract file ----
    const isContractPdf = contractFile.fileName && contractFile.fileData && contractFile.fileType &&
        (contractFile.fileType.includes('pdf') || contractFile.fileName.toLowerCase().endsWith('.pdf'));
    const originalPdfBytes = isContractPdf ? base64ToArrayBuffer(contractFile.fileData) : null;
    const shouldRenderGeneratedContractPage = !isContractPdf;

    if (!signatures.length && originalPdfBytes) {
        const blob = new Blob([originalPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = outputFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('\u05d4\u05e7\u05d5\u05d1\u05e5 PDF \u05d4\u05d5\u05e8\u05d3 \u05d1\u05d4\u05e6\u05dc\u05d7\u05d4!', 'success');
        return;
    }

    // ---- PAGE 1: Contract text or original file reference ----
    if (shouldRenderGeneratedContractPage) {
        doc.setFontSize(18);
        doc.setTextColor(40, 40, 40);
        setDocFont('bold');
        addRTLText(title, pageW - margin, margin + 10);

        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        const now = new Date();
        setDocFont('normal');
        addRTLText('\u05d4\u05d5\u05e4\u05e7 \u05d1: ' + now.toLocaleDateString('he-IL') + '  ' + now.toLocaleTimeString('he-IL', {hour:'2-digit',minute:'2-digit'}), pageW - margin, margin + 18);

        doc.setDrawColor(79, 70, 229);
        doc.setLineWidth(0.8);
        doc.line(margin, margin + 22, pageW - margin, margin + 22);

        // ---- Add original contract file reference if it exists ----
        let curY = margin + 32;
        if (contractFile.fileName && contractFile.fileData) {
            doc.setFontSize(11);
            doc.setTextColor(79, 70, 229);
            setDocFont('bold');
            addRTLText('\u05d7\u05d5\u05d6\u05d4 \u05d0\u05d8\u05d7\u05d5\u05df:', pageW - margin, curY);
            curY += 8;

            doc.setFontSize(10);
            doc.setTextColor(40, 40, 40);
            setDocFont('normal');
            addRTLText(contractFile.fileName, pageW - margin, curY);
            curY += 8;

            doc.setFontSize(9);
            doc.setTextColor(120, 120, 120);
            setDocFont('italic');
            addRTLText('(קובץ החוזה המקורי המוסגר בחתימה זו)', pageW - margin, curY);
            curY += 12;

            doc.setDrawColor(200, 200, 220);
            doc.setLineWidth(0.3);
            doc.line(margin, curY - 2, pageW - margin, curY - 2);
            curY += 8;
            setDocFont('normal');
        }

        // ---- Add contract body text if it exists ----
        if (body && body.trim()) {
            doc.setFontSize(10);
            doc.setTextColor(40, 40, 40);
            curY = addWrappedText(body, curY);
        }
    }

    // ---- Signature pages ----
    let sigIndex = 0;
    for (const sig of signatures) {
        if (sigIndex === 0) {
            if (shouldRenderGeneratedContractPage) {
                drawFooter(doc, pageW, pageH, margin);
                doc.addPage();
            }
        } else {
            drawFooter(doc, pageW, pageH, margin);
            doc.addPage();
        }

        // Signature page header
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        setDocFont('bold');
        addRTLText('\u05d0\u05d9\u05e9\u05d5\u05e8 \u05d7\u05d5\u05ea\u05dd', pageW - margin, margin + 10);

        doc.setDrawColor(79, 70, 229);
        doc.setLineWidth(0.8);
        doc.line(margin, margin + 14, pageW - margin, margin + 14);

        // Contract title reference
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        setDocFont('normal');
        addRTLText('\u05d7\u05d5\u05d6\u05d4: ' + title, pageW - margin, margin + 22);

        // Signee details box
        let dy = margin + 34;
        const rowH = 10;
        const details = [
            ['שם מלא', sig.name, 'rtl'],
            ['תעודת זהות', sig.idNumber, 'ltr'],
            ['מספר דירה', sig.apartmentNumber, 'ltr'],
            ['טלפון', sig.phone, 'ltr'],
            ['תאריך חתימה', new Date(sig.signedAt).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }), 'ltr']
        ];

        doc.setFillColor(245, 247, 255);
        doc.roundedRect(margin, dy - 4, contentW, details.length * rowH + 8, 3, 3, 'F');
        doc.setDrawColor(200, 200, 220);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, dy - 4, contentW, details.length * rowH + 8, 3, 3, 'S');

        doc.setFontSize(10);
        for (const [label, value, direction] of details) {
            doc.setTextColor(100, 100, 100);
            setDocFont('normal');
            addRTLText(label + ':', pageW - margin - 4, dy + 2);
            doc.setTextColor(30, 30, 30);
            setDocFont('bold');
            if (direction === 'ltr') {
                const textValue = ensureLTR(String(value));
                if (typeof doc.setR2L === 'function') {
                    doc.setR2L(false);
                }
                doc.text(textValue, pageW - margin - 38, dy + 2, { align: 'right', direction: 'ltr' });
                if (typeof doc.setR2L === 'function') {
                    doc.setR2L(true);
                }
            } else {
                const textValue = ensureRTL(String(value));
                doc.text(textValue, pageW - margin - 38, dy + 2, { align: 'right', direction: 'rtl' });
            }
            dy += rowH;
        }
        setDocFont('normal');

        // Signature image
        const sigY = dy + 14;
        doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);
        addRTLText('\u05d7\u05ea\u05d9\u05de\u05d4 \u05d3\u05d9\u05d2\u05d9\u05d8\u05dc\u05d9\u05ea:', pageW - margin, sigY);

        // Draw rounded box for signature
        doc.setDrawColor(79, 70, 229);
        doc.setLineWidth(0.5);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin, sigY + 4, contentW, 45, 3, 3, 'FD');

        try {
            doc.addImage(sig.signatureDataUrl, 'PNG', margin + 5, sigY + 6, contentW - 10, 41, undefined, 'FAST');
        } catch(e) {
            doc.setFontSize(9);
            doc.setTextColor(180, 180, 180);
            doc.text('\u05dc\u05d0 \u05e0\u05d9\u05ea\u05df \u05dc\u05d8\'\u05e2\'\u05df \u05d0\u05ea \u05d4\u05d7\u05ea\'\u05d9\u05de\u05d4', pageW / 2, sigY + 26, { align: 'center' });
        }

        drawFooter(doc, pageW, pageH, margin);
    }

    // ---- Save ----
    const safeTitle = title.replace(/[^\u05d0-\u05eaa-zA-Z0-9]/g, '_').substring(0, 40);
    const fileSuffix = signatures && signatures.length > 0 ? signatures[0].name.replace(/\s/g,'_') : 'contract';
    const outputFileName = `DocSign_${safeTitle}_${fileSuffix}.pdf`;

    if (originalPdfBytes) {
        try {
            const generatedPdfBytes = doc.output('arraybuffer');
            // Include any PDF attachments from the contract, appended after the original PDF
            const buffersToMerge = [];
            if (originalPdfBytes) buffersToMerge.push(originalPdfBytes);
            if (contractFile && Array.isArray(contractFile.attachments)) {
                for (const att of contractFile.attachments) {
                    if (att && (att.fileType && att.fileType.includes('pdf') || (att.fileName || '').toLowerCase().endsWith('.pdf'))) {
                        try {
                            const attBuf = base64ToArrayBuffer(att.fileData);
                            buffersToMerge.push(attBuf);
                        } catch (e) {
                            console.warn('Skipping invalid attachment during merge', att && att.fileName, e);
                        }
                    }
                }
            }
            buffersToMerge.push(generatedPdfBytes);
            const mergedBytes = await mergePdfBuffers(...buffersToMerge);
            const blob = new Blob([mergedBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = outputFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to merge original contract PDF into signed PDF:', error);
            doc.save(outputFileName);
            showToast('שגיאה לשילוב קובץ המקור ב-PDF. הקובץ נשמר ללא המיזוג.', 'error');
            return;
        }
    } else {
        doc.save(outputFileName);
    }

    showToast('\u05d4\u05e7\u05d5\u05d1\u05e5 PDF \u05d4\u05d5\u05e8\u05d3 \u05d1\u05d4\u05e6\u05dc\u05d7\u05d4!', 'success');
}

// Create new contract submissions
document.getElementById('create-contract-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    
    const titleInput = document.getElementById('contract-title');
    const bodyInput = document.getElementById('contract-body');
    const filePayload = await readContractFileInput('contract-file');
    if (filePayload === false) return;

    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();

    if (!title) {
        showToast('הזן שם חוזה תקין.', 'error');
        return;
    }
    if (!body && !filePayload) {
        showToast('יש להזין טקסט או להעלות קובץ.', 'error');
        return;
    }

    const newContract = {
        id: 'con_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        title: title,
        body: body,
        createdAt: new Date().toISOString()
    };

    if (filePayload) {
        newContract.fileName = filePayload.fileName;
        newContract.fileType = filePayload.fileType;
        newContract.fileData = filePayload.fileData;
    }
    
    try {
        const response = await fetch('/api/contracts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newContract)
        });
        
        if (!response.ok) throw new Error('Failed to create contract on server');
        
        // Reset Form
        titleInput.value = '';
        bodyInput.value = '';
        document.getElementById('contract-file').value = '';
        
        await loadAdminDashboard();
        
        // Automatically copy share link of new contract and notify
        copyShareLink(newContract.id);
        showToast('החוזה נוצר בהצלחה! הקישור לחתימה הועתק אוטומטית ללוח.', 'success');
        
        // Redirect view back to dashboard section
        window.location.hash = '#admin';
    } catch (err) {
        console.error(err);
        showToast('שגיאה ביצירת החוזה בשרת.', 'error');
    }
});

// ================= P2P SIGNATURE IMPORT MECHANICS =================
function strokesToDataUrl(strokesText) {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 180;
    const ctx = canvas.getContext('2d');
    
    // Fill white signature background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Drawing styles
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (!strokesText) return canvas.toDataURL();
    
    const strokes = strokesText.split('|');
    strokes.forEach(strokeStr => {
        if (!strokeStr) return;
        const points = strokeStr.split(';');
        if (points.length === 0) return;
        
        ctx.beginPath();
        const firstPoint = points[0].split(',');
        ctx.moveTo(parseFloat(firstPoint[0]), parseFloat(firstPoint[1]));
        
        for (let i = 1; i < points.length; i++) {
            const p = points[i].split(',');
            if (p.length === 2) {
                ctx.lineTo(parseFloat(p[0]), parseFloat(p[1]));
            }
        }
        ctx.stroke();
    });
    
    return canvas.toDataURL();
}

async function importSignature(params) {
    const contractId = params.c;
    const name = params.n;
    const idNumber = params.i;
    const apartmentNumber = params.a;
    const phone = params.p;
    const strokesText = params.s;
    const urlTitle = params.t ? utf8Atob(params.t) : '';
    const urlBody = params.b ? utf8Atob(params.b) : '';
    
    if (!contractId || !name || !idNumber) {
        showToast('שגיאה בייבוא החתימה: המבנה אינו תקין.', 'error');
        window.location.hash = '#admin';
        return;
    }
    
    // Reconstruct canvas drawing to a high resolution DataURL
    const signatureDataUrl = strokesToDataUrl(strokesText);
    
    // Check if this signature was already imported to prevent duplicates
    const exists = state.signatures.some(s => s.idNumber === idNumber && s.contractId === contractId);
    if (exists) {
        showToast(`החתימה של ${name} כבר יובאה למערכת שלך בעבר.`, 'error');
        window.location.hash = '#admin';
        return;
    }
    
    try {
        // Auto-reconstruct contract data if it doesn't exist on this admin device
        let contract = state.contracts.find(c => c.id === contractId);
        if (!contract && urlTitle && urlBody) {
            contract = {
                id: contractId,
                title: urlTitle,
                body: urlBody,
                createdAt: new Date().toISOString()
            };
            const res = await fetch('/api/contracts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(contract)
            });
            if (!res.ok) throw new Error('Failed to import contract context');
        }
        
        const newSignature = {
            id: 'sig_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            contractId: contractId,
            name: name,
            idNumber: idNumber,
            apartmentNumber: apartmentNumber,
            phone: phone,
            signatureDataUrl: signatureDataUrl,
            signedAt: new Date().toISOString(),
            contractTitle: urlTitle || (contract ? contract.title : 'חוזה'),
            contractBody: urlBody || (contract ? contract.body : '')
        };
        
        const response = await fetch('/api/signatures', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSignature)
        });
        
        if (response.status === 409) {
            showToast(`החתימה של ${name} כבר יובאה למערכת שלך בעבר.`, 'error');
        } else if (!response.ok) {
            throw new Error('Failed to save imported signature');
        } else {
            showToast(`החתימה של ${name} (דירה ${apartmentNumber}) יובאה בהצלחה!`, 'success');
        }
        
        window.location.hash = '#admin';
        setTimeout(async () => {
            await loadAdminDashboard();
            scrollToSignatures(contractId);
        }, 500);
    } catch (err) {
        console.error(err);
        showToast('שגיאה בייבוא החתימה לשרת.', 'error');
        window.location.hash = '#admin';
    }
}

// ================= SIGNATURES TABLE RENDERING =================
function renderSignaturesTable(filterContractId = 'all') {
    const tbody = document.getElementById('signatures-table-body');
    tbody.innerHTML = '';
    
    let filteredSignatures = state.signatures;
    if (filterContractId !== 'all') {
        filteredSignatures = state.signatures.filter(s => s.contractId === filterContractId);
    }
    
    // Sort signatures: newest first
    filteredSignatures.sort((a, b) => new Date(b.signedAt) - new Date(a.signedAt));
    
    if (filteredSignatures.length === 0) {
        tbody.innerHTML = `<tr>
            <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px 0;">
                <i class="fa-solid fa-signature" style="font-size: 2.5rem; margin-bottom: 12px; display: block;"></i>
                אין חתימות התואמות לסינון זה.
            </td>
        </tr>`;
        return;
    }
    
    filteredSignatures.forEach(sig => {
        const contract = state.contracts.find(c => c.id === sig.contractId);
        const contractName = contract ? contract.title : 'חוזה שנמחק';
        
        const dateObj = new Date(sig.signedAt);
        const signedTime = dateObj.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        const signedDate = dateObj.toLocaleDateString('he-IL');
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="שם החוזה" style="font-weight: 600;">${escapeHtml(contractName)}</td>
            <td data-label="שם מלא">${escapeHtml(sig.name)}</td>
            <td data-label="תעודת זהות">${escapeHtml(sig.idNumber)}</td>
            <td data-label="מספר דירה">${escapeHtml(sig.apartmentNumber)}</td>
            <td data-label="מספר טלפון">${escapeHtml(sig.phone)}</td>
            <td data-label="תאריך ושעה">${signedDate} ${signedTime}</td>
            <td data-label="חתימה" style="text-align: center;">
                <img src="${sig.signatureDataUrl}" alt="חתימה של ${escapeHtml(sig.name)}" class="signature-img-preview" onclick="openSignatureLightbox('${sig.id}')">
            </td>
            <td data-label="פעולות" style="text-align: center; white-space: nowrap;">
                <button class="btn btn-sm" style="background: rgba(79,70,229,0.15); color: #a5b4fc; border: 1px solid rgba(79,70,229,0.3); margin-bottom: 4px;" onclick="downloadSignaturePDF('${sig.id}')" title="הורד PDF">
                    <i class="fa-solid fa-file-pdf"></i> PDF
                </button>
                <button class="btn btn-sm" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3);" onclick="deleteSignature('${sig.id}')" title="מחק חתימה">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Populate contract filter select in Admin table
function populateContractFilters() {
    const select = document.getElementById('filter-contract-select');
    const currentValue = select.value;
    
    // Reset options but preserve "All Contracts"
    select.innerHTML = '<option value="all">כל החוזים</option>';
    
    state.contracts.forEach(contract => {
        const option = document.createElement('option');
        option.value = contract.id;
        option.textContent = contract.title;
        select.appendChild(option);
    });
    
    // Restore selection if still exists
    if (state.contracts.some(c => c.id === currentValue)) {
        select.value = currentValue;
    } else {
        select.value = 'all';
    }
}

// Table filtering listener
document.getElementById('filter-contract-select').addEventListener('change', function(e) {
    renderSignaturesTable(e.target.value);
});

// ================= LIGHTBOX PREVIEW MODAL =================
window.openSignatureLightbox = function(signatureId) {
    const signature = state.signatures.find(s => s.id === signatureId);
    if (!signature) return;
    
    const contract = state.contracts.find(c => c.id === signature.contractId);
    const contractName = contract ? contract.title : 'חוזה שנמחק';
    
    const modal = document.getElementById('signature-modal');
    const modalName = document.getElementById('modal-signee-name');
    const modalMeta = document.getElementById('modal-signee-meta');
    const modalImg = document.getElementById('modal-img');
    const downloadBtn = document.getElementById('btn-download-sig');
    
    modalName.textContent = signature.name;
    modalMeta.textContent = `ת"ז: ${signature.idNumber} | דירה: ${signature.apartmentNumber} | טלפון: ${signature.phone} | עבור: ${contractName}`;
    modalImg.src = signature.signatureDataUrl;
    
    // Setup download button
    downloadBtn.onclick = function() {
        const link = document.createElement('a');
        link.download = `signature_${name.replace(/\s+/g, '_')}.png`;
        link.href = signature.signatureDataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('הורדת תמונת החתימה החלה!', 'success');
    };
    
    modal.classList.add('active');
};

// Close modal handlers
document.getElementById('btn-close-modal').addEventListener('click', () => {
    document.getElementById('signature-modal').classList.remove('active');
});

document.getElementById('signature-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        this.classList.remove('active');
    }
});

// ================= EXPORT CSV FUNCTIONALITY =================
document.getElementById('btn-export-csv').addEventListener('click', function() {
    const filterVal = document.getElementById('filter-contract-select').value;
    
    let filteredSigs = state.signatures;
    if (filterVal !== 'all') {
        filteredSigs = state.signatures.filter(s => s.contractId === filterVal);
    }
    
    if (filteredSigs.length === 0) {
        showToast('אין נתוני חתימות לייצוא בסינון הנוכחי.', 'error');
        return;
    }
    
    // Sort signatures: newest first
    filteredSigs.sort((a, b) => new Date(b.signedAt) - new Date(a.signedAt));
    
    // Create CSV content starting with Hebrew-friendly headers
    // \uFEFF is the UTF-8 Byte Order Mark (BOM) to force Excel to open in UTF-8 encoding
    let csvContent = '\uFEFF';
    
    // Header Row
    csvContent += 'שם החוזה,שם מלא,תעודת זהות,מספר דירה,מספר טלפון,תאריך ושעה\n';
    
    // Data Rows
    filteredSigs.forEach(sig => {
        const contract = state.contracts.find(c => c.id === sig.contractId);
        const contractName = contract ? contract.title : 'חוזה שנמחק';
        
        const dateObj = new Date(sig.signedAt);
        const formattedDate = dateObj.toLocaleDateString('he-IL');
        const formattedTime = dateObj.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        
        // Escape content to preserve commas and double quotes
        const row = [
            `"${String(contractName).replace(/"/g, '""')}"`,
            `"${String(sig.name).replace(/"/g, '""')}"`,
            `"${String(sig.idNumber).replace(/"/g, '""')}"`,
            `"${String(sig.apartmentNumber).replace(/"/g, '""')}"`,
            `"${String(sig.phone).replace(/"/g, '""')}"`,
            `"${formattedDate} ${formattedTime}"`
        ];
        
        csvContent += row.join(',') + '\n';
    });
    
    // Download Blob execution
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `DocSign_Signatures_Export_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast('קובץ הנתונים יוצא בהצלחה ומורד כעת!', 'success');
});

// ================= UTILITIES =================
function escapeHtml(unsafe) {
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', async () => {
    await loadStateFromServer();
    await initAuth();
    initRouter();
});
