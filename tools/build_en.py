"""英文版資料 data/en/<同名檔>.json = {id:{name, nameSrc}}
- 博物館：官方英文名 name_eng（文化部文化地圖）
- 地名：官方拼音 ChinesePhonetic（內政部地名資料）
- 其他：以 pypinyin 產生漢語拼音音譯（transliteration, nameSrc='pinyin'），不做語意翻譯。
內文不機器翻譯：試過 argos-translate 與 opus-mt-zh-en，離線模型品質太差且會產生錯誤事實，因此英文模式顯示中文原文並標示。
用法: /tmp/av/bin/python tools/build_en.py ../raw"""
import json,sys,os,csv,re
from pypinyin import lazy_pinyin
import jieba,logging;jieba.setLogLevel(logging.WARNING)
R=sys.argv[1];os.makedirs('data/en',exist_ok=True)
def py(s):
  parts=re.findall(r'[\u4e00-\u9fff]+|[^\u4e00-\u9fff]+',s);out=[]
  for p in parts:
    out.append(' '.join(''.join(lazy_pinyin(w)).capitalize() for w in jieba.cut(p)) if re.match(r'[\u4e00-\u9fff]',p) else p)
  return ' '.join(o.strip() for o in out if o.strip())
def L(f):
  d=json.load(open('data/'+f));df=d.get('defaults',{});return [{**df,**p} for p in d['places']]
emap={}
for t in 'HC':
  for x in json.load(open(f'{R}/emap{t}.json')):emap.setdefault(x['name'].strip(),(x.get('name_eng') or '').strip())
rom={};seen=set();i=0
for f in ['pn1','pn2','pn4']:
  for x in csv.DictReader(open(f'{R}/{f}.csv',encoding='utf-8-sig')):
    m=x['PlaceMean'].strip()
    try: lat=float(x['Latitude']);lng=float(x['Longitude'])
    except: continue
    if not m or not(21.5<lat<26.5 and 118<lng<122.5): continue
    k=(x['PlaceName'],round(lat,4),round(lng,4))
    if k in seen: continue
    seen.add(k);rom[f'tw-pn-{i}']=(x['ChinesePhonetic'] or x['CommonPhonetic']).strip();i+=1
st={}
for f in ['tw.json','tw-heritage-more.json','tw-museums.json','tw-attractions.json','tw-placenames.json']:
  out={};c={'official':0,'pinyin':0}
  for p in L(f):
    o=emap.get(p['name']) if f=='tw-museums.json' else rom.get(p['id']) if f=='tw-placenames.json' else None
    if o: out[p['id']]={'name':o,'nameSrc':'official'};c['official']+=1
    else: out[p['id']]={'name':py(p['name']),'nameSrc':'pinyin'};c['pinyin']+=1
  json.dump(out,open('data/en/'+f,'w'),ensure_ascii=False,separators=(',',':'));st[f]=c;print(f,c)
