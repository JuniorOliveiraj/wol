# 02 — Decisão técnica: como o GRUB sabe o próximo boot

O problema: o PC está **desligado** quando o pedido chega. Nada roda nele para gravar a escolha.

## Opções avaliadas

### A) GRUB consulta o servidor pela rede no boot ✅ recomendada

O servidor guarda a escolha em memória/arquivo. Ao ligar, o GRUB sobe a rede (UEFI) e baixa um pequeno arquivo de configuração via HTTP:

```
GRUB inicia → net_bootp → source (http,192.168.3.85:3008)/grub/next.cfg
                                   │
            servidor responde:  set default="cachyos"
                                set timeout=1
```

- **Prós:** funciona com o PC totalmente desligado; nada precisa rodar no Windows nem no Linux; a escolha fica 100% no servidor; "próximo boot" é natural (o servidor descarta a escolha depois que o GRUB a lê).
- **Contras:** depende do GRUB UEFI com módulos `efinet` + `http` e da placa de rede exposta pelo firmware (UEFI Network Stack); o módulo `http` do GRUB **não suporta HTTPS**; adiciona alguns segundos ao boot (DHCP).
- **Falha segura:** se o servidor não responder, o `source` falha e o GRUB segue o padrão normal.

### B) Agente no PC grava a escolha antes de desligar

Um pequeno serviço no Windows e no CachyOS consulta o servidor antes do shutdown e grava `next_entry` no `grubenv`.

- **Prós:** não depende de rede no GRUB.
- **Contras:** só funciona se a escolha for feita **antes** de desligar o PC (quebra o objetivo principal); precisa de agente nos dois SOs; no Windows, o `grubenv` precisa estar numa partição FAT32 (ESP) para ser gravável; no CachyOS com btrfs o GRUB não grava `grubenv`.

### C) Escolha padrão fixa + troca manual

Sem escolha remota real. Descartada — não atende o objetivo.

## Decisão

**Opção A.** A opção B fica como plano de contingência caso o firmware/placa de rede não funcione no GRUB (validar na etapa 1 do [roteiro](05-roteiro.md)).

## Como o "próximo boot" funciona na opção A

| Estado no servidor | O que `GET /grub/next.cfg` devolve | Depois |
| --- | --- | --- |
| Nenhuma escolha pendente | Arquivo vazio (GRUB usa o padrão) | — |
| `linux` pendente | `set default="cachyos"` | Escolha marcada como consumida |
| `windows` pendente | `set default="windows"` | Escolha marcada como consumida |

- A escolha **expira** (ex.: 5 min) se o PC não ligar, para não afetar um boot manual futuro.
- A escolha é persistida em arquivo (`state.json`) para sobreviver a reinício do servidor.
- "Confirmar configuração" (regra 4) = gravar o estado, reler o arquivo e comparar antes de enviar o WOL.

## Segurança da rota do GRUB

O GRUB não consegue enviar cabeçalho `Authorization`. Então `/grub/next.cfg`:

- aceita somente requisições vindas do IP do PC (`targetIp`);
- é apenas leitura da escolha — não liga nada, não altera o padrão;
- nunca devolve conteúdo além das linhas `set default=` / `set timeout=` com valores de uma lista fixa (evita injeção de comandos no GRUB).
