// 유튜브 재생목록 → public/data/videos.json
//   node scripts/fetch-youtube.mjs          : YOUTUBE_API_KEY 로 전체 수집 (최초 1회 + 정기 갱신)
//   node scripts/fetch-youtube.mjs --rss    : 키 없이 RSS(최근 15개)만 받아 기존 데이터에 병합
//   node scripts/fetch-youtube.mjs --auto   : 키가 있으면 전체, 없으면 RSS
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { BOOKS } from '../public/js/bible.js';

const root = new URL('../', import.meta.url);
const cfg = JSON.parse(readFileSync(new URL('public/data/config.json', root), 'utf8'));
const outUrl = new URL('public/data/videos.json', root);

// .env 지원 (YOUTUBE_API_KEY=...)
if (existsSync(new URL('.env', root))) {
  for (const line of readFileSync(new URL('.env', root), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

// ---- 제목 읽기 ------------------------------------------------------------
// 유튜브 제목의 한글은 자모가 풀어진(NFD) 형태일 수 있어 항상 NFC 로 맞춘 뒤 비교합니다.
const nfc = (s) => String(s).normalize('NFC');

const KO_ALIASES = { 계시록: 66, 요한1서: 62, 요한2서: 63, 요한3서: 64, 아가서: 22 };
const KO_NAMES = [...BOOKS.map((b) => [b.name, b.n]), ...Object.entries(KO_ALIASES)]
  .map(([name, n]) => [nfc(name).replace(/\s+/g, ''), n])
  .sort((a, b) => b[0].length - a[0].length);

const EN_NAMES = Object.entries({
  Genesis: 1, Exodus: 2, Leviticus: 3, Numbers: 4, Deuteronomy: 5, Joshua: 6, Judges: 7, Ruth: 8,
  '1 Samuel': 9, '2 Samuel': 10, '1 Kings': 11, '2 Kings': 12, '1 Chronicles': 13, '2 Chronicles': 14,
  Ezra: 15, Nehemiah: 16, Esther: 17, Job: 18, Psalms: 19, Psalm: 19, Proverbs: 20, Ecclesiastes: 21,
  'Song of Solomon': 22, 'Song of Songs': 22, Isaiah: 23, Jeremiah: 24, Lamentations: 25, Ezekiel: 26,
  Daniel: 27, Hosea: 28, Joel: 29, Amos: 30, Obadiah: 31, Jonah: 32, Micah: 33, Nahum: 34, Habakkuk: 35,
  Zephaniah: 36, Haggai: 37, Zechariah: 38, Malachi: 39, Matthew: 40, Mark: 41, Luke: 42, John: 43,
  Acts: 44, Romans: 45, '1 Corinthians': 46, '2 Corinthians': 47, Galatians: 48, Ephesians: 49,
  Philippians: 50, Colossians: 51, '1 Thessalonians': 52, '2 Thessalonians': 53, '1 Timothy': 54,
  '2 Timothy': 55, Titus: 56, Philemon: 57, Hebrews: 58, James: 59, '1 Peter': 60, '2 Peter': 61,
  '1 John': 62, '2 John': 63, '3 John': 64, Jude: 65, Revelation: 66,
}).sort((a, b) => b[0].length - a[0].length)
  .map(([name, n]) => [new RegExp(`(?<![A-Za-z0-9])${name.replace(/ /g, '\\s*')}(?![A-Za-z])`, 'i'), n]);

/** 제목에서 책 이름과 그 뒤 장 번호를 읽는다. */
const stripRes = (s) => s.replace(/(?:HD|Large|SD)?\s*\d{3,4}p\b/gi, ' '); // "HD 1080p" 같은 화질 표시는 장 번호가 아님
const okCh = (book, ch) => (ch != null && ch >= 1 && ch <= BOOKS[book - 1].ch ? ch : null);

export function parseName(title) {
  const t = stripRes(nfc(title)).replace(/\s+/g, '');
  for (const [name, n] of KO_NAMES) {
    const i = t.indexOf(name);
    if (i < 0) continue;
    const rest = t.slice(i + name.length);
    const m = rest.match(/(\d+)장/) || rest.match(/^\D{0,3}(\d+)/);
    return { book: n, ch: okCh(n, m ? Number(m[1]) : null) };
  }
  const s = stripRes(nfc(title));
  for (const [re, n] of EN_NAMES) {
    const m = re.exec(s);
    if (!m) continue;
    const c = s.slice(m.index + m[0].length).match(/^\s*[:.]?\s*(\d+)/);
    return { book: n, ch: okCh(n, c ? Number(c[1]) : null) };
  }
  return null;
}

// 1~1189 번 (성경 전체 장 번호)
const CANON = [];
BOOKS.forEach((b) => { for (let c = 1; c <= b.ch; c++) CANON.push({ book: b.n, ch: c }); });

/** 장별 재생목록 제목: 맨 앞 일련번호(예: "1189 요한계시록 22")를 가장 우선하고, 없으면 책 이름+장 */
export function parseChapterTitle(title) {
  const t = nfc(title);
  const num = t.match(/^\s*(\d{1,4})(?=\s|[.:)\-]|$)/);
  const byNum = num && +num[1] >= 1 && +num[1] <= CANON.length ? CANON[+num[1] - 1] : null;
  const nm = parseName(t);
  let byName = null;
  if (nm) {
    const ch = nm.ch ?? (BOOKS[nm.book - 1].ch === 1 ? 1 : null); // 요한이서·유다서 등 1장짜리 책
    if (ch != null) byName = { book: nm.book, ch };
  }
  if (byNum) return { ...byNum, mismatch: !!(byName && (byName.book !== byNum.book || byName.ch !== byNum.ch)) };
  return byName;
}

// 한 영상이 여러 책을 묶어서 다루는 경우
const GROUPS = [
  [/에베소서.*빌립보서.*골로새서/, [49, 50, 51]],
  [/데살로니가서/, [52, 53]],
  [/디모데서/, [54, 55]],
  [/디도.*빌레몬/, [56, 57]],
  [/베드로서/, [60, 61]],
  [/요한서신/, [62, 63, 64]],
];

/** 책별 재생목록 제목 → { books: [번호...], range?: [시작장, 끝장], label? } */
export function parseBookTitle(title) {
  const t = nfc(title);
  const flat = t.replace(/\s+/g, '');
  let books = null;
  for (const [re, list] of GROUPS) if (re.test(flat)) { books = list; break; }
  if (!books) { const nm = parseName(t); if (nm) books = [nm.book]; }
  if (!books) return null;
  const r = t.match(/(\d+)\s*~\s*(\d+)/);
  const part = (t.match(/전반부|후반부/) || [])[0];
  return {
    books,
    range: r ? [Number(r[1]), Number(r[2])] : null,
    label: r || part ? [part, r ? `${r[1]}~${r[2]}장` : ''].filter(Boolean).join(' ') : '',
  };
}

// ---- 수집 -----------------------------------------------------------------
async function viaApi(playlistId, key) {
  const items = [];
  let pageToken = '';
  do {
    const u = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    u.search = new URLSearchParams({ part: 'snippet', maxResults: '50', playlistId, key, pageToken }).toString();
    const r = await fetch(u);
    if (!r.ok) throw new Error(`YouTube API ${r.status}: ${await r.text()}`);
    const j = await r.json();
    for (const it of j.items ?? []) {
      const s = it.snippet;
      if (!s || /^(Private|Deleted) video$/i.test(s.title)) continue;
      items.push({ id: s.resourceId.videoId, title: nfc(s.title), idx: s.position });
    }
    pageToken = j.nextPageToken ?? '';
  } while (pageToken);
  return items;
}

async function viaRss(playlistId) {
  const r = await fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`);
  if (!r.ok) throw new Error(`RSS ${r.status}`);
  const xml = await r.text();
  return [...xml.matchAll(/<entry>[\s\S]*?<yt:videoId>([^<]+)<\/yt:videoId>[\s\S]*?<title>([^<]*)<\/title>/g)]
    .map((m) => ({ id: m[1], title: nfc(m[2].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")), idx: null }));
}

async function main() {
  const args = process.argv.slice(2);
  const key = process.env.YOUTUBE_API_KEY;
  const useRss = args.includes('--rss') || (args.includes('--auto') && !key);
  if (!useRss && !key) { console.error('YOUTUBE_API_KEY 가 없습니다. (.env 또는 환경변수)  키 없이 쓰려면 --rss'); process.exit(1); }

  const prev = existsSync(outUrl) ? JSON.parse(readFileSync(outUrl, 'utf8')) : null;
  const keepPrev = useRss && prev && prev.source !== 'sample';
  const out = {
    source: useRss ? 'rss' : 'youtube',
    generatedAt: new Date().toISOString(),
    bookVideos: keepPrev ? prev.bookVideos : {},
    chapterVideos: keepPrev ? prev.chapterVideos : {},
  };
  const unmatched = [];
  const mismatches = [];
  const fetchList = (pl) => (useRss ? viaRss(pl) : viaApi(pl, key));

  // 책별: 한 책에 영상이 여럿이면(예: 사도행전 전·후반부) parts 로 묶는다.
  const perBook = {};
  for (const it of await fetchList(cfg.playlists.book)) {
    const p = parseBookTitle(it.title);
    if (!p) { unmatched.push({ list: 'book', reason: '책 이름을 못 찾음', ...it }); continue; }
    for (const n of p.books) (perBook[n] ??= []).push({ id: it.id, idx: it.idx, title: it.title, label: p.label, range: p.range });
  }
  for (const [n, list] of Object.entries(perBook)) {
    const prevEntry = out.bookVideos[n];
    const known = prevEntry && [prevEntry.id, ...(prevEntry.parts ?? []).map((x) => x.id)];
    if (useRss && known && list.every((x) => known.includes(x.id))) continue; // 이미 있는 영상
    list.sort((a, b) => (a.range?.[0] ?? a.idx ?? 0) - (b.range?.[0] ?? b.idx ?? 0));
    const main = list[0];
    const entry = { id: main.id, idx: main.idx, title: main.title };
    if (list.length > 1) entry.parts = list.map(({ id, idx, title, label, range }) => ({ id, idx, title, label, range }));
    out.bookVideos[n] = entry;
  }

  // 장별
  for (const it of await fetchList(cfg.playlists.chapter)) {
    const p = parseChapterTitle(it.title);
    if (!p) { unmatched.push({ list: 'chapter', reason: '책/장을 못 찾음', ...it }); continue; }
    if (p.mismatch) mismatches.push({ ...it, 번호로읽음: `${BOOKS[p.book - 1].name} ${p.ch}장`, 이름으로읽음: parseName(it.title) });
    const k = `${p.book}-${p.ch}`;
    out.chapterVideos[k] = { id: it.id, idx: it.idx ?? out.chapterVideos[k]?.idx ?? null, title: it.title };
  }

  writeFileSync(outUrl, JSON.stringify(out, null, 1));
  writeFileSync(new URL('scripts/unmatched.json', root), JSON.stringify({ unmatched, mismatches }, null, 1));
  console.log(`[${out.source}] 책 ${Object.keys(out.bookVideos).length}/66, 장 ${Object.keys(out.chapterVideos).length}/1189, 읽지 못한 영상 ${unmatched.length}건, 번호·이름 불일치 ${mismatches.length}건 (scripts/unmatched.json)`);
}

// 테스트용으로 불러올 때만 BP_NO_MAIN=1 (Windows 경로/한글 폴더에서도 항상 실행되도록 경로 비교를 쓰지 않음)
if (!process.env.BP_NO_MAIN) main().catch((e) => { console.error(e); process.exit(1); });
