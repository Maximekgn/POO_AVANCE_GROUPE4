import { NextResponse } from "next/server";

import getCurrentUser from "@/app/(site)/actions/getCurrentUser";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function extractBackendErrorMessage(payload: any): string {
  if (!payload) {
    return "Creation de la demande impossible.";
  }

  if (typeof payload === "string") {
    return payload;
  }

  if (typeof payload.detail === "string") {
    return payload.detail;
  }

  if (typeof payload.error === "string") {
    return payload.error;
  }

  const firstKey = Object.keys(payload)[0];
  if (!firstKey) {
    return "Creation de la demande impossible.";
  }

  const firstValue = payload[firstKey];
  if (Array.isArray(firstValue) && firstValue.length > 0) {
    return `${firstKey}: ${firstValue[0]}`;
  }

  if (typeof firstValue === "string") {
    return `${firstKey}: ${firstValue}`;
  }

  return "Creation de la demande impossible.";
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser?.accessToken) {
    return NextResponse.json({ error: "Non authentifie." }, { status: 401 });
  }

  const body = await request.json();

  const { listingId, startDate, endDate, totalPrice, action } = body;

  if (!listingId || !startDate || !endDate || totalPrice === undefined) {
    return NextResponse.json(
      { error: "Payload reservation incomplet." },
      { status: 400 },
    );
  }

  if (!["VISIT", "DIRECT_RENT", "PRIVATIZE"].includes(action)) {
    return NextResponse.json(
      { error: "Type d'action invalide." },
      { status: 400 },
    );
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: "Dates invalides." }, { status: 400 });
  }

  if (end < start) {
    return NextResponse.json(
      { error: "La date de fin doit etre apres la date de debut." },
      { status: 400 },
    );
  }

  const actionMap: Record<string, string> = {
    VISIT: "VISITE",
    DIRECT_RENT: "LOCATION_DIRECTE",
    PRIVATIZE: "PRIVATISATION",
  };

  const mappedAction = actionMap[action];
  if (!mappedAction) {
    return NextResponse.json(
      { error: "Type d'action invalide." },
      { status: 400 },
    );
  }

  const backendPayload = {
    bien: Number(listingId),
    type_demande: mappedAction,
    date_debut: start.toISOString().slice(0, 10),
    date_fin: end.toISOString().slice(0, 10),
    montant_total: totalPrice,
  };

  const backendResponse = await fetch(`${API_URL}/demandes-actions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${currentUser.accessToken}`,
    },
    body: JSON.stringify(backendPayload),
  });

  const payload = await backendResponse.json().catch(() => ({}));

  if (!backendResponse.ok) {
    return NextResponse.json(
      {
        error: extractBackendErrorMessage(payload),
        backendErrors: payload,
      },
      { status: backendResponse.status },
    );
  }

  return NextResponse.json(payload, { status: 201 });
}
