# 01 — Visão geral

## Objetivo

O servidor Node.js (24/7, na mesma LAN do PC) vira um **controle remoto de boot**: pelo celular você escolhe Windows ou CachyOS, o servidor prepara o próximo boot e só então envia o Wake on LAN.

| Peça | Papel |
| --- | --- |
| Windows | Jogos |
| CachyOS | Trabalho |
| GRUB | Gerenciador de boot (escolhe o SO) |
| Wake on LAN | Liga o PC remotamente |
| Servidor Node | Recebe o pedido, guarda a escolha, envia o magic packet |

## Regras de negócio

1. **A escolha do SO acontece antes do Wake on LAN.** Nunca ligar primeiro e tentar escolher depois.
2. **Só o próximo boot é alterado**, nunca o padrão permanente do GRUB. Depois de usado, a escolha é descartada e o GRUB volta ao padrão (ex.: Windows).
3. **Sem autenticação, nada acontece.** Toda rota que liga o PC exige token.
4. **Se a configuração do boot falhar, o WOL não é enviado.**
5. Sistemas aceitos: somente `windows` e `linux`. Qualquer outro valor é rejeitado.
6. **A rota legada `GET /wake` não muda**: mesmo contrato de hoje, sem token, e sempre inicia o padrão (Windows). As rotas novas são adicionais.
7. **Interface web na home (`/`)**, protegida por senha fixa no backend, toda preta, só com os botões Windows / CachyOS — ver [06-interface-web.md](06-interface-web.md).

## Fluxo

```
Celular ──POST /pc/boot/linux (Bearer TOKEN)──▶ Servidor Node
                                                  │ 1. valida token
                                                  │ 2. valida alvo
                                                  │ 3. grava "próximo boot = linux"
                                                  │ 4. relê e confirma a gravação
                                                  │ 5. envia magic packet
                                                  ▼
                                                 PC liga
                                                  │
                                                GRUB ──▶ descobre o próximo boot (ver doc 02)
                                                  │
                                               CachyOS
```

## Arquitetura

```
   Celular (navegador em meudominio/)
             │ HTTPS (interface + API)
             ▼
   ┌───────────────────────┐
   │ Servidor Node 24/7    │
   │ 192.168.3.85:3008     │
   │  GET  /  (interface)  │
   │  POST /login          │
   │  GET  /wake (legada)  │
   │  POST /pc/boot/:alvo  │
   │  GET  /status         │
   │  GET  /grub/next.cfg  │◀─────┐ GRUB pergunta no boot
   └──────────┬────────────┘      │
              │ Magic Packet      │
              ▼                   │
   ┌───────────────────────┐      │
   │ PC 192.168.3.27       │──────┘
   │ GRUB → Windows|CachyOS│
   └───────────────────────┘
```

## Ponto técnico em aberto (resolvido no doc 02)

O servidor está em outra máquina. Com o PC desligado, ele não consegue rodar comandos do GRUB no PC. É preciso um mecanismo para o GRUB saber a escolha — ver [02-decisao-tecnica.md](02-decisao-tecnica.md).
