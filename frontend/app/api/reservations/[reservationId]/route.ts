import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";

interface IParams {
  reservationId?: string;
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<IParams> },
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.error();
  }

  const { reservationId } = await params;

  if (!reservationId || typeof reservationId !== "string") {
    throw new Error("Invalid ID");
  }

  return NextResponse.json(
    {
      error:
        "La suppression des reservations n'est pas encore disponible via l'API backend.",
    },
    { status: 501 },
  );
}
