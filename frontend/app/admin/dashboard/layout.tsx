import { redirect } from "next/navigation";

import getCurrentUser from "@/app/actions/getCurrentUser";
import Container from "@/app/components/Container";

import AdminSidebar from "./components/AdminSidebar";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser?.isAdmin) {
    redirect("/");
  }

  return (
    <Container>
      <div className="mx-auto flex w-full flex-col gap-6  md:flex-row">
        <AdminSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </Container>
  );
}
