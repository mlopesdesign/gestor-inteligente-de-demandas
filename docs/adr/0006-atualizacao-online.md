# ADR 0006 — Atualização online: mesma forma do padrão ML Lopes §5

> **Vinculante.** Precedência #3.
> Decidido em 14/08/2026 (Fase 0).
> Confirmação do proprietário: "mesma forma de atualizar online" → reusar integralmente o ciclo definido no `PADRAO-ML-LOPES-DESIGN.md` §5.
> **Revisão 1 (mesmo dia):** stack migrada para Java. Conceito permanece; implementação Java usa `ProcessBuilder` para `curl.exe`.

---

## Status

Aceito — **revisão 1** mantém o ciclo do padrão §5; implementação passa a ser Java.

## Contexto

PROJETO §18 (inalterado):

- Verificação de versão; pacote assinado quando a infraestrutura permitir; validação de integridade; canal estável; rollback ou recuperação quando a atualização falhar; notas de versão.
- Artefatos por versão: instalador, código-fonte, notas, documentação, hashes SHA-256, relatório de testes, instruções de instalação e recuperação.

Padrão ML Lopes Design §5 ("Atualização online") já define o ciclo completo, testado e aprovado em produção no Salgueiro Gestão V2 desde 2025.

Em 14/08/2026 o proprietário reiterou: **"mesma forma de atualizar online"** — reusar o ciclo do padrão, sem reinventar.

## Decisão

Reutilizar **integralmente** o ciclo definido no `PADRAO-ML-LOPES-DESIGN.md` §5, sem mudanças de algoritmo. As únicas adaptações são a **identidade imutável** do Gestor Inteligente de Demandas (definida em `AGENTS.md` §1), a **identidade do repositório** (`ml-lopes/gestor-inteligente-de-demandas`), e a **stack Java** (artefatos são `gestor-X.Y.Z.msi` / `.exe` em vez de `resources.neu`).

### Ciclo (idêntico ao padrão)

```
1. Desenvolvimento          → bump de versão + build → .msi/.exe
2. GitHub Releases          → tag vX.Y.Z + assets anexados
3. App do cliente pergunta  → api.github.com/…/releases/latest
4. Compara versões          → só oferece se a de lá for MAIOR
5. Usuário clica            → BACKUP obrigatório antes de tudo
6. curl.exe baixa           → instalador em %TEMP%
7. valida SHA-256           → contra SHA256SUMS.txt
8. executa instalador (silent) → /S
9. relança o app
```

### Pontos vinculantes (herdados do padrão §5.2)

1. **Só oferece versão maior** (`>`). Trocar o asset de uma release já publicada **não atualiza ninguém** — se o build mudou, a versão sobe, inclusive em rebuild do mesmo dia.
2. **Backup antes de qualquer coisa.** Se o backup falhar, **aborta** a atualização.
3. **Gravar o banco antes de reiniciar.** Para o cliente Java: chamar `db.flush()` (commit final) antes de `ProcessBuilder.start(instalador)`. Para o servidor: garantir que o `DataSource` foi fechado com `db.close()` antes de matar o processo.
4. **`curl.exe` (nativo), não `fetch`/`HttpClient` do Java.** O instalador do jpackage não inclui `HttpClient` que funcione bem com binários grandes. `ProcessBuilder` para `C:\Windows\System32\curl.exe` resolve. O `ProcessBuilder` no Java herda o ambiente, captura stdout/stderr, e tem timeout configurável.
5. **Assinatura Authenticode:** fora do MVP. Documentado como gap.
6. **Notas da release no formato fixo do padrão §5.3** — tag, título, "o que mudou", "como atualizar", hash do asset.

### Identidade aplicada a este projeto

| Item | Valor |
|---|---|
| `applicationId` | `app.mllopes.gestor` |
| `binaryName` | `GestorInteligenteDeDemandas` |
| Pasta de dados | `%APPDATA%/GestorInteligenteDeDemandas/` |
| Repositório | `github.com/ml-lopes/gestor-inteligente-de-demandas` |
| Asset name (instalador EXE) | `gestor-X.Y.Z-setup.exe` |
| Asset name (instalador MSI) | `gestor-X.Y.Z.msi` |
| Asset name (zip portável) | `gestor-X.Y.Z-portable.zip` |
| Asset name (hashes) | `SHA256SUMS.txt` |
| URL de checagem | `https://api.github.com/repos/ml-lopes/gestor-inteligente-de-demandas/releases/latest` |

### Implementação Java

```java
public class Atualizador {
    private final Path dataDir;        // %APPDATA%/GestorInteligenteDeDemandas
    private final Path installerTmp;   // %TEMP%/gestor-update.exe
    private final Version atual;       // versão local

    public Optional<Release> checar() throws IOException, InterruptedException {
        // GET api.github.com/.../releases/latest via java.net.http.HttpClient (apenas JSON)
        Release latest = github.latest();
        return latest.version.compareTo(atual) > 0 ? Optional.of(latest) : Optional.empty();
    }

    public void atualizar(Release r) throws Exception {
        // 1. Backup
        backupService.salvarAgora();    // aborta se falhar
        // 2. Download
        downloader.baixar(r, installerTmp);
        // 3. Validar SHA-256
        if (!validador.validar(r, installerTmp)) throw new UpdateException("SHA inválido");
        // 4. Flush DB
        db.flush();
        // 5. Executar instalador silent
        ProcessBuilder pb = new ProcessBuilder(installerTmp.toString(), "/S");
        pb.inheritIO().start();
        // 6. Sair (instalador vai matar o processo)
        Platform.exit();
    }
}
```

### Validação de integridade

1. `curl.exe` baixa `SHA256SUMS.txt` da release.
2. Para cada asset baixado, calcular SHA-256 localmente em Java (`MessageDigest.getInstance("SHA-256")`) e comparar.
3. Se **qualquer** divergência, abortar a atualização, mostrar alerta na UI, registrar em `auditoria`.

### Texto da release (template, conforme padrão §5.3)

```
Tag:    vX.Y.Z
Título: vX.Y.Z — descrição curta

## O que mudou
- item 1
- item 2

## Como atualizar
1. Aguarde a notificação automática dentro do app, ou baixe o instalador abaixo.
2. O instalador cuida do backup, da substituição e do relançamento.

## Arquivos
- gestor-X.Y.Z-setup.exe — SHA256: <hash>
- gestor-X.Y.Z.msi — SHA256: <hash>
- gestor-X.Y.Z-portable.zip — SHA256: <hash>
```

### Rollback / recuperação

- Se o instalador falhar no meio: o `%APPDATA%` (dados) **nunca** é tocado pelo instalador. Restauração é reinstalar a versão anterior por cima.
- Se a nova versão travar no boot: o usuário faz downgrade manual instalando a última versão conhecida como "Latest".
- Backups automáticos do banco central (Fase 5) cobrem perda de dados no servidor.

### Ferramentas

- `tools/bump-version.mjs` — bump sincronizado em **6 lugares**:
  - `desktop/pom.xml` (`<version>`)
  - `server/pom.xml` (`<version>`)
  - `installer/recursos/version.txt`
  - `desktop/src/main/java/.../App.java` (`APP_VERSION` constante)
  - `desktop/src/main/resources/app.properties` (`version=...`)
  - `docs/HISTORICO-VERSOES.md` (entrada nova)
- `tools/pack-release.mjs` — orquestra: bump, build desktop (Maven), build server (Maven), build web (copy), build instalador (`jpackage` + WiX), cálculo de SHA-256, escrita do `SHA256SUMS.txt`, publicação via `gh release create`.
- `tools/check-release.mjs` — sanity pré-publicação: confirma que os 6 lugares da versão batem, e que `SHA256SUMS.txt` confere com os arquivos em `release/`.

## Consequências

### Positivas

- Mesma forma que o Salgueiro V2 (em produção desde 07/2025) — operação conhecida.
- Pontos críticos já pagos (backup, gravação antes de restart, curl, comparação de versão).
- Bump automatizado em 6 lugares.

### Negativas

- Sem assinatura Authenticode no MVP: Windows SmartScreen pode alertar no primeiro launch. Mitigação: documentar no manual que o usuário clica em "Mais informações → Executar mesmo assim".
- `jpackage` exige WiX 3.11 no PATH durante o build. Portável em `tools/wix/`.
- Bump em 6 lugares sincronizados exige disciplina — `tools/bump-version.mjs` é o ponto único. Bloqueio no CI se houver divergência.

### Neutras

- Manteremos o `gh release create` para publicação.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Auto-update nativo Java (java.util.spi, jpackage auto) | Não suporta backup, não suporta SHA-256, não suporta rollback completo. Reimplementaríamos o que já está pronto. |
| Electron auto-updater | Proibido pelo padrão. |
| Microsoft Store (MSIX) | Custo de registro + processo de certificação. Fora do MVP. |
| Publicação manual via interface web | Possível, mas `pack-release.mjs` é mais auditável. |
| Assinatura EV Code Signing agora | Custo elevado + responsabilidade de manter segredo. Postergar. |
| Winget/Chocolatey como canal | Adiar; release direto no GitHub é o canal oficial. |

## Links

- `PROJETO-GESTOR-INTELIGENTE-DE-DEMANDAS.md` §18
- `PADRAO-ML-LOPES-DESIGN.md` §5 (ciclo, pontos vinculantes, formato de release, identidade imutável)
- `AGENTS.md` §1 (identidade imutável)
- `AGENTS.md` §3.1 (versões pinned)
- ADR 0001 (stack — Java)
- ADR 0003 (banco — gravação atômica)
