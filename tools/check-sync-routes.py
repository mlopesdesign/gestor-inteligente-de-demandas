#!/usr/bin/env python3
import urllib.request
import urllib.error
TOKEN = 'deb77efe7c8a7bc5e4cf8ad041d02524e2387160ffabe26835c59bacb2e8b2aa'
body = b'{"dispositivo_id":"test","since":0}'
for path in ['/sync/pull', '/sync/push', '/sync/status']:
    url = 'https://tools.mlopesdesign.com.br/wp-json/gestor/v1' + path
    req = urllib.request.Request(url, data=body, method='POST', headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN})
    try:
        with urllib.request.urlopen(req) as r:
            print(path, '->', r.status, r.read().decode('utf-8', errors='replace')[:200])
    except urllib.error.HTTPError as e:
        print(path, '->', e.code, e.read().decode('utf-8', errors='replace')[:300])
