"""產生機器翻譯工作清單 raw/mt/jobs.jsonl（依優先順序）。翻譯截斷長度以控制時間。"""
import json
D='data/';jobs=[]
def L(f):
  d=json.load(open(D+f));df=d.get('defaults',{});return [{**df,**p} for p in d['places']]
for f in ['tw.json','tw-heritage-more.json','tw-museums.json']:
  for p in L(f):
    jobs.append((p['id'],'name',p['name']))
    for k,n in [('history',450),('features',220),('reason',160)]:
      if p.get(k): jobs.append((p['id'],k,p[k][:n]))
for p in L('tw-attractions.json'):
  jobs.append((p['id'],'name',p['name']))
  if p.get('history'): jobs.append((p['id'],'history',p['history'][:350]))
for p in L('tw-placenames.json'):
  jobs.append((p['id'],'history',p['history'][:160]))
with open('../raw/mt/jobs.jsonl','w') as o:
  for j in jobs: o.write(json.dumps(j,ensure_ascii=False)+'\n')
print(len(jobs),sum(len(j[2]) for j in jobs))
