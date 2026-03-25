"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

const Logo = () => {
  const router = useRouter();

  return (
    <Link href="/">
      <h1 className="text-2xl font-bold text-primary">MIABE-Immo</h1>
    </Link>
  );
};

export default Logo;
