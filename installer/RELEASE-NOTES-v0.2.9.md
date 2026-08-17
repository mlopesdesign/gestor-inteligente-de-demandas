# v0.2.9 - 17/08/2026

## Correções

- **DevTools NÃO abre mais automaticamente** (`enableInspector: false` no `neutralino.config.json`)
- **Versão correta no header** (v0.2.9, não mais v0.1.0): meta tag `<meta name="app-version">` é a fonte da verdade
- **Tela Projetos funcional**: query SQL ajustada ao schema novo (`fim_em` em vez de `termino_previsto_em`)
- **Tela Clientes funcional**: query SQL ajustada ao schema novo (`contatos_json` em vez de colunas `email`/`telefone`/`arquivado_em`)
- **Tela Configurações sem emojis decorativos** (removidos 📋 💾 🚪 do HTML)
- **Ícone do .exe MLOPES DEV embutido no instalador** (via `rcedit-x64.exe`)
- **Loading screen com fundo preto e logo "mlopes dev"** (não mais lâmpada sozinha)
- **Login screen com fundo preto e logo vertical** (não mais radial azul vazando)

## Banco

- 4 clientes, 4 projetos, 12 tarefas seedados para teste
- Migração idempotente (ALTER TABLE ... IF NOT EXISTS)

## Instalação

- Baixe o `GestorInteligenteDeDemandas-Setup-0.2.9.exe` (5.6 MB)
- Executa como admin (clica direito > Executar como administrador)
- Substitui a instalação anterior sem perder dados
- Banco do cliente preservado
