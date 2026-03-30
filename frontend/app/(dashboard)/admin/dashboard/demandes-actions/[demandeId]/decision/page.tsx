"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import Heading from "@/components/Heading";
import { CheckCircle2, XCircle, ArrowLeft, AlertCircle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface PageProps {
  params: Promise<{ demandeId: string }>;
}

export default function AdminDemandeDecisionPage(props: PageProps) {
  const resolvedParams = use(props.params);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [motifRefus, setMotifRefus] = useState("");
  const [showRefusForm, setShowRefusForm] = useState(false);

  async function handleDecision(statut: "ACCEPTEE" | "REFUSEE") {
    setBusy(true);
    setMessage("");

    try {
      // Récupérer le token depuis les cookies
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("accessToken="))
        ?.split("=")[1];

      if (!token) {
        throw new Error("Non authentifié. Veuillez vous reconnecter.");
      }

      const response = await fetch(
        `${API_URL}/demandes-actions/${resolvedParams.demandeId}/decision`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            statut,
            motif_refus: statut === "REFUSEE" ? motifRefus : undefined,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || data.detail || "Action impossible.");
        setBusy(false);
        return;
      }

      setMessage(
        statut === "ACCEPTEE" ? "Demande acceptée !" : "Demande refusée !",
      );
      setTimeout(() => {
        router.push("/admin/dashboard/demandes-actions");
        router.refresh();
      }, 1500);
    } catch (error: any) {
      setMessage(error.message || "Erreur réseau.");
      setBusy(false);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <BackButton />
      </div>

      <div className="max-w-2xl mx-auto">
        <Heading
          title={
            <div className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              <span>Décider de la demande</span>
            </div>
          }
          subtitle="Acceptez ou refusez cette demande"
        />

        {message && (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-sm font-medium flex items-center gap-2 ${
              message.includes("Erreur") || message.includes("impossible")
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700"
            }`}
          >
            {message.includes("Erreur") || message.includes("impossible") ? (
              <XCircle className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {message}
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4">
            {!showRefusForm ? (
              <>
                <button
                  onClick={() => handleDecision("ACCEPTEE")}
                  disabled={busy}
                  className="w-full rounded-xl bg-green-600 px-6 py-4 text-base font-bold text-white hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Accepter la demande
                </button>

                <button
                  onClick={() => setShowRefusForm(true)}
                  disabled={busy}
                  className="w-full rounded-xl border-2 border-red-200 bg-red-50 px-6 py-4 text-base font-bold text-red-700 hover:bg-red-100 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  Refuser la demande
                </button>
              </>
            ) : (
              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-semibold text-neutral-700">
                    Motif de refus *
                  </span>
                  <textarea
                    value={motifRefus}
                    onChange={(e) => setMotifRefus(e.target.value)}
                    rows={5}
                    className="mt-2 w-full rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:bg-white focus:ring-1 focus:ring-red-500"
                    placeholder="Expliquez pourquoi cette demande est refusée..."
                  />
                </label>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowRefusForm(false)}
                    disabled={busy}
                    className="flex-1 rounded-xl border border-neutral-300 bg-white px-6 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Annuler
                  </button>
                  <button
                    onClick={() => handleDecision("REFUSEE")}
                    disabled={busy || !motifRefus.trim()}
                    className="flex-1 rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Confirmer le refus
                  </button>
                </div>
              </div>
            )}

            <Link
              href="/admin/dashboard/demandes-actions"
              className="mt-4 text-center text-sm font-semibold text-neutral-600 hover:text-neutral-800 flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour aux demandes
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
