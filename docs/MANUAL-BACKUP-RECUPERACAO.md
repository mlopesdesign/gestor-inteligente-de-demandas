# Manual de Backup e Recuperação — Gestor Inteligente de Demandas

> Princípio: o usuário sempre pode exportar tudo, e sempre pode voltar ao último estado bom.
> Sem perda silenciosa de dados.

---

## O que é o backup

O backup consiste em **2 cóias** que precisam ser preservadas:

| O quê | Onde | Função |
|---|---|---|
| `gestor_local.db` | `%APPDATA%\GestorInteligenteDeDemandas\` | Banco local SQLite (sua verdade no dispositivo) |
| `gestor_central.db` | (servidor) `data/` | Banco central (sua verdade multi-dispositivo) |

A sincronização entre eles é **automática** (LWW com version vector + detecção de
conflito). Mas o backup manual é a sua rede de segurança contra:
- Falha de hardware (HD/SSD morre)
- Falha de SO (Windows corrompido)
- Apagamento acidental
- Bug grave no app

---

## Backup automático recomendado

### Backup semanal do banco local

**PowerShell** (salve como `backup-gestor.ps1`):
```powershell
$dest = "D:\backups\gestor\"
New-Item -ItemType Directory -Path $dest -Force | Out-Null
$data = "$env:APPDATA\GestorInteligenteDeDemandas\gestor_local.db"
$hoje = Get-Date -Format "yyyyMMdd-HHmm"
Copy-Item $data "$dest\gestor_local-$hoje.db"
# Manter últimos 30
Get-ChildItem $dest -Filter "gestor_local-*.db" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip 30 |
    Remove-Item -Force
```

Agende no *Agendador de Tarefas* do Windows para rodar toda semana.

### Backup do servidor central (se auto-hospedado)

```bash
# Linux/macOS
sqlite3 data/gestor_central.db ".backup /backups/gestor_central-$(date +%Y%m%d).db"

# Windows (PowerShell)
$data = "C:\gestor\server\data\gestor_central.db"
$hoje = Get-Date -Format "yyyyMMdd-HHmm"
Copy-Item $data "D:\backups\gestor\gestor_central-$hoje.db"
```

---

## Backup manual antes de algo arriscado

Antes de qualquer mudança grande (atualização manual, migração, etc):

1. Abra PowerShell
2. Execute:
   ```powershell
   $data = "$env:APPDATA\GestorInteligenteDeDemandas\gestor_local.db"
   $backup = "$data.backup-$(Get-Date -Format 'yyyyMMdd-HHmm')"
   Copy-Item $data $backup
   Write-Output "Backup: $backup"
   ```
3. Guarde o arquivo `.backup-*` em local seguro (HD externo, nuvem)

---

## Restauração

### Cenário 1: arquivo .db corrompido

O `DesktopDb` tem **recuperação automática**:
- Se `gestor_local.db` faltar, tenta `gestor_local.db.old` ou `gestor_local.db.tmp`
- Essas cópias são criadas pelo SQLite em cada *checkpoint* do WAL

Se mesmo assim o app não abrir:

1. Pare o app (bandeja → Sair)
2. Restaure o backup mais recente:
   ```powershell
   $data = "$env:APPDATA\GestorInteligenteDeDemandas\gestor_local.db"
   $backups = Get-ChildItem "$data.backup-*.db" | Sort-Object LastWriteTime -Descending
   $maisRecente = $backups[0].FullName
   Copy-Item $maisRecente $data -Force
   Write-Output "Restaurado de $maisRecente"
   ```
3. Reinicie o app

### Cenário 2: sincronização dessincronizada

Se o `sync_conflitos` está acumulando pendências:

1. Abra o app e vá em *Configurações → Sincronização → Conflitos pendentes*
2. Para cada conflito, escolha:
   - **Manter meu**: aplica a versão do seu dispositivo
   - **Manter do servidor**: aplica a versão que está no servidor
   - **Mesclar**: abre editor campo-a-campo
3. Sincronize novamente

### Cenário 3: trocar de máquina

1. Na máquina **antiga**: *Configurações → Conta → Exportar tudo* (gera `.zip` com JSON)
2. Na máquina **nova**: instale o app, faça login com a mesma conta
3. Sincronização automática baixa tudo do servidor central

### Cenário 4: perda total (HD morreu, sem backup)

1. Reinstale o app na nova máquina
2. Faça login com a **mesma conta**
3. Se o servidor central estiver vivo, todos os dados voltam via sync
4. Se nem o backup local nem o servidor existem: dados perdidos. **Por isso backup é importante.**

---

## Exportar tudo (LGPD Art. 18)

Você tem direito a uma cópia portável de todos os seus dados:

**No app**: *Configurações → Conta → Exportar tudo*
- Gera `gestor-export-<timestamp>.zip` em `%USERPROFILE%\Documents\`
- Contém `tarefas.json`, `clientes.json`, `areas.json`, `projetos.json`,
  `anexos/`, `auditoria.json`
- Formato aberto (JSON) — você pode ler, migrar para outro app, arquivar

---

## Apagar tudo (LGPD Art. 18, "direito ao esquecimento")

**No app**: *Configurações → Conta → Apagar conta*
- Solicita confirmação por senha
- Marca a conta como `conta_apagada_em = agora()`
- Após 30 dias (período de segurança), todos os dados são hard-deleted
  do banco central E do banco local
- Auditoria preserva apenas a *existência* da conta (sem conteúdo), conforme
  exige a legislação

---

## Verificação de integridade do banco

Se desconfiar de corrupção:

```powershell
$db = "$env:APPDATA\GestorInteligenteDeDemandas\gestor_local.db"
# Use o sqlite3.exe (vem com o app em runtime\bin se habilitado, ou baixe de https://sqlite.org)
sqlite3.exe $db "PRAGMA integrity_check;"
# Deve retornar: ok
```

Resultado `ok` = banco íntegro. Qualquer outra coisa = restaurar do backup.

---

*ML Lopes Design · Marcio · mlopesdesign@gmail.com*
