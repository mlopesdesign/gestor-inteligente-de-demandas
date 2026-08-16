# Gestor Inteligente de Demandas v0.2.3

**Bug critico: schema CHECK constraint travava criacao do banco.**

## Bug encontrado

A tabela `tarefas` tinha um CHECK constraint que referenciava a coluna
`motivo_cancelamento`, mas a coluna tinha sido renomeada pra
`cancelada_motivo` em versao anterior. Resultado: o `db.exec(schema.sql)`
falhava e o banco nunca era criado. O app rodava, abria a UI, mas toda
query SQL quebrava.

## Correcao

- `src/schema.sql`: o CHECK constraint foi atualizado para referenciar
  `cancelada_motivo` (nome da coluna atual)

## Ferramenta de instalacao automatica

- `tools/instalar-v0.2.2.ps1` (reaproveitado pra 0.2.3): auto-elevacao,
  copia .exe + resources.neu + icon.ico, recria atalhos com icone,
  abre o app, dropa banco antigo pra recriar com schema novo

## Tamanho
- Setup.exe: 1.9 MB
- resources.neu: 2.1 MB (dobrou de tamanho por causa dos icones novos)

## SHA256
Ver `sha256sums.txt`.
