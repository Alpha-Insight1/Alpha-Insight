import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { getCurrentProfile, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

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
  const isSchoolFee = String(selectedFee?.name || "")
    .toLowerCase()
    .includes("school fee");

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
    .select("student_id, amount, amount_paid, balance, session, term, fee_type_id")
    .limit(8000);
  if (selectedFeeId) feesQ = feesQ.eq("fee_type_id", selectedFeeId);
  // Term-based fees: filter session/term; one-off fees (uniform, WAEC): all sessions
  if (isSchoolFee) {
    feesQ = feesQ.eq("session", session).eq("term", term);
  }

  const [{ data: students }, { data: fees }, { data: scholarships }] =
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
    ]);

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

  // For one-off fees: show people who have a record first when filtering paid/partial/unpaid
  if (statusFilter === "paid") rows = rows.filter((r) => r.status === "paid");
  else if (statusFilter === "partial")
    rows = rows.filter((r) => r.status === "partial");
  else if (statusFilter === "unpaid")
    rows = rows.filter((r) => r.status === "unpaid" || r.status === "none");
  else if (statusFilter === "scholarship")
    rows = rows.filter((r) => r.status === "scholarship");
  else if (statusFilter === "recorded")
    rows = rows.filter((r) => r.status !== "none");

  const counts = {
    all: (students || []).length,
    paid: (students || []).filter((s: any) => {
      const f = feeByStudent.get(s.id);
      if (!f) return false;
      return Number(f.balance ?? 0) <= 0 && Number(f.amount_paid || 0) > 0;
    }).length,
    partial: (students || []).filter((s: any) => {
      const f = feeByStudent.get(s.id);
      return f && Number(f.amount_paid || 0) > 0 && Number(f.balance ?? 0) > 0;
    }).length,
    unpaid: (students || []).filter((s: any) => {
      const f = feeByStudent.get(s.id);
      return !f || (Number(f.amount_paid || 0) === 0 && Number(f.amount || 0) > 0);
    }).length,
    recorded: feeByStudent.size,
  };

  function href(extra: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    p.set("fee", extra.fee ?? selectedFeeId);
    p.set("session", extra.session ?? session);
    p.set("term", extra.term ?? term);
    if ((extra.status ?? statusFilter) !== "all")
      p.set("status", extra.status ?? statusFilter);
    if (classFilter) p.set("class", classFilter);
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
            Track who paid school fees, uniform, WAEC, testimonial, and more
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

      {isSchoolFee && (
        <div className="flex flex-wrap gap-3 mb-4 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-slate-500">Session</span>
            <span className="font-medium">{session}</span>
          </label>
          <span className="text-slate-300">·</span>
          <label className="flex items-center gap-2">
            <span className="text-slate-500">Term</span>
            <span className="font-medium">{term}</span>
          </label>
          <span className="text-xs text-slate-400">
            (change via URL or payments when recording)
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {(
          [
            ["all", `All (${counts.all})`],
            ["recorded", `Has record (${counts.recorded})`],
            ["paid", `Paid (${counts.paid})`],
            ["partial", `Partial (${counts.partial})`],
            ["unpaid", `Unpaid / none (${counts.unpaid})`],
            ...(isSchoolFee ? [["scholarship", "Scholarship"]] : []),
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
                <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-white/5">
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
