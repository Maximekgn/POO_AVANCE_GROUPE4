"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Container from "@/components/Container";
import Heading from "@/components/Heading";
import type { CurrentUser } from "@/app/(site)/actions/getCurrentUser";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import ListingCard from "@/components/listings/ListingCard";

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
  bien_image?: string;
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
  paiement_demande_envoyee?: boolean;
  paiement_effectue?: boolean;
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
  const [requestingPayment, setRequestingPayment] = useState<number | null>(
    null,
  );
  const [finalisingLocation, setFinalisingLocation] = useState<number | null>(
    null,
  );

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

  const handleRequestPayment = useCallback(async (demandeId: number) => {
    setRequestingPayment(demandeId);
    try {
      await axios.post(`/api/demandes-actions/${demandeId}/request-payment`);
      toast.success("Demande de paiement envoyée au locataire.");
      // Update local state
      setDemandes((prev) =>
        prev.map((d) =>
          d.id === demandeId ? { ...d, paiement_demande_envoyee: true } : d,
        ),
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data?.detail ||
          "Erreur lors de la demande de paiement.",
      );
    } finally {
      setRequestingPayment(null);
    }
  }, []);

  const handleConfirmPayment = useCallback(async (demandeId: number) => {
    setRequestingPayment(demandeId);
    try {
      await axios.post(`/api/demandes-actions/${demandeId}/confirm-payment`);
      toast.success(
        "Paiement confirmé. Le propriétaire peut finaliser la location.",
      );
      // Update local state
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
      setRequestingPayment(null);
    }
  }, []);

  const handleFinaliserLocation = useCallback(
    async (demandeId: number) => {
      setFinalisingLocation(demandeId);
      try {
        await axios.post(`/api/demandes-actions/${demandeId}/finaliser`);
        toast.success(
          "Location finalisée. Le contrat de bail a été envoyé par email.",
        );
        // Refresh the list
        fetchDemandes();
      } catch (error: any) {
        toast.error(
          error?.response?.data?.detail ||
            "Erreur lors de la finalisation de la location.",
        );
      } finally {
        setFinalisingLocation(null);
      }
    },
    [fetchDemandes],
  );

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
              Aucune demande reçue pour le moment.
            </p>
          ) : (
            <div
              className="
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
              {demandes.map((demande) => {
                const listingData = {
                  id: String(demande.bien),
                  imageSrc: demande.bien_image,
                  locationValue: demande.bien_adresse,
                  ville: demande.bien_adresse,
                  category:
                    typeLabel[demande.type_demande] || demande.type_demande,
                  price: demande.montant_total / (demande.duree_jours || 1),
                };

                const reservationData = {
                  totalPrice: demande.montant_total,
                  startDate: demande.date_debut,
                  endDate: demande.date_fin,
                };

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
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {statutLabel[demande.statut]}
                        </span>
                        <span className="text-neutral-500">
                          {demande.demandeur_nom}
                        </span>
                      </div>

                      {/* Payment status indicators */}
                      {demande.statut === "ACCEPTEE" &&
                        demande.type_demande === "LOCATION_DIRECTE" && (
                          <div className="mt-2 flex flex-col gap-1 text-xs">
                            {demande.paiement_demande_envoyee ? (
                              <div className="flex items-center gap-1 text-amber-600">
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <span>Demande de paiement envoyée</span>
                              </div>
                            ) : (
                              <div className="text-neutral-500">
                                Paiement non demandé
                              </div>
                            )}
                            {demande.paiement_effectue && (
                              <div className="flex items-center gap-1 text-green-600">
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <span>Paiement effectué</span>
                              </div>
                            )}
                          </div>
                        )}

                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <Link
                          href={`/reservations/demandes/${demande.id}`}
                          className="
                            flex
                            items-center
                            justify-center
                            rounded-lg
                            border
                            border-neutral-300
                            bg-white
                            py-2
                            text-xs
                            font-bold
                            text-neutral-700
                            hover:bg-neutral-50
                            transition
                          "
                        >
                          Détails
                        </Link>
                        <button
                          type="button"
                          onClick={() => openChat(demande)}
                          className="
                            flex
                            items-center
                            justify-center
                            rounded-lg
                            border
                            border-neutral-300
                            bg-white
                            py-2
                            text-xs
                            font-bold
                            text-neutral-700
                            hover:bg-neutral-50
                            transition
                          "
                        >
                          Chat
                        </button>
                      </div>

                      {/* Action buttons for accepted location demands */}
                      {demande.statut === "ACCEPTEE" &&
                        demande.type_demande === "LOCATION_DIRECTE" && (
                          <div className="mt-2 flex flex-col gap-2">
                            {!demande.paiement_demande_envoyee ? (
                              <button
                                type="button"
                                onClick={() => handleRequestPayment(demande.id)}
                                disabled={requestingPayment === demande.id}
                                className="
                                flex
                                items-center
                                justify-center
                                rounded-lg
                                bg-amber-500
                                py-2
                                text-xs
                                font-bold
                                text-white
                                hover:bg-amber-600
                                transition
                                disabled:opacity-50
                              "
                              >
                                {requestingPayment === demande.id
                                  ? "Envoi..."
                                  : "💳 Demander le paiement"}
                              </button>
                            ) : !demande.paiement_effectue ? (
                              <div className="text-center text-xs text-amber-600 bg-amber-50 py-2 rounded-lg">
                                En attente du paiement du locataire...
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  handleFinaliserLocation(demande.id)
                                }
                                disabled={finalisingLocation === demande.id}
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
                                {finalisingLocation === demande.id
                                  ? "Traitement..."
                                  : "🏠 Faire louer (Créer bail)"}
                              </button>
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
