import { BOOKS, bookByN } from './bible.js';
import { kstDateStr, pickToday, pickBookEntry } from './schedule.js';
import * as store from './stamps.js';
import { createPlayer, watchUrl } from './player.js';
import { $, esc, loadData, renderHeader, showAlarm, stampToast, firstVisitGuide, footerHtml, cityNo } from './common.js';

const { cfg, vids } = await loadData();
renderHeader('today', cfg);
$('#app-footer').innerHTML = footerHtml(cfg);
$('#ctaAlarm').onclick = showAlarm;

const today = kstDateStr();
const pick = pickToday(today, cfg.startDate, vids);
const item = pick.item;
const book = item ? bookByN(item.book) : null;
const sched = pick.scheduled;

// ---- 헤더 영역 ----
$('#dayPill').textContent = `순례 ${pick.dayNo}일째 · ${today}`;
if (!item) {
  $('#todayTitle').textContent = '오늘의 영상을 준비하고 있어요';
  $('#todaySub').textContent = '조금만 기다려 주세요.';
} else {
  $('#todayTitle').innerHTML = `오늘의 걸음 <em>${esc(book.name)} ${item.ch}장</em>`;
  const stepNo = book.ch - item.ch + 1;
  let sub = `${cityNo(book.n)}번째 말씀 ${esc(book.name)} · ${stepNo}번째 걸음 (${book.testament})`;
  if (pick.fallback && sched) {
    const sb = bookByN(sched.book);
    sub += `<br><span class="note">오늘의 위치는 ${esc(sb.name)} ${sched.ch}장이지만 영상이 아직 올라오지 않아, 지난 영상 중 하나를 골랐어요. (모든 순례자에게 같은 영상입니다)</span>`;
  }
  $('#todaySub').innerHTML = sub;
}

// ---- 플레이어 ----
const playerBox = $('#playerBox');
const msg = $('#playerMsg');
let current = null; // {entry, playlist, meta}
const bookEntry = item ? pickBookEntry(vids.bookVideos[item.book], item.ch) : null;

function fail() {
  msg.hidden = false;
  msg.innerHTML = `영상을 불러오지 못했어요.${current ? ` <a href="${watchUrl(current.entry, current.playlist)}" target="_blank" rel="noopener">유튜브에서 열기</a>` : ''}`;
}
const player = createPlayer($('#player'), {
  onFail: fail,
  onPlay: (meta) => {
    const r = store.stampPlay(meta, today);
    if (r.newChapter && r.newBook) stampToast('도장이 찍혔어요!', `${bookByN(meta.book).name} 말씀에 도착했습니다`);
    else if (r.newChapter) stampToast('걸음 도장이 찍혔어요!', `${bookByN(meta.book).name} ${meta.ch}장`);
  },
});

let showing = 'chapter';
function show(kind, autoplay = false) {
  msg.hidden = true;
  if (kind === 'book') {
    current = { entry: bookEntry, playlist: cfg.playlists.book, meta: { kind: 'book', book: item.book } };
    $('#btnBook').textContent = '오늘의 걸음으로 돌아가기';
  } else {
    current = { entry: vids.chapterVideos[item.key], playlist: cfg.playlists.chapter, meta: { kind: 'chapter', book: item.book, ch: item.ch } };
    $('#btnBook').textContent = `말씀 소개 영상 · ${book.name} 전체 요약`;
  }
  player.load(current.entry, current.playlist, { autoplay, meta: current.meta });
  const yt = $('#ytLink');
  yt.hidden = false; yt.href = watchUrl(current.entry, current.playlist);
  showing = kind;
}
if (item) {
  show('chapter');
  if (bookEntry) {
    const b = $('#btnBook'); b.hidden = false;
    b.onclick = () => show(showing === 'chapter' ? 'book' : 'chapter', true);
  }
} else {
  playerBox.classList.add('empty');
  msg.hidden = false; msg.textContent = '곧 만나요!';
}

firstVisitGuide();
