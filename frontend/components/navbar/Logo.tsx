"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

const Logo = () => {
  const router = useRouter();

  return (
    <Link href="/">
      <Image
        src="/logo.png"
        alt="Logo"
        width={100}
        height={70}
      />
    </Link>
  );
};

export default Logo;
