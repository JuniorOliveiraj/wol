const path = require('path');

// Valores padrao = os mesmos que ja estavam fixos no index.js.
// Podem ser sobrescritos por variaveis de ambiente.
module.exports = {
    port: Number(process.env.PORT) || 3008,

    macAddress: process.env.MAC_ADDRESS || '18:C0:4D:F3:E2:10',
    broadcast: process.env.BROADCAST || '192.168.3.255',
    sourceIp: process.env.SOURCE_IP || '192.168.3.85',
    wolPort: Number(process.env.WOL_PORT) || 9,

    targetIp: process.env.TARGET_IP || '192.168.3.27',
    bootingTimeoutMs: 90 * 1000, // tempo maximo considerado "ligando" apos o wake

    // Senha da interface web (fixa no backend, nunca enviada ao navegador)
    uiPassword: 'B3LL3m@120600',
    sessionTtlMs: 30 * 24 * 60 * 60 * 1000, // 30 dias
    loginMaxAttempts: 5,
    loginWindowMs: 60 * 1000,

    // Token opcional para uso da API sem interface (Authorization: Bearer ...)
    apiToken: process.env.WOL_TOKEN || null,

    // Escolha de boot pendente expira se o PC nao ligar nesse tempo
    nextBootTtlMs: 5 * 60 * 1000,
    stateFile: process.env.STATE_FILE || path.join(__dirname, '..', 'state.json'),

    // Alvo da API -> id da menuentry no GRUB
    grubIds: {
        windows: process.env.GRUB_ID_WINDOWS || 'osprober-efi-AA23-1F87', // Windows Boot Manager (nvme0n1p1)
        linux: process.env.GRUB_ID_LINUX || 'gnulinux-simple-f6e370b0-ce37-4cf6-9816-6ee202ad19e6', // CachyOS Linux
    },
    targetNames: {
        windows: 'Windows',
        linux: 'CachyOS',
    },
};
