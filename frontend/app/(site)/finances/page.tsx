import ClientOnly from "@/components/ClientOnly";
import Container from "@/components/Container";
import Heading from "@/components/Heading";
import EmptyState from "@/components/EmptyState";

import getCurrentUser from "@/app/(site)/actions/getCurrentUser";
import getUserFinances from "@/app/(site)/actions/getUserFinances";
import FinancesClient from "./FinancesClient";

export const dynamic = "force-dynamic";

export default async function FinancesPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <ClientOnly>
        <EmptyState
          title="Connexion requise"
          subtitle="Connectez-vous pour consulter vos finances."
        />
      </ClientOnly>
    );
  }

  const financeData = await getUserFinances();

  if (!financeData) {
    return (
      <ClientOnly>
        <EmptyState
          title="Finances indisponibles"
          subtitle="Impossible de recuperer vos donnees financieres pour le moment."
        />
      </ClientOnly>
    );
  }

  return (
    <ClientOnly>
      <FinancesClient financeData={financeData} />
    </ClientOnly>
  );
}
