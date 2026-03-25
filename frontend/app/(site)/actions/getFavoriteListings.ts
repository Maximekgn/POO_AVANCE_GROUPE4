import getCurrentUser from "./getCurrentUser";

export default async function getFavoriteListings() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) return [];

    return [];
  } catch (error: any) {
    throw new Error(error);
  }
}
