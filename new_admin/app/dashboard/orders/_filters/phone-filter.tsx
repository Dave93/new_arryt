"use client";

import { useQueryState, parseAsString } from "nuqs";
import { Input } from "@/components/ui/input";

export function PhoneFilter() {
  const [phone, setPhone] = useQueryState(
    "phone",
    parseAsString.withDefault("").withOptions({ shallow: false, throttleMs: 500 }),
  );

  return (
    <Input
      placeholder="Телефон клиента..."
      value={phone}
      onChange={(e) => setPhone(e.target.value || null)}
      className="w-auto"
    />
  );
}
