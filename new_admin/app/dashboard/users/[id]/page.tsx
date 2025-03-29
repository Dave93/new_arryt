"use client";

import { useParams } from "next/navigation";
import UserShow from "../show";

export default function Page() {
  const params = useParams();
  return <UserShow id={params.id as string} />;
} 