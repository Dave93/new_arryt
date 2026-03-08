"use client";

import { useEffect } from "react";
import { usePageHeader } from "@/lib/page-header-context";

export function PageTitle({ title }: { title: string }) {
  const { setTitle } = usePageHeader();

  useEffect(() => {
    setTitle(title);
    return () => setTitle("");
  }, [title, setTitle]);

  return null;
}
