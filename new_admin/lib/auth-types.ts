
export interface LoginForm {
  phone: string;
  code: string;
  otpSecret: string;
}

export interface User {
  id: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  is_super_user: boolean;
  status: string;
  token?: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpires: string;
  };
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
} 