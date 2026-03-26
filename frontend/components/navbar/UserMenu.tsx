"use client";

import { AiOutlineMenu } from "react-icons/ai";
import { useCallback, useState } from "react";
import { signOut } from "next-auth/react";

import Avatar from "../Avatar";
import MenuItem from "./MenuItem";

import useRegisterModal from "@/app/(site)/hooks/useRegisterModal";
import useLoginModal from "@/app/(site)/hooks/useLoginModal";
import useRentModal from "@/app/(site)/hooks/useRentModal";
import { useRouter } from "next/navigation";

interface UserMenuProps {
  currentUser?: any | null; // Changed from User to any since we don't use Prisma
}

const UserMenu: React.FC<UserMenuProps> = ({ currentUser }) => {
  const registerModal = useRegisterModal();
  const loginModal = useLoginModal();
  const rentModal = useRentModal();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const toggleOpen = useCallback(() => setIsOpen((prev) => !prev), []);

  const onRent = useCallback(() => {
    if (!currentUser) {
      return loginModal.onOpen();
    }
    rentModal.onOpen();
  }, [currentUser, loginModal, rentModal]);

  return (
    <div>
      <div className="relative">
        <div className="flex flex-row items-center gap-3">
          <div
            onClick={onRent}
            className="
              hidden
              md:block
              text-sm
              font-semibold
              py-3
              px-4
              rounded-full
              hover:bg-neutral-100
              transition
              cursor-pointer
            "
          >
            Mettre mon bien en location
          </div>
          <div
            onClick={toggleOpen}
            className="
              p-4
              md:py-1
              md:px-2
              border-[1px]
              border-neutral-200
              flex
              flex-row
              items-center
              gap-3
              rounded-full
              cursor-pointer
              hover:shadow-md
              transition
            "
          >
            <AiOutlineMenu />
            <div className="hidden md:block">
              <Avatar src={currentUser?.image} />
            </div>
          </div>
        </div>
        {isOpen && (
          <div
            className="
            absolute
            rounded-xl
            shadow-md
            w-[40vw]
            md:w-3/4
            bg-white
            overflow-hidden
            right-0
            top-12
            text-sm
            z-50
          "
          >
            <div className="flex flex-col cursor-pointer">
              {currentUser ? (
                <>
                  <MenuItem
                    onClick={() => router.push("/profile")}
                    label="Mon profil"
                  />
                  <MenuItem
                    onClick={() => router.push("/trips")}
                    label="Demandes faites"
                  />
                  <MenuItem
                    onClick={() => router.push("/reservations")}
                    label="Demandes reçues"
                  />
                  <MenuItem
                    onClick={() => router.push("/locations")}
                    label="Mes locations"
                  />
                  <MenuItem
                    onClick={() => router.push("/properties")}
                    label="Mes propriétés"
                  />
                  <MenuItem
                    onClick={() => router.push("/finances")}
                    label="Mes finances"
                  />
                  {currentUser?.isAdmin && (
                    <MenuItem
                      onClick={() => router.push("/admin/dashboard")}
                      label="Tableau de bord admin"
                    />
                  )}
                  <MenuItem
                    onClick={rentModal.onOpen}
                    label="Publier mon bien"
                  />
                  <hr />
                  <MenuItem onClick={() => signOut()} label="Déconnexion" />
                </>
              ) : (
                <>
                  <MenuItem onClick={loginModal.onOpen} label="Connexion" />
                  <MenuItem
                    onClick={registerModal.onOpen}
                    label="Inscription"
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserMenu;
