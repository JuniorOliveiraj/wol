# 04 — Configuração manual no PC (GRUB / BIOS)

> Estes passos **não são automatizados** pelo projeto e devem ser feitos manualmente pelo dono do PC. O servidor Node apenas responde ao GRUB; ele não instala nem altera nada no PC.

## 1. BIOS / UEFI

- Wake on LAN habilitado (já funciona hoje).
- Boot em modo **UEFI** (não Legacy/CSM).
- **Network Stack / PXE / UEFI Network** habilitado — sem isso o GRUB não enxerga a placa de rede (`efinet`). Não é preciso colocar a rede na ordem de boot, só habilitar a pilha.

## 2. IDs fixos nas entradas do GRUB

O servidor responde `set default="<id>"`. Os IDs precisam ser estáveis:

| Alvo da API | ID esperado no GRUB |
| --- | --- |
| `linux` | `gnulinux-simple-f6e370b0-ce37-4cf6-9816-6ee202ad19e6` (CachyOS Linux) |
| `windows` | `osprober-efi-AA23-1F87` (Windows Boot Manager em `/dev/nvme0n1p1`) |

Configurados em `lib/config.js` (`grubIds`). Se reinstalar/reformatar algum sistema, os IDs mudam — refazer o `grep` abaixo e atualizar.

Conferir os IDs atuais em `/boot/grub/grub.cfg` (`menuentry ... --id ...` / `$menuentry_id_option`). Se os IDs gerados automaticamente forem longos (ex.: `gnulinux-simple-<uuid>`), usar esses valores no mapeamento do servidor em vez de renomear.

## 3. Trecho que consulta o servidor

Adicionar um script personalizado (ex.: `/etc/grub.d/41_remote_boot`) que vai para o **final** do `grub.cfg`, depois das `menuentry`:

```sh
#!/bin/sh
cat <<'EOF'
# --- Boot remoto (servidor wol) ---
insmod efinet
insmod http
if net_bootp; then
    source (http,192.168.3.85:3008)/grub/next.cfg
fi
EOF
```

Depois, regenerar o `grub.cfg` com o comando da distro (no CachyOS: `grub-mkconfig -o /boot/grub/grub.cfg`).

Notas:

- Se `net_bootp` ou o download falhar, o GRUB segue com o padrão — o PC nunca fica travado.
- Se o `(http,host:porta)` não funcionar na versão do GRUB, expor a rota também na porta 80.
- Fixar o IP do PC por reserva DHCP no roteador (`192.168.3.27`), pois o servidor filtra por IP.

## 4. Padrão permanente

Continua definido normalmente em `/etc/default/grub` (`GRUB_DEFAULT`). A API nunca altera esse valor.

## Teste manual antes de integrar

No menu do GRUB, pressionar `c` e executar:

```
insmod efinet
insmod http
net_bootp
net_ls_addr
cat (http,192.168.3.85:3008)/grub/next.cfg
```

Se o `cat` mostrar o conteúdo, a opção A está viável. Se não, avaliar a opção B do [doc 02](02-decisao-tecnica.md).
