"use client";

import { useSearchParams } from "next/navigation";
import PermissionEdit from "../edit";

export default function Page() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";

  return <PermissionEdit params={{ id }} />;
} 