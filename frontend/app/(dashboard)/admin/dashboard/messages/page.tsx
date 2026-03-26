import getCurrentUser from "@/app/(site)/actions/getCurrentUser";
import ChatWindow from "@/components/chat/ChatWindow";
import Heading from "@/components/Heading";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string }>;
}) {
  const resolvedParams = await searchParams;
  const currentUser = await getCurrentUser();

  if (!currentUser?.accessToken || !currentUser.isAdmin) {
    return (
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <Heading
          title="Messagerie"
          subtitle="Conversations en temps réel avec les utilisateurs"
        />
        <p className="mt-3 text-sm text-neutral-600">
          La session admin ne permet pas d'ouvrir la messagerie pour le moment.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <Heading
        title="Messagerie administrateur"
        subtitle="Boîte de réception centralisée pour le support utilisateur"
      />

      <section className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="mb-4">
          <p className="text-sm text-neutral-600">
            Sélectionnez une conversation pour répondre en direct et suivre les
            messages non lus.
          </p>
        </div>

        <div className="h-[70vh] min-h-[520px]">
          <ChatWindow
            currentUser={{ id: currentUser.id, isAdmin: currentUser.isAdmin }}
            accessToken={currentUser.accessToken}
            showConversationList
            initialConversationId={resolvedParams.conversation}
          />
        </div>
      </section>
    </div>
  );
}
