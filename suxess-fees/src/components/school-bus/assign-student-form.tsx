"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MessageDialog } from "@/components/ui/confirm-dialog";
import { formatCurrency } from "@/lib/utils";

type Student = {
  id: string;
  full_name: string;
  admission_number: string;
  class_name?: string | null;
};

type Bus = {
  id: string;
  name: string;
  route_name?: string | null;
  bus_fee?: number | null;
  plate_number?: string | null;
};

export function AssignStudentForm({
  buses,
  students,
}: {
  buses: Bus[];
  students: Student[];
}) {
  const [busId, setBusId] = useState(buses[0]?.id || "");
  const [studentId, setStudentId] = useState("");
  const [search, setSearch] = useState("");
  const [pickup, setPickup] = useState("");
  const [amountPaid, setAmountPaid] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const selectedBus = buses.find((b) => b.id === busId);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students.slice(0, 50);
    return students
      .filter(
        (s) =>
          s.full_name?.toLowerCase().includes(q) ||
          s.admission_number?.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [search, students]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!busId || !studentId) {
      setErrorMsg("Select a bus and a student.");
      return;
    }
    setLoading(true);
    const amt = Number(String(amountPaid).replace(/,/g, "")) || 0;
    const feeAmt = Number(selectedBus?.bus_fee || 0);

    // End previous active assignment for this student
    await supabase
      .from("student_bus_assignments")
      .update({ status: "ended" })
      .eq("student_id", studentId)
      .eq("status", "active");

    const payload: Record<string, unknown> = {
      bus_id: busId,
      student_id: studentId,
      pickup_point: pickup || null,
      status: "active",
    };
    if (amt > 0) payload.amount_paid = amt;
    if (feeAmt > 0) payload.fee_amount = feeAmt;

    let { error } = await supabase.from("student_bus_assignments").insert(payload);
    if (
      error &&
      (error.message.includes("amount_paid") ||
        error.message.includes("fee_amount"))
    ) {
      delete payload.amount_paid;
      delete payload.fee_amount;
      ({ error } = await supabase.from("student_bus_assignments").insert(payload));
    }
    setLoading(false);
    if (error) {
      setErrorMsg(
        error.message.includes("schema") ||
          error.message.includes("student_bus") ||
          error.message.includes("does not exist")
          ? "School bus tables missing. In Supabase run sql/02-RUN-ON-YOUR-CURRENT-PROJECT.sql then try again."
          : error.message
      );
      return;
    }
    setStudentId("");
    setSearch("");
    setPickup("");
    setAmountPaid("");
    router.refresh();
  };

  return (
    <>
      <form
        onSubmit={save}
        className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3"
      >
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
          Assign student to bus
        </h3>
        {buses.length === 0 ? (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2">
            Add a bus first (top right), then assign students.
          </p>
        ) : (
          <div>
            <label className="text-xs text-slate-500 mb-1 block">
              Bus & route
            </label>
            <select
              value={busId}
              onChange={(e) => {
                setBusId(e.target.value);
                const b = buses.find((x) => x.id === e.target.value);
                const fee = Number(b?.bus_fee || 0);
                if (fee > 0) setAmountPaid(String(Math.round(fee)));
              }}
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              {buses.map((b) => {
                const fee = Number(b.bus_fee || 0);
                const route = b.route_name || "No route";
                return (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.plate_number ? ` (${b.plate_number})` : ""} — {route}
                    {fee > 0 ? ` — ${formatCurrency(fee)}` : ""}
                  </option>
                );
              })}
            </select>
            {selectedBus?.route_name && (
              <p className="text-xs text-gray-500 mt-1">
                Route: {selectedBus.route_name}
                {Number(selectedBus.bus_fee || 0) > 0
                  ? ` · Fee ${formatCurrency(Number(selectedBus.bus_fee))}`
                  : ""}
              </p>
            )}
          </div>
        )}
        <input
          type="search"
          placeholder="Search student…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        />
        <select
          required
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          size={4}
        >
          <option value="">Select student</option>
          {filtered.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name} ({s.admission_number})
            </option>
          ))}
        </select>
        <input
          placeholder="Pickup point (optional)"
          value={pickup}
          onChange={(e) => setPickup(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        />
        <div>
          <label className="text-xs text-slate-500 mb-1 block">
            Amount paid for bus (₦)
          </label>
          <input
            inputMode="numeric"
            placeholder="e.g. 15000"
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
          <p className="text-[11px] text-gray-400 mt-0.5">
            Auto-fills from route price when available
          </p>
        </div>
        <button
          type="submit"
          disabled={loading || buses.length === 0}
          className="w-full py-2.5 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-brand-navy disabled:opacity-50"
        >
          {loading ? "Saving…" : "Assign to bus"}
        </button>
      </form>
      <MessageDialog
        open={!!errorMsg}
        title="Could not assign"
        message={errorMsg || ""}
        onClose={() => setErrorMsg(null)}
      />
    </>
  );
}
