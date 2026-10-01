// 아침 알림용 캘린더 구독 (.ics) — 서버 저장소 없이 날짜만으로 계산합니다.
// 사용: webcal://<도메인>/api/calendar.ics?h=7   (h = 한국시간 알림 시각, 기본 7시)
import { BOOKS } from '../public/js/bible.js';
import { kstDateStr, addDays, pickToday } from '../public/js/schedule.js';

const DAYS_AHEAD = 45;
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const fmtUtc = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function buildIcs({ cfg, vids, base, hour, today = kstDateStr() }) {
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BiblePassport//KO//', 'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${esc(cfg.siteName)} · 오늘의 걸음`, 'X-WR-TIMEZONE:Asia/Seoul',
    'REFRESH-INTERVAL;VALUE=DURATION:P1D', 'X-PUBLISHED-TTL:PT12H',
  ];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const date = addDays(today, i);
    const { item, dayNo } = pickToday(date, cfg.startDate, vids);
    if (!item) continue;
    const [y, m, d] = date.split('-').map(Number);
    const startMs = Date.UTC(y, m - 1, d, hour - 9, 0, 0); // KST → UTC
    const title = `${BOOKS[item.book - 1].name} ${item.ch}장`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:bp-${date}@biblepassport`,
      `DTSTAMP:${fmtUtc(Date.now())}`,
      `DTSTART:${fmtUtc(startMs)}`,
      `DTEND:${fmtUtc(startMs + 10 * 60 * 1000)}`,
      `SUMMARY:${esc(`${cfg.siteName} · 순례 ${dayNo}일째, 오늘의 걸음: ${title}`)}`,
      `DESCRIPTION:${esc(`오늘의 영상 보러 가기\n${base}/`)}`,
      `URL:${base}/`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(`오늘의 걸음: ${title}`)}`, 'TRIGGER:PT0M', 'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://x');
    const hour = Math.min(23, Math.max(0, parseInt(url.searchParams.get('h') ?? '7', 10) || 7));
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || (/^localhost|^127\./.test(host) ? 'http' : 'https');
    const base = `${proto}://${host}`;
    const [cfg, vids] = await Promise.all([
      fetch(`${base}/data/config.json`).then((r) => r.json()),
      fetch(`${base}/data/videos.json`).then((r) => r.json()),
    ]);
    const body = buildIcs({ cfg, vids, base, hour });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.end(body);
  } catch (e) {
    res.statusCode = 500;
    res.end('calendar error: ' + e.message);
  }
}
