import { BOOKS, TOTAL_CH, bookByN } from './bible.js';
import { kstDateStr } from './schedule.js';
import * as store from './stamps.js';
import { makeCard } from './card.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const cityNo = (n) => BOOKS.length + 1 - n; // 계시록 = 1번째 말씀

export async function loadData() {
  const [cfg, vids] = await Promise.all([
    fetch('data/config.json', { cache: 'no-cache' }).then((r) => r.json()),
    fetch('data/videos.json', { cache: 'no-cache' }).then((r) => r.json()),
  ]);
  return { cfg, vids };
}

export const logoSvg = (size = 38) => `
<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
  <rect x="9" y="5" width="46" height="54" rx="9" fill="#1E2A47"/>
  <rect x="14" y="10" width="36" height="44" rx="6" fill="#3C9DFF"/>
  <path d="M18 47c7-3 7-12 14-12s7-9 14-11" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="1 5.5"/>
  <circle cx="32" cy="23" r="9" fill="#FFC53D"/>
  <path d="M32 17.5l1.9 3.8 4.2.6-3 3 .7 4.2-3.8-2-3.8 2 .7-4.2-3-3 4.2-.6z" fill="#E8504F"/>
</svg>`;

export function renderHeader(active, cfg) {
  const el = $('#app-header');
  el.className = 'site-header';
  el.innerHTML = `
    <div class="wrap header-row">
      <a class="brand" href="index.html" aria-label="${esc(cfg?.siteName ?? 'Bible and Me')}"><img src="img/logo.png" width="670" height="136" alt="${esc(cfg?.siteName ?? 'Bible and Me')}"></a>
      <nav class="nav" aria-label="화면 이동">
        <a href="index.html" class="${active === 'today' ? 'on' : ''}">오늘의 말씀</a>
        <a href="map.html" class="${active === 'map' ? 'on' : ''}">말씀의 발자취</a>
      </nav>
      <div class="header-tools">
        <button class="icon-btn" id="btnGuide" title="순례자 이용 가이드">가이드</button>
        <button class="icon-btn" id="btnAlarm" title="아침 알림">알림</button>
      </div>
    </div>`;
  $('#btnGuide').onclick = () => showGuide();
  $('#btnAlarm').onclick = () => showAlarm();
}

// ---------- 공통 다이얼로그 ----------
export function openDialog(html, cls = '') {
  const d = document.createElement('dialog');
  d.className = 'dlg ' + cls;
  d.innerHTML = `<button class="dlg-x" aria-label="닫기">×</button><div class="dlg-body">${html}</div>`;
  document.body.appendChild(d);
  const close = () => { if (d.open) d.close(); };
  $('.dlg-x', d).onclick = close;
  d.addEventListener('click', (e) => { if (e.target === d) close(); });
  d.addEventListener('close', () => d.remove());
  d.showModal();
  return d;
}

let toastTimer;
export function toast(html) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.innerHTML = html;
  t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 4200);
}
export const stampToast = (title, sub) =>
  toast(`<span class="toast-stamp"><b>★</b></span><span><strong>${esc(title)}</strong>${sub ? `<br><small>${esc(sub)}</small>` : ''}</span>`);

// ---------- 순례자 이용 가이드 ----------
export function showGuide() {
  const d = openDialog(`
    <h2>순례자 이용 가이드</h2>
    <p class="lead">Bible and Me는 <b>요한계시록에서 창세기까지, 거꾸로 걷는 성경 순례길</b>입니다. 하루 한 걸음씩 함께 걸어요.</p>
    <ol class="guide-steps">
      <li><span>1</span><div><b>말씀과 걸음</b><br>성경 한 권이 <em>말씀</em>, 한 장이 <em>한 걸음</em>입니다. 66개 말씀, 1,189걸음의 길이에요. 순례는 요한계시록 22장에서 출발합니다.</div></li>
      <li><span>2</span><div><b>오늘의 걸음</b><br>매일 한국시간 자정에 모든 순례자가 <em>같은 영상</em>을 만납니다. 첫 화면에서 바로 재생하세요.</div></li>
      <li><span>3</span><div><b>두 가지 도장</b><br>영상을 <em>재생하기만 해도</em> 도장이 찍힙니다. 끝까지 보지 않아도 괜찮아요.<br>· <b>걸음 도장</b> — 본 장(章)<br>· <b>말씀 도장</b> — 그 책의 걸음이 하나라도 찍히면 도착!</div></li>
      <li><span>4</span><div><b>지도</b><br>‘말씀의 발자취’ 화면에서 66개 말씀과 걸음을 한눈에 봅니다. 오늘 위치가 먼저 열리고, 말씀마다 책 소개 영상과 장별 영상이 있어요.</div></li>
      <li><span>5</span><div><b>완독카드</b><br>한 말씀의 모든 걸음 도장을 모으면 <em>완독카드</em>를 만들어 가족·친구에게 공유할 수 있어요.</div></li>
      <li><span>6</span><div><b>아침 알림</b><br>‘알림’에서 내 캘린더에 구독하면 매일 아침 오늘의 걸음이 알림으로 와요.</div></li>
      <li><span>7</span><div><b>기록 보관</b><br>도장은 이 기기의 브라우저에 저장됩니다. 기기를 바꿀 때는 ‘알림’ 창의 <em>복구 코드</em>를 이용하세요.</div></li>
    </ol>
    <div class="dlg-actions"><button class="btn primary" data-close>순례 시작하기</button></div>`, 'guide');
  $('[data-close]', d).onclick = () => d.close();
  d.addEventListener('close', () => store.markGuideSeen());
}

// ---------- 아침 알림 (캘린더 구독) + 복구 코드 ----------
export function showAlarm() {
  const host = location.host;
  const local = /^localhost|^127\./.test(location.hostname);
  const https = (h) => `${location.protocol}//${host}/api/calendar.ics?h=${h}`;
  const webcal = (h) => `webcal://${host}/api/calendar.ics?h=${h}`;
  const d = openDialog(`
    <h2>아침 알림 받기</h2>
    <p class="lead">내 캘린더에 ‘오늘의 걸음’을 구독하면, 앱 설치 없이 매일 아침 알림이 옵니다.</p>
    <label class="field">알림 시각 (한국시간)
      <select id="alarmHour">${[5, 6, 7, 8, 9, 12, 20].map((h) => `<option value="${h}" ${h === 7 ? 'selected' : ''}>오전/오후 ${h}시</option>`).join('')}</select>
    </label>
    <div class="dlg-actions wrap-actions">
      <a class="btn primary" id="alarmSubscribe" href="${webcal(7)}">내 캘린더에 구독하기</a>
      <button class="btn ghost" id="alarmCopy">구독 주소 복사</button>
    </div>
    <p class="hint">아이폰·맥은 ‘구독하기’ 한 번이면 끝. 안드로이드·구글 캘린더는 ‘구독 주소 복사’ 후 <b>다른 캘린더 → URL로 추가</b>에 붙여넣으세요.${local ? '<br><b>※ 지금은 내 컴퓨터(localhost)라서 구독이 안 됩니다. 배포 후 사용하세요.</b>' : ''}</p>
    <hr>
    <h3>기록 옮기기 (복구 코드)</h3>
    <p class="hint">도장 기록은 이 기기에 저장돼요. 다른 기기에서 이어서 쓰려면 아래 코드를 복사해 그 기기에서 붙여넣으세요.</p>
    <textarea id="codeBox" rows="3" spellcheck="false"></textarea>
    <div class="dlg-actions wrap-actions">
      <button class="btn ghost" id="codeCopy">내 코드 복사</button>
      <button class="btn ghost" id="codeImport">코드 가져오기</button>
    </div>
    <p class="hint" id="codeMsg" aria-live="polite"></p>`, 'alarm');
  const hourSel = $('#alarmHour', d);
  hourSel.onchange = () => { $('#alarmSubscribe', d).href = webcal(hourSel.value); };
  $('#alarmCopy', d).onclick = async () => {
    try { await navigator.clipboard.writeText(https(hourSel.value)); toast('구독 주소를 복사했어요'); } catch { prompt('구독 주소', https(hourSel.value)); }
  };
  const box = $('#codeBox', d);
  box.value = store.exportCode();
  $('#codeCopy', d).onclick = async () => {
    box.value = store.exportCode();
    try { await navigator.clipboard.writeText(box.value); $('#codeMsg', d).textContent = '복구 코드를 복사했어요.'; } catch { box.select(); }
  };
  $('#codeImport', d).onclick = () => {
    const ok = store.importCode(box.value);
    $('#codeMsg', d).textContent = ok ? '가져왔어요! 도장 기록이 합쳐졌습니다.' : '코드를 읽을 수 없어요. BP1. 로 시작하는 전체 코드를 붙여넣어 주세요.';
  };
}

// ---------- 완독카드 ----------
export async function showCard(n, cfg) {
  const b = bookByN(n);
  const d = openDialog(`<h2>${esc(b.name)} 완독카드</h2><p class="lead" id="cardState">카드를 만드는 중…</p>`, 'card-dlg');
  const siteUrl = cfg.siteUrl || location.origin;
  const blob = await makeCard({
    bookName: b.name, cityNo: cityNo(n), chapters: b.ch, date: kstDateStr(),
    siteName: cfg.siteName, siteUrl,
  });
  const url = URL.createObjectURL(blob);
  const file = new File([blob], `bible-passport-${b.name}.png`, { type: 'image/png' });
  const canShare = !!(navigator.canShare && navigator.canShare({ files: [file] }));
  $('.dlg-body', d).innerHTML = `
    <h2>${esc(b.name)} 완독카드</h2>
    <img class="card-img" src="${url}" alt="${esc(b.name)} 말씀 완주 카드">
    <div class="dlg-actions wrap-actions">
      ${canShare ? '<button class="btn primary" id="cardShare">공유하기</button>' : ''}
      <a class="btn ${canShare ? 'ghost' : 'primary'}" href="${url}" download="${esc(file.name)}">이미지 저장</a>
    </div>`;
  const sb = $('#cardShare', d);
  if (sb) sb.onclick = () => navigator.share({ files: [file], title: `${cfg.siteName} · ${b.name} 완독`, text: `${b.name} ${b.ch}걸음을 모두 걸었어요!` }).catch(() => {});
  d.addEventListener('close', () => URL.revokeObjectURL(url));
}

// ---------- 여권 요약 ----------
export function statsHtml() {
  const s = store.stats();
  return `
    <div class="stats">
      <div class="stat"><b>${s.books}<small>/${BOOKS.length}</small></b><span>말씀 도착</span></div>
      <div class="stat"><b>${s.chapters}<small>/${TOTAL_CH.toLocaleString()}</small></b><span>걸음</span></div>
    </div>`;
}

export function firstVisitGuide() {
  if (!store.guideSeen()) setTimeout(showGuide, 500);
}

export function footerHtml(cfg) {
  const pl = (id) => `https://www.youtube.com/playlist?list=${id}`;
  return `<footer class="site-footer"><div class="wrap">
    <p><b>${esc(cfg.siteName)}</b> · 영상은 유튜브 채널 <b>${esc(cfg.channelName)}</b>의 [성경책별요약] · [성경장별요약] 재생목록입니다.</p>
    <p><a href="${pl(cfg.playlists.book)}" target="_blank" rel="noopener">책별 요약 재생목록</a> · <a href="${pl(cfg.playlists.chapter)}" target="_blank" rel="noopener">장별 요약 재생목록</a></p>
  </div></footer>`;
}
