import getCurrentUser from "@/app/(site)/actions/getCurrentUser";
import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface IListingParams {
  listingId?: string;
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<IListingParams> },
) {
  const currenUser = await getCurrentUser();

  if (!currenUser) {
    return NextResponse.error();
  }

  const { listingId } = await params;

  if (!listingId || typeof listingId !== "string") {
    throw new Error("Invalid ID");
  }

  const response = await fetch(`${API_URL}/biens/${listingId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${currenUser.accessToken || ""}`,
    },
  });

  if (!response.ok) {
    const payload = await response.text();
    return NextResponse.json(
      { error: payload || "Suppression impossible." },
      { status: response.status },
    );
  }

  return NextResponse.json({ success: true });
}
