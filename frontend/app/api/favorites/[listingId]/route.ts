import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";

interface IParams {
  listingId?: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<IParams> },
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.error();
  }

  const { listingId } = await params;

  if (!listingId || typeof listingId !== "string") {
    throw new Error("Invalid ID");
  }

  return NextResponse.json(
    {
      error:
        "La gestion des favoris n'est pas encore disponible via l'API backend.",
    },
    { status: 501 },
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<IParams> },
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.error();
  }

  const { listingId } = await params;

  if (!listingId || typeof listingId !== "string") {
    throw new Error("Invalid ID");
  }

  return NextResponse.json(
    {
      error:
        "La gestion des favoris n'est pas encore disponible via l'API backend.",
    },
    { status: 501 },
  );
}
