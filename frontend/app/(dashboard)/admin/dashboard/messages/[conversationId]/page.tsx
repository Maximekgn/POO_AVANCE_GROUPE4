import Link from "next/link";

import getCurrentUser from "@/app/(site)/actions/getCurrentUser";
import ChatWindow from "@/app/components/chat/ChatWindow";
import Heading from "@/components/Heading";

export const dynamic = "force-dynamic";

export default async function AdminConversationDetailPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser?.accessToken || !currentUser.isAdmin) {
    return (
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <Heading
          title="Conversation"
          subtitle="Accès indisponible pour cette session"
        />
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Heading
          title={`Conversation ${conversationId}`}
          subtitle="Vue dédiée pour traitement et suivi support"
        />
        <Link
          href="/admin/dashboard/messages"
          className="inline-flex rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Retour messagerie
        </Link>
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="h-[72vh] min-h-[520px]">
          <ChatWindow
            currentUser={{ id: currentUser.id, isAdmin: currentUser.isAdmin }}
            accessToken={currentUser.accessToken}
            showConversationList
            initialConversationId={conversationId}
          />
        </div>
      </section>
    </div>
  );
}
