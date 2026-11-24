// 연사 등록: 브라우저와 서버에서 같이 쓰는 입력 검사
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s()]{8,20}$/;

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // Vercel 함수 요청 한도(4.5MB) 아래
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MATERIAL_EXT = ["pdf", "ppt", "pptx"];

const LIMITS = { nameEn: 100, phone: 30, organization: 100, position: 100, bio: 800, title: 120, summary: 600, request: 400, session: 200 };

export function validateSection(section, v, files = {}) {
  const e = {};
  if (section === "profile") {
    if (!PHONE_RE.test(v.phone || "")) e.phone = "연락처를 확인해 주세요. (예: 010-1234-5678)";
    if (!(v.organization || "").trim()) e.organization = "소속을 입력해 주세요.";
    if (!(v.position || "").trim()) e.position = "부서·직책을 입력해 주세요.";
    if ((v.bio || "").trim().length < 20) e.bio = "약력을 20자 이상 적어 주세요.";
    if (!v.consentPrivacy) e.consentPrivacy = "개인정보 수집·이용에 동의해 주세요.";
    if (files.photo) {
      if (!PHOTO_TYPES.includes(files.photo.type)) e.photo = "JPG, PNG, WEBP 사진만 올릴 수 있어요.";
      else if (files.photo.size > MAX_UPLOAD_BYTES) e.photo = "사진은 4MB 이하로 올려 주세요.";
    } else if (!files.hasPhoto) e.photo = "프로필 사진을 첨부해 주세요.";
  }
  if (section === "talk") {
    if (!(v.session || "").trim()) e.session = "발표 세션을 골라 주세요.";
    if (!(v.title || "").trim()) e.title = "발표 제목을 입력해 주세요.";
    if ((v.summary || "").trim().length < 20) e.summary = "발표 요약을 20자 이상 적어 주세요.";
    if (!v.rehearsal || !v.rehearsal.length) e.rehearsal = "가능한 리허설 시간을 하나 이상 골라 주세요.";
    if (files.material) {
      const ext = files.material.name.split(".").pop().toLowerCase();
      if (!MATERIAL_EXT.includes(ext)) e.material = "PDF, PPT, PPTX 파일만 올릴 수 있어요.";
      else if (files.material.size > MAX_UPLOAD_BYTES) e.material = "4MB가 넘는 자료는 담당자 메일로 보내 주세요.";
    }
  }
  for (const [k, max] of Object.entries(LIMITS)) {
    if (v[k] && String(v[k]).length > max) e[k] = `${max}자 이내로 입력해 주세요.`;
  }
  return e;
}

export { EMAIL_RE };
