# 03 — API

Base: `http://<servidor>:3008`

## Autenticação

As rotas **novas** usam token fixo em variável de ambiente (as rotas legadas `/wake` e `/status` não mudam — ver abaixo):

```
Authorization: Bearer <WOL_TOKEN>
```

A interface web autentica por **sessão** (cookie `wol_session`, obtido em `POST /login` com a senha fixa do backend). As rotas novas aceitam **cookie de sessão ou Bearer token** — ver [06-interface-web.md](06-interface-web.md).

- Token/sessão ausente ou inválido → `401`, nada é gravado, WOL não é enviado.
- Comparação do token com `crypto.timingSafeEqual`.
- Configuração sai das constantes do `index.js` e vai para `.env` / variáveis de ambiente (token, MAC, IPs). `.env` no `.gitignore`.

> O plano inicial citava `GET /pc/boot/...`. Foi alterado para **POST**: GET não deve ter efeito colateral (navegadores e apps fazem pré-carregamento de links e poderiam ligar o PC sem querer).

## Rotas

### `POST /pc/boot/:target`

`target` ∈ `windows` | `linux`.

Passos, em ordem — qualquer falha interrompe:

1. Validar token → `401`
2. Validar `target` → `400`
3. Gravar próximo boot (`state.json`)
4. Reler e confirmar → `500` se divergir (**WOL não enviado**)
5. Enviar WOL → `502` se falhar

Respostas:

```json
{ "success": true, "target": "linux", "message": "Próximo boot configurado para CachyOS. Wake on LAN enviado." }
```

```json
{ "success": true, "target": "windows", "message": "Próximo boot configurado para Windows. Wake on LAN enviado." }
```

```json
{ "success": false, "target": "linux", "message": "Não foi possível configurar o próximo boot. Wake on LAN não enviado." }
```

| Código | Quando |
| --- | --- |
| 200 | Boot configurado e WOL enviado |
| 400 | `target` inválido |
| 401 | Token ausente/inválido |
| 409 | PC já está ligado (opcional — escolher não faz efeito até reiniciar) |
| 500 | Falha ao gravar/confirmar o próximo boot |
| 502 | Boot gravado, mas o envio do WOL falhou |

### `GET /`

Interface web. Sem sessão → tela de login; com sessão → botões. Arquivos estáticos em `public/`.

### `GET /session`

`{ "authenticated": true | false }` — usada pela interface para decidir entre login e home.

### `POST /login`

Corpo: `{ "password": "..." }`. Compara com a constante `UI_PASSWORD` (`crypto.timingSafeEqual`).

- Correta → `200 { "success": true }` + cookie `wol_session`.
- Errada → `401 { "success": false, "message": "Senha inválida" }`.
- Mais de 5 tentativas/minuto do mesmo IP → `429`.

### `POST /logout`

Remove a sessão e limpa o cookie. `200 { "success": true }`.

### `GET /grub/next.cfg`

Consumida pelo GRUB no boot. Sem token; restrita ao IP do PC. `Content-Type: text/plain`.

- Com escolha pendente e válida:
  ```
  set default="cachyos"
  set timeout=1
  ```
  Em seguida marca a escolha como consumida.
- Sem escolha: corpo vazio (`200`).
- IP diferente de `targetIp`: `403`.

Os IDs (`cachyos`, `windows`) são os `--id` das `menuentry` do GRUB — ver [04-configuracao-grub.md](04-configuracao-grub.md).

### `GET /status` (existente)

Mantida como está (sem token, mesmo formato). Único acréscimo permitido: um campo novo opcional, que não quebra quem já usa:

```json
{ "status": "ligando", "nextBoot": "linux" }
```

### `GET /wake` (legada — não muda)

**Contrato congelado.** Continua exatamente como hoje: mesma URL, mesmo método, sem token, mesmas respostas em texto. Ela liga o PC e o GRUB inicia o **padrão (Windows)**.

- Não recebe parâmetro de SO e não passa a exigir autenticação.
- Para garantir que sempre caia no padrão, ao ser chamada ela **descarta qualquer escolha pendente** no `state.json` antes de enviar o WOL (assim um pedido `linux` antigo e não consumido não "vaza" para ela).
- As rotas novas (`/pc/boot/:target`) são adicionais; nada no fluxo da `/wake` depende delas.

## Estado persistido (`state.json`)

```json
{
  "nextBoot": "linux",
  "requestedAt": "2026-09-27T12:00:00.000Z",
  "expiresAt": "2026-09-27T12:05:00.000Z",
  "consumedAt": null
}
```
