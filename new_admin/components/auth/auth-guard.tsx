"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "../../lib/auth-store";
import { authProvider } from "../../lib/auth-provider";
import { storage } from "../../lib/storage";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const login = useAuthStore((state) => state.login);
  
  useEffect(() => {
    const checkAuth = async () => {
      // Если пользователь уже на странице логина, не перенаправляем
      if (pathname.includes("/auth/login")) {
        setIsChecking(false);
        return;
      }

      // Проверяем авторизацию
      const isAuthorized = await authProvider.check();
      
      if (!isAuthorized && !isAuthenticated) {
        // Если пользователь не авторизован, перенаправляем на страницу логина
        router.push("/auth/login");
      } else if (isAuthorized && !isAuthenticated) {
        // Если пользователь авторизован, но не в стейте, восстанавливаем стейт
        try {
          const user = await authProvider.getIdentity();
          const authData = await storage.getAuthData();
          const token = authData?.token || "";
          
          if (user && token) {
            login(user, token);
          }
          
          setIsChecking(false);
        } catch (error) {
          console.error("Ошибка при восстановлении сеанса:", error);
          setIsChecking(false);
        }
      } else {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [pathname, router, isAuthenticated, login]);

  // Показываем загрузку, пока проверяем авторизацию
  if (isChecking && !pathname.includes("/auth/login")) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
} 