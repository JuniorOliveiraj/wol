const express = require('express');
const wol = require('wake_on_lan');
const { exec } = require('child_process');

const app = express();
const port = 3008;

const macAddress = '18:C0:4D:F3:E2:10';
const broadcast = '192.168.3.255';
const sourceIp = '192.168.3.85';
const wolPort = 9;

const targetIp = '192.168.3.27';
const bootingTimeoutMs = 90 * 1000; // tempo maximo considerado "ligando" apos o wake

let bootingUntil = null;

function checkHostAlive() {
    return new Promise((resolve) => {
        // -c 1 -W 2: envia 1 pacote ICMP e espera ate 2s pela resposta (sintaxe Linux/Android/Termux)
        exec(`ping -c 1 -W 2 ${targetIp}`, (err) => {
            resolve(!err);
        });
    });
}

// Rota para Wake-on-LAN
app.get('/wake', (req, res) => {
    wol.wake(macAddress, { address: broadcast, port: wolPort, sourceIp: sourceIp }, (err) => {
        if (err) {
            console.error('Erro ao enviar pacote:', err);
            res.status(500).send('Erro ao enviar pacote Wake-on-LAN');
        } else {
            bootingUntil = Date.now() + bootingTimeoutMs;
            res.send('Pacote Wake-on-LAN enviado com sucesso!');
        }
    });
});

// Rota de status: ligado, ligando ou desligado
app.get('/status', async (req, res) => {
    const hostUp = await checkHostAlive();

    if (hostUp) {
        bootingUntil = null;
        return res.json({ status: 'ligado' });
    }

    if (bootingUntil && Date.now() < bootingUntil) {
        return res.json({ status: 'ligando' });
    }

    bootingUntil = null;
    res.json({ status: 'desligado' });
});

// Inicializa o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
