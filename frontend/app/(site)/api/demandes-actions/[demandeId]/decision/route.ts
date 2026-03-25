import { NextResponse } from "next/server";

import getCurrentUser from "@/app/(site)/actions/getCurrentUser";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface IParams {
  demandeId?: string;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<IParams> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.accessToken) {
    return NextResponse.json({ error: "Non authentifie." }, { status: 401 });
  }

  const { demandeId } = await params;
  if (!demandeId || typeof demandeId !== "string") {
    return NextResponse.json({ error: "ID invalide." }, { status: 400 });
  }

  const body = await request.json();
  const { statut, decision, note_proprietaire, motif_refus } = body || {};
  const finalStatut = statut || decision;

  if (!["ACCEPTEE", "REFUSEE"].includes(finalStatut)) {
    return NextResponse.json(
      { error: "Statut de decision invalide." },
      { status: 400 },
    );
  }

  const response = await fetch(
    `${API_URL}/demandes-actions/${demandeId}/decision`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentUser.accessToken}`,
      },
      body: JSON.stringify({
        statut: finalStatut,
        note_proprietaire,
        motif_refus,
      }),
    },
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detailMessage =
      payload?.detail ||
      payload?.statut?.[0] ||
      payload?.motif_refus?.[0] ||
      payload?.non_field_errors?.[0] ||
      "Impossible de traiter la demande.";

    return NextResponse.json(
      { error: detailMessage, backendErrors: payload },
      { status: response.status },
    );
  }

  return NextResponse.json(payload, { status: 200 });
}
