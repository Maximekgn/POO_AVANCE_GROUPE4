"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface Property {
  id: number;
  reference: string;
  adresse: string;
  ville: string;
  description?: string;
  loyer_hc?: number;
  prix_mois?: number;
}

interface Review {
  id: number;
  bail_reference: string;
  auteur_nom: string;
  auteur_avatar?: string;
  note_globale: number;
  note_proprete?: number;
  note_exactitude?: number;
  note_communication?: number;
  note_emplacement?: number;
  note_enregistrement?: number;
  moyenne_details?: number;
  commentaire: string;
  points_positifs?: string;
  points_negatifs?: string;
  est_visible: boolean;
  date_creation: string;
  reponse?: string;
}

interface ReviewsClientProps {
  property: Property;
  reviews: Review[];
  token: string;
  apiUrl: string;
}

export default function ReviewsClient({
  property,
  reviews,
}: ReviewsClientProps) {
  const [filterNote, setFilterNote] = useState<number | "TOUS">("TOUS");

  const filteredReviews = filterNote === "TOUS"
    ? reviews
    : reviews.filter((r) => r.note_globale === filterNote);

  const stats = {
    moyenne: reviews.length > 0
      ? reviews.reduce((acc, r) => acc + r.note_globale, 0) / reviews.length
      : 0,
    total: reviews.length,
    distribution: [5, 4, 3, 2, 1].map((note) => ({
      note,
      count: reviews.filter((r) => r.note_globale === note).length,
      percentage: reviews.length > 0
        ? (reviews.filter((r) => r.note_globale === note).length / reviews.length) * 100
        : 0,
    })),
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Stats */}
      <div className="lg:col-span-1">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sticky top-24">
          <h3 className="text-lg font-bold text-neutral-900 mb-4">
            Notes globales
          </h3>
          
          <div className="text-center mb-6">
            <div className="text-5xl font-black text-neutral-900 mb-2">
              {stats.moyenne.toFixed(1)}
            </div>
            <div className="flex justify-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(stats.moyenne)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-neutral-300"
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-neutral-500">
              {stats.total} avis
            </p>
          </div>

          <div className="space-y-2">
            {stats.distribution.map(({ note, count, percentage }) => (
              <button
                key={note}
                onClick={() => setFilterNote(filterNote === note ? "TOUS" : note)}
                className={`w-full flex items-center gap-2 p-2 rounded-lg transition ${
                  filterNote === note ? "bg-neutral-100" : "hover:bg-neutral-50"
                }`}
              >
                <span className="text-sm font-medium text-neutral-700 w-8">
                  {note}★
                </span>
                <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-neutral-500 w-8 text-right">
                  {count}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setFilterNote("TOUS")}
            className="w-full mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Voir tous les avis
          </button>
        </div>
      </div>

      {/* Liste des avis */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-neutral-900">
            {filteredReviews.length} avis
          </h3>
          {filterNote !== "TOUS" && (
            <button
              onClick={() => setFilterNote("TOUS")}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Effacer le filtre
            </button>
          )}
        </div>

        {filteredReviews.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-neutral-500">
              Aucun avis pour le moment
            </p>
          </div>
        ) : (
          filteredReviews.map((review) => (
            <div
              key={review.id}
              className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-100">
                    {review.auteur_avatar ? (
                      <img
                        src={review.auteur_avatar}
                        alt={review.auteur_nom}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400 text-sm font-bold">
                        {review.auteur_nom.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900">
                      {review.auteur_nom}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Bail: {review.bail_reference}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= review.note_globale
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-neutral-300"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <p className="text-neutral-700 mb-4 leading-relaxed">
                {review.commentaire}
              </p>

              {review.points_positifs && (
                <div className="mb-3">
                  <p className="text-xs font-bold text-green-600 uppercase mb-1">
                    👍 Points positifs
                  </p>
                  <p className="text-sm text-neutral-600">
                    {review.points_positifs}
                  </p>
                </div>
              )}

              {review.points_negatifs && (
                <div className="mb-3">
                  <p className="text-xs font-bold text-red-600 uppercase mb-1">
                    👎 Points négatifs
                  </p>
                  <p className="text-sm text-neutral-600">
                    {review.points_negatifs}
                  </p>
                </div>
              )}

              {review.moyenne_details && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {review.note_proprete && (
                    <div className="text-xs">
                      <span className="text-neutral-500">🧹 Propreté:</span>{" "}
                      <span className="font-semibold">{review.note_proprete}/5</span>
                    </div>
                  )}
                  {review.note_communication && (
                    <div className="text-xs">
                      <span className="text-neutral-500">💬 Communication:</span>{" "}
                      <span className="font-semibold">{review.note_communication}/5</span>
                    </div>
                  )}
                  {review.note_emplacement && (
                    <div className="text-xs">
                      <span className="text-neutral-500">📍 Emplacement:</span>{" "}
                      <span className="font-semibold">{review.note_emplacement}/5</span>
                    </div>
                  )}
                  {review.note_enregistrement && (
                    <div className="text-xs">
                      <span className="text-neutral-500">🔑 Enregistrement:</span>{" "}
                      <span className="font-semibold">{review.note_enregistrement}/5</span>
                    </div>
                  )}
                </div>
              )}

              {review.reponse && (
                <div className="mt-4 pt-4 border-t border-neutral-100 bg-neutral-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-neutral-500 uppercase mb-2">
                    Réponse du propriétaire
                  </p>
                  <p className="text-sm text-neutral-700">
                    {review.reponse}
                  </p>
                </div>
              )}

              <div className="mt-4 flex items-center gap-4 text-xs text-neutral-400">
                <span>
                  📅 {new Date(review.date_creation).toLocaleDateString("fr-FR")}
                </span>
                {review.est_visible && (
                  <span className="text-green-600">✓ Vérifié</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
