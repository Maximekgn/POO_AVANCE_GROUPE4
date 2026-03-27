import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import getCurrentUser from "@/app/(site)/actions/getCurrentUser";
import DemandeDetailClient from "./DemandeDetailClient";

type Props = {
  params: Promise<{ demandeId: string }>;
};

const DemandeDetailPage = async ({ params }: Props) => {
  const currentUser = await getCurrentUser();
  const { demandeId } = await params;

  if (!currentUser) {
    return (
      <ClientOnly>
        <EmptyState
          title="Connexion requise"
          subtitle="Veuillez vous connecter pour voir cette page."
        />
      </ClientOnly>
    );
  }

  return (
    <ClientOnly>
      <DemandeDetailClient demandeId={demandeId} currentUser={currentUser} />
    </ClientOnly>
  );
};

export default DemandeDetailPage;
