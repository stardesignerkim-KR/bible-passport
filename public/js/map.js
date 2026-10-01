import { BOOKS, bookByN } from './bible.js';
import { kstDateStr, pickToday } from './schedule.js';
import * as store from './stamps.js';
import { createPlayer, watchUrl } from './player.js';
import { $, $$, esc, loadData, renderHeader, openDialog, stampToast, statsHtml, firstVisitGuide, footerHtml, cityNo, showCard } from './common.js';

const { cfg, vids } = await loadData();
renderHeader('map', cfg);
$('#app-footer').innerHTML = footerHtml(cfg);

const today = kstDateStr();
const pick = pickToday(today, cfg.startDate, vids);
const here = pick.scheduled; // 순례 일정상 오늘 위치 (영상이 없어도 위치는 유지)
const hereBook = here ? here.book : null;

$('#locPill').textContent = `순례 ${pick.dayNo}일째`;
$('#locSub').innerHTML = here
  ? `오늘 위치: <b>${esc(bookByN(here.book).name)} ${here.ch}장</b> · ${cityNo(here.book)}번째 도시`
  : '순례를 모두 마쳤어요. 축하합니다!';

// 도시 순서: 신약(계시록→마태), 구약(말라기→창세기)
const ORDER = [...BOOKS].reverse();
const groups = [
  ['신약', ORDER.filter((b) => b.testament === '신약'), '요한계시록 → 마태복음'],
  ['구약', ORDER.filter((b) => b.testament === '구약'), '말라기 → 창세기'],
];

// ---- 한눈에: 66개 도시 칩 ----
function renderJourney() {
  $('#journey').innerHTML = ORDER.map((b) => {
    const done = store.chaptersDone(b.n, b.ch);
    const cls = [store.hasBook(b.n) ? 'done' : '', done === b.ch ? 'full' : '', b.n === hereBook ? 'here' : ''].join(' ');
    return `<button class="chip ${cls}" data-go="${b.n}" title="${esc(b.name)} ${done}/${b.ch}"><i>${cityNo(b.n)}</i>${esc(b.name)}</button>`;
  }).join('');
}

// ---- 도시 목록 ----
$('#cities').innerHTML = groups.map(([t, list, range]) => `
  <h2 class="group-h">${t} <small>${range}</small></h2>
  ${list.map((b) => `<details class="city" id="city-${b.n}" data-n="${b.n}"><summary></summary><div class="city-body"></div></details>`).join('')}
`).join('');

function summaryHtml(b) {
  const done = store.chaptersDone(b.n, b.ch);
  const pct = Math.round((done / b.ch) * 100);
  return `
    <span class="city-no">${cityNo(b.n)}</span>
    <span class="city-name">${esc(b.name)}<small>${b.ch}장</small></span>
    ${b.n === hereBook ? '<span class="tag here">오늘 위치</span>' : ''}
    ${done === b.ch ? '<span class="tag full">완주</span>' : store.hasBook(b.n) ? '<span class="tag done">도착</span>' : ''}
    <span class="city-prog"><span class="bar"><i style="width:${pct}%"></i></span><em>${done}/${b.ch}</em></span>`;
}
function bodyHtml(b) {
  const done = store.chaptersDone(b.n, b.ch);
  const hasBookVid = !!vids.bookVideos[b.n];
  let cells = '';
  for (let c = b.ch; c >= 1; c--) {
    const key = `${b.n}-${c}`;
    const vid = vids.chapterVideos[key];
    const cls = [store.hasChapter(key) ? 'done' : '', here && here.key === key ? 'here' : '', vid ? '' : 'locked'].join(' ');
    const label = `${b.name} ${c}장${vid ? '' : ' (영상 준비 중)'}`;
    cells += `<button class="step ${cls}" data-ch="${c}" ${vid ? '' : 'disabled'} title="${esc(label)}" aria-label="${esc(label)}">${c}${store.hasChapter(key) ? '<i>★</i>' : ''}</button>`;
  }
  return `
    <div class="city-tools">
      <button class="btn small ghost" data-book ${hasBookVid ? '' : 'disabled'}>도시 소개 영상 (책 요약)</button>
      ${done === b.ch ? '<button class="btn small primary" data-card>완독카드 만들기</button>' : `<span class="hint">모든 걸음 도장을 모으면 완독카드를 만들 수 있어요 (${done}/${b.ch})</span>`}
    </div>
    <div class="steps">${cells}</div>`;
}
function renderCity(el) {
  const b = bookByN(Number(el.dataset.n));
  $('summary', el).innerHTML = summaryHtml(b);
  if (el.open) $('.city-body', el).innerHTML = bodyHtml(b);
}
function renderAll() {
  $('#stats').innerHTML = statsHtml();
  renderJourney();
  $$('.city').forEach(renderCity);
}

// ---- 이벤트 ----
$('#cities').addEventListener('toggle', (e) => { if (e.target.classList?.contains('city') && e.target.open) renderCity(e.target); }, true);
$('#cities').addEventListener('click', (e) => {
  const el = e.target.closest('.city');
  if (!el) return;
  const b = bookByN(Number(el.dataset.n));
  if (e.target.closest('[data-book]')) return openModal(b, null);
  if (e.target.closest('[data-card]')) return showCard(b.n, cfg);
  const step = e.target.closest('.step');
  if (step && !step.disabled) openModal(b, Number(step.dataset.ch));
});
$('#journey').addEventListener('click', (e) => {
  const chip = e.target.closest('[data-go]');
  if (chip) goTo(Number(chip.dataset.go));
});

function goTo(n, smooth = true) {
  const el = $(`#city-${n}`);
  if (!el) return;
  el.open = true;
  renderCity(el);
  el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
}

// ---- 영상 모달 ----
function openModal(b, ch) {
  const isBook = ch == null;
  const entry = isBook ? vids.bookVideos[b.n] : vids.chapterVideos[`${b.n}-${ch}`];
  if (!entry) return;
  const playlist = isBook ? cfg.playlists.book : cfg.playlists.chapter;
  const d = openDialog(`
    <h2>${esc(b.name)}${isBook ? ' 전체 요약' : ` ${ch}장`}</h2>
    <p class="hint">${isBook ? '도시 소개 영상' : `${cityNo(b.n)}번째 도시 · ${b.ch - ch + 1}번째 걸음`} · 재생하면 도장이 찍혀요</p>
    <div class="player-box"><div class="pl"></div></div>
    <div class="dlg-actions"><a class="btn link" href="${watchUrl(entry, playlist)}" target="_blank" rel="noopener">유튜브에서 열기</a></div>`, 'player-dlg');
  const player = createPlayer($('.pl', d), {
    onFail: () => { $('.pl', d).innerHTML = `<div class="player-msg">영상을 불러오지 못했어요. 아래 ‘유튜브에서 열기’를 눌러 주세요.</div>`; },
    onPlay: (meta) => {
      const r = store.stampPlay(meta, today);
      if (r.newChapter && r.newBook) stampToast('도장이 찍혔어요!', `${b.name} 도시에 도착했습니다`);
      else if (r.newChapter) stampToast('걸음 도장이 찍혔어요!', `${b.name} ${meta.ch}장`);
      else if (r.newDate) stampToast('오늘 출석 도장이 찍혔어요!', '');
    },
  });
  player.load(entry, playlist, { autoplay: true, meta: isBook ? { kind: 'book', book: b.n } : { kind: 'chapter', book: b.n, ch } });
  d.addEventListener('close', () => player.destroy());
}

window.addEventListener('bp:change', renderAll);
renderAll();

// 오늘 위치가 기본으로 보이도록
if (hereBook) {
  goTo(hereBook, false);
  const btn = $('#btnHere'); btn.hidden = false; btn.onclick = () => goTo(hereBook);
  const target = $(`#city-${hereBook} .step.here`);
  if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'center' }));
}
firstVisitGuide();
