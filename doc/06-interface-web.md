# 06 — Interface web

Página simples servida pelo próprio servidor Node na **home** (`https://meudominio/`), para escolher o sistema com um toque. As rotas da API continuam existindo; a interface só as consome.

## Acesso por senha

- Ao abrir `/` sem sessão válida → tela de senha.
- A senha é **fixa no backend** (constante `UI_PASSWORD` no servidor). Não é enviada ao navegador e não aparece no HTML/JS.
- Senha correta → servidor cria sessão e devolve cookie `wol_session` (`HttpOnly`, `SameSite=Strict`, `Secure` quando em HTTPS, validade de 30 dias).
- Senha errada → mensagem genérica "Senha inválida". Limite de **5 tentativas por minuto por IP** (`429` depois disso).
- Sessões ficam em memória: se o servidor reiniciar, basta digitar a senha de novo.
- Botão "Sair" apaga a sessão.

## Telas

### Login

```
┌──────────────────────────────┐
│                              │
│            ⏻  wol            │
│                              │
│   ╭──────────────────────╮   │
│   │ ••••••••••           │   │
│   ╰──────────────────────╯   │
│   ╭──────────────────────╮   │
│   │        Entrar        │   │
│   ╰──────────────────────╯   │
│                              │
└──────────────────────────────┘
```

### Home (logado)

```
┌──────────────────────────────┐
│  ● desligado            Sair │
│                              │
│  ╭────────────────────────╮  │
│  │   🎮                   │  │
│  │   Windows              │  │
│  │   jogos                │  │
│  ╰────────────────────────╯  │
│  ╭────────────────────────╮  │
│  │   🐧                   │  │
│  │   CachyOS              │  │
│  │   trabalho             │  │
│  ╰────────────────────────╯  │
│                              │
│  Próximo boot: —             │
└──────────────────────────────┘
```

- **Status** no topo (`ligado` / `ligando` / `desligado`), atualizado a cada 5 s via `GET /status`, com um ponto colorido que pulsa em `ligando`.
- **Dois botões grandes**, um por sistema. Ao tocar: botão entra em estado "enviando…", chama `POST /pc/boot/:target`, e mostra a `message` da resposta num aviso (toast) na parte de baixo.
- Com o PC `ligado`, os botões ficam desabilitados com o texto "PC já está ligado".
- Nada de menus, abas ou configurações — só isso.

## Estilo (inspirado no Caelestia)

Visual escuro, arredondado e "flutuante", no espírito do Caelestia shell (Hyprland/Quickshell):

| Elemento | Definição |
| --- | --- |
| Fundo | Preto puro `#000000` |
| Cartões/botões | Superfície `#111111`, borda `1px #1e1e1e`, cantos bem arredondados (`28px`) |
| Texto | Principal `#e6e1e5`, secundário `#8e8a93` |
| Destaque | Lilás pastel `#cdbdff` (Windows) e verde-água pastel `#a6d6c8` (CachyOS) — usados no ícone e no brilho do botão |
| Status | Verde `#9ee0a0` ligado, âmbar `#f2c77a` ligando, cinza `#5c5a60` desligado |
| Fonte | `Rubik` (Google Fonts), com fallback `system-ui` |
| Ícones | Material Symbols Rounded (`sports_esports`, `terminal`, `power_settings_new`) |
| Interação | Hover/toque: botão cresce levemente (`scale(1.02)`) e ganha brilho suave na cor de destaque; transições de 200 ms com `cubic-bezier(.2,0,0,1)` |
| Layout | Coluna centralizada, largura máx. `420px`, pensada para celular primeiro |

Tudo em HTML + CSS + JS puros, sem framework e sem etapa de build — arquivos em `public/`.

## Rotas envolvidas

| Rota | Autenticação | Função |
| --- | --- | --- |
| `GET /` | sessão (senão mostra login) | Interface |
| `POST /login` | — (com limite de tentativas) | Valida senha, cria sessão |
| `POST /logout` | sessão | Encerra sessão |
| `POST /pc/boot/:target` | sessão **ou** Bearer token | Escolhe SO + WOL |
| `GET /status` | — (legada, inalterada) | Status do PC |
| `GET /wake` | — (legada, inalterada) | Liga no padrão (Windows) |

## Acesso pelo domínio

- Para acessar por `meudominio` fora de casa, usar **HTTPS** (proxy reverso, ex.: Caddy ou Nginx, ou um túnel). Sem HTTPS a senha trafega em texto puro.
- `GET /grub/next.cfg` continua **só na LAN** (o GRUB não fala HTTPS e a rota filtra pelo IP do PC). O proxy não deve expor essa rota.
- A `/wake` legada segue aberta como hoje. Se quiser, o proxy pode bloqueá-la de fora da LAN **sem alterar a rota em si**.
