import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FeeSettingsClient } from "@/components/fees/fee-settings-client";
import { DEFAULT_FEE_TYPES } from "@/lib/fee-types";

export default async function FeeSettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isAdmin(profile)) redirect("/");

  const supabase = await createClient();

  // Ensure core fee types exist
  for (const ft of DEFAULT_FEE_TYPES) {
    const { data: existing } = await supabase
      .from("fee_types")
      .select("id")
      .ilike("name", ft.name)
      .maybeSingle();
    if (!existing) {
      await supabase.from("fee_types").insert({
        name: ft.name,
        description: ft.description,
        default_amount: 0,
        is_active: true,
      });
    }
  }

  const { data, error } = await supabase
    .from("fee_types")
    .select("id, name, description, default_amount, is_active")
    .order("name");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Fee prices
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Director only — set names and amounts. Secretaries see the same list
          when recording payment (School Fees, NECO, JAMB, Uniform, School Bus,
          and any fee you add).
        </p>
      </div>
      {error && (
        <div className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
          {error.message}. Run{" "}
          <code className="text-xs">sql/04-FIX-PAYMENT-COLUMNS.sql</code> in
          Supabase.
        </div>
      )}
      <FeeSettingsClient initial={(data as any) || []} />
    </div>
  );
}
