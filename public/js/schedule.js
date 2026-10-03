// 순수 로직 (DOM 없음) — 브라우저와 서버(api)에서 같이 사용
import { BOOKS } from './bible.js';

const KST_MS = 9 * 3600 * 1000;

/** 한국시간 기준 YYYY-MM-DD */
export function kstDateStr(d = new Date()) {
  return new Date(d.getTime() + KST_MS).toISOString().slice(0, 10);
}
export function addDays(dateStr, n) {
  return new Date(Date.parse(dateStr + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
}
export function dayDiff(a, b) {
  return Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 864e5);
}

/** 역순 걸음 순서: 요한계시록 22장 → 창세기 1장 (1,189걸음) */
export const SEQ = (() => {
  const seq = [];
  for (let b = BOOKS.length - 1; b >= 0; b--) {
    for (let c = BOOKS[b].ch; c >= 1; c--) seq.push({ book: BOOKS[b].n, ch: c, key: `${BOOKS[b].n}-${c}` });
  }
  return seq;
})();

export function hashStr(s) {
  let h = 2166136261;
  for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/**
 * 오늘의 걸음. 모든 사람에게 같은 결과(날짜만으로 결정).
 * - scheduled: 순례 일정상 오늘 위치
 * - item: 실제로 보여줄 영상 (영상이 아직 없으면 지난 영상 중 날짜 시드 랜덤)
 */
export function pickToday(dateStr, startStr, vids) {
  const avail = (it) => !!vids.chapterVideos[it.key];
  const day = Math.max(0, dayDiff(dateStr, startStr));
  const scheduled = SEQ[day] ?? null;
  if (scheduled && avail(scheduled)) return { dayNo: day + 1, scheduled, item: scheduled, fallback: false };
  let pool = SEQ.slice(0, Math.min(day, SEQ.length)).filter(avail);
  if (!pool.length) pool = SEQ.filter(avail);
  const item = pool.length ? pool[hashStr(dateStr) % pool.length] : null;
  return { dayNo: day + 1, scheduled, item, fallback: true };
}

/** 책 영상이 여러 개(예: 사도행전 전·후반부)면 장이 속한 것을, 아니면 첫 번째를 돌려준다. */
export function pickBookEntry(entry, ch = null) {
  if (!entry) return null;
  if (entry.parts && entry.parts.length) {
    const hit = ch != null && entry.parts.find((p) => p.range && ch >= p.range[0] && ch <= p.range[1]);
    return hit || entry.parts[0];
  }
  return entry;
}
