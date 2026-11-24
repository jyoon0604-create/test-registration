const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s()]{8,20}$/;

export const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // Vercel 함수 요청 한도(4.5MB) 아래로 유지
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

// 서버와 브라우저에서 같이 쓰는 입력 검사. 오류가 있으면 { 필드: 메시지 }를 돌려줍니다.
export function validateFields(f) {
  const errors = {};
  if (!f.name || f.name.trim().length < 2) errors.name = "이름을 입력해 주세요.";
  if (!f.email || !EMAIL_RE.test(f.email.trim())) errors.email = "올바른 이메일 주소를 입력해 주세요.";
  if (!f.organization || !f.organization.trim()) errors.organization = "소속을 입력해 주세요.";
  if (!f.position || !f.position.trim()) errors.position = "부서·직책을 입력해 주세요.";
  if (!f.phone || !PHONE_RE.test(f.phone.trim())) errors.phone = "연락처를 확인해 주세요. (예: 010-1234-5678)";
  if (!f.consent) errors.consent = "개인정보 수집·이용에 동의해 주세요.";
  for (const k of ["name", "email", "organization", "position", "phone"]) {
    if (f[k] && f[k].length > 100) errors[k] = "100자 이내로 입력해 주세요.";
  }
  return errors;
}

export function validatePhoto(file) {
  if (!file || file.size === 0) return "사진을 첨부해 주세요.";
  if (!PHOTO_TYPES.includes(file.type)) return "JPG, PNG, WEBP 사진만 올릴 수 있어요.";
  if (file.size > MAX_PHOTO_BYTES) return "사진 용량이 너무 커요. 4MB 이하로 올려 주세요.";
  return null;
}
