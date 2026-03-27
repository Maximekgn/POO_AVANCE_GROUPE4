"use client";

import Container from "@/components/Container";
import Heading from "@/components/Heading";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { FiHome } from "react-icons/fi";

interface TenantsClientProps {
  reservations: any[];
  propertyId: string;
}

const TenantsClient: React.FC<TenantsClientProps> = ({
  reservations,
  propertyId,
}) => {
  const router = useRouter();

  // Filter reservations relevant to this property
  const relevantReservations = reservations.filter(
    (res) => String(res.listing?.id || res.bien) === String(propertyId),
  );

  const activeTenant = relevantReservations.find(
    (res) => res.has_lease === true,
  );

  return (
    <Container>
      <div className="pt-24 max-w-7xl mx-auto flex flex-col gap-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <Heading
            title="Gestion des Locataires"
            subtitle={`Bien immobilier #${propertyId}`}
          />
          <button
            onClick={() => router.push("/properties")}
            className="bg-white border-2 border-neutral-200 hover:border-black text-neutral-800 font-bold py-2.5 px-6 rounded-2xl transition-all"
          >
            Retour aux propriétés
          </button>
        </div>

        {/* Section Locataire Actuel */}
        <div className="flex flex-col gap-4">
          <h3 className="text-xl font-black text-neutral-900 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Locataire Actuel
          </h3>

          {activeTenant ? (
            <div className="bg-neutral-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <FiHome size={150} />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex flex-col gap-2">
                  <div className="inline-flex bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-emerald-500/30">
                    Bail Actif
                  </div>
                  <h4 className="text-4xl font-black truncate max-w-md">
                    {activeTenant.demandeur_nom}
                  </h4>
                  <p className="text-neutral-400 font-medium">
                    En place depuis le{" "}
                    {format(new Date(activeTenant.date_debut), "PP")}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() =>
                      router.push(
                        `/admin/dashboard/messages?conversation=${activeTenant.id}_${activeTenant.proprietaire}`,
                      )
                    }
                    className="bg-white text-black px-6 py-4 rounded-2xl font-black hover:bg-neutral-200 transition"
                  >
                    Contacter
                  </button>
                  <button
                    onClick={() =>
                      router.push(`/finances?bien_id=${propertyId}`)
                    }
                    className="bg-neutral-800 text-white border border-neutral-700 px-6 py-4 rounded-2xl font-black hover:bg-neutral-700 transition"
                  >
                    Suivi Paiements
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-[2.5rem] p-12 text-center text-neutral-400 font-medium">
              Aucun bail actif pour le moment. Finalisez une demande pour
              installer un locataire.
            </div>
          )}
        </div>

        {/* Historique des Demandes */}
        <div className="flex flex-col gap-6">
          <h3 className="text-xl font-black text-neutral-900">
            Historique & Demandes
          </h3>

          <div className="bg-white border border-neutral-200 rounded-[2rem] overflow-hidden shadow-sm">
            <table className="min-w-full">
              <thead className="bg-neutral-50 text-left text-neutral-500 uppercase text-[10px] font-black tracking-widest border-b border-neutral-100">
                <tr>
                  <th className="px-8 py-5">Candidat</th>
                  <th className="px-8 py-5">Période souhaitée</th>
                  <th className="px-8 py-5">Statut</th>
                  <th className="px-8 py-5 text-right">Montant</th>
                  <th className="px-8 py-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {relevantReservations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-8 py-16 text-center text-neutral-400 font-medium italic"
                    >
                      Aucune demande traitée pour le moment.
                    </td>
                  </tr>
                ) : (
                  relevantReservations.map((res: any) => (
                    <tr
                      key={res.id}
                      className="hover:bg-neutral-50/50 transition"
                    >
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-neutral-900 text-base">
                            {res.demandeur_nom}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {res.demandeur_email}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-neutral-600 font-medium">
                        {format(new Date(res.date_debut), "PP")} au{" "}
                        {format(new Date(res.date_fin), "PP")}
                      </td>
                      <td className="px-8 py-5">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                            res.has_lease
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : res.statut === "ACCEPTEE"
                                ? "bg-blue-100 text-blue-800 border-blue-200"
                                : res.statut === "REFUSEE"
                                  ? "bg-rose-100 text-rose-800 border-rose-200"
                                  : "bg-amber-100 text-amber-800 border-amber-200"
                          }`}
                        >
                          {res.has_lease ? "Bail Généré" : res.statut}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right font-black text-neutral-900 text-base">
                        {new Intl.NumberFormat("fr-FR").format(
                          res.montant_total,
                        )}{" "}
                        <span className="text-[10px] font-bold text-neutral-400">
                          FCFA
                        </span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        {res.statut === "ACCEPTEE" && !res.has_lease ? (
                          <button
                            onClick={() =>
                              router.push(
                                `/admin/dashboard/messages?conversation=${Math.min(res.demandeur, res.proprietaire)}_${Math.max(res.demandeur, res.proprietaire)}`,
                              )
                            }
                            className="text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl text-xs font-black transition shadow-sm"
                          >
                            Finaliser Bail
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              router.push(
                                `/admin/dashboard/messages?conversation=${Math.min(res.demandeur, res.proprietaire)}_${Math.max(res.demandeur, res.proprietaire)}`,
                              )
                            }
                            className="text-neutral-600 bg-neutral-100 hover:bg-neutral-200 px-4 py-2 rounded-xl text-xs font-bold transition"
                          >
                            Contacter
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default TenantsClient;
