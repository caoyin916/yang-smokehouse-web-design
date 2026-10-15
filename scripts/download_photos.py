"""Download every dish photo listed in .work/menu-raw.json into .work/raw/<id>.img.
Usage: python -I scripts/download_photos.py .work/menu-raw.json .work/raw"""
import json, urllib.request, concurrent.futures, os, sys
ms = json.load(open(sys.argv[1], encoding='utf-8'))
out = sys.argv[2]
def get(m):
    p = os.path.join(out, m['id'] + '.img')
    if os.path.exists(p) and os.path.getsize(p) > 1000: return m['id'], 'cached'
    req = urllib.request.Request(m['img'], headers={'User-Agent': 'Mozilla/5.0'})
    data = urllib.request.urlopen(req, timeout=60).read()
    open(p, 'wb').write(data)
    return m['id'], len(data)
with concurrent.futures.ThreadPoolExecutor(8) as ex:
    for r in ex.map(get, [m for m in ms if m['img']]): pass
print(len(os.listdir(out)), 'files')
