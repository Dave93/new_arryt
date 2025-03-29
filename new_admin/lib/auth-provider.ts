import { LoginForm, User } from "./auth-types";
import { verifyOtp } from "./user";
import { storage } from "./storage";
import ms from "ms";
import { addMilliseconds, isBefore, parseISO, addHours } from "date-fns";

export interface AuthProviderMethods {
  login: (credentials: LoginForm) => Promise<User>;
  logout: () => Promise<void>;
  check: () => Promise<boolean>;
  getPermissions: () => Promise<string[]>;
  getIdentity: () => Promise<User | null>;
}

export const authProvider: AuthProviderMethods = {
  login: async ({ phone, code, otpSecret, }: LoginForm) => {
    try {
      // Используем apiClient для отправки запроса на верификацию OTP
      const { data, error } = await verifyOtp(phone, code, otpSecret, undefined);
      console.log('authProvider', data);
      
      if (error) {
        throw new Error(error.value.message || "Login failed");
      }

      if (data) {
        // Вычисляем время истечения токена
        const expirationAddition = data.token?.accessTokenExpires 
          ? parseInt(ms(+data.token?.accessTokenExpires || 0))
          : 24 * 60 * 60 * 1000; // 24 часа по умолчанию

        const expiration = addMilliseconds(new Date(), expirationAddition).toISOString();
        console.log('Expiration:', expiration);
        
        // Подготовка данных для сохранения
        const authData = {
          user: data.user ?? null,
          token: data.token?.accessToken ?? null,
          expiration,
        };
        
        // Сохраняем данные в IndexedDB
        try {
          await storage.setAuthData(authData);
        } catch (error) {
          console.error('Failed to save auth data:', error);
        }

        return data.user!;
      }

      throw new Error("Login failed");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Login failed";
      console.error('Login error:', errorMessage);
      throw new Error(errorMessage);
    }
  },

  logout: async () => {
    try {
      await storage.removeAuthData();
    } catch (error) {
      console.error('Error in logout:', error);
    }
    return Promise.resolve();
  },

  check: async () => {
    try {
      // Получаем данные из IndexedDB
      const authData = await storage.getAuthData();
      
      if (!authData) {
        return false;
      }

      const { expiration } = authData;
      console.log('expiration', expiration);
      if (!expiration) {
        await storage.removeAuthData();
        return false;
      }
      
      const isExpired = isBefore(addHours(parseISO(expiration), 6), new Date());
      
      if (isExpired) {
        console.log('isExpired', isExpired);
        await storage.removeAuthData();
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking auth:', error);
      return false;
    }
  },

  getPermissions: async () => {
    try {
      // Получаем данные из IndexedDB
      const authData = await storage.getAuthData();
      
      if (!authData || !authData.user) {
        return [];
      }
      
      // Используем индексную нотацию для доступа к свойству permissions, которое может не быть в типе
      return (authData.user as any)['permissions'] || [];
    } catch (error) {
      console.error('Error getting permissions:', error);
      return [];
    }
  },

  getIdentity: async () => {
    try {
      // Получаем данные из IndexedDB
      const authData = await storage.getAuthData();
      
      if (!authData) {
        return null;
      }
      
      return authData.user;
    } catch (error) {
      console.error('Error getting identity:', error);
      return null;
    }
  },
}; 