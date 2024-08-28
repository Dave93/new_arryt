import { edenTreaty, edenFetch } from "@elysiajs/eden";
import type { BackendApp } from "@api/src/app";

console.log('api url', import.meta.env.VITE_API_URL!)

export const apiClient = edenTreaty<BackendApp>(import.meta.env.VITE_API_URL!);
export const apiFetch = edenFetch<BackendApp>(import.meta.env.VITE_API_URL!);
