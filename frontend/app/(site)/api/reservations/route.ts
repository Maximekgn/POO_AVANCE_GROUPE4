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

  const { listingId, startDate, endDate, totalPrice, action, mois } = body;

  if (!listingId) {
    return NextResponse.json(
      { error: "L'identifiant du bien est requis." },
      { status: 400 },
    );
  }

  if (action === "BAIL") {
    if (!mois || mois < 6) {
      return NextResponse.json(
        { error: "Le nombre de mois doit etre au minimum de 6." },
        { status: 400 },
      );
    }
    if (!startDate) {
      return NextResponse.json(
        { error: "La date de debut est requise pour un bail." },
        { status: 400 },
      );
    }
  } else if (!startDate || !endDate || totalPrice === undefined) {
    return NextResponse.json(
      { error: "Payload reservation incomplet." },
      { status: 400 },
    );
  }

  if (!["VISIT", "DIRECT_RENT", "PRIVATIZE", "BAIL"].includes(action)) {
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

  if (action !== "BAIL") {
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
  }

  const actionMap: Record<string, string> = {
    VISIT: "VISITE",
    DIRECT_RENT: "LOCATION_DIRECTE",
    PRIVATIZE: "PRIVATISATION",
    BAIL: "BAIL",
  };

  const mappedAction = actionMap[action];
  if (!mappedAction) {
    return NextResponse.json(
      { error: "Type d'action invalide." },
      { status: 400 },
    );
  }

  const backendPayload: any = {
    bien: Number(listingId),
    type_demande: mappedAction,
  };

  if (action === "BAIL") {
    const start = new Date(startDate);
    backendPayload.date_debut = start.toISOString().slice(0, 10);
    backendPayload.duree_mois = mois;
  } else {
    const start = new Date(startDate);
    const end = new Date(endDate);
    backendPayload.date_debut = start.toISOString().slice(0, 10);
    backendPayload.date_fin = end.toISOString().slice(0, 10);
    backendPayload.montant_total = totalPrice;
  }

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
