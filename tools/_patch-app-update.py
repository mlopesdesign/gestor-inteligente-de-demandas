#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Substitui a funcao aplicarAtualizacao no app.js"""
import sys

path = r'E:\Projetos\LOPES FOCUS\src\js\app.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Encontra o trecho problemático (a funcao aplicarAtualizacao) e substitui.
# Vamos encontrar o INÍCIO e o FIM da funcao e substituir o bloco inteiro.

start_marker = 'export async function aplicarAtualizacao(info) {'
end_marker = '// withTimeout local'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)
if start_idx < 0 or end_idx < 0:
    print('Marcadores não encontrados', file=sys.stderr)
    sys.exit(1)

nova_funcao = '''export async function aplicarAtualizacao(info) {
  if (!info || !info.resourcesURL) return false;
  try {
    // FIX v0.2.17: REESCRITO COMPLETAMENTE. O bug da v0.2.16 era o fallback
    // final que chamava Neutralino.os.open(info.resourcesURL) ou window.open()
    // — isso ABRE o navegador padrão (Edge) com a URL do .neu no GitHub,
    // redirecionando o user pra fora do app. NUNCA MAIS.
    // AGORA: usa SOMENTE Neutralino.os.execCommand com PowerShell pra baixar
    // o .neu via Invoke-WebRequest (nativo do Windows 10/11), validar tamanho,
    // e mover pra lugar do resources.neu atual. Em caso de falha, mostra erro
    // claro e pede download manual — SEM abrir navegador, SEM fallback externo.
    if (!window.Neutralino?.os?.execCommand) {
      toast({ tipo: 'erro', titulo: 'Atualização', corpo: 'Auto-update indisponível. Baixe manualmente em: ' + info.resourcesURL });
      return false;
    }
    const appPath = (window.__appData ? window.__appData + '\\\\GestorInteligenteDeDemandas' : null);
    if (!appPath) {
      toast({ tipo: 'erro', titulo: 'Atualização', corpo: 'Caminho do app não resolvido. Baixe manualmente em: ' + info.resourcesURL });
      return false;
    }
    toast({ tipo: 'info', titulo: 'Atualização', corpo: 'Baixando versão ' + info.version + '...' });
    const tmpPath = appPath + '\\\\resources.neu.tmp';
    const dstPath = appPath + '\\\\resources.neu';
    const oldPath = appPath + '\\\\resources.neu.old';
    const escUrl = info.resourcesURL.replace(/'/g, \"''\");
    const escTmp = tmpPath.replace(/'/g, \"''\");
    const escDst = dstPath.replace(/'/g, \"''\");
    const escOld = oldPath.replace(/'/g, \"''\");
    const psCmd = [
      \"$ErrorActionPreference='Stop'\",
      '[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12',
      'try {',
      \"  if (Test-Path '\" + escOld + \"') { Remove-Item -Force '\" + escOld + \"' }\",
      \"  Invoke-WebRequest -Uri '\" + escUrl + \"' -OutFile '\" + escTmp + \"' -UseBasicParsing\",
      \"  $sz = (Get-Item '\" + escTmp + \"').Length\",
      \"  if ($sz -lt 100000) { throw ('arquivo muito pequeno: ' + $sz + ' bytes') }\",
      \"  if (Test-Path '\" + escDst + \"') { Move-Item -Force '\" + escDst + \"' '\" + escOld + \"' }\",
      \"  Move-Item -Force '\" + escTmp + \"' '\" + escDst + \"'\",
      \"  Write-Output ('OK ' + $sz)\",
      '} catch {',
      \"  if (Test-Path '\" + escTmp + \"') { Remove-Item -Force '\" + escTmp + \"' -ErrorAction SilentlyContinue }\",
      '  Write-Error $_.Exception.Message',
      '  exit 1',
      '}',
    ].join('; ');
    const r = await window.Neutralino.os.execCommand('powershell -NoProfile -NonInteractive -Command \"' + psCmd.replace(/\"/g, '\\\\\"') + '\"');
    if (r.exitCode === 0) {
      toast({ tipo: 'sucesso', titulo: 'Atualização', corpo: 'v' + info.version + ' instalada! Reiniciando...' });
      setTimeout(() => window.Neutralino?.app?.exit?.(), 1500);
      return true;
    }
    throw new Error((r.stdErr || r.stdOut || 'PowerShell exit ' + r.exitCode).trim());
  } catch (e) {
    toast({ tipo: 'erro', titulo: 'Atualização', corpo: 'Falhou: ' + e.message + '. Baixe manualmente em: ' + info.resourcesURL });
    return false;
  }
}

'''

novo_conteudo = content[:start_idx] + nova_funcao + content[end_idx:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(novo_conteudo)

print('OK: aplicarAtualizacao substituída.')
print(f'Tamanho antes: {len(content)} bytes')
print(f'Tamanho depois: {len(novo_conteudo)} bytes')
