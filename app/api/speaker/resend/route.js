import { callSheet } from "@/lib/sheet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 개인 링크를 잃어버린 연사: 명단에 있는 이메일이면 시트(Apps Script)가 링크 메일을 다시 보냅니다.
// 명단에 있는지 없는지는 알려 주지 않습니다.
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return Response.json({ ok: false, message: "올바른 이메일 주소를 입력해 주세요." }, { status: 400 });
  }
  try {
    await callSheet("speaker_resend", { email });
  } catch (e) {
    console.error("[speaker] resend failed:", e);
  }
  return Response.json({ ok: true });
}
