# ICH 가이드라인 교육 참석자 등록 (테스트)

참석자가 등록 폼을 제출하면 다음이 자동으로 처리됩니다.

1. 사진을 **Vercel Blob**(Private)에 저장
2. 등록 정보와 사진 보기 링크를 **Google 시트**에 한 줄 추가
3. 입력한 이메일로 **등록 확인 메일** 발송 (메일플러그 SMTP)

행사 정보(가상 일정: 2026년 12월 15일 화 14:00~17:00)는 `lib/event.js`에서 고칠 수 있어요.

## 설정 순서

### 1. Google 시트 연결
1. 새 Google 시트를 만듭니다. (예: "ICH 교육 등록 명단")
2. [확장 프로그램] > [Apps Script]를 열고, `apps-script/Code.gs` 내용을 붙여 넣고 저장합니다.
3. [프로젝트 설정] > [스크립트 속성]에 `SECRET` 속성을 추가하고 아무도 모를 긴 문자열을 넣습니다.
4. [배포] > [새 배포] > 유형 **웹 앱**, 실행 사용자 **나**, 액세스 **모든 사용자**로 배포합니다. 권한 승인 창이 뜨면 허용합니다.
5. 나온 웹 앱 URL(`…/exec`)을 복사해 둡니다. 브라우저로 열었을 때 `"ok":true`가 보이면 정상입니다.

### 2. Vercel 연결
1. Vercel에서 [Add New] > [Project]로 이 저장소를 가져옵니다. 설정은 기본값 그대로 두면 됩니다.
2. 프로젝트의 [Storage] 탭에서 **Blob** 저장소를 만들어 연결합니다. (Private 권장. 환경변수 접두어는 기본값 그대로)
   - Public 저장소를 쓴다면 환경변수 `BLOB_ACCESS=public`을 추가합니다.
3. [Settings] > [Environment Variables]에 아래 값을 넣습니다.

| 이름 | 값 |
|---|---|
| `MAIL_HOST` | `smtp.mailplug.co.kr` |
| `MAIL_PORT` | `465` |
| `MAIL_USER` | 보내는 회사 메일 주소 |
| `MAIL_PASS` | 그 메일의 비밀번호 |
| `MAIL_FROM_NAME` | 보내는 사람 이름 (예: ICH 교육 담당자) |
| `SHEET_WEBHOOK_URL` | 1단계에서 복사한 웹 앱 URL |
| `SHEET_WEBHOOK_SECRET` | 1단계의 `SECRET`과 같은 값 |

4. [Deployments]에서 다시 배포(Redeploy)하면 적용됩니다.

**확인 메일 끄기:** 환경변수 `MAIL_ENABLED=false`를 추가하고 다시 배포하면 메일 없이 등록만 저장됩니다. 다시 켜려면 값을 `true`로 바꾸거나 지우고 다시 배포하세요.

> 메일플러그에서 외부 SMTP 발송이 막혀 있으면 메일만 실패하고 등록은 시트에 저장됩니다. 이 경우 메일플러그 관리자 설정에서 SMTP 사용을 허용해 주세요. 실패 원인은 Vercel [Logs]에서 `confirmation mail failed`로 확인할 수 있어요.

## 로컬에서 실행
```bash
npm install
cp .env.example .env.local   # 값 채우기
npm run dev                  # http://localhost:3000
```
로컬에서 `BLOB_READ_WRITE_TOKEN`이 없으면 사진은 저장하지 않고 넘어갑니다.

## 개인정보 주의
- 사진은 Private Blob에 저장되고, 시트에는 서명된 보기 링크(`/api/photo?p=…&s=…`)가 남습니다. 링크를 아는 사람은 사진을 볼 수 있으니 시트 공유 범위를 담당자로 제한해 주세요.
- 링크 서명에는 `SHEET_WEBHOOK_SECRET`을 씁니다. 이 값을 바꾸면 예전 사진 링크는 열리지 않습니다. (`PHOTO_LINK_SECRET`을 따로 두면 그 값을 사용)
- 폼의 개인정보 안내 문구(보유 기간 등)는 회사 정책에 맞게 `app/RegistrationForm.js`에서 고쳐 주세요.
