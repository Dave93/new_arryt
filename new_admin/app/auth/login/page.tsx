"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PhoneForm } from "../../../components/auth/phone-form";
import { CodeForm } from "../../../components/auth/code-form";
import { useAuthStore } from "../../../lib/auth-store";
import { sendOtp } from "../../../lib/user";
import { authProvider } from "../../../lib/auth-provider";
import { LoginForm } from "../../../lib/auth-types";

export default function LoginPage() {
  const [current, setCurrent] = useState<"phone" | "code">("phone");
  const [otpSecret, setOtpSecret] = useState("");
  const [phone, setPhone] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const handlePhoneSubmit = async (values: { phone: string }) => {
    setLoading(true);
    const formattedPhone = `+${values.phone}`;
    setPhone(formattedPhone);
    
    try {
      const { data, error } = await sendOtp(formattedPhone);
      
      if (error) {
        toast.error(error.value.message || "Ошибка при отправке кода");
        setLoading(false);
        return;
      }
      
      if (data?.details) {
        setOtpSecret(data.details);
        setCurrent("code");
        toast.success("Код отправлен на ваш номер");
      } else {
        toast.error("Не удалось получить код подтверждения");
      }
    } catch (error) {
      toast.error("Произошла ошибка при отправке кода");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (values: { code: string }) => {
    setLoading(true);
    
    try {
      const loginData: LoginForm = {
        phone,
        code: values.code,
        otpSecret
      };
      
      const user = await authProvider.login(loginData);
      
      if (user) {
        // Получаем токен из localStorage после успешного входа
        const authData = localStorage.getItem("admin-auth");
        const { token } = authData ? JSON.parse(authData) : { token: null };
        
        login(user, token);
        toast.success("Вход выполнен успешно");
        router.push("/dashboard");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Ошибка при входе";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setCurrent("phone");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      {current === "phone" ? (
        <PhoneForm onSubmit={handlePhoneSubmit} isLoading={loading} />
      ) : (
        <CodeForm 
          onSubmit={handleCodeSubmit} 
          onBack={handleBack} 
          isLoading={loading} 
          phone={phone}
        />
      )}
    </div>
  );
} 