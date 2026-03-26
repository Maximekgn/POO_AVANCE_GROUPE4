import EmptyState from "@/components/EmptyState";
import ClientOnly from "@/components/ClientOnly";
import getCurrentUser from "@/app/(site)/actions/getCurrentUser";
import getListingById from "@/app/(site)/actions/getListingById";
import EditPropertyClient from "./EditPropertyClient";

export const dynamic = "force-dynamic";

interface IParams {
  propertyId: string;
}

const EditPropertyPage = async ({ params }: { params: Promise<IParams> }) => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <ClientOnly>
        <EmptyState title="Non autorisé" subtitle="Veuillez vous connecter." />
      </ClientOnly>
    );
  }

  const resolvedParams = await params;
  const property = await getListingById({ listingId: resolvedParams.propertyId });

  if (!property) {
    return (
      <ClientOnly>
        <EmptyState title="Bien introuvable" subtitle="Ce bien n'existe pas ou a été supprimé." />
      </ClientOnly>
    );
  }

  // Vérifier que le currentUser est bien le propriétaire du bien (facultatif mais recommandé)
  if (String(property.ownerId) !== String(currentUser.id)) {
      return (
        <ClientOnly>
          <EmptyState title="Accès refusé" subtitle="Vous n'êtes pas le propriétaire de ce bien." />
        </ClientOnly>
      );
  }

  return (
    <ClientOnly>
      <EditPropertyClient property={property} />
    </ClientOnly>
  );
};

export default EditPropertyPage;
