import Link from "next/link";
import { notFound } from "next/navigation";

import getCurrentUser from "@/app/(site)/actions/getCurrentUser";
import Heading from "@/app/components/Heading";

import { getAdminBienById } from "../../lib/adminApi";
import AdminBienSidebar from "./AdminBienSidebar";
import ListingHead from "@/app/components/listings/ListingHead";
import ListingInfo from "@/app/components/listings/ListingInfo";

export const dynamic = "force-dynamic";

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);
};

const formatNumber = (value?: number | string | null) => {
  if (value === undefined || value === null || value === "") return "-";
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return String(value);
  return parsed.toLocaleString("fr-FR");
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const getPhotoUrl = (photo: {
  image?: string | null;
  url?: string | null;
}): string => {
  const photoPath = photo.image || photo.url;
  if (!photoPath) return "";
  if (photoPath.startsWith("http://") || photoPath.startsWith("https://")) {
    return photoPath;
  }
  if (photoPath.startsWith("/")) {
    return `${API_URL.replace("/api", "")}${photoPath}`;
  }
  return photoPath;
};

interface PageProps {
  params: Promise<{
    bienId: string;
  }>;
}

export default async function AdminBienDetailPage(props: PageProps) {
  const params = await props.params;
  const currentUser = await getCurrentUser();
  if (!currentUser || !(currentUser as any).accessToken) {
    return (
      <div className="p-8">
        <Heading
          title="Non autorisé"
          subtitle="Veuillez vous connecter en tant qu'administrateur."
        />
      </div>
    );
  }

  const token = (currentUser as any).accessToken;
  const parsedId = parseInt(params.bienId, 10);
  if (Number.isNaN(parsedId)) {
    notFound();
  }

  const bien = await getAdminBienById(parsedId, { accessToken: token }).catch(
    () => null,
  );
  if (!bien) {
    return (
      <div className="p-8">
        <Heading
          title="Bien introuvable"
          subtitle="Le bien demandé n'existe pas ou est inaccessible."
        />
        <div className="mt-4">
          <Link
            href="/admin/dashboard/biens"
            className="text-blue-500 hover:underline"
          >
            Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  const photoUrls = (bien.photos || [])
    .map((p: any) => getPhotoUrl(p))
    .filter((src: string) => src.length > 0);

  const mainImageSrc = photoUrls[0] || "/images/placeholder.jpg";

  const ownerUser = {
    name: bien.proprietaire_nom || "Propriétaire inconnu",
    image: bien.proprietaire_avatar || null,
  };

  const categoryObject = bien.categorie_nom
    ? { icon: null, label: bien.categorie_nom, description: "" }
    : undefined;

  return (
    <div className="flex-col">
      <div className="mb-6">
        <Link
          href="/admin/dashboard/biens"
          className="text-blue-500 hover:underline flex items-center"
        >
          ← Retour à la liste des biens
        </Link>
      </div>

      <div className="max-w-screen-xl mx-auto">
        <div className="flex flex-col gap-6">
          <ListingHead
            title={bien.reference || "Sans référence"}
            imageSrc={mainImageSrc}
            locationValue={bien.ville || ""}
            locationLabel={`${bien.adresse || ""}${bien.adresse ? ", " : ""}${bien.ville || ""} ${bien.code_postal || ""}`}
            id={String(bien.id)}
            currentUser={currentUser}
            imageSources={photoUrls}
          />

          <div className="grid grid-cols-1 md:grid-cols-7 md:gap-10 mt-6">
            <div className="col-span-4">
              <div className="flex gap-4 mb-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${bien.statut === "VACANT"
                    ? "bg-green-100 text-green-800"
                    : bien.statut === "EN_ATTENTE_VALIDATION"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                    }`}
                >
                  {bien.statut || "INCONNU"}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${bien.is_active
                    ? "bg-blue-100 text-blue-800"
                    : "bg-red-100 text-red-800"
                    }`}
                >
                  {bien.is_active ? "ACTIF (Publié)" : "INACTIF (Masqué)"}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                  {bien.categorie_nom || "Sans catégorie"}
                  {bien.sous_type_nom ? ` - ${bien.sous_type_nom}` : ""}
                </span>
              </div>

              <hr className="my-6" />

              <div className="flex flex-col gap-2">
                <div className="text-xl font-semibold flex flex-row items-center gap-2">
                  <div>Informations financières</div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-gray-500 text-sm">
                      Loyer Mensuel HC
                    </div>
                    <div className="font-bold text-lg">
                      {formatNumber(bien.loyer_hc)} FCFA
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-gray-500 text-sm">Charges</div>
                    <div className="font-bold text-lg">
                      {formatNumber(bien.charges)} FCFA
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-gray-500 text-sm">
                      Dépôt de garantie
                    </div>
                    <div className="font-bold text-lg">
                      {formatNumber(bien.depot_garantie)} FCFA
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-gray-500 text-sm">Prix par jour</div>
                    <div className="font-bold text-lg">
                      {formatNumber(bien.prix_jour)} FCFA
                    </div>
                  </div>
                </div>
              </div>

              <hr className="my-6" />

              <ListingInfo
                user={ownerUser}
                category={categoryObject as any}
                description={bien.description || "Aucune description fournie."}
                roomCount={bien.nb_pieces || 1}
                guestCount={1}
                bathroomCount={1}
                locationValue={bien.ville}
              />

              <hr className="my-6" />

              <div className="flex flex-col gap-2">
                <div className="text-xl font-semibold flex flex-row items-center gap-2">
                  <div>Caractéristiques Techniques</div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-sm">Superficie</span>
                    <span className="font-semibold">{bien.superficie} m²</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-sm">Étage</span>
                    <span className="font-semibold">
                      {bien.etage !== null ? bien.etage : "Non spécifié"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-sm">Meublé</span>
                    <span className="font-semibold">
                      {bien.meuble ? "Oui" : "Non"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-sm">Référence</span>
                    <span className="font-semibold">{bien.reference}</span>
                  </div>
                </div>
              </div>

              <hr className="my-6" />

              <div className="flex flex-col gap-2">
                <div className="text-xl font-semibold flex flex-row items-center gap-2">
                  <div>Traçabilité & Propriétaire</div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-sm">
                      Email Propriétaire
                    </span>
                    <span className="font-semibold">
                      {bien.proprietaire_email || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-sm">Téléphone</span>
                    <span className="font-semibold">
                      {bien.proprietaire_telephone || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-sm">
                      Date de création
                    </span>
                    <span className="font-semibold">
                      {formatDate(bien.date_creation)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-sm">Date de maj</span>
                    <span className="font-semibold">
                      {formatDate(bien.date_modification)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-3 lg:col-span-3">
              <AdminBienSidebar bien={bien as any} accessToken={token} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
