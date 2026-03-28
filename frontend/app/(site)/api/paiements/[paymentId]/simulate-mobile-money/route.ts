import { NextResponse } from "next/server";

import getCurrentUser from "@/app/(site)/actions/getCurrentUser";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface IParams {
  paymentId?: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<IParams> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.accessToken) {
    return NextResponse.json({ error: "Non authentifie." }, { status: 401 });
  }

  const { paymentId } = await params;
  if (!paymentId || typeof paymentId !== "string") {
    return NextResponse.json({ error: "ID invalide." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));

  const response = await fetch(
    `${API_URL}/paiements/${paymentId}/simulate-mobile-money`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentUser.accessToken}`,
      },
      body: JSON.stringify(body),
    },
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    return NextResponse.json(
      {
        error:
          payload?.detail ||
          payload?.non_field_errors?.[0] ||
          "Erreur lors de la simulation du paiement.",
        backendErrors: payload,
      },
      { status: response.status },
    );
  }

  return NextResponse.json(payload, { status: 200 });
}
