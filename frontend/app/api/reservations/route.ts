import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.error();
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

  const _validated = { listingId, start, end, totalPrice, action, currentUser };

  return NextResponse.json(
    {
      error:
        "La creation de reservation n'est pas encore disponible via l'API backend.",
    },
    { status: 501 },
  );
}
