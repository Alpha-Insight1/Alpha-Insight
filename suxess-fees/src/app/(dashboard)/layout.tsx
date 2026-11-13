import { Sidebar } from "@/components/layout/sidebar";
import {
  PrivacyModeButton,
  PrivacyModeInit,
} from "@/components/layout/privacy-mode";
import { getCurrentProfile, isAdmin } from "@/lib/auth";
import { FloatingActions } from "@/components/layout/floating-actions";
import { createClient } from "@/lib/supabase/server";

async function getUnreadMessageCount(userId: string): Promise<number> {
  try {
    const supabase = await createClient();
    const { data: memberships } = await supabase
      .from("conversation_members")
      .select("conversation_id, last_read_at")
      .eq("user_id", userId);

    if (!memberships?.length) return 0;

    let unread = 0;
    for (const m of memberships) {
      let q = supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", m.conversation_id)
        .neq("sender_id", userId);
      if (m.last_read_at) {
        q = q.gt("created_at", m.last_read_at);
      }
      const { count } = await q;
      unread += count || 0;
    }
    return unread;
  } catch {
    return 0;
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  const admin = isAdmin(profile);

  const roleLabel = admin
    ? "Director"
    : profile?.role === "secretary"
      ? "Secretary"
      : "Staff";
  const campusLabel =
    profile?.campuses?.short_name || profile?.campuses?.name || "School";

  const unreadMessages = profile
    ? await getUnreadMessageCount(profile.id)
    : 0;

  return (
    <div className="min-h-screen bg-transparent">
      <Sidebar
        roleLabel={roleLabel}
        campusLabel={campusLabel}
        isAdminUser={admin}
      />
      <main className="pt-14 lg:pt-0 lg:ml-64 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 max-w-[100vw] overflow-x-hidden">
          {admin && (
            <div className="flex justify-end mb-3">
              <PrivacyModeButton />
            </div>
          )}
          <PrivacyModeInit />
          {children}
          <FloatingActions isAdmin={admin} unreadMessages={unreadMessages} />
          <p className="text-center text-[11px] text-slate-400 mt-10 pb-4">
            Built by{" "}
            <span className="font-medium text-gray-500 dark:text-gray-400">
              Alpha Insight
            </span>{" "}
            · Strategy & Business Analytics
          </p>
        </div>
      </main>
    </div>
  );
}
