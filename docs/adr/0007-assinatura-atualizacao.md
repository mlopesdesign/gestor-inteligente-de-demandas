# ADR 0007 — Política de assinatura digital da atualização

> **Vinculante.** Precedência #3.
> Decidido em 14/08/2026 (Fase 1) a partir de exigência do proprietário registrada em `PROJETO-GESTOR-INTELIGENTE-DE-DEMANDAS.md` §18.2 e na autorização da Fase 1.
> Substitui a frase "Sem assinatura no MVP" do ADR 0006 §"Identidade aplicada a este projeto".

---

## Status

Aceito.

## Contexto

PROJETO §18.2: "pacote assinado quando a infraestrutura permitir". Em 14/08/2026, na autorização da Fase 1, o proprietário reiterou: **"Atualização assinada, validação por hash, rollback e recuperação"** — a frase "quando a infraestrutura permitir" foi removida de fato pela decisão.

A decisão anterior (ADR 0006) dizia "Sem assinatura no MVP". Esta ADR substitui aquela decisão.

Há um conflito aparente entre:
- A exigência de **atualização assinada** (PROJETO §18.2 e autorização da Fase 1).
- O **custo elevado** de um certificado Authenticode EV (Extended Validation) emitido por Autoridades Certificadoras públicas (US$ 200-700/ano, exige hardware token, validação empresarial).
- A **alternativa prática** de certificado autoassinado, que continua disparando o SmartScreen do Windows no primeiro launch.

## Decisão

### Política em camadas (defense in depth)

A integridade e autenticidade da atualização é garantida por **quatro camadas independentes**. Cada uma cobre um vetor diferente de ataque; nenhuma sozinha é suficiente.

| Camada | Mecanismo | O que cobre |
|---|---|---|
| 1. **Transporte HTTPS** | GitHub Releases em HTTPS (aplicado pela Microsoft) | Eavesdropping, MITM durante download |
| 2. **Hash SHA-256 publicado** | `SHA256SUMS.txt` assinado pelo mantenedor (commit assinado no Git) e comparado localmente | Substituição de arquivo por adversary com acesso ao GitHub |
| 3. **Assinatura Authenticode no binário** | `jpackage` chama `signtool.exe` (Windows SDK) durante o build | Substituição de binário por adversary que comprometeu canal de distribuição |
| 4. **Política de comparação estrita** | App **só** aceita versão **maior** (`>`) | Downgrade attack (instalar versão antiga com bug conhecido) |

### Authenticode — estratégia

#### Curto prazo (MVP — F2 até F5)

- **Certificado autoassinado** gerado no ambiente de build com `makecert.exe` (Windows SDK) ou `New-SelfSignedCertificate` (PowerShell).
- Assinatura aplicada via `signtool.exe sign /fd SHA256 /a <instalador>`.
- **Trade-off conhecido**: Windows SmartScreen vai exibir "Editor desconhecido" no primeiro launch. Documentado no `MANUAL-INSTALACAO.md` como passo "Mais informações → Executar mesmo assim".
- A camada 2 (SHA-256 publicado) **não** depende do certificado para funcionar. Mesmo sem validação Authenticode válida, a integridade do hash garante que o arquivo baixado é o publicado.
- A camada 1 (HTTPS) é fornecida pelo GitHub.
- A camada 4 (versão maior) é garantida pelo updater Java.

#### Médio prazo (F6, pré-produção)

- **Certificado Authenticode OV (Organization Validation)** emitido por AC pública (DigiCert, Sectigo, GlobalSign). Custo anual US$ 100-300.
- Aplicado ao instalador gerado por `jpackage` no CI.
- SmartScreen ainda alerta nas primeiras instalações, mas com reputação crescente some.
- Renovação anual automatizada via `signtool` + variável de ambiente com senha do token.

#### Longo prazo (F7+)

- **Certificado Authenticode EV (Extended Validation)** quando o produto for distribuído em escala ou tiver receita. Custo anual US$ 300-700. **Exige hardware token (USB ou HSM)**. Validação empresarial pela AC.
- **Resultado**: SmartScreen não alerta desde a primeira instalação (reputação imediata por hardware-backed EV).
- Justificável apenas se o produto for comercializado ou instalado em muitas máquinas de terceiros.

### Renovação e revogação

- Certificado armazenado em **arquivo PFX criptografado** no repositório privado (não no Git público) ou em **secret do GitHub Actions**.
- Senha do PFX em **GitHub Actions Secret**.
- Build de release só roda em **GitHub Actions** (não localmente) para reduzir superfície de ataque.
- Revogação: se certificado for comprometido, emitir novo, atualizar Actions Secret, republicar todas as releases. **O SHA-256 antigo ainda vale** para o histórico (mas a validação do binário fica dependente do certificado).

### Validação de hash

Independente da assinatura Authenticode, a validação de SHA-256 é **obrigatória** e roda em Java:

```java
public class HashValidador {
    public static boolean validar(Path arquivo, String sha256Esperado) throws IOException, NoSuchAlgorithmException {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        try (InputStream in = Files.newInputStream(arquivo)) {
            byte[] buf = new byte[8192];
            int r;
            while ((r = in.read(buf)) > 0) md.update(buf, 0, r);
        }
        String sha256Calculado = HexFormat.of().formatHex(md.digest());
        return sha256Calculado.equalsIgnoreCase(sha256Esperado);
    }
}
```

A comparação é **constant-time** indiretamente (o hash é fixo, comparação de 64 caracteres). O resultado é gravado em `auditoria`.

### Rollback e recuperação (reforço do ADR 0006)

- **Backup antes da atualização** (PADRÃO §5.2 vinculante): o updater **aborta** se `BackupService.salvarAgora()` falhar.
- **Banco SQLite** nunca é tocado pelo instalador (jpackage). Apenas o diretório `app/` é substituído.
- **Se a nova versão travar no boot**: o usuário faz downgrade manual instalando a última versão "Latest" do GitHub Releases. jpackage registra versão no uninstaller, permite reinstalar versão superior ou igual.
- **Se o instalador falhar no meio** (queda de energia, processo morto): o instalador do jpackage suporta **instalação reparadora** (`gestor-X.Y.Z-setup.exe /repair` ou reinstalação por cima).
- **Backup do banco central** (servidor) é independente: snapshot diário + SHA-256 + cópia fora da VPS. Cobertura de RPO = 24h, RTO < 1h (testado em `tools/test-restore.mjs`).
- **Versionamento semver em 6 lugares** sincronizado por `tools/bump-version.mjs` impede que "trocar o binário sem bump" aconteça (PADRÃO §6 vinculante).

### Texto da release — atualização do template

O template do `SHA256SUMS.txt` agora inclui também a assinatura:

```
# gestor-X.Y.Z-release-info.txt
Versão: X.Y.Z
Data: 2026-08-14T19:00:00Z
Commit: <sha do git>
Assinado por: <CN do certificado>

Assets:
gestor-X.Y.Z-setup.exe    SHA256: <hash>   Tamanho: <bytes>
gestor-X.Y.Z.msi          SHA256: <hash>   Tamanho: <bytes>
gestor-X.Y.Z-portable.zip SHA256: <hash>   Tamanho: <bytes>
```

## Consequências

### Positivas

- **Quatro camadas independentes** de proteção. Adversary precisa comprometer múltiplas para forjar atualização.
- **Certificado autoassinado no MVP** é gratuito e protege contra adulteração de binário (camada 3) sem custo de aquisição.
- **Hash SHA-256** é o chão mínimo não-negociável (camada 2).
- **Política de versão maior** (camada 4) é robusta e já implementada.
- **Rollback documentado** e testável.
- Caminho de upgrade claro: autoassinado → OV → EV conforme amadurece o produto.

### Negativas

- **SmartScreen no MVP**: usuário verá alerta "Editor desconhecido" no primeiro launch. Mitigação: documentação clara com 1-clique para "Executar mesmo assim".
- **Certificado EV** exige hardware token — adiciona dependência operacional e custo recorrente. Postergável.
- **Renovação anual** do certificado OV/EV: precisa ser automatizada ou morrer no esquecimento.
- **Build passa a depender do CI** (não pode ser local sem o PFX), o que amarra o proprietário a manter o Actions Secret.

### Neutras

- O certificado é propriedade do **proprietário do produto** (Marcio), não do CI. Documentado.
- A escolha entre OV e EV é decisão de F6+, registrada em ADR quando aplicável.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Sem assinatura, só SHA-256 | Insuficiente — adversary que compromete canal pode trocar binário e hash simultaneamente. |
| Apenas EV desde o MVP | Custo anual + hardware token + validação empresarial. Excessivo para uso pessoal. |
| Distribuição via Microsoft Store | Processo de certificação, regras de conteúdo, comissão de 15-30%. Quebra a forma de atualização padrão §5. |
| Assinatura via OpenPGP/GPG em vez de Authenticode | Authenticode é o que o Windows reconhece para "Editor Confiável". GPG não tem integração nativa com SmartScreen. |
| Assinatura na hora do download (não no build) | Aumenta superfície de ataque; impede validação offline. |
| Hash SHA-3 em vez de SHA-256 | Não há ganho prático; SHA-256 é padrão da indústria. |
| Winget | Adiar; release direto no GitHub é o canal oficial. |
| Auto-update via Windows Update (WU) | Acopla ao Windows; tira autonomia do proprietário sobre a release. |

## Links

- `PROJETO-GESTOR-INTELIGENTE-DE-DEMANDAS.md` §18.2
- `PADRAO-ML-LOPES-DESIGN.md` §5 (ciclo de atualização)
- `PADRAO-ML-LOPES-DESIGN.md` §5.2 (backup antes, gravar antes de restart, curl nativo)
- ADR 0001 (stack — Java + jpackage)
- ADR 0006 (atualização online — faseado, agora com assinatura obrigatória via esta ADR)
