"use client";

import type { CurrentUser } from "@/app/(site)/actions/getCurrentUser";
import Container from "@/components/Container";
import Heading from "@/components/Heading";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import ListingCard from "@/components/listings/ListingCard";

type DemandeItem = {
  id: number;
  bien: number;
  bien_reference: string;
  bien_adresse: string;
  bien_image?: string;
  demandeur: number;
  demandeur_nom: string;
  proprietaire: number;
  proprietaire_nom: string;
  type_demande: "VISITE" | "PRIVATISATION" | "LOCATION_DIRECTE";
  statut: "EN_ATTENTE" | "ACCEPTEE" | "REFUSEE" | "ANNULEE" | "EXPIREE";
  date_debut: string;
  date_fin: string;
  date_visite?: string;
  duree_jours: number;
  montant_total: number;
  date_creation: string;
  paiement_demande_envoyee?: boolean;
  paiement_effectue?: boolean;
};

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

interface TripsClientProps {
  currentUser?: CurrentUser | null;
  reservations: ReservationItem[];
}

const TripsClient: React.FC<TripsClientProps> = ({
  currentUser,
  reservations,
}) => {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState("");
  const [activeTab, setActiveTab] = useState<"reservations" | "demandes">(
    "demandes",
  );
  const [loadingDemandes, setLoadingDemandes] = useState(false);
  const [demandes, setDemandes] = useState<DemandeItem[]>([]);
  const [confirmingPayment, setConfirmingPayment] = useState<number | null>(
    null,
  );

  const fetchDemandes = useCallback(async () => {
    setLoadingDemandes(true);
    try {
      const response = await axios.get("/api/demandes-actions");
      setDemandes(Array.isArray(response.data) ? response.data : []);
    } catch {
      toast.error("Impossible de charger vos demandes.");
    } finally {
      setLoadingDemandes(false);
    }
  }, []);

  const handleConfirmPayment = useCallback(async (demandeId: number) => {
    setConfirmingPayment(demandeId);
    try {
      await axios.post(`/api/demandes-actions/${demandeId}/confirm-payment`);
      toast.success(
        "Paiement confirmé. Le propriétaire va finaliser la location.",
      );
      setDemandes((prev) =>
        prev.map((d) =>
          d.id === demandeId ? { ...d, paiement_effectue: true } : d,
        ),
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data?.detail ||
          "Erreur lors de la confirmation du paiement.",
      );
    } finally {
      setConfirmingPayment(null);
    }
  }, []);

  const getRemainingTime = (dateFin: string) => {
    const end = new Date(dateFin).getTime();
    const now = new Date().getTime();
    const diff = end - now;
    if (diff <= 0) return "Expiré";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days} j, ${hours} h restantes`;
    if (hours > 0) return `${hours} h, ${minutes} min restantes`;
    return `${minutes} min restantes`;
  };

  useEffect(() => {
    if (activeTab === "demandes") {
      fetchDemandes();
    }
  }, [activeTab, fetchDemandes]);

  const onCancel = useCallback(
    async (id: string) => {
      setDeletingId(id);

      axios
        .delete(`/api/reservations/${id}`)
        .then(() => {
          toast.success("Reservation cancelled successfully");
          router.refresh();
        })
        .catch((error) => {
          toast.error(error?.response?.data?.message || "Something went wrong");
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
        title="Mes Voyages & Réservations"
        subtitle="Consultez les statuts de vos locations, visites et privatisations"
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
          Mes Demandes et Privatisations
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
          Anciennes réservations
        </button>
      </div>

      {activeTab === "demandes" ? (
        <div className="mt-6">
          {loadingDemandes ? (
            <p className="text-sm text-neutral-500">
              Chargement de vos demandes...
            </p>
          ) : demandes.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Vous n'avez effectué aucune demande pour le moment.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8">
              {demandes.map((demande) => {
                const listingData = {
                  id: String(demande.bien),
                  imageSrc: demande.bien_image,
                  locationValue: demande.bien_adresse,
                  ville: demande.bien_adresse,
                  category: demande.type_demande,
                  price: demande.montant_total / (demande.duree_jours || 1),
                };

                const reservationData = {
                  totalPrice: demande.montant_total,
                  startDate:
                    demande.type_demande === "VISITE" && demande.date_visite
                      ? demande.date_visite
                      : demande.date_debut,
                  endDate:
                    demande.type_demande === "VISITE" && demande.date_visite
                      ? demande.date_visite
                      : demande.date_fin,
                };

                const isPrivatisationActive =
                  demande.type_demande === "PRIVATISATION" &&
                  demande.statut === "ACCEPTEE";

                return (
                  <div key={demande.id} className="flex flex-col gap-3">
                    <ListingCard
                      data={listingData}
                      reservation={reservationData}
                      currentUser={currentUser}
                    />
                    <div className="flex flex-col gap-2 px-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span
                          className={`px-2 py-0.5 rounded-full ${
                            demande.statut === "ACCEPTEE"
                              ? "bg-green-100 text-green-700"
                              : demande.statut === "REFUSEE"
                                ? "bg-red-100 text-blue-700"
                                : demande.statut === "EXPIREE"
                                  ? "bg-gray-100 text-gray-700"
                                  : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {demande.statut}
                        </span>
                        <span className="text-neutral-500 text-right">
                          {demande.type_demande === "VISITE" &&
                          demande.statut === "ACCEPTEE" &&
                          demande.date_visite
                            ? new Date(demande.date_visite).toLocaleString(
                                "fr-FR",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )
                            : ""}
                        </span>
                      </div>

                      {isPrivatisationActive && (
                        <div className="mt-2 text-center py-2 px-3 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100 shadow-sm flex items-center justify-center gap-2">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                          </span>
                          Temps restant: {getRemainingTime(demande.date_fin)}
                        </div>
                      )}

                      {/* Payment confirmation button for accepted location demands */}
                      {demande.statut === "ACCEPTEE" &&
                        demande.type_demande === "LOCATION_DIRECTE" && (
                          <div className="mt-2 flex flex-col gap-2">
                            {demande.paiement_demande_envoyee &&
                            !demande.paiement_effectue ? (
                              <button
                                type="button"
                                onClick={() => handleConfirmPayment(demande.id)}
                                disabled={confirmingPayment === demande.id}
                                className="
                                flex
                                items-center
                                justify-center
                                rounded-lg
                                bg-green-600
                                py-2
                                text-xs
                                font-bold
                                text-white
                                hover:bg-green-700
                                transition
                                disabled:opacity-50
                              "
                              >
                                {confirmingPayment === demande.id
                                  ? "Traitement..."
                                  : "✅ Confirmer le paiement"}
                              </button>
                            ) : demande.paiement_effectue ? (
                              <div className="text-center text-xs text-green-600 bg-green-50 py-2 rounded-lg">
                                Paiement confirmé - En attente du bail
                              </div>
                            ) : (
                              <div className="text-center text-xs text-neutral-500 bg-neutral-50 py-2 rounded-lg">
                                En attente de la demande de paiement du
                                propriétaire
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}
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
          {reservations.map((reservation) => (
            <ListingCard
              key={reservation.id}
              data={reservation.listing}
              reservation={reservation}
              actionId={reservation.id}
              onAction={onCancel}
              disabled={deletingId === reservation.id}
              actionLabel="Annuler la réservation"
              currentUser={currentUser}
            />
          ))}
        </div>
      )}
    </Container>
  );
};

export default TripsClient;
