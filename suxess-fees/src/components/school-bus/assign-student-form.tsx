"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MessageDialog } from "@/components/ui/confirm-dialog";

type Student = {
  id: string;
  full_name: string;
  admission_number: string;
  class_name?: string | null;
};

type Bus = { id: string; name: string; bus_fee?: number | null };

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
    const selected = buses.find((b) => b.id === busId);
    const payload: Record<string, unknown> = {
      bus_id: busId,
      student_id: studentId,
      pickup_point: pickup || null,
      status: "active",
    };
    if (amt > 0) payload.amount_paid = amt;
    if (selected?.bus_fee != null) payload.fee_amount = selected.bus_fee;

    let { error } = await supabase.from("student_bus_assignments").insert(payload);
    if (error && (error.message.includes("amount_paid") || error.message.includes("fee_amount"))) {
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
          <select
            value={busId}
            onChange={(e) => setBusId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          >
            {buses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
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
          {buses.find((b) => b.id === busId)?.bus_fee ? (
            <p className="text-[11px] text-slate-400 mt-1">
              Set price: ₦
              {Number(buses.find((b) => b.id === busId)?.bus_fee).toLocaleString()}
            </p>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={loading || !buses.length}
          className="w-full bg-brand-blue text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60"
        >
          {loading ? "Saving…" : "Assign"}
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
