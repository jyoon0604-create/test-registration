import { put } from "@vercel/blob";
import { callSheet } from "@/lib/sheet";
import { photoViewUrl } from "@/lib/photoLink";
import { validateSection, MAX_UPLOAD_BYTES, PHOTO_TYPES, MATERIAL_EXT } from "@/lib/speaker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const TOKEN_RE = /^[A-Za-z0-9]{16,64}$/;

// 개인 링크(?t=…)로 들어온 연사의 저장된 정보를 불러옵니다.
export async function GET(request) {
  const t = new URL(request.url).searchParams.get("t") || "";
  if (!TOKEN_RE.test(t)) return json({ ok: false, message: "링크가 올바르지 않아요." }, 404);
  try {
    const data = await callSheet("speaker_get", { token: t });
    if (!data.ok) return json({ ok: false, message: "링크가 만료됐거나 올바르지 않아요. 담당자에게 문의해 주세요." }, 404);
    return json({ ok: true, speaker: data.speaker });
  } catch (e) {
    console.error("[speaker] get failed:", e);
    return json({ ok: false, message: "정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요." }, 500);
  }
}

async function upload(file, token, kind, origin) {
  const ext = kind === "photo"
    ? { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file.type]
    : file.name.split(".").pop().toLowerCase();
  const access = process.env.BLOB_ACCESS || "private";
  const blobConfigured = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID;
  if (!blobConfigured && process.env.NODE_ENV !== "production") return `(로컬 테스트: ${file.name} 미저장)`;
  const blob = await put(`speakers/${token.slice(0, 8)}/${kind}.${ext}`, file, {
    access, addRandomSuffix: true, contentType: file.type || undefined,
  });
  return access === "public" ? blob.url : photoViewUrl(origin, blob.pathname);
}

// 단계별 저장: section=profile(기본정보) 또는 talk(발표정보)
export async function POST(request) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, message: "요청을 읽지 못했어요. 파일 용량을 줄여 다시 시도해 주세요." }, 400);
  }
  const t = String(form.get("t") || "");
  const section = form.get("section") === "talk" ? "talk" : "profile";
  if (!TOKEN_RE.test(t)) return json({ ok: false, message: "링크가 올바르지 않아요." }, 404);

  const str = (k) => String(form.get(k) || "").trim();
  const file = (k) => { const f = form.get(k); return f && typeof f === "object" && f.size > 0 ? f : null; };

  let data;
  if (section === "profile") {
    data = {
      nameEn: str("nameEn"), phone: str("phone"), organization: str("organization"), position: str("position"),
      bio: str("bio"), consent: form.get("consentPrivacy") === "true" ? "동의" : "",
    };
  } else {
    data = {
      session: str("session"), title: str("title"), summary: str("summary"),
      rehearsal: form.getAll("rehearsal").map(String).join(", "),
      recording: form.get("recording") === "no" ? "동의하지 않음" : "동의", request: str("request"),
    };
  }
  const photo = file("photo");
  const material = file("material");
  const errors = validateSection(section, { ...data, consentPrivacy: !!data.consent, rehearsal: data.rehearsal ? data.rehearsal.split(", ") : [] }, {
    photo, material, hasPhoto: form.get("hasPhoto") === "true",
  });
  if (Object.keys(errors).length) return json({ ok: false, message: "입력 내용을 확인해 주세요.", errors }, 400);

  // 이 링크가 명단에 있는지 먼저 확인 (없으면 파일도 올리지 않음)
  try {
    const found = await callSheet("speaker_get", { token: t });
    if (!found.ok) return json({ ok: false, message: "링크가 만료됐거나 올바르지 않아요. 담당자에게 문의해 주세요." }, 404);
  } catch (e) {
    console.error("[speaker] lookup failed:", e);
    return json({ ok: false, message: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." }, 500);
  }

  const origin = new URL(request.url).origin;
  try {
    if (section === "profile" && photo) data.photoUrl = await upload(photo, t, "photo", origin);
    if (section === "talk" && material) data.materialUrl = await upload(material, t, "material", origin);
  } catch (e) {
    console.error("[speaker] upload failed:", e);
    return json({ ok: false, message: "파일 저장 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요." }, 500);
  }

  try {
    const res = await callSheet("speaker_save", { token: t, section, data });
    if (!res.ok) return json({ ok: false, message: "저장하지 못했어요. 담당자에게 문의해 주세요." }, 500);
    return json({ ok: true, speaker: res.speaker });
  } catch (e) {
    console.error("[speaker] save failed:", e);
    return json({ ok: false, message: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." }, 500);
  }
}
