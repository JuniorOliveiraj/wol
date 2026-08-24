# wol

Servidor Node.js simples para ligar um PC remotamente via Wake-on-LAN e consultar o status dele (ligado, ligando ou desligado).

## Requisitos

- Node.js
- O PC alvo com Wake-on-LAN habilitado na BIOS/placa de rede
- O servidor rodando na mesma rede local do PC alvo (para o broadcast do pacote WOL funcionar)

## Instalação

```bash
npm install
```

## Configuração

Edite as constantes no topo de [index.js](index.js):

| Constante | Descrição |
| --- | --- |
| `macAddress` | Endereço MAC da placa de rede do PC alvo |
| `broadcast` | Endereço de broadcast da rede (ex: `192.168.3.255`) |
| `sourceIp` | IP da máquina que está rodando este servidor |
| `wolPort` | Porta usada para o pacote WOL (padrão `9`) |
| `targetIp` | **IP do PC alvo** — usado para checar se ele está ligado |
| `rdpPort` | Porta usada para checar se o PC está ligado (padrão RDP `3389`) |
| `bootingTimeoutMs` | Tempo (ms) que o status fica em `ligando` após o `/wake` |

> ⚠️ `targetIp` precisa ser preenchido com o IP real do PC alvo antes de usar a rota `/status`.

## Executando

```bash
npm start
```

O servidor sobe em `http://localhost:3008`.

## Rotas

### `GET /wake`

Envia o pacote mágico Wake-on-LAN para o PC alvo.

```bash
curl http://localhost:3008/wake
```

### `GET /status`

Retorna o status atual do PC alvo em JSON.

```bash
curl http://localhost:3008/status
```

```json
{ "status": "ligado" }
```

Como funciona:

- Tenta abrir uma conexão TCP na porta `rdpPort` (RDP, por padrão) do PC alvo, com timeout de 2s.
  - Conectou → `"ligado"`
  - Não conectou, mas o `/wake` foi chamado há menos de `bootingTimeoutMs` → `"ligando"`
  - Não conectou e fora da janela de boot → `"desligado"`

A porta RDP é usada como sinal de "ligado" porque o serviço de RDP normalmente fica escutando mesmo sem uma sessão remota ativa, sendo mais confiável que ping ICMP (que costuma ser bloqueado por firewall).
