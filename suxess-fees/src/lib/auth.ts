import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type UserRole = "admin" | "secretary";

export type Profile = {
  id: string;
  full_name: string | null;
  role: UserRole;
  campus_id: string | null;
  campuses?: {
    id: string;
    name: string;
    short_name: string | null;
  } | null;
};

function normalizeRole(raw: unknown): UserRole {
  const r = String(raw || "")
    .trim()
    .toLowerCase();
  if (
    r === "admin" ||
    r === "director" ||
    r === "owner" ||
    r === "administrator"
  ) {
    return "admin";
  }
  return "secretary";
}

/**
 * Load signed-in profile. Never invent admin — but do not default to
 * secretary when the row exists and says admin.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Primary: profiles.id must equal auth.users.id
  const { data: row, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, campus_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[auth] profiles error:", error.message, {
      uid: user.id,
      email: user.email,
    });
  }

  let profileRow = row;

  // Fallback: older rows sometimes stored email in full_name with wrong id
  if (!profileRow && user.email) {
    const { data: byEmail } = await supabase
      .from("profiles")
      .select("id, full_name, role, campus_id")
      .or(`full_name.eq.${user.email}`)
      .limit(1)
      .maybeSingle();
    if (byEmail) {
      console.warn(
        "[auth] profile found by email but id mismatch",
        byEmail.id,
        "vs",
        user.id
      );
      profileRow = byEmail;
    }
  }

  if (!profileRow) {
    console.error("[auth] NO profile row for", user.id, user.email);
    return {
      id: user.id,
      full_name: user.email || null,
      role: "secretary",
      campus_id: null,
      campuses: null,
    };
  }

  const role = normalizeRole(profileRow.role);
  let campuses: Profile["campuses"] = null;

  if (profileRow.campus_id) {
    const { data: camp } = await supabase
      .from("campuses")
      .select("id, name, short_name")
      .eq("id", profileRow.campus_id)
      .maybeSingle();
    if (camp) {
      campuses = {
        id: camp.id,
        name: camp.name,
        short_name: camp.short_name,
      };
    }
  }

  return {
    id: user.id,
    full_name: profileRow.full_name,
    role,
    campus_id: profileRow.campus_id,
    campuses,
  };
});

export function isAdmin(profile: Profile | null): boolean {
  return profile?.role === "admin";
}

export function campusFilter(profile: Profile | null): string | null {
  if (!profile) return "00000000-0000-0000-0000-000000000000";
  if (profile.role === "admin") return null;
  if (profile.campus_id) return profile.campus_id;
  return "00000000-0000-0000-0000-000000000000";
}
