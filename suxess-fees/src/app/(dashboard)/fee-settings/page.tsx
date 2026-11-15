import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FeeSettingsClient } from "@/components/fees/fee-settings-client";

export default async function FeeSettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isAdmin(profile)) redirect("/");

  const supabase = await createClient();
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
          Director only — set default amounts for school fees, uniform, WAEC,
          testimonial, etc.
        </p>
      </div>
      {error && (
        <div className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
          {error.message}. Run{" "}
          <code className="text-xs">sql/02-RUN-ON-YOUR-CURRENT-PROJECT.sql</code>{" "}
          in Supabase (includes default_amount).
        </div>
      )}
      <FeeSettingsClient initial={(data as any) || []} />
    </div>
  );
}
