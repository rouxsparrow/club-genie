import { NextResponse } from "next/server";
import { callAppsScriptBridge } from "../../../../../lib/apps-script-bridge";

export async function POST() {
  try {
    const { response, data } = await callAppsScriptBridge("manual_ingest");
    if (!response.ok) {
      return NextResponse.json(data ?? { ok: false, error: "run_ingestion_failed" }, { status: response.status });
    }
    if (!data?.ok) {
      return NextResponse.json(data ?? { ok: false, error: "run_ingestion_failed" }, { status: 500 });
    }
    return NextResponse.json(data ?? { ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "run_ingestion_failed" },
      { status: 500 }
    );
  }
}
