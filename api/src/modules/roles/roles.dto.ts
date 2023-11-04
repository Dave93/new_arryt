import { PermissionResponseDto } from "../permissions/permissions.dto";

export interface RoleResponseDto {
  name: string;

  permissions: PermissionResponseDto[];

  active: boolean;
}
