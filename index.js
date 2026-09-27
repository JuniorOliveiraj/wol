const express = require('express');
const path = require('path');
const wol = require('wake_on_lan');
const { exec } = require('child_process');

const config = require('./lib/config');
const state = require('./lib/state');
const auth = require('./lib/auth');

const app = express();

// Proxy reverso (HTTPS) rodando na mesma maquina: confia no X-Forwarded-*
app.set('trust proxy', 'loopback');

let bootingUntil = null;

const TARGETS = ['windows', 'linux'];
const SAFE_GRUB_ID = /^[A-Za-z0-9._-]+$/;

function checkHostAlive() {
    return new Promise((resolve) => {
        // -c 1 -W 2: envia 1 pacote ICMP e espera ate 2s pela resposta (sintaxe Linux/Android/Termux)
        exec(`ping -c 1 -W 2 ${config.targetIp}`, (err) => {
            resolve(!err);
        });
    });
}

function sendWol() {
    return new Promise((resolve, reject) => {
        wol.wake(
            config.macAddress,
            { address: config.broadcast, port: config.wolPort, sourceIp: config.sourceIp },
            (err) => (err ? reject(err) : resolve())
        );
    });
}

function remoteIp(req) {
    return (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
}

function requireAuth(req, res, next) {
    if (auth.isAuthenticated(req)) return next();
    res.status(401).json({ success: false, message: 'Não autorizado' });
}

app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// Rotas legadas — contrato congelado
// ---------------------------------------------------------------------------

// Rota para Wake-on-LAN (sempre inicia o padrao do GRUB: Windows)
app.get('/wake', (req, res) => {
    // Descarta escolha pendente para garantir que o GRUB use o padrao
    try {
        state.clear();
    } catch (err) {
        console.error('Erro ao limpar proximo boot:', err);
    }

    wol.wake(config.macAddress, { address: config.broadcast, port: config.wolPort, sourceIp: config.sourceIp }, (err) => {
        if (err) {
            console.error('Erro ao enviar pacote:', err);
            res.status(500).send('Erro ao enviar pacote Wake-on-LAN');
        } else {
            bootingUntil = Date.now() + config.bootingTimeoutMs;
            res.send('Pacote Wake-on-LAN enviado com sucesso!');
        }
    });
});

// Rota de status: ligado, ligando ou desligado
app.get('/status', async (req, res) => {
    const hostUp = await checkHostAlive();
    const nextBoot = state.getPending();

    if (hostUp) {
        bootingUntil = null;
        return res.json({ status: 'ligado', nextBoot });
    }

    if (bootingUntil && Date.now() < bootingUntil) {
        return res.json({ status: 'ligando', nextBoot });
    }

    bootingUntil = null;
    res.json({ status: 'desligado', nextBoot });
});

// ---------------------------------------------------------------------------
// Interface web: sessao
// ---------------------------------------------------------------------------

app.get('/session', (req, res) => {
    res.json({ authenticated: auth.isAuthenticated(req) });
});

app.post('/login', express.json({ limit: '1kb' }), (req, res) => {
    if (!auth.registerLoginAttempt(req.ip)) {
        return res.status(429).json({ success: false, message: 'Muitas tentativas. Aguarde um minuto.' });
    }

    if (!auth.checkPassword(req.body && req.body.password)) {
        return res.status(401).json({ success: false, message: 'Senha inválida' });
    }

    auth.createSession(req, res);
    res.json({ success: true });
});

app.post('/logout', (req, res) => {
    auth.destroySession(req, res);
    res.json({ success: true });
});

// ---------------------------------------------------------------------------
// Boot remoto: escolhe o SO e so entao envia o WOL
// ---------------------------------------------------------------------------

app.post('/pc/boot/:target', requireAuth, async (req, res) => {
    const { target } = req.params;

    if (!TARGETS.includes(target)) {
        return res.status(400).json({ success: false, target, message: 'Sistema inválido. Use "windows" ou "linux".' });
    }

    const name = config.targetNames[target];

    if (await checkHostAlive()) {
        return res.status(409).json({ success: false, target, message: 'O PC já está ligado.' });
    }

    try {
        state.setNextBoot(target);
    } catch (err) {
        console.error('Erro ao configurar proximo boot:', err);
        return res.status(500).json({
            success: false,
            target,
            message: 'Não foi possível configurar o próximo boot. Wake on LAN não enviado.',
        });
    }

    try {
        await sendWol();
    } catch (err) {
        console.error('Erro ao enviar pacote:', err);
        return res.status(502).json({
            success: false,
            target,
            message: `Próximo boot configurado para ${name}, mas o Wake on LAN falhou.`,
        });
    }

    bootingUntil = Date.now() + config.bootingTimeoutMs;
    res.json({ success: true, target, message: `Próximo boot configurado para ${name}. Wake on LAN enviado.` });
});

// ---------------------------------------------------------------------------
// Consultada pelo GRUB durante o boot (somente a partir do IP do PC)
// ---------------------------------------------------------------------------

app.get('/grub/next.cfg', (req, res) => {
    if (remoteIp(req) !== config.targetIp) {
        return res.status(403).type('text/plain').send('');
    }

    const target = state.getPending();
    const grubId = target && config.grubIds[target];

    if (!grubId || !SAFE_GRUB_ID.test(grubId)) {
        return res.type('text/plain').send('');
    }

    state.consume();
    console.log(`GRUB consultou o proximo boot: ${target} (${grubId})`);
    res.type('text/plain').send(`set default="${grubId}"\nset timeout=1\n`);
});

// Inicializa o servidor
app.listen(config.port, () => {
    console.log(`Servidor rodando em http://localhost:${config.port}`);
});
