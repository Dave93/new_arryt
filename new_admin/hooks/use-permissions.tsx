import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/eden-client";

export default function usePermissions() {

  const { data: permissionsList } = useQuery({
    queryKey: ["my_permissions"],
    queryFn: async () => {
      const response = await apiClient.api.users.permissions.get();
      return response.data?.permissions || [];
    },
  });
  return permissionsList;
}
