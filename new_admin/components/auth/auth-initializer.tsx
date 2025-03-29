"use client";

import { useEffect, useState } from "react";
import { authProvider } from "../../lib/auth-provider";
import { useAuthStore } from "../../lib/auth-store";
import { storage } from "../../lib/storage";

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const login = useAuthStore((state) => state.login);
  
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Проверяем доступность IndexedDB
        const isAvailable = await storage.isAvailable();
        
        if (isAvailable) {
          // Проверяем наличие сохраненных данных аутентификации
          const isAuth = await authProvider.check();
          
          if (isAuth) {
            // Получаем данные аутентификации и инициализируем Zustand store
            const user = await authProvider.getIdentity();
            const authData = await storage.getAuthData();
            const token = authData?.token || "";
            
            if (user && token) {
              login(user, token);
            }
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setInitialized(true);
      }
    };
    
    initAuth();
  }, [login]);
  
  // Показываем загрузку, пока инициализируем аутентификацию
  if (!initialized) {
    return null; // Или показываем индикатор загрузки
  }
  
  return <>{children}</>;
} 