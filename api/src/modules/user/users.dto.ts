import { PermissionResponseDto } from "../permissions/permissions.dto";
import { RoleResponseDto } from "../roles/roles.dto";
import { user_status } from "@api/drizzle/schema";

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
}

export interface TokenDto {
  tokenType: string;
  accessToken: string;
  accessTokenExpires: string;
  refreshToken: string;
  expirationMillis?: number;
}
