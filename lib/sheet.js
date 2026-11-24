// Google 시트에 붙인 Apps Script 웹앱으로 등록 정보를 한 줄 추가합니다.
export async function appendToSheet(row) {
  const url = process.env.SHEET_WEBHOOK_URL;
  const secret = process.env.SHEET_WEBHOOK_SECRET;
  if (!url || !secret) throw new Error("SHEET_WEBHOOK_URL / SHEET_WEBHOOK_SECRET 환경변수가 없습니다.");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ secret, row }),
    redirect: "follow",
    cache: "no-store",
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`시트 응답을 읽지 못했습니다 (HTTP ${res.status}). 웹앱 접근 권한이 "모든 사용자"인지 확인하세요.`);
  }
  if (!data.ok) throw new Error(`시트 저장 실패: ${data.error || "알 수 없는 오류"}`);
  return data;
}
