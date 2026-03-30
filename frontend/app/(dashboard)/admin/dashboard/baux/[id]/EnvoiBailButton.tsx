"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

interface EnvoiBailButtonProps {
  bailId: number;
  token: string;
  apiUrl: string;
}

export default function EnvoiBailButton({
  bailId,
  token,
  apiUrl,
}: EnvoiBailButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleEnvoi = async () => {
    if (!confirm("Voulez-vous vraiment renvoyer le bail signé aux deux parties ?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${apiUrl}/baux/${bailId}/envoyer-bail`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || "Erreur lors de l'envoi");
      }

      alert("✅ Le bail a été renvoyé aux deux parties avec succès !");
    } catch (error: any) {
      alert(`❌ Erreur : ${error.message || "Erreur lors de l'envoi"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleEnvoi}
      disabled={loading}
      className="rounded-xl border-2 border-blue-300 bg-white px-4 py-2 font-semibold text-blue-700 hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    >
      <Mail className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Envoi en cours..." : "📧 Renvoyer le bail"}
    </button>
  );
}
