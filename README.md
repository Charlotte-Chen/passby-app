# 我經過了｜身邊的文化資產（PWA）
靜態網站，無後端。打開即用瀏覽器定位（只在本機計算），列出最近 5 處文化資產＋地圖（Leaflet/OSM）＋文字卡片，每張卡片可用 Web Speech API（zh-TW）朗讀卡片上同樣的文字。定位被拒時可選城市或點地圖。

## 檔案
- index.html / style.css / app.js / sw.js / manifest.webmanifest / icon.svg
- data/index.json：國家清單；data/tw.json：臺灣資料
- tools/build_tw.py：由文資局開放資料轉換

## 資料來源（臺灣）
文化部文化資產局開放資料，政府資料開放授權條款第1版：
- 古蹟 https://data.boch.gov.tw/opendata/v2/assetsCase/1.1.json
- 歷史建築 .../1.2.json　聚落建築群 .../1.3.json
更新：下載三檔到 raw/，執行 `python3 tools/build_tw.py raw`。照片取自 representImage 欄位（文資局圖檔網址）。
- 地名由來：內政部地政司「臺灣地區地名資料」行政區域類(data.gov.tw/dataset/40281)、自然地理實體類(40456)、聚落類 CSV；只保留有 PlaceMean 與座標者。
  `python3 tools/build_tw_placenames.py raw/行政區域.csv raw/自然地理.csv raw/聚落.csv` → data/tw-placenames.json

## 資料格式（每筆 place）
`id, country, image, historyLabel, region, district, name, category, level, types[], lat, lng, address, history, features, reason, openTime, source`

## 新增國家
1. 寫轉換腳本，輸出 `data/<code>.json`：`{"country":"JP","name":"日本","source":"…","places":[…同上欄位…]}`，文字只能取自原始資料。
2. 在 `data/index.json` 的 `countries` 加一筆 `{"code":"JP","name":"日本","files":["data/jp.json"]}`（一國可多檔）。
   資料檔可有 `defaults` 物件，套用到該檔每一筆（例如 category）。新類別請在 app.js 的 `COLORS` 加顏色，地圖篩選按鈕會自動出現。
3. （可選）在 app.js 的 `CITIES` 加入該國城市供手動選擇。
app.js 會載入所有國家檔並一起算最近距離。

## 部署
任何靜態空間皆可（GitHub Pages、Netlify、Cloudflare Pages）。需 HTTPS 才能定位。
