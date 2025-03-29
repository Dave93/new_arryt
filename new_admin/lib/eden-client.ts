import { edenFetch, treaty } from "@elysiajs/eden";
import { BackendApp } from "../../api/src/app";
import { useAuthStore } from "./auth-store";

// Определяем базовый URL API
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

// Создаем клиент Eden с использованием общего типа
export const apiClient = treaty<BackendApp>(API_URL, {
  fetch: {
    credentials: "include",
  },
});
export const apiFetch = edenFetch<BackendApp>(API_URL);

// Функция для получения токена авторизации
export const getAuthToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token");
  }
  return null;
};

// Функция для установки заголовков авторизации
export const useGetAuthHeaders = () => {
  const token = useAuthStore((state) => state.token);
  return token ? { Authorization: `Bearer ${token}` } : {};
};
