"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { AdminAssistant } from "@/components/admin/admin-assistant";

export function FloatingActions({
  isAdmin,
  unreadMessages = 0,
}: {
  isAdmin: boolean;
  unreadMessages?: number;
}) {
  const badge =
    unreadMessages > 0
      ? unreadMessages > 9
        ? "9+"
        : String(unreadMessages)
      : null;

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2.5">
      <Link
        href="/messages"
        className="relative flex items-center gap-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white pl-3.5 pr-4 py-2.5 shadow-lg shadow-indigo-600/20 transition text-[13px] font-semibold tracking-tight"
        title={badge ? `Messages (${unreadMessages} unread)` : "Messages"}
      >
        <span className="relative inline-flex">
          <MessageCircle className="w-4 h-4" />
          {badge && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-[9px] font-bold flex items-center justify-center ring-2 ring-indigo-600">
              {badge}
            </span>
          )}
        </span>
        Messages
      </Link>

      {isAdmin && <AdminAssistant docked />}
    </div>
  );
}
