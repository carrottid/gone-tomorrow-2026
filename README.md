# 곤 투모로우 10주년 정산판

뮤지컬 〈곤 투모로우〉 10주년 기념 공연(2026.9.15 ~) 관람 기록·정산표 웹페이지.

- 배우 필터(페어 필터 포함) · 캐스팅 스케줄표 · 좌석 입력
- 정산판 2종(기본 / 옥균X정훈 페어) → 고화질 PNG 저장
- 기록은 각자 브라우저에 자동 저장, JSON 저장/불러오기로 백업·이동

## 폴더 구조

```
site/
├── index.html
├── manifest.webmanifest     안드로이드 홈 화면 아이콘·이름
├── css/style.css
├── js/data.js               ← 캐스트·회차·좌석배치 데이터 (일정 추가는 여기)
├── js/app.js
└── images/
    ├── logo.png             로고 (글자 흰색으로 보정한 버전)
    ├── logo-mark.png        로고에서 글자를 뺀 붓글씨만 (빨강)
    ├── logo-mark-white.png  붓글씨만 (흰색) — 아이콘 원본
    ├── icon-32.png          브라우저 탭 파비콘
    ├── icon-180.png         아이폰 홈 화면 아이콘 (apple-touch-icon)
    ├── icon-192.png         안드로이드 홈 화면 아이콘
    ├── icon-512.png         안드로이드 스플래시·고해상도 아이콘
    ├── bg-settlement.png    정산표 배경 텍스처 (추가 필요, 없으면 검정)
    └── cast/                배우 사진 (jpg, 640×870)
```

아이콘은 모두 검은 정사각형 바탕에 흰색 붓글씨입니다. 홈 화면 이름은 `index.html`의 `apple-mobile-web-app-title`과 `manifest.webmanifest`의 `short_name`("곤투 정산판")에서 바꿉니다. 아이콘을 바꾼 뒤에는 이미 홈 화면에 추가된 아이콘은 지우고 다시 추가해야 새 아이콘이 보입니다.

## 이미지 파일 규격

| 파일 | 내용 | 규격 |
|---|---|---|
| `images/bg-settlement.png` | 정산표 배경 | **1080 × 2150px** (기본 정산판 기준). 페어 정산판(1500 × 1026px)에도 같은 파일이 `cover`로 깔리므로 가운데가 중요한 무늬면 양쪽 다 확인 |
| `images/cast/okgyun-1.jpg` ~ `okgyun-6.jpg` | 강필석, 최재웅, 김경수, 송원근, 고훈정, 손동운 | 전부 **640 × 870px** (NOL 캐스트 사진과 같은 비율·구도) |
| `images/cast/jeonghun-1.jpg` ~ `jeonghun-6.jpg` | 김재범, 신성민, 백형훈, 윤소호, 원태민, 문유강 | " |
| `images/cast/gojong-1.jpg` ~ `gojong-3.jpg` | 고영빈, 박영수, 김준수 | " |
| `images/cast/iwan-1.jpg` ~ `iwan-3.jpg` | 김태한, 지현준, 신재희 | " |
| `images/cast/wada-1.jpg`, `wada-2.jpg` | 지현준, 신현준 | " |
| `images/cast/jongyun-1.jpg` | 한정우 | " |
| `images/cast/ensemble-1.jpg` ~ `ensemble-12.jpg` | 채태인, 이동명, 이종혁, 김하나, 노재현, 강현성, 김혜민, 추성욱, 신혜선, 채다원, 장이산, 최혜민 | " |
| `images/cast/swing-1.jpg` | 이주형 | " |

사진을 교체하려면 같은 이름의 jpg로 덮어쓰면 됩니다. 비율이 640:870이 아니면 가운데 기준으로 잘려서 표시됩니다.

## 일정 추가 (11.17 이후 공개 시)

`js/data.js`의 `SCHEDULE` 배열 끝에 같은 형식으로 행을 추가하면 표·집계·총 회차가 자동 반영됩니다.

```js
{ id: '1117-1930', d: '11.17', w: '화', t: '19:30', cast: ['김옥균', '한정훈', '고종', '이완', '와다'], first: [0], last: [1], tags: ['special'], mat: true, hol: true },
{ id: '1116-off',  d: '11.16', w: '월', off: true },   // 공연 없는 날
```

- `id`는 `MMDD-HHMM` 형식. 좌석 저장 키로 쓰이므로 한 번 정하면 바꾸지 마세요.
- `first` / `last`: 첫공·막공 뱃지를 붙일 역할 인덱스 (0 김옥균, 1 한정훈, 2 고종, 3 이완, 4 와다)
- `tags`: 회차 오른쪽(모바일은 일정 아래)에 붙는 칩. 여러 개 가능 (`tags: ['sign', 'gday']`)

  | 키 | 표시 | 색 |
  |---|---|---|
  | `sign` | 사인회 | `#6f9389` 청록 |
  | `special` | 스페셜 커튼콜 | `#8e6f92` 보라 |
  | `firstGreet` | 첫공 무대 인사 | `#853b56` 자주 |
  | `lastGreet` | 막공 무대 인사 | `#5a6f8b` 남색 |
  | `gday` | 그래이공DAY (혜화로운 공연생활 × YES24 전관) | `#585657` 진회색 |

  새 태그는 `js/data.js`의 `TAGS`에 `키: { label: '표시 이름', color: '#색' }` 한 줄을 추가하고 회차의 `tags`에 키를 넣으면 됩니다.
- `mat`: 마티네, `hol`: 공휴일(날짜 빨강)

## GitHub Pages 배포

현재 저장소: `carrottid/gone-tomorrow-2026` → https://carrottid.github.io/gone-tomorrow-2026/

배포는 `.github/workflows/pages.yml`(GitHub Actions)이 담당합니다. `main`에 올리면 자동으로 배포되고, 1~2분 걸립니다. 저장소 **Settings → Pages → Source**는 *GitHub Actions*여야 합니다 (기본 Jekyll 빌드는 이 저장소에서 원인 불명의 "Page build failed"가 나서 사용하지 않음).

새 저장소에 옮길 때:
1. GitHub에서 새 저장소 생성 (Public)
2. 이 `site/` 폴더 안의 파일 전부를 저장소 루트에 업로드 (`.github/workflows/pages.yml` 포함)
3. **Settings → Pages → Source = GitHub Actions**
4. `https://<계정>.github.io/<저장소명>/` 에서 접속

이후 사진이나 데이터를 바꿀 때는 해당 파일만 다시 업로드하면 됩니다. CSS/JS를 바꿨을 때는 `index.html`의 `?v=숫자`를 올려야 방문자 브라우저 캐시가 갱신됩니다 (API 업로드 스크립트는 자동으로 올림).

## JSON 불러오기 형식

두 가지를 모두 받습니다.

1. 이 사이트의 「JSON 저장」 파일: `{ "seats": { "0915-1930": "1F-B-9-8", ... } }`
2. 회차 목록 배열: `[ { "sid": "0915-1930", ..., "seats": ["1F-A-5-3"] }, ... ]` — `sid`가 이 사이트의 회차 ID와 같고, `seats` 배열의 첫 좌석을 사용합니다 (비어 있으면 미관람)

어느 쪽이든 없는 좌석·알 수 없는 회차는 걸러집니다.

## 참고

- 지현준 배우는 출연 일정에 따라 이완 역 또는 와다 역으로 출연합니다.
- 좌석은 층-구역-열-번호 형식으로 입력하세요 (예: `1F-OP-1-8`, `2F-B-3-12`). 입력하신 회차는 관람한 것으로 집계됩니다.
- 좌석배치도 표시를 원치 않으시면 `0000`을 입력하세요. 이 경우, 횟수만 집계됩니다.
- 형식이 다른 경우 좌석은 저장되지 않습니다.
- 좌석배치도는 홍익대 대학로아트센터 대극장 배치(1층 OP·A·B·C, 2층 A·B·C)를 따릅니다. `1f b 9 8`, `1층 B구역 9열 8번` 처럼 써도 자동으로 정리됩니다.
- PNG 저장은 `http(s)://`로 접속했을 때 동작합니다 (파일을 더블클릭해 `file://`로 열면 브라우저 보안 정책 때문에 실패할 수 있음).
