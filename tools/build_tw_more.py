"""其他類別 -> data/tw-*.json
BOCH 1.4 紀念建築, 2.1 考古遺址, 3.1 文化景觀, 3.2 史蹟 (data.boch.gov.tw/opendata/v2/assetsCase/<code>.json)
文化部 文化地圖 emap typeId=H 博物館, C 地方文化館 (cloud.culture.tw ... exportEmapJson&typeId=H|C)
交通部觀光署 觀光資訊資料庫 景點 (data.gov.tw/dataset/7777, Attraction-json.zip)
用法: python3 tools/build_tw_more.py raw"""
import json,sys,re
R=sys.argv[1] if len(sys.argv)>1 else 'raw'
def clean(s): return re.sub(r'[ \t]*\r?\n[ \t]*','\n',str(s or '')).strip()
def ok(lat,lng):
  try: lat=float(lat);lng=float(lng)
  except: return None
  return (round(lat,6),round(lng,6)) if 21.5<lat<26.5 and 118<lng<122.5 else None
def dump(fn,name,src,places): json.dump({'country':'TW','name':name,'source':src,'places':places},open('data/'+fn,'w'),ensure_ascii=False,separators=(',',':'));print(fn,len(places))
out=[]
for code,cat in [('1.4','紀念建築'),('2.1','考古遺址'),('3.1','文化景觀'),('3.2','史蹟')]:
  for x in json.load(open(f'{R}/b{code}.json')):
    ll=ok(x.get('latitude'),x.get('longitude'))
    if not ll: continue
    a=(x.get('addresses') or [{}])[0];ri=x.get('representImage') if isinstance(x.get('representImage'),dict) else {}
    hist=clean(x.get('pastHistory') or x.get('briefDescribe') or x.get('content'))
    feat=clean(x.get('cultralMean') or x.get('specialValue') or x.get('feature'))
    out.append({'id':'tw-'+x['caseId'],'country':'TW','region':a.get('cityName',''),'district':a.get('distName',''),'name':x['caseName'].strip(),
      'category':cat,'level':x.get('assetsClassifyName') or cat,'types':[t['name'] for t in x.get('assetsTypes') or []],'lat':ll[0],'lng':ll[1],
      'address':(a.get('cityName','')+a.get('distName','')+a.get('address','')).strip(),'history':hist[:1500],'features':feat[:600],
      'featuresLabel':'文化意義與特色','reason':clean(x.get('registerReason'))[:400],'image':(ri.get('transform') or {}).get('c') or ri.get('original') or '',
      'source':(x.get('caseUrl') or '').replace('http://','https://')})
dump('tw-heritage-more.json','臺灣其他文化資產','文化部文化資產局開放資料（政府資料開放授權條款第1版）',out)
out=[]
for t,cat in [('H','博物館與文化館'),('C','博物館與文化館')]:
  for x in json.load(open(f'{R}/emap{t}.json')):
    ll=ok(x.get('latitude'),x.get('longitude'))
    if not ll: continue
    out.append({'id':f'tw-emap{t}-{len(out)}','country':'TW','region':x.get('cityName') or '','name':x['name'].strip(),'category':cat,
      'level':x.get('mainTypeName') or '','types':[x['type']] if x.get('type') else [],'lat':ll[0],'lng':ll[1],'address':x.get('address') or '',
      'history':clean(x.get('intro'))[:1500],'historyLabel':'簡介','image':x.get('representImage') or '','source':x.get('srcWebsite') or x.get('website') or ''})
dump('tw-museums.json','臺灣博物館與地方文化館','文化部 文化地圖開放資料（cloud.culture.tw，政府資料開放授權條款第1版）',out)
out=[]
for x in json.load(open(f'{R}/attr/AttractionList.json',encoding='utf-8-sig'))['Attractions']:
  ll=ok(x.get('PositionLat'),x.get('PositionLon'))
  if not ll: continue
  pa={k:(v or '') for k,v in (x.get('PostalAddress') or {}).items()};im=[i['URL'] for i in (x.get('Images') or []) if i.get('URL')]
  out.append({'id':'tw-'+x['AttractionID'],'region':pa.get('City',''),'district':pa.get('Town',''),'name':x['AttractionName'].strip(),'lat':ll[0],'lng':ll[1],
    'address':(pa.get('City','')+pa.get('Town','')+pa.get('StreetAddress','')).strip(),'history':clean(x.get('Description'))[:1200],
    'image':im[0] if im else '','source':x.get('WebsiteURL') or ''})
json.dump({'country':'TW','name':'臺灣觀光景點','source':'交通部觀光署 觀光資訊資料庫（政府資料開放授權條款第1版）','defaults':{'country':'TW','category':'觀光景點','level':'觀光景點','types':[],'historyLabel':'景點介紹'},'places':out},open('data/tw-attractions.json','w'),ensure_ascii=False,separators=(',',':'))
print('tw-attractions.json',len(out))
