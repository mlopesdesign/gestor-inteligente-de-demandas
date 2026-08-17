import re
f = 'src/js/telas/hoje.js'
with open(f, 'rb') as fp:
    s = fp.read().decode('utf-8')
old = "document.getElementById('versao-app').textContent = 'v' + (window.NEUTRALINO_GLOBALS?.neutralinoConfig?.version || '0.2.8');"
new = "document.getElementById('versao-app').textContent = 'v' + (document.querySelector('meta[name=\"app-version\"]')?.content || window.__appVersion || '0.2.9');"
if old in s:
    s = s.replace(old, new)
    with open(f, 'wb') as fp:
        fp.write(s.encode('utf-8'))
    print('hoje.js: updated')
else:
    print('hoje.js: OLD STRING NOT FOUND')
    m = re.search(r"document\.getElementById\('versao-app'\).*?;", s)
    if m:
        print('FOUND:', repr(m.group(0)))
