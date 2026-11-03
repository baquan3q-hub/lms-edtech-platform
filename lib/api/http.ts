import { NextResponse } from "next/server";
import { z } from "zod";
import { AccessError } from "@/lib/auth/actor-context";
import { unstable_rethrow } from "next/navigation";

export async function api<T>(work: () => Promise<T>) {
  const requestId = crypto.randomUUID();
  const headers = { "Cache-Control": "private, no-store", "X-Request-Id": requestId };
  try { return NextResponse.json({ ok: true, data: await work(), requestId }, { headers }); }
  catch (error) {
    unstable_rethrow(error);
    const status = error instanceof AccessError ? error.status : error instanceof z.ZodError ? 400 : 503;
    const code = error instanceof AccessError ? error.code : error instanceof z.ZodError ? "VALIDATION_ERROR" : "SERVICE_UNAVAILABLE";
    if (status >= 500) console.error(JSON.stringify({ event: "api.failed", requestId, code }));
    return NextResponse.json({ ok: false, error: { code, message: error instanceof AccessError ? error.message : status === 400 ? "Dữ liệu không hợp lệ." : "Dịch vụ tạm thời không khả dụng." }, requestId }, { status, headers });
  }
}

export function requireSameOrigin(request: Request) {
  if (request.headers.get("authorization")?.startsWith("Bearer ")) return;
  const origin = request.headers.get("origin");
  const expected = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin : new URL(request.url).origin;
  if (origin !== expected) throw new AccessError(403, "Nguồn yêu cầu không hợp lệ.", "INVALID_ORIGIN");
}

export async function jsonBody<T>(request: Request, schema: z.ZodType<T>, maxBytes = 64000): Promise<T> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new AccessError(415, "Yêu cầu application/json.", "UNSUPPORTED_MEDIA_TYPE");
  const reader = request.body?.getReader();
  if (!reader) throw new AccessError(400, "Thiếu dữ liệu.", "INVALID_BODY");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new AccessError(413, "Dữ liệu quá lớn.", "PAYLOAD_TOO_LARGE"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let parsed: unknown;
  try { parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new AccessError(400, "JSON không hợp lệ.", "INVALID_JSON"); }
  return schema.parse(parsed);
}
