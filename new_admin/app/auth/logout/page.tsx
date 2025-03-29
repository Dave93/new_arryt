"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../../lib/auth-store";
import { authProvider } from "../../../lib/auth-provider";
import { toast } from "sonner";

export default function LogoutPage() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Выполняем выход через authProvider
        await authProvider.logout();
        
        // Очищаем состояние в хранилище
        logout();
        
        // Показываем сообщение об успешном выходе
        toast.success("Вы успешно вышли из системы");
        
        // Перенаправляем на страницу логина
        setTimeout(() => {
          router.push("/auth/login");
        }, 1500);
      } catch (error) {
        console.error("Ошибка при выходе из системы:", error);
        toast.error("Произошла ошибка при выходе из системы");
        
        // В случае ошибки все равно перенаправляем на страницу логина
        setTimeout(() => {
          router.push("/auth/login");
        }, 1500);
      }
    };

    performLogout();
  }, [logout, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Выход из системы...</h1>
        <p className="text-muted-foreground">Вы будете перенаправлены на страницу входа.</p>
      </div>
    </div>
  );
} 