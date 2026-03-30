import Link from "next/link";
import { notFound } from "next/navigation";

import getCurrentUser from "@/app/(site)/actions/getCurrentUser";
import Heading from "@/components/Heading";

import { getAdminBienById } from "../../lib/adminApi";
import AdminBienSidebar from "./AdminBienSidebar";
import BienFinancierSection from "./BienFinancierSection";
import ListingHead from "@/components/listings/ListingHead";
import ListingInfo from "@/components/listings/ListingInfo";
import BackButton from "@/components/BackButton";

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
  if (value === undefined || value === null || value === "") return "0";
  const parsed = typeof value === "string" ? parseFloat(value) : Number(value);
  if (Number.isNaN(parsed)) return "0";
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
        <BackButton />
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
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    bien.statut === "VACANT"
                      ? "bg-green-100 text-green-800"
                      : bien.statut === "EN_ATTENTE_VALIDATION"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {bien.statut || "INCONNU"}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    bien.is_active
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

              {/* Section Occupation du bien */}
              <div className="flex flex-col gap-2">
                <div className="text-xl font-semibold flex flex-row items-center gap-2">
                  <div>📋 Occupation du bien</div>
                </div>

                {/* Locataire actuel */}
                {bien.locataire_actuel ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-2">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-semibold text-green-800">
                        ✅ Locataire actuel
                      </span>
                      <span className="text-xs text-green-600 font-medium ml-auto">
                        {bien.locataire_actuel.statut_bail === "EN_COURS"
                          ? "Bail en cours"
                          : "Bail en attente de signature"}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-700">Nom :</span>
                        <span className="font-medium text-green-900">
                          {bien.locataire_actuel.nom || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-green-700">Email :</span>
                        <span className="text-green-900 text-xs">
                          {bien.locataire_actuel.email || "N/A"}
                        </span>
                      </div>
                      {bien.locataire_actuel.telephone && (
                        <div className="flex justify-between text-sm">
                          <span className="text-green-700">Téléphone :</span>
                          <span className="text-green-900 text-xs">
                            {bien.locataire_actuel.telephone}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-green-700">Période :</span>
                        <span className="text-green-900 text-xs">
                          {bien.locataire_actuel.date_entree
                            ? new Date(
                                bien.locataire_actuel.date_entree,
                              ).toLocaleDateString("fr-FR")
                            : "N/A"}{" "}
                          -{" "}
                          {bien.locataire_actuel.date_sortie
                            ? new Date(
                                bien.locataire_actuel.date_sortie,
                              ).toLocaleDateString("fr-FR")
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t border-green-200">
                        <span className="text-green-700">Loyer mensuel :</span>
                        <span className="font-bold text-green-900">
                          {bien.locataire_actuel.loyer
                            ? parseFloat(
                                bien.locataire_actuel.loyer,
                              ).toLocaleString("fr-FR")
                            : "0"}{" "}
                          FCFA
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-2">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-semibold text-blue-800">
                        👤 Locataire actuel
                      </span>
                    </div>
                    <div className="text-sm text-blue-700">
                      <p className="font-medium">
                        Aucun locataire actif pour le moment
                      </p>
                      <p className="text-xs mt-1">
                        Les informations du locataire s'afficheront ici
                        lorsqu'un bail sera en cours.
                      </p>
                    </div>
                  </div>
                )}

                {/* Visites & Privatisations */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-2">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-purple-800">
                      📅 Visites & Privatisations
                    </span>
                    <span className="text-xs text-purple-600 font-medium">
                      {bien.visites_a_venir || 0} visites •{" "}
                      {bien.privatisations_actives || 0} privatisations
                    </span>
                  </div>
                  <div className="text-sm text-purple-700">
                    {(bien.visites_a_venir || 0) > 0 ||
                    (bien.privatisations_actives || 0) > 0 ? (
                      <p className="font-medium">
                        {bien.visites_a_venir || 0} visite(s) et{" "}
                        {bien.privatisations_actives || 0} privatisation(s) en
                        cours
                      </p>
                    ) : (
                      <p className="font-medium">
                        Aucune visite ou privatisation en cours
                      </p>
                    )}
                    <p className="text-xs mt-1">
                      Les demandes acceptées s'afficheront ici.
                    </p>
                  </div>
                </div>

                {/* Demandes en attente */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-2">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-amber-800">
                      📝 Demandes en attente
                    </span>
                    <span className="text-xs text-amber-600 font-medium">
                      {bien.demandes_en_attente || 0}
                    </span>
                  </div>
                  <div className="text-sm text-amber-700">
                    {(bien.demandes_en_attente || 0) > 0 ? (
                      <p className="font-medium">
                        {bien.demandes_en_attente} demande(s) de location en
                        attente de traitement
                      </p>
                    ) : (
                      <p className="font-medium">
                        Aucune demande de bail pour ce bien
                      </p>
                    )}
                    <p className="text-xs mt-1">
                      Les demandes de location s'afficheront ici.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2 flex-wrap">
                  <Link
                    href={`/admin/dashboard/biens/${bien.id}/create-lease`}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
                  >
                    <span>📄</span>
                    Créer et envoyer un bail
                  </Link>
                  {bien.demandes_en_attente > 0 && (
                    <Link
                      href={`/admin/dashboard/demandes-actions?bien=${bien.id}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 transition"
                    >
                      <span>📋</span>
                      Voir les demandes ({bien.demandes_en_attente})
                    </Link>
                  )}
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
                locationValue={bien.ville || ""}
                nb_salons={0}
                nb_chambres={0}
                nb_douches={1}
                superficie={Number(bien.superficie) || 0}
                avance={0}
              />

              <hr className="my-6" />

              {/* Section financière (pour proprio et admin) */}
              {currentUser?.accessToken && (
                <BienFinancierSection
                  bienId={bien.id}
                  token={currentUser.accessToken}
                  apiUrl={API_URL}
                />
              )}

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
