import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface IParams {
  demandeId?: string;
}

export async function GET(
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

  const response = await fetch(`${API_URL}/demandes-actions/${demandeId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${currentUser.accessToken}`,
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    return NextResponse.json(
      { error: "Impossible de recuperer la demande.", backendErrors: payload },
      { status: response.status },
    );
  }

  return NextResponse.json(payload, { status: 200 });
}
