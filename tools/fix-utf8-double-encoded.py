#!/usr/bin/env python3
"""
Conserta arquivos JS/HTML/CSS/JSON com double-encoded UTF-8.
Sintoma: strings como 'Sincronização' aparecem como 'SincronizaÃ§Ã£o' no disco.

Causa: o edit tool gravou UTF-8 bytes (0xC3 0xA7 = ç) que o PowerShell
ou alguma camada no meio interpretou como Latin-1, e depois gravou de novo
em UTF-8. Resultado: cada byte UTF-8 vira 2 bytes Latin-1-representados-em-UTF-8.

Fix: lê o arquivo como bytes, detecta padrões de double encoding,
decoda uma camada Latin-1 e regrava como UTF-8.
"""
import sys
import os
import re
from pathlib import Path

# Padrões de double-encoded UTF-8: bytes que em UTF-8 viraram 2 chars Latin-1
# ç em UTF-8 = 0xC3 0xA7, que vira "Ã§" em Latin-1, que em UTF-8 = 0xC3 0x83 0xC2 0xA7
# ã = 0xC3 0xA3 → "Ã£" = 0xC3 0x83 0xC2 0xA3
# í = 0xC3 0xAD → "Ã­" = 0xC3 0x83 0xC2 0xAD
# etc.
DOUBLE_ENCODED_CHARS = {
    'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú',
    'Ã ': 'à', 'Ã¨': 'è', 'Ã¬': 'ì', 'Ã²': 'ò', 'Ã¹': 'ù',
    'Ã£': 'ã', 'Ãµ': 'õ', 'Ã±': 'ñ',
    'Ã‚': 'Â', 'Ãƒ': 'Ã', 'Ã„': 'Ä', 'Ã‡': 'Ç',
    'Ã§': 'ç', 'ÃŠ': 'Ê', 'ÃŽ': 'Î', 'Ã"': 'Ô', 'Ã›': 'Û',
    'Â°': '°', 'Â§': '§', 'Âª': 'ª', 'Âº': 'º',
    'ÃƒÂ§': 'ç', 'ÃƒÂ£': 'ã', 'ÃƒÂ­': 'í', 'ÃƒÂ©': 'é',
    'ÃƒÂ¡': 'á', 'ÃƒÂ³': 'ó', 'ÃƒÂº': 'ú',
    'versÃ£o': 'versão', 'Ã©': 'é', 'Ã§Ã£o': 'ção',
    'cobaÃ§a': 'cobrança', 'CobranÃ§a': 'Cobrança',
    'configuraÃ§Ãµes': 'configurações', 'ConfiguraÃ§Ãµes': 'Configurações',
    'usuÃ¡rio': 'usuário', 'UsuÃ¡rio': 'Usuário',
    'requisiÃ§Ã£o': 'requisição', 'RequisiÃ§Ã£o': 'Requisição',
    'informaÃ§Ãµes': 'informações', 'InformaÃ§Ãµes': 'Informações',
    'ediÃ§Ã£o': 'edição', 'EdiÃ§Ã£o': 'Edição',
    'atualizaÃ§Ã£o': 'atualização', 'AtualizaÃ§Ã£o': 'Atualização',
    'sincronizaÃ§Ã£o': 'sincronização', 'SincronizaÃ§Ã£o': 'Sincronização',
    'navegaÃ§Ã£o': 'navegação', 'NavegaÃ§Ã£o': 'Navegação',
    'configuraÃ§Ã£o': 'configuração', 'ConfiguraÃ§Ã£o': 'Configuração',
    'funÃ§Ã£o': 'função', 'FunÃ§Ã£o': 'Função',
    'criaÃ§Ã£o': 'criação', 'CriaÃ§Ã£o': 'Criação',
    'iniciar sessÃ£o': 'iniciar sessão',
    'sessÃ£o': 'sessão', 'SessÃ£o': 'Sessão',
    'Ã¡rea': 'área', 'Ãrea': 'Área', 'Ãreas': 'Áreas',
    'cliente': 'cliente',  # placeholder
    'prÃ³ximo': 'próximo', 'PrÃ³ximo': 'Próximo',
    'pÃ¡gina': 'página', 'PÃ¡gina': 'Página',
    'histÃ³rico': 'histórico', 'HistÃ³rico': 'Histórico',
    'padrÃ£o': 'padrão', 'PadrÃ£o': 'Padrão',
    'mÃ­nimo': 'mínimo', 'MÃ­nimo': 'Mínimo',
    'mÃ¡ximo': 'máximo', 'MÃ¡ximo': 'Máximo',
    'nÃºmero': 'número', 'NÃºmero': 'Número',
    'dias_trabalho': 'dias_trabalho',  # placeholder
    'versao': 'versão',  # versao → versão se for em string visível
}

def fix_double_encoded(text: str) -> str:
    """Decodifica uma camada de double-encoding."""
    # Aplica substituicoes longas primeiro (frases inteiras)
    sorted_keys = sorted(DOUBLE_ENCODED_CHARS.keys(), key=len, reverse=True)
    result = text
    for bad in sorted_keys:
        if bad in result:
            result = result.replace(bad, DOUBLE_ENCODED_CHARS[bad])
    # Tambem tenta correcao generica: qualquer sequencia que parece
    # "Ã<letra>" onde <letra> eh uma letra acentuada
    import re
    # Padrao: Ã seguido de byte 0x80-0xBF em UTF-8
    # Na pratica, o "Ã" sozinho nao eh problema, mas "Ã©" sim (= é)
    # Vamos checar padroes individuais nao cobertos
    more = {
        r'Ã©': 'é', r'Ã¡': 'á', r'Ã­': 'í', r'Ã³': 'ó', r'Ãº': 'ú',
        r'Ã£': 'ã', r'Ãµ': 'õ', r'Ã±': 'ñ',
        r'Ã§': 'ç', r'Ã ': 'à', r'Ã¨': 'è', r'Ã¬': 'ì',
        r'Ã²': 'ò', r'Ã¹': 'ù',
        r'Ã‚': 'Â', r'Ãƒ': 'Ã', r'Ã„': 'Ä', r'Ã‡': 'Ç',
        r'ÃŠ': 'Ê', r'ÃŽ': 'Î', r'Ã"': 'Ô', r'Ã›': 'Û',
        r'Â°': '°', r'Â§': '§', r'Âª': 'ª', r'Âº': 'º',
    }
    for pat, repl in more.items():
        result = re.sub(pat, repl, result)
    return result

def process_file(filepath: Path, dry_run=False) -> tuple[int, int]:
    """Processa um arquivo. Retorna (num_substituicoes, total_chars_afetados)."""
    try:
        with open(filepath, 'rb') as f:
            raw = f.read()
    except Exception as e:
        print(f"  ERRO lendo {filepath}: {e}", file=sys.stderr)
        return 0, 0

    # Detecta BOM
    has_bom = raw[:3] == b'\xef\xbb\xbf'
    if has_bom:
        raw = raw[3:]

    try:
        text = raw.decode('utf-8')
    except UnicodeDecodeError:
        return 0, 0

    # Conta quantos padrões double-encoded existem
    count = 0
    for bad in DOUBLE_ENCODED_CHARS:
        count += text.count(bad)
    # Re-contar com regex
    import re
    generic = re.findall(r'Ã[\x80-\xbfÂ¡-¿§°©®]', text)
    count = max(count, len(generic))

    if count == 0:
        return 0, 0

    fixed = fix_double_encoded(text)

    if not dry_run:
        try:
            with open(filepath, 'wb') as f:
                if has_bom:
                    f.write(b'\xef\xbb\xbf')
                f.write(fixed.encode('utf-8'))
        except Exception as e:
            print(f"  ERRO escrevendo {filepath}: {e}", file=sys.stderr)
            return 0, 0

    return count, len(text)

def main():
    if len(sys.argv) < 2:
        print("Uso: fix-utf8-double-encoded.py <file_or_dir> [more...]")
        print("     --dry-run pra so mostrar sem alterar")
        sys.exit(1)

    dry_run = '--dry-run' in sys.argv
    args = [a for a in sys.argv[1:] if a != '--dry-run']

    total_files = 0
    total_subs = 0
    for arg in args:
        p = Path(arg)
        if p.is_file():
            files = [p]
        elif p.is_dir():
            files = list(p.rglob('*'))
            files = [f for f in files if f.is_file() and f.suffix.lower() in ('.js', '.html', '.css', '.json', '.md', '.txt', '.xml')]
        else:
            print(f"Nao encontrado: {arg}")
            continue

        for f in files:
            subs, total = process_file(f, dry_run=dry_run)
            if subs > 0:
                rel = str(f).replace('\\', '/')
                print(f"{'[DRY] ' if dry_run else ''}{rel}: {subs} substituicoes")
                total_files += 1
                total_subs += subs

    print(f"\n{'[DRY] ' if dry_run else ''}Total: {total_files} arquivo(s), {total_subs} substituicao(oes)")

if __name__ == '__main__':
    main()
