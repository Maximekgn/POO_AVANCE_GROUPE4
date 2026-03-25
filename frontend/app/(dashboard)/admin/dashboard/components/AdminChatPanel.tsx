"use client";

import ChatWindow from "@/app/components/chat/ChatWindow";

type CurrentUserLite = {
  id: string | number;
  isAdmin: boolean;
  accessToken?: string;
};

type AdminChatPanelProps = {
  currentUser: CurrentUserLite | null;
};

export default function AdminChatPanel({ currentUser }: AdminChatPanelProps) {
  if (!currentUser?.accessToken || !currentUser.isAdmin) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-3">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-neutral-900">
          Messagerie en direct
        </h2>
        <p className="text-sm text-neutral-500">
          Repondez instantanement aux messages des utilisateurs.
        </p>
      </div>
      <div className="h-[640px]">
        <ChatWindow
          currentUser={{ id: currentUser.id, isAdmin: currentUser.isAdmin }}
          accessToken={currentUser.accessToken}
          showConversationList
        />
      </div>
    </section>
  );
}
