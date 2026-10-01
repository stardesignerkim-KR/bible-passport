// YouTube IFrame Player 래퍼 — 임베드 재생 + "재생 시작" 감지(도장용)
let apiPromise = null;

function loadApi() {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    if (window.YT && window.YT.Player) return resolve();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev && prev(); resolve(); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => reject(new Error('YouTube API 로드 실패'));
    document.head.appendChild(s);
    setTimeout(() => reject(new Error('YouTube API 시간 초과')), 10000);
  });
  apiPromise.catch(() => { apiPromise = null; });
  return apiPromise;
}

export const watchUrl = (entry, playlistId) =>
  entry?.id ? `https://www.youtube.com/watch?v=${entry.id}` : `https://www.youtube.com/playlist?list=${playlistId}`;

/**
 * container 안에 플레이어를 만든다.
 * load(entry, playlistId, {autoplay, meta}) — entry.id 가 있으면 그 영상, 없으면 재생목록의 idx번째 영상.
 * 재생이 시작되면 영상마다 한 번 onPlay(meta) 호출.
 */
export function createPlayer(container, { onPlay, onFail } = {}) {
  const host = document.createElement('div');
  container.innerHTML = '';
  container.appendChild(host);
  let player = null;
  let pending = null;
  let meta = null;
  let fired = false;
  let destroyed = false;

  async function ensure(first) {
    try { await loadApi(); } catch (e) { onFail && onFail(e); return null; }
    if (destroyed) return null;
    if (player) return player;
    return new Promise((resolve) => {
      const vars = { rel: 0, playsinline: 1, modestbranding: 1, hl: 'ko' };
      const opts = { width: '100%', height: '100%', playerVars: vars, events: {
        onReady: () => resolve(player),
        onStateChange: (e) => {
          if (e.data === 1 && !fired && meta) { fired = true; onPlay && onPlay(meta); } // 1 = PLAYING
        },
        onError: (e) => onFail && onFail(new Error('player error ' + e.data)),
      } };
      if (first.entry.id) opts.videoId = first.entry.id;
      player = new window.YT.Player(host, opts);
      if (!first.entry.id) setTimeout(() => resolve(player), 800);
    });
  }

  async function load(entry, playlistId, { autoplay = false, meta: m = null } = {}) {
    meta = m; fired = false;
    pending = { entry, playlistId, autoplay };
    const p = await ensure(pending);
    if (!p || destroyed) return;
    const cur = pending; // 대기 중 마지막 요청만 반영
    const isFirstVideo = cur.entry.id && p.getVideoData && p.getVideoData().video_id === cur.entry.id && !cur.autoplay;
    try {
      if (cur.entry.id) {
        if (isFirstVideo) return;
        cur.autoplay ? p.loadVideoById(cur.entry.id) : p.cueVideoById(cur.entry.id);
      } else {
        const spec = { listType: 'playlist', list: cur.playlistId, index: cur.entry.idx ?? 0 };
        cur.autoplay ? p.loadPlaylist(spec) : p.cuePlaylist(spec);
      }
    } catch (e) { onFail && onFail(e); }
  }

  return {
    load,
    destroy() { destroyed = true; try { player && player.destroy(); } catch {} container.innerHTML = ''; },
  };
}
