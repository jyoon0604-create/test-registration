import { get } from "@vercel/blob";
import { verifyPath } from "@/lib/photoLink";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 시트의 사진·발표자료 링크를 열면 Private Blob에서 사진을 꺼내 보여 줍니다. 서명이 맞는 링크만 열립니다.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const pathname = searchParams.get("p") || "";
  const sig = searchParams.get("s") || "";

  const allowed = pathname.startsWith("photos/") || pathname.startsWith("speakers/");
  if (!allowed || !verifyPath(pathname, sig)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const result = await get(pathname, { access: process.env.BLOB_ACCESS || "private" });
    if (!result || result.statusCode !== 200) return new Response("Not found", { status: 404 });
    const type = result.blob.contentType || "application/octet-stream";
    const filename = pathname.split("/").pop();
    return new Response(result.stream, {
      headers: {
        "Content-Type": type,
        // 사진은 바로 보여 주고, 발표자료(PDF·PPT)는 내려받기로 엽니다.
        "Content-Disposition": `${type.startsWith("image/") ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    console.error("[photo] read failed:", e);
    return new Response("Not found", { status: 404 });
  }
}
