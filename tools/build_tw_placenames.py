"""內政部地政司 臺灣地區地名資料 CSV -> data/tw-placenames.json
用法: python3 tools/build_tw_placenames.py raw/pn1.csv(行政區域類) raw/pn2.csv(自然地理實體類) raw/pn4.csv(聚落類)
只保留有地名由來(PlaceMean)與座標的資料。"""
import csv,json,sys
out=[];seen=set()
for f in sys.argv[1:]:
  for x in csv.DictReader(open(f,encoding='utf-8-sig')):
    m=x['PlaceMean'].strip()
    try: lat=float(x['Latitude']);lng=float(x['Longitude'])
    except: continue
    if not m or not(21.5<lat<26.5 and 118<lng<122.5): continue
    k=(x['PlaceName'],round(lat,4),round(lng,4))
    if k in seen: continue
    seen.add(k)
    out.append({'id':f'tw-pn-{len(out)}','name':x['PlaceName'].strip(),'types':[x['Type']]+([ '別名：'+x['AnotherName']] if x['AnotherName'].strip() else []),
      'lat':round(lat,5),'lng':round(lng,5),'address':x['County']+x['Town']+x['Village'],'history':m})
json.dump({'country':'TW','name':'臺灣地名','source':'內政部地政司 臺灣地區地名資料（政府資料開放授權條款第1版）','defaults':{'country':'TW','category':'地名','level':'地名由來','historyLabel':'地名由來'},'places':out},open('data/tw-placenames.json','w'),ensure_ascii=False,separators=(',',':'))
print(len(out))
