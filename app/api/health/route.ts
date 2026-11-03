import { NextResponse } from "next/server";
/** Liveness only; database readiness is measured separately. */
export function GET() { return NextResponse.json({status:"ok"},{headers:{"Cache-Control":"no-store"}}); }
