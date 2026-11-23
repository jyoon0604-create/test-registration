/**
 * ICH 교육 등록 명단 시트용 Apps Script
 *
 * 1) 등록 명단으로 쓸 Google 시트에서 [확장 프로그램] > [Apps Script]를 엽니다.
 * 2) 기본 코드를 지우고 이 파일 내용을 그대로 붙여 넣고 저장합니다.
 * 3) 왼쪽 톱니바퀴 [프로젝트 설정] > [스크립트 속성]에
 *    속성 이름 SECRET, 값은 아무도 모를 긴 문자열을 넣습니다. (Vercel의 SHEET_WEBHOOK_SECRET과 같은 값)
 * 4) [배포] > [새 배포] > 유형 [웹 앱]
 *    - 다음 사용자 인증 정보로 실행: 나
 *    - 액세스 권한이 있는 사용자: 모든 사용자
 *    배포 후 나오는 웹 앱 URL(…/exec)을 Vercel의 SHEET_WEBHOOK_URL에 넣습니다.
 */

var SHEET_NAME = '등록명단';
var HEADERS = ['제출 시각', '등록번호', '이름', '이메일', '소속', '부서·직책', '연락처', '개인정보 동의', '사진'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var body = JSON.parse(e.postData.contents);
    var secret = PropertiesService.getScriptProperties().getProperty('SECRET');
    if (!secret || body.secret !== secret) return reply({ ok: false, error: 'unauthorized' });

    var r = body.row || {};
    lock.waitLock(10000);
    var sheet = getSheet();
    sheet.appendRow([
      r.submittedAt, r.registrationId, r.name, r.email, r.organization,
      r.position, "'" + (r.phone || ''), r.consent, r.photoUrl
    ]);
    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

// 브라우저로 웹 앱 URL을 열었을 때 연결 확인용
function doGet() {
  return reply({ ok: true, message: '등록 시트 연결이 정상입니다.' });
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
