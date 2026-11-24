/**
 * ICH 교육 시트용 Apps Script (참석자 등록명단 + 연사명단)
 *
 * [처음 설치]
 * 1) 명단으로 쓸 Google 시트에서 [확장 프로그램] > [Apps Script]를 엽니다.
 * 2) 기존 코드를 모두 지우고 이 파일 내용을 그대로 붙여 넣고 저장합니다.
 * 3) 아래 SITE_URL을 실제 사이트 주소로 바꿉니다. (끝에 / 없이)
 * 4) 왼쪽 톱니바퀴 [프로젝트 설정] > [스크립트 속성]에
 *    속성 이름 SECRET, 값은 아무도 모를 긴 문자열을 넣습니다. (Vercel의 SHEET_WEBHOOK_SECRET과 같은 값)
 * 5) [배포] > [새 배포] > 유형 [웹 앱]
 *    - 다음 사용자 인증 정보로 실행: 나
 *    - 액세스 권한이 있는 사용자: 모든 사용자
 *    배포 후 나오는 웹 앱 URL(…/exec)을 Vercel의 SHEET_WEBHOOK_URL에 넣습니다.
 *
 * [코드를 바꾼 뒤] 저장만 하면 시트 메뉴·자동 링크는 바로 바뀝니다.
 * 웹사이트와 주고받는 부분까지 바꾸려면 [배포] > [배포 관리] > 연필 아이콘 > 버전 [새 버전] > [배포]를 눌러 주세요.
 * (이렇게 하면 웹 앱 URL은 그대로라 Vercel 설정은 손대지 않아도 됩니다.)
 */

// ▼ 실제 사이트 주소 (Vercel 프로젝트의 Domains에 나오는 주소)
var SITE_URL = 'https://test-registration.vercel.app';
// ▼ 연사 안내 메일에 표시할 보내는 사람 이름과 행사 정보
var MAIL_FROM_NAME = '글로벌 바이오 콘퍼런스 사무국';
var EVENT_TITLE = '2027년 글로벌 바이오 콘퍼런스';
var EVENT_WHEN = '2027년 9월 1일(수) ~ 9월 3일(금)';
var SPEAKER_DEADLINE = '등록폼 수령 후 2주 이내';

/* ───────────── 참석자 등록명단 ───────────── */

var SHEET_NAME = '등록명단';
var HEADERS = ['제출 시각', '등록번호', '이름', '이메일', '소속', '부서·직책', '연락처', '개인정보 동의', '사진'];

/* ───────────── 연사명단 ───────────── */

var SPEAKER_SHEET = '연사명단';
// 담당자는 '이름', '이메일'만 넣으면 됩니다. 나머지는 자동으로 채워져요.
var SP = {
  name: '이름', email: '이메일', link: '개인 링크', invitedAt: '링크 메일 발송일',
  profileAt: '기본정보 제출일', talkAt: '발표정보 제출일',
  nameEn: '영문 이름', phone: '연락처', organization: '소속', position: '부서·직책',
  photoUrl: '사진', bio: '약력', consent: '개인정보 동의',
  session: '발표 세션', title: '발표 제목', summary: '발표 요약', materialUrl: '발표자료',
  rehearsal: '리허설 가능 시간', recording: '녹화 동의', request: '요청 사항'
};
var SP_ORDER = ['name', 'email', 'link', 'invitedAt', 'profileAt', 'talkAt', 'nameEn', 'phone', 'organization', 'position',
  'photoUrl', 'bio', 'consent', 'session', 'title', 'summary', 'materialUrl', 'rehearsal', 'recording', 'request'];
var PROFILE_FIELDS = ['nameEn', 'phone', 'organization', 'position', 'photoUrl', 'bio', 'consent'];
var TALK_FIELDS = ['session', 'title', 'summary', 'materialUrl', 'rehearsal', 'recording', 'request'];

/* ───────────── 시트 메뉴 ───────────── */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('연사 안내')
    .addItem('연사명단 탭 만들기', 'setupSpeakerSheet')
    .addItem('빈 칸에 개인 링크 채우기', 'fillMissingLinks')
    .addSeparator()
    .addItem('개인 링크 메일 보내기 (아직 안 보낸 사람)', 'sendPendingInvites')
    .addItem('선택한 줄에 링크 메일 다시 보내기', 'resendSelectedInvites')
    .addToUi();
}

// 이름·이메일을 입력하거나 붙여 넣으면 개인 링크를 자동으로 만듭니다.
// 개인 링크 칸을 지우면 새 링크가 만들어지고 예전 링크는 더 이상 열리지 않아요.
function onEdit(e) {
  try {
    var sheet = e.range.getSheet();
    if (sheet.getName() !== SPEAKER_SHEET) return;
    var first = Math.max(2, e.range.getRow());
    var last = e.range.getLastRow();
    if (last < first) return;
    fillLinks_(sheet, first, last);
  } catch (err) {
    console.error(err);
  }
}

function setupSpeakerSheet() {
  var sheet = getSpeakerSheet_();
  SpreadsheetApp.setActiveSheet(sheet);
  SpreadsheetApp.getUi().alert('"연사명단" 탭이 준비됐어요.\n\n이름과 이메일만 넣으면 개인 링크가 자동으로 생겨요.\n엑셀에서 두 칸을 복사해 A2 칸에 붙여 넣어도 돼요.');
}

function fillMissingLinks() {
  var sheet = getSpeakerSheet_();
  var n = fillLinks_(sheet, 2, sheet.getLastRow());
  SpreadsheetApp.getUi().alert(n ? n + '명의 개인 링크를 만들었어요.' : '새로 만들 링크가 없어요. (이름·이메일이 있고 링크가 빈 줄만 만들어요)');
}

function sendPendingInvites() {
  var sheet = getSpeakerSheet_();
  fillLinks_(sheet, 2, sheet.getLastRow());
  var rows = readSpeakers_(sheet).filter(function (r) { return r.email && r.link && !r.invitedAt; });
  if (!rows.length) {
    SpreadsheetApp.getUi().alert('보낼 사람이 없어요. ("링크 메일 발송일"이 비어 있는 사람에게만 보내요)');
    return;
  }
  var ui = SpreadsheetApp.getUi();
  var ok = ui.alert(rows.length + '명에게 개인 링크 메일을 보낼까요?\n\n' +
    rows.slice(0, 10).map(function (r) { return '· ' + r.name + ' <' + r.email + '>'; }).join('\n') +
    (rows.length > 10 ? '\n… 외 ' + (rows.length - 10) + '명' : ''), ui.ButtonSet.OK_CANCEL);
  if (ok !== ui.Button.OK) return;
  var result = sendInvites_(sheet, rows);
  ui.alert(result);
}

function resendSelectedInvites() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var ui = SpreadsheetApp.getUi();
  if (sheet.getName() !== SPEAKER_SHEET) { ui.alert('"연사명단" 탭에서 보낼 사람의 줄을 선택한 뒤 눌러 주세요.'); return; }
  var range = sheet.getActiveRange();
  var first = Math.max(2, range.getRow()), last = range.getLastRow();
  if (last < first) { ui.alert('보낼 사람의 줄을 선택해 주세요.'); return; }
  fillLinks_(sheet, first, last);
  var rows = readSpeakers_(sheet).filter(function (r) { return r.row >= first && r.row <= last && r.email && r.link; });
  if (!rows.length) { ui.alert('선택한 줄에 이메일이 없어요.'); return; }
  var ok = ui.alert(rows.length + '명에게 링크 메일을 다시 보낼까요?', ui.ButtonSet.OK_CANCEL);
  if (ok !== ui.Button.OK) return;
  ui.alert(sendInvites_(sheet, rows));
}

/* ───────────── 웹사이트와 주고받기 ───────────── */

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var body = JSON.parse(e.postData.contents);
    var secret = PropertiesService.getScriptProperties().getProperty('SECRET');
    if (!secret || body.secret !== secret) return reply({ ok: false, error: 'unauthorized' });

    var action = body.action || 'register';

    if (action === 'speaker_get') {
      var found = findSpeakerByToken_(body.token);
      if (!found) return reply({ ok: false, error: 'not_found' });
      return reply({ ok: true, speaker: publicSpeaker_(found) });
    }

    if (action === 'speaker_save') {
      lock.waitLock(10000);
      var sp = findSpeakerByToken_(body.token);
      if (!sp) return reply({ ok: false, error: 'not_found' });
      var section = body.section === 'talk' ? 'talk' : 'profile';
      var fields = section === 'talk' ? TALK_FIELDS : PROFILE_FIELDS;
      var data = body.data || {};
      var updates = {};
      fields.forEach(function (k) { if (data[k] !== undefined) updates[k] = data[k]; });
      updates[section === 'talk' ? 'talkAt' : 'profileAt'] = nowText_();
      writeSpeaker_(sp.sheet, sp.row, updates);
      var saved = findSpeakerByToken_(body.token);
      return reply({ ok: true, speaker: publicSpeaker_(saved) });
    }

    if (action === 'speaker_resend') {
      var email = String(body.email || '').trim().toLowerCase();
      var sheet = getSpeakerSheet_();
      var rows = readSpeakers_(sheet).filter(function (r) { return r.email && r.email.toLowerCase() === email && r.link; });
      var cache = CacheService.getScriptCache();
      var key = 'resend_' + Utilities.base64EncodeWebSafe(email).slice(0, 200);
      if (rows.length && !cache.get(key)) { // 같은 주소로는 10분에 한 번만
        cache.put(key, '1', 600);
        lock.waitLock(10000);
        sendInvites_(sheet, rows.slice(0, 1));
      }
      // 명단에 없는 주소인지 밖에서 알 수 없도록 항상 같은 응답
      return reply({ ok: true });
    }

    // 기본: 참석자 등록 한 줄 추가
    var r = body.row || {};
    lock.waitLock(10000);
    var regSheet = getSheet();
    regSheet.appendRow([
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
  return reply({ ok: true, message: '시트 연결이 정상입니다.' });
}

/* ───────────── 내부 도우미 ───────────── */

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

function getSpeakerSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SPEAKER_SHEET);
  if (!sheet) sheet = ss.insertSheet(SPEAKER_SHEET);
  if (sheet.getLastRow() === 0) {
    var headers = SP_ORDER.map(function (k) { return SP[k]; });
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.setFrozenColumns(2);
    var head = sheet.getRange(1, 1, 1, headers.length);
    head.setFontWeight('bold').setBackground('#eef3f9');
    sheet.getRange(1, 1, 1, 2).setBackground('#fff4d6'); // 담당자가 입력하는 칸
    sheet.getRange(1, 1).setNote('담당자 입력: 이름');
    sheet.getRange(1, 2).setNote('담당자 입력: 이메일. 이름과 이메일을 넣으면 개인 링크가 자동으로 생겨요.');
    sheet.getRange(1, 3).setNote('자동 생성. 칸을 지우면 새 링크가 생기고 예전 링크는 더 이상 열리지 않아요.');
    sheet.setColumnWidth(3, 320);
  }
  return sheet;
}

function headerIndex_(sheet) {
  var lastCol = Math.max(1, sheet.getLastColumn());
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var idx = {};
  Object.keys(SP).forEach(function (k) {
    var i = headers.indexOf(SP[k]);
    if (i >= 0) idx[k] = i + 1;
  });
  // 빠진 머리글이 있으면 맨 뒤에 추가
  SP_ORDER.forEach(function (k) {
    if (!idx[k]) {
      lastCol += 1;
      sheet.getRange(1, lastCol).setValue(SP[k]).setFontWeight('bold').setBackground('#eef3f9');
      idx[k] = lastCol;
    }
  });
  return idx;
}

function readSpeakers_(sheet) {
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var idx = headerIndex_(sheet);
  var values = sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getDisplayValues();
  return values.map(function (v, i) {
    var r = { row: i + 2 };
    Object.keys(idx).forEach(function (k) { r[k] = String(v[idx[k] - 1] || '').trim(); });
    return r;
  });
}

function fillLinks_(sheet, first, last) {
  if (last < first) return 0;
  var idx = headerIndex_(sheet);
  var count = last - first + 1;
  var names = sheet.getRange(first, idx.name, count, 1).getValues();
  var emails = sheet.getRange(first, idx.email, count, 1).getValues();
  var linkRange = sheet.getRange(first, idx.link, count, 1);
  var links = linkRange.getValues();
  var base = SITE_URL.replace(/\/+$/, '') + '/speaker?t=';
  var n = 0;
  for (var i = 0; i < count; i++) {
    if (String(names[i][0]).trim() && String(emails[i][0]).trim() && !String(links[i][0]).trim()) {
      links[i][0] = base + newToken_();
      n++;
    }
  }
  if (n) linkRange.setValues(links);
  return n;
}

function newToken_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').slice(0, 32);
}

function tokenOf_(link) {
  var m = String(link || '').match(/[?&]t=([A-Za-z0-9]+)/);
  return m ? m[1] : '';
}

function findSpeakerByToken_(token) {
  token = String(token || '');
  if (!/^[A-Za-z0-9]{16,64}$/.test(token)) return null;
  var sheet = getSpeakerSheet_();
  var rows = readSpeakers_(sheet);
  for (var i = 0; i < rows.length; i++) {
    if (tokenOf_(rows[i].link) === token) { rows[i].sheet = sheet; return rows[i]; }
  }
  return null;
}

function publicSpeaker_(r) {
  var out = {};
  SP_ORDER.forEach(function (k) { if (k !== 'link' && k !== 'invitedAt') out[k] = r[k] || ''; });
  return out;
}

function writeSpeaker_(sheet, row, updates) {
  var idx = headerIndex_(sheet);
  Object.keys(updates).forEach(function (k) {
    if (!idx[k]) return;
    var v = updates[k] == null ? '' : String(updates[k]);
    if (k === 'phone') v = "'" + v; // 0으로 시작하는 번호 유지
    if (/^[=+\-@]/.test(v) && k !== 'phone') v = "'" + v; // 수식으로 해석되지 않도록
    sheet.getRange(row, idx[k]).setValue(v);
  });
}

function sendInvites_(sheet, rows) {
  var idx = headerIndex_(sheet);
  var sent = 0, failed = [];
  var quota = MailApp.getRemainingDailyQuota();
  rows.forEach(function (r) {
    if (sent >= quota) { failed.push(r.name + ' (오늘 발송 한도 초과)'); return; }
    try {
      MailApp.sendEmail({
        to: r.email,
        name: MAIL_FROM_NAME,
        subject: '[' + EVENT_TITLE + '] 연사 안내 및 정보 등록 요청',
        htmlBody: inviteHtml_(r),
        body: inviteText_(r)
      });
      sheet.getRange(r.row, idx.invitedAt).setValue(nowText_());
      sent++;
    } catch (err) {
      failed.push(r.name + ' (' + err.message + ')');
    }
  });
  return sent + '명에게 보냈어요.' + (failed.length ? '\n\n보내지 못한 사람:\n' + failed.join('\n') : '');
}

function inviteText_(r) {
  return r.name + '님, 안녕하세요.\n\n' + EVENT_TITLE + ' 연사로 함께해 주셔서 감사합니다.\n' +
    '아래 개인 링크에서 연사 안내를 확인하시고 기본정보와 발표정보를 등록해 주세요.\n\n' +
    r.link + '\n\n' +
    '- 행사 일시: ' + EVENT_WHEN + '\n- 등록 마감: ' + SPEAKER_DEADLINE + '\n\n' +
    '기본정보와 발표정보는 나눠서 제출해도 되고, 같은 링크로 언제든 다시 들어와 확인·수정할 수 있어요.\n' +
    '이 링크는 ' + r.name + '님 전용이니 다른 분께 전달하지 말아 주세요.\n\n' + MAIL_FROM_NAME + ' 드림';
}

function inviteHtml_(r) {
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  return '<div style="background:#f5f8fb;padding:24px 12px;font-family:\'Apple SD Gothic Neo\',\'Malgun Gothic\',sans-serif;color:#1f2933">' +
    '<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e3e8ef;border-radius:12px;overflow:hidden">' +
    '<div style="padding:24px 28px;border-bottom:1px solid #e3e8ef"><div style="font-size:13px;color:#1d4e89;font-weight:700">SPEAKER GUIDE</div>' +
    '<div style="font-size:20px;font-weight:700;margin-top:4px">' + esc(EVENT_TITLE) + ' 연사 안내</div></div>' +
    '<div style="padding:24px 28px;font-size:15px;line-height:1.7">' +
    '<p style="margin:0 0 12px"><b>' + esc(r.name) + '</b>님, 연사로 함께해 주셔서 감사합니다.</p>' +
    '<p style="margin:0 0 20px">아래 버튼을 눌러 연사 안내를 확인하시고, 기본정보와 발표정보를 등록해 주세요.</p>' +
    '<p style="margin:0 0 24px;text-align:center"><a href="' + esc(r.link) + '" style="display:inline-block;background:#1d4e89;color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:10px">연사 안내 · 정보 등록하기</a></p>' +
    '<table style="width:100%;font-size:14px;background:#f5f8fb;border-radius:8px" cellpadding="8">' +
    '<tr><td style="color:#5f6b7a;width:90px">행사 일시</td><td>' + esc(EVENT_WHEN) + '</td></tr>' +
    '<tr><td style="color:#5f6b7a">등록 마감</td><td><b>' + esc(SPEAKER_DEADLINE) + '</b></td></tr></table>' +
    '<p style="margin:20px 0 0;font-size:13px;color:#5f6b7a">기본정보와 발표정보는 나눠서 제출해도 되고, 같은 링크로 언제든 다시 들어와 확인·수정할 수 있어요.<br>이 링크는 ' + esc(r.name) + '님 전용이니 다른 분께 전달하지 말아 주세요.<br>버튼이 열리지 않으면: ' + esc(r.link) + '</p>' +
    '</div><div style="padding:14px 28px;border-top:1px solid #e3e8ef;font-size:12px;color:#9aa5b1">' + esc(MAIL_FROM_NAME) + '</div></div></div>';
}

function nowText_() {
  return Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm');
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
