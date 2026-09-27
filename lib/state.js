const fs = require('fs');
const config = require('./config');

const EMPTY = { nextBoot: null, requestedAt: null, expiresAt: null, consumedAt: null };

function read() {
    try {
        return { ...EMPTY, ...JSON.parse(fs.readFileSync(config.stateFile, 'utf8')) };
    } catch {
        return { ...EMPTY };
    }
}

// Escrita atomica: grava em arquivo temporario e renomeia
function write(state) {
    const tmp = `${config.stateFile}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, config.stateFile);
}

// Retorna o alvo pendente ('windows' | 'linux') ou null se nao houver / expirou / ja foi usado
function getPending() {
    const state = read();
    if (!state.nextBoot || state.consumedAt) return null;
    if (!state.expiresAt || Date.now() > Date.parse(state.expiresAt)) return null;
    return state.nextBoot;
}

// Grava o proximo boot e confirma relendo o arquivo. Lanca erro se nao confirmar.
function setNextBoot(target) {
    const now = Date.now();
    write({
        nextBoot: target,
        requestedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + config.nextBootTtlMs).toISOString(),
        consumedAt: null,
    });

    if (getPending() !== target) {
        throw new Error('Proximo boot nao confirmado apos gravacao');
    }
}

// Marca a escolha como usada (chamado quando o GRUB le a configuracao)
function consume() {
    const state = read();
    if (!state.nextBoot || state.consumedAt) return;
    write({ ...state, consumedAt: new Date().toISOString() });
}

function clear() {
    write({ ...EMPTY });
}

module.exports = { getPending, setNextBoot, consume, clear };
