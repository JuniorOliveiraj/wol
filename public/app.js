const $ = (sel) => document.querySelector(sel);

const views = { login: $('#login'), home: $('#home') };
const statusEl = $('#status');
const statusText = $('#status-text');
const nextBootEl = $('#next-boot');
const cards = document.querySelectorAll('.os-card');

const TARGET_NAMES = { windows: 'Windows', linux: 'CachyOS' };
const STATUS_POLL_MS = 5000;

let pollTimer = null;
let busy = false;
let currentStatus = 'desconhecido';

// ---------------- Utilidades ----------------

function show(view) {
    for (const [name, el] of Object.entries(views)) el.hidden = name !== view;
}

let toastTimer = null;
function toast(message, isError = false) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.toggle('error', isError);
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 4000);
}

async function api(method, url, body) {
    const res = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
}

// ---------------- Status ----------------

function renderCards() {
    const pcOn = currentStatus === 'ligado';
    cards.forEach((card) => {
        card.disabled = busy || pcOn;
        card.querySelector('.os-sub').textContent = pcOn
            ? 'PC já está ligado'
            : card.dataset.target === 'windows' ? 'jogos' : 'trabalho';
    });
}

async function refreshStatus() {
    try {
        const { data } = await api('GET', '/status');
        currentStatus = data.status || 'desconhecido';
        statusEl.dataset.status = currentStatus;
        statusText.textContent = currentStatus;
        nextBootEl.textContent = data.nextBoot ? TARGET_NAMES[data.nextBoot] : '—';
    } catch {
        currentStatus = 'desconhecido';
        statusEl.dataset.status = currentStatus;
        statusText.textContent = 'sem conexão';
    }
    renderCards();
}

function startPolling() {
    stopPolling();
    refreshStatus();
    pollTimer = setInterval(refreshStatus, STATUS_POLL_MS);
}

function stopPolling() {
    clearInterval(pollTimer);
    pollTimer = null;
}

// ---------------- Fluxos ----------------

async function enterHome() {
    show('home');
    startPolling();
}

function enterLogin() {
    stopPolling();
    show('login');
    $('#password').value = '';
    $('#password').focus();
}

$('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#login-btn');
    btn.disabled = true;

    try {
        const { ok, data } = await api('POST', '/login', { password: $('#password').value });
        if (ok) {
            enterHome();
        } else {
            toast(data.message || 'Senha inválida', true);
            $('#password').select();
        }
    } catch {
        toast('Sem conexão com o servidor', true);
    } finally {
        btn.disabled = false;
    }
});

$('#logout-btn').addEventListener('click', async () => {
    await api('POST', '/logout').catch(() => {});
    enterLogin();
});

cards.forEach((card) => {
    card.addEventListener('click', async () => {
        if (busy) return;
        busy = true;
        card.classList.add('loading');
        card.querySelector('.os-arrow').textContent = 'progress_activity';
        renderCards();

        try {
            const { ok, status, data } = await api('POST', `/pc/boot/${card.dataset.target}`);
            if (status === 401) {
                toast('Sessão expirada. Entre novamente.', true);
                return enterLogin();
            }
            toast(data.message || (ok ? 'Enviado' : 'Erro ao enviar'), !ok);
        } catch {
            toast('Sem conexão com o servidor', true);
        } finally {
            busy = false;
            card.classList.remove('loading');
            card.querySelector('.os-arrow').textContent = 'arrow_forward';
            refreshStatus();
        }
    });
});

// ---------------- Início ----------------

(async () => {
    try {
        const { data } = await api('GET', '/session');
        data.authenticated ? enterHome() : enterLogin();
    } catch {
        enterLogin();
    }
})();
