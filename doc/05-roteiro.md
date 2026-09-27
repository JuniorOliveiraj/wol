# 05 — Roteiro de implementação

## Etapa 1 — Prova de conceito (valida a opção A)

- [ ] Rota `GET /grub/next.cfg` devolvendo um texto fixo
- [ ] Teste manual no console do GRUB (`c`) conforme [doc 04](04-configuracao-grub.md#teste-manual-antes-de-integrar)
- [ ] Decidir: seguir com opção A ou cair para opção B

## Etapa 2 — Base do servidor

- [ ] Mover configuração para variáveis de ambiente (`dotenv`): `WOL_TOKEN`, `MAC_ADDRESS`, `BROADCAST`, `SOURCE_IP`, `TARGET_IP`, `PORT`
- [ ] `.gitignore` com `node_modules/`, `.env`, `state.json`
- [ ] Middleware de autenticação Bearer
- [ ] `express.json()` e tratamento de erro padronizado (`{ success, target, message }`)

## Etapa 3 — Próximo boot

- [ ] Módulo de estado: `setNextBoot(target)`, `getNextBoot()`, `consume()`, com expiração
- [ ] Gravação atômica do `state.json` (escreve em arquivo temporário e renomeia) + releitura para confirmar
- [ ] Mapeamento `windows|linux` → ID do GRUB, lista fixa

## Etapa 4 — Rotas

- [ ] `POST /pc/boot/:target` seguindo a ordem: token → alvo → gravar → confirmar → WOL
- [ ] `GET /grub/next.cfg` restrita a `TARGET_IP`, consome a escolha
- [ ] `GET /status` sem mudança de contrato (apenas campo opcional `nextBoot`)
- [ ] `GET /wake` legada **intocada**: sem token, mesmas respostas; só passa a limpar escolha pendente antes do WOL para sempre bootar o padrão (Windows)

## Etapa 5 — Integração no PC (manual)

- [ ] BIOS: UEFI Network Stack
- [ ] Script `/etc/grub.d/41_remote_boot` e regenerar `grub.cfg`
- [ ] Reserva DHCP do IP do PC

## Etapa 6 — Interface web (branch `FRONT-END`) — ver [doc 06](06-interface-web.md)

- [ ] Constante `UI_PASSWORD` no backend + `POST /login` / `POST /logout`
- [ ] Sessões em memória, cookie `HttpOnly` + `SameSite=Strict`
- [ ] Limite de 5 tentativas de login por minuto por IP
- [ ] Middleware: rotas novas aceitam sessão **ou** Bearer token
- [ ] `public/index.html`, `public/style.css`, `public/app.js` (sem framework, sem build)
- [ ] Tela de login (senha) e home com dois botões: **Windows** / **CachyOS**
- [ ] Status em tempo real (polling do `/status` a cada 5 s)
- [ ] Toast com a `message` da API; botões desabilitados com o PC ligado
- [ ] Visual preto estilo Caelestia (tokens de cor, Rubik, Material Symbols Rounded, cantos 28px)
- [ ] HTTPS no domínio via proxy reverso; `/grub/next.cfg` não exposta

## Checklist de testes

| Cenário | Esperado |
| --- | --- |
| Sem token | 401, WOL não enviado |
| `target` = `macos` | 400 |
| Falha ao gravar `state.json` | 500, WOL não enviado |
| Pedido `linux`, PC liga | GRUB inicia CachyOS |
| Boot seguinte sem pedido | GRUB inicia o padrão |
| Pedido feito e PC não liga em 5 min | Escolha expira |
| Servidor fora do ar durante o boot | GRUB inicia o padrão |
| `/grub/next.cfg` de outro IP | 403 |
| `GET /wake` (legada), sem token | 200 como hoje, PC liga no Windows |
| Pedido `linux` pendente e depois `GET /wake` | Escolha descartada, PC liga no Windows |
| Abrir `/` sem sessão | Tela de senha, botões não aparecem |
| Senha errada 6× em 1 min | `429` |
| Senha correta | Home com os dois botões |
| `POST /pc/boot/linux` sem cookie nem token | 401 |
| Senha procurada no HTML/JS do navegador | Não aparece |
| Servidor reinicia entre o pedido e o boot | Escolha preservada (`state.json`) |
