"use client";

import { useState, useEffect } from "react";
import { DataTable } from "../../../components/ui/data-table";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { toast } from "sonner";
import { apiClient, useGetAuthHeaders } from "../../../lib/eden-client";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import Link from "next/link";
import { Eye, Plus, Edit } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "../../../components/ui/badge";
import { Switch } from "../../../components/ui/switch";
import { format } from "date-fns";

// Define Permission interface
interface Permission {
  id: string;
  slug: string;
  active: boolean;
  description: string;
  created_at: string;
}

// Define columns for data table
const columns: ColumnDef<Permission>[] = [
  {
    accessorKey: "active",
    header: "Активность",
    cell: ({ row }) => (
      <Switch 
        checked={row.getValue("active")} 
        disabled 
        className="ml-2" 
      />
    ),
  },
  {
    accessorKey: "slug",
    header: "Код",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("slug")}</div>
    ),
  },
  {
    accessorKey: "description",
    header: "Описание",
    cell: ({ row }) => (
      <div>{row.getValue("description")}</div>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Дата создания",
    cell: ({ row }) => (
      <div>
        {format(new Date(row.getValue("created_at")), "dd.MM.yyyy HH:mm")}
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex justify-end gap-2">
        <Button asChild size="sm" variant="ghost">
          <Link href={`/dashboard/permissions/${row.original.id}`}>
            <Eye className="h-4 w-4 mr-2" />
            View
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/dashboard/permissions/edit?id=${row.original.id}`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>
    ),
  },
];

export default function PermissionsList() {
  const [searchQuery, setSearchQuery] = useState("");
  const authHeaders = useGetAuthHeaders();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      pageIndex: 0
    }));
  }, [searchQuery]);

  const { data: permissionsData = { total: 0, data: [] }, isLoading, error } = useQuery({
    queryKey: ["permissions", searchQuery, pagination.pageIndex, pagination.pageSize],
    queryFn: async () => {
      try {
        const filters = [];

        // Add search filter
        if (searchQuery) {
          filters.push({
            field: "slug",
            operator: "contains",
            value: searchQuery,
          });

          filters.push({
            field: "description",
            operator: "contains",
            value: searchQuery,
          });
        }

        const offset = pagination.pageIndex * pagination.pageSize;
        const limit = pagination.pageSize;

        const response = await apiClient.api.permissions.index.get({
          query: {
            fields: ["id", "slug", "active", "description", "created_at"].join(","),
            limit: limit.toString(),
            offset: offset.toString(),
            filters: JSON.stringify(filters),
          },
          headers: authHeaders,
        });

        return {
          total: response.data?.total || 0,
          data: response.data?.data || [],
        };
      } catch (error) {
        toast.error("Failed to fetch permissions", {
          description: "There was an error loading the permissions. Please try again.",
        });
        throw error;
      }
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Список разрешений</CardTitle>
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Поиск разрешений..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="w-[300px]"
          />
          <Button asChild>
            <Link href="/dashboard/permissions/create">
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          // @ts-ignore
          columns={columns}
          // @ts-ignore
          data={permissionsData.data}
          loading={isLoading}
          pageCount={Math.ceil(permissionsData.total / pagination.pageSize)}
          pagination={pagination}
          onPaginationChange={setPagination}
          pageSize={pagination.pageSize}
        />
      </CardContent>
    </Card>
  );
} 