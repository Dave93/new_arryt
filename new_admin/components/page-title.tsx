"use client";

import { useEffect, type ReactNode } from "react";
import { usePageHeader } from "@/lib/page-header-context";

export function PageTitle({ title, actions }: { title: string; actions?: ReactNode }) {
  const { setTitle, setActions } = usePageHeader();

  useEffect(() => {
    setTitle(title);
    return () => setTitle("");
  }, [title, setTitle]);

  useEffect(() => {
    setActions(actions ?? null);
    return () => setActions(null);
  }, [actions, setActions]);

  return null;
}
