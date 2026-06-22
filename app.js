// app.js — 路線估算核心邏輯

const map = L.map('map').setView([25.033964, 121.564468], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// FeatureGroup for drawn items
const drawnItems = new L.FeatureGroup().addTo(map);
const drawControl = new L.Control.Draw({
  draw: { polygon: false, circle: false, rectangle: false, marker: false },
  edit: { featureGroup: drawnItems }
});
map.addControl(drawControl);

let currentLine = null;

map.on(L.Draw.Event.CREATED, function (e) {
  const layer = e.layer;
  // only allow one line at a time
  drawnItems.clearLayers();
  drawnItems.addLayer(layer);
  if (layer instanceof L.Polyline) {
    currentLine = layer;
    updateStatsFromLine(layer);
  }
});

map.on('draw:edited', function(e){
  e.layers.eachLayer(layer => {
    if (layer instanceof L.Polyline) {
      currentLine = layer;
      updateStatsFromLine(layer);
    }
  });
});

// helpers
function haversine(lat1, lon1, lat2, lon2){
  const R = 6371000; // metres
  const toRad = v => v * Math.PI / 180;
  const dLat = toRad(lat2-lat1);
  const dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)*Math.sin(dLon/2);
  const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function totalDistanceLatLngs(latlngs){
  let d = 0;
  for(let i=1;i<latlngs.length;i++){
    d += haversine(latlngs[i-1].lat, latlngs[i-1].lng, latlngs[i].lat, latlngs[i].lng);
  }
  return d; // meters
}

function sampleLatLngs(latlngs, maxPoints=100){
  if (latlngs.length <= maxPoints) return latlngs.slice();
  const out = [];
  const step = Math.ceil(latlngs.length / maxPoints);
  for(let i=0;i<latlngs.length;i+=step) out.push(latlngs[i]);
  if (out[out.length-1] !== latlngs[latlngs.length-1]) out.push(latlngs[latlngs.length-1]);
  return out;
}

async function fetchElevationForPoints(points){
  // points: [{lat, lng}, ...]
  const locations = points.map(p => ({latitude: p.lat, longitude: p.lng})).map(p=>({latitude:p.latitude, longitude:p.longitude}));
  // open-elevation expects locations: [{latitude, longitude}, ...]
  // but we'll build as required
  const payload = { locations: points.map(p => ({latitude: p.lat, longitude: p.lng})) };
  try{
    const res = await fetch('https://api.open-elevation.com/api/v1/lookup', {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Elevation API error');
    const data = await res.json();
    // data.results = [{latitude, longitude, elevation}, ...]
    return data.results.map(r => r.elevation);
  } catch(err){
    console.error(err);
    return null;
  }
}

function computeElevationGain(elevations){
  if (!elevations || elevations.length===0) return 0;
  let gain = 0;
  for(let i=1;i<elevations.length;i++){
    const diff = elevations[i] - elevations[i-1];
    if (diff > 0) gain += diff;
  }
  return gain; // meters
}

function degToCardinal(deg){
  if (deg===null || deg===undefined) return '—';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  const ix = Math.round(deg / 22.5) % 16;
  return dirs[ix];
}

function findMidpointAlongLine(latlngs){
  const total = totalDistanceLatLngs(latlngs);
  const half = total/2;
  let acc = 0;
  for(let i=1;i<latlngs.length;i++){
    const seg = haversine(latlngs[i-1].lat, latlngs[i-1].lng, latlngs[i].lat, latlngs[i].lng);
    if (acc + seg >= half){
      const need = half - acc;
      const ratio = need/seg;
      const lat = latlngs[i-1].lat + (latlngs[i].lat - latlngs[i-1].lat)*ratio;
      const lng = latlngs[i-1].lng + (latlngs[i].lng - latlngs[i-1].lng)*ratio;
      return {lat, lng};
    }
    acc += seg;
  }
  return latlngs[Math.floor(latlngs.length/2)];
}

// UI hooks
const distanceEl = document.getElementById('distance');
const elevationEl = document.getElementById('elevation');
const weatherEl = document.getElementById('weather');
const windEl = document.getElementById('wind');
const owmKeyEl = document.getElementById('owmKey');
const btnWeather = document.getElementById('btnWeather');
const btnClear = document.getElementById('btnClear');

async function updateStatsFromLine(line){
  const latlngs = line.getLatLngs();
  if (!latlngs || latlngs.length < 2) return;
  // distance
  const dist = totalDistanceLatLngs(latlngs);
  distanceEl.innerText = (dist/1000).toFixed(2) + ' km';
  // elevation (sample up to 120 points)
  const sampled = sampleLatLngs(latlngs, 120);
  const pts = sampled.map(p => ({lat: p.lat, lng: p.lng}));
  elevationEl.innerText = '查詢中...';
  const elevations = await fetchElevationForPoints(pts);
  if (elevations){
    const gain = computeElevationGain(elevations);
    elevationEl.innerText = Math.round(gain) + ' m';
  } else {
    elevationEl.innerText = '無法取得海拔';
  }
  // update weather/wind with midpoint automatically if API key exists
  const key = owmKeyEl.value.trim();
  if (key){
    btnWeather.disabled = true;
    try{
      const mid = findMidpointAlongLine(latlngs);
      await fetchWeatherForPoint(mid.lat, mid.lng, key);
    } finally {
      btnWeather.disabled = false;
    }
  }
}

async function fetchWeatherForPoint(lat, lon, apiKey){
  weatherEl.innerText = '查詢中...';
  windEl.innerText = '查詢中...';
  try{
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('OpenWeatherMap error');
    const data = await res.json();
    const desc = data.weather && data.weather[0] && data.weather[0].description ? data.weather[0].description : '—';
    const temp = data.main && data.main.temp ? data.main.temp : '—';
    weatherEl.innerText = `${desc}, ${temp} °C`;
    const windSpeed = data.wind && data.wind.speed ? data.wind.speed : '—';
    const windDeg = data.wind && (data.wind.deg || data.wind.deg===0) ? data.wind.deg : null;
    const dir = degToCardinal(windDeg);
    windEl.innerText = `${windSpeed} m/s, ${dir} (${windDeg===null ? '—' : windDeg+'°'})`;
  } catch(err){
    console.error(err);
    weatherEl.innerText = '無法取得天氣';
    windEl.innerText = '—';
  }
}

btnWeather.addEventListener('click', async ()=>{
  const key = owmKeyEl.value.trim();
  if (!key){ alert('請先填入 OpenWeatherMap API Key。'); return; }
  if (!currentLine){ alert('請先在地圖上繪製路線。'); return; }
  const latlngs = currentLine.getLatLngs();
  const mid = findMidpointAlongLine(latlngs);
  await fetchWeatherForPoint(mid.lat, mid.lng, key);
});

btnClear.addEventListener('click', ()=>{
  drawnItems.clearLayers();
  currentLine = null;
  distanceEl.innerText = '—';
  elevationEl.innerText = '—';
  weatherEl.innerText = '—';
  windEl.innerText = '—';
});

// try geolocation
if (navigator.geolocation){
  navigator.geolocation.getCurrentPosition(pos => {
    map.setView([pos.coords.latitude, pos.coords.longitude], 13);
  }, ()=>{});
}

// expose some helpers for debugging
window._rc = { map, fetchElevationForPoints, computeElevationGain };
