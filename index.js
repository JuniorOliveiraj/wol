const express = require('express');
const wol = require('wake_on_lan');
const net = require('net');

const app = express();
const port = 3008;

const macAddress = '18:C0:4D:F3:E2:10';
const broadcast = '192.168.3.255';
const sourceIp = '192.168.3.27';
const wolPort = 9;

const targetIp = '192.168.3.27';
const rdpPort = 3389;
const bootingTimeoutMs = 90 * 1000; // tempo maximo considerado "ligando" apos o wake

let bootingUntil = null;

function checkRdpPort() {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const onDone = (isUp) => {
            socket.destroy();
            resolve(isUp);
        };
        socket.setTimeout(2000);
        socket.once('connect', () => onDone(true));
        socket.once('timeout', () => onDone(false));
        socket.once('error', () => onDone(false));
        socket.connect(rdpPort, targetIp);
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
    const rdpUp = await checkRdpPort();

    if (rdpUp) {
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
