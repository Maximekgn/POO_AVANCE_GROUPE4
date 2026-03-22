"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Container from "../components/Container";
import Heading from "../components/Heading";
import type { CurrentUser } from "@/app/actions/getCurrentUser";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import ListingCard from "../components/listings/ListingCard";

type ListingItem = {
  id: string;
  imageSrc?: string;
  locationValue?: string;
  ville?: string;
  category?: string;
  price?: number;
  priceMonthly?: number;
};

type ReservationItem = {
  id: string;
  totalPrice?: number;
  startDate?: string | Date;
  endDate?: string | Date;
  listing: ListingItem;
};

type DemandeItem = {
  id: number;
  bien: number;
  bien_reference: string;
  bien_adresse: string;
  demandeur: number;
  demandeur_nom: string;
  demandeur_email?: string;
  demandeur_telephone?: string;
  proprietaire: number;
  proprietaire_nom: string;
  type_demande: "VISITE" | "PRIVATISATION" | "LOCATION_DIRECTE";
  statut: "EN_ATTENTE" | "ACCEPTEE" | "REFUSEE" | "ANNULEE";
  date_debut: string;
  date_fin: string;
  duree_jours: number;
  montant_total: number;
  date_creation: string;
};

interface ReservationsClientProps {
  reservations: ReservationItem[];
  currentUser: CurrentUser | null;
}

const ReservationsClient: React.FC<ReservationsClientProps> = ({
  reservations,
  currentUser,
}) => {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState("");
  const [activeTab, setActiveTab] = useState<"reservations" | "demandes">(
    "demandes",
  );
  const [loadingDemandes, setLoadingDemandes] = useState(false);
  const [demandes, setDemandes] = useState<DemandeItem[]>([]);

  const fetchDemandes = useCallback(async () => {
    setLoadingDemandes(true);
    try {
      const response = await axios.get("/api/demandes-actions?scope=incoming");
      setDemandes(Array.isArray(response.data) ? response.data : []);
    } catch {
      toast.error("Impossible de charger les demandes.");
    } finally {
      setLoadingDemandes(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "demandes") {
      fetchDemandes();
    }
  }, [activeTab, fetchDemandes]);

  const typeLabel = useMemo(
    () => ({
      VISITE: "Visite",
      PRIVATISATION: "Privatisation",
      LOCATION_DIRECTE: "Location directe",
    }),
    [],
  );

  const statutLabel = useMemo(
    () => ({
      EN_ATTENTE: "En attente",
      ACCEPTEE: "Acceptee",
      REFUSEE: "Refusee",
      ANNULEE: "Annulee",
    }),
    [],
  );

  const openChat = useCallback((demande: DemandeItem) => {
    const first = Math.min(demande.demandeur, demande.proprietaire);
    const second = Math.max(demande.demandeur, demande.proprietaire);
    const conversationId = `${first}_${second}`;
    window.dispatchEvent(
      new CustomEvent("chat:open", {
        detail: { conversationId },
      }),
    );
  }, []);

  const onCancel = useCallback(
    async (id: string) => {
      setDeletingId(id);

      axios
        .delete(`/api/reservations/${id}`)
        .then(() => {
          toast.success("Reservation cancelled");
          router.refresh();
        })
        .catch(() => {
          toast.error("Something went wrong");
        })
        .finally(() => {
          setDeletingId("");
        });
    },
    [router],
  );

  return (
    <Container>
      <Heading
        title="Reservations et demandes"
        subtitle="Suivez les demandes de visite, location et privatisation"
      />

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("demandes")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            activeTab === "demandes"
              ? "bg-neutral-900 text-white"
              : "bg-neutral-100 text-neutral-700"
          }`}
        >
          Demandes
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("reservations")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            activeTab === "reservations"
              ? "bg-neutral-900 text-white"
              : "bg-neutral-100 text-neutral-700"
          }`}
        >
          Reservations
        </button>
      </div>

      {activeTab === "demandes" ? (
        <div className="mt-6">
          {loadingDemandes ? (
            <p className="text-sm text-neutral-500">
              Chargement des demandes...
            </p>
          ) : demandes.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Aucune demande recu pour le moment.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-50 text-left text-neutral-600">
                  <tr>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Bien</th>
                    <th className="px-3 py-3">Demandeur</th>
                    <th className="px-3 py-3">Periode</th>
                    <th className="px-3 py-3">Statut</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {demandes.map((demande) => (
                    <tr
                      key={demande.id}
                      className="border-t border-neutral-100"
                    >
                      <td className="px-3 py-3">
                        {typeLabel[demande.type_demande] ||
                          demande.type_demande}
                      </td>
                      <td className="px-3 py-3">{demande.bien_reference}</td>
                      <td className="px-3 py-3">{demande.demandeur_nom}</td>
                      <td className="px-3 py-3">
                        {demande.date_debut} - {demande.date_fin}
                      </td>
                      <td className="px-3 py-3">
                        {statutLabel[demande.statut] || demande.statut}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <Link
                            href={`/reservations/demandes/${demande.id}`}
                            className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-700"
                          >
                            Voir detail
                          </Link>
                          <button
                            type="button"
                            onClick={() => openChat(demande)}
                            className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-700"
                          >
                            Chat
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div
          className="
            mt-10
            grid
            grid-cols-1
            sm:grid-cols-2
            md:grid-cols-3
            lg:grid-cols-4
            xl:grid-cols-5
            2xl:grid-cols-6
            gap-8
          "
        >
          {reservations.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Aucune reservation pour le moment.
            </p>
          ) : (
            reservations.map((reservation) => (
              <ListingCard
                key={reservation.id}
                data={reservation.listing}
                reservation={reservation}
                actionId={reservation.id}
                onAction={onCancel}
                disabled={deletingId === reservation.id}
                actionLabel="Cancel guest reservation"
                currentUser={currentUser}
              />
            ))
          )}
        </div>
      )}
    </Container>
  );
};

export default ReservationsClient;
