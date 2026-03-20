"use client";

import Container from "../Container";

import { TbBeach, TbMountain, TbPool } from "react-icons/tb";
import {
  GiBarn,
  GiBoatFishing,
  GiCactus,
  GiCastle,
  GiCaveEntrance,
  GiForestCamp,
  GiIsland,
  GiWindmill,
} from "react-icons/gi";
import { FaSkiing } from "react-icons/fa";
import { BsSnow } from "react-icons/bs";
import { IoDiamond } from "react-icons/io5";
import { MdOutlineVilla } from "react-icons/md";
import CategoryBox from "../CategoryBox";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import getCategories, { Category } from "../../actions/getCategories";

import styles from "./Categories.module.css";

const Categories = () => {
  const params = useSearchParams();
  const category = params?.get("category");
  const pathname = usePathname();
  const isMainPage = pathname === "/";

  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  if (!isMainPage) {
    return null;
  }

  return (
    <Container>
      <div
        className={`
        pt-4
        flex
        flex-row
        items-center
        justify-between
        overflow-x-auto
        overflow-
        ${styles.categories}
        `}
      >
        {categories.map((item) => (
          <CategoryBox
            key={item.id}
            label={item.nom}
            icon={TbBeach}
            selected={item.nom === category}
          />
        ))}
      </div>
    </Container>
  );
};

export default Categories;
