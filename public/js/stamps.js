// 순례자 여권 = 브라우저(localStorage)에 저장되는 도장 기록. 서버·로그인 없음.
const KEY = 'biblepassport.v1';
let mem = null;

function load() {
  if (mem) return mem;
  try { mem = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { mem = null; }
  if (!mem || typeof mem !== 'object') mem = {};
  mem.days ??= {};      // { 'YYYY-MM-DD': {t} }  출석 도장
  mem.chapters ??= {};  // { '66-22': 'YYYY-MM-DD' }  걸음(장) 도장
  mem.books ??= {};     // { '66': 'YYYY-MM-DD' }  도시(책) 도장
  mem.guideSeen ??= false;
  return mem;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch { /* 저장 불가 환경: 메모리에만 유지 */ }
  window.dispatchEvent(new CustomEvent('bp:change'));
}

/**
 * 영상을 "재생"하면 호출 (출석체크 개념 — 끝까지 안 봐도 됨)
 * - 날짜 도장: 어떤 영상이든 재생하면 오늘 날짜에 찍힘
 * - 걸음 도장: 장 영상 재생 시
 * - 도시 도장: 그 책의 걸음 도장이 하나라도 찍히면
 */
export function stampPlay({ kind, book, ch }, date) {
  const s = load();
  const r = { newDate: false, newChapter: false, newBook: false };
  if (!s.days[date]) { s.days[date] = { t: Date.now() }; r.newDate = true; }
  if (kind === 'chapter') {
    const key = `${book}-${ch}`;
    if (!s.chapters[key]) { s.chapters[key] = date; r.newChapter = true; }
    if (!s.books[book]) { s.books[book] = date; r.newBook = true; }
  }
  if (r.newDate || r.newChapter || r.newBook) save();
  return r;
}

export const hasDay = (d) => !!load().days[d];
export const hasChapter = (key) => !!load().chapters[key];
export const hasBook = (n) => !!load().books[n];
export const chaptersDone = (n, total) => {
  let c = 0;
  for (let i = 1; i <= total; i++) if (load().chapters[`${n}-${i}`]) c++;
  return c;
};
export const stats = () => {
  const s = load();
  return { days: Object.keys(s.days).length, chapters: Object.keys(s.chapters).length, books: Object.keys(s.books).length };
};
export const guideSeen = () => load().guideSeen;
export function markGuideSeen() { load().guideSeen = true; save(); }

// 기기 변경용 복구 코드
export function exportCode() {
  const bytes = new TextEncoder().encode(JSON.stringify(load()));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return 'BP1.' + btoa(bin);
}
export function importCode(code) {
  try {
    const m = String(code).trim().match(/^BP1\.(.+)$/s);
    if (!m) return false;
    const bin = atob(m[1]);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof data !== 'object' || !data.days || !data.chapters || !data.books) return false;
    const s = load();
    // 병합: 기존 기록과 합치기 (더 이른 날짜 우선)
    for (const d of Object.keys(data.days)) s.days[d] ??= data.days[d];
    for (const k of Object.keys(data.chapters)) if (!s.chapters[k] || data.chapters[k] < s.chapters[k]) s.chapters[k] = data.chapters[k];
    for (const k of Object.keys(data.books)) if (!s.books[k] || data.books[k] < s.books[k]) s.books[k] = data.books[k];
    save();
    return true;
  } catch { return false; }
}

// 개발/점검용 (콘솔에서 __bp.fillBook(31) 등)
window.__bp = {
  fillBook(n, total) {
    const s = load();
    for (let i = 1; i <= total; i++) s.chapters[`${n}-${i}`] ??= '2026-10-01';
    s.books[n] ??= '2026-10-01';
    save();
  },
  reset() { mem = null; try { localStorage.removeItem(KEY); } catch {} save(); },
};
