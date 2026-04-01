import { notFound } from "next/navigation";
import getCurrentUser from "@/app/(site)/actions/getCurrentUser";
import Heading from "@/components/Heading";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import RelancePaiementButton from "./RelancePaiementButton";
import {
  Eye,
  FileCheck,
  Clock,
  XCircle,
  CheckCircle,
  Ban,
  Home,
  User,
  Mail,
  Phone,
  AlertCircle,
  FileText,
  ArrowRight,
  CreditCard,
  Hourglass,
  CheckCircle2,
  FileClock,
  MessageSquare,
  Building,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface DemandeAction {
  id: number;
  type_demande: "VISITE" | "PRIVATISATION" | "LOCATION_DIRECTE" | "BAIL";
  statut: string;
  date_debut?: string | null;
  date_fin?: string | null;
  duree_jours?: number;
  duree_mois?: number | null;
  message?: string | null;
  motif_refus?: string | null;
  bien: number;
  bien_details?: {
    id: number;
    reference: string;
    ville: string;
    adresse: string;
    prix_mois?: number | string;
    loyer_hc?: number | string;
    charges?: number | string;
    caution_mois?: number;
    avance_mois?: number;
    frais_assistance?: number | string;
  };
  bien_reference: string;
  bien_adresse: string;
  demandeur: number;
  demandeur_details?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    telephone?: string | null;
  };
  proprietaire: number;
  proprietaire_details?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    telephone?: string | null;
  };
  date_creation: string;
  date_visite?: string | null;
  date_traitement?: string | null;
  paiement_demande_envoyee?: boolean;
  paiement_effectue?: boolean;
  has_lease?: boolean;
}

async function getDemandeActionById(
  demandeId: number,
  token: string,
): Promise<DemandeAction | null> {
  try {
    const res = await fetch(`${API_URL}/demandes-actions/${demandeId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";

export default async function AdminDemandeActionDetailPage(props: {
  params: Promise<{ demandeId: string }>;
}) {
  const params = await props.params;
  const currentUser = await getCurrentUser();
  const token = currentUser?.accessToken;

  if (!token) {
    return (
      <div className="p-8">
        <Heading title="Non autorisé" subtitle="Veuillez vous connecter." />
      </div>
    );
  }

  const parsedId = parseInt(params.demandeId, 10);
  if (Number.isNaN(parsedId)) {
    notFound();
  }

  const demande = await getDemandeActionById(parsedId, token);
  if (!demande) {
    return (
      <div className="p-8">
        <Heading
          title="Demande introuvable"
          subtitle="Cette demande n'existe pas."
        />
      </div>
    );
  }

  const typeLabels: Record<string, string> = {
    VISITE: "Visite",
    PRIVATISATION: "Privatisation",
    LOCATION_DIRECTE: "Location directe",
    BAIL: "Bail",
  };

  const typeIcons: Record<string, any> = {
    VISITE: Eye,
    PRIVATISATION: FileCheck,
    LOCATION_DIRECTE: Home,
    BAIL: FileText,
  };

  const statutColors: Record<string, string> = {
    EN_ATTENTE: "bg-amber-100 text-amber-800 border-amber-200",
    ACCEPTEE: "bg-green-100 text-green-800 border-green-200",
    REFUSEE: "bg-red-100 text-red-800 border-red-200",
    EXPIREE: "bg-gray-100 text-gray-800 border-gray-200",
    ANNULEE: "bg-gray-100 text-gray-800 border-gray-200",
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "full",
      timeStyle: "short",
    }).format(date);
  };

  // Utiliser les détails ou les valeurs par défaut
  const bien = demande.bien_details || {
    id: demande.bien,
    reference: demande.bien_reference,
    ville: "",
    adresse: demande.bien_adresse,
    prix_mois: null,
  };
  const demandeur = demande.demandeur_details || {
    id: demande.demandeur,
    first_name: "",
    last_name: "",
    email: "",
    telephone: "",
  };
  const proprietaire = demande.proprietaire_details || {
    id: demande.proprietaire,
    first_name: "",
    last_name: "",
    email: "",
    telephone: null,
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <BackButton />
      </div>

      <div className="mb-6">
        <Heading
          title={`Demande de ${typeLabels[demande.type_demande] || demande.type_demande}`}
          subtitle={`Référence: ${bien.reference}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status card */}
          <div
            className={`rounded-2xl border p-6 ${statutColors[demande.statut] || "bg-gray-100 text-gray-800 border-gray-200"}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-80">Statut actuel</p>
                <p className="text-2xl font-bold mt-1">
                  {demande.statut.replace("_", " ")}
                </p>
              </div>
              <div className="text-4xl">
                {demande.statut === "EN_ATTENTE" && (
                  <Clock className="w-8 h-8" />
                )}
                {demande.statut === "ACCEPTEE" && (
                  <CheckCircle className="w-8 h-8" />
                )}
                {demande.statut === "REFUSEE" && (
                  <XCircle className="w-8 h-8" />
                )}
                {demande.statut === "EXPIREE" && (
                  <AlertCircle className="w-8 h-8" />
                )}
                {demande.statut === "ANNULEE" && <Ban className="w-8 h-8" />}
              </div>
            </div>
          </div>

          {/* Demand details */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Détails de la demande
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-neutral-500">Type</p>
                  <p className="font-semibold text-neutral-900">
                    {typeLabels[demande.type_demande] || demande.type_demande}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Date de création</p>
                  <p className="font-semibold text-neutral-900">
                    {formatDate(demande.date_creation)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-neutral-500">Date de début</p>
                  <p className="font-semibold text-neutral-900">
                    {formatDate(demande.date_debut)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Date de fin</p>
                  <p className="font-semibold text-neutral-900">
                    {formatDate(demande.date_fin)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-neutral-500">Durée</p>
                  <p className="font-semibold text-neutral-900">
                    {demande.duree_mois
                      ? `${demande.duree_mois} mois`
                      : `${demande.duree_jours || 0} jours`}
                  </p>
                </div>
                {demande.date_visite && (
                  <div>
                    <p className="text-sm text-neutral-500">Date de visite</p>
                    <p className="font-semibold text-neutral-900">
                      {formatDate(demande.date_visite)}
                    </p>
                  </div>
                )}
              </div>

              {demande.message && (
                <div className="bg-neutral-50 rounded-xl p-4 mt-4">
                  <p className="text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Message du demandeur
                  </p>
                  <p className="text-neutral-600 italic">"{demande.message}"</p>
                </div>
              )}

              {demande.motif_refus && (
                <div className="bg-red-50 rounded-xl p-4 mt-4 border border-red-100">
                  <p className="text-sm font-medium text-red-700 mb-2 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Motif de refus
                  </p>
                  <p className="text-red-600 italic">"{demande.motif_refus}"</p>
                </div>
              )}
            </div>
          </div>

          {/* Property info */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
              <Home className="w-5 h-5" />
              Informations sur le bien
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-500">Référence:</span>
                <span className="font-semibold text-neutral-900">
                  {bien.reference}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-500">Ville:</span>
                <span className="font-semibold text-neutral-900">
                  {bien.ville}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-500">Adresse:</span>
                <span className="font-semibold text-neutral-900">
                  {bien.adresse}
                </span>
              </div>
              {bien.prix_mois && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-500">
                    Loyer mensuel:
                  </span>
                  <span className="font-semibold text-neutral-900">
                    {Number(bien.prix_mois).toLocaleString()} FCFA
                  </span>
                </div>
              )}
            </div>
            <Link
              href={`/admin/dashboard/biens/${bien.id}`}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Voir le bien
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Demandeur card */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Demandeur
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-neutral-500">Nom complet</p>
                <p className="font-semibold text-neutral-900">
                  {demandeur.first_name} {demandeur.last_name}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Email</p>
                <p className="font-semibold text-neutral-900 text-sm">
                  {demandeur.email}
                </p>
              </div>
              {demandeur.telephone && (
                <div>
                  <p className="text-sm text-neutral-500">Téléphone</p>
                  <p className="font-semibold text-neutral-900 text-sm">
                    {demandeur.telephone}
                  </p>
                </div>
              )}
            </div>
            <Link
              href={`/admin/dashboard/utilisateurs/${demandeur.id}`}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Voir le profil
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Proprietaire card */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
              <Building className="w-5 h-5" />
              Propriétaire
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-neutral-500">Nom complet</p>
                <p className="font-semibold text-neutral-900">
                  {proprietaire.first_name} {proprietaire.last_name}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Email</p>
                <p className="font-semibold text-neutral-900 text-sm">
                  {proprietaire.email}
                </p>
              </div>
              {proprietaire.telephone && (
                <div>
                  <p className="text-sm text-neutral-500">Téléphone</p>
                  <p className="font-semibold text-neutral-900 text-sm">
                    {proprietaire.telephone}
                  </p>
                </div>
              )}
            </div>
            <Link
              href={`/admin/dashboard/utilisateurs/${proprietaire.id}`}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Voir le profil
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Actions */}
          {demande.statut === "EN_ATTENTE" && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
              <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Actions Admin
              </h3>
              <div className="space-y-3">
                <Link
                  href={`/admin/dashboard/demandes-actions/${demande.id}/decision`}
                  className="block w-full rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  <FileCheck className="w-5 h-5" />
                  Accepter / Refuser
                </Link>
              </div>
            </div>
          )}

          {demande.statut === "ACCEPTEE" && !demande.has_lease && (
            <>
              {/* Étape 1: Configurer les tarifs */}
              {!demande.paiement_demande_envoyee && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                  <h3 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Étape 1: Configurer les tarifs
                  </h3>
                  <p className="text-sm text-amber-800 mb-4">
                    Configurez la caution, l'avance et les frais avant de
                    demander le paiement.
                  </p>
                  <Link
                    href={`/admin/dashboard/demandes-actions/${demande.id}/finaliser`}
                    className="block w-full rounded-xl bg-amber-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-amber-700 transition flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-5 h-5" />
                    Configurer les tarifs
                  </Link>
                </div>
              )}

              {/* Étape 2: Demander le paiement */}
              {demande.paiement_demande_envoyee &&
                !demande.paiement_effectue && (
                  <div className="rounded-2xl border border-purple-200 bg-purple-50 p-6">
                    <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
                      <Hourglass className="w-5 h-5" />
                      Étape 2: Paiement en attente
                    </h3>
                    <p className="text-sm text-purple-800 mb-4">
                      La demande de paiement a été envoyée au locataire. En
                      attente de confirmation.
                    </p>
                    <div className="rounded-lg bg-purple-100 px-4 py-3 text-sm text-purple-900 mb-4">
                      <strong>Prochaine action :</strong> Le locataire doit
                      confirmer le paiement depuis son espace.
                    </div>
                    {currentUser?.accessToken && (
                      <RelancePaiementButton
                        demandeId={demande.id}
                        token={currentUser.accessToken}
                        apiUrl={API_URL}
                      />
                    )}
                  </div>
                )}

              {/* Étape 3: Finaliser le bail */}
              {demande.paiement_effectue && (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
                  <h3 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Étape 3: Paiement confirmé
                  </h3>
                  <p className="text-sm text-green-800 mb-4">
                    Le paiement a été confirmé. Vous pouvez maintenant finaliser
                    la location et signer le bail.
                  </p>
                  <Link
                    href={`/admin/dashboard/demandes-actions/${demande.id}/finaliser`}
                    className="block w-full rounded-xl bg-green-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-green-700 transition flex items-center justify-center gap-2"
                  >
                    <FileText className="w-5 h-5" />
                    Finaliser et signer le bail
                  </Link>
                </div>
              )}
            </>
          )}

          {demande.has_lease && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
              <h3 className="text-lg font-bold text-emerald-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Bail créé
              </h3>
              <p className="text-sm text-emerald-800 mb-4">
                Le bail a été généré et envoyé aux deux parties.
              </p>
              <Link
                href={`/admin/dashboard/baux/${demande.id}`}
                className="block w-full rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-emerald-700 transition flex items-center justify-center gap-2"
              >
                <Eye className="w-5 h-5" />
                Voir le bail
              </Link>
            </div>
          )}

          {demande.statut !== "EN_ATTENTE" && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-6">
              <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Historique
              </h3>
              <div className="space-y-2 text-sm">
                {demande.date_traitement && (
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500">Traitée le:</span>
                    <span className="font-medium">
                      {formatDate(demande.date_traitement)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
