"use client";

import type { CurrentUser } from "@/app/(site)/actions/getCurrentUser";
import Container from "@/components/Container";
import Heading from "@/components/Heading";
import ListingCard from "@/components/listings/ListingCard";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

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
  endDate?: string | Date;
  listing: ListingItem;
};

type PaiementItem = {
  id: number;
  reference: string;
  montant: string;
  date_echeance: string;
  statut: string;
  date_paiement: string;
  mode_paiement: string;
  bail: {
    bien: {
      reference: string;
      ville: string;
    };
  };
};

interface LocationsClientProps {
  currentUser?: CurrentUser | null;
  reservations: ReservationItem[];
}

const LocationsClient: React.FC<LocationsClientProps> = ({
  currentUser,
  reservations,
}) => {
  const [activeTab, setActiveTab] = useState<"locations" | "loyers">("locations");
  const [loading, setLoading] = useState(false);
  const [paiements, setPaiements] = useState<PaiementItem[]>([]);
  const [simulating, setSimulating] = useState("");
  const [numeroTelephone, setNumeroTelephone] = useState("");
  const [reseau, setReseau] = useState("Orange");
  const [selectedPaiement, setSelectedPaiement] = useState<number | null>(null);

  const fetchPaiements = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/paiements/mes-loyers");
      setPaiements(response.data);
    } catch {
      toast.error("Impossible de charger vos loyers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "loyers") {
      fetchPaiements();
    }
  }, [activeTab, fetchPaiements]);

  const handleDownloadInvoice = (id: number) => {
    window.open(`/api/paiements/${id}/facture/download`, "_blank");
  };

  const simulatePaiement = async (id: number) => {
    if (!numeroTelephone || !reseau) {
      toast.error("Veuillez renseigner le numéro et le réseau.");
      return;
    }
    setSimulating(String(id));
    try {
      await axios.post(`/api/paiements/${id}/simulate-mobile-money`, {
        numero_telephone: numeroTelephone,
        reseau: reseau
      });
      toast.success("Paiement simulé avec succès !");
      setSelectedPaiement(null);
      fetchPaiements();
    } catch {
      toast.error("Erreur lors de la simulation du paiement.");
    } finally {
      setSimulating("");
    }
  };

  return (
    <Container>
      <Heading title="Mes locations" subtitle="Vos locations en cours et paiements de loyer" />
      
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("locations")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === "locations"
            ? "bg-neutral-900 text-white"
            : "bg-neutral-100 text-neutral-700"
            }`}
        >
          Mes Locations Actives
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("loyers")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === "loyers"
            ? "bg-neutral-900 text-white"
            : "bg-neutral-100 text-neutral-700"
            }`}
        >
          Mes Loyers et Paiements
        </button>
      </div>

      {activeTab === "locations" ? (
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
            currentUser={currentUser}
          />
        ))}
      </div>
      ) : (
        <div className="mt-8 space-y-4">
          {loading ? (
            <p className="text-sm text-neutral-500">Chargement...</p>
          ) : paiements.length === 0 ? (
            <p className="text-sm text-neutral-500">Aucun paiement trouvé.</p>
          ) : (
            paiements.map((paiement) => (
              <div key={paiement.id} className="p-5 border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-gray-800">Facture {paiement.reference}</h4>
                  <p className="text-sm text-gray-500">Bien: {paiement.bail.bien.reference} - {paiement.bail.bien.ville}</p>
                  <p className="text-sm text-gray-500">Montant: <span className="font-bold text-gray-800">{paiement.montant} FCFA</span></p>
                  <p className="text-sm text-gray-500">Échéance: {new Date(paiement.date_echeance).toLocaleDateString()}</p>
                  <div className="mt-2 text-xs font-semibold">
                    <span className={`px-2 py-1 rounded-full ${['PAYE', 'PAYE_A_L_ADMIN', 'REVERSE_AU_PROPRIETAIRE'].includes(paiement.statut) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {paiement.statut}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 min-w-[200px]">
                  {selectedPaiement === paiement.id ? (
                    <div className="p-3 bg-neutral-50 border rounded-lg space-y-3">
                      <p className="text-xs font-bold text-neutral-600">Paiement Mobile Money</p>
                      <select value={reseau} onChange={e => setReseau(e.target.value)} className="w-full text-sm p-2 border rounded">
                        <option value="Orange">Orange Money</option>
                        <option value="MTN">MTN Mobile Money</option>
                        <option value="Moov">Moov Money</option>
                      </select>
                      <input type="text" placeholder="Numéro de téléphone" value={numeroTelephone} onChange={e => setNumeroTelephone(e.target.value)} className="w-full text-sm p-2 border rounded" />
                      <div className="flex gap-2">
                        <button onClick={() => simulatePaiement(paiement.id)} disabled={simulating === String(paiement.id)} className="flex-1 bg-green-600 text-white text-xs font-bold py-2 rounded">
                          Confirmer
                        </button>
                        <button onClick={() => setSelectedPaiement(null)} className="flex-1 border text-xs font-bold py-2 rounded">
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {!['PAYE', 'PAYE_A_L_ADMIN', 'REVERSE_AU_PROPRIETAIRE'].includes(paiement.statut) && (
                        <button onClick={() => setSelectedPaiement(paiement.id)} className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 px-4 rounded w-full">
                          Payer Mobile Money
                        </button>
                      )}
                      
                      <button onClick={() => handleDownloadInvoice(paiement.id)} className="border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-sm font-bold py-2 px-4 rounded w-full">
                        Télécharger Facture
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </Container>
  );
};

export default LocationsClient;
