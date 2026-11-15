"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  MoneyInput,
  formatMoneyInput,
  parseMoneyInput,
} from "@/components/ui/money-input";

type FeeType = {
  id: string;
  name: string;
  description: string | null;
  default_amount: number | null;
  is_active: boolean | null;
};

export function FeeSettingsClient({ initial }: { initial: FeeType[] }) {
  const [rows, setRows] = useState(initial);
  const [newName, setNewName] = useState("");
  const [newAmountDisplay, setNewAmountDisplay] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const saveAmount = async (id: string, amount: number) => {
    setSaving(id);
    setMsg(null);
    const { error } = await supabase
      .from("fee_types")
      .update({ default_amount: amount })
      .eq("id", id);
    setSaving(null);
    if (error) {
      setMsg(error.message + " — run sql/02 in Supabase for default_amount");
      return;
    }
    setMsg("Saved");
    router.refresh();
  };

  const addType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving("new");
    setMsg(null);
    const { error } = await supabase.from("fee_types").insert({
      name: newName.trim(),
      default_amount: parseMoneyInput(newAmountDisplay),
      is_active: true,
    });
    setSaving(null);
    if (error) {
      setMsg(error.message);
      return;
    }
    setNewName("");
    setNewAmountDisplay("");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {msg && (
        <p className="text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
          {msg}
        </p>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Fee type</th>
                <th className="px-4 py-3">Default price (₦)</th>
                <th className="px-4 py-3 w-28"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((r) => (
                <FeeRow
                  key={r.id}
                  row={r}
                  saving={saving === r.id}
                  onSave={(amt) => {
                    setRows((list) =>
                      list.map((x) =>
                        x.id === r.id ? { ...x, default_amount: amt } : x
                      )
                    );
                    saveAmount(r.id, amt);
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <p className="p-6 text-center text-slate-400 text-sm">
            No fee types yet — add one below
          </p>
        )}
      </div>

      <form
        onSubmit={addType}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-3 max-w-lg"
      >
        <p className="font-semibold text-slate-800 dark:text-white text-sm">
          Add fee type
        </p>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="e.g. Testimonial, Uniform, WAEC"
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
          required
        />
        <MoneyInput
          value={newAmountDisplay}
          onValueChange={(d) => setNewAmountDisplay(d)}
          placeholder="0"
          className="w-full"
        />
        <button
          type="submit"
          disabled={saving === "new"}
          className="ai-btn-primary w-full justify-center"
        >
          {saving === "new" ? "Saving…" : "Add fee type"}
        </button>
      </form>
    </div>
  );
}

function FeeRow({
  row,
  saving,
  onSave,
}: {
  row: FeeType;
  saving: boolean;
  onSave: (n: number) => void;
}) {
  const [display, setDisplay] = useState(
    formatMoneyInput(String(Math.round(Number(row.default_amount || 0))))
  );
  return (
    <tr>
      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
        {row.name}
      </td>
      <td className="px-4 py-3">
        <MoneyInput
          value={display}
          onValueChange={(d) => setDisplay(d)}
          className="w-40"
        />
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave(parseMoneyInput(display))}
          className="text-xs font-semibold text-indigo-600 hover:underline disabled:opacity-50"
        >
          {saving ? "…" : "Save"}
        </button>
      </td>
    </tr>
  );
}
