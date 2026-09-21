# 곤 투모로우 10주년 정산판

뮤지컬 〈곤 투모로우〉 10주년 기념 공연(2026.9.15 ~) 관람 기록·정산표 웹페이지.

- 배우 필터(페어 필터 포함) · 캐스팅 스케줄표 · 좌석 입력
- 정산판 2종(기본 / 옥균X정훈 페어) → 고화질 PNG 저장
- 기록은 각자 브라우저에 자동 저장, JSON 저장/불러오기로 백업·이동

## 폴더 구조

```
site/
├── index.html
├── css/style.css
├── js/data.js      ← 캐스트·회차·좌석배치 데이터 (일정 추가는 여기)
├── js/app.js
└── images/
    ├── logo.png             로고 (있음)
    ├── bg-settlement.png    정산표 배경 텍스처 (추가 필요, 없으면 검정)
    └── cast/                배우 사진 (jpg, 640×870)
```

## 이미지 파일 규격

| 파일 | 내용 | 규격 |
|---|---|---|
| `images/bg-settlement.png` | 정산표 배경 | **1080 × 2100px** (기본 정산판 기준). 페어 정산판(1500 × 1026px)에도 같은 파일이 `cover`로 깔리므로 가운데가 중요한 무늬면 양쪽 다 확인 |
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
- `tags`: `sign`(사인회) `special`(스페셜 커튼콜) `firstGreet`(첫공 무대 인사) `lastGreet`(막공 무대 인사)
- `mat`: 마티네, `hol`: 공휴일(날짜 빨강)

## GitHub Pages 배포

1. GitHub에서 새 저장소 생성 (예: `gone-tomorrow-2026`, Public)
2. 이 `site/` 폴더 안의 파일 전부를 저장소 루트에 업로드 (웹에서 "Add file → Upload files" 드래그 앤 드롭 가능)
3. 저장소 **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main` / `/ (root)` → Save
4. 1~2분 뒤 `https://<계정>.github.io/<저장소명>/` 에서 접속

이후 사진이나 데이터를 바꿀 때는 해당 파일만 다시 업로드하면 됩니다.

## 참고

- 좌석 형식: 층-구역-열-번호, 예) `1F-OP-1-8`, `2F-B-3-12`. `1f b 9 8`, `1층 B구역 9열 8번` 처럼 써도 자동으로 정리됩니다.
- 좌석배치도는 홍익대 대학로아트센터 대극장 배치(1층 OP·A·B·C, 2층 A·B·C)를 따릅니다. 존재하지 않는 좌석을 입력하면 주황색으로 표시되지만 관람 횟수에는 포함됩니다.
- PNG 저장은 `http(s)://`로 접속했을 때 동작합니다 (파일을 더블클릭해 `file://`로 열면 브라우저 보안 정책 때문에 실패할 수 있음).
