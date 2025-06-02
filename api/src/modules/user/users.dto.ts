import { PermissionResponseDto } from "../permissions/permissions.dto";
import { RoleResponseDto } from "../roles/roles.dto";

export interface UserResponseDto {
  id: string;

  phone: string;

  first_name?: string;

  last_name?: string;

  roles?: RoleResponseDto[];

  permissions?: PermissionResponseDto[];

  is_super_user: boolean;

  status: string;

  terminal_id: string[];

  is_online: boolean;

  wallet_balance: number;

  api_token: string;

  daily_garant_id: string;
}


// Define user context type for better type safety
export type UserContext = {
  user: UserResponseDto;
  access: {
    additionalPermissions: string[];
    roles: {
      name: string;
      code: string;
      active: boolean;
    }[];
  };
  terminals?: string[]
} | null;

export interface TokenDto {
  tokenType: string;
  accessToken: string;
  accessTokenExpires: string;
  refreshToken: string;
  expirationMillis?: number;
}
