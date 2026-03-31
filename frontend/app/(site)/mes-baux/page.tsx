import getCurrentUser from "@/app/(site)/actions/getCurrentUser";
import Container from "@/components/Container";
import Heading from "@/components/Heading";
import MesBauxClient from "./MesBauxClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default async function MesBauxPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser?.accessToken) {
    return (
      <Container>
        <div className="py-10 text-center">
          <p className="text-neutral-500">Veuillez vous connecter pour voir vos baux.</p>
        </div>
      </Container>
    );
  }

  return <MesBauxClient user={currentUser} />;
}
