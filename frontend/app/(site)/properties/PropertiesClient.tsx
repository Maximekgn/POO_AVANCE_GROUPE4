"use client";

import type { CurrentUser } from "@/app/(site)/actions/getCurrentUser";
import Container from "@/components/Container";
import Heading from "@/components/Heading";
import { useRouter } from "next/navigation";
import { useCallback, useState, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import OwnerListingCard from "./OwnerListingCard";

type ListingItem = {
  id: string;
  title: string;
  imageSrc?: string;
  locationValue?: string;
  ville?: string;
  category?: string;
  price?: number;
  priceMonthly?: number;
  statut?: string;
};

interface PropertiesClientProps {
  currentUser?: CurrentUser | null;
  listings: ListingItem[];
}

const PropertiesClient: React.FC<PropertiesClientProps> = ({
  currentUser,
  listings: initialListings,
}) => {
  const router = useRouter();
  const [listings, setListings] = useState(initialListings);
  const [deletingId, setDeletingId] = useState("");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      if (statusFilter !== "ALL" && item.statut !== statusFilter) return false;

      if (query) {
        const q = query.toLowerCase();
        return (
          item.title?.toLowerCase().includes(q) ||
          item.ville?.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [listings, query, statusFilter]);

  const onAction = useCallback(
    async (id: string, actionName: string) => {
      if (actionName === "DELETE") {
        if (!window.confirm("Voulez-vous vraiment supprimer ce bien ?")) return;
        setDeletingId(id);
        try {
          await axios.delete(`/api/listings/${id}`);
          toast.success("Bien supprimé");
          setListings((prev) => prev.filter((l) => l.id !== id));
          router.refresh();
        } catch (error: any) {
          toast.error(
            error?.response?.data?.message || "Erreur de suppression",
          );
        } finally {
          setDeletingId("");
        }
      } else if (actionName === "EDIT") {
        // Rediriger vers un formulaire de modification (à implémenter)
        toast.success("Redirection vers la modification...");
        router.push(`/properties/${id}/edit`);
      } else if (actionName === "TENANTS") {
        // Rediriger vers la liste des locataires pour ce bien
        router.push(`/properties/${id}/tenants`);
      } else if (actionName === "FINANCE") {
        // Rediriger vers la page des finances du bien
        router.push(`/finances?bien_id=${id}`);
      } else if (actionName === "REVIEWS") {
        // Rediriger vers la page des avis du bien
        router.push(`/properties/${id}/reviews`);
      }
    },
    [router],
  );

  return (
    <Container>
      <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Heading
            title="Mes propriétés"
            subtitle="Gérez vos biens immobiliers et suivez leurs statistiques"
          />
          <button
            onClick={() => router.push("/finances")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-2xl transition duration-200"
          >
            Accéder à mes Finances Globales
          </button>
        </div>

        <div className="bg-neutral-50 rounded-3xl p-6 border border-neutral-100 flex flex-col md:flex-row gap-4 mb-4 items-end">
          <div className="flex-1 w-full">
            <label className="text-xs font-bold text-neutral-500 uppercase ml-1 mb-1 block">
              Rechercher
            </label>
            <input
              type="text"
              placeholder="Nom du bien, ville, catégorie..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-neutral-300 outline-none focus:border-neutral-600 bg-white"
            />
          </div>
          <div className="w-full md:w-64">
            <label className="text-xs font-bold text-neutral-500 uppercase ml-1 mb-1 block">
              Filtrer par statut
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-neutral-300 outline-none focus:border-neutral-600 bg-white appearance-none cursor-pointer"
            >
              <option value="ALL">Tous les biens</option>
              <option value="VACANT">Vacants</option>
              <option value="LOUE">Loués</option>
              <option value="EN_ATTENTE_VALIDATION">
                En attente de validation
              </option>
            </select>
          </div>
        </div>

        <div
          className="
            grid
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-3
            xl:grid-cols-4
            gap-8
            "
        >
          {filteredListings.map((listing) => (
            <OwnerListingCard
              key={listing.id}
              data={listing}
              onAction={onAction}
              disabled={deletingId === listing.id}
            />
          ))}
        </div>
      </div>
    </Container>
  );
};

export default PropertiesClient;
