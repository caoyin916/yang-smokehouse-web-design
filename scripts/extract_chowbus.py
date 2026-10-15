"""Parse the Chowbus store payload (see README) into .work/menu-raw.json.
Usage: python -I -X utf8 scripts/extract_chowbus.py .work/rsc-decoded.txt .work/menu-raw.json"""
import json, re, sys
s = open(sys.argv[1], encoding='utf-8').read()
rows = {}
for m in re.finditer(r'(?m)^([0-9a-f]+):(.*)$', s):
    v = m.group(2)
    if v[:1] in '{[':
        try: rows[m.group(1)] = json.loads(v)
        except Exception: pass
def res(v):
    return rows.get(v[1:]) if isinstance(v, str) and v.startswith('$') else v
meals = {}
def walk(o, menu=None):
    if isinstance(o, dict):
        mn = res(o.get('menu')) if 'menu' in o else None
        if isinstance(mn, dict) and 'name' in mn: menu = mn
        if 'meal_prototype_id' in o and 'price' in o:
            mname = menu['name'] if menu else '?'
            rec = meals.setdefault(o['id'], {'id': o['id'], 'name': o.get('name'), 'cn': o.get('foreign_name'),
                'price': o.get('price'), 'desc': o.get('description') or '', 'cndesc': o.get('foreign_description') or '',
                'img': o.get('image_url'), 'customize': o.get('can_customize'), 'menus': [], 'seq': o.get('sequence_num')})
            if mname not in rec['menus']: rec['menus'].append(mname)
            if not rec['img'] and o.get('image_url'): rec['img'] = o['image_url']
        for v in o.values(): walk(v, menu)
    elif isinstance(o, list):
        for v in o: walk(v, menu)
for v in rows.values(): walk(v)
from collections import defaultdict
g = defaultdict(list)
for m in meals.values():
    for mn in m['menus']: g[mn].append(m)
for k, v in g.items():
    print(f'== {k} ({len(v)}, img {sum(1 for x in v if x["img"])})')
    for x in sorted(v, key=lambda x: x['seq'] or 0)[:60]:
        print(f'   {"*" if x["img"] else " "} {x["name"]} | {x["cn"]} | ${x["price"]} | {x["desc"][:70]}')
json.dump(list(meals.values()), open(sys.argv[2],'w',encoding='utf-8'), ensure_ascii=False, indent=1)
