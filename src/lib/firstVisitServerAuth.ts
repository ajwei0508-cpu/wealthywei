import { getServerSession } from "next-auth";
import { createClient } from "@supabase/supabase-js";
import { authOptions } from "@/lib/authOptions";
import { FirstVisitWorkspace, MasterMemberSummary } from "@/types/firstVisit";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const MASTER_EMAIL = (
  process.env.NEXT_PUBLIC_MASTER_EMAIL ||
  process.env.MASTER_EMAIL ||
  "wei0508@naver.com"
).toLowerCase();

const PRIVATE_BUCKET = "first-visit-private";
let bucketVerified = false;

export async function ensureFirstVisitPrivateBucket() {
  if (bucketVerified) return;
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === PRIVATE_BUCKET)) {
    await supabaseAdmin.storage.createBucket(PRIVATE_BUCKET, { public: false });
  }
  bucketVerified = true;
}

export function emailToStoragePath(email: string): string {
  const clean = email.toLowerCase().trim();
  const encoded = Buffer.from(clean, "utf-8").toString("base64url");
  return `workspaces/${encoded}.json`;
}

export function storageNameToEmail(fileName: string): string | null {
  if (!fileName.endsWith(".json") || fileName.startsWith("_")) return null;
  const base = fileName.slice(0, -5);
  try {
    const decoded = Buffer.from(base, "base64url").toString("utf-8");
    return decoded.includes("@") ? decoded.toLowerCase().trim() : null;
  } catch {
    return null;
  }
}

export interface AuthVerificationResult {
  ok: boolean;
  status: number;
  error?: string;
  loggedInEmail: string;
  targetEmail: string;
  isMaster: boolean;
  clinicName: string;
  directorName: string;
}

/**
 * 바른컨설팅 승인 회원 + 마스터 전용 권한 검증 & 개인간 공유 완전 차단 검증
 */
export async function verifyFirstVisitAccess(
  requestedEmailParam?: string | null
): Promise<AuthVerificationResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return {
      ok: false,
      status: 401,
      error: "로그인이 필요합니다.",
      loggedInEmail: "",
      targetEmail: "",
      isMaster: false,
      clinicName: "",
      directorName: "",
    };
  }

  const loggedInEmail = session.user.email.toLowerCase().trim();
  const role = (session.user as any)?.role || "director";
  const isMaster = loggedInEmail === MASTER_EMAIL;

  if (role === "staff" && !isMaster) {
    return {
      ok: false,
      status: 403,
      error: "초진 시스템은 바른컨설팅 승인 원장님 및 마스터 전용 메뉴입니다.",
      loggedInEmail,
      targetEmail: loggedInEmail,
      isMaster: false,
      clinicName: "",
      directorName: "",
    };
  }

  // 타 사용자 열람 요청 검증: 오직 마스터만 타 계정 열람/선택 가능
  const cleanRequested = requestedEmailParam?.toLowerCase().trim() || "";
  if (cleanRequested && cleanRequested !== loggedInEmail && !isMaster) {
    return {
      ok: false,
      status: 403,
      error: "개인별 보안 정책에 의해 타 원장님의 데이터는 열람하거나 공유할 수 없습니다.",
      loggedInEmail,
      targetEmail: loggedInEmail,
      isMaster: false,
      clinicName: "",
      directorName: "",
    };
  }

  const targetEmail = isMaster && cleanRequested.includes("@") ? cleanRequested : loggedInEmail;

  // 권한 DB 조회 (본인 승인 여부 + 대상 계정 프로필명)
  if (!isMaster) {
    const { data: perm } = await supabaseAdmin
      .from("user_permissions")
      .select("approval_status, approved_category, approved_categories, real_name, clinic_name")
      .eq("user_email", loggedInEmail)
      .single();

    const cats: string[] = Array.isArray(perm?.approved_categories)
      ? perm.approved_categories
      : perm?.approved_category
      ? [perm.approved_category]
      : [];

    const isConsultingApproved =
      perm?.approval_status === "approved" &&
      (cats.includes("consulting") ||
        cats.includes("바른컨설팅") ||
        perm?.approved_category === "consulting" ||
        perm?.approved_category === "바른컨설팅");

    if (!isConsultingApproved) {
      return {
        ok: false,
        status: 403,
        error: "바른컨설팅 승인 회원 및 마스터만 이용 가능한 서비스입니다.",
        loggedInEmail,
        targetEmail,
        isMaster: false,
        clinicName: "",
        directorName: "",
      };
    }

    return {
      ok: true,
      status: 200,
      loggedInEmail,
      targetEmail: loggedInEmail,
      isMaster: false,
      clinicName: perm?.clinic_name || "내 한의원",
      directorName: perm?.real_name || session.user.name || "원장님",
    };
  }

  // 마스터인 경우 대상 이메일의 프로필 정보 조회
  let clinicName = targetEmail === MASTER_EMAIL ? "마스터 본원" : "미지정 한의원";
  let directorName = targetEmail === MASTER_EMAIL ? "최고 관리자" : targetEmail.split("@")[0];

  if (targetEmail !== MASTER_EMAIL) {
    const { data: targetPerm } = await supabaseAdmin
      .from("user_permissions")
      .select("real_name, clinic_name")
      .eq("user_email", targetEmail)
      .single();
    if (targetPerm) {
      clinicName = targetPerm.clinic_name || clinicName;
      directorName = targetPerm.real_name || directorName;
    }
  }

  return {
    ok: true,
    status: 200,
    loggedInEmail,
    targetEmail,
    isMaster: true,
    clinicName,
    directorName,
  };
}

export async function readWorkspaceFromStorage(
  targetEmail: string,
  fallbackClinicName: string,
  fallbackDirectorName: string
): Promise<FirstVisitWorkspace> {
  await ensureFirstVisitPrivateBucket();
  const path = emailToStoragePath(targetEmail);
  const { data, error } = await supabaseAdmin.storage.from(PRIVATE_BUCKET).download(path);

  if (error || !data) {
    return {
      ownerEmail: targetEmail,
      clinicName: fallbackClinicName,
      directorName: fallbackDirectorName,
      rows: [],
      uploadLogs: [],
      aiReport: null,
      updatedAt: "",
    };
  }

  try {
    const text = await data.text();
    const parsed = JSON.parse(text) as FirstVisitWorkspace;
    return {
      ownerEmail: targetEmail,
      clinicName: parsed.clinicName || fallbackClinicName,
      directorName: parsed.directorName || fallbackDirectorName,
      rows: Array.isArray(parsed.rows) ? parsed.rows : [],
      uploadLogs: Array.isArray(parsed.uploadLogs) ? parsed.uploadLogs : [],
      lastDetectedEmr: parsed.lastDetectedEmr,
      aiReport: parsed.aiReport || null,
      updatedAt: parsed.updatedAt || "",
    };
  } catch {
    return {
      ownerEmail: targetEmail,
      clinicName: fallbackClinicName,
      directorName: fallbackDirectorName,
      rows: [],
      uploadLogs: [],
      aiReport: null,
      updatedAt: "",
    };
  }
}

export async function saveWorkspaceToStorage(workspace: FirstVisitWorkspace): Promise<void> {
  await ensureFirstVisitPrivateBucket();
  const path = emailToStoragePath(workspace.ownerEmail);
  const payload = Buffer.from(JSON.stringify(workspace), "utf-8");

  const { error } = await supabaseAdmin.storage.from(PRIVATE_BUCKET).upload(path, payload, {
    upsert: true,
    contentType: "application/json",
  });

  if (error) {
    throw error;
  }
}

export async function deleteWorkspaceFromStorage(targetEmail: string): Promise<void> {
  await ensureFirstVisitPrivateBucket();
  const path = emailToStoragePath(targetEmail);
  await supabaseAdmin.storage.from(PRIVATE_BUCKET).remove([path]);
}

/**
 * 마스터 전용: 저장된 모든 회원의 초진 시스템 현황 목록 조회
 */
export async function listAllMemberWorkspaces(): Promise<MasterMemberSummary[]> {
  await ensureFirstVisitPrivateBucket();

  const [{ data: files }, { data: perms }] = await Promise.all([
    supabaseAdmin.storage.from(PRIVATE_BUCKET).list("workspaces", { limit: 500 }),
    supabaseAdmin
      .from("user_permissions")
      .select("user_email, real_name, clinic_name, approval_status, approved_categories, approved_category"),
  ]);

  const permMap = new Map<string, { clinicName: string; directorName: string; isConsulting: boolean }>();
  (perms || []).forEach((p: any) => {
    const em = String(p.user_email || "").toLowerCase().trim();
    if (!em) return;
    const cats: string[] = Array.isArray(p.approved_categories)
      ? p.approved_categories
      : p.approved_category
      ? [p.approved_category]
      : [];
    const isConsulting =
      p.approval_status === "approved" &&
      (cats.includes("consulting") ||
        cats.includes("바른컨설팅") ||
        p.approved_category === "consulting" ||
        p.approved_category === "바른컨설팅");

    permMap.set(em, {
      clinicName: p.clinic_name || "한의원 미입력",
      directorName: p.real_name || em.split("@")[0],
      isConsulting,
    });
  });

  const summaries: MasterMemberSummary[] = [];
  const seenEmails = new Set<string>();

  if (files && files.length > 0) {
    const validFiles = files
      .map((f) => ({ name: f.name, email: storageNameToEmail(f.name), updated: f.updated_at }))
      .filter((x): x is { name: string; email: string; updated: string } => Boolean(x.email));

    await Promise.all(
      validFiles.map(async (item) => {
        seenEmails.add(item.email);
        const pInfo = permMap.get(item.email);
        const ws = await readWorkspaceFromStorage(
          item.email,
          pInfo?.clinicName || (item.email === MASTER_EMAIL ? "마스터 본원" : "한의원 미입력"),
          pInfo?.directorName || (item.email === MASTER_EMAIL ? "최고 관리자" : item.email.split("@")[0])
        );
        const total = ws.rows.length;
        const secondCnt = ws.rows.filter((r) => Boolean(r.secondVisitDate?.trim())).length;
        const thirdCnt = ws.rows.filter((r) => Boolean(r.thirdVisitDate?.trim())).length;

        summaries.push({
          ownerEmail: item.email,
          clinicName: ws.clinicName,
          directorName: ws.directorName,
          rowCount: total,
          secondVisitRate: total > 0 ? Number(((secondCnt / total) * 100).toFixed(1)) : 0,
          thirdVisitRate: total > 0 ? Number(((thirdCnt / total) * 100).toFixed(1)) : 0,
          hasAiReport: Boolean(ws.aiReport),
          updatedAt: ws.updatedAt || item.updated || "",
        });
      })
    );
  }

  // 아직 업로드 전인 바른컨설팅 승인 원장님들도 마스터가 상태를 한눈에 확인할 수 있도록 추가 (0건 표시)
  permMap.forEach((info, em) => {
    if (info.isConsulting && !seenEmails.has(em)) {
      summaries.push({
        ownerEmail: em,
        clinicName: info.clinicName,
        directorName: info.directorName,
        rowCount: 0,
        secondVisitRate: 0,
        thirdVisitRate: 0,
        hasAiReport: false,
        updatedAt: "",
      });
    }
  });

  summaries.sort((a, b) => {
    if (a.rowCount > 0 && b.rowCount === 0) return -1;
    if (a.rowCount === 0 && b.rowCount > 0) return 1;
    return (b.updatedAt || "").localeCompare(a.updatedAt || "");
  });

  return summaries;
}
