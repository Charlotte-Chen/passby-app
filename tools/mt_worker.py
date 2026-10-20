"""argos-translate zh->en 離線翻譯。用法: python mt_worker.py jobs.jsonl shard nshards out.jsonl（可續跑）"""
import json,sys,os,argostranslate.translate as t
jobs,k,n,out=sys.argv[1],int(sys.argv[2]),int(sys.argv[3]),sys.argv[4]
done=set()
if os.path.exists(out):
  for l in open(out):
    try: x=json.loads(l);done.add((x[0],x[1]))
    except: pass
tr=t.get_translation_from_codes('zh','en')
with open(out,'a') as o:
  for i,l in enumerate(open(jobs)):
    if i%n!=k: continue
    pid,f,s=json.loads(l)
    if (pid,f) in done: continue
    try: e=tr.translate(s)
    except Exception as ex: continue
    o.write(json.dumps([pid,f,e],ensure_ascii=False)+'\n');o.flush()
