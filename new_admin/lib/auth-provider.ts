import { LoginForm, User } from "./auth-types";
import { verifyOtp } from "./user";
import { TOKEN_KEY } from "./auth-store";
import ms from "ms";
import { addMilliseconds, isBefore, parseISO } from "date-fns";

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

      if (error) {
        throw new Error(error.value.message || "Login failed");
      }

      if (data) {
        // Вычисляем время истечения токена
        const expirationAddition = data.token?.accessTokenExpires 
          ? parseInt(ms(+data.token?.accessTokenExpires || 0))
          : 24 * 60 * 60 * 1000; // 24 часа по умолчанию

        const expiration = addMilliseconds(new Date(), expirationAddition).toISOString();

        // Сохраняем данные в localStorage
        localStorage.setItem(
          TOKEN_KEY,
          JSON.stringify({
            user: data.user,
            token: data.token?.accessToken,
            expiration,
          })
        );

        return data.user!;
      }

      throw new Error("Login failed");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Login failed";
      throw new Error(errorMessage);
    }
  },

  logout: async () => {
    localStorage.removeItem(TOKEN_KEY);
    return Promise.resolve();
  },

  check: async () => {
    const authData = localStorage.getItem(TOKEN_KEY);
    
    if (!authData) {
      return false;
    }

    try {
      const { expiration } = JSON.parse(authData);

      if (!expiration) {
        localStorage.removeItem(TOKEN_KEY);
        return false;
      }
      
      if (expiration) {
        const isExpired = isBefore(parseISO(expiration), new Date());
        
        if (isExpired) {
          localStorage.removeItem(TOKEN_KEY);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      localStorage.removeItem(TOKEN_KEY);
      return false;
    }
  },

  getPermissions: async () => {
    const authData = localStorage.getItem(TOKEN_KEY);
    
    if (!authData) {
      return [];
    }

    try {
      const { user } = JSON.parse(authData);
      return user?.permissions || [];
    } catch (error) {
      return [];
    }
  },

  getIdentity: async () => {
    const authData = localStorage.getItem(TOKEN_KEY);
    
    if (!authData) {
      return null;
    }

    try {
      const { user } = JSON.parse(authData);
      return user;
    } catch (error) {
      return null;
    }
  },
}; 