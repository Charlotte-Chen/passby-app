const CITIES={'臺北市':[25.0375,121.5637],'新北市':[25.0120,121.4657],'基隆市':[25.1276,121.7392],'桃園市':[24.9936,121.3010],'新竹市':[24.8138,120.9675],'新竹縣':[24.8387,121.0177],'苗栗縣':[24.5602,120.8214],'臺中市':[24.1477,120.6736],'彰化縣':[24.0518,120.5161],'南投縣':[23.9609,120.9719],'雲林縣':[23.7092,120.4313],'嘉義市':[23.4801,120.4491],'嘉義縣':[23.4518,120.2555],'臺南市':[22.9999,120.2270],'高雄市':[22.6273,120.3014],'屏東縣':[22.5519,120.5487],'宜蘭縣':[24.7021,121.7378],'花蓮縣':[23.9872,121.6016],'臺東縣':[22.7583,121.1444],'澎湖縣':[23.5711,119.5793],'金門縣':[24.4321,118.3171],'連江縣':[26.1605,119.9517]};
const LANG=(typeof localStorage!=='undefined'&&localStorage.getItem('lang'))||'zh',EN_ON=LANG==='en';
const CITY_EN={'臺北市':'Taipei','新北市':'New Taipei','基隆市':'Keelung','桃園市':'Taoyuan','新竹市':'Hsinchu City','新竹縣':'Hsinchu County','苗栗縣':'Miaoli','臺中市':'Taichung','彰化縣':'Changhua','南投縣':'Nantou','雲林縣':'Yunlin','嘉義市':'Chiayi City','嘉義縣':'Chiayi County','臺南市':'Tainan','高雄市':'Kaohsiung','屏東縣':'Pingtung','宜蘭縣':'Yilan','花蓮縣':'Hualien','臺東縣':'Taitung','澎湖縣':'Penghu','金門縣':'Kinmen','連江縣':'Lienchiang (Matsu)'};
const CAT_EN={'古蹟':'Monument','歷史建築':'Historic building','紀念建築':'Memorial building','聚落建築群':'Historic settlement','考古遺址':'Archaeological site','文化景觀':'Cultural landscape','史蹟':'Historic site','博物館與文化館':'Museum & culture hall','觀光景點':'Attraction','地名':'Place name'};
const I18N={zh:{you:'你',mapPick:'地圖選點',nearest:(l,n)=>`離${l}最近的 ${n} 處`,loading:'（資料載入中…）',count:n=>`地圖上共 ${n} 處地點（放大可展開）`,near:'看這裡附近',
  hist:'歷史沿革',feat:'建築特色',reason:'指定／登錄理由',open:'開放時間',more:'展開更多 ▾',less:'收合 ▴',src:'原始資料',nav:'導航前往',play:'▶ 播放語音',pause:'⏸ 暫停',resume:'▶ 繼續',stop:'■ 停止',
  noTTS:'此瀏覽器不支援語音朗讀',noGeo:'無法定位，請選擇城市或點地圖',locating:'正在取得你的位置…',denied:'未取得定位權限，請選擇城市或點地圖',m:'公尺',km:'公里'},
 en:{you:'you',mapPick:'the selected point',nearest:(l,n)=>`${n} places nearest ${l}`,loading:' (loading data…)',count:n=>`${n} places on the map (zoom in to expand)`,near:'Show nearby',
  hist:'History',feat:'Features',reason:'Reason for designation',open:'Opening hours',more:'More ▾',less:'Less ▴',src:'Source record',nav:'Directions',play:'▶ Listen (Chinese)',pause:'⏸ Pause',resume:'▶ Resume',stop:'■ Stop',
  noTTS:'Speech is not supported in this browser',noGeo:'Location unavailable. Pick a city or tap the map.',locating:'Finding your location…',denied:'Location permission denied. Pick a city or tap the map.',m:'m',km:'km'}};
const TX=I18N[EN_ON?'en':'zh'];const EN={};
const LBL_EN={'歷史沿革':'History','地名由來':'Origin of the name','景點介紹':'About','簡介':'About','文化意義與特色':'Significance & features','建築特色':'Features'};
// 依語言取卡片顯示內容。英文模式：名稱用官方英文或拼音音譯；內文沒有可靠英文翻譯，顯示中文原文並標示
function V(p){const z={name:p.name,sub:'',level:p.level,types:p.types||[],history:p.history,features:p.features,reason:p.reason,hl:p.historyLabel||'歷史沿革',fl:p.featuresLabel||'建築特色',zh:true};
  if(!EN_ON)return z;const e=EN[p.id]||{};
  return{...z,name:e.name||p.name,sub:p.name,nameSrc:e.nameSrc,level:CAT_EN[p.category]||p.category,types:[],hl:LBL_EN[p.historyLabel]||TX.hist,fl:LBL_EN[p.featuresLabel]||TX.feat}}
// 朗讀一律念中文原文（目前沒有可靠英文內文）
const SPEAK_EN=false;
const N=10;let places=[],map,meMarker,layer;
// 距離（公尺），haversine，全部在裝置上計算
function dist(a,b,c,d){const R=6371e3,r=Math.PI/180,x=(c-a)*r,y=(d-b)*r,h=Math.sin(x/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
const PRI=p=>p.category==='觀光景點'?2:p.category==='地名'?3:1;
function nearest(lat,lng,n=N,list=places){const s=list.map(p=>({...p,d:dist(lat,lng,p.lat,p.lng)})).sort((a,b)=>a.d-b.d).slice(0,n*6);const out=[];
  for(const p of s){const j=out.findIndex(q=>q.name===p.name&&dist(q.lat,q.lng,p.lat,p.lng)<500);if(j<0)out.push(p);else if(PRI(p)<PRI(out[j]))out[j]={...p,d:out[j].d}}
  return out.slice(0,n)}
// 逐檔載入：每到一檔就併入地圖與附近清單（大檔不阻塞畫面）
let lastPos=null,rebuildT;
async function loadData(){const idx=await (await fetch('data/index.json')).json();
  const files=idx.countries.flatMap(c=>c.files||[c.file]);
  await Promise.all(files.map(f=>(EN_ON?fetch(f.replace('data/','data/en/')).then(r=>r.json()).then(x=>Object.assign(EN,x)).catch(()=>{}):Promise.resolve()).then(()=>fetch(f)).then(r=>r.json()).then(x=>{places=places.concat(x.places.map(p=>x.defaults?{...x.defaults,...p}:p));
    clearTimeout(rebuildT);rebuildT=setTimeout(()=>{buildCluster();if(lastPos)render(...lastPos,true)},300)}).catch(e=>console.warn(f,e))));return places}
const esc=s=>(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=m=>m<1000?Math.round(m)+' '+TX.m:(m/1000).toFixed(1)+' '+TX.km;
function textOf(p){return [p.name+'。',p.history&&((p.historyLabel||'歷史沿革')+'。'+p.history),p.features&&((p.featuresLabel||'建築特色')+'。'+p.features),p.reason&&('指定理由。'+p.reason)].filter(Boolean).join('\n')}
// 語音朗讀（Web Speech API，zh-TW）
// ===== 語音朗讀（僅用免費 Web Speech API）=====
const SS=typeof window!=='undefined'?window.speechSynthesis:null;
const PREF={};
let voices=[],speakingId=null,cur=null; // cur={p,btn,card,chunks,i,paused}
function scoreVoice(v){let s=0;const l=v.lang.replace('_','-').toLowerCase(),n=v.name;
  if(SPEAK_EN){if(l==='en-us')s+=100;else if(l==='en-gb')s+=90;else if(l.startsWith('en'))s+=60;else return -1}else if(l==='zh-tw'||/taiwan|臺灣|台灣/i.test(n))s+=100;else if(l==='zh-hk'||l==='yue-hk')s+=60;else if(l==='zh-cn'||l.startsWith('cmn'))s+=50;else if(l.startsWith('zh'))s+=40;else return -1;
  if(/enhanced|premium|高品質|增強|natural|neural|online/i.test(n))s+=30;if(/google|microsoft/i.test(n))s+=15;if(/samantha|daniel|karen|aria|jenny|guy|libby|mei-?jia|hsiaochen|hsiaoyu|yating|zhiwei/i.test(n))s+=10;if(v.localService)s+=2;return s}
function loadVoices(){if(!SS)return;voices=SS.getVoices().filter(v=>scoreVoice(v)>=0).sort((a,b)=>scoreVoice(b)-scoreVoice(a));fillVoiceSelect()}
function pickVoice(){return voices.find(v=>v.voiceURI===PREF.voice)||voices[0]||null}
// 朗讀前清理文字
function cleanForSpeech(t){return t.replace(/https?:\/\/\S+/g,'').replace(/[（(]\s*[)）]/g,'').replace(/[「」『』【】〈〉《》"“”]/g,'')
  .replace(/(\d{3,4})\s*[-–~～]\s*(\d{3,4})\s*年/g,'$1年到$2年').replace(/(\d+)\s*%/g,'百分之$1').replace(/(\d)\s*m\b/g,'$1公尺').replace(/(\d)\s*km\b/gi,'$1公里')
  .replace(/[ \t]+/g,' ').replace(/\n{2,}/g,'\n').trim()}
// 依句讀切段，避免 iOS 長句中斷，也讓停頓自然
function chunk(t){const parts=cleanForSpeech(t).split(/(?<=[。！？；!?;\n]|\.\s)/).map(x=>x.trim()).filter(Boolean),out=[];
  for(let x of parts){while(x.length>(SPEAK_EN?220:120)){if(SPEAK_EN){let k=x.lastIndexOf(', ',220);if(k<60)k=x.lastIndexOf(' ',220);out.push(x.slice(0,k+1));x=x.slice(k+1);continue}let k=x.lastIndexOf('，',120);if(k<40)k=x.lastIndexOf('、',120);if(k<40)k=120;out.push(x.slice(0,k+1));x=x.slice(k+1)}if(x)out.push(x)}return out}
function setBtn(btn,state){btn.classList.toggle('on',state!=='idle');btn.textContent=state==='play'?TX.pause:state==='pause'?TX.resume:TX.play;
  const st=btn.parentNode&&btn.parentNode.querySelector('.stop');if(st)st.hidden=state==='idle'}
function showLine(){if(!cur)return;const el=cur.card.querySelector('.reading');el.hidden=false;el.innerHTML=`<span class="rd-n">${cur.i+1}/${cur.chunks.length}</span>${esc(cur.chunks[cur.i]||'')}`}
function speakNext(){if(!cur||cur.paused)return;if(cur.i>=cur.chunks.length){stopSpeak();return}
  showLine();const me=cur,u=new SpeechSynthesisUtterance(cur.chunks[cur.i]);const v=pickVoice();if(v){u.voice=v;u.lang=v.lang}else u.lang=SPEAK_EN?'en-US':'zh-TW';
  u.rate=1;u.pitch=1;
  u.onend=()=>{if(cur!==me||me.paused)return;me.i++;setTimeout(speakNext,/[。！？\n]$/.test(u.text)?250:80)};
  u.onerror=e=>{if(cur!==me||me.paused||e.error==='interrupted'||e.error==='canceled')return;me.i++;speakNext()};
  SS.speak(u)}
function stopSpeak(){if(SS)SS.cancel();if(cur){setBtn(cur.btn,'idle');const r=cur.card.querySelector('.reading');if(r)r.hidden=true}cur=null;speakingId=null}
function toggleSpeak(p,btn){
  if(!SS){alert(TX.noTTS);return}
  if(cur&&cur.p.id===p.id){ // 暫停用 cancel＋記住位置（iOS 的 pause/resume 不可靠）
    if(cur.paused){cur.paused=false;setBtn(btn,'play');speakNext()}else{cur.paused=true;SS.cancel();setBtn(btn,'pause')}return}
  stopSpeak();if(!voices.length)loadVoices();
  cur={p,btn,card:btn.closest('.card'),chunks:chunk(textOf(p)),i:0,paused:false};speakingId=p.id;setBtn(btn,'play');
  SS.cancel();setTimeout(speakNext,60)}
function fillVoiceSelect(){}
function initVoiceUI(){if(!SS)return;loadVoices();SS.onvoiceschanged=loadVoices;[250,1000,3000].forEach(t=>setTimeout(()=>{if(!voices.length)loadVoices()},t));
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&cur&&!cur.paused&&/iPhone|iPad/.test(navigator.userAgent)){cur.paused=true;SS.cancel();setBtn(cur.btn,'pause')}})}

const COLORS={'古蹟':'#b8322a','歷史建築':'#2f5d3a','紀念建築':'#8c6d1f','聚落建築群':'#6b4a7a','考古遺址':'#7a5233','文化景觀':'#5f8a2e','史蹟':'#9c2f55','博物館與文化館':'#2d5b7c','觀光景點':'#c48a12','地名':'#4f8fa8'};const col=p=>COLORS[p.category]||'#55606a';
let cluster,numLayer,active=new Set(Object.keys(COLORS));
function buildCluster(){cluster.clearLayers();const ms=[];places.forEach(p=>{if(!active.has(p.category))return;
  const m=L.marker([p.lat,p.lng],{icon:L.divIcon({className:'',html:`<div class="pin" style="--c:${col(p)}"></div>`,iconSize:[14,14]})});
  m.bindPopup(()=>{const v=V(p);return `<b>${esc(v.name)}</b><br>${esc(EN_ON?v.level:p.category+'｜'+p.level)}<br><a href="#" onclick="render(${p.lat},${p.lng},'${esc(v.name).replace(/'/g,'')}');return false">${TX.near}</a>`});ms.push(m)});
  cluster.addLayers(ms);document.getElementById('mapcount').textContent=TX.count(ms.length.toLocaleString())}
function render(lat,lng,label,quiet){
  if(quiet&&speakingId)return;lastPos=[lat,lng,label];stopSpeak();
  const near=nearest(lat,lng,N,places.filter(p=>!COLORS[p.category]||active.has(p.category)));document.getElementById('status').textContent=TX.nearest(label,near.length)+(places.length?'':TX.loading);
  if(meMarker)meMarker.remove();meMarker=L.marker([lat,lng],{icon:L.divIcon({className:'',html:'<div class="me"></div>',iconSize:[18,18]}),zIndexOffset:1000}).addTo(map);
  numLayer.clearLayers();const b=[[lat,lng]];const list=document.getElementById('list');list.innerHTML='';
  near.forEach((p,i)=>{b.push([p.lat,p.lng]);L.marker([p.lat,p.lng],{zIndexOffset:900,icon:L.divIcon({className:'',html:`<div class="pin num">${i+1}</div>`,iconSize:[28,28]})}).addTo(numLayer).on('click',()=>document.getElementById('c'+i).scrollIntoView({behavior:'smooth'}));
    const c=document.createElement('article');c.className='card';c.id='c'+i;c.style.setProperty('--c',col(p));
    const v=V(p),ZN=EN_ON?' <span class="mtn zh">Chinese original</span>':'',note=k=>ZN,RN=EN_ON&&v.nameSrc==='pinyin'?'<span class="mtn">romanized</span>':'';
    c.innerHTML=`<h2><span class="no">${i+1}</span><span>${esc(v.name)}${v.sub?`<small class="zhname">${esc(v.sub)} ${RN}</small>`:''}</span></h2><div class="tags"><span class="tag dist">${fmt(p.d)}</span><span class="tag">${esc(v.level)}</span>${v.types.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div><div class="addr">${esc(p.address)}</div>`+
      (p.image?`<img class="photo" loading="lazy" src="${esc(p.image)}" alt="${esc(v.name)}" onerror="this.remove()">`:'')+(v.history?`<h3>${esc(v.hl)}${note('history')}</h3><p>${esc(v.history)}</p>`:'')+`<div class="more">`+(v.features?`<h3>${esc(v.fl)}${note('features')}</h3><p>${esc(v.features)}</p>`:'')+(v.reason?`<h3>${TX.reason}${note('reason')}</h3><p>${esc(v.reason)}</p>`:'')+(p.openTime?`<h3>${TX.open}</h3><p>${esc(p.openTime)}</p>`:'')+`</div>`+
      ((v.features||v.reason||p.openTime||(v.history||"").length>130)?`<button class="toggle">${TX.more}</button>`:'')+`<div class="links">${p.source?`<a href="${esc(p.source)}" target="_blank" rel="noopener">${TX.src}</a>`:''}<a href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}" target="_blank" rel="noopener">${TX.nav}</a></div>`;
    const t=c.querySelector('.toggle');if(t)t.onclick=()=>{c.classList.toggle('open');t.textContent=c.classList.contains('open')?TX.less:TX.more};
    const btn=document.createElement('button');btn.className='play';btn.textContent=TX.play;btn.onclick=()=>toggleSpeak(p,btn);const rd=document.createElement('div');rd.className='reading';rd.hidden=true;const row=document.createElement('div');row.className='playrow';const sb=document.createElement('button');sb.className='stop';sb.hidden=true;sb.textContent=TX.stop;sb.onclick=stopSpeak;row.append(btn,sb);c.append(rd,row);list.appendChild(c)});
  map.fitBounds(L.latLng(lat,lng).toBounds(1600).extend(L.latLngBounds(b)),{padding:[20,20],maxZoom:15});if(!quiet)document.querySelector('.mapwrap').scrollIntoView({behavior:'smooth'})}
function locate(){const st=document.getElementById('status');
  if(!navigator.geolocation){st.textContent=TX.noGeo;showFallback();return}
  st.textContent=TX.locating;
  navigator.geolocation.getCurrentPosition(p=>render(p.coords.latitude,p.coords.longitude,TX.you),()=>{st.textContent=TX.denied;showFallback()},{enableHighAccuracy:true,timeout:15000,maximumAge:60000})}
function showFallback(){document.getElementById('city').focus()}
async function init(){
  map=L.map('map',{zoomControl:false}).setView([23.7,121],7);L.control.zoom({position:'bottomright'}).addTo(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap 貢獻者'}).addTo(map);
  cluster=L.markerClusterGroup({chunkedLoading:true,maxClusterRadius:40,disableClusteringAtZoom:14,spiderfyOnMaxZoom:false,showCoverageOnHover:false});map.addLayer(cluster);numLayer=L.layerGroup().addTo(map);
  map.on('click',e=>render(e.latlng.lat,e.latlng.lng,TX.mapPick));
  const sel=document.getElementById('city');Object.keys(CITIES).forEach(k=>sel.add(new Option(EN_ON?CITY_EN[k]:k,k)));sel.onchange=()=>{if(sel.value)render(...CITIES[sel.value],EN_ON?CITY_EN[sel.value]:sel.value)};
  document.getElementById('locBtn').onclick=locate;
  const ch=document.getElementById('chips');Object.entries(COLORS).forEach(([k,v])=>{const b=document.createElement('button');b.className='chip on';b.style.setProperty('--c',v);b.textContent=EN_ON?CAT_EN[k]:k;
    b.onclick=()=>{active.has(k)?active.delete(k):active.add(k);b.classList.toggle('on');buildCluster();if(lastPos)render(...lastPos,true)};ch.appendChild(b)});
  applyI18n();initVoiceUI();loadData();locate();
  if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js')}
function applyI18n(){document.documentElement.lang=EN_ON?'en':'zh-Hant-TW';const lb=document.getElementById('langBtn');lb.textContent=EN_ON?'中':'EN';lb.onclick=()=>{localStorage.setItem('lang',EN_ON?'zh':'en');location.reload()};
  if(!EN_ON)return;document.querySelectorAll('[data-en]').forEach(e=>e.innerHTML=e.dataset.en);document.title='Stories Around You | Taiwan heritage map'}
if(typeof window!=="undefined")window.render=render;
if(typeof window!=='undefined'&&typeof module==='undefined')init();else module.exports={dist,nearest,textOf,chunk,cleanForSpeech,scoreVoice};
