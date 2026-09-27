const crypto = require('crypto');
const config = require('./config');

const COOKIE_NAME = 'wol_session';

const sessions = new Map(); // token -> expiraEm (ms)
const loginAttempts = new Map(); // ip -> { count, resetAt }

// Comparacao em tempo constante (hash iguala os tamanhos)
function safeEqual(a, b) {
    const ha = crypto.createHash('sha256').update(String(a)).digest();
    const hb = crypto.createHash('sha256').update(String(b)).digest();
    return crypto.timingSafeEqual(ha, hb);
}

function parseCookies(req) {
    const out = {};
    for (const part of (req.headers.cookie || '').split(';')) {
        const idx = part.indexOf('=');
        if (idx === -1) continue;
        out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
    }
    return out;
}

function hasValidSession(req) {
    const token = parseCookies(req)[COOKIE_NAME];
    if (!token) return false;

    const expiresAt = sessions.get(token);
    if (!expiresAt) return false;
    if (Date.now() > expiresAt) {
        sessions.delete(token);
        return false;
    }
    return true;
}

function hasValidBearer(req) {
    if (!config.apiToken) return false;
    const match = /^Bearer (.+)$/.exec(req.headers.authorization || '');
    return !!match && safeEqual(match[1], config.apiToken);
}

function isAuthenticated(req) {
    return hasValidSession(req) || hasValidBearer(req);
}

// Retorna true se o IP ainda pode tentar login (e contabiliza a tentativa)
function registerLoginAttempt(ip) {
    const now = Date.now();
    const entry = loginAttempts.get(ip);

    if (!entry || now > entry.resetAt) {
        loginAttempts.set(ip, { count: 1, resetAt: now + config.loginWindowMs });
        return true;
    }

    entry.count += 1;
    return entry.count <= config.loginMaxAttempts;
}

function checkPassword(password) {
    return typeof password === 'string' && safeEqual(password, config.uiPassword);
}

function createSession(req, res) {
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, Date.now() + config.sessionTtlMs);

    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'strict',
        secure: req.secure,
        maxAge: config.sessionTtlMs,
        path: '/',
    });
}

function destroySession(req, res) {
    const token = parseCookies(req)[COOKIE_NAME];
    if (token) sessions.delete(token);
    res.clearCookie(COOKIE_NAME, { path: '/' });
}

module.exports = {
    isAuthenticated,
    registerLoginAttempt,
    checkPassword,
    createSession,
    destroySession,
};
