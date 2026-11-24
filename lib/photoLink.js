import { createHmac, timingSafeEqual } from "node:crypto";

// 사진은 Private Blob에 저장하고, 시트에는 서명된 보기 링크(/api/photo?p=…&s=…)를 남깁니다.
// 서명 키는 SHEET_WEBHOOK_SECRET을 같이 씁니다 (PHOTO_LINK_SECRET을 넣으면 그 값을 우선 사용).
function key() {
  const k = process.env.PHOTO_LINK_SECRET || process.env.SHEET_WEBHOOK_SECRET;
  if (!k) throw new Error("PHOTO_LINK_SECRET / SHEET_WEBHOOK_SECRET 환경변수가 없습니다.");
  return k;
}

export function signPath(pathname) {
  return createHmac("sha256", key()).update(pathname).digest("base64url");
}

export function verifyPath(pathname, sig) {
  if (!pathname || !sig) return false;
  const a = Buffer.from(signPath(pathname));
  const b = Buffer.from(String(sig));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function photoViewUrl(origin, pathname) {
  const base = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : origin;
  return `${base}/api/photo?p=${encodeURIComponent(pathname)}&s=${signPath(pathname)}`;
}
