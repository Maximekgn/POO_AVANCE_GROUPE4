"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Incident {
  id: number;
  bien: number;
  bien_details?: {
    reference: string;
    adresse: string;
    ville: string;
  };
  locataire_nom: string;
  proprietaire_nom: string;
  assigne_a_nom?: string | null;
  titre: string;
  description: string;
  categorie: string;
  urgence: string;
  statut: string;
  date_ouverture: string;
  cout_estime?: number | null;
  messages_count: number;
  jours_ouverts: number;
  est_urgent: boolean;
}

interface IncidentsClientProps {
  initialIncidents: Incident[];
  token: string;
  apiUrl: string;
}

export default function IncidentsClient({
  initialIncidents,
  token,
  apiUrl,
}: IncidentsClientProps) {
  const router = useRouter();
  const [incidents, setIncidents] = useState(initialIncidents);
  const [filterStatut, setFilterStatut] = useState<string>("TOUS");
  const [filterUrgence, setFilterUrgence] = useState<string>("TOUS");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null,
  );
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveNotes, setResolveNotes] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [prestataires] = useState([
    { id: 1, nom: "Jean Dupont", specialite: "Plombier" },
    { id: 2, nom: "Marie Martin", specialite: "Électricien" },
    { id: 3, nom: "Pierre Durand", specialite: "Multi-services" },
    { id: 4, nom: "Sophie Bernard", specialite: "Peintre" },
    { id: 5, nom: "Luc Petit", specialite: "Couvreur" },
  ]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      if (filterStatut !== "TOUS" && incident.statut !== filterStatut) {
        return false;
      }
      if (filterUrgence !== "TOUS" && incident.urgence !== filterUrgence) {
        return false;
      }
      return true;
    });
  }, [incidents, filterStatut, filterUrgence]);

  const stats = useMemo(() => {
    return {
      total: incidents.length,
      ouverts: incidents.filter((i) => i.statut === "OUVERT").length,
      en_cours: incidents.filter((i) => i.statut === "EN_COURS").length,
      resolus: incidents.filter((i) => i.statut === "RESOLU").length,
      urgents: incidents.filter((i) => i.est_urgent).length,
    };
  }, [incidents]);

  const urgencColors: Record<string, string> = {
    FAIBLE: "bg-neutral-100 text-neutral-700",
    MOYENNE: "bg-amber-100 text-amber-700",
    ELEVEE: "bg-orange-100 text-orange-700",
    URGENTE: "bg-red-100 text-red-700",
  };

  const statutColors: Record<string, string> = {
    OUVERT: "bg-blue-100 text-blue-700",
    EN_COURS: "bg-amber-100 text-amber-700",
    EN_ATTENTE_PIECES: "bg-purple-100 text-purple-700",
    RESOLU: "bg-green-100 text-green-700",
    FERME: "bg-neutral-100 text-neutral-700",
  };

  const handleAssigner = async () => {
    if (!selectedIncident || !assigneeId) {
      toast.error("Veuillez sélectionner un prestataire");
      return;
    }

    try {
      const res = await fetch(
        `${apiUrl}/incidents/${selectedIncident.id}/assigner/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ prestataire_id: parseInt(assigneeId) }),
        },
      );

      if (res.ok) {
        toast.success("Incident assigné avec succès !");
        setShowAssignModal(false);
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur lors de l'assignation");
      }
    } catch {
      toast.error("Erreur réseau");
    }
  };

  const handleResoudre = async (incidentId: number, notes: string) => {
    if (!notes.trim()) {
      toast.error("Veuillez ajouter des notes de résolution");
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/incidents/${incidentId}/resoudre/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ resolution_notes: notes }),
      });

      if (res.ok) {
        toast.success("Incident marqué comme résolu !");
        setShowResolveModal(false);
        setResolveNotes("");
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur réseau");
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <button
          onClick={() => {
            setFilterStatut("TOUS");
            setFilterUrgence("TOUS");
          }}
          className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm hover:shadow-md transition text-left"
        >
          <p className="text-sm text-neutral-500">Total</p>
          <p className="text-2xl font-bold text-neutral-900">{stats.total}</p>
        </button>
        <button
          onClick={() => setFilterStatut("OUVERT")}
          className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm hover:shadow-md transition text-left"
        >
          <p className="text-sm text-blue-600">Ouverts</p>
          <p className="text-2xl font-bold text-blue-700">{stats.ouverts}</p>
        </button>
        <button
          onClick={() => setFilterStatut("EN_COURS")}
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm hover:shadow-md transition text-left"
        >
          <p className="text-sm text-amber-600">En cours</p>
          <p className="text-2xl font-bold text-amber-700">{stats.en_cours}</p>
        </button>
        <button
          onClick={() => setFilterStatut("RESOLU")}
          className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm hover:shadow-md transition text-left"
        >
          <p className="text-sm text-green-600">Résolus</p>
          <p className="text-2xl font-bold text-green-700">{stats.resolus}</p>
        </button>
        <button
          onClick={() =>
            setFilterUrgence(filterUrgence === "URGENTE" ? "TOUS" : "URGENTE")
          }
          className={`rounded-2xl border border-red-200 p-4 shadow-sm hover:shadow-md transition text-left ${
            filterUrgence === "URGENTE"
              ? "bg-red-100 ring-2 ring-red-500"
              : "bg-red-50"
          }`}
        >
          <p className="text-sm text-red-600">Urgents</p>
          <p className="text-2xl font-bold text-red-700">{stats.urgents}</p>
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="text-xs font-bold text-neutral-500 uppercase">
              Statut
            </label>
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="ml-2 rounded-xl border border-neutral-200 p-2 text-sm"
            >
              <option value="TOUS">Tous</option>
              <option value="OUVERT">Ouvert</option>
              <option value="EN_COURS">En cours</option>
              <option value="RESOLU">Résolu</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-neutral-500 uppercase">
              Urgence
            </label>
            <select
              value={filterUrgence}
              onChange={(e) => setFilterUrgence(e.target.value)}
              className="ml-2 rounded-xl border border-neutral-200 p-2 text-sm"
            >
              <option value="TOUS">Toutes</option>
              <option value="FAIBLE">Faible</option>
              <option value="MOYENNE">Moyenne</option>
              <option value="ELEVEE">Élevée</option>
              <option value="URGENTE">Urgente</option>
            </select>
          </div>
        </div>
        <button
          onClick={() => {
            setFilterStatut("TOUS");
            setFilterUrgence("TOUS");
          }}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline"
        >
          🔄 Réinitialiser les filtres
        </button>
      </div>

      {/* Liste des incidents */}
      <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-neutral-500 uppercase">
                Incident
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-neutral-500 uppercase">
                Bien
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-neutral-500 uppercase">
                Locataire
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-neutral-500 uppercase">
                Urgence
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-neutral-500 uppercase">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-neutral-500 uppercase">
                Ouvert depuis
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-neutral-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredIncidents.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-neutral-500"
                >
                  Aucun incident trouvé
                </td>
              </tr>
            ) : (
              filteredIncidents.map((incident) => (
                <tr key={incident.id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-neutral-900">
                      {incident.titre}
                    </p>
                    <p className="text-xs text-neutral-500 truncate max-w-xs">
                      {incident.description}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-neutral-900">
                      {incident.bien_details?.reference}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {incident.bien_details?.ville}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-neutral-900">
                      {incident.locataire_nom}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 rounded-lg text-xs font-bold ${urgencColors[incident.urgence]}`}
                    >
                      {incident.urgence}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 rounded-lg text-xs font-bold ${statutColors[incident.statut]}`}
                    >
                      {incident.statut}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-neutral-900">
                      {incident.jours_ouverts} jours
                    </p>
                    {incident.messages_count > 0 && (
                      <p className="text-xs text-neutral-500">
                        💬 {incident.messages_count} messages
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedIncident(incident);
                          setShowAssignModal(true);
                          setAssigneeId("");
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                        title="Assigner un prestataire"
                      >
                        👤 Assigner
                      </button>
                      {incident.statut !== "RESOLU" && (
                        <button
                          onClick={() => {
                            setSelectedIncident(incident);
                            setShowResolveModal(true);
                            setResolveNotes("");
                          }}
                          className="text-green-600 hover:text-green-800 text-sm font-medium hover:underline"
                          title="Marquer comme résolu"
                        >
                          ✅ Résoudre
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedIncident(incident);
                          toast.info(
                            `Messages de l'incident #${incident.id} (à implémenter)`,
                          );
                        }}
                        className="text-purple-600 hover:text-purple-800 text-sm font-medium hover:underline"
                        title="Voir les messages"
                      >
                        💬 {incident.messages_count}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Assignation */}
      {showAssignModal && selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-neutral-900 mb-2">
              👤 Assigner un prestataire
            </h3>
            <p className="text-sm text-neutral-600 mb-4">
              Incident: <strong>{selectedIncident.titre}</strong>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                Sélectionner un prestataire
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 p-3 text-sm"
              >
                <option value="">-- Choisir un prestataire --</option>
                {prestataires.map((prestataire) => (
                  <option key={prestataire.id} value={prestataire.id}>
                    {prestataire.nom} - {prestataire.specialite}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssigneeId("");
                }}
                className="flex-1 rounded-xl border border-neutral-200 py-3 text-sm font-medium hover:bg-neutral-50"
              >
                Annuler
              </button>
              <button
                onClick={handleAssigner}
                disabled={!assigneeId}
                className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assigner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Résolution */}
      {showResolveModal && selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-neutral-900 mb-2">
              ✅ Résoudre l'incident
            </h3>
            <p className="text-sm text-neutral-600 mb-4">
              Incident: <strong>{selectedIncident.titre}</strong>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                Notes de résolution *
              </label>
              <textarea
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="Décrivez les travaux effectués, les pièces changées, etc."
                rows={4}
                className="w-full rounded-xl border border-neutral-200 p-3 text-sm focus:border-green-500 focus:outline-none"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Ces notes seront visibles par le locataire et le propriétaire.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowResolveModal(false);
                  setResolveNotes("");
                }}
                className="flex-1 rounded-xl border border-neutral-200 py-3 text-sm font-medium hover:bg-neutral-50"
              >
                Annuler
              </button>
              <button
                onClick={() =>
                  handleResoudre(selectedIncident.id, resolveNotes)
                }
                disabled={!resolveNotes.trim()}
                className="flex-1 rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Marquer comme résolu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
