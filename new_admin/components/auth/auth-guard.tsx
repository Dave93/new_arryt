"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "../../lib/auth-store";
import { authProvider } from "../../lib/auth-provider";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
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
      } else {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [pathname, router, isAuthenticated]);

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