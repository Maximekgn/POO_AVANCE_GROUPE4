"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminPlatformUser } from "../../lib/adminApi";
import { verifyUser } from "../../lib/adminApi";
import toast from "react-hot-toast";
import Image from "next/image";

interface AdminUserDetailClientProps {
  user: AdminPlatformUser & {
    verification_statut?: string;
    verification_motif_refus?: string | null;
    piece_identite_recto?: string | null;
    piece_identite_verso?: string | null;
    photo_avec_piece?: string | null;
    verification_identite?: {
      statut: string;
      motif_refus: string | null;
      piece_identite_recto: string | null;
      piece_identite_verso: string | null;
      photo_avec_piece: string | null;
    };
    verification_propriete?: {
      statut: string | null;
      motif_refus: string | null;
      titre_propriete: string | null;
      video_avec_titre: string | null;
    };
  };
  accessToken: string;
}

export default function AdminUserDetailClient({
  user,
  accessToken,
}: AdminUserDetailClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  const handleVerifyUser = async () => {
    setLoading(true);
    const result = await verifyUser(user.id, "verify", accessToken);
    setLoading(false);

    if (result.ok) {
      toast.success(result.message || "Utilisateur vérifié.");
      router.refresh();
    } else {
      toast.error(result.message || "Erreur de vérification.");
    }
  };

  const handleRejectDocuments = async () => {
    if (
      !confirm(
        "Êtes-vous sûr de rejeter les documents ? Cela désactivera l'accès jusqu'à ce que de nouveaux documents soient fournis.",
      )
    )
      return;
    setLoading(true);
    const result = await verifyUser(user.id, "reject", accessToken);
    setLoading(false);

    if (result.ok) {
      toast.success(result.message || "Documents rejetés.");
      router.refresh();
    } else {
      toast.error(result.message || "Erreur lors du rejet.");
    }
  };

  const handleSuspendUser = async () => {
    if (
      !confirm(
        "Êtes-vous sûr de suspendre ce compte ? L'utilisateur ne pourra plus se connecter.",
      )
    ) {
      return;
    }

    setLoading(true);
    const result = await verifyUser(user.id, "suspend", accessToken);
    setLoading(false);

    if (result.ok) {
      toast.success(result.message || "Compte suspendu.");
      router.refresh();
    } else {
      toast.error(result.message || "Erreur lors de la suspension.");
    }
  };

  const handleRejectWithReason = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Veuillez saisir un motif de refus.");
      return;
    }

    setLoading(true);
    // Appel API pour rejeter avec motif (à implémenter)
    try {
      const token = localStorage.getItem("accessToken") || "";
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/admin/users/${user.id}/reject-verification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ motif_refus: rejectionReason }),
        },
      );

      if (response.ok) {
        toast.success("Documents refusés. L'utilisateur a été notifié.");
        router.refresh();
      } else {
        toast.error("Erreur lors du refus.");
      }
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setLoading(false);
      setShowRejectionModal(false);
    }
  };

  const DocumentPreview = ({
    src,
    label,
  }: {
    src: string | null;
    label: string;
  }) => {
    if (!src) {
      return <div className="text-sm text-neutral-500 italic">Non fourni</div>;
    }
    return (
      <div className="mt-2">
        <button
          onClick={() => setSelectedImage(src)}
          className="relative w-full h-48 rounded-lg overflow-hidden border border-neutral-200 hover:border-blue-500 transition"
        >
          <Image src={src} alt={label} fill className="object-cover" />
        </button>
        <p className="text-xs text-neutral-500 mt-1">{label}</p>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">
        Vérification du compte
      </h2>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleVerifyUser}
          disabled={loading || user.compte_verifie}
          className={`rounded-lg px-4 py-2 font-medium text-white transition ${
            user.compte_verifie
              ? "bg-black cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          } disabled:opacity-50`}
        >
          {loading
            ? "Chargement..."
            : user.compte_verifie
              ? "✓ Compte Vérifié"
              : "Approuver le compte"}
        </button>
        <button
          onClick={handleRejectDocuments}
          disabled={
            loading || (!user.documents_complets && !user.compte_verifie)
          }
          className={`rounded-lg px-4 py-2 font-medium text-white transition ${
            !user.documents_complets && !user.compte_verifie
              ? "bg-black cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          } disabled:opacity-50`}
        >
          {loading ? "Chargement..." : "Refuser les documents"}
        </button>
        <button
          onClick={handleSuspendUser}
          disabled={loading || !user.is_active}
          className={`rounded-lg px-4 py-2 font-medium text-white transition ${
            !user.is_active
              ? "bg-black cursor-not-allowed"
              : "bg-neutral-800 hover:bg-neutral-900"
          } disabled:opacity-50`}
        >
          {loading ? "Chargement..." : "Suspendre le compte"}
        </button>
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="bg-neutral-50 px-4 py-3 rounded-lg border border-neutral-100">
          <dt className="text-sm font-medium text-neutral-500">
            Statut de vérification
          </dt>
          <dd className="mt-1 text-sm font-semibold text-neutral-900 flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${user.compte_verifie ? "bg-blue-500" : "bg-amber-500"}`}
            ></span>
            {user.compte_verifie
              ? "Compte approuvé"
              : "En attente d'approbation"}
          </dd>
        </div>
        <div className="bg-neutral-50 px-4 py-3 rounded-lg border border-neutral-100">
          <dt className="text-sm font-medium text-neutral-500">
            Dossier / Documents
          </dt>
          <dd className="mt-1 text-sm font-semibold text-neutral-900 flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${user.documents_complets ? "bg-blue-500" : "bg-blue-500"}`}
            ></span>
            {user.documents_complets ? "Complets" : "Incomplets / Rejetés"}
          </dd>
        </div>
      </dl>

      {/* Section Vérification d'identité */}
      <div className="mt-8 border-t border-neutral-200 pt-6">
        <h3 className="text-base font-semibold text-neutral-900 mb-4">
          📋 Vérification d'identité
        </h3>

        <div className="mb-4">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
              user.verification_identite?.statut === "VERIFIE"
                ? "bg-green-100 text-green-700"
                : user.verification_identite?.statut === "EN_ATTENTE"
                  ? "bg-amber-100 text-amber-700"
                  : user.verification_identite?.statut === "REFUSE"
                    ? "bg-red-100 text-red-700"
                    : "bg-neutral-100 text-neutral-700"
            }`}
          >
            Statut: {user.verification_identite?.statut || "NON_SOUMIS"}
          </span>
          {user.verification_identite?.motif_refus && (
            <p className="text-sm text-red-600 mt-2">
              ⚠️ Motif de refus: {user.verification_identite.motif_refus}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-sm font-medium text-neutral-700">Recto CNI</p>
            <DocumentPreview
              src={user.verification_identite?.piece_identite_recto}
              label="Recto"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-700">Verso CNI</p>
            <DocumentPreview
              src={user.verification_identite?.piece_identite_verso}
              label="Verso"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-700">
              Photo avec pièce
            </p>
            <DocumentPreview
              src={user.verification_identite?.photo_avec_piece}
              label="Photo"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={handleVerifyUser}
            disabled={
              loading || user.verification_identite?.statut === "VERIFIE"
            }
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {user.verification_identite?.statut === "VERIFIE"
              ? "✓ Vérifié"
              : "Valider l'identité"}
          </button>
          <button
            onClick={() => setShowRejectionModal(true)}
            disabled={
              loading || !user.verification_identite?.piece_identite_recto
            }
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            Refuser
          </button>
        </div>
      </div>

      {/* Section Vérification de propriété */}
      {user.verification_propriete && (
        <div className="mt-8 border-t border-neutral-200 pt-6">
          <h3 className="text-base font-semibold text-neutral-900 mb-4">
            🏠 Vérification de propriété
          </h3>

          <div className="mb-4">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                user.verification_propriete.statut === "VERIFIE"
                  ? "bg-green-100 text-green-700"
                  : user.verification_propriete.statut === "EN_ATTENTE"
                    ? "bg-amber-100 text-amber-700"
                    : user.verification_propriete.statut === "REFUSE"
                      ? "bg-red-100 text-red-700"
                      : "bg-neutral-100 text-neutral-700"
              }`}
            >
              Statut: {user.verification_propriete.statut || "NON_SOUMIS"}
            </span>
            {user.verification_propriete.motif_refus && (
              <p className="text-sm text-red-600 mt-2">
                ⚠️ Motif de refus: {user.verification_propriete.motif_refus}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-neutral-700">
                Titre de propriété
              </p>
              <DocumentPreview
                src={user.verification_propriete.titre_propriete}
                label="Titre"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-700">
                Vidéo avec titre
              </p>
              {user.verification_propriete.video_avec_titre ? (
                <div className="mt-2">
                  <video
                    controls
                    className="w-full rounded-lg border border-neutral-200"
                  >
                    <source
                      src={user.verification_propriete.video_avec_titre}
                    />
                    Votre navigateur ne supporte pas la vidéo.
                  </video>
                  <p className="text-xs text-neutral-500 mt-1">
                    Vidéo de vérification
                  </p>
                </div>
              ) : (
                <div className="text-sm text-neutral-500 italic mt-2">
                  Non fournie
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal pour voir les images en grand */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <Image
              src={selectedImage}
              alt="Aperçu"
              width={1200}
              height={800}
              className="object-contain max-h-[90vh]"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 rounded-full p-2 text-white"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Modal de refus */}
      {showRejectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-neutral-900 mb-4">
              Motif de refus
            </h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Expliquez pourquoi les documents sont refusés..."
              className="w-full border border-neutral-300 rounded-xl p-3 text-sm min-h-[120px] focus:border-red-500 focus:outline-none"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setShowRejectionModal(false)}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                Annuler
              </button>
              <button
                onClick={handleRejectWithReason}
                disabled={loading || !rejectionReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                {loading ? "Envoi..." : "Refuser"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
