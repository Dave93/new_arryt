"use client";

import { Suspense } from "react";
import UsersList from "./list";

export default function Page() {
  return (
    <Suspense>
      <UsersList />
    </Suspense>
  );
}
