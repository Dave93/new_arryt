import { edenTreaty, edenFetch } from "@elysiajs/eden";
import type { BackendApp } from "@api/src/index";

console.log('api url')

export const apiClient = edenTreaty<BackendApp>(import.meta.env.VITE_API_URL!);
export const apiFetch = edenFetch<BackendApp>(import.meta.env.VITE_API_URL!);
