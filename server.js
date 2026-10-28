/* ════════════════════════════════════════════════════════════════════════
   خادم «بيت الربح العربي» (Money Slayer) — Telegram Mini App
   قاعدة البيانات: MongoDB (Atlas) — كل عملية مالية ذرّية على مستوى المستند،
   ويصلح للتشغيل كخادم دائم أو كدالة serverless (يصدّر app).

   التشغيل:
     npm i express mongodb
     ضع الإعدادات في ملف .env بجانب هذا الملف (أو كمتغيرات بيئة في الاستضافة) ثم:  node server.js

   المطلوب فقط (4 متغيرات): MONGODB_URI · BOT_TOKEN · ADMIN_USER · ADMIN_PASS
   الباقي اختياري: ADMIN_SECRET و WEBHOOK_SECRET يُشتقّان من BOT_TOKEN، و PUBLIC_URL يؤخذ من Vercel تلقائيًا،
   و ALLOWED_ORIGIN الافتراضي * (يُفضّل ضبطه على دومين الواجهة).

   متغيرات البيئة:
     MONGODB_URI     رابط الاتصال بـ MongoDB (مطلوب)
     MONGODB_DB      اسم قاعدة البيانات (moneyslayer)
     PORT            المنفذ (3001)
     BOT_TOKEN       توكن البوت — للتحقق من initData (مطلوب في الإنتاج)
     ADMIN_USER / ADMIN_PASS   بيانات دخول لوحة الإدارة (مطلوبة)
     ADMIN_SECRET    سر توقيع توكن الأدمن (ثابت! وإلا تنتهي الجلسات مع كل إعادة تشغيل)
     ALLOWED_ORIGIN  دومين التطبيق لـ CORS (أكثر من واحد مفصولة بفاصلة؛ * للتجربة فقط)
     PUBLIC_URL      الرابط العام لهذا الخادم https://api.example.com — لتسجيل webhook البوت تلقائيًا
     WEBHOOK_SECRET  سر webhook (حروف/أرقام/_/- فقط) — مطلوب لحفظ المُحيل عند ضغط Start (تُحتسب الإحالة عند أول دخول للتطبيق)
     APP_URL         رابط التطبيق المصغّر https://your-app.vercel.app — لزر «افتح التطبيق» في رد البوت
     DEV_MODE=1      يسمح بالترويسة x-dev-user-id بدل initData (للتطوير فقط!)
     ADMIN_DEMO_TOOLS=1  يفعّل أمري الأدمن التجريبيين simInvite و reset (reset يمسح كل البيانات! — للتجربة فقط)

   ───────────────────────── قائمة كل المسارات ─────────────────────────
   لعبة الصاروخ (RocketCrash): جولات مشتركة بين كل اللاعبين وبالرصيد الحقيقي؛ كل الحساب (الرهان/نقطة الانهيار/السحب/الأرباح) على الخادم فقط.
   قواعدها {enabled,minBet,maxBet,waitSec,rtp} تُخزَّن في settings.crash وتصل التطبيق عبر GET /api/config
   عام
     GET  /health
     GET  /telegram/setup?key=<WEBHOOK_SECRET>   تسجيل webhook البوت وعرض حالته (للتشخيص)
     GET  /api/config
     POST /telegram/webhook   (من تيليجرام فقط — ترويسة X-Telegram-Bot-Api-Secret-Token) ضغط /start ref_<id> ينشئ الحساب ويؤجّل الإحالة حتى يفتح المستخدم التطبيق فعلًا
   المستخدم (ترويسة x-telegram-init-data)
     GET  /api/user/profile?start_param=
     GET  /api/tasks
     POST /api/tasks/start            {id}
     POST /api/tasks/claim            {id}
     POST /api/checkin
     POST /api/chest
     GET  /api/leaderboard
     GET  /api/referrals
     POST /api/referrals/milestone    {friends}
     POST /api/promo/redeem           {code}
     POST /api/ads/start    يبدأ جلسة مشاهدة (يعيد duration/reward/zoneId)
     POST /api/ads/claim    يصرف المكافأة فقط بعد مرور duration كاملة منذ start وبعد انتهاء المؤقت بين الإعلانين
     POST /api/withdraw               {method,amount,address} | {method:'bank',amount,address,bank,holder,country,countryName}
     GET  /api/crash/state            حالة الجولة المشتركة + رهاناتي + اللاعبون + السجل + رصيدي (يستعلم عنها التطبيق دوريًا)
     POST /api/crash/bet              {slot:0|1, amount, autoAt?}   يخصم الرهان فورًا (قبل الإقلاع فقط)
     POST /api/crash/cancel           {slot}                        يلغي الرهان ويعيد المبلغ (قبل الإقلاع فقط)
     POST /api/crash/cashout          {slot}                        يسحب عند المضاعف الحالي المحسوب على الخادم
     GET  /api/treasure/state         لعبة الكنز: القواعد + لعبتي الجارية (إن وُجدت) + جدول المضاعفات + رصيدي + السجل
     POST /api/treasure/start         {amount}  يخصم الرهان ويختار الخادم موضع القنبلة سرًّا (crypto.randomInt)
     POST /api/treasure/pick          {index 0..8}  يفتح خريطة: آمنة ← يرتفع المضاعف، القنبلة ← خسارة (تُكشف القنبلة بعد انتهاء الجولة فقط)
     POST /api/treasure/cashout       يسحب عند المضاعف الحالي (بعد خريطة آمنة واحدة على الأقل)
   الإدارة (POST /api/admin/:action — ترويسة x-admin-token ما عدا login)
     login · stats · online (النشطون الآن) · users · user · balance · ban · delete · webhook
     withdrawals · withdrawal · settings · saveSettings (تشمل ads و crash — لعبة الصاروخ و treasure — لعبة الكنز)
     tasks · saveTask · deleteTask · promos · savePromo · deletePromo
     simInvite · reset   (تجريبيان — يعملان فقط مع ADMIN_DEMO_TOOLS=1)
   ════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/* تحميل ملف .env (بدون مكتبات) — لا يستبدل متغيرات البيئة الموجودة أصلًا */
try {
  for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch { /* لا يوجد .env */ }

const express = require('express');
const { MongoClient } = require('mongodb');

/* ───────────── الإعدادات ───────────── */
const PORT = Number(process.env.PORT) || 3001;
const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB = process.env.MONGODB_DB || 'moneyslayer';
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ADMIN_USER = process.env.ADMIN_USER || '';
const ADMIN_PASS = process.env.ADMIN_PASS || '';
// أسرار تُشتق تلقائيًا من BOT_TOKEN إذا لم تُضبط — فتكفي 4 متغيرات فقط (MONGODB_URI, BOT_TOKEN, ADMIN_USER, ADMIN_PASS)
const derive = (label) => (BOT_TOKEN ? crypto.createHmac('sha256', BOT_TOKEN).update(label).digest('hex') : '');
const ADMIN_SECRET = process.env.ADMIN_SECRET || derive('admin') || crypto.randomBytes(32).toString('hex');
const ALLOWED = (process.env.ALLOWED_ORIGIN || '*').split(',').map((s) => s.trim()).filter(Boolean);
const DEV_MODE = process.env.DEV_MODE === '1';
const DEMO_TOOLS = process.env.ADMIN_DEMO_TOOLS === '1';
const PUBLIC_URL = (process.env.PUBLIC_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')).replace(/\/+$/, '');
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || derive('webhook').slice(0, 48);
const APP_URL = process.env.APP_URL || '';
// روابط رسالة الترحيب (/start) — يمكن تغييرها من متغيرات البيئة دون تعديل الكود
const FRONTEND_URL = APP_URL || 'https://jovial-marigold-96501a.netlify.app/'; // رابط التطبيق (زر «اربح الان»)
const CHANNEL_URL = process.env.CHANNEL_URL || 'https://t.me/moneyslayerchannel';  // رابط القناة
const GROUP_URL = process.env.GROUP_URL || 'https://t.me/moneyslayergroup';        // رابط المجموعة
const INIT_MAX_AGE = 24 * 3600; // ثانية — عمر initData المسموح
const DAY = 86400000;

if (!MONGODB_URI) console.error('❌ MONGODB_URI غير مضبوط: لن يعمل الخادم بدون قاعدة بيانات.');
if (!DEV_MODE && !BOT_TOKEN) console.warn('⚠️  BOT_TOKEN غير مضبوط: كل طلبات المستخدمين ستُرفض.');
if (!WEBHOOK_SECRET) console.warn('⚠️  WEBHOOK_SECRET غير مضبوط: لن تُحتسب الإحالة القادمة من رابط البوت (?start=) — رابط التطبيق المباشر (startapp) يعمل.');
if (!ADMIN_USER || !ADMIN_PASS) console.warn('⚠️  ADMIN_USER/ADMIN_PASS غير مضبوطين: دخول الأدمن معطّل.');
if (!process.env.ADMIN_SECRET && !BOT_TOKEN) console.warn('⚠️  ADMIN_SECRET غير مضبوط: تنتهي جلسات الأدمن عند كل إعادة تشغيل.');

/* ───────────── الإعدادات الافتراضية (نفس src/data.js) ───────────── */
const DEFAULT_CONFIG = {
  appName: 'Money Slayer',
  minWithdraw: 5,
  welcomeBonus: 0.5,
  referralReward: 1,
  checkinRewards: [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.5],
  dailyGoal: 3,
  chestReward: 0.3,
  milestones: [{ friends: 5, bonus: 2 }, { friends: 10, bonus: 5 }, { friends: 25, bonus: 15 }, { friends: 50, bonus: 40 }],
  // ads (تُدار كلها من لوحة الأدمن عبر saveSettings): reward = مكافأة الإعلان · cooldown = المؤقت بين إعلانين (ثانية) · duration = أقل مدة مشاهدة قبل صرف المكافأة (ثانية) · dailyLimit = حد يومي
  //      zoneId = رقم منطقة SDK الإعلانات (libtl.com) — يقرؤه التطبيق من /api/config ويستدعي show_<zoneId>()
  ads: { enabled: true, reward: 0.02, dailyLimit: 50, duration: 15, cooldown: 10, blockId: '', zoneId: '12092133' },
  // crash: لعبة الصاروخ التجريبية — enabled = إظهار زر اللعبة · startBalance = الرصيد التجريبي الابتدائي · minBet/maxBet = حدود الرهان · waitSec = الانتظار بين الجولات (ثانية) · rtp = نسبة العائد للاعب %
  //        الحد الأقصى للمضاعف ثابت 22× (CRASH_CAP) · الرهان من 0.3 إلى 1000 · rtp=88 يعني ميزة معلنة للمنصة 12% على كل الرهانات
  crash: { enabled: true, startBalance: 1000, minBet: 0.3, maxBet: 1000, waitSec: 5, rtp: 88 },
  // treasure: لعبة كنز الخريطة (9 خرائط، قنبلة واحدة) — نفس مبدأ الكراش: النتيجة تُحسم على الخادم بعشوائية آمنة والعائد النظري للاعب rtp% معلن للجميع
  //           المضاعف بعد k خريطة آمنة = (rtp/100) × 9/(9−k) فيكون العائد المتوقع rtp% عند أي لحظة سحب (أقصى مضاعف = 9 × rtp/100)
  treasure: { enabled: true, minBet: 0.3, maxBet: 1000, rtp: 90 },
  botUsername: 'Moneyslayer1_bot',
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
const dayKey = (ts = Date.now()) => { const d = new Date(ts); return `d${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`; };
const fullName = (u) => [u.first_name, u.last_name].filter(Boolean).join(' ') || '—';
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const IBAN_RE = /^[A-Za-z0-9]{8,34}$/;
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;

class AppError extends Error {
  constructor(code, status = 400, extra = {}) { super(code); this.code = code; this.status = status; this.extra = extra; }
}
const fail = (code, status = 400, extra = {}) => { throw new AppError(code, status, extra); };

/* ───────────── قاعدة البيانات (MongoDB) ─────────────
   المجموعات: users (_id = معرّف تيليجرام) · tasks · promos (_id = الكود) · settings · meta
   كل تعديل على الرصيد يتم بتحديث ذرّي واحد (pipeline update) مع شرط في الفلتر،
   فلا يمكن لطلبين متزامنين خصم نفس الرصيد مرتين أو استلام نفس المكافأة مرتين. */
let users, tasksC, promos, settingsC, metaC, crashC, crashBets, treasureC;

async function seedTasks() {
  const first = await metaC.updateOne({ _id: 'seeded' }, { $setOnInsert: { at: Date.now() } }, { upsert: true });
  if (!first.upsertedCount) return; // المهام الافتراضية تُزرع مرة واحدة فقط (حتى لا تعود بعد حذفها)
  try { await tasksC.insertMany(SEED_TASKS.map((t, i) => ({ _id: t.id, ...t, ord: i })), { ordered: false }); } catch (e) { if (e.code !== 11000) throw e; }
}

async function connect() {
  if (!MONGODB_URI) throw new Error('MONGODB_URI missing');
  const client = new MongoClient(MONGODB_URI, { maxPoolSize: 10, serverSelectionTimeoutMS: 10000 });
  await client.connect();
  const db = client.db(MONGODB_DB);
  users = db.collection('users'); tasksC = db.collection('tasks'); promos = db.collection('promos');
  settingsC = db.collection('settings'); metaC = db.collection('meta');
  crashC = db.collection('crashRounds'); crashBets = db.collection('crashBets'); treasureC = db.collection('treasureGames');
  await Promise.all([
    users.createIndex({ invitedBy: 1 }), users.createIndex({ totalEarned: -1 }), users.createIndex({ joinedAt: -1 }),
    users.createIndex({ 'withdrawals.id': 1 }), promos.createIndex({ createdAt: -1 }), users.createIndex({ lastSeen: -1 }), users.createIndex({ crashSeen: -1 }),
    crashBets.createIndex({ round: 1, status: 1 }), crashBets.createIndex({ round: 1, uid: 1 }),
    treasureC.createIndex({ uid: 1 }, { unique: true, partialFilterExpression: { act: 1 } }), // لعبة جارية واحدة فقط لكل مستخدم
    treasureC.createIndex({ uid: 1, at: -1 }), treasureC.createIndex({ doneAt: 1 }, { expireAfterSeconds: 30 * 86400 }),
    crashBets.createIndex({ at: 1 }, { expireAfterSeconds: 7 * 86400 }), crashC.createIndex({ at: 1 }, { expireAfterSeconds: 7 * 86400 }),
  ]);
  await seedTasks();
  await ensureWebhook().catch((e) => console.error('setWebhook:', e.message));
  return client;
}
let ready = null;
const dbReady = () => ready || (ready = connect().catch((e) => { ready = null; throw e; }));

/** تنظيف إعدادات الإعلانات القادمة من لوحة الأدمن: قيم رقمية ضمن حدود معقولة، وما لم يُرسل يبقى كما هو */
function sanitizeAds(inp, cur) {
  if (!inp || typeof inp !== 'object') fail('bad_value');
  const num = (v, old, min, max, dec = 0) => {
    if (v === undefined || v === null || v === '') return old;
    const n = Number(v); if (!Number.isFinite(n) || n < min || n > max) fail('bad_value');
    return dec ? Math.round(n * 10 ** dec) / 10 ** dec : Math.round(n);
  };
  const out = { ...cur, ...inp };
  out.enabled = inp.enabled === undefined ? cur.enabled !== false : !!inp.enabled;
  out.reward = num(inp.reward, cur.reward, 0, 100, 4);        // مكافأة الإعلان الواحد
  out.cooldown = num(inp.cooldown, cur.cooldown, 0, 86400);   // المؤقت بين إعلانين (ثانية)
  out.duration = num(inp.duration, cur.duration, 1, 600);     // أقل مدة مشاهدة (ثانية)
  out.dailyLimit = num(inp.dailyLimit, cur.dailyLimit, 1, 10000);
  out.zoneId = String(inp.zoneId === undefined ? (cur.zoneId || '') : inp.zoneId).replace(/[^0-9A-Za-z_-]/g, '').slice(0, 40);
  out.blockId = String(inp.blockId === undefined ? (cur.blockId || '') : inp.blockId).slice(0, 60);
  return out;
}

/** تنظيف إعدادات لعبة الصاروخ القادمة من لوحة الأدمن (نفس حدود التحقق في AdminView) */
function sanitizeCrash(inp, cur) {
  if (!inp || typeof inp !== 'object') fail('bad_value');
  const num = (v, old, min, max, dec = 2) => {
    if (v === undefined || v === null || v === '') return old;
    const n = Number(v); if (!Number.isFinite(n) || n < min || n > max) fail('bad_value');
    return Math.round(n * 10 ** dec) / 10 ** dec;
  };
  const c = { ...DEFAULT_CONFIG.crash, ...(cur || {}) };
  const out = {
    enabled: inp.enabled === undefined ? c.enabled !== false : !!inp.enabled,
    startBalance: num(inp.startBalance, c.startBalance, 0, 1e7),
    minBet: num(inp.minBet, c.minBet, 0.01, 1e7),
    maxBet: num(inp.maxBet, c.maxBet, 0.01, 1e7),
    waitSec: num(inp.waitSec, c.waitSec, 3, 60, 0),
    rtp: num(inp.rtp, c.rtp, 50, 99.9, 1),
  };
  if (out.maxBet < out.minBet) fail('bad_value');
  return out;
}

/** تنظيف إعدادات لعبة الكنز (نفس حدود الكراش) */
function sanitizeTreasure(inp, cur) {
  if (!inp || typeof inp !== 'object') fail('bad_value');
  const num = (v, old, min, max, dec = 2) => {
    if (v === undefined || v === null || v === '') return old;
    const n = Number(v); if (!Number.isFinite(n) || n < min || n > max) fail('bad_value');
    return Math.round(n * 10 ** dec) / 10 ** dec;
  };
  const c = { ...DEFAULT_CONFIG.treasure, ...(cur || {}) };
  const out = {
    enabled: inp.enabled === undefined ? c.enabled !== false : !!inp.enabled,
    minBet: num(inp.minBet, c.minBet, 0.01, 1e7),
    maxBet: num(inp.maxBet, c.maxBet, 0.01, 1e7),
    rtp: num(inp.rtp, c.rtp, 50, 99.9, 1),
  };
  if (out.maxBet < out.minBet) fail('bad_value');
  return out;
}

/* الإعدادات (تُخزَّن في settings/main وتُدمج مع الافتراضية، مع ذاكرة مؤقتة قصيرة) */
let cfgCache = { at: 0, v: null };
async function RAW() {
  if (cfgCache.v && Date.now() - cfgCache.at < 2000) return cfgCache.v;
  const d = (await settingsC.findOne({ _id: 'main' })) || {}; delete d._id;
  const v = { ...DEFAULT_CONFIG, ...d, ads: { ...DEFAULT_CONFIG.ads, ...(d.ads || {}) }, crash: { ...DEFAULT_CONFIG.crash, ...(d.crash || {}) }, treasure: { ...DEFAULT_CONFIG.treasure, ...(d.treasure || {}) } };
  cfgCache = { at: Date.now(), v };
  return v;
}
const CFG = async () => { const c = await RAW(); return { ...c, methods: (c.methods || []).filter((m) => m.enabled !== false) }; };

const mkUser = (id, o = {}) => ({
  id, first_name: '', last_name: '', username: '', photo_url: '', balance: 0, totalEarned: 0, referralEarnings: 0, completed: 0, streak: 0,
  lastCheckin: 0, lastSpin: 0, lastAd: 0, adSession: 0, adDays: {}, adsEarned: 0, taskState: {}, taskDays: {}, chestDay: '', milestones: [],
  joinedAt: Date.now(), onboarded: true, history: [], withdrawals: [], invitedBy: 0, pendingRef: 0, refBonus: 0, banned: false, banReason: '', usedPromos: [], lastWithdrawAt: 0, ...o,
});
const getUser = (id) => users.findOne({ _id: Number(id) });
const curStreak = (u) => (Date.now() - u.lastCheckin > 2 * DAY ? 0 : u.streak);

/* ── تحديثات ذرّية (pipeline). المفتاح ذو النقطة مسموح: 'taskState.t1' ── */
const lit = (v) => ({ $literal: v });
const rnd = (field, amt) => ({ $round: [{ $add: [{ $ifNull: [field, 0] }, amt] }, 2] });
function stageFor({ amount = 0, earn = true, tx, set, expr, inc }) {
  const s = {};
  for (const [k, v] of Object.entries(set || {})) s[k] = lit(v);
  for (const [k, n] of Object.entries(inc || {})) s[k] = { $add: [{ $ifNull: [`$${k}`, 0] }, n] };
  Object.assign(s, expr || {});
  if (amount) {
    s.balance = rnd('$balance', amount);
    if (amount > 0 && earn) s.totalEarned = rnd('$totalEarned', amount);
  }
  if (tx) s.history = { $slice: [{ $concatArrays: [[lit(tx)], { $ifNull: ['$history', []] }] }, 500] };
  return [{ $set: s }];
}
const mutate = (filter, o) => users.findOneAndUpdate(filter, stageFor(o), { returnDocument: 'after' });
/** يضيف/يخصم رصيدًا ويسجّل العملية في السجل — يعيد المستند الجديد أو null إذا لم يطابق الفلتر */
const credit = (filter, type, amount, extra = {}, o = {}) => {
  const a = r2(amount);
  return mutate(filter, { ...o, amount: a, tx: { type, amount: a, at: Date.now(), ...extra } });
};

const dailyOf = (u, c) => ({ done: Math.min((u.taskDays || {})[dayKey()] || 0, c.dailyGoal), goal: c.dailyGoal, claimed: u.chestDay === dayKey(), reward: c.chestReward });

async function profileOf(u) {
  const c = await CFG(), now = Date.now(), day = dayKey();
  const claimedToday = u.lastCheckin && now - u.lastCheckin < DAY;
  const friends = await users.countDocuments({ invitedBy: u.id });
  return {
    balance: r2(u.balance), totalEarned: r2(u.totalEarned), completedTasks: u.completed, friends, referralEarnings: r2(u.referralEarnings),
    referralCode: `ref_${u.id}`, streak: curStreak(u), nextCheckinAt: claimedToday ? u.lastCheckin + DAY : 0, joinedAt: u.joinedAt,
    daily: dailyOf(u, c),
    milestonesClaimed: u.milestones || [], history: (u.history || []).slice(0, 60), withdrawals: (u.withdrawals || []).slice(0, 20),
    ads: { done: (u.adDays || {})[day] || 0, limit: c.ads.dailyLimit, reward: c.ads.reward, duration: c.ads.duration, nextAt: u.lastAd && now < u.lastAd + c.ads.cooldown * 1000 ? u.lastAd + c.ads.cooldown * 1000 : 0 },
  };
}
const publicTask = (t, u) => {
  const { verifyChat, verifyMembership, verifySeconds, _id, ord, ...pub } = t; // eslint-disable-line no-unused-vars
  const st = (u.taskState || {})[t.id] || {};
  return { ...pub, status: st.status || 'available', verifyAt: st.verifyAt || 0, opened: !!st.openedAt };
};

/* ───────────── التسجيل والإحالة (مشترك بين التطبيق والبوت) ─────────────
   الحساب يُنشأ مرة واحدة بـ upsert ذرّي (مع مكافأة الترحيب داخل المستند نفسه)، وعند الإنشاء الفعلي فقط
   (أي أول ظهور للحساب سواء من التطبيق أو من ضغط Start في البوت) تُحتسب الإحالة لصاحب الرابط.
   لا يوجد وضع وسيط «مُنشأ لكن لم يُحتسب»: إن فشلت الإحالة تُسجَّل في السجل ولا يتعطل الدخول.
   المصادر: start_param من رابط التطبيق (startapp=ref_ID) أو من رابط البوت (start=ref_ID) — كلاهما بالصيغة نفسها. */
const parseRef = (sp) => { const m = /^(?:ref_)?(\d{3,15})$/.exec(String(sp || '').trim()); return m ? Number(m[1]) : 0; };

/** يربط الحساب الجديد بالمُحيل ويمنحه المكافأة. يعيد المُحيل أو null (مع سبب في السجل) */
async function applyReferral(u, refId, c) {
  if (!refId) return null;
  if (refId === u.id) { console.log(`[ref] skip self ${u.id}`); return null; }
  const inviter = await getUser(refId);
  if (!inviter) { console.log(`[ref] skip: inviter ${refId} not found (referred ${u.id})`); return null; }
  if (inviter.banned) { console.log(`[ref] skip: inviter ${refId} banned`); return null; }
  const rw = r2(c.referralReward);
  // ربط ذرّي: ينجح مرة واحدة فقط لهذا الحساب
  const claim = await users.updateOne({ _id: u.id, invitedBy: 0 }, { $set: { invitedBy: inviter.id, refBonus: rw } });
  if (!claim.modifiedCount) return null;
  try {
    if (rw > 0) await credit({ _id: inviter.id }, 'referral', rw, { ref: u.first_name || 'صديق' }, { expr: { referralEarnings: rnd('$referralEarnings', rw) } });
  } catch (e) { // تراجع عن الربط كي لا يُحسب صديق بلا مكافأة
    await users.updateOne({ _id: u.id }, { $set: { invitedBy: 0, refBonus: 0 } }).catch(() => {});
    throw e;
  }
  console.log(`[ref] ok: ${u.id} invited by ${inviter.id} (+${rw})`);
  return inviter;
}

/** ينشئ الحساب إن لم يكن موجودًا، أو يحدّث بياناته إن كان موجودًا.
    الإحالة لا تُحتسب إلا عند دخول المستخدم فعليًا إلى التطبيق (طلب موقّع بـ initData):
    • فتح التطبيق مباشرة لأول مرة (startapp=ref_ID): تُحتسب فورًا.
    • ضغط Start في البوت (fromBot): يُحفظ المُحيل في pendingRef فقط دون أي مكافأة، وتُحتسب عند أول دخول للتطبيق. */
async function registerUser(tgUser, startParam, { fromBot = false } = {}) {
  const id = Number(tgUser.id), c = await CFG();
  const set = { last_name: String(tgUser.last_name || '').slice(0, 64), username: String(tgUser.username || '').slice(0, 64), lastSeen: Date.now() };
  if (tgUser.first_name) set.first_name = String(tgUser.first_name).slice(0, 64);
  if (tgUser.photo_url) set.photo_url = String(tgUser.photo_url).slice(0, 300);
  const welcome = c.welcomeBonus > 0 ? r2(c.welcomeBonus) : 0;
  const ins = mkUser(id, { balance: welcome, totalEarned: welcome, history: welcome ? [{ type: 'welcome', amount: welcome, at: Date.now() }] : [] });
  for (const k of Object.keys(set)) delete ins[k];

  let res;
  for (let i = 0; i < 2; i++) { // إعادة محاولة واحدة عند سباق الإنشاء (E11000) — الطرف الآخر هو من أنشأ ويتولى الإحالة
    try { res = await users.findOneAndUpdate({ _id: id }, { $set: set, $setOnInsert: ins }, { upsert: true, returnDocument: 'after', includeResultMetadata: true }); break; }
    catch (e) { if (e.code !== 11000 || i) throw e; }
  }
  let u = res.value;
  const created = !(res.lastErrorObject && res.lastErrorObject.updatedExisting);
  let inviter = null;
  if (created && !u.banned) {
    const refId = parseRef(startParam);
    if (fromBot) { // Start في البوت: تأجيل الإحالة حتى يدخل التطبيق فعلًا
      if (refId && refId !== id) await users.updateOne({ _id: id, invitedBy: 0 }, { $set: { pendingRef: refId } }).catch((e) => console.error('pendingRef:', e.message));
    } else {
      try { inviter = await applyReferral(u, refId, c); }
      catch (e) { console.error('referral:', e.message); }
    }
  } else if (!fromBot && !u.banned && u.pendingRef > 0 && !u.invitedBy) {
    // أول دخول فعلي للتطبيق بعد Start في البوت: يُحتسب المُحيل المؤجَّل مرة واحدة (حجز ذرّي)
    const refId = u.pendingRef;
    const claim = await users.updateOne({ _id: id, pendingRef: refId, invitedBy: 0 }, { $set: { pendingRef: 0 } });
    if (claim.modifiedCount) {
      try { inviter = await applyReferral(u, refId, c); }
      catch (e) { console.error('referral:', e.message); await users.updateOne({ _id: id, pendingRef: 0 }, { $set: { pendingRef: refId } }).catch(() => {}); } // يُعاد المحاولة عند الدخول التالي
    }
  }
  if (inviter) { u = await getUser(id); await notifyInviter(inviter, c.referralReward); }
  return { u, created, inviter };
}

/** رسالة من البوت للمُحيل (تفشل بصمت إن لم يبدأ محادثة مع البوت) */
async function notifyInviter(inviter, reward) {
  if (!BOT_TOKEN) return;
  try { await tgCall('sendMessage', { chat_id: inviter.id, text: `🎉 انضم صديق جديد عبر رابطك!\nأُضيفت مكافأة الإحالة (${r2(reward)}) إلى رصيدك.` }); }
  catch { /* اختياري */ }
}

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

/** وسيط المستخدم: يتحقق من initData في كل طلب، ينشئ الحساب أول مرة (ذرّيًا)، ويرفض المحظور */
async function auth(req, res, next) {
  try {
    let tg;
    if (DEV_MODE && req.headers['x-dev-user-id']) tg = { user: { id: Number(req.headers['x-dev-user-id']), first_name: 'Dev' }, start_param: '' };
    else tg = verifyInitData(req.headers['x-telegram-init-data']);
    const id = Number(tg.user.id);
    if (!Number.isSafeInteger(id) || id <= 0) fail('bad_session', 401);

    const { u } = await registerUser(tg.user, req.query.start_param || tg.start_param);
    if (u.banned) fail('banned', 403);
    req.tg = tg; req.u = u;
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

app.use(async (req, res, next) => { // انتظار الاتصال بقاعدة البيانات
  try { await dbReady(); next(); }
  catch (e) {
    console.error('mongo:', e.name, e.code || '', e.message);
    // تلميح آمن لسبب الفشل (بدون أي أسرار) لتسهيل التشخيص
    const m = String(e.message || ''), n = String(e.name || '');
    const hint = !MONGODB_URI ? 'MONGODB_URI_missing'
      : /bad auth|Authentication failed|AuthenticationFailed/i.test(m) ? 'wrong_username_or_password'
      : /ENOTFOUND|querySrv|ECONNREFUSED.*53/i.test(m) ? 'wrong_cluster_host_or_dns'
      : n === 'MongoParseError' || /Invalid (scheme|connection string)|must begin with|URI/i.test(m) ? 'invalid_uri_format'
      : n === 'MongoServerSelectionError' ? 'cannot_reach_atlas_check_network_access_0.0.0.0/0'
      : /Cannot find module/i.test(m) ? 'mongodb_package_missing' : n || 'unknown';
    res.status(503).json({ success: false, code: 'db_unavailable', message: 'قاعدة البيانات غير متاحة', hint });
  }
});

// حدّ معدّل بسيط في الذاكرة (لكل مفتاح: عدد الطلبات في نافذة زمنية)
const hits = new Map();
const limiter = (name, max, windowMs, keyFn = (req) => req.ip) => (req, res, next) => {
  const k = `${name}:${keyFn(req)}`, now = Date.now(), h = hits.get(k);
  if (!h || now > h.reset) { hits.set(k, { n: 1, reset: now + windowMs }); return next(); }
  if (++h.n > max) return next(new AppError('rate_limited', 429, { wait: Math.ceil((h.reset - now) / 1000) }));
  next();
};
setInterval(() => { const n = Date.now(); for (const [k, h] of hits) if (n > h.reset) hits.delete(k); }, 60000).unref();
const globalLimit = limiter('global', 120, 60000);
app.use('/api', (req, res, next) => (req.path === '/crash/state' ? next() : globalLimit(req, res, next))); // استعلام الصاروخ الدوري له حدّ خاص به

const wrap = (fn) => (req, res, next) => Promise.resolve().then(() => fn(req, res)).then((out) => { if (out !== undefined && !res.headersSent) res.json(out); }).catch(next);

/* ═══════════════ عام ═══════════════ */
app.get('/health', wrap(async () => ({ ok: true, users: await users.estimatedDocumentCount() })));
app.get('/api/config', wrap(async () => ({ config: await CFG() })));

/* ═══════════════ webhook البوت (احتساب إحالة /start ref_<id>) ═══════════════
   خارج /api عمدًا حتى لا يخضع لحدّ المعدّل العام (كل الطلبات من خوادم تيليجرام). */
const tgCall = async (method, body) => {
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}), signal: AbortSignal.timeout(8000) });
  return r.json();
};

/** يسجّل webhook البوت ويعيد النتيجة + حالته عند تيليجرام (آخر خطأ وعدد الرسائل المعلّقة) */
async function setupWebhook(base) {
  const url = `${base}/telegram/webhook`;
  const r = await tgCall('setWebhook', { url, secret_token: WEBHOOK_SECRET, allowed_updates: ['message'] }).catch((e) => ({ ok: false, description: e.message }));
  const i = await tgCall('getWebhookInfo').catch(() => null);
  return { success: !!r.ok, webhook_url: url, telegram: r, info: i && i.result ? { url: i.result.url, pending: i.result.pending_update_count, last_error: i.result.last_error_message || null } : null };
}

async function ensureWebhook() { // يُسجَّل مرة واحدة فقط ما لم يتغير الرابط أو السر
  if (!BOT_TOKEN || !PUBLIC_URL || !WEBHOOK_SECRET) return;
  const sig = crypto.createHash('sha256').update(`${PUBLIC_URL}|${WEBHOOK_SECRET}`).digest('hex');
  const m = await metaC.findOne({ _id: 'webhook' });
  if (m && m.sig === sig) return;
  const j = await tgCall('setWebhook', { url: `${PUBLIC_URL}/telegram/webhook`, secret_token: WEBHOOK_SECRET, allowed_updates: ['message'] });
  console.log(j.ok ? '✅ تم تسجيل webhook البوت' : `⚠️  فشل تسجيل webhook: ${j.description}`);
  if (j.ok) await metaC.updateOne({ _id: 'webhook' }, { $set: { sig } }, { upsert: true });
}

async function sendWelcome(chatId) {
  // رسالة الترحيب تُرسل لكل من يضغط /start (عبر الـ webhook، دون polling حتى لا يتعارض مع الاستضافة serverless)
  const welcomeText = `*✅ اهلا وسهلا بك في تطبيق Money Slayer للربح من المنزل بدون مجهود وبسهولة تامة ونطلق على مشروعنا " مملكة الربح السريع " اضغط هنا على اربح الان الموجودة في الاسفل واكسب 👇💎*`;
  await tgCall('sendMessage', {
    chat_id: chatId,
    text: welcomeText,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'اربح الان 💸', web_app: { url: FRONTEND_URL } }],          // فتح التطبيق
        [{ text: 'اشترك في قناتنا 💎', url: CHANNEL_URL }],                  // القناة
        [{ text: 'انضم لمجموعتنا على تلجرام 💡', url: GROUP_URL }],         // المجموعة
      ],
    },
  });
}

async function handleUpdate(up) {
  const m = up && up.message;
  if (!m || !m.from || m.from.is_bot || !m.chat || m.chat.type !== 'private') return;
  const t = /^\/start(?:@\w+)?(?:\s+(\S+))?/.exec(String(m.text || ''));
  if (!t) return;
  // ضغط Start ينشئ الحساب فقط ويحفظ المُحيل مؤجَّلًا (pendingRef) — لا مكافأة إحالة حتى يفتح المستخدم التطبيق فعلًا
  try { await registerUser(m.from, t[1], { fromBot: true }); } catch (e) { console.error('start-register:', e.message); }
  await sendWelcome(m.chat.id);
}

app.post('/telegram/webhook', async (req, res) => {
  if (!BOT_TOKEN || !WEBHOOK_SECRET || !safeEq(req.headers['x-telegram-bot-api-secret-token'] || '', WEBHOOK_SECRET)) return res.sendStatus(403);
  try { await handleUpdate(req.body); } catch (e) { console.error('webhook:', e.message); }
  res.sendStatus(200); // الرد بعد المعالجة (مطلوب في بيئات serverless)
});

// تسجيل/فحص الـ webhook بضغطة واحدة: افتح في المتصفح  https://<دومين-الخادم>/telegram/setup?key=<WEBHOOK_SECRET>
// (اضبط WEBHOOK_SECRET صراحةً في متغيرات البيئة لتعرف قيمته). النتيجة تُظهر last_error إن كان تيليجرام لا يستطيع الوصول للخادم.
app.get('/telegram/setup', limiter('tgsetup', 10, 60000), wrap(async (req) => {
  if (!BOT_TOKEN || !WEBHOOK_SECRET) fail('not_found', 404);
  if (!safeEq(String(req.query.key || ''), WEBHOOK_SECRET)) fail('unauthorized', 403);
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return setupWebhook(PUBLIC_URL || `https://${host}`);
}));

/* ═══════════════ المستخدم ═══════════════ */
const U = express.Router();
U.use(auth);

// GET /api/user/profile?start_param=  — الحساب والإحالة يُنشآن في auth (onboard) عند أول طلب
U.get('/user/profile', wrap(async (req) => {
  const u = req.u;
  return { user: { id: u.id, first_name: u.first_name, last_name: u.last_name, username: u.username, photo_url: u.photo_url }, profile: await profileOf(u) };
}));

// GET /api/tasks
U.get('/tasks', wrap(async (req) => {
  const list = await tasksC.find({ active: { $ne: false } }).sort({ ord: 1 }).toArray();
  return { tasks: list.map((t) => publicTask(t, req.u)) };
}));

// POST /api/tasks/start {id}
U.post('/tasks/start', wrap(async (req) => {
  const u = req.u, id = String(req.body?.id || '');
  if (!ID_RE.test(id)) fail('not_found', 404);
  const t = await tasksC.findOne({ _id: id, active: { $ne: false } });
  if (!t) fail('not_found', 404);
  const cur = (u.taskState || {})[id];
  if (cur?.status === 'done') fail('task_done', 409);
  let st = cur;
  if (!cur) { // الوقت من الخادم لا من العميل
    st = { status: 'started', verifyAt: Date.now() + (Number(t.verifySeconds) || 10) * 1000 };
    const r = await users.updateOne({ _id: u.id, [`taskState.${id}`]: { $exists: false } }, { $set: { [`taskState.${id}`]: st } });
    if (!r.modifiedCount) { st = ((await getUser(u.id)).taskState || {})[id] || st; if (st.status === 'done') fail('task_done', 409); }
  }
  return { task: publicTask(t, { taskState: { [id]: st } }), url: t.url };
}));

// POST /api/tasks/opened {id} — مهمة القصة: يسجّل الخادم لحظة فتح المستخدم محرر القصص، ومنها يبدأ عدّاد الانتظار (verifySeconds، الافتراضي 60 ثانية).
// لا يمكن استلام مهمة القصة قبل هذا الاستدعاء. (لا يثبت النشر الفعلي: تيليجرام لا يتيح ذلك — يمنع الاستلام العشوائي فقط)
U.post('/tasks/opened', wrap(async (req) => {
  const u = req.u, id = String(req.body?.id || '');
  if (!ID_RE.test(id)) fail('not_found', 404);
  const t = await tasksC.findOne({ _id: id, active: { $ne: false } });
  if (!t || t.check !== 'story') fail('not_found', 404);
  if ((u.taskState || {})[id]?.status === 'done') fail('task_done', 409);
  const p = `taskState.${id}`, now = Date.now();
  await users.updateOne(
    { _id: u.id, [`${p}.openedAt`]: { $exists: false }, $or: [{ [`${p}.status`]: { $exists: false } }, { [`${p}.status`]: 'started' }] },
    { $set: { [`${p}.status`]: 'started', [`${p}.openedAt`]: now, [`${p}.verifyAt`]: now + (Number(t.verifySeconds) || 60) * 1000 } },
  );
  const nu = await getUser(u.id);
  return { task: publicTask(t, nu) };
}));

/* التحقق الفعلي من مهام تيليجرام (انضمام لقناة/مجموعة): لا مكافأة إن لم يكن المستخدم عضوًا فعلًا.
   الهدف يُحدَّد بـ task.verifyChat (مثل @channel أو -100123…) أو يُستنتج تلقائيًا من رابط t.me/<اسم> العام.
   لإيقاف التحقق التلقائي لمهمة معيّنة اجعل verifyMembership=false. شرط العمل: البوت مشرف في القناة/المجموعة. */
function verifyTarget(t) {
  if (t.verifyChat) return String(t.verifyChat).trim();
  if (t.verifyMembership === false) return '';
  const m = /^https?:\/\/(?:www\.)?(?:t|telegram)\.me\/([A-Za-z][A-Za-z0-9_]{3,31})(?:\/\d+)?\/?(?:\?.*)?$/i.exec(String(t.url || '').trim());
  if (!m || /bot$/i.test(m[1])) return ''; // روابط البوتات والدعوات الخاصة لا يمكن التحقق منها تلقائيًا
  return `@${m[1]}`;
}

async function isChatMember(chat, userId) {
  if (!BOT_TOKEN) return false;
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${encodeURIComponent(chat)}&user_id=${userId}`, { signal: AbortSignal.timeout(8000) });
    const j = await r.json();
    if (!j.ok) { console.warn(`[verify] getChatMember ${chat}: ${j.description || 'error'} — تأكد أن البوت مشرف في القناة/المجموعة`); return false; }
    return ['creator', 'administrator', 'member', 'restricted'].includes(j.result?.status) && j.result?.is_member !== false;
  } catch (e) { console.warn('[verify]', e.message); return false; }
}

/* مهام الملف الشخصي (تُختار لكل مهمة من لوحة الأدمن عبر الحقل task.check):
   • bio   : رابط إحالة المستخدم نفسه (ref_<id> + اسم البوت) موجود في سيرته على تيليجرام — يُتحقق منه فعليًا عبر getChat.
   • name  : الاسم الشخصي على تيليجرام يحتوي 💡 ونص task.checkText (افتراضيًا اسم التطبيق) — يُتحقق منه فعليًا عبر getChat.
   • story : نشر قصة بصورة task.storyImage ورابط الإحالة. تيليجرام لا يتيح للبوتات قراءة القصص، فلا يمكن التحقق منها آليًا؛
             المهمة تعتمد على مدة الانتظار verifySeconds فقط (الأفضل رفع مكافأتها قليلًا أو جعلها أقل قيمة من مهمتي البيو والاسم).
   شرط التحقق: أن يكون المستخدم قد فتح البوت (Start) مرة على الأقل، وإلا يرفض تيليجرام getChat. */
const CHECKS = ['bio', 'name', 'story'];
async function profileInfo(userId) {
  if (!BOT_TOKEN) return null;
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat?chat_id=${userId}`, { signal: AbortSignal.timeout(8000) });
    const j = await r.json();
    if (!j.ok) { console.warn(`[verify] getChat ${userId}: ${j.description || 'error'}`); return null; }
    return j.result || null;
  } catch (e) { console.warn('[verify]', e.message); return null; }
}
/** يعيد null عند النجاح أو رمز الخطأ: need_start | bio_missing | name_missing */
async function checkProfile(kind, t, u, c) {
  if (kind === 'story') return null;
  const info = await profileInfo(u.id);
  if (!info) return 'need_start';
  const bot = String(c.botUsername || '').replace(/^@/, '').toLowerCase();
  if (kind === 'bio') {
    const bio = String(info.bio || '').toLowerCase();
    return bio.includes(`ref_${u.id}`) && (!bot || bio.includes(bot)) ? null : 'bio_missing';
  }
  const full = `${info.first_name || ''} ${info.last_name || ''}`.toLowerCase();
  const need = String(t.checkText || c.appName || '').trim().toLowerCase();
  return full.includes('💡') && (!need || full.includes(need)) ? null : 'name_missing';
}
const CHECK_MSG = {
  need_start: 'افتح البوت واضغط «Start» مرة واحدة ثم أعد المحاولة',
  bio_missing: 'لم نجد رابط إحالتك في سيرتك (البيو). ضعه ثم اضغط استلام',
  name_missing: 'لم نجد 💡 واسم البوت في اسمك الشخصي. أضفهما ثم اضغط استلام',
};

// POST /api/tasks/claim {id}
U.post('/tasks/claim', wrap(async (req) => {
  const u = req.u, id = String(req.body?.id || '');
  if (!ID_RE.test(id)) fail('not_found', 404);
  const t = await tasksC.findOne({ _id: id });
  if (!t) fail('not_found', 404);
  const p = `taskState.${id}`, st = (u.taskState || {})[id];
  if (st?.status === 'done') fail('task_done', 409);
  if (!st) fail('task_pending', 409);
  if (t.check === 'story' && !st.openedAt) fail('story_not_opened', 409, { message: 'افتح محرر القصة أولًا' });
  if (Date.now() < st.verifyAt) fail('task_pending', 409, { wait: Math.ceil((st.verifyAt - Date.now()) / 1000) });
  const kind = CHECKS.includes(t.check) ? t.check : '';
  const vChat = kind ? '' : verifyTarget(t);
  if (vChat || kind === 'bio' || kind === 'name') {
    // قفل ضد الاستلام المزدوج أثناء انتظار تيليجرام (ينتهي تلقائيًا بعد 60 ثانية)
    const lk = await users.updateOne(
      { _id: u.id, [`${p}.status`]: 'started', $or: [{ [`${p}.claiming`]: { $exists: false } }, { [`${p}.claiming`]: { $lt: Date.now() - 60000 } }] },
      { $set: { [`${p}.claiming`]: Date.now() } },
    );
    if (!lk.matchedCount) fail('task_pending', 409);
    let ok = false, code = '';
    try {
      if (kind) { code = (await checkProfile(kind, t, u, await CFG())) || ''; ok = !code; }
      else ok = await isChatMember(vChat, u.id);
    } finally { await users.updateOne({ _id: u.id }, { $unset: { [`${p}.claiming`]: '' } }); }
    if (!ok) fail(code || 'not_joined', 409, { wait: 5, message: CHECK_MSG[code] || 'لم يتم التحقق من تنفيذ المهمة — انضم أولًا ثم اضغط استلام' });
  }
  const day = dayKey();
  const nu = await credit({ _id: u.id, [`${p}.status`]: 'started' }, 'task', t.reward, { ref: t.title },
    { set: { [p]: { status: 'done', verifyAt: st.verifyAt } }, inc: { completed: 1, [`taskDays.${day}`]: 1 } });
  if (!nu) fail('task_done', 409);
  return { profile: await profileOf(nu), reward: t.reward, task: publicTask(t, nu) };
}));

// POST /api/checkin
U.post('/checkin', wrap(async (req) => {
  const u = req.u, c = await CFG();
  if (u.lastCheckin && Date.now() - u.lastCheckin < DAY) fail('checkin_wait', 429);
  const streak = curStreak(u) + 1, r = c.checkinRewards, reward = r[(streak - 1) % r.length];
  const nu = await credit({ _id: u.id, lastCheckin: u.lastCheckin }, 'checkin', reward, {}, { set: { streak, lastCheckin: Date.now() } });
  if (!nu) fail('checkin_wait', 429);
  return { profile: await profileOf(nu), reward, streak };
}));

// POST /api/chest — صندوق المهام اليومي
U.post('/chest', wrap(async (req) => {
  const u = req.u, p = dailyOf(u, await CFG());
  if (p.claimed) fail('task_done', 409);
  if (p.done < p.goal) fail('task_pending', 409);
  const nu = await credit({ _id: u.id, chestDay: { $ne: dayKey() } }, 'gift', p.reward, { ref: 'صندوق المهام' }, { set: { chestDay: dayKey() } });
  if (!nu) fail('task_done', 409);
  return { profile: await profileOf(nu), reward: p.reward };
}));

// GET /api/leaderboard
U.get('/leaderboard', wrap(async (req) => {
  const u = req.u, base = { banned: { $ne: true } };
  const rows = await users.find(base).sort({ totalEarned: -1, joinedAt: 1 }).limit(5).project({ id: 1, first_name: 1, last_name: 1, totalEarned: 1 }).toArray();
  const mk = (x, i) => { const amount = r2(x.totalEarned); return { name: x.id === u.id ? 'أنت' : `${x.first_name} ${(x.last_name || '')[0] || ''}.`.trim(), amount, total: amount, me: x.id === u.id, rank: i + 1 }; };
  const top = rows.map(mk);
  let me = top.find((x) => x.me);
  if (!me) {
    const ahead = await users.countDocuments({ ...base, totalEarned: { $gt: u.totalEarned } });
    const amount = r2(u.totalEarned);
    me = { name: 'أنت', amount, total: amount, me: true, rank: ahead + 1 };
  }
  return { top, me };
}));

// GET /api/referrals
U.get('/referrals', wrap(async (req) => {
  const list = await users.find({ invitedBy: req.u.id }).sort({ joinedAt: -1 }).limit(500).toArray();
  const f = list.map((x) => ({ name: x.first_name, joinedAt: x.joinedAt, earned: x.refBonus || 0 }));
  return { friends: f, stats: { count: await users.countDocuments({ invitedBy: req.u.id }), earned: r2(req.u.referralEarnings) } };
}));

// POST /api/referrals/milestone {friends}
U.post('/referrals/milestone', wrap(async (req) => {
  const u = req.u, c = await CFG(), m = c.milestones.find((x) => x.friends === Number(req.body?.friends));
  if (!m) fail('not_found', 404);
  if ((u.milestones || []).includes(m.friends)) fail('task_done', 409);
  if ((await users.countDocuments({ invitedBy: u.id })) < m.friends) fail('task_pending', 409);
  const nu = await credit({ _id: u.id, milestones: { $ne: m.friends } }, 'referral', m.bonus, { ref: `جائزة ${m.friends} أصدقاء` },
    { expr: { milestones: { $concatArrays: [{ $ifNull: ['$milestones', []] }, [m.friends]] } } });
  if (!nu) fail('task_done', 409);
  return { profile: await profileOf(nu), reward: m.bonus };
}));

// POST /api/promo/redeem {code}
U.post('/promo/redeem', limiter('promo', 10, 60000, (r) => r.u.id), wrap(async (req) => {
  const u = req.u, code = String(req.body?.code || '').trim().toUpperCase().slice(0, 40);
  const p = code ? await promos.findOne({ _id: code }) : null;
  if (!code || !p || p.active === false) fail('promo_invalid', 404);
  if ((u.usedPromos || []).includes(code)) fail('promo_used', 409);
  if (p.expiresAt && Date.now() > p.expiresAt) fail('promo_expired', 410);
  if (p.maxUses && p.uses >= p.maxUses) fail('promo_limit', 409);
  // 1) حجز استخدام من الكود (يمنع تجاوز الحد عند الطلبات المتزامنة)
  const claimed = await promos.updateOne(
    { _id: code, $expr: { $or: [{ $not: ['$maxUses'] }, { $lt: [{ $ifNull: ['$uses', 0] }, '$maxUses'] }] } },
    { $inc: { uses: 1 }, $push: { usedBy: { id: u.id, name: u.first_name, at: Date.now() } } },
  );
  if (!claimed.modifiedCount) fail('promo_limit', 409);
  // 2) منح المكافأة مرة واحدة فقط لكل مستخدم
  const nu = await credit({ _id: u.id, usedPromos: { $ne: code } }, 'gift', p.reward, { ref: `كود برومو ${code}` },
    { expr: { usedPromos: { $concatArrays: [{ $ifNull: ['$usedPromos', []] }, [code]] } } });
  if (!nu) { // طلب مكرر متزامن: تراجع عن الحجز
    await promos.updateOne({ _id: code }, { $inc: { uses: -1 }, $pull: { usedBy: { id: u.id } } });
    fail('promo_used', 409);
  }
  return { profile: await profileOf(nu), reward: p.reward };
}));

// POST /api/ads/start — يبدأ جلسة مشاهدة (الوقت يُسجَّل من الخادم). المؤقت بين الإعلانين وحدّه اليومي من إعدادات الأدمن
U.post('/ads/start', wrap(async (req) => {
  const u = req.u, a = (await CFG()).ads, now = Date.now(), done = (u.adDays || {})[dayKey()] || 0;
  if (!a.enabled) fail('ads_disabled', 403);
  if (done >= a.dailyLimit) fail('ads_limit', 409);
  const nextAt = u.lastAd ? u.lastAd + a.cooldown * 1000 : 0;
  if (nextAt && now < nextAt) fail('ads_wait', 429, { wait: Math.ceil((nextAt - now) / 1000) });
  const nu = await mutate({ _id: u.id }, { set: { adSession: now } });
  return { duration: a.duration, reward: a.reward, zoneId: a.zoneId || '', ads: (await profileOf(nu)).ads };
}));

// POST /api/ads/claim — لا تُصرف المكافأة إلا بعد مرور مدة الإعلان كاملة (duration) منذ start، ومرة واحدة لكل جلسة
U.post('/ads/claim', wrap(async (req) => {
  const u = req.u, a = (await CFG()).ads, now = Date.now(), day = dayKey(), done = (u.adDays || {})[day] || 0;
  if (!a.enabled) fail('ads_disabled', 403);
  if (!u.adSession) fail('ads_pending', 409);
  if (done >= a.dailyLimit) fail('ads_limit', 409);
  const left = Math.ceil((u.adSession + a.duration * 1000 - now) / 1000); // مدة المشاهدة الكاملة من إعدادات الأدمن
  if (left > 0) fail('ads_pending', 409, { wait: left });
  if (now - u.adSession > 30 * 60000) { // جلسة قديمة جدًا: تُلغى ويُطلب إعلان جديد
    await users.updateOne({ _id: u.id, adSession: u.adSession }, { $set: { adSession: 0 } });
    fail('ads_pending', 409);
  }
  const nextAt = u.lastAd ? u.lastAd + a.cooldown * 1000 : 0; // المؤقت بين إعلانين يُفرض هنا أيضًا
  if (nextAt && now < nextAt) fail('ads_wait', 429, { wait: Math.ceil((nextAt - now) / 1000) });
  const ap = `adDays.${day}`;
  const nu = await credit(
    { _id: u.id, adSession: u.adSession, $or: [{ [ap]: { $exists: false } }, { [ap]: { $lt: a.dailyLimit } }] }, 'gift', a.reward, { ref: 'مشاهدة إعلان' },
    { set: { adSession: 0, lastAd: now }, inc: { [ap]: 1 }, expr: { adsEarned: rnd('$adsEarned', r2(a.reward)) } },
  );
  if (!nu) fail('ads_pending', 409);
  return { profile: await profileOf(nu), reward: a.reward };
}));

// POST /api/withdraw — خصم ذرّي: التحقق من الرصيد والخصم في تحديث واحد
U.post('/withdraw', limiter('withdraw', 5, 60000, (r) => r.u.id), wrap(async (req) => {
  const u = req.u, c = await CFG(), b = req.body || {};
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
  const now = Date.now();
  const w = { id: `w${now}${crypto.randomBytes(2).toString('hex')}`, method: label, amount, fee: m.fee || 0, address, status: 'pending', at: now, ...rec };
  const nu = await mutate(
    { _id: u.id, balance: { $gte: amount }, $or: [{ lastWithdrawAt: { $exists: false } }, { lastWithdrawAt: { $lte: now - 30000 } }] },
    { amount: -amount, tx: { type: 'withdraw', amount: -amount, at: now }, set: { lastWithdrawAt: now }, expr: { withdrawals: { $concatArrays: [[lit(w)], { $ifNull: ['$withdrawals', []] }] } } },
  );
  if (!nu) {
    const cur = await getUser(u.id);
    if (!cur || cur.balance < amount) fail('insufficient', 402);
    fail('rate_limited', 429, { wait: 30 });
  }
  return { profile: await profileOf(nu), withdrawal: w };
}));

/* ═══════════════ لعبة الصاروخ (جولات مشتركة، رصيد حقيقي) ═══════════════
   • كل الحساب على الخادم: نقطة الانهيار تُولَّد بـ crypto عند إنشاء الجولة وتبقى سرّية حتى تنهار.
   • الجولة مخزّنة في MongoDB (crashRounds) فتعمل على Vercel (serverless) وعلى خادم دائم بالسلوك نفسه:
     أي طلب يصل بعد انتهاء الجولة السابقة يُسوّيها ثم ينشئ التالية (إنشاء ذرّي بمفتاح متسلسل _id).
   • الرهان: إدراج مستند فريد (جولة:لاعب:خانة) ثم خصم ذرّي بشرط الرصيد؛ السحب: «حجز» ذرّي للرهان ثم إضافة الربح.
   • المضاعف = e^(0.085 × الثواني منذ الإقلاع) مقرَّبًا للأسفل لرقمين؛ السحب بعد الانهيار أو عند المضاعف ≥ نقطة الانهيار = خسارة.
   • RTP: P(نقطة الانهيار ≥ x) = rtp/(100·x) فيكون العائد المتوقع rtp% عند أي مضاعف سحب (الباقي ميزة معلنة للمنصة). أقصى مضاعف 22×. */
const CRASH_GROW = 0.085, CRASH_SHOW_MS = 3200, CRASH_CAP = 22;
const CRASH_STATUS = ['active', 'cashed', 'lost'];
const crashMsOf = (cp) => Math.round(Math.log(Math.min(CRASH_CAP, Math.max(1, cp))) / CRASH_GROW * 1000);
const crashMult = (r, t) => Math.min(CRASH_CAP, Math.floor(Math.exp(r.grow * Math.max(0, t - r.flightAt) / 1000) * 100) / 100);
function genCrashPoint(rtp) {
  const x = crypto.randomInt(0, 2 ** 32) / 2 ** 32; // [0,1)
  return Math.min(CRASH_CAP, Math.max(1, Math.floor(rtp / (1 - x)) / 100));
}
const crashPhase = (r, t) => (t < r.flightAt ? 'wait' : t < r.endAt && crashMult(r, t) < r.crashPoint ? 'fly' : 'crash');
const maskName = (u) => `${String(u.first_name || u.id).replace(/\s+/g, '').slice(0, 2)}*****`;

/** يصرف ربح رهان (حجز ذرّي ثم إضافة للرصيد). يعيد الربح أو null إن سبقه أحد */
async function crashPay(b, mult) {
  const win = r2(b.amount * mult);
  const claim = await crashBets.findOneAndUpdate({ _id: b._id, status: 'active' }, { $set: { status: 'cashed', mult, win } });
  if (!claim) return null;
  try { await credit({ _id: b.uid }, 'crash_win', win, { ref: `ربح الصاروخ ${mult.toFixed(2)}x` }, { earn: false }); }
  catch (e) { await crashBets.updateOne({ _id: b._id }, { $set: { status: 'active' }, $unset: { mult: '', win: '' } }).catch(() => {}); throw e; }
  return win;
}

/** يسوّي كل رهانات جولة انتهت: السحب التلقائي الذي سبق الانهيار يُصرف، والباقي يخسر */
async function crashSettle(r) {
  if (r.settled) return;
  let ok = true;
  for (const b of await crashBets.find({ round: r._id, status: 'active' }).toArray()) {
    try {
      if (b.autoAt >= 1.01 && b.autoAt < r.crashPoint) await crashPay(b, b.autoAt);
      else await crashBets.updateOne({ _id: b._id, status: 'active' }, { $set: { status: 'lost', mult: 0, win: 0 } });
    } catch (e) { ok = false; console.error('crash settle:', e.message); }
  }
  if (ok) await crashC.updateOne({ _id: r._id }, { $set: { settled: true } });
}

/** يصرف أثناء الطيران أي سحب تلقائي بلغه المضاعف الحالي */
async function crashAutoCash(r, m) {
  for (const b of await crashBets.find({ round: r._id, status: 'active', autoAt: { $gte: 1.01, $lte: m } }).toArray()) {
    try { await crashPay(b, b.autoAt); } catch (e) { console.error('crash auto:', e.message); }
  }
}

/** الجولة الحالية (تُسوّى القديمة وتُنشأ التالية عند الحاجة). create=false عند تعطيل اللعبة */
async function crashCurrent(create = true) {
  const c = (await RAW()).crash, now = Date.now();
  const latest = () => crashC.find().sort({ _id: -1 }).limit(1).next();
  let r = await latest();
  if (r && !r.settled && now >= r.endAt) { await crashSettle(r); r = await latest(); }
  if (create && c.enabled !== false && (!r || (r.settled && now >= r.endAt + CRASH_SHOW_MS))) {
    const waitMs = Math.round(c.waitSec * 1000), cp = genCrashPoint(c.rtp);
    const doc = { _id: r ? r._id + 1 : 1, at: now, waitMs, flightAt: now + waitMs, grow: CRASH_GROW, crashPoint: cp, endAt: now + waitMs + crashMsOf(cp), settled: false };
    try { await crashC.insertOne(doc); r = doc; } catch (e) { if (e.code !== 11000) throw e; r = await latest(); } // طلب آخر أنشأها قبلنا
  }
  return r;
}

const crashSlot = (b) => { const s = Number(b.slot); if (s !== 0 && s !== 1) fail('bad_value'); return s; };
const crashBetId = (r, u, slot) => `${r._id}:${u.id}:${slot}`;

// POST /api/ping — نبضة حضور من التطبيق كل 30 ثانية وهو ظاهر (auth يحدّث lastSeen مع كل طلب)؛ لا تُرجع بيانات
U.post('/ping', limiter('ping', 10, 60000, (req) => req.u.id), wrap(async () => ({ ok: true })));

U.get('/crash/state', limiter('crashstate', 300, 60000, (req) => req.u.id), wrap(async (req) => {
  const u = req.u, c = (await RAW()).crash, now = Date.now();
  if (!(u.crashSeen > now - 10000)) await users.updateOne({ _id: u.id }, { $set: { crashSeen: now } }).catch(() => {}); // حضور اللاعب في اللعبة (للوحة الأدمن)
  const r = await crashCurrent(c.enabled !== false);
  if (c.enabled === false || !r) return { enabled: false, now };
  const phase = crashPhase(r, now);
  if (phase === 'fly') await crashAutoCash(r, crashMult(r, now));
  const q = { round: r._id, status: { $in: CRASH_STATUS } };
  const [all, mine, hist, me] = await Promise.all([
    crashBets.find(q).sort({ amount: -1 }).limit(60).toArray(),
    crashBets.find({ ...q, uid: u.id }).toArray(),
    crashC.find({ settled: true }).sort({ _id: -1 }).limit(30).project({ crashPoint: 1 }).toArray(),
    getUser(u.id),
  ]);
  const round = { id: r._id, phase, flightAt: r.flightAt, waitMs: r.waitMs, grow: r.grow, nextAt: r.endAt + CRASH_SHOW_MS };
  if (phase === 'crash') round.crashPoint = r.crashPoint; // لا تُكشف قبل الانهيار أبدًا
  const row = (b) => ({ slot: b.slot, amount: b.amount, status: b.status, mult: b.status === 'cashed' ? b.mult : 0, win: b.status === 'cashed' ? b.win : 0, autoAt: b.autoAt || 0 });
  return {
    enabled: true, now, round, balance: r2(me ? me.balance : u.balance), hist: hist.map((x) => x.crashPoint),
    mine: mine.map(row),
    players: all.map((b) => ({ me: b.uid === u.id, name: b.uid === u.id ? `أنت #${b.slot + 1}` : b.name, bet: b.amount, status: b.status, mult: b.status === 'cashed' ? b.mult : 0, win: b.status === 'cashed' ? b.win : 0 })),
  };
}));

U.post('/crash/bet', limiter('crashbet', 60, 60000, (req) => req.u.id), wrap(async (req) => {
  const u = req.u, b = req.body || {}, c = (await RAW()).crash;
  if (c.enabled === false) fail('crash_disabled', 403);
  const slot = crashSlot(b), amount = r2(Number(b.amount));
  if (!(amount > 0)) fail('bad_value');
  if (amount < c.minBet) fail('below_min', 400, { min: c.minBet });
  if (amount > c.maxBet) fail('above_max', 400, { max: c.maxBet });
  let autoAt = Number(b.autoAt) || 0; autoAt = autoAt >= 1.01 ? Math.min(CRASH_CAP, r2(autoAt)) : 0;
  const r = await crashCurrent();
  if (!r || Date.now() >= r.flightAt) fail('round_started', 409); // الرهان قبل الإقلاع فقط
  const id = crashBetId(r, u, slot);
  try { await crashBets.insertOne({ _id: id, round: r._id, uid: u.id, slot, name: maskName(u), amount, autoAt, status: 'hold', at: Date.now() }); }
  catch (e) { if (e.code === 11000) fail('already_bet', 409); throw e; }
  const nu = await credit({ _id: u.id, balance: { $gte: amount } }, 'crash_bet', -amount, { ref: 'رهان الصاروخ' }, { earn: false });
  if (!nu) { await crashBets.deleteOne({ _id: id }); fail('insufficient', 402); }
  if (Date.now() >= r.flightAt) { // بدأت الجولة أثناء المعالجة: يُسترجع الرهان
    await crashBets.deleteOne({ _id: id });
    await credit({ _id: u.id }, 'crash_win', amount, { ref: 'استرجاع رهان الصاروخ' }, { earn: false });
    fail('round_started', 409);
  }
  await crashBets.updateOne({ _id: id }, { $set: { status: 'active' } });
  return { balance: r2(nu.balance), bet: { slot, amount, status: 'active', mult: 0, win: 0, autoAt } };
}));

U.post('/crash/cancel', limiter('crashcancel', 60, 60000, (req) => req.u.id), wrap(async (req) => {
  const u = req.u, slot = crashSlot(req.body || {});
  const r = await crashCurrent(false);
  if (!r || Date.now() >= r.flightAt) fail('round_started', 409);
  const d = await crashBets.findOneAndDelete({ _id: crashBetId(r, u, slot), status: 'active' });
  if (!d) fail('not_found', 404);
  const nu = await credit({ _id: u.id }, 'crash_win', d.amount, { ref: 'إلغاء رهان الصاروخ' }, { earn: false });
  return { balance: r2(nu ? nu.balance : u.balance) };
}));

U.post('/crash/cashout', limiter('crashcash', 120, 60000, (req) => req.u.id), wrap(async (req) => {
  const u = req.u, slot = crashSlot(req.body || {});
  const r = await crashCurrent(false), now = Date.now();
  if (!r) fail('not_found', 404);
  const bet = await crashBets.findOne({ _id: crashBetId(r, u, slot) });
  if (!bet || bet.status === 'hold') fail('not_found', 404);
  const balance = async () => r2((await getUser(u.id) || u).balance);
  if (bet.status === 'cashed') return { crashed: false, already: true, mult: bet.mult, win: bet.win, balance: await balance() };
  if (now < r.flightAt) fail('round_wait', 409);
  const m = crashMult(r, now);
  if (crashPhase(r, now) === 'crash') { // انهار قبل وصول الطلب
    await crashSettle(r);
    return { crashed: true, crashPoint: r.crashPoint, balance: await balance() };
  }
  const win = await crashPay(bet, m);
  if (win === null) { const cur = await crashBets.findOne({ _id: bet._id }); return { crashed: false, already: true, mult: cur ? cur.mult : m, win: cur ? cur.win : 0, balance: await balance() }; }
  return { crashed: false, mult: m, win, balance: await balance() };
}));

/* ═══════════════ لعبة الكنز (بالرصيد الحقيقي) ═══════════════
   نفس مبدأ الكراش: الخادم هو الحَكَم الوحيد؛ موضع القنبلة يُختار عند بدء اللعبة بـ crypto.randomInt ويبقى سريًا حتى تنتهي الجولة،
   لا يتأثر بالرصيد أو بسجل اللاعب. العائد النظري = rtp% (معلن): المضاعف بعد k خريطة آمنة = rtp/100 × 9/(9−k).
   الرهان يُخصم ذريًا عند البدء، والربح يُضاف ذريًا عند السحب (حجز الحالة أولًا ثم الإضافة، مع تراجع عند الفشل). لعبة جارية واحدة لكل مستخدم. */
const T_CELLS = 9;
const floor2 = (x) => Math.floor(x * 100 + 1e-9) / 100;
const treasureMult = (rtp, k) => (k <= 0 ? 1 : floor2((rtp / 100) * T_CELLS / (T_CELLS - k)));
const treasureMults = (rtp) => Array.from({ length: T_CELLS }, (_, k) => treasureMult(rtp, k)); // k = 0..8
const treasurePub = (g) => {
  const k = g.picked.length;
  return { bet: g.bet, picked: g.picked, safe: k, mult: treasureMult(g.rtp, k), next: k < T_CELLS - 1 ? treasureMult(g.rtp, k + 1) : 0 };
};
const balanceOf = async (id) => { const x = await getUser(id); return r2(x ? x.balance : 0); };

/** يصرف ربح لعبة جارية (حجز ذرّي ثم إضافة للرصيد). يعيد {win,mult,picked,bomb} أو null إن سبقه أحد */
async function treasurePay(g) {
  const claim = await treasureC.findOneAndUpdate({ _id: g._id, status: 'active', 'picked.0': { $exists: true } }, { $set: { status: 'cashed', doneAt: new Date() }, $unset: { act: '' } });
  if (!claim) return null;
  const k = claim.picked.length, mult = treasureMult(claim.rtp, k), win = floor2(claim.bet * mult);
  await treasureC.updateOne({ _id: claim._id }, { $set: { mult, win } });
  try { await credit({ _id: claim.uid }, 'treasure_win', win, { ref: `ربح الكنز ${mult.toFixed(2)}x` }, { earn: false }); }
  catch (e) { await treasureC.updateOne({ _id: claim._id }, { $set: { status: 'active', act: 1 }, $unset: { mult: '', win: '', doneAt: '' } }).catch(() => {}); throw e; }
  return { win, mult, picked: claim.picked, bomb: claim.bomb };
}

U.get('/treasure/state', limiter('tstate', 120, 60000, (req) => req.u.id), wrap(async (req) => {
  const u = req.u, c = (await RAW()).treasure;
  const [g, hist, me] = await Promise.all([
    treasureC.findOne({ uid: u.id, status: 'active' }),
    treasureC.find({ uid: u.id, status: { $in: ['cashed', 'lost'] } }).sort({ at: -1 }).limit(12).project({ status: 1 }).toArray(),
    getUser(u.id),
  ]);
  return {
    enabled: c.enabled !== false, rules: { minBet: c.minBet, maxBet: c.maxBet, rtp: g ? g.rtp : c.rtp }, mults: treasureMults(g ? g.rtp : c.rtp),
    balance: r2(me ? me.balance : u.balance), game: g ? treasurePub(g) : null, hist: hist.map((x) => x.status === 'cashed'),
  };
}));

U.post('/treasure/start', limiter('tstart', 60, 60000, (req) => req.u.id), wrap(async (req) => {
  const u = req.u, c = (await RAW()).treasure, amount = r2(Number(req.body?.amount));
  if (c.enabled === false) fail('treasure_disabled', 403);
  if (!(amount > 0)) fail('bad_value');
  if (amount < c.minBet) fail('below_min', 400, { min: c.minBet });
  if (amount > c.maxBet) fail('above_max', 400, { max: c.maxBet });
  const id = `${u.id}:${Date.now()}:${crypto.randomBytes(4).toString('hex')}`;
  const doc = { _id: id, uid: u.id, bet: amount, rtp: c.rtp, bomb: crypto.randomInt(0, T_CELLS), picked: [], status: 'hold', act: 1, at: Date.now() };
  for (let i = 0; i < 2; i++) {
    try { await treasureC.insertOne(doc); break; }
    catch (e) {
      if (e.code !== 11000) throw e;
      const ex = await treasureC.findOne({ uid: u.id, act: 1 });
      if (ex && ex.status === 'hold' && Date.now() - ex.at > 60000 && !i) { await treasureC.deleteOne({ _id: ex._id, status: 'hold' }); continue; } // بقايا قديمة لم يُخصم لها رهان
      fail('game_active', 409);
    }
  }
  const nu = await credit({ _id: u.id, balance: { $gte: amount } }, 'treasure_bet', -amount, { ref: 'رهان الكنز' }, { earn: false });
  if (!nu) { await treasureC.deleteOne({ _id: id }); fail('insufficient', 402); }
  await treasureC.updateOne({ _id: id }, { $set: { status: 'active' } });
  return { balance: r2(nu.balance), mults: treasureMults(c.rtp), game: treasurePub(doc) };
}));

U.post('/treasure/pick', limiter('tpick', 240, 60000, (req) => req.u.id), wrap(async (req) => {
  const u = req.u, idx = Number(req.body?.index);
  if (!Number.isInteger(idx) || idx < 0 || idx >= T_CELLS) fail('bad_value');
  const g = await treasureC.findOne({ uid: u.id, status: 'active' });
  if (!g) fail('no_game', 404);
  if (g.picked.includes(idx)) fail('bad_value');
  if (idx === g.bomb) { // القنبلة: خسارة الرهان (الذي خُصم عند البدء)
    const done = await treasureC.findOneAndUpdate({ _id: g._id, status: 'active' }, { $set: { status: 'lost', doneAt: new Date() }, $unset: { act: '' } });
    if (!done) fail('conflict', 409);
    return { lost: true, bomb: g.bomb, picked: g.picked, balance: await balanceOf(u.id) };
  }
  const upd = await treasureC.findOneAndUpdate(
    { _id: g._id, status: 'active', picked: { $ne: idx }, [`picked.${T_CELLS - 2}`]: { $exists: false } },
    { $push: { picked: idx } }, { returnDocument: 'after' });
  if (!upd) fail('conflict', 409);
  if (upd.picked.length >= T_CELLS - 1) { // فتح كل الخرائط الآمنة: سحب تلقائي بأعلى مضاعف
    const r = await treasurePay(upd);
    if (r) return { cashed: true, auto: true, win: r.win, mult: r.mult, picked: r.picked, bomb: r.bomb, balance: await balanceOf(u.id) };
  }
  return { lost: false, game: treasurePub(upd) };
}));

U.post('/treasure/cashout', limiter('tcash', 120, 60000, (req) => req.u.id), wrap(async (req) => {
  const u = req.u;
  const g = await treasureC.findOne({ uid: u.id, status: 'active' });
  if (!g) fail('no_game', 404);
  if (!g.picked.length) fail('no_pick', 409);
  const r = await treasurePay(g);
  if (!r) fail('conflict', 409);
  return { cashed: true, win: r.win, mult: r.mult, picked: r.picked, bomb: r.bomb, balance: await balanceOf(u.id) };
}));

/* ═══════════════ الإدارة: POST /api/admin/:action ═══════════════ */
const signAdmin = (exp) => `${exp}.${crypto.createHmac('sha256', ADMIN_SECRET).update(String(exp)).digest('hex')}`;
const checkAdmin = (tok) => { const [exp, sig] = String(tok || '').split('.'); return !!exp && !!sig && Number(exp) > Date.now() && safeEq(signAdmin(exp), `${exp}.${sig}`); };
const AU = async (id) => { const x = await getUser(id); if (!x) fail('not_found', 404); return x; };
const isPaid = { $in: ['paid', 'approved'] };
const listTasks = async () => (await tasksC.find({}).sort({ ord: 1 }).toArray()).map(({ _id, ord, ...t }) => t); // eslint-disable-line no-unused-vars
const listPromos = async () => (await promos.find({}).sort({ createdAt: -1 }).toArray()).map(({ _id, ...p }) => p); // eslint-disable-line no-unused-vars

const ADMIN = {
  login: (b) => {
    if (!ADMIN_USER || !ADMIN_PASS || !safeEq(b.username || '', ADMIN_USER) || !safeEq(b.password || '', ADMIN_PASS)) fail('bad_login', 401);
    return { token: signAdmin(Date.now() + 12 * 3600 * 1000) };
  },
  stats: async () => {
    const [a = {}] = await users.aggregate([{ $group: {
      _id: null, users: { $sum: 1 }, newToday: { $sum: { $cond: [{ $gt: ['$joinedAt', Date.now() - DAY] }, 1, 0] } },
      banned: { $sum: { $cond: [{ $eq: ['$banned', true] }, 1, 0] } }, totalBalance: { $sum: '$balance' }, totalEarned: { $sum: '$totalEarned' },
      adsToday: { $sum: { $ifNull: [`$adDays.${dayKey()}`, 0] } }, adsPaid: { $sum: { $ifNull: ['$adsEarned', 0] } },
    } }]).toArray();
    const wd = await users.aggregate([
      { $match: { 'withdrawals.0': { $exists: true } } }, { $project: { withdrawals: 1 } }, { $unwind: '$withdrawals' },
      { $group: { _id: '$withdrawals.status', n: { $sum: 1 }, amount: { $sum: '$withdrawals.amount' } } },
    ]).toArray();
    const by = (s) => wd.find((x) => x._id === s) || { n: 0, amount: 0 };
    return { stats: {
      users: a.users || 0, newToday: a.newToday || 0, banned: a.banned || 0, totalBalance: r2(a.totalBalance || 0), totalEarned: r2(a.totalEarned || 0),
      totalPaid: r2(by('paid').amount + by('approved').amount), pendingCount: by('pending').n, pendingAmount: r2(by('pending').amount),
      activePromos: await promos.countDocuments({ active: { $ne: false } }), adsToday: a.adsToday || 0, adsPaid: r2(a.adsPaid || 0),
    } };
  },
  /* النشطون الآن: «في التطبيق الآن» = آخر طلب موقّع خلال 90 ثانية (lastSeen يُحدَّث مع كل طلب، والتطبيق يرسل /ping كل 30 ثانية وهو ظاهر)،
     «في الكراش» = يفتح شاشة اللعبة الآن (crashSeen خلال 30 ثانية) — مع رهانه في الجولة الأخيرة إن وُجد */
  online: async () => {
    const now = Date.now(), M = 60000, proj = { id: 1, first_name: 1, last_name: 1, username: 1, balance: 1, lastSeen: 1, crashSeen: 1 };
    const [bot, crash, n5, n60, n24, last] = await Promise.all([
      users.find({ lastSeen: { $gt: now - 90000 } }).sort({ lastSeen: -1 }).limit(100).project(proj).toArray(),
      users.find({ crashSeen: { $gt: now - 30000 } }).sort({ crashSeen: -1 }).limit(100).project(proj).toArray(),
      users.countDocuments({ lastSeen: { $gt: now - 90000 } }), users.countDocuments({ lastSeen: { $gt: now - 60 * M } }), users.countDocuments({ lastSeen: { $gt: now - 24 * 60 * M } }),
      crashC.find({}).sort({ _id: -1 }).limit(1).toArray(),
    ]);
    const bets = last[0] ? await crashBets.find({ round: last[0]._id, status: { $in: CRASH_STATUS } }).toArray() : [];
    const staked = new Map(); bets.forEach((b) => staked.set(b.uid, r2((staked.get(b.uid) || 0) + b.amount)));
    const row = (x) => ({ id: x.id ?? x._id, name: fullName(x), username: x.username || '', balance: r2(x.balance || 0), lastSeen: x.lastSeen || 0, crashSeen: x.crashSeen || 0, bet: staked.get(x.id ?? x._id) || 0 });
    return {
      counts: { bot5: n5, bot60: n60, bot24: n24, crash: crash.length, crashBettors: staked.size, crashStaked: r2([...staked.values()].reduce((a, v) => a + v, 0)) },
      bot: bot.map(row), crash: crash.map(row),
    };
  },
  users: async (b) => {
    const q = String(b.q || '').trim();
    const and = [];
    if (q) and.push({ $expr: { $regexMatch: { input: { $concat: [{ $toString: '$_id' }, ' ', { $ifNull: ['$first_name', ''] }, ' ', { $ifNull: ['$last_name', ''] }, ' ', { $ifNull: ['$username', ''] }] }, regex: escRe(q), options: 'i' } } });
    if (b.filter === 'banned') and.push({ banned: true });
    if (b.filter === 'rich') and.push({ balance: { $gte: 5 } });
    const flt = and.length ? { $and: and } : {};
    const limit = Math.min(Number(b.limit) || 100, 500);
    const [total, list] = await Promise.all([users.countDocuments(flt), users.find(flt).sort({ joinedAt: -1 }).limit(limit).toArray()]);
    const counts = await users.aggregate([{ $match: { invitedBy: { $in: list.map((x) => x.id) } } }, { $group: { _id: '$invitedBy', n: { $sum: 1 } } }]).toArray();
    const cm = new Map(counts.map((x) => [x._id, x.n]));
    return { total, users: list.map((x) => ({ id: x.id, name: fullName(x), username: x.username, balance: r2(x.balance), totalEarned: r2(x.totalEarned), friends: cm.get(x.id) || 0, banned: x.banned, joinedAt: x.joinedAt })) };
  },
  user: async (b) => {
    const x = await AU(b.id), inv = x.invitedBy ? await getUser(x.invitedBy) : null;
    const { _id, history, withdrawals, taskState, taskDays, adDays, onboarded, ...user } = x; // eslint-disable-line no-unused-vars
    const fr = await users.find({ invitedBy: x.id }).sort({ joinedAt: -1 }).limit(500).toArray();
    return { user: { ...user, invitedByName: inv ? fullName(inv) : '' }, history: (history || []).slice(0, 200), withdrawals: withdrawals || [],
      friends: fr.map((f) => ({ name: fullName(f), joinedAt: f.joinedAt, earned: f.refBonus || 0 })), promos: x.usedPromos || [] };
  },
  balance: async (b) => {
    const x = await AU(b.id), a = r2(Number(b.amount));
    if (!Number.isFinite(a) || a === 0) fail('bad_value');
    const ref = String(b.note || (a > 0 ? 'إضافة رصيد' : 'خصم رصيد')).slice(0, 120);
    const nu = await credit(a < 0 ? { _id: x.id, balance: { $gte: -a } } : { _id: x.id }, 'admin', a, { ref }, { earn: false });
    if (!nu) fail('insufficient', 402);
    return { ok: true };
  },
  ban: async (b) => {
    const x = await AU(b.id);
    await users.updateOne({ _id: x.id }, { $set: { banned: !!b.banned, banReason: b.banned ? String(b.reason || '').slice(0, 160) : '' } });
    return { ok: true };
  },
  delete: async (b) => {
    const x = await AU(b.id);
    await users.deleteOne({ _id: x.id });
    await users.updateMany({ invitedBy: x.id }, { $set: { invitedBy: 0 } });
    return { ok: true };
  },
  withdrawals: async (b) => {
    const pipe = [{ $match: { 'withdrawals.0': { $exists: true } } }, { $project: { withdrawals: 1, first_name: 1, last_name: 1 } }, { $unwind: '$withdrawals' }];
    if (b.status && b.status !== 'all') pipe.push({ $match: { 'withdrawals.status': b.status === 'paid' ? isPaid : String(b.status) } });
    pipe.push({ $replaceWith: { $mergeObjects: ['$withdrawals', { userId: '$_id', fn: '$first_name', ln: '$last_name' }] } }, { $sort: { at: -1 } }, { $limit: 2000 });
    const rows = await users.aggregate(pipe).toArray();
    return { withdrawals: rows.map(({ fn, ln, ...w }) => ({ ...w, userName: fullName({ first_name: fn, last_name: ln }) })) };
  },
  withdrawal: async (b) => { // الرفض يعيد المبلغ للرصيد
    const id = String(b.id || '');
    const x = await users.findOne({ 'withdrawals.id': id }, { projection: { withdrawals: { $elemMatch: { id } } } });
    if (!x || !x.withdrawals || !x.withdrawals[0]) fail('not_found', 404);
    const w = x.withdrawals[0], status = b.status === 'paid' ? 'paid' : 'rejected';
    const r = await users.updateOne(
      { _id: x._id, withdrawals: { $elemMatch: { id, status: 'pending' } } },
      { $set: { 'withdrawals.$.status': status, 'withdrawals.$.note': String(b.note || '').slice(0, 200) } },
    );
    if (!r.modifiedCount) fail('done', 409);
    if (status === 'rejected') await credit({ _id: x._id }, 'admin', w.amount, { ref: 'إرجاع سحب مرفوض' }, { earn: false });
    return { ok: true };
  },
  // يسجّل webhook البوت ويعرض حالته (للتشخيص من لوحة الإدارة)
  webhook: async (b) => {
    if (!BOT_TOKEN || !WEBHOOK_SECRET) fail('not_found', 404);
    const base = String(b.baseUrl || PUBLIC_URL || '').replace(/\/+$/, '');
    if (!/^https:\/\//i.test(base)) fail('bad_value');
    return setupWebhook(base);
  },
  settings: async () => ({ settings: await RAW() }),
  saveSettings: async (b) => {
    if (!b.settings || typeof b.settings !== 'object') fail('bad_value');
    const s = { ...b.settings }; delete s.demo; delete s._id;
    for (const k of Object.keys(s)) if (k.startsWith('$') || k.includes('.')) delete s[k];
    if (s.ads !== undefined) s.ads = sanitizeAds(s.ads, (await RAW()).ads); // أرقام آمنة فقط (مكافأة/مؤقت/مدة/حد يومي)
    if (s.crash !== undefined) s.crash = sanitizeCrash(s.crash, (await RAW()).crash); // قواعد لعبة الصاروخ ضمن حدود آمنة
    if (s.treasure !== undefined) s.treasure = sanitizeTreasure(s.treasure, (await RAW()).treasure); // قواعد لعبة الكنز
    if (Object.keys(s).length) await settingsC.updateOne({ _id: 'main' }, { $set: s }, { upsert: true });
    cfgCache = { at: 0, v: null };
    return { settings: await RAW() };
  },
  tasks: async () => ({ tasks: await listTasks() }),
  saveTask: async (b) => {
    const t = { ...(b.task || {}) }; if (!String(t.title || '').trim()) fail('bad_value');
    t.reward = Number(t.reward); if (!Number.isFinite(t.reward) || t.reward < 0) fail('bad_value');
    if (!t.id) t.id = `t${Date.now().toString(36)}`;
    t.id = String(t.id); if (!ID_RE.test(t.id)) fail('bad_value');
    delete t._id; delete t.ord; delete t.status; delete t.verifyAt;
    // نوع التحقق الاختياري للمهمة: bio | name | story (فارغ = المهمة العادية)
    t.check = CHECKS.includes(t.check) ? t.check : '';
    t.verifySeconds = Math.min(3600, Math.max(0, Math.round(Number(t.verifySeconds) || 0))); // 0 = الافتراضي (10 ث للعادية، 60 ث للقصة)
    t.checkText = String(t.checkText || '').trim().slice(0, 60);
    t.storyImage = String(t.storyImage || '').trim().slice(0, 500);
    if (t.check === 'story' && !/^https:\/\//i.test(t.storyImage)) fail('bad_value'); // shareToStory يتطلب رابط https للصورة
    const old =await tasksC.findOne({ _id: t.id }, { projection: { ord: 1 } });
    await tasksC.replaceOne({ _id: t.id }, { _id: t.id, ...t, ord: old ? old.ord : Date.now() }, { upsert: true });
    return { tasks: await listTasks() };
  },
  deleteTask: async (b) => { await tasksC.deleteOne({ _id: String(b.id || '') }); return { tasks: await listTasks() }; },
  promos: async () => ({ promos: await listPromos() }),
  savePromo: async (b) => {
    const p = { ...(b.promo || {}), code: String(b.promo?.code || '').trim().toUpperCase().slice(0, 40) };
    if (!p.code) fail('bad_value');
    const exists = await promos.findOne({ _id: p.code }, { projection: { _id: 1 } });
    if (exists) {
      if (b.isNew) fail('exists', 409);
      const { code, uses, usedBy, createdAt, _id, ...rest } = p; // eslint-disable-line no-unused-vars
      if (Object.keys(rest).length) await promos.updateOne({ _id: p.code }, { $set: rest });
    } else {
      try { await promos.insertOne({ uses: 0, usedBy: [], createdAt: Date.now(), active: true, ...p, _id: p.code }); }
      catch (e) { if (e.code === 11000) fail('exists', 409); throw e; }
    }
    return { promos: await listPromos() };
  },
  deletePromo: async (b) => { await promos.deleteOne({ _id: String(b.code || '').toUpperCase() }); return { promos: await listPromos() }; },
  // محاكاة دعوة صديق لرؤية أثر «مكافأة الإحالة» (تجريبي — معطّل افتراضيًا)
  simInvite: async (b) => {
    if (!DEMO_TOOLS) fail('not_found', 404);
    const x = await AU(b.id), rw = (await RAW()).referralReward;
    const id = Math.floor(5200000000 + Math.random() * 99999999);
    try {
      await users.insertOne({ _id: id, ...mkUser(id, { first_name: 'صديق', last_name: `#${String(id).slice(-3)}`, onboarded: true, invitedBy: x.id, refBonus: rw, balance: 0.5, totalEarned: 0.5, history: [{ type: 'welcome', amount: 0.5, at: Date.now() }] }) });
    } catch (e) { if (e.code === 11000) fail('exists', 409); throw e; }
    await credit({ _id: x.id }, 'referral', rw, { ref: 'صديق تجريبي' }, { expr: { referralEarnings: rnd('$referralEarnings', r2(rw)) } });
    return { ok: true };
  },
  // إعادة ضبط كل البيانات (تجريبي — معطّل افتراضيًا لأنه يمسح قاعدة البيانات بالكامل)
  reset: async () => {
    if (!DEMO_TOOLS) fail('not_found', 404);
    await Promise.all([users, tasksC, promos, settingsC, metaC, crashC, crashBets].map((c) => c.deleteMany({})));
    cfgCache = { at: 0, v: null };
    await seedTasks();
    return { ok: true };
  },
};

app.post('/api/admin/:action', limiter('admin', 60, 60000), (req, res, next) => {
  const run = async () => {
    const action = req.params.action, fn = Object.prototype.hasOwnProperty.call(ADMIN, action) ? ADMIN[action] : null;
    if (!fn) fail('not_found', 404);
    if (action !== 'login' && !checkAdmin(req.headers['x-admin-token'])) fail('unauthorized', 401);
    return fn(req.body || {});
  };
  if (req.params.action === 'login') {
    return limiter('adminlogin', 8, 15 * 60000)(req, res, (e) => { if (e) return next(e); run().then((out) => res.json(out), next); });
  }
  run().then((out) => res.json(out), next);
});

// يُركَّب بعد مسار الأدمن حتى لا يمرّ /api/admin عبر التحقق من تيليجرام
app.use('/api', U);

/* ───────────── 404 + معالج الأخطاء (HTTP مناسب + {code,message}) ───────────── */
const MSG = { not_joined: 'لم يتم التحقق من تنفيذ المهمة', ads_pending: 'لم تكتمل مدة الإعلان بعد', ads_wait: 'انتظر قبل الإعلان التالي', not_telegram: 'افتح التطبيق من داخل تيليجرام', bad_session: 'جلسة غير صالحة', expired: 'انتهت الجلسة', banned: 'الحساب محظور', not_found: 'غير موجود', rate_limited: 'طلبات كثيرة، حاول لاحقًا' };
app.use((req, res) => res.status(404).json({ success: false, code: 'not_found', message: 'المسار غير موجود' }));
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err instanceof AppError) return res.status(err.status).json({ success: false, code: err.code, message: MSG[err.code] || err.code, ...err.extra });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ success: false, code: 'bad_json', message: 'JSON غير صالح' });
  console.error(err);
  res.status(500).json({ success: false, code: 'server_error', message: 'خطأ في الخادم' });
});

module.exports = app; // للتشغيل كدالة serverless (مثل Vercel)

if (require.main === module) {
  app.listen(PORT, () => console.log(`✅ الخادم يعمل على المنفذ ${PORT}`));
  dbReady().then(() => console.log('✅ تم الاتصال بقاعدة البيانات')).catch((e) => console.error('❌ فشل الاتصال بقاعدة البيانات:', e.message));
}
