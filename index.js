const express = require('express');
const wol = require('wake_on_lan');

const app = express();
const port = 3008;

// Rota para Wake-on-LAN
app.get('/wake', (req, res) => {
    const macAddress = '18:C0:4D:F3:E2:10';
    const broadcast = '192.168.3.255';
    const sourceIp = '192.168.3.27';
    const wolPort = 9;

    wol.wake(macAddress, { address: broadcast, port: wolPort, sourceIp: sourceIp }, (err) => {
        if (err) {
            console.error('Erro ao enviar pacote:', err);
            res.status(500).send('Erro ao enviar pacote Wake-on-LAN');
        } else {
            res.send('Pacote Wake-on-LAN enviado com sucesso!');
        }
    });
});

// Inicializa o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
