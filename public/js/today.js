import { BOOKS, bookByN } from './bible.js';
import { kstDateStr, pickToday } from './schedule.js';
import * as store from './stamps.js';
import { createPlayer, watchUrl } from './player.js';
import { $, esc, loadData, renderHeader, showAlarm, stampToast, statsHtml, firstVisitGuide, footerHtml, cityNo } from './common.js';

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
  let sub = `${cityNo(book.n)}번째 도시 ${esc(book.name)} · ${stepNo}번째 걸음 (${book.testament})`;
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
const bookEntry = item ? vids.bookVideos[item.book] : null;

function fail() {
  msg.hidden = false;
  msg.innerHTML = `영상을 불러오지 못했어요.${current ? ` <a href="${watchUrl(current.entry, current.playlist)}" target="_blank" rel="noopener">유튜브에서 열기</a>` : ''}`;
}
const player = createPlayer($('#player'), {
  onFail: fail,
  onPlay: (meta) => {
    const r = store.stampPlay(meta, today);
    if (r.newChapter && r.newBook) stampToast('도장이 찍혔어요!', `${bookByN(meta.book).name} 도시에 도착했습니다`);
    else if (r.newChapter) stampToast('걸음 도장이 찍혔어요!', `${bookByN(meta.book).name} ${meta.ch}장`);
    else if (r.newDate) stampToast('오늘 출석 도장이 찍혔어요!', '내일도 같은 시간에 만나요');
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
    $('#btnBook').textContent = `도시 소개 영상 · ${book.name} 전체 요약`;
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

// ---- 여권(통계 + 월 달력) ----
let view = { y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) };
const startYM = { y: Number(cfg.startDate.slice(0, 4)), m: Number(cfg.startDate.slice(5, 7)) };
const ymNum = (v) => v.y * 12 + v.m;

function renderPassport() {
  $('#stats').innerHTML = statsHtml();
  const { y, m } = view;
  $('#calTitle').textContent = `${y}년 ${m}월`;
  $('#calPrev').disabled = ymNum(view) <= ymNum(startYM);
  $('#calNext').disabled = ymNum(view) >= ymNum({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) });
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
  let h = ['일', '월', '화', '수', '목', '금', '토'].map((w) => `<div class="cal-w">${w}</div>`).join('');
  for (let i = 0; i < first; i++) h += '<div></div>';
  for (let d = 1; d <= dim; d++) {
    const ds = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const stamped = store.hasDay(ds);
    const rot = ((d * 37) % 21) - 10;
    h += `<div class="cal-d ${stamped ? 'stamped' : ''} ${ds === today ? 'today' : ''} ${ds > today ? 'future' : ''}" title="${ds}${stamped ? ' · 출석' : ''}">` +
      (stamped ? `<span class="stamp" style="--rot:${rot}deg"><i>★</i></span>` : '') + `<em>${d}</em></div>`;
  }
  $('#cal').innerHTML = h;
}
$('#calPrev').onclick = () => { view = view.m === 1 ? { y: view.y - 1, m: 12 } : { y: view.y, m: view.m - 1 }; renderPassport(); };
$('#calNext').onclick = () => { view = view.m === 12 ? { y: view.y + 1, m: 1 } : { y: view.y, m: view.m + 1 }; renderPassport(); };
window.addEventListener('bp:change', renderPassport);
renderPassport();
firstVisitGuide();
