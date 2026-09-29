#!/usr/bin/env node
/**
 * 抓取杭州天气快照 → 写 hangzhou.json
 *
 * 为什么需要它：Open-Meteo 是境外服务，国内手机流量下可能连不上；
 * 而 jsDelivr 在国内有镜像节点、CORS 为 *，可达性高得多。
 * 所以：GitHub Actions（境外，能连 Open-Meteo）定时抓 → commit →
 * 页面经 jsDelivr 读这份 JSON，等于「绕道拿到实时数据」。
 *
 * 输出格式与页面内烘焙的离线快照完全一致，页面可直接复用同一套解析逻辑。
 */
import { writeFileSync } from 'node:fs';

const POINTS = [
  { key: 'center', label: '杭州市中心', lat: 30.2594, lng: 120.1650 },
  { key: 'manjuelong', label: '满觉陇（西南山区）', lat: 30.2240, lng: 120.1270 },
  { key: 'east', label: '杭州东站（东北）', lat: 30.2906, lng: 120.2136 },
];
const TZ = 'Asia/Shanghai';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

async function jget(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Origin: 'null' } });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return r.json();
}

const r1 = (v) => (typeof v === 'number' && !Number.isInteger(v)) ? Math.round(v * 10) / 10 : v;

const points = [];
for (const p of POINTS) {
  const wx = await jget('https://api.open-meteo.com/v1/forecast'
    + `?latitude=${p.lat}&longitude=${p.lng}`
    + '&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code'
    + '&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,relative_humidity_2m'
    + '&daily=sunset,uv_index_max'
    + `&timezone=${encodeURIComponent(TZ)}&forecast_days=4`);

  let aqi = null;
  try {
    const a = await jget('https://air-quality-api.open-meteo.com/v1/air-quality'
      + `?latitude=${p.lat}&longitude=${p.lng}`
      + '&current=pm2_5,pm10,us_aqi&timezone=' + encodeURIComponent(TZ));
    aqi = a?.current ?? null;
  } catch { /* 空气质量失败不影响主流程 */ }

  const h = wx.hourly, d = wx.daily ?? {};
  points.push({
    label: p.label, lat: p.lat, lng: p.lng,
    hourly: {
      time: h.time,
      temperature_2m: h.temperature_2m.map(r1),
      apparent_temperature: h.apparent_temperature.map(r1),
      precipitation_probability: h.precipitation_probability,
      precipitation: (h.precipitation ?? []).map(r1),
      weather_code: h.weather_code,
    },
    daily: {
      time: d.time, sunset: d.sunset,
      uv_index_max: (d.uv_index_max ?? []).map(r1),
    },
    current: wx.current ?? null,
    aqi,
  });
  console.log(`✔ ${p.label}  ${h.time.length} 小时  aqi=${aqi ? aqi.us_aqi : 'n/a'}`);
}

const out = {
  capturedAt: new Date().toISOString(),
  timezone: TZ,
  source: 'Open-Meteo via GitHub Actions',
  points,
};
writeFileSync('hangzhou.json', JSON.stringify(out));
console.log(`\n写入 hangzhou.json（${out.points.length} 点 / ${out.points[0].hourly.time.length} 小时），抓取于 ${out.capturedAt}`);
