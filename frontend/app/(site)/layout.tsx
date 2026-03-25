import "@/app/globals.css";
import ClientOnly from "@/components/ClientOnly";
import Navbar from "@/components/navbar/Navbar";
import RentModal from "@/components/modals/RentModal";
import SearchModal from "@/components/modals/SearchModal";
import ChatWidget from "@/components/chat/ChatWidget";
import getCurrentUser from "@/app/(site)/actions/getCurrentUser";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  return (
    <ClientOnly>
      <RentModal />
      <SearchModal />
      <Navbar currentUser={currentUser} />
      <ChatWidget currentUser={currentUser} />
      <div className="py-32">{children}</div>
    </ClientOnly>
  );
}
