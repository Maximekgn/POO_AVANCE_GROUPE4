import axios from "axios";

export interface Category {
  id: number;
  nom: string;
  slug: string;
  ordre: number;
  actif: boolean;
  date_creation: string;
}

export default async function getCategories(): Promise<Category[]> {
  try {
    const response = await axios.get("http://127.0.0.1:8000/api/categories");
    return response.data;
  } catch (error) {
    return [];
  }
}
