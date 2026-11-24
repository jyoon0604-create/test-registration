import { get } from "@vercel/blob";
import { verifyPath } from "@/lib/photoLink";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 시트의 사진 링크를 열면 Private Blob에서 사진을 꺼내 보여 줍니다. 서명이 맞는 링크만 열립니다.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const pathname = searchParams.get("p") || "";
  const sig = searchParams.get("s") || "";

  if (!pathname.startsWith("photos/") || !verifyPath(pathname, sig)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const result = await get(pathname, { access: process.env.BLOB_ACCESS || "private" });
    if (!result || result.statusCode !== 200) return new Response("Not found", { status: 404 });
    return new Response(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType || "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    console.error("[photo] read failed:", e);
    return new Response("Not found", { status: 404 });
  }
}
