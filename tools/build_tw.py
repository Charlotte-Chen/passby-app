"""Convert BOCH open data (raw/1.1,1.2,1.3 .json) -> data/tw.json"""
import json,sys,re
src=sys.argv[1] if len(sys.argv)>1 else 'raw'
cats={'1.1':'古蹟','1.2':'歷史建築','1.3':'聚落建築群'}
out=[];seen=set()
def clean(s): return re.sub(r'\s+\n','\n',(s or '').replace('\r','')).strip()
for c,label in cats.items():
  for x in json.load(open(f'{src}/{c}.json')):
    try: lat=float(x.get('latitude'));lng=float(x.get('longitude'))
    except: continue
    if not(21.5<lat<26.5 and 118<lng<122.5) or x['caseId'] in seen: continue
    seen.add(x['caseId'])
    a=(x.get('addresses') or [{}])[0]
    img=(x.get('representImage') or {}).get('transform',{}) if isinstance(x.get('representImage'),dict) else {}
    out.append({'id':'tw-'+x['caseId'],'country':'TW','region':a.get('cityName',''),'district':a.get('distName',''),
      'name':x['caseName'].strip(),'category':label,'level':x.get('assetsClassifyName') or label,
      'types':[t['name'] for t in x.get('assetsTypes') or []],'lat':round(lat,6),'lng':round(lng,6),
      'address':(a.get('cityName','')+a.get('distName','')+a.get('address','')).strip(),
      'history':clean(x.get('pastHistory'))[:1500],'features':clean(x.get('buildingFeatures'))[:600],
      'reason':clean(x.get('registerReason'))[:400],'openTime':clean(x.get('openUpTime')),
      'source':x.get('caseUrl','').replace('http://','https://')})
json.dump({'country':'TW','name':'臺灣','source':'文化部文化資產局 開放資料 (data.boch.gov.tw, 政府資料開放授權條款第1版)','places':out},open('data/tw.json','w'),ensure_ascii=False,separators=(',',':'))
print(len(out),{v:sum(p['category']==v for p in out) for v in cats.values()})
