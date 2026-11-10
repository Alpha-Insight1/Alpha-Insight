import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  MessagesClient,
  type ConversationRow,
  type MessageRow,
  type StaffUser,
} from "@/components/messages/messages-client";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const admin = isAdmin(profile);
  const supabase = await createClient();
  const params = await searchParams;
  const activeId = params.c || null;

  // All staff profiles except self (for "new message" picker)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .neq("id", profile.id)
    .order("full_name");

  let staff: StaffUser[] = (profiles || []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    role: p.role || "secretary",
  }));

  // Admin mainly messages secretaries; secretary mainly messages admin
  if (admin) {
    staff = staff.filter((s) => s.role !== "admin" && s.role !== "director");
  } else {
    staff = staff.filter(
      (s) => s.role === "admin" || s.role === "director"
    );
  }

  // Conversations for current user
  const { data: memberships, error: memErr } = await supabase
    .from("conversation_members")
    .select("conversation_id, last_read_at")
    .eq("user_id", profile.id);

  const convIds = (memberships || []).map((m) => m.conversation_id);
  const readMap = new Map(
    (memberships || []).map((m) => [m.conversation_id, m.last_read_at])
  );

  let conversations: ConversationRow[] = [];

  if (convIds.length > 0) {
    const { data: convs } = await supabase
      .from("conversations")
      .select("id, subject, updated_at")
      .in("id", convIds)
      .order("updated_at", { ascending: false });

    for (const c of convs || []) {
      const { data: members } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", c.id);

      const otherIds = (members || [])
        .map((m) => m.user_id)
        .filter((id) => id !== profile.id);
      const otherId = otherIds[0] || "";

      let otherName = "Staff";
      if (otherId) {
        const { data: op } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", otherId)
          .maybeSingle();
        otherName =
          op?.full_name ||
          (op?.role === "admin" ? "Director" : "Secretary");
      }

      const { data: lastMsg } = await supabase
        .from("messages")
        .select("body, created_at, sender_id")
        .eq("conversation_id", c.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastRead = readMap.get(c.id);
      const unread =
        !!lastMsg &&
        lastMsg.sender_id !== profile.id &&
        (!lastRead || lastMsg.created_at > lastRead);

      conversations.push({
        id: c.id,
        subject: c.subject,
        updated_at: c.updated_at,
        other_name: otherName,
        other_id: otherId,
        last_body: lastMsg?.body || null,
        unread,
      });
    }
  }

  let initialMessages: MessageRow[] = [];
  if (activeId) {
    // Mark read
    await supabase
      .from("conversation_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", activeId)
      .eq("user_id", profile.id);

    const { data: msgs } = await supabase
      .from("messages")
      .select("id, body, sender_id, created_at")
      .eq("conversation_id", activeId)
      .order("created_at", { ascending: true });

    const senderIds = Array.from(
      new Set((msgs || []).map((m) => m.sender_id))
    );
    const nameMap = new Map<string, string>();
    if (senderIds.length) {
      const { data: senders } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", senderIds);
      for (const s of senders || []) {
        nameMap.set(s.id, s.full_name || "User");
      }
    }

    initialMessages = (msgs || []).map((m) => ({
      id: m.id,
      body: m.body,
      sender_id: m.sender_id,
      created_at: m.created_at,
      sender_name: nameMap.get(m.sender_id) || null,
    }));
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Messages
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {admin
            ? "Chat with secretaries about school operations"
            : "Chat with the director"}
        </p>
      </div>

      {memErr && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm p-3">
          {memErr.message}. Run{" "}
          <code className="text-xs">migration-messages.sql</code> in Supabase
          SQL Editor.
        </div>
      )}

      <MessagesClient
        currentUserId={profile.id}
        isAdmin={admin}
        staff={staff}
        conversations={conversations}
        initialMessages={initialMessages}
        activeConversationId={activeId}
      />
    </div>
  );
}
