#!/usr/bin/env python3
import urllib.request
TOKEN = 'deb77efe7c8a7bc5e4cf8ad041d02524e2387160ffabe26835c59bacb2e8b2aa'
req = urllib.request.Request('https://tools.mlopesdesign.com.br/wp-json/gestor/v1/', headers={'Authorization': 'Bearer ' + TOKEN})
with urllib.request.urlopen(req) as r:
    text = r.read().decode('utf-8')
    import re
    matches = re.findall(r'/gestor/v1/sync[^\s",]+', text)
    print('rotas /sync/ disponiveis:')
    for m in sorted(set(matches)):
        print('  ', m)
