import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/app/components/ClientOnly";
import EmptyState from "@/app/components/EmptyState";

import {
  getAdminExpenses,
  getAdminFinanceStats,
  getAdminPayments,
} from "../lib/adminApi";
import FinancesDashboardClient from "./FinancesDashboardClient";

export const dynamic = "force-dynamic";

const AdminFinancesPage = async () => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <ClientOnly>
        <EmptyState
          title="Connexion requise"
          subtitle="Connectez-vous pour accéder au dashboard admin."
        />
      </ClientOnly>
    );
  }

  if (!currentUser.isAdmin) {
    return (
      <ClientOnly>
        <EmptyState
          title="Accès refusé"
          subtitle="Cette page est réservée aux administrateurs."
        />
      </ClientOnly>
    );
  }

  const [stats, payments, expenses] = await Promise.all([
    getAdminFinanceStats(currentUser || {}),
    getAdminPayments(currentUser || {}),
    getAdminExpenses(currentUser || {}),
  ]);

  return (
    <ClientOnly>
      <FinancesDashboardClient
        initialStats={stats}
        initialPayments={payments}
        initialExpenses={expenses}
      />
    </ClientOnly>
  );
};

export default AdminFinancesPage;
