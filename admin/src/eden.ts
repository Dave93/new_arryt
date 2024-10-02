import { edenTreaty, edenFetch } from "@elysiajs/eden";
import type { BackendApp } from "@api/src/app";


export const apiClient = edenTreaty<BackendApp>(import.meta.env.VITE_API_URL!, {
    credentials: "include",
});
export const apiFetch = edenFetch<BackendApp>(import.meta.env.VITE_API_URL!);
