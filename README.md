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
| `bootingTimeoutMs` | Tempo (ms) que o status fica em `ligando` após o `/wake` |

> ⚠️ O `sourceIp` deve ser o IP da máquina onde o `index.js` está rodando (não o do PC alvo), e o `targetIp` deve ser o IP do PC que você liga com Wake-on-LAN.

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

- Envia um ping (ICMP) para o `targetIp`, com timeout de 2s.
  - Respondeu → `"ligado"`
  - Não respondeu, mas o `/wake` foi chamado há menos de `bootingTimeoutMs` → `"ligando"`
  - Não respondeu e fora da janela de boot → `"desligado"`

> Nota: a checagem via ping (`ping -c 1 -W 2`) usa a sintaxe do Linux/Android (Termux). Se o servidor rodar no Windows, troque para `ping -n 1 -w 2000 <ip>` em [index.js](index.js).

Foi optado por ping em vez de checar a porta RDP (3389) porque o Windows Home não aceita conexões RDP como servidor — só Pro/Enterprise/Education têm esse recurso.
