import { NextResponse } from "next/server";
// Old clients must upgrade; never pretend that an unrecorded duration was saved.
export async function POST() { return NextResponse.json({ error: "Vui lòng tải lại trang để cập nhật bộ ghi nhận phiên học." }, { status: 410 }); }
