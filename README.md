Route Cycler — 路線估算器

簡介

這是一個用 HTML/CSS/JS 建立的簡單單頁應用，讓你在地圖上繪製自行車路線，並估算：

- 距離（km）
- 海拔上升總和（m，使用 Open-Elevation 公共 API）
- 路線中點的即時天氣與風向（使用 OpenWeatherMap，需要 API Key）

快速上手

1. 打開 [index.html](index.html) 在瀏覽器（或使用簡易伺服器，如 `npx http-server`）。
2. 在側邊欄輸入你的 OpenWeatherMap API Key（若不輸入仍可計算距離與海拔）。
3. 在地圖上選擇折線工具（左上繪圖工具），畫出你的路線。
4. 畫完後會自動計算距離與查詢海拔；點選「取得天氣與風向」可查詢路線中點的即時天氣。

注意事項

- Open-Elevation API 為公共服務，可能有速率限制或可用性問題。
- OpenWeatherMap 需要註冊並取得 API Key（免費方案足以做基本天氣查詢）。

要改進的地方

- 使用更多取樣點或 Mapbox 的等高線服務可以得到更精準的海拔。
- 可以對整條路線多點查詢天氣與風，取得更完整的預測。

技術棧

- 地圖：Leaflet + OpenStreetMap tiles
- 繪圖：Leaflet.draw
- 海拔：Open-Elevation (https://api.open-elevation.com)
- 天氣：OpenWeatherMap Current Weather API (https://openweathermap.org/api)

檔案

- [index.html](index.html) — 單頁應用
- [app.js](app.js) — 主要邏輯
- [styles.css](styles.css) — 風格樣式（工作區已包含）

授權

遵循原始碼檔案內註記（無特別授權）。
