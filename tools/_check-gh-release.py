import sys, json
d = json.load(sys.stdin)
print('tag:', d.get('tagName'))
print('titulo:', d.get('name'))
for a in d.get('assets', []):
    print(f"  - {a['name']:60s} {a['size']:>10} bytes  {a['browserDownloadUrl']}")
