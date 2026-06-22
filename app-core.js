export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000; // metres
  const toRad = v => v * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function totalDistanceLatLngs(latlngs) {
  let d = 0;
  for (let i = 1; i < latlngs.length; i++) {
    d += haversine(latlngs[i - 1].lat, latlngs[i - 1].lng, latlngs[i].lat, latlngs[i].lng);
  }
  return d;
}

export function sampleLatLngs(latlngs, maxPoints = 100) {
  if (latlngs.length <= maxPoints) return latlngs.slice();
  const out = [];
  const step = Math.ceil(latlngs.length / maxPoints);
  for (let i = 0; i < latlngs.length; i += step) out.push(latlngs[i]);
  if (out[out.length - 1] !== latlngs[latlngs.length - 1]) out.push(latlngs[latlngs.length - 1]);
  return out;
}

export function computeElevationGain(elevations) {
  if (!elevations || elevations.length === 0) return 0;
  let gain = 0;
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff > 0) gain += diff;
  }
  return gain;
}

export function degToCardinal(deg) {
  if (deg === null || deg === undefined) return '—';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const ix = Math.round(deg / 22.5) % 16;
  return dirs[ix];
}

export function findMidpointAlongLine(latlngs) {
  const total = totalDistanceLatLngs(latlngs);
  const half = total / 2;
  let acc = 0;
  for (let i = 1; i < latlngs.length; i++) {
    const seg = haversine(latlngs[i - 1].lat, latlngs[i - 1].lng, latlngs[i].lat, latlngs[i].lng);
    if (acc + seg >= half) {
      const need = half - acc;
      const ratio = need / seg;
      const lat = latlngs[i - 1].lat + (latlngs[i].lat - latlngs[i - 1].lat) * ratio;
      const lng = latlngs[i - 1].lng + (latlngs[i].lng - latlngs[i - 1].lng) * ratio;
      return { lat, lng };
    }
    acc += seg;
  }
  return latlngs[Math.floor(latlngs.length / 2)];
}
