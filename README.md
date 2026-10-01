# 바이블패스포트 (Bible Passport)

요한계시록 → 창세기, 거꾸로 걷는 성경 순례길. 유튜브 [성경책별요약] · [성경장별요약] 재생목록을 2개 화면으로 묶은 홈페이지.

- 화면1 `index.html` : 오늘의 걸음(공통 영상) + 순례자 여권(출석 도장 달력)
- 화면2 `map.html` : 66개 도시(책) → 걸음(장) 지도, 오늘 위치 기본 표시, 도장·완독카드
- 서버/DB/관리자 페이지 없음. 도장은 브라우저(localStorage) 저장, 알림은 캘린더 구독(.ics)

## 로컬 실행
```bash
node server.mjs        # http://localhost:3000  (Node 20+)
```
처음에는 `public/data/videos.json` 이 **샘플**(영상 ID 없이 재생목록 번호로 재생)입니다.

## 실제 데이터로 바꾸기 (API 키 받은 후)
1. 프로젝트 폴더에 `.env` 파일을 만들고 한 줄 입력: `YOUTUBE_API_KEY=발급받은키`
2. `node scripts/fetch-youtube.mjs`
3. 출력의 `매칭 실패` 건수 확인 → `scripts/unmatched.json` 에 제목을 못 읽은 영상이 나옵니다.
   (제목에서 책 이름·`N장`을 읽습니다. 형식이 다르면 `parseTitle()` 을 조정)
4. `public/data/config.json` 의 `startDate`(순례 1일차 = 계시록 22장) 확인.

## Vercel 배포
1. GitHub에 올리고 Vercel에서 Import (설정 변경 없음 — `vercel.json` 이 처리)
2. 자동 갱신: GitHub 저장소 Settings → Secrets → `YOUTUBE_API_KEY` 등록.
   `.github/workflows/refresh.yml` 이 매일 새벽 5시(KST) 재생목록을 읽어 `videos.json` 을 갱신·커밋하고, Vercel 이 자동 재배포합니다.
   (키가 없으면 RSS 최근 15개만 병합)
3. 카드·알림에 표시할 주소를 고정하려면 `config.json` 에 `"siteUrl": "https://내도메인"` 추가.

## 규칙 요약
- 오늘의 영상: 시작일 기준 하루 1장, 역순. 영상이 아직 없으면 지난 영상 중 날짜 시드 랜덤(모두에게 같은 영상).
- 날짜는 한국시간(Asia/Seoul) 자정 기준.
- 재생 시작 = 출석. 장 영상 재생 → 출석·걸음·도시 도장. 책 요약 재생 → 출석 도장만.
- 도시 도장: 그 책의 걸음 도장이 하나라도 있으면. 완독카드: 모든 걸음 도장이 있을 때.
