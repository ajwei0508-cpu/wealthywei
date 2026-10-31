import { NextRequest, NextResponse } from "next/server";
import {
  verifyFirstVisitAccess,
  readWorkspaceFromStorage,
  saveWorkspaceToStorage,
  deleteWorkspaceFromStorage,
  listAllMemberWorkspaces,
} from "@/lib/firstVisitServerAuth";
import { FirstVisitWorkspace } from "@/types/firstVisit";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const viewAs = searchParams.get("viewAs");

  const auth = await verifyFirstVisitAccess(viewAs);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const workspace = await readWorkspaceFromStorage(
      auth.targetEmail,
      auth.clinicName,
      auth.directorName
    );

    const memberWorkspaces = auth.isMaster ? await listAllMemberWorkspaces() : [];

    return NextResponse.json({
      workspace,
      memberWorkspaces,
      isMaster: auth.isMaster,
      loggedInEmail: auth.loggedInEmail,
    });
  } catch (err: any) {
    console.error("FirstVisit GET Error:", err);
    return NextResponse.json(
      { error: err?.message || "초진 데이터를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const viewAs = searchParams.get("viewAs");

  const auth = await verifyFirstVisitAccess(viewAs);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const existing = await readWorkspaceFromStorage(
      auth.targetEmail,
      auth.clinicName,
      auth.directorName
    );

    const updated: FirstVisitWorkspace = {
      ownerEmail: auth.targetEmail,
      clinicName: body.clinicName || existing.clinicName || auth.clinicName,
      directorName: body.directorName || existing.directorName || auth.directorName,
      rows: Array.isArray(body.rows) ? body.rows : existing.rows,
      uploadLogs: Array.isArray(body.uploadLogs) ? body.uploadLogs : existing.uploadLogs,
      lastDetectedEmr:
        body.lastDetectedEmr !== undefined ? body.lastDetectedEmr : existing.lastDetectedEmr,
      aiReport: body.aiReport !== undefined ? body.aiReport : existing.aiReport,
      updatedAt: new Date().toISOString(),
    };

    await saveWorkspaceToStorage(updated);

    return NextResponse.json({
      success: true,
      workspace: updated,
    });
  } catch (err: any) {
    console.error("FirstVisit POST Error:", err);
    return NextResponse.json(
      { error: err?.message || "초진 데이터를 저장하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const viewAs = searchParams.get("viewAs");

  const auth = await verifyFirstVisitAccess(viewAs);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await deleteWorkspaceFromStorage(auth.targetEmail);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("FirstVisit DELETE Error:", err);
    return NextResponse.json(
      { error: err?.message || "초진 데이터를 초기화하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
