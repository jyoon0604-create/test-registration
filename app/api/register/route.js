import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { validateFields, validatePhoto } from "@/lib/validate";
import { appendToSheet } from "@/lib/sheet";
import { sendConfirmation } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function json(body, status = 200) {
  return Response.json(body, { status });
}

function makeRegistrationId() {
  const d = new Date(Date.now() + 9 * 3600 * 1000); // 한국 시간
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, "");
  return `ICH-${ymd}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

export async function POST(request) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, message: "요청을 읽지 못했어요. 사진 용량을 줄여 다시 시도해 주세요." }, 400);
  }

  // 스팸 방지용 숨김 칸: 사람이 채울 일이 없으므로 값이 있으면 조용히 성공 처리
  if (form.get("website")) return json({ ok: true, registrationId: "-" });

  const fields = {
    name: String(form.get("name") || "").trim(),
    email: String(form.get("email") || "").trim().toLowerCase(),
    organization: String(form.get("organization") || "").trim(),
    position: String(form.get("position") || "").trim(),
    phone: String(form.get("phone") || "").trim(),
    consent: form.get("consent") === "on" || form.get("consent") === "true",
  };
  const photo = form.get("photo");

  const errors = validateFields(fields);
  const photoError = validatePhoto(photo && typeof photo === "object" ? photo : null);
  if (photoError) errors.photo = photoError;
  if (Object.keys(errors).length) return json({ ok: false, message: "입력 내용을 확인해 주세요.", errors }, 400);

  const registrationId = makeRegistrationId();

  // 1) 사진을 Vercel Blob에 저장
  let photoUrl;
  if (!process.env.BLOB_READ_WRITE_TOKEN && process.env.NODE_ENV !== "production") {
    photoUrl = "(로컬 테스트: 사진 미저장)";
  } else try {
    const blob = await put(`photos/${registrationId}.${EXT[photo.type]}`, photo, {
      access: "public",
      addRandomSuffix: true,
      contentType: photo.type,
    });
    photoUrl = blob.url;
  } catch (e) {
    console.error("[register] photo upload failed:", e);
    return json({ ok: false, message: "사진 저장 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요." }, 500);
  }

  // 2) Google 시트에 기록
  const submittedAt = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  try {
    await appendToSheet({
      submittedAt,
      registrationId,
      ...fields,
      consent: fields.consent ? "동의" : "",
      photoUrl,
    });
  } catch (e) {
    console.error("[register] sheet append failed:", e);
    return json({ ok: false, message: "등록 저장 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요." }, 500);
  }

  // 3) 확인 메일 발송. 실패해도 등록은 이미 저장됐으므로 성공으로 응답합니다.
  let mailSent = true;
  try {
    await sendConfirmation({ ...fields, registrationId });
  } catch (e) {
    mailSent = false;
    console.error("[register] confirmation mail failed:", e);
  }

  return json({ ok: true, registrationId, mailSent });
}
