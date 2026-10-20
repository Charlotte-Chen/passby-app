const CITIES={'臺北市':[25.0375,121.5637],'新北市':[25.0120,121.4657],'基隆市':[25.1276,121.7392],'桃園市':[24.9936,121.3010],'新竹市':[24.8138,120.9675],'新竹縣':[24.8387,121.0177],'苗栗縣':[24.5602,120.8214],'臺中市':[24.1477,120.6736],'彰化縣':[24.0518,120.5161],'南投縣':[23.9609,120.9719],'雲林縣':[23.7092,120.4313],'嘉義市':[23.4801,120.4491],'嘉義縣':[23.4518,120.2555],'臺南市':[22.9999,120.2270],'高雄市':[22.6273,120.3014],'屏東縣':[22.5519,120.5487],'宜蘭縣':[24.7021,121.7378],'花蓮縣':[23.9872,121.6016],'臺東縣':[22.7583,121.1444],'澎湖縣':[23.5711,119.5793],'金門縣':[24.4321,118.3171],'連江縣':[26.1605,119.9517]};
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
  await Promise.all(files.map(f=>fetch(f).then(r=>r.json()).then(x=>{places=places.concat(x.places.map(p=>x.defaults?{...x.defaults,...p}:p));
    clearTimeout(rebuildT);rebuildT=setTimeout(()=>{buildCluster();if(lastPos)render(...lastPos,true)},300)}).catch(e=>console.warn(f,e))));return places}
const esc=s=>(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=m=>m<1000?Math.round(m)+' 公尺':(m/1000).toFixed(1)+' 公里';
function textOf(p){return [p.name+'。',p.history&&((p.historyLabel||'歷史沿革')+'。'+p.history),p.features&&((p.featuresLabel||'建築特色')+'。'+p.features),p.reason&&('指定理由。'+p.reason)].filter(Boolean).join('\n')}
// 語音朗讀（Web Speech API，zh-TW）
let speakingId=null;
function zhVoice(){const v=speechSynthesis.getVoices();return v.find(x=>/zh[-_]TW/i.test(x.lang))||v.find(x=>/^zh/i.test(x.lang))}
function toggleSpeak(p,btn){
  if(!('speechSynthesis' in window)){alert('此瀏覽器不支援語音朗讀');return}
  if(speakingId===p.id){if(speechSynthesis.paused){speechSynthesis.resume();btn.textContent='⏸ 暫停'}else{speechSynthesis.pause();btn.textContent='▶ 繼續'}return}
  speechSynthesis.cancel();document.querySelectorAll('.play').forEach(b=>{b.textContent='▶ 播放語音';b.classList.remove('on')});
  // 分段避免 iOS 長文字中斷
  const chunks=textOf(p).split(/(?<=[。！？\n])/).reduce((a,s)=>{if(a.length&&(a[a.length-1]+s).length<180)a[a.length-1]+=s;else a.push(s);return a},[]).filter(s=>s.trim());
  speakingId=p.id;btn.textContent='⏸ 暫停';btn.classList.add('on');
  chunks.forEach((t,i)=>{const u=new SpeechSynthesisUtterance(t);u.lang='zh-TW';const v=zhVoice();if(v)u.voice=v;u.rate=1;
    if(i===chunks.length-1)u.onend=()=>{if(speakingId===p.id){speakingId=null;btn.textContent='▶ 播放語音';btn.classList.remove('on')}};speechSynthesis.speak(u)})}
const COLORS={'古蹟':'#d2592a','歷史建築':'#1d6b6f','紀念建築':'#b0832b','聚落建築群':'#7a4f86','考古遺址':'#8a5a3c','文化景觀':'#4f8a3c','史蹟':'#a33b5c','博物館與文化館':'#2c4f8f','觀光景點':'#e09a1a','地名':'#5a8fc7'};const col=p=>COLORS[p.category]||'#55606a';
let cluster,numLayer,active=new Set(Object.keys(COLORS));
function buildCluster(){cluster.clearLayers();const ms=[];places.forEach(p=>{if(!active.has(p.category))return;
  const m=L.marker([p.lat,p.lng],{icon:L.divIcon({className:'',html:`<div class="pin" style="--c:${col(p)}"></div>`,iconSize:[14,14]})});
  m.bindPopup(()=>`<b>${esc(p.name)}</b><br>${esc(p.category)}｜${esc(p.level)}<br><a href="#" onclick="render(${p.lat},${p.lng},'${esc(p.name).replace(/'/g,'')}');return false">看這裡附近</a>`);ms.push(m)});
  cluster.addLayers(ms);document.getElementById('mapcount').textContent=`地圖上共 ${ms.length.toLocaleString()} 處地點（放大可展開）`}
function render(lat,lng,label,quiet){
  if(quiet&&speakingId)return;lastPos=[lat,lng,label];window.speechSynthesis&&speechSynthesis.cancel();speakingId=null;
  const near=nearest(lat,lng,N,places.filter(p=>!COLORS[p.category]||active.has(p.category)));document.getElementById('status').textContent=`離${label}最近的 ${near.length} 處`+(places.length?'':'（資料載入中…）');
  if(meMarker)meMarker.remove();meMarker=L.marker([lat,lng],{icon:L.divIcon({className:'',html:'<div class="me"></div>',iconSize:[18,18]}),zIndexOffset:1000}).addTo(map);
  numLayer.clearLayers();const b=[[lat,lng]];const list=document.getElementById('list');list.innerHTML='';
  near.forEach((p,i)=>{b.push([p.lat,p.lng]);L.marker([p.lat,p.lng],{zIndexOffset:900,icon:L.divIcon({className:'',html:`<div class="pin num">${i+1}</div>`,iconSize:[28,28]})}).addTo(numLayer).on('click',()=>document.getElementById('c'+i).scrollIntoView({behavior:'smooth'}));
    const c=document.createElement('article');c.className='card';c.id='c'+i;c.style.setProperty('--c',col(p));
    c.innerHTML=`<h2><span class="no">${i+1}</span>${esc(p.name)}</h2><div class="tags"><span class="tag dist">${fmt(p.d)}</span><span class="tag">${esc(p.level)}</span>${p.types.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div><div class="addr">${esc(p.address)}</div>`+
      (p.image?`<img class="photo" loading="lazy" src="${esc(p.image)}" alt="${esc(p.name)}" onerror="this.remove()">`:'')+(p.history?`<h3>${esc(p.historyLabel||'歷史沿革')}</h3><p>${esc(p.history)}</p>`:'')+`<div class="more">`+(p.features?`<h3>${esc(p.featuresLabel||'建築特色')}</h3><p>${esc(p.features)}</p>`:'')+(p.reason?`<h3>指定／登錄理由</h3><p>${esc(p.reason)}</p>`:'')+(p.openTime?`<h3>開放時間</h3><p>${esc(p.openTime)}</p>`:'')+`</div>`+
      ((p.features||p.reason||p.openTime||(p.history||"").length>130)?`<button class="toggle">展開更多 ▾</button>`:'')+`<div class="links">${p.source?`<a href="${esc(p.source)}" target="_blank" rel="noopener">原始資料</a>`:''}<a href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}" target="_blank" rel="noopener">導航前往</a></div>`;
    const t=c.querySelector('.toggle');if(t)t.onclick=()=>{c.classList.toggle('open');t.textContent=c.classList.contains('open')?'收合 ▴':'展開更多 ▾'};
    const btn=document.createElement('button');btn.className='play';btn.textContent='▶ 播放語音';btn.onclick=()=>toggleSpeak(p,btn);c.appendChild(btn);list.appendChild(c)});
  map.fitBounds(L.latLng(lat,lng).toBounds(1600).extend(L.latLngBounds(b)),{padding:[20,20],maxZoom:15});if(!quiet)document.querySelector('.mapwrap').scrollIntoView({behavior:'smooth'})}
function locate(){const st=document.getElementById('status');
  if(!navigator.geolocation){st.textContent='無法定位，請選擇城市或點地圖';showFallback();return}
  st.textContent='正在取得你的位置…';
  navigator.geolocation.getCurrentPosition(p=>render(p.coords.latitude,p.coords.longitude,'你'),()=>{st.textContent='未取得定位權限，請選擇城市或點地圖';showFallback()},{enableHighAccuracy:true,timeout:15000,maximumAge:60000})}
function showFallback(){document.getElementById('city').focus()}
async function init(){
  map=L.map('map',{zoomControl:false}).setView([23.7,121],7);L.control.zoom({position:'bottomright'}).addTo(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap 貢獻者'}).addTo(map);
  cluster=L.markerClusterGroup({chunkedLoading:true,maxClusterRadius:40,disableClusteringAtZoom:14,spiderfyOnMaxZoom:false,showCoverageOnHover:false});map.addLayer(cluster);numLayer=L.layerGroup().addTo(map);
  map.on('click',e=>render(e.latlng.lat,e.latlng.lng,'地圖選點'));
  const sel=document.getElementById('city');Object.keys(CITIES).forEach(k=>sel.add(new Option(k,k)));sel.onchange=()=>{if(sel.value)render(...CITIES[sel.value],sel.value)};
  document.getElementById('locBtn').onclick=locate;
  const ch=document.getElementById('chips');Object.entries(COLORS).forEach(([k,v])=>{const b=document.createElement('button');b.className='chip on';b.style.setProperty('--c',v);b.textContent=k;
    b.onclick=()=>{active.has(k)?active.delete(k):active.add(k);b.classList.toggle('on');buildCluster();if(lastPos)render(...lastPos,true)};ch.appendChild(b)});
  loadData();locate();
  if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js')}
if(typeof window!=="undefined")window.render=render;
if(typeof window!=='undefined'&&typeof module==='undefined')init();else module.exports={dist,nearest,textOf};
