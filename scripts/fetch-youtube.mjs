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

// ---- 제목 → (책, 장) 파싱 ---------------------------------------------
const ALIASES = {
  계시록: 66, 요한1서: 62, 요한2서: 63, 요한3서: 64, 아가서: 22,
};
const NAMES = [
  ...BOOKS.map((b) => [b.name, b.n]),
  ...Object.entries(ALIASES),
].map(([name, n]) => [name.replace(/\s+/g, ''), n]).sort((a, b) => b[0].length - a[0].length);

export function parseTitle(title) {
  const t = String(title).replace(/\s+/g, '');
  for (const [name, n] of NAMES) {
    const i = t.indexOf(name);
    if (i < 0) continue;
    const rest = t.slice(i + name.length);
    const m = rest.match(/(\d+)장/) || rest.match(/^\D{0,3}(\d+)/);
    return { book: n, ch: m ? Number(m[1]) : null };
  }
  return null;
}

// ---- 수집 ---------------------------------------------------------------
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
      items.push({ id: s.resourceId.videoId, title: s.title, idx: s.position });
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
    .map((m) => ({ id: m[1], title: m[2].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'"), idx: null }));
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
  const fetchList = (pl) => (useRss ? viaRss(pl) : viaApi(pl, key));

  for (const it of await fetchList(cfg.playlists.book)) {
    const p = parseTitle(it.title);
    if (!p) { unmatched.push({ list: 'book', ...it }); continue; }
    out.bookVideos[p.book] = { id: it.id, idx: it.idx ?? out.bookVideos[p.book]?.idx ?? null, title: it.title };
  }
  for (const it of await fetchList(cfg.playlists.chapter)) {
    const p = parseTitle(it.title);
    if (!p || !p.ch) { unmatched.push({ list: 'chapter', ...it }); continue; }
    const key2 = `${p.book}-${p.ch}`;
    out.chapterVideos[key2] = { id: it.id, idx: it.idx ?? out.chapterVideos[key2]?.idx ?? null, title: it.title };
  }

  writeFileSync(outUrl, JSON.stringify(out, null, 1));
  writeFileSync(new URL('scripts/unmatched.json', root), JSON.stringify(unmatched, null, 1));
  console.log(`[${out.source}] 책 ${Object.keys(out.bookVideos).length}/66, 장 ${Object.keys(out.chapterVideos).length}/1189, 매칭 실패 ${unmatched.length}건 (scripts/unmatched.json)`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
