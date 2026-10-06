"""A fake /api built from supabase/seed.sql, so the shop can be tested in a browser without Supabase or Paystack."""
import json, re, pathlib, time

SEED = (pathlib.Path(__file__).parent.parent / 'supabase' / 'seed.sql').read_text()

def tokens(tup):
    out, i = [], 0
    while i < len(tup):
        c = tup[i]
        if c in ' ,\n':
            i += 1; continue
        if c == "'":
            j, buf = i + 1, ''
            while True:
                if tup[j] == "'" and j + 1 < len(tup) and tup[j + 1] == "'":
                    buf += "'"; j += 2; continue
                if tup[j] == "'":
                    break
                buf += tup[j]; j += 1
            i = j + 1
            if tup.startswith('::jsonb', i):
                buf = json.loads(buf); i += 7
            out.append(buf); continue
        m = re.match(r"[^,]+", tup[i:])
        raw = m.group(0).strip(); i += len(m.group(0))
        out.append(None if raw == 'null' else True if raw == 'true' else False if raw == 'false' else
                   (int(raw) if re.fullmatch(r'-?\d+', raw) else raw))
    return out

def rows(table):
    m = re.search(rf"insert into {table} \(([^)]*)\) values\n(.*?)\n(?:on conflict[^\n]*)?;", SEED, re.S)
    cols = [c.strip() for c in m.group(1).split(',')]
    res = []
    for line in m.group(2).split('\n'):
        line = line.strip().rstrip(',')
        if line.startswith('(') and line.endswith(')'):
            res.append(dict(zip(cols, tokens(line[1:-1]))))
    return res

def catalog():
    prods = rows('products')
    for p in prods:
        p.update(hidden=False, rating={'n': 3, 'avg': 4.7} if p['id'] == 'milo' else None)
    sets = {r['key']: r['value'] for r in rows('settings')}
    promos = rows('promos')
    for p in promos:
        p['ends_at'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time() + 7 * 86400))
        p['img'] = None
    return {'products': prods, 'zones': rows('zones'), 'fees': sets['fees'], 'layout': sets['layout'], 'tiles': sets['tiles'],
            'aisles': sets['aisles'], 'store': sets['store'], 'promos': promos, 'now': int(time.time() * 1000)}

if __name__ == '__main__':
    c = catalog()
    print(len(c['products']), 'products', len(c['zones']), 'zones', len(c['promos']), 'promos')
