import ClientOnly from "@/app/components/ClientOnly";
import getCurrentUser from "@/app/actions/getCurrentUser";
import DemandeDetailClient from "./DemandeDetailClient";

type Props = {
  params: Promise<{ demandeId: string }>;
};

const DemandeDetailPage = async ({ params }: Props) => {
  const currentUser = await getCurrentUser();
  const { demandeId } = await params;

  return (
    <ClientOnly>
      <DemandeDetailClient demandeId={demandeId} currentUser={currentUser} />
    </ClientOnly>
  );
};

export default DemandeDetailPage;
