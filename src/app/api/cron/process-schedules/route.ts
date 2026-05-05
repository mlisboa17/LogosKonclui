import { NextResponse } from "next/server";
import { runScheduleJobGlobalCore } from "@/lib/schedule-job-runner";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET não definido." }, { status: 503 });
  }
  const url = new URL(request.url);
  const q = url.searchParams.get("secret");
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (q !== secret && bearer !== secret) {
    return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
  }

  const result = await runScheduleJobGlobalCore();
  return NextResponse.json({ ok: true, ...result });
}
