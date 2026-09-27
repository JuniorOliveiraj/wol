# wol

Servidor Node.js para ligar um PC remotamente via Wake-on-LAN, escolher o sistema do próximo boot (Windows ou CachyOS, via GRUB) e consultar o status dele (ligado, ligando ou desligado).

Planejamento completo em [doc/](doc/README.md).

## Requisitos

- Node.js
- O PC alvo com Wake-on-LAN habilitado na BIOS/placa de rede
- O servidor rodando na mesma rede local do PC alvo (para o broadcast do pacote WOL funcionar)

## Instalação

```bash
npm install
```

## Configuração

Edite os valores em [lib/config.js](lib/config.js) (ou use as variáveis de ambiente indicadas lá — `PORT`, `MAC_ADDRESS`, `BROADCAST`, `SOURCE_IP`, `TARGET_IP`, `WOL_TOKEN`, `GRUB_ID_WINDOWS`, `GRUB_ID_LINUX`, `STATE_FILE`):

| Constante | Descrição |
| --- | --- |
| `macAddress` | Endereço MAC da placa de rede do PC alvo |
| `broadcast` | Endereço de broadcast da rede (ex: `192.168.3.255`) |
| `sourceIp` | IP da máquina que está rodando este servidor |
| `wolPort` | Porta usada para o pacote WOL (padrão `9`) |
| `targetIp` | **IP do PC alvo** — usado para checar se ele está ligado |
| `bootingTimeoutMs` | Tempo (ms) que o status fica em `ligando` após o `/wake` |
| `uiPassword` | Senha da interface web |
| `grubIds` | IDs das `menuentry` do GRUB para `windows` e `linux` |

> ⚠️ O `sourceIp` deve ser o IP da máquina onde o `index.js` está rodando (não o do PC alvo), e o `targetIp` deve ser o IP do PC que você liga com Wake-on-LAN.

## Executando

```bash
npm start
```

O servidor sobe em `http://localhost:3008`. Abrindo essa URL no navegador aparece a interface web (pede a senha).

## Rotas

### `GET /` — interface web

Tela preta com dois botões (Windows / CachyOS) e o status do PC. Exige senha (`POST /login`); a sessão dura 30 dias.

### `POST /pc/boot/:target`

`target` = `windows` ou `linux`. Exige sessão da interface ou `Authorization: Bearer <WOL_TOKEN>`. Grava o próximo boot, confirma a gravação e só então envia o Wake-on-LAN. Detalhes em [doc/03-api.md](doc/03-api.md).

### `GET /grub/next.cfg`

Lida pelo GRUB durante o boot (aceita só o IP do PC). Configuração do GRUB em [doc/04-configuracao-grub.md](doc/04-configuracao-grub.md).

### `GET /wake` (legada)

Envia o pacote mágico Wake-on-LAN para o PC alvo. Sempre inicia o sistema padrão do GRUB (Windows).

```bash
curl http://localhost:3008/wake
```

### `GET /status`

Retorna o status atual do PC alvo em JSON.

```bash
curl http://localhost:3008/status
```

```json
{ "status": "ligado", "nextBoot": null }
```

`nextBoot` indica uma escolha de sistema ainda não usada pelo GRUB (`"windows"`, `"linux"` ou `null`).

Como funciona:

- Envia um ping (ICMP) para o `targetIp`, com timeout de 2s.
  - Respondeu → `"ligado"`
  - Não respondeu, mas o `/wake` foi chamado há menos de `bootingTimeoutMs` → `"ligando"`
  - Não respondeu e fora da janela de boot → `"desligado"`

> Nota: a checagem via ping (`ping -c 1 -W 2`) usa a sintaxe do Linux/Android (Termux). Se o servidor rodar no Windows, troque para `ping -n 1 -w 2000 <ip>` em [index.js](index.js).

Foi optado por ping em vez de checar a porta RDP (3389) porque o Windows Home não aceita conexões RDP como servidor — só Pro/Enterprise/Education têm esse recurso.
