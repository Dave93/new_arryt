import { edenTreaty, edenFetch } from "@elysiajs/eden";
import type { BackendApp } from "@api/src/index";

export const apiClient = edenTreaty<BackendApp>(process.env.REACT_APP_API_URL!);
export const apiFetch = edenFetch<BackendApp>(process.env.REACT_APP_API_URL!);
