import Heading from "@/components/Heading";
import getCurrentUser from "@/app/(site)/actions/getCurrentUser";

import { getAdminCategories } from "../lib/adminApi";
import CategoriesTableClient from "./CategoriesTableClient";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const currentUser = await getCurrentUser();
  const categories = await getAdminCategories(currentUser || {});
  const accessToken = (currentUser as any)?.accessToken || "";

  return (
    <div className="space-y-6">
      <Heading
        title="Catégories"
        subtitle="Gérer les types de biens immobiliers sur la plateforme"
      />

      <CategoriesTableClient initialCategories={categories} accessToken={accessToken} />
    </div>
  );
}
