# Gestor Inteligente de Demandas v0.2.4

**Logo "mlopes dev" em tudo.**

## O que mudou

### Logo mlopes dev (lâmpada azul)
- Icone do app (janela, instalador, atalho Menu Iniciar, atalho Desktop, "Adicionar/Remover Programas", bandeja do sistema) agora usa a logo mlopes dev
- Tela de login mostra a logo horizontal grande (280px)
- Topbar de TODAS as telas tem o icone mlopes dev + nome "Gestor" + versao
- Tela de loading do app mostra a logo enquanto carrega

### Refator
- Componente compartilhado `src/js/telas/_chrome.js` extrai a `topbar()` e `menuLateral()` (eram duplicadas em 9 telas)
- CSS: estilo `.brand-logo` adicionado

### Cores
- Cor amarela/laranja do tema mantida (#F0A000)
- Logo azul complementar (nao altera o tema)

## Tamanho
- Setup.exe: 1.8 MB
- resources.neu: 1.6 MB

## SHA256
Ver `sha256sums.txt`.
