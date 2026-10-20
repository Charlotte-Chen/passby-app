const CITIES={'臺北市':[25.0375,121.5637],'新北市':[25.0120,121.4657],'基隆市':[25.1276,121.7392],'桃園市':[24.9936,121.3010],'新竹市':[24.8138,120.9675],'新竹縣':[24.8387,121.0177],'苗栗縣':[24.5602,120.8214],'臺中市':[24.1477,120.6736],'彰化縣':[24.0518,120.5161],'南投縣':[23.9609,120.9719],'雲林縣':[23.7092,120.4313],'嘉義市':[23.4801,120.4491],'嘉義縣':[23.4518,120.2555],'臺南市':[22.9999,120.2270],'高雄市':[22.6273,120.3014],'屏東縣':[22.5519,120.5487],'宜蘭縣':[24.7021,121.7378],'花蓮縣':[23.9872,121.6016],'臺東縣':[22.7583,121.1444],'澎湖縣':[23.5711,119.5793],'金門縣':[24.4321,118.3171],'連江縣':[26.1605,119.9517]};
const N=5;let places=[],map,meMarker,layer;
// 距離（公尺），haversine，全部在裝置上計算
function dist(a,b,c,d){const R=6371e3,r=Math.PI/180,x=(c-a)*r,y=(d-b)*r,h=Math.sin(x/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
function nearest(lat,lng,n=N,list=places){return list.map(p=>({...p,d:dist(lat,lng,p.lat,p.lng)})).sort((a,b)=>a.d-b.d).slice(0,n)}
async function loadData(){const idx=await (await fetch('data/index.json')).json();
  const all=await Promise.all(idx.countries.map(c=>fetch(c.file).then(r=>r.json()).catch(()=>({places:[]}))));
  places=all.flatMap(x=>x.places);return places}
const esc=s=>(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=m=>m<1000?Math.round(m)+' 公尺':(m/1000).toFixed(1)+' 公里';
function textOf(p){return [p.name+'。',p.history&&('歷史沿革。'+p.history),p.features&&('建築特色。'+p.features),p.reason&&('指定理由。'+p.reason)].filter(Boolean).join('\n')}
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
function render(lat,lng,label){
  speechSynthesis?.cancel?.();speakingId=null;
  const near=nearest(lat,lng);document.getElementById('status').textContent=`${label}附近最近的 ${near.length} 處文化資產（共 ${places.length} 處資料）`;
  if(meMarker)meMarker.remove();meMarker=L.circleMarker([lat,lng],{radius:8,color:'#1565c0',fillOpacity:.8}).addTo(map);
  layer.clearLayers();const b=[[lat,lng]];
  const list=document.getElementById('list');list.innerHTML='';
  near.forEach((p,i)=>{b.push([p.lat,p.lng]);L.marker([p.lat,p.lng]).addTo(layer).bindPopup(`${i+1}. ${esc(p.name)}`);
    const c=document.createElement('article');c.className='card';
    c.innerHTML=`<h2>${i+1}. ${esc(p.name)}</h2><div class="meta">${esc(p.level)}｜${esc(p.types.join('、'))}｜距離 ${fmt(p.d)}<br>${esc(p.address)}</div>`+
      (p.history?`<h3>歷史沿革</h3><p>${esc(p.history)}</p>`:'')+(p.features?`<h3>建築特色</h3><p>${esc(p.features)}</p>`:'')+(p.reason?`<h3>指定／登錄理由</h3><p>${esc(p.reason)}</p>`:'')+
      (p.openTime?`<div class="meta">開放時間：${esc(p.openTime)}</div>`:'')+`<div class="meta"><a href="${esc(p.source)}" target="_blank" rel="noopener">國家文化資產網原始資料</a>｜<a href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}" target="_blank">導航</a></div>`;
    const btn=document.createElement('button');btn.className='play';btn.textContent='▶ 播放語音';btn.onclick=()=>toggleSpeak(p,btn);c.appendChild(btn);list.appendChild(c)});
  map.fitBounds(b,{padding:[30,30],maxZoom:16})}
function locate(){const st=document.getElementById('status');
  if(!navigator.geolocation){st.textContent='無法定位，請選擇城市或點地圖';showFallback();return}
  st.textContent='正在取得你的位置…';
  navigator.geolocation.getCurrentPosition(p=>render(p.coords.latitude,p.coords.longitude,'你'),()=>{st.textContent='未取得定位權限，請選擇城市或點地圖';showFallback()},{enableHighAccuracy:true,timeout:15000,maximumAge:60000})}
function showFallback(){document.getElementById('fallback').hidden=false}
async function init(){
  map=L.map('map').setView([23.7,121],7);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);layer=L.layerGroup().addTo(map);
  map.on('click',e=>render(e.latlng.lat,e.latlng.lng,'地圖選點'));
  const sel=document.getElementById('city');Object.keys(CITIES).forEach(k=>sel.add(new Option(k,k)));sel.onchange=()=>{if(sel.value)render(...CITIES[sel.value],sel.value)};
  document.getElementById('locBtn').onclick=locate;
  await loadData();locate();
  if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js')}
if(typeof window!=='undefined'&&typeof module==='undefined')init();else module.exports={dist,nearest,textOf};
