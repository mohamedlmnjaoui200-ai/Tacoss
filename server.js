/* ════════════════════════════════════════════════════════════════════════
   خادم «بيت الربح العربي» (Money Slayer) — Telegram Mini App
   مبني من فحص كامل للمشروع: API.md + src/api.js + src/App.jsx + AdminView.jsx
   (+ منطق الخادم التجريبي الموجود في AdminView.jsx لنقله كما هو).

   التشغيل:
     npm init -y && npm i express
     BOT_TOKEN=123:ABC ADMIN_USER=admin ADMIN_PASS=كلمة_قوية ADMIN_SECRET=نص_عشوائي_طويل \
     ALLOWED_ORIGIN=https://your-app.vercel.app node server.js

   متغيرات البيئة:
     PORT            المنفذ (3001)
     BOT_TOKEN       توكن البوت — للتحقق من initData (مطلوب في الإنتاج)
     ADMIN_USER / ADMIN_PASS   بيانات دخول لوحة الإدارة (مطلوبة)
     ADMIN_SECRET    سر توقيع توكن الأدمن
     ALLOWED_ORIGIN  دومين التطبيق لـ CORS (أكثر من واحد مفصولة بفاصلة؛ * للتجربة فقط)
     DATA_FILE       مسار قاعدة البيانات JSON (./data/db.json)
     DEV_MODE=1      يسمح بالترويسة x-dev-user-id بدل initData (للتطوير فقط!)

   ───────────────────────── قائمة كل المسارات ─────────────────────────
   عام
     GET  /health
     GET  /api/config
   المستخدم (ترويسة x-telegram-init-data)
     GET  /api/user/profile?start_param=
     GET  /api/tasks
     POST /api/tasks/start            {id}
     POST /api/tasks/claim            {id}
     POST /api/checkin
     POST /api/chest
     POST /api/spin
     GET  /api/leaderboard
     GET  /api/referrals
     POST /api/referrals/milestone    {friends}
     POST /api/promo/redeem           {code}
     POST /api/ads/start
     POST /api/ads/claim
     POST /api/withdraw               {method,amount,address} | {method:'bank',amount,address,bank,holder,country,countryName}
   الإدارة (POST /api/admin/:action — ترويسة x-admin-token ما عدا login)
     login · stats · users · user · balance · ban · delete
     withdrawals · withdrawal · settings · saveSettings
     tasks · saveTask · deleteTask · promos · savePromo · deletePromo
   ════════════════════════════════════════════════════════════════════════ */
'use strict';
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/* ───────────── الإعدادات ───────────── */
const PORT = Number(process.env.PORT) || 3001;
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ADMIN_USER = process.env.ADMIN_USER || '';
const ADMIN_PASS = process.env.ADMIN_PASS || '';
const ADMIN_SECRET = process.env.ADMIN_SECRET || crypto.randomBytes(32).toString('hex');
const ALLOWED = (process.env.ALLOWED_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'db.json');
const DEV_MODE = process.env.DEV_MODE === '1';
const INIT_MAX_AGE = 24 * 3600; // ثانية — عمر initData المسموح
const DAY = 86400000;

if (!DEV_MODE && !BOT_TOKEN) console.warn('⚠️  BOT_TOKEN غير مضبوط: كل طلبات المستخدمين ستُرفض.');
if (!ADMIN_USER || !ADMIN_PASS) console.warn('⚠️  ADMIN_USER/ADMIN_PASS غير مضبوطين: دخول الأدمن معطّل.');

/* ───────────── الإعدادات الافتراضية (نفس src/data.js) ───────────── */
const DEFAULT_CONFIG = {
  appName: 'Money Slayer',
  minWithdraw: 5,
  welcomeBonus: 0.5,
  referralReward: 1,
  checkinRewards: [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.5],
  dailyGoal: 3,
  chestReward: 0.3,
  spinPrizes: [0.05, 0.1, 0.02, 0.25, 0.05, 0.5, 0.1, 1],
  milestones: [{ friends: 5, bonus: 2 }, { friends: 10, bonus: 5 }, { friends: 25, bonus: 15 }, { friends: 50, bonus: 40 }],
  ads: { enabled: true, reward: 0.02, dailyLimit: 50, duration: 15, cooldown: 10, blockId: '' },
  botUsername: 'YourBot',
  miniAppName: 'app',
  channel: '',
  methods: [
    { id: 'ton', name: 'TON', sub: 'محفظة TON', icon: 'ton', eta: 'instant', min: 5, fee: 0, placeholder: 'UQ…', pattern: '^(UQ|EQ)[A-Za-z0-9_-]{46}$' },
    { id: 'usdt_trc20', name: 'USDT', sub: 'TRC20', icon: 'usdt', eta: '1h', min: 5, fee: 1, placeholder: 'T…', pattern: '^T[1-9A-HJ-NP-Za-km-z]{33}$' },
    { id: 'usdt_erc20', name: 'USDT', sub: 'ERC20', icon: 'usdt2', eta: '1h', min: 20, fee: 3, placeholder: '0x…', pattern: '^0x[a-fA-F0-9]{40}$' },
    { id: 'binance', name: 'Binance Pay', sub: 'Pay ID', icon: 'binance', eta: '1h', min: 5, fee: 0, placeholder: 'Pay ID', pattern: '^[0-9]{6,12}$' },
    { id: 'payeer', name: 'Payeer', sub: 'P…', icon: 'payeer', eta: '24h', min: 5, fee: 0, placeholder: 'P12345678', pattern: '^P[0-9]{6,12}$' },
  ],
};
// verifySeconds: زمن التحقق قبل السماح بالاستلام. verifyChat (اختياري): قناة/مجموعة تيليجرام للتحقق الفعلي من العضوية (البوت يجب أن يكون مشرفًا فيها).
const SEED_TASKS = [
  { id: 't1', title: 'سجّل في منصة تداول', description: 'أنشئ حسابًا جديدًا عبر الرابط ثم ارجع لاستلام مكافأتك.', reward: 1.5, type: 'register', icon: 'userplus', minutes: 3, url: 'https://example.com/signup', active: true, verifySeconds: 30 },
  { id: 't2', title: 'انضم إلى قناتنا الرسمية', description: 'اشترك في القناة لتصلك آخر العروض والمهام الجديدة.', reward: 0.5, type: 'social', icon: 'send', minutes: 1, url: 'https://t.me/telegram', active: true, verifySeconds: 10 },
  { id: 't3', title: 'مطالبة بهدية البوت', description: 'افتح البوت واضغط «ابدأ» ثم استلم هديتك المجانية.', reward: 1, type: 'normal', icon: 'gift', minutes: 1, url: 'https://t.me/telegram', active: true, verifySeconds: 10 },
  { id: 't4', title: 'تابعنا على المنصة', description: 'تابع حسابنا الرسمي وفعّل التنبيهات.', reward: 0.35, type: 'social', icon: 'star', minutes: 1, url: 'https://example.com/follow', active: true, verifySeconds: 10 },
  { id: 't5', title: 'شاهد فيديو التعريف', description: 'شاهد الفيديو القصير حتى النهاية.', reward: 0.25, type: 'normal', icon: 'play', minutes: 2, url: 'https://example.com/video', active: true, verifySeconds: 20 },
  { id: 't6', title: 'سجّل في محفظة العملات', description: 'أنشئ محفظة جديدة وأكمل التحقق الأساسي.', reward: 2, type: 'register', icon: 'wallet', minutes: 5, url: 'https://example.com/wallet', active: true, verifySeconds: 30 },
];

/* ───────────── أدوات ───────────── */
const r2 = (n) => Math.round(n * 100) / 100;
const dayKey = (ts = Date.now()) => { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const fullName = (u) => [u.first_name, u.last_name].filter(Boolean).join(' ') || '—';
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const IBAN_RE = /^[A-Za-z0-9]{8,34}$/;

class AppError extends Error {
  constructor(code, status = 400, extra = {}) { super(code); this.code = code; this.status = status; this.extra = extra; }
}
const fail = (code, status = 400, extra = {}) => { throw new AppError(code, status, extra); };

/* ───────────── قاعدة البيانات (JSON في الذاكرة + حفظ ذرّي على القرص) ─────────────
   Node يعمل بخيط واحد: كل معالج متزامن (بدون await بين القراءة والكتابة) فهو ذرّي فعليًا،
   ولذلك خصم الرصيد والتحقق منه يتمان في نفس الخطوة. للإنتاج الكبير انقل لـ PostgreSQL/Mongo. */
let DB = { users: {}, tasks: SEED_TASKS.map((t) => ({ ...t })), promos: [], settings: {} };
try {
  if (fs.existsSync(DATA_FILE)) DB = { ...DB, ...JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) };
} catch (e) { console.error('تعذّر قراءة قاعدة البيانات:', e.message); process.exit(1); }

let saveTimer = null;
function flush() {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    const tmp = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(DB));
    fs.renameSync(tmp, DATA_FILE);
  } catch (e) { console.error('فشل الحفظ:', e.message); }
}
const save = () => { if (!saveTimer) saveTimer = setTimeout(() => { saveTimer = null; flush(); }, 300); };
['SIGINT', 'SIGTERM'].forEach((s) => process.on(s, () => { flush(); process.exit(0); }));

const RAW = () => ({ ...DEFAULT_CONFIG, ...(DB.settings || {}), ads: { ...DEFAULT_CONFIG.ads, ...((DB.settings || {}).ads || {}) } });
const CFG = () => { const c = RAW(); return { ...c, methods: (c.methods || []).filter((m) => m.enabled !== false) }; };

const mkUser = (id, o = {}) => ({
  id, first_name: '', last_name: '', username: '', photo_url: '', balance: 0, totalEarned: 0, referralEarnings: 0, completed: 0, streak: 0,
  lastCheckin: 0, lastSpin: 0, lastAd: 0, adSession: 0, adDays: {}, taskState: {}, taskDays: {}, chestDay: '', milestones: [],
  joinedAt: Date.now(), history: [], withdrawals: [], invitedBy: 0, refBonus: 0, banned: false, banReason: '', usedPromos: [], lastWithdrawAt: 0, ...o,
});
const getUser = (id) => DB.users[String(id)];
const allUsers = () => Object.values(DB.users);
const friendsOf = (u) => allUsers().filter((x) => x.invitedBy === u.id);
const curStreak = (u) => (Date.now() - u.lastCheckin > 2 * DAY ? 0 : u.streak);

function addTx(u, type, amount, extra = {}, earn = true) {
  u.balance = r2(u.balance + amount);
  if (amount > 0 && earn) u.totalEarned = r2(u.totalEarned + amount);
  u.history.unshift({ type, amount: r2(amount), at: Date.now(), ...extra });
  if (u.history.length > 500) u.history.length = 500;
}
function profileOf(u) {
  const c = CFG(), now = Date.now(), claimedToday = u.lastCheckin && now - u.lastCheckin < DAY, spinReady = !u.lastSpin || now - u.lastSpin >= DAY;
  return {
    balance: r2(u.balance), totalEarned: r2(u.totalEarned), completedTasks: u.completed, friends: friendsOf(u).length, referralEarnings: r2(u.referralEarnings),
    referralCode: `ref_${u.id}`, streak: curStreak(u), nextCheckinAt: claimedToday ? u.lastCheckin + DAY : 0, nextSpinAt: spinReady ? 0 : u.lastSpin + DAY, joinedAt: u.joinedAt,
    daily: { done: Math.min(u.taskDays[dayKey()] || 0, c.dailyGoal), goal: c.dailyGoal, claimed: u.chestDay === dayKey(), reward: c.chestReward },
    milestonesClaimed: u.milestones, history: u.history.slice(0, 60), withdrawals: u.withdrawals.slice(0, 20),
    ads: { done: (u.adDays || {})[dayKey()] || 0, limit: c.ads.dailyLimit, reward: c.ads.reward, duration: c.ads.duration, nextAt: u.lastAd && now < u.lastAd + c.ads.cooldown * 1000 ? u.lastAd + c.ads.cooldown * 1000 : 0 },
  };
}
const publicTask = (t, u) => {
  const { verifyChat, verifySeconds, ...pub } = t; // eslint-disable-line no-unused-vars
  const st = u.taskState[t.id] || {};
  return { ...pub, status: st.status || 'available', verifyAt: st.verifyAt || 0 };
};
const taskList = (u) => DB.tasks.filter((t) => t.active !== false).map((t) => publicTask(t, u));

/* ───────────── التحقق من هوية تيليجرام ───────────── */
function verifyInitData(raw) {
  if (!raw) fail('not_telegram', 401);
  const params = new URLSearchParams(raw), hash = params.get('hash');
  if (!hash || !BOT_TOKEN) fail('not_telegram', 401);
  params.delete('hash');
  const dcs = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const calc = crypto.createHmac('sha256', secret).update(dcs).digest('hex');
  if (!safeEq(calc, hash)) fail('bad_session', 401);
  const authDate = Number(params.get('auth_date')) || 0;
  if (!authDate || Date.now() / 1000 - authDate > INIT_MAX_AGE) fail('expired', 401);
  let user; try { user = JSON.parse(params.get('user') || ''); } catch { user = null; }
  if (!user || !user.id) fail('bad_session', 401);
  return { user, start_param: params.get('start_param') || '' };
}

/** وسيط المستخدم: يتحقق من initData في كل طلب، ينشئ الحساب أول مرة، ويرفض المحظور */
function auth(req, res, next) {
  try {
    let tg;
    if (DEV_MODE && req.headers['x-dev-user-id']) tg = { user: { id: Number(req.headers['x-dev-user-id']), first_name: 'Dev' }, start_param: '' };
    else tg = verifyInitData(req.headers['x-telegram-init-data']);
    let u = getUser(tg.user.id), created = false;
    if (!u) { u = DB.users[String(tg.user.id)] = mkUser(Number(tg.user.id)); created = true; }
    u.first_name = String(tg.user.first_name || u.first_name || '').slice(0, 64);
    u.last_name = String(tg.user.last_name || '').slice(0, 64);
    u.username = String(tg.user.username || '').slice(0, 64);
    if (tg.user.photo_url) u.photo_url = String(tg.user.photo_url).slice(0, 300);
    req.tg = tg; req.u = u; req.created = created;
    if (u.banned) fail('banned', 403);
    next();
  } catch (e) { next(e); }
}

/* ───────────── التطبيق ───────────── */
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((req, res, next) => { // CORS لدومين التطبيق فقط
  const o = req.headers.origin;
  if (o && (ALLOWED.includes('*') || ALLOWED.includes(o))) {
    res.setHeader('Access-Control-Allow-Origin', o); res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-telegram-init-data, x-admin-token');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); res.setHeader('Access-Control-Max-Age', '86400');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
app.use(express.json({ limit: '100kb' }));

// حدّ معدّل بسيط في الذاكرة (لكل مفتاح: عدد الطلبات في نافذة زمنية)
const hits = new Map();
const limiter = (name, max, windowMs, keyFn = (req) => req.ip) => (req, res, next) => {
  const k = `${name}:${keyFn(req)}`, now = Date.now(), h = hits.get(k);
  if (!h || now > h.reset) { hits.set(k, { n: 1, reset: now + windowMs }); return next(); }
  if (++h.n > max) return next(new AppError('rate_limited', 429, { wait: Math.ceil((h.reset - now) / 1000) }));
  next();
};
setInterval(() => { const n = Date.now(); for (const [k, h] of hits) if (n > h.reset) hits.delete(k); }, 60000).unref();
app.use('/api', limiter('global', 120, 60000));

const wrap = (fn) => (req, res, next) => Promise.resolve().then(() => fn(req, res)).then((out) => { if (out !== undefined && !res.headersSent) res.json(out); }).catch(next);

/* ═══════════════ عام ═══════════════ */
app.get('/health', (req, res) => res.json({ ok: true, users: allUsers().length }));
app.get('/api/config', wrap(() => ({ config: CFG() })));

/* ═══════════════ المستخدم ═══════════════ */
const U = express.Router();
U.use(auth);

// GET /api/user/profile?start_param=  — ينشئ الحساب أول مرة ويحتسب الإحالة
U.get('/user/profile', wrap((req) => {
  const u = req.u;
  if (req.created) {
    const c = CFG();
    const sp = String(req.query.start_param || req.tg.start_param || '');
    const m = /^ref_(\d{3,15})$/.exec(sp);
    const inviter = m && Number(m[1]) !== u.id ? getUser(m[1]) : null;
    if (c.welcomeBonus > 0) addTx(u, 'welcome', c.welcomeBonus);
    if (inviter && !inviter.banned) {
      u.invitedBy = inviter.id; u.refBonus = c.referralReward;
      inviter.referralEarnings = r2(inviter.referralEarnings + c.referralReward);
      addTx(inviter, 'referral', c.referralReward, { ref: u.first_name || 'صديق' });
    }
    save();
  }
  return { user: { id: u.id, first_name: u.first_name, last_name: u.last_name, username: u.username, photo_url: u.photo_url }, profile: profileOf(u) };
}));

// GET /api/tasks
U.get('/tasks', wrap((req) => ({ tasks: taskList(req.u) })));

// POST /api/tasks/start {id}
U.post('/tasks/start', wrap((req) => {
  const u = req.u, t = DB.tasks.find((x) => x.id === req.body?.id && x.active !== false);
  if (!t) fail('not_found', 404);
  const cur = u.taskState[t.id];
  if (cur?.status === 'done') fail('task_done', 409);
  if (!cur) u.taskState[t.id] = { status: 'started', verifyAt: Date.now() + (Number(t.verifySeconds) || 10) * 1000 }; // الوقت من الخادم لا من العميل
  save();
  return { task: publicTask(t, u), url: t.url };
}));

// التحقق الفعلي من عضوية قناة/مجموعة تيليجرام (اختياري عبر task.verifyChat)
async function isChatMember(chat, userId) {
  if (!BOT_TOKEN) return false;
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${encodeURIComponent(chat)}&user_id=${userId}`);
    const j = await r.json();
    return !!j.ok && ['creator', 'administrator', 'member', 'restricted'].includes(j.result?.status);
  } catch { return false; }
}

// POST /api/tasks/claim {id}
U.post('/tasks/claim', wrap(async (req) => {
  const u = req.u, t = DB.tasks.find((x) => x.id === req.body?.id);
  if (!t) fail('not_found', 404);
  const st = u.taskState[t.id];
  if (st?.status === 'done') fail('task_done', 409);
  if (!st || st.claiming) fail('task_pending', 409);
  if (Date.now() < st.verifyAt) fail('task_pending', 409, { wait: Math.ceil((st.verifyAt - Date.now()) / 1000) });
  if (t.verifyChat) {
    st.claiming = true; // قفل ضد الاستلام المزدوج أثناء انتظار تيليجرام
    let ok = false;
    try { ok = await isChatMember(t.verifyChat, u.id); } finally { st.claiming = false; }
    if (st.status === 'done') fail('task_done', 409);
    if (!ok) fail('task_pending', 409, { wait: 5 });
  }
  u.taskState[t.id] = { status: 'done', verifyAt: st.verifyAt };
  u.completed += 1; u.taskDays[dayKey()] = (u.taskDays[dayKey()] || 0) + 1;
  addTx(u, 'task', t.reward, { ref: t.title }); save();
  return { profile: profileOf(u), reward: t.reward, task: publicTask(t, u) };
}));

// POST /api/checkin
U.post('/checkin', wrap((req) => {
  const u = req.u, c = CFG();
  if (u.lastCheckin && Date.now() - u.lastCheckin < DAY) fail('checkin_wait', 429);
  const streak = curStreak(u) + 1, r = c.checkinRewards, reward = r[(streak - 1) % r.length];
  u.streak = streak; u.lastCheckin = Date.now(); addTx(u, 'checkin', reward); save();
  return { profile: profileOf(u), reward, streak };
}));

// POST /api/chest — صندوق المهام اليومي
U.post('/chest', wrap((req) => {
  const u = req.u, p = profileOf(u).daily;
  if (p.claimed) fail('task_done', 409);
  if (p.done < p.goal) fail('task_pending', 409);
  u.chestDay = dayKey(); addTx(u, 'gift', p.reward, { ref: 'صندوق المهام' }); save();
  return { profile: profileOf(u), reward: p.reward };
}));

// POST /api/spin — عجلة الحظ (الخادم يختار الجائزة)
U.post('/spin', wrap((req) => {
  const u = req.u, c = CFG();
  if (u.lastSpin && Date.now() - u.lastSpin < DAY) fail('spin_wait', 429);
  const prizes = c.spinPrizes, w = prizes.map((p) => 1 / (p * p + 0.05));
  let r = crypto.randomInt(0, 1e9) / 1e9 * w.reduce((a, b) => a + b, 0), index = 0;
  for (; index < w.length; index++) { r -= w[index]; if (r <= 0) break; }
  index = Math.min(index, prizes.length - 1);
  u.lastSpin = Date.now(); addTx(u, 'gift', prizes[index], { ref: 'عجلة الحظ' }); save();
  return { profile: profileOf(u), reward: prizes[index], index };
}));

// GET /api/leaderboard
U.get('/leaderboard', wrap((req) => {
  const u = req.u;
  const all = allUsers().filter((x) => !x.banned)
    .map((x) => ({ name: x.id === u.id ? 'أنت' : `${x.first_name} ${(x.last_name || '')[0] || ''}.`.trim(), amount: r2(x.totalEarned), me: x.id === u.id }))
    .sort((a, b) => b.amount - a.amount).map((x, i) => ({ ...x, rank: i + 1 }));
  return { top: all.slice(0, 5), me: all.find((x) => x.me) };
}));

// GET /api/referrals
U.get('/referrals', wrap((req) => {
  const f = friendsOf(req.u).map((x) => ({ name: x.first_name, joinedAt: x.joinedAt, earned: x.refBonus || 0 }));
  return { friends: f, stats: { count: f.length, earned: r2(req.u.referralEarnings) } };
}));

// POST /api/referrals/milestone {friends}
U.post('/referrals/milestone', wrap((req) => {
  const u = req.u, c = CFG(), m = c.milestones.find((x) => x.friends === Number(req.body?.friends));
  if (!m) fail('not_found', 404);
  if (u.milestones.includes(m.friends)) fail('task_done', 409);
  if (friendsOf(u).length < m.friends) fail('task_pending', 409);
  u.milestones.push(m.friends); addTx(u, 'referral', m.bonus, { ref: `جائزة ${m.friends} أصدقاء` }); save();
  return { profile: profileOf(u), reward: m.bonus };
}));

// POST /api/promo/redeem {code}
U.post('/promo/redeem', limiter('promo', 10, 60000, (r) => r.u.id), wrap((req) => {
  const u = req.u, code = String(req.body?.code || '').trim().toUpperCase(), p = DB.promos.find((x) => x.code === code);
  if (!code || !p || p.active === false) fail('promo_invalid', 404);
  if (u.usedPromos.includes(code)) fail('promo_used', 409);
  if (p.expiresAt && Date.now() > p.expiresAt) fail('promo_expired', 410);
  if (p.maxUses && p.uses >= p.maxUses) fail('promo_limit', 409);
  p.uses += 1; p.usedBy.push({ id: u.id, name: u.first_name, at: Date.now() }); u.usedPromos.push(code);
  addTx(u, 'gift', p.reward, { ref: `كود برومو ${code}` }); save();
  return { profile: profileOf(u), reward: p.reward };
}));

// POST /api/ads/start
U.post('/ads/start', wrap((req) => {
  const u = req.u, a = CFG().ads, done = (u.adDays || {})[dayKey()] || 0;
  if (!a.enabled) fail('ads_disabled', 403);
  if (done >= a.dailyLimit) fail('ads_limit', 409);
  if (u.lastAd && Date.now() < u.lastAd + a.cooldown * 1000) fail('ads_wait', 429, { wait: Math.ceil((u.lastAd + a.cooldown * 1000 - Date.now()) / 1000) });
  u.adSession = Date.now(); save();
  return { duration: a.duration, reward: a.reward, ads: profileOf(u).ads };
}));

// POST /api/ads/claim
U.post('/ads/claim', wrap((req) => {
  const u = req.u, a = CFG().ads, done = (u.adDays || {})[dayKey()] || 0;
  if (!a.enabled) fail('ads_disabled', 403);
  if (!u.adSession) fail('ads_pending', 409);
  if (done >= a.dailyLimit) fail('ads_limit', 409);
  const minWait = a.blockId ? 3 : a.duration; // مع Adsgram مدة الإعلان يحددها المعلن
  const left = Math.ceil((u.adSession + minWait * 1000 - Date.now()) / 1000);
  if (left > 0) fail('ads_pending', 409, { wait: left });
  u.adSession = 0; u.lastAd = Date.now(); u.adDays = { ...(u.adDays || {}), [dayKey()]: done + 1 };
  addTx(u, 'gift', a.reward, { ref: 'مشاهدة إعلان' }); save();
  return { profile: profileOf(u), reward: a.reward };
}));

// POST /api/withdraw — خصم ذرّي: التحقق والخصم في نفس الخطوة المتزامنة
U.post('/withdraw', limiter('withdraw', 5, 60000, (r) => r.u.id), wrap((req) => {
  const u = req.u, c = CFG(), b = req.body || {};
  const amount = r2(Number(b.amount)), address = String(b.addr ?? b.address ?? '').trim();
  const isBank = b.method === 'bank' || b.type === 'bank';
  let m, label; const rec = {};
  if (isBank) {
    m = c.bank || { min: c.minWithdraw, fee: 0 };
    if (!IBAN_RE.test(address) || !b.bank || !String(b.holder || '').trim()) fail('bad_address');
    label = String(b.bank).slice(0, 80);
    Object.assign(rec, { bank: label, countryName: String(b.countryName || '').slice(0, 60), country: String(b.country || '').slice(0, 4), holder: String(b.holder).trim().slice(0, 80), type: 'bank' });
  } else {
    m = c.methods.find((x) => x.id === b.method);
    if (!m) fail('not_found', 404);
    try { if (!new RegExp(m.pattern).test(address)) fail('bad_address'); } catch (e) { if (e.code) throw e; }
    label = m.name + (String(m.id).startsWith('usdt') ? ` ${m.sub}` : '');
  }
  if (!(amount > 0) || amount < Math.max(m.min || 0, c.minWithdraw)) fail('below_min');
  if (amount > u.balance) fail('insufficient', 402);
  if (u.withdrawals.some((w) => w.status === 'pending' && Date.now() - w.at < 30000)) fail('rate_limited', 429, { wait: 30 });
  const w = { id: `w${Date.now()}${crypto.randomBytes(2).toString('hex')}`, method: label, amount, fee: m.fee || 0, address, status: 'pending', at: Date.now(), ...rec };
  u.balance = r2(u.balance - amount); u.withdrawals.unshift(w); u.history.unshift({ type: 'withdraw', amount: -amount, at: Date.now() }); save();
  return { profile: profileOf(u), withdrawal: w };
}));

/* ═══════════════ الإدارة: POST /api/admin/:action ═══════════════ */
const signAdmin = (exp) => `${exp}.${crypto.createHmac('sha256', ADMIN_SECRET).update(String(exp)).digest('hex')}`;
const checkAdmin = (tok) => { const [exp, sig] = String(tok || '').split('.'); return !!exp && !!sig && Number(exp) > Date.now() && safeEq(signAdmin(exp), `${exp}.${sig}`); };
const AU = (id) => { const x = getUser(id); if (!x) fail('not_found', 404); return x; };

const ADMIN = {
  login: (b) => {
    if (!ADMIN_USER || !ADMIN_PASS || !safeEq(b.username || '', ADMIN_USER) || !safeEq(b.password || '', ADMIN_PASS)) fail('bad_login', 401);
    return { token: signAdmin(Date.now() + 12 * 3600 * 1000) };
  },
  stats: () => {
    const us = allUsers(), ws = us.flatMap((x) => x.withdrawals), pend = ws.filter((w) => w.status === 'pending');
    return { stats: {
      users: us.length, newToday: us.filter((x) => Date.now() - x.joinedAt < DAY).length, banned: us.filter((x) => x.banned).length,
      totalBalance: r2(us.reduce((s, x) => s + x.balance, 0)), totalEarned: r2(us.reduce((s, x) => s + x.totalEarned, 0)),
      totalPaid: r2(ws.filter((w) => w.status === 'paid' || w.status === 'approved').reduce((s, w) => s + w.amount, 0)),
      pendingCount: pend.length, pendingAmount: r2(pend.reduce((s, w) => s + w.amount, 0)), activePromos: DB.promos.filter((p) => p.active !== false).length,
      adsToday: us.reduce((s, x) => s + ((x.adDays || {})[dayKey()] || 0), 0),
      adsPaid: r2(us.reduce((s, x) => s + x.history.filter((h) => h.ref === 'مشاهدة إعلان').reduce((t, h) => t + h.amount, 0), 0)),
    } };
  },
  users: (b) => {
    const q = String(b.q || '').trim().toLowerCase();
    let l = allUsers();
    if (q) l = l.filter((x) => `${x.id} ${fullName(x)} ${x.username}`.toLowerCase().includes(q));
    if (b.filter === 'banned') l = l.filter((x) => x.banned);
    if (b.filter === 'rich') l = l.filter((x) => x.balance >= 5);
    l.sort((a, c) => c.joinedAt - a.joinedAt);
    const limit = Math.min(Number(b.limit) || 100, 500);
    return { total: l.length, users: l.slice(0, limit).map((x) => ({ id: x.id, name: fullName(x), username: x.username, balance: r2(x.balance), totalEarned: r2(x.totalEarned), friends: friendsOf(x).length, banned: x.banned, joinedAt: x.joinedAt })) };
  },
  user: (b) => {
    const x = AU(b.id), inv = getUser(x.invitedBy);
    const { history, withdrawals, taskState, taskDays, adDays, ...user } = x; // eslint-disable-line no-unused-vars
    return { user: { ...user, invitedByName: inv ? fullName(inv) : '' }, history: history.slice(0, 200), withdrawals,
      friends: friendsOf(x).map((f) => ({ name: fullName(f), joinedAt: f.joinedAt, earned: f.refBonus || 0 })), promos: x.usedPromos };
  },
  balance: (b) => {
    const x = AU(b.id), a = Number(b.amount);
    if (!Number.isFinite(a) || a === 0) fail('bad_value');
    if (x.balance + a < 0) fail('insufficient', 402);
    addTx(x, 'admin', a, { ref: String(b.note || (a > 0 ? 'إضافة رصيد' : 'خصم رصيد')).slice(0, 120) }, false); save();
    return { ok: true };
  },
  ban: (b) => { const x = AU(b.id); x.banned = !!b.banned; x.banReason = b.banned ? String(b.reason || '').slice(0, 160) : ''; save(); return { ok: true }; },
  delete: (b) => {
    const x = AU(b.id); delete DB.users[String(x.id)];
    allUsers().forEach((y) => { if (y.invitedBy === x.id) y.invitedBy = 0; });
    save(); return { ok: true };
  },
  withdrawals: (b) => {
    const l = allUsers().flatMap((x) => x.withdrawals.map((w) => ({ ...w, userId: x.id, userName: fullName(x) })));
    const f = b.status && b.status !== 'all' ? l.filter((w) => (b.status === 'paid' ? w.status === 'paid' || w.status === 'approved' : w.status === b.status)) : l;
    return { withdrawals: f.sort((a, c) => c.at - a.at) };
  },
  withdrawal: (b) => { // الرفض يعيد المبلغ للرصيد
    const x = allUsers().find((y) => y.withdrawals.some((w) => w.id === b.id));
    if (!x) fail('not_found', 404);
    const w = x.withdrawals.find((y) => y.id === b.id);
    if (w.status !== 'pending') fail('done', 409);
    w.status = b.status === 'paid' ? 'paid' : 'rejected'; w.note = String(b.note || '').slice(0, 200);
    if (w.status === 'rejected') addTx(x, 'admin', w.amount, { ref: 'إرجاع سحب مرفوض' }, false);
    save(); return { ok: true };
  },
  settings: () => ({ settings: RAW() }),
  saveSettings: (b) => {
    if (!b.settings || typeof b.settings !== 'object') fail('bad_value');
    const s = { ...b.settings }; delete s.demo;
    DB.settings = { ...(DB.settings || {}), ...s }; save();
    return { settings: RAW() };
  },
  tasks: () => ({ tasks: DB.tasks }),
  saveTask: (b) => {
    const t = { ...b.task }; if (!t || !String(t.title || '').trim()) fail('bad_value');
    t.reward = Number(t.reward); if (!Number.isFinite(t.reward) || t.reward < 0) fail('bad_value');
    if (!t.id) t.id = `t${Date.now().toString(36)}`;
    const i = DB.tasks.findIndex((x) => x.id === t.id);
    if (i >= 0) DB.tasks[i] = t; else DB.tasks.push(t);
    save(); return { tasks: DB.tasks };
  },
  deleteTask: (b) => { DB.tasks = DB.tasks.filter((x) => x.id !== b.id); save(); return { tasks: DB.tasks }; },
  promos: () => ({ promos: DB.promos }),
  savePromo: (b) => {
    const p = { ...b.promo, code: String(b.promo?.code || '').trim().toUpperCase() };
    if (!p.code) fail('bad_value');
    const i = DB.promos.findIndex((x) => x.code === p.code);
    if (i >= 0) { if (b.isNew) fail('exists', 409); DB.promos[i] = { ...DB.promos[i], ...p }; }
    else DB.promos.unshift({ uses: 0, usedBy: [], createdAt: Date.now(), active: true, ...p });
    save(); return { promos: DB.promos };
  },
  deletePromo: (b) => { DB.promos = DB.promos.filter((x) => x.code !== b.code); save(); return { promos: DB.promos }; },
};

app.post('/api/admin/:action', limiter('admin', 60, 60000), (req, res, next) => {
  try {
    const action = req.params.action, fn = Object.prototype.hasOwnProperty.call(ADMIN, action) ? ADMIN[action] : null;
    if (!fn) fail('not_found', 404);
    if (action === 'login') return limiter('adminlogin', 8, 15 * 60000)(req, res, (e) => { if (e) return next(e); try { res.json(fn(req.body || {})); } catch (er) { next(er); } });
    if (!checkAdmin(req.headers['x-admin-token'])) fail('unauthorized', 401);
    res.json(fn(req.body || {}));
  } catch (e) { next(e); }
});

// يُركَّب بعد مسار الأدمن حتى لا يمرّ /api/admin عبر التحقق من تيليجرام
app.use('/api', U);

/* ───────────── 404 + معالج الأخطاء (HTTP مناسب + {code,message}) ───────────── */
const MSG = { not_telegram: 'افتح التطبيق من داخل تيليجرام', bad_session: 'جلسة غير صالحة', expired: 'انتهت الجلسة', banned: 'الحساب محظور', not_found: 'غير موجود', rate_limited: 'طلبات كثيرة، حاول لاحقًا' };
app.use((req, res) => res.status(404).json({ success: false, code: 'not_found', message: 'المسار غير موجود' }));
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err instanceof AppError) return res.status(err.status).json({ success: false, code: err.code, message: MSG[err.code] || err.code, ...err.extra });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ success: false, code: 'bad_json', message: 'JSON غير صالح' });
  console.error(err);
  res.status(500).json({ success: false, code: 'server_error', message: 'خطأ في الخادم' });
});

app.listen(PORT, () => console.log(`✅ الخادم يعمل على المنفذ ${PORT}`));

