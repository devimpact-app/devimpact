import { NextResponse } from "next/server";

export function jsonOK<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}
export function jsonBadRequest(message: string, details?: unknown) {
  return NextResponse.json(
    { ok: false, error: { code: "bad_request", message, details } },
    { status: 400 },
  );
}
export function jsonUnauthorized(message = "Unauthorized") {
  return NextResponse.json(
    { ok: false, error: { code: "unauthorized", message } },
    { status: 401 },
  );
}
export function jsonServerError(message: string, details?: unknown) {
  return NextResponse.json(
    { ok: false, error: { code: "server_error", message, details } },
    { status: 500 },
  );
}
