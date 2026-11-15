import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { getCurrentProfile, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FeeTrackerFilters } from "@/components/fees/fee-tracker-filters";

type Status = "paid" | "partial" | "unpaid" | "scholarship" | "none";

export default async function FeeTrackerPage({
  searchParams,
}: {
  searchParams: Promise<{
    session?: string;
    term?: string;
    status?: string;
    class?: string;
    fee?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const admin = isAdmin(profile);

  const session = (params.session || "2025/2026").trim();
  const term = (params.term || "First Term").trim();
  const statusFilter = (params.status || "all").trim();
  const classFilter = (params.class || "").trim();

  const { data: feeTypes } = await supabase
    .from("fee_types")
    .select("id, name, default_amount")
    .order("name");

  const types = feeTypes || [];
  const selectedFeeId =
    params.fee ||
    types.find((t: any) =>
      String(t.name).toLowerCase().includes("school fee")
    )?.id ||
    types[0]?.id ||
    "";

  const selectedFee = types.find((t: any) => t.id === selectedFeeId);
  const feeName = String(selectedFee?.name || "");
  const isSchoolFee = feeName.toLowerCase().includes("school fee");
  const isSchoolBus = feeName.toLowerCase().includes("bus");
  // Term-scoped: school fees always; also when recording with session/term
  const useSessionTerm = isSchoolFee || !isSchoolBus;

  let studentsQ = supabase
    .from("students")
    .select(
      "id, full_name, admission_number, class_name, parent_name, parent_phone, status"
    )
    .eq("status", "active")
    .order("full_name")
    .limit(2000);
  if (classFilter) studentsQ = studentsQ.ilike("class_name", classFilter);

  let feesQ = supabase
    .from("student_fees")
    .select(
      "student_id, amount, amount_paid, balance, session, term, fee_type_id"
    )
    .limit(8000);
  if (selectedFeeId) feesQ = feesQ.eq("fee_type_id", selectedFeeId);
  if (useSessionTerm) {
    feesQ = feesQ.eq("session", session).eq("term", term);
  }

  const [{ data: students }, { data: fees }, { data: scholarships }, { data: allStudentsForClasses }] =
    await Promise.all([
      studentsQ,
      selectedFeeId ? feesQ : Promise.resolve({ data: [] as any[] }),
      isSchoolFee
        ? supabase
            .from("scholarships")
            .select("id, student_id, session, term, coverage, status")
            .eq("session", session)
            .eq("term", term)
            .eq("status", "active")
            .limit(2000)
        : Promise.resolve({ data: [] as any[] }),
      supabase
        .from("students")
        .select("class_name")
        .eq("status", "active")
        .limit(2000),
    ]);

  const classSet = new Set<string>();
  for (const s of allStudentsForClasses || []) {
    const c = (s.class_name || "").trim();
    if (c) classSet.add(c);
  }
  const classes = Array.from(classSet).sort((a, b) => a.localeCompare(b));

  const feeByStudent = new Map<string, any>();
  for (const f of fees || []) {
    const prev = feeByStudent.get(f.student_id);
    if (!prev) feeByStudent.set(f.student_id, f);
    else {
      feeByStudent.set(f.student_id, {
        ...prev,
        amount: Number(prev.amount || 0) + Number(f.amount || 0),
        amount_paid: Number(prev.amount_paid || 0) + Number(f.amount_paid || 0),
        balance: Number(prev.balance || 0) + Number(f.balance || 0),
      });
    }
  }

  const scholarshipStudents = new Set(
    (scholarships || []).map((s: any) => s.student_id)
  );

  type Row = {
    id: string;
    full_name: string;
    admission_number: string;
    class_name: string;
    parent_phone?: string | null;
    status: Status;
    amount: number;
    amount_paid: number;
    balance: number;
  };

  let rows: Row[] = (students || []).map((s: any) => {
    const onScholarship = scholarshipStudents.has(s.id);
    const fee = feeByStudent.get(s.id);
    const amount = Number(fee?.amount || 0);
    const amount_paid = Number(fee?.amount_paid || 0);
    const balance = fee ? Number(fee.balance ?? amount - amount_paid) : 0;

    let status: Status = "none";
    if (onScholarship && isSchoolFee) status = "scholarship";
    else if (!fee) status = "none";
    else if (balance <= 0 && amount_paid > 0) status = "paid";
    else if (amount_paid > 0 && balance > 0) status = "partial";
    else status = "unpaid";

    return {
      id: s.id,
      full_name: s.full_name,
      admission_number: s.admission_number,
      class_name: s.class_name || "—",
      parent_phone: s.parent_phone,
      status,
      amount,
      amount_paid,
      balance,
    };
  });

  if (statusFilter === "paid") rows = rows.filter((r) => r.status === "paid");
  else if (statusFilter === "partial")
    rows = rows.filter((r) => r.status === "partial");
  else if (statusFilter === "unpaid")
    rows = rows.filter((r) => r.status === "unpaid" || r.status === "none");
  else if (statusFilter === "scholarship")
    rows = rows.filter((r) => r.status === "scholarship");
  else if (statusFilter === "recorded")
    rows = rows.filter((r) => r.status !== "none");

  const allRowsBase = (students || []).map((s: any) => {
    const fee = feeByStudent.get(s.id);
    const amount = Number(fee?.amount || 0);
    const amount_paid = Number(fee?.amount_paid || 0);
    const balance = fee ? Number(fee.balance ?? amount - amount_paid) : 0;
    const onScholarship = scholarshipStudents.has(s.id);
    let status: Status = "none";
    if (onScholarship && isSchoolFee) status = "scholarship";
    else if (!fee) status = "none";
    else if (balance <= 0 && amount_paid > 0) status = "paid";
    else if (amount_paid > 0 && balance > 0) status = "partial";
    else status = "unpaid";
    return { status, amount, amount_paid, balance };
  });

  const counts = {
    all: allRowsBase.length,
    paid: allRowsBase.filter((r) => r.status === "paid").length,
    partial: allRowsBase.filter((r) => r.status === "partial").length,
    unpaid: allRowsBase.filter(
      (r) => r.status === "unpaid" || r.status === "none"
    ).length,
    scholarship: allRowsBase.filter((r) => r.status === "scholarship").length,
    recorded: allRowsBase.filter((r) => r.status !== "none").length,
  };

  const totalExpected = allRowsBase.reduce((s, r) => s + r.amount, 0);
  const totalCollected = allRowsBase.reduce((s, r) => s + r.amount_paid, 0);
  const totalBalance = allRowsBase.reduce((s, r) => s + Math.max(0, r.balance), 0);

  function href(extra: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    p.set("fee", extra.fee ?? selectedFeeId);
    p.set("session", extra.session ?? session);
    p.set("term", extra.term ?? term);
    if ((extra.status ?? statusFilter) !== "all")
      p.set("status", extra.status ?? statusFilter);
    const cls = extra.class !== undefined ? extra.class : classFilter;
    if (cls) p.set("class", cls);
    return `/fee-tracker?${p.toString()}`;
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Fees tracker
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Who paid school fees, bus, WAEC and more — by session and term
          </p>
        </div>
        {admin && (
          <Link href="/fee-settings" className="ai-btn-secondary text-sm">
            Set fee prices →
          </Link>
        )}
      </div>

      {/* Fee type tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {types.map((t: any) => (
          <Link
            key={t.id}
            href={href({ fee: t.id, status: "all" })}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              selectedFeeId === t.id
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white dark:bg-slate-900 text-slate-600 border-slate-200 dark:border-slate-700"
            }`}
          >
            {t.name}
          </Link>
        ))}
        {types.length === 0 && (
          <p className="text-sm text-amber-700">
            No fee types. Admin: open Fee prices and add School Fees, Uniform,
            etc.
          </p>
        )}
      </div>

      {/* Session / term / class filters */}
      <FeeTrackerFilters
        session={session}
        term={term}
        classFilter={classFilter}
        feeId={selectedFeeId}
        status={statusFilter}
        classes={classes}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <SummaryCard
          label="Fully paid"
          value={String(counts.paid)}
          sub={`${counts.all ? Math.round((counts.paid / counts.all) * 100) : 0}% of students`}
          tone="green"
        />
        <SummaryCard
          label="Partial"
          value={String(counts.partial)}
          sub="Paid something, still owe"
          tone="amber"
        />
        <SummaryCard
          label="Unpaid / no record"
          value={String(counts.unpaid)}
          sub={
            counts.scholarship
              ? `${counts.scholarship} on scholarship`
              : "No payment yet"
          }
          tone="rose"
        />
        <SummaryCard
          label="Collected"
          value={formatCurrency(totalCollected)}
          sub={
            totalExpected > 0
              ? `of ${formatCurrency(totalExpected)} expected · ${formatCurrency(totalBalance)} balance`
              : "No fee amounts recorded"
          }
          tone="indigo"
        />
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(
          [
            ["all", `All (${counts.all})`],
            ["recorded", `Has record (${counts.recorded})`],
            ["paid", `Paid (${counts.paid})`],
            ["partial", `Partial (${counts.partial})`],
            ["unpaid", `Unpaid / none (${counts.unpaid})`],
            ...(isSchoolFee
              ? ([["scholarship", `Scholarship (${counts.scholarship})`]] as [
                  string,
                  string
                ][])
              : []),
          ] as [string, string][]
        ).map(([id, label]) => (
          <Link
            key={id}
            href={href({ status: id })}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
              statusFilter === id
                ? "bg-slate-900 text-white border-slate-900 dark:bg-indigo-600 dark:border-indigo-600"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <p className="text-xs text-slate-400 mb-2">
        Showing <strong>{selectedFee?.name || "—"}</strong>
        {useSessionTerm ? (
          <>
            {" "}
            · {session} · {term}
          </>
        ) : (
          <> · all sessions (bus / one-off style)</>
        )}
        {classFilter ? ` · class ${classFilter}` : ""}
        {" · "}
        {rows.length} row{rows.length === 1 ? "" : "s"}
      </p>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-400 bg-slate-50 dark:bg-white/5">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-white/5"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/students/${r.id}`}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {r.full_name}
                    </Link>
                    <span className="block text-xs text-slate-400">
                      {r.admission_number}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.class_name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {r.status === "none" ? "—" : formatCurrency(r.amount)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {r.status === "none" ? "—" : formatCurrency(r.amount_paid)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {r.status === "none" ? "—" : formatCurrency(r.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <p className="p-10 text-center text-slate-400 text-sm">
            No students match this filter
          </p>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "green" | "amber" | "rose" | "indigo";
}) {
  const tones = {
    green: "border-emerald-200 bg-emerald-50/80 text-emerald-900",
    amber: "border-amber-200 bg-amber-50/80 text-amber-900",
    rose: "border-rose-200 bg-rose-50/80 text-rose-900",
    indigo: "border-indigo-200 bg-indigo-50/80 text-indigo-900",
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-xl font-bold mt-1 tabular-nums">{value}</p>
      <p className="text-[11px] mt-1 opacity-70 leading-snug">{sub}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    partial: "bg-amber-50 text-amber-800 border-amber-200",
    unpaid: "bg-rose-50 text-rose-700 border-rose-200",
    scholarship: "bg-violet-50 text-violet-700 border-violet-200",
    none: "bg-slate-50 text-slate-500 border-slate-200",
  };
  const label: Record<Status, string> = {
    paid: "Fully paid",
    partial: "Partial",
    unpaid: "Not paid",
    scholarship: "Scholarship",
    none: "No record",
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${map[status]}`}
    >
      {label[status]}
    </span>
  );
}
