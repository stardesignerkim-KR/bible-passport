// API 키 없이 화면을 확인하기 위한 임의(샘플) 데이터 생성
// - 영상 ID 없이 "재생목록 번호(idx)"만 채워서, 플레이어가 재생목록의 n번째 영상을 재생합니다.
// - 장 영상은 앞쪽 150개만 "업로드됨"으로 가정 (영상이 못 미치는 경우를 테스트하기 위함)
import { writeFileSync } from 'node:fs';
import { BOOKS } from '../public/js/bible.js';
import { SEQ } from '../public/js/schedule.js';

const SAMPLE_CHAPTERS = 150;
const chapterVideos = {};
SEQ.slice(0, SAMPLE_CHAPTERS).forEach((it, i) => {
  chapterVideos[it.key] = { id: null, idx: i, title: `${BOOKS[it.book - 1].name} ${it.ch}장 요약 (샘플)` };
});
const bookVideos = {};
for (let i = 0; i < BOOKS.length; i++) {
  const n = BOOKS.length - i; // 계시록(66)이 재생목록 0번
  bookVideos[n] = { id: null, idx: i, title: `${BOOKS[n - 1].name} 전체 요약 (샘플)` };
}
const out = { source: 'sample', generatedAt: new Date().toISOString(), bookVideos, chapterVideos };
writeFileSync(new URL('../public/data/videos.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(`sample: 책 ${Object.keys(bookVideos).length}개, 장 ${Object.keys(chapterVideos).length}개`);
