import nodemailer from "nodemailer";
import { EVENT } from "./event";

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function transporter() {
  const port = Number(process.env.MAIL_PORT || 465);
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST || "smtp.mailplug.co.kr",
    port,
    secure: port === 465, // 465는 SSL, 587은 STARTTLS
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
  });
}

// 등록 확인 메일 발송 (메일플러그 SMTP)
export async function sendConfirmation({ name, email, organization, registrationId }) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    throw new Error("MAIL_USER / MAIL_PASS 환경변수가 없습니다.");
  }
  const fromName = process.env.MAIL_FROM_NAME || EVENT.organizer;
  const n = escapeHtml(name);
  const subject = `[${EVENT.title}] 등록이 완료되었습니다`;

  const text = `${name}님, 안녕하세요.

${EVENT.title} 등록이 정상적으로 완료되었습니다.

- 등록번호: ${registrationId}
- 일시: ${EVENT.date} ${EVENT.time}
- 장소: ${EVENT.place}
- 소속: ${organization}

접속 안내는 행사 전에 다시 메일로 보내 드리겠습니다.
이 메일은 발신 전용입니다. 문의는 ${EVENT.contactEmail || "담당자"}에게 부탁드립니다.

${fromName} 드림`;

  const html = `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#1f2933">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#1d4e89;color:#ffffff;padding:24px 28px;font-size:20px;font-weight:700">${escapeHtml(EVENT.title)}</td></tr>
<tr><td style="padding:28px">
<p style="margin:0 0 16px;font-size:16px"><b>${n}</b>님, 등록이 완료되었습니다.</p>
<table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:14px;background:#f7f9fb;border-radius:8px">
<tr><td style="color:#52606d;width:90px">등록번호</td><td><b>${escapeHtml(registrationId)}</b></td></tr>
<tr><td style="color:#52606d">일시</td><td>${escapeHtml(EVENT.date)} ${escapeHtml(EVENT.time)}</td></tr>
<tr><td style="color:#52606d">장소</td><td>${escapeHtml(EVENT.place)}</td></tr>
<tr><td style="color:#52606d">소속</td><td>${escapeHtml(organization)}</td></tr>
</table>
<p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#52606d">접속 안내는 행사 전에 다시 메일로 보내 드리겠습니다.<br>이 메일은 발신 전용입니다.${EVENT.contactEmail ? ` 문의: ${escapeHtml(EVENT.contactEmail)}` : ""}</p>
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #e4e7eb;font-size:12px;color:#9aa5b1">${escapeHtml(fromName)}</td></tr>
</table></td></tr></table></body></html>`;

  await transporter().sendMail({
    from: { name: fromName, address: process.env.MAIL_USER },
    to: email,
    subject,
    text,
    html,
  });
}
