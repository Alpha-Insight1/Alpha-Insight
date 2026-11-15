"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  MoneyInput,
  formatMoneyInput,
  parseMoneyInput,
} from "@/components/ui/money-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type FeeType = {
  id: string;
  name: string;
  description: string | null;
  default_amount: number | null;
  is_active: boolean | null;
};

function isSchoolBusFeeName(name?: string | null): boolean {
  if (!name) return false;
  const n = name.toLowerCase().trim();
  return n.includes("school bus") || n === "bus" || n.includes("bus fee");
}

export function FeeSettingsClient({ initial }: { initial: FeeType[] }) {
  const [rows, setRows] = useState(initial);
  const [newName, setNewName] = useState("");
  const [newAmountDisplay, setNewAmountDisplay] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeeType | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setRows(initial);
  }, [initial]);

  const saveRow = async (id: string, name: string, amount: number) => {
    setSaving(id);
    setMsg(null);
    const payload: Record<string, unknown> = {
      name: name.trim(),
    };
    // School Bus prices live on each bus/route — do not store catalogue price
    if (!isSchoolBusFeeName(name)) {
      payload.default_amount = amount;
    } else {
      payload.default_amount = 0;
    }
    const { error } = await supabase
      .from("fee_types")
      .update(payload)
      .eq("id", id);
    setSaving(null);
    if (error) {
      setMsg(
        error.message.includes("default_amount")
          ? "Run sql/04-FIX-PAYMENT-COLUMNS.sql in Supabase, then save again."
          : error.message
      );
      return;
    }
    setMsg(
      isSchoolBusFeeName(name)
        ? `Saved “${name.trim()}” — set route prices on School bus page`
        : `Saved “${name.trim()}” — secretaries will see ₦${amount.toLocaleString()}`
    );
    router.refresh();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setMsg(null);
    const { error } = await supabase
      .from("fee_types")
      .delete()
      .eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) {
      setMsg(
        error.message.includes("foreign key") ||
          error.message.includes("violates")
          ? `Cannot delete “${deleteTarget.name}” — it is linked to existing student fees or payments. Clear those records first.`
          : error.message
      );
      setDeleteTarget(null);
      return;
    }
    setMsg(`Deleted “${deleteTarget.name}”`);
    setDeleteTarget(null);
    setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    router.refresh();
  };

  const addType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving("new");
    setMsg(null);
    const isBus = isSchoolBusFeeName(newName);
    const amount = isBus ? 0 : parseMoneyInput(newAmountDisplay);
    const { error } = await supabase.from("fee_types").insert({
      name: newName.trim(),
      default_amount: amount,
      is_active: true,
    });
    setSaving(null);
    if (error) {
      setMsg(error.message);
      return;
    }
    setNewName("");
    setNewAmountDisplay("");
    setMsg(
      isBus
        ? `Added “${newName.trim()}” — set prices per route on School bus`
        : `Added “${newName.trim()}” — it will appear on Record Payment`
    );
    router.refresh();
  };

  const newIsBus = isSchoolBusFeeName(newName);

  return (
    <div className="space-y-6">
      {msg && (
        <p className="text-sm text-indigo-800 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
          {msg}
        </p>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-800 dark:text-white">
            Fee catalogue
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Edit name and price, then Save. School Bus has no catalogue price —
            set price per route on the School bus page.
          </p>
        </div>
        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Fee name</th>
                <th className="px-4 py-3">Default price (₦)</th>
                <th className="px-4 py-3 w-40 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((r) => (
                <FeeRow
                  key={r.id}
                  row={r}
                  saving={saving === r.id}
                  onSave={(name, amt) => saveRow(r.id, name, amt)}
                  onDelete={() => setDeleteTarget(r)}
                />
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <p className="p-6 text-center text-slate-400 text-sm">
            No fee types — add School Fees, NECO, JAMB, Uniform, School Bus
            below
          </p>
        )}
      </div>

      <form
        onSubmit={addType}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-3 max-w-lg"
      >
        <p className="font-semibold text-slate-800 dark:text-white text-sm">
          Add another fee type
        </p>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Fee name (e.g. Testimonial, WAEC)"
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
          required
        />
        {newIsBus ? (
          <p className="text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            School Bus prices are set per route on the{" "}
            <strong>School bus</strong> page (director only). No default price
            here.
          </p>
        ) : (
          <MoneyInput
            value={newAmountDisplay}
            onValueChange={(d) => setNewAmountDisplay(d)}
            placeholder="Default price"
            className="w-full"
          />
        )}
        <button
          type="submit"
          disabled={saving === "new"}
          className="ai-btn-primary w-full justify-center"
        >
          {saving === "new" ? "Saving…" : "Add fee type"}
        </button>
      </form>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete fee type?"
        message={
          deleteTarget
            ? `Delete “${deleteTarget.name}”? This removes it from the catalogue. If students already have this fee, deletion may fail — clear those records first.`
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function FeeRow({
  row,
  saving,
  onSave,
  onDelete,
}: {
  row: FeeType;
  saving: boolean;
  onSave: (name: string, amount: number) => void;
  onDelete: () => void;
}) {
  const isBus = isSchoolBusFeeName(row.name);
  const [name, setName] = useState(row.name);
  const [display, setDisplay] = useState(
    formatMoneyInput(String(Math.round(Number(row.default_amount || 0)) || ""))
  );

  useEffect(() => {
    setName(row.name);
    setDisplay(
      formatMoneyInput(String(Math.round(Number(row.default_amount || 0)) || ""))
    );
  }, [row.id, row.name, row.default_amount]);

  return (
    <tr>
      <td className="px-4 py-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-medium"
        />
        {isSchoolBusFeeName(name) && (
          <p className="text-[11px] text-blue-700 mt-1">
            Price is per bus route → School bus page
          </p>
        )}
      </td>
      <td className="px-4 py-3">
        {isSchoolBusFeeName(name) ? (
          <span className="text-xs text-slate-400 italic">
            Set on School bus
          </span>
        ) : (
          <MoneyInput
            value={display}
            onValueChange={(d) => setDisplay(d)}
            className="w-40"
          />
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={saving || !name.trim()}
            onClick={() =>
              onSave(
                name,
                isSchoolBusFeeName(name) ? 0 : parseMoneyInput(display)
              )
            }
            className="text-xs font-semibold text-indigo-600 hover:underline disabled:opacity-50"
          >
            {saving ? "…" : "Save"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onDelete}
            className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
