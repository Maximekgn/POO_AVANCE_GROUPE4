import Heading from "@/app/components/Heading";
import getCurrentUser from "@/app/actions/getCurrentUser";

import { getAdminBiens } from "../lib/adminApi";
import BiensTableClient from "./BiensTableClient";

export const dynamic = "force-dynamic";

export default async function AdminBiensPage() {
  const currentUser = await getCurrentUser();
  const biens = await getAdminBiens(currentUser || {});
  const accessToken = (currentUser as any)?.accessToken || "";

  return (
    <div className="space-y-6">
      <Heading
        title="Biens immobiliers"
        subtitle="Validation admin, activation et suivi de publication"
      />

      <BiensTableClient initialBiens={biens} accessToken={accessToken} />
    </div>
  );
}
