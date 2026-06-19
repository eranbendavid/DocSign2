require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_DIR = process.env.DB_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password';
const ADMIN_DISPLAY_NAME = process.env.ADMIN_DISPLAY_NAME || 'מנהל';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support base64 image data
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// Ensure data directory and db.json exist
function initDatabase() {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    if (!fs.existsSync(DB_FILE)) {
        const initialData = {
            contracts: [
                {
                    id: 'con_seed1',
                    title: 'הסכם שיפוץ לבניין ברחוב היובל 4',
                    body: `הסכם שנחתם ביום 24 למאי 2026 בין נציגות הדיירים של היובל 4 לבין קבלן הביצוע ש.ז. הנדסה ובינוי בע"מ.

הקבלן מתחייב לבצע עבודות שיפוץ, איטום גגות וחידוש המעטפת החיצונית של הבניין בהתאם למפרט שצורף לתוכנית השיפוץ המוסכמת.

דייר הבניין מאשר בחתימתו בזאת את הסכמתו לביצוע העבודה, לגביית התשלום הנדרש מקרן השיפוצים של הבניין, ולתנאי התשלום והאחריות כפי שהוצגו באספת הדיירים האחרונה.`,
                    createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
                    attachments: []
                },
                {
                    id: 'con_seed2',
                    title: 'אישור קבלת תקנון הבית המשותף',
                    body: `אני החתום מטה, כבעל דירה או שוכר בבניין ברחוב היובל 4, מאשר בזאת כי קיבלתי לידיי את העתק תקנון הבית המשותף המעודכן לשנת 2026.

אני מתחייב לקרוא את התקנון, לשמור על הוראותיו, בייחוד בנוגע לשמירה על השקט בשעות המנוחה, שימוש במתקנים המשותפים ומניעת הפרעה או גרימת נזק לרכוש המשותף בבניין.`,
                    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
                    attachments: []
                }
            ],
            signatures: [
                {
                    id: 'sig_seed1',
                    contractId: 'con_seed1',
                    name: 'אברהם כהן',
                    idNumber: '032145698',
                    apartmentNumber: '4',
                    phone: '0547788991',
                    signatureDataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="60" viewBox="0 0 150 60"><path d="M10,30 Q30,10 50,30 T90,30 T130,20" fill="none" stroke="black" stroke-width="2"/></svg>',
                    signedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
                    contractTitle: 'הסכם שיפוץ לבניין ברחוב היובל 4',
                    contractBody: `הסכם שנחתם ביום 24 למאי 2026 בין נציגות הדיירים של היובל 4 לבין קבלן הביצוע ש.ז. הנדסה ובינוי בע"מ.

הקבלן מתחייב לבצע עבודות שיפוץ, איטום גגות וחידוש המעטפת החיצונית של הבניין בהתאם למפרט שצורף לתוכנית השיפוץ המוסכמת.

דייר הבניין מאשר בחתימתו בזאת את הסכמתו לביצוע העבודה, לגביית התשלום הנדרש מקרן השיפוצים של הבניין, ולתנאי התשלום והאחריות כפי שהוצגו באספת הדיירים האחרונה.`
                },
                {
                    id: 'sig_seed2',
                    contractId: 'con_seed1',
                    name: 'מיכל לוי',
                    idNumber: '312456789',
                    apartmentNumber: '11',
                    phone: '0524455662',
                    signatureDataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="60" viewBox="0 0 150 60"><path d="M15,25 Q35,45 65,25 T115,25 T135,35" fill="none" stroke="black" stroke-width="2"/></svg>',
                    signedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
                    contractTitle: 'הסכם שיפוץ לבניין ברחוב היובל 4',
                    contractBody: `הסכם שנחתם ביום 24 למאי 2026 בין נציגות הדיירים של היובל 4 לבין קבלן הביצוע ש.ז. הנדסה ובינוי בע"מ.

הקבלן מתחייב לבצע עבודות שיפוץ, איטום גגות וחידוש המעטפת החיצונית של הבניין בהתאם למפרט שצורף לתוכנית השיפוץ המוסכמת.

דייר הבניין מאשר בחתימתו בזאת את הסכמתו לביצוע העבודה, לגביית התשלום הנדרש מקרן השיפוצים של הבניין, ולתנאי התשלום והאחריות כפי שהוצגו באספת הדיירים האחרונה.`
                }
            ],
            admins: (process.env.INITIAL_ADMIN_EMAIL ? [process.env.INITIAL_ADMIN_EMAIL] : [])
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
    } else {
        // Ensure admins array exists and add initial admin if configured
        const db = readDB();
        db.admins = db.admins || [];
        if (process.env.INITIAL_ADMIN_EMAIL && !db.admins.includes(process.env.INITIAL_ADMIN_EMAIL)) {
            db.admins.push(process.env.INITIAL_ADMIN_EMAIL);
            writeDB(db);
        }
    }
}

initDatabase();

// DB Helper Functions
function readDB() {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading database file:', err);
        return { contracts: [], signatures: [] };
    }
}

function writeDB(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error('Error writing to database file:', err);
    }
}

// Session helper: read session cookie
function getSession(req) {
    try {
        const raw = req.cookies && req.cookies.session;
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (err) {
        return null;
    }
}

// Require admin middleware
function requireAdmin(req, res, next) {
    const sess = getSession(req);
    if (!sess || !sess.isAdmin) return res.status(403).json({ error: 'Forbidden' });
    next();
}

// Username/password auth: create a simple session cookie
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }

    const session = {
        username,
        name: ADMIN_DISPLAY_NAME,
        isAdmin: true
    };

    res.cookie('session', JSON.stringify(session), { httpOnly: true, sameSite: 'lax' });
    res.json({ authenticated: true, user: session });
});

app.post('/api/auth/signout', (req, res) => {
    res.clearCookie('session');
    res.json({ ok: true });
});

app.get('/api/current-user', (req, res) => {
    const sess = getSession(req);
    if (!sess) return res.json({ authenticated: false });
    res.json({ authenticated: true, user: sess });
});

// Admin management endpoints
app.get('/api/admins', requireAdmin, (req, res) => {
    const db = readDB();
    res.json(db.admins || []);
});

app.post('/api/admins', requireAdmin, (req, res) => {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Missing email' });
    const db = readDB();
    db.admins = db.admins || [];
    if (!db.admins.includes(email)) {
        db.admins.push(email);
        writeDB(db);
    }
    res.json({ admins: db.admins });
});

app.delete('/api/admins', requireAdmin, (req, res) => {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Missing email' });
    const db = readDB();
    db.admins = (db.admins || []).filter(e => e !== email);
    writeDB(db);
    res.json({ admins: db.admins });
});

// API Endpoints

// 1. Contracts Endpoints
app.get('/api/contracts', (req, res) => {
    const db = readDB();
    res.json(db.contracts);
});

app.get('/api/contracts/:id', (req, res) => {
    const db = readDB();
    const contract = db.contracts.find(c => c.id === req.params.id);
    if (contract) {
        res.json(contract);
    } else {
        res.status(404).json({ error: 'Contract not found' });
    }
});

app.post('/api/contracts', (req, res) => {
    const db = readDB();
    const newContract = req.body;
    const hasContractText = newContract.body && String(newContract.body).trim().length > 0;
    const hasContractFile = newContract.fileName && newContract.fileType && newContract.fileData;

    if (!newContract.id || !newContract.title || (!hasContractText && !hasContractFile)) {
        return res.status(400).json({ error: 'Missing required contract fields' });
    }
    
    db.contracts.unshift(newContract);
    writeDB(db);
    res.status(201).json(newContract);
});

app.put('/api/contracts/:id', (req, res) => {
    const db = readDB();
    const index = db.contracts.findIndex(c => c.id === req.params.id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Contract not found' });
    }
    
    const { title, body, fileName, fileType, fileData } = req.body;
    db.contracts[index].title = title || db.contracts[index].title;
    db.contracts[index].body = body !== undefined ? body : db.contracts[index].body;
    if (fileName && fileType && fileData) {
        db.contracts[index].fileName = fileName;
        db.contracts[index].fileType = fileType;
        db.contracts[index].fileData = fileData;
    }
    
    writeDB(db);
    res.json(db.contracts[index]);
});

app.delete('/api/contracts/:id', (req, res) => {
    const db = readDB();
    db.contracts = db.contracts.filter(c => c.id !== req.params.id);
    db.signatures = db.signatures.filter(s => s.contractId !== req.params.id);
    writeDB(db);
    res.json({ message: 'Contract deleted' });
});

// Attachments endpoints for a contract
app.get('/api/contracts/:id/attachments', (req, res) => {
    const db = readDB();
    const contract = db.contracts.find(c => c.id === req.params.id);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    res.json(contract.attachments || []);
});

app.post('/api/contracts/:id/attachments', (req, res) => {
    const { fileName, fileType, fileData } = req.body || {};
    if (!fileName || !fileData) return res.status(400).json({ error: 'Missing attachment payload' });
    const db = readDB();
    const contract = db.contracts.find(c => c.id === req.params.id);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    contract.attachments = contract.attachments || [];
    contract.attachments.push({ fileName, fileType: fileType || 'application/pdf', fileData });
    writeDB(db);
    res.status(201).json({ attachments: contract.attachments });
});

app.delete('/api/contracts/:id/attachments', (req, res) => {
    const { fileName } = req.body || {};
    if (!fileName) return res.status(400).json({ error: 'Missing fileName' });
    const db = readDB();
    const contract = db.contracts.find(c => c.id === req.params.id);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    contract.attachments = (contract.attachments || []).filter(a => a.fileName !== fileName);
    writeDB(db);
    res.json({ attachments: contract.attachments });
});

// 2. Signatures Endpoints
app.get('/api/signatures', (req, res) => {
    const db = readDB();
    res.json(db.signatures);
});

app.post('/api/signatures', (req, res) => {
    const db = readDB();
    const newSignature = req.body;
    
    if (!newSignature.id || !newSignature.contractId || !newSignature.name || !newSignature.idNumber) {
        return res.status(400).json({ error: 'Missing required signature fields' });
    }
    
    // Check if already exists to prevent duplicate imports
    const exists = db.signatures.some(s => s.idNumber === newSignature.idNumber && s.contractId === newSignature.contractId);
    if (exists) {
        return res.status(409).json({ error: 'Signature already exists' });
    }
    
    db.signatures.push(newSignature);
    writeDB(db);
    res.status(201).json(newSignature);
});

app.delete('/api/signatures/:id', (req, res) => {
    const db = readDB();
    db.signatures = db.signatures.filter(s => s.id !== req.params.id);
    writeDB(db);
    res.json({ message: 'Signature deleted' });
});

// Return JSON for unknown API routes instead of HTML or generic server error pages.
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// Serve index.html for any unmatched GET request to support SPA routing if needed
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`DocSign Server running on http://localhost:${PORT}`);
});
