# 하루 단어 · 공무원 영어 단어장

React + Vite 정적 웹앱이며, Supabase 로그인으로 학습 기록을 여러 기기에서 동기화합니다.

## 학습 기능

- **20일 단어장**: DAY 01~20 중 하나를 선택해 해당 일차만 학습합니다.
- **추가 단어**: 하프모의고사 등에서 발견한 단어를 책과 별도로 학습합니다.
- **전체 단어**: 책의 모든 일차와 추가 단어를 함께 복습합니다.
- 모든 범위에서 플래시카드, 단어 → 뜻 테스트, 예문 O/X, 검색 가능한 목록을 제공합니다.
- 테스트는 단어를 무작위로 한 번씩 출제하며 결과와 틀린 단어 재학습을 제공합니다. 같은 뜻의 선택지는 중복되지 않습니다. 뜻이 하나뿐인 범위는 뜻을 공개한 뒤 스스로 확인합니다.
- 예문 O/X는 기존 기능과 같은 **자기 평가**입니다. 예문 속 단어의 뜻을 알면 O, 모르겠으면 X입니다. 문장의 참/거짓 문제는 아닙니다. X를 누르면 단어 뜻과 **예문 전체 해석**을 함께 보여줍니다. O를 눌러도 해석을 확인할 수 있으며, 예문 없는 단어는 제외합니다.
- 아는 단어도 출제 대상에 남으므로 전체 범위를 계속 복습할 수 있습니다.
- 모바일 학습 화면은 기기 높이에 맞춰 표시합니다. 상단에서 단어장·일차를 선택하고, 긴 예문과 전체 해석은 내용 넘기기 버튼으로 읽습니다. 학습 중에는 페이지 스크롤 없이 다음 문제로 이동할 수 있으며, 단어 목록만 별도로 스크롤됩니다.
- 단어 원본은 JSON, 학습 기록은 브라우저에 먼저 저장합니다. Supabase에 로그인하면 설정, 아는 단어, 정답/시도 기록과 카드·퀴즈 진행 위치가 자동으로 동기화되어 다른 PC에서도 이어집니다. 추가 단어 목록과 문법 문제 목록도 계정별로 저장됩니다. 처음 로그인할 때 클라우드 기록이 없으면 현재 브라우저 기록을 올리고, 기록이 있으면 클라우드 기록을 불러옵니다. JSON 문제 내용이 바뀐 범위의 진행 위치는 새로 시작합니다.

## 실행 및 검증

Node.js 22.13 이상이 필요합니다.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

`npm run build`는 JSON 검증과 TypeScript 검사를 통과한 뒤 `dist/`에 정적 파일을 만듭니다.

## 단어 등록

책의 실제 단어는 아직 제공되지 않아 20일 모두 빈 배열로 시작합니다. 기존 원격 DB의 내용은 이 저장소에 포함되어 있지 않으며 자동 이관되지 않습니다. 필요하면 내보낸 데이터를 받아 JSON으로 옮깁니다.

Codex에 “이 단어들을 3일차에 등록해줘” 또는 “이 단어들을 하프모의고사 추가 단어로 등록해줘”라고 요청하면 아래 JSON을 수정합니다. 사이트에서 직접 단어를 추가하거나 삭제하는 기능은 없습니다. 수정 내용을 GitHub main에 반영하면 자동 재배포됩니다.

### 책: `data/textbook.json`

`title`과 `days` 배열을 유지하고, 해당 일차의 `words`에 추가합니다. 일차는 1~20이 각각 한 번씩 있어야 합니다.

```json
{
  "day": 1,
  "words": [
    {
      "id": "day01-abandon",
      "word": "abandon",
      "meaning": "버리다; 포기하다",
      "example": "They had to abandon the plan.",
      "exampleMeaning": "그들은 그 계획을 포기해야 했다.",
      "note": "동사",
      "source": "단어장 1일차"
    }
  ]
}
```

### 추가 단어: `data/extra.json`

```json
{
  "words": [
    {
      "id": "extra-reluctant",
      "word": "reluctant",
      "meaning": "꺼리는; 내키지 않는",
      "example": "He was reluctant to answer.",
      "exampleMeaning": "그는 대답하기를 꺼렸다.",
      "source": "하프모의고사 1회"
    }
  ]
}
```

필수 항목은 `id`, `word`, `meaning`입니다. 예문을 등록할 때는 `example`과 문장 전체의 한국어 해석인 `exampleMeaning`을 반드시 함께 등록합니다. 해석이 빠진 예문은 데이터 검증에서 거부합니다. `note`와 `source`는 선택 항목입니다. `id`는 두 파일 전체에서 고유해야 합니다. 학습 기록과 연결되므로 등록 후 유지하세요. 같은 영단어를 서로 다른 일차/추가 단어에 넣을 때는 각각 다른 ID를 사용합니다. 책의 일차와 단어 순서를 그대로 유지하며, 전달받지 않은 책 내용을 임의로 추가하지 않습니다.

## GitHub Pages 배포

1. 변경 사항을 `leegh519/voca-app` 저장소의 `main`에 커밋하고 푸시합니다.
2. GitHub **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 선택합니다.
3. **Actions → Deploy vocabulary to GitHub Pages → Run workflow**를 실행하거나 main에 새 변경을 푸시합니다.
4. 성공 후 `https://leegh519.github.io/voca-app/`에서 접속합니다.

`.github/workflows/pages.yml`은 테스트, 데이터 검증, 빌드 후 배포합니다. Pages 설정에서 가져온 `base_path`를 사용하므로 저장소 하위 경로와 사용자/커스텀 도메인 루트를 모두 지원합니다. 프런트엔드는 Supabase publishable key만 사용하며, 사용자별 데이터는 RLS 정책으로 보호합니다.

하위 경로로 로컬 검증하려면:

```sh
BASE_PATH=/voca-app/ npm run build
BASE_PATH=/voca-app/ npm run preview
```

출처: [Vite 정적 배포 안내](https://vite.dev/guide/static-deploy#github-pages), [GitHub Pages 배포 소스 설정](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## 문법 O/X

**문법 O/X** 탭에서는 밑줄 친 부분의 문법이 맞는지 고릅니다. 단어/뜻 자기 평가와 달리 등록된 정답으로 자동 채점합니다. 틀리면 정답, 수정 표현, 짧은 해설을 보여줍니다. 맞힌 문제도 해설을 확인할 수 있으며, 마지막에 점수와 틀린 문제만 다시 풀기를 제공합니다.

문법은 20일 단어장/추가 단어와 별도의 문제 모음입니다. 웹 등록 화면은 없으며 “이 문법 문제 등록해줘”라고 요청하면 `data/grammar.json`을 수정합니다. 초기 문제는 비어 있습니다. 단어 학습 기록과 별개로 문법 점수와 풀던 위치도 현재 브라우저에 저장되며 새로고침 후 이어집니다. 문법 JSON이 바뀌면 진행 중인 문법 세션은 새로 시작합니다.

```json
{
  "questions": [
    {
      "id": "grammar-001",
      "before": "She ",
      "underlined": "go",
      "after": " to school every day.",
      "isCorrect": false,
      "correction": "goes",
      "explanation": "주어가 3인칭 단수이고 현재시제이므로 goes를 씁니다.",
      "source": "하프모의고사 1회"
    }
  ]
}
```

`before` + `underlined` + `after`가 원문입니다. 공백과 문장부호를 그대로 유지하고, 밑줄은 `underlined` 구간에만 표시합니다. `isCorrect`는 맞는 표현이면 `true`(O), 틀린 표현이면 `false`(X)입니다. `explanation`은 짧은 한국어 해설로 필수이며, X 문제는 올바른 표현인 `correction`도 필수입니다. `source`는 선택입니다. 모바일에서도 밑줄을 유지하며, 긴 문장·해설은 페이지를 넘겨 스크롤 없이 읽을 수 있습니다.
