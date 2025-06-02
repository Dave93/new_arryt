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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Инициализация...</p>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
} 