interface Reservation {
  listingId?: string;
  userId?: string;
  authorId?: string;
}

export default async function getReservations(params: Reservation) {
  try {
    const _params = params;
    return [];
  } catch (error: any) {
    throw new Error(error);
  }
}
