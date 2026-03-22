import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface IParams {
  reservationId?: string;
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<IParams> },
) {
  const currentUser = await getCurrentUser();

  if (!currentUser?.accessToken) {
    return NextResponse.json({ error: "Non authentifie." }, { status: 401 });
  }

  const { reservationId } = await params;

  if (!reservationId || typeof reservationId !== "string") {
    return NextResponse.json({ error: "ID invalide." }, { status: 400 });
  }

  const response = await fetch(`${API_URL}/demandes-actions/${reservationId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${currentUser.accessToken}`,
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    return NextResponse.json(
      {
        error:
          payload?.detail || payload?.statut?.[0] || "Annulation impossible.",
        backendErrors: payload,
      },
      { status: response.status },
    );
  }

  return NextResponse.json(payload, { status: 200 });
}
