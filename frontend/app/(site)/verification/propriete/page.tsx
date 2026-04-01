"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Container from "@/components/Container";
import Heading from "@/components/Heading";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function PropertyVerificationPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState({
    titre_propriete: null as File | null,
    video_avec_titre: null as File | null,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFiles((prev) => ({ ...prev, [name]: files[0] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!files.titre_propriete || !files.video_avec_titre) {
      toast.error("Veuillez télécharger tous les documents requis.");
      return;
    }

    setSubmitting(true);

    const formData = new FormData();
    formData.append("titre_propriete", files.titre_propriete);
    formData.append("video_avec_titre", files.video_avec_titre);

    try {
      const token = localStorage.getItem("accessToken") || "";
      const response = await fetch(`${API_URL}/verification/propriete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Documents de propriété soumis avec succès ! En attente de vérification.");
        router.push("/profile");
      } else {
        toast.error(data.error || "Erreur lors de l'envoi des documents.");
      }
    } catch {
      toast.error("Erreur réseau. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container>
      <div className="max-w-3xl mx-auto py-12">
        <Heading
          title="Vérification de propriété"
          subtitle="Prouvez que vous êtes le propriétaire du bien."
        />

        <div className="mt-8 bg-white rounded-2xl border border-neutral-200 p-8">
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <h3 className="font-semibold text-emerald-900 mb-2">📋 Documents requis :</h3>
            <ul className="text-sm text-emerald-800 space-y-1">
              <li>• Une photo de votre titre de propriété (acte notarié, certificat, etc.)</li>
              <li>• Une vidéo de vous dans le bien tenant votre titre de propriété</li>
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Titre de propriété */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                Titre de propriété *
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  name="titre_propriete"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="flex-1 text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  required
                />
                {files.titre_propriete && (
                  <span className="text-sm text-green-600">✓ {files.titre_propriete.name}</span>
                )}
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                Photo ou PDF de votre acte notarié, certificat de propriété, ou tout document officiel.
              </p>
            </div>

            {/* Vidéo avec titre */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                Vidéo de vous dans le bien avec le titre de propriété *
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  name="video_avec_titre"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="flex-1 text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  required
                />
                {files.video_avec_titre && (
                  <span className="text-sm text-green-600">✓ {files.video_avec_titre.name}</span>
                )}
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                Filmez-vous à l'intérieur du bien, tenant votre titre de propriété. Max 50MB.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Envoi en cours..." : "Soumettre mes documents"}
            </button>
          </form>
        </div>
      </div>
    </Container>
  );
}
