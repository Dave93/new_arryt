"use client";

import { useState, useEffect } from "react";
import { DataTable } from "../../../components/ui/data-table";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { toast } from "sonner";
import { apiClient } from "../../../lib/eden-client";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import Link from "next/link";
import { Eye, Plus, Edit } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "../../../components/ui/badge";
import { Switch } from "../../../components/ui/switch";
import { format } from "date-fns";

// Define Role interface
interface Role {
  id: string;
  name: string;
  active: boolean;
  code: string;
  created_at: string;
}

// Define columns for data table
const columns: ColumnDef<Role>[] = [
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
    accessorKey: "name",
    header: "Название",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "code",
    header: "Код",
    cell: ({ row }) => (
      <div>{row.getValue("code")}</div>
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
          <Link href={`/dashboard/roles/${row.original.id}`}>
            <Eye className="h-4 w-4 mr-2" />
            View
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/dashboard/roles/edit?id=${row.original.id}`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>
    ),
  },
];

export default function RolesList() {
  const [searchQuery, setSearchQuery] = useState("");
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

  const { data: rolesData = { total: 0, data: [] }, isLoading, error } = useQuery({
    queryKey: ["roles", searchQuery, pagination.pageIndex, pagination.pageSize],
    queryFn: async () => {
      try {
        const filters = [];

        // Add search filter
        if (searchQuery) {
          filters.push({
            field: "name",
            operator: "contains",
            value: searchQuery,
          });

          filters.push({
            field: "code",
            operator: "contains",
            value: searchQuery,
          });
        }

        const offset = pagination.pageIndex * pagination.pageSize;
        const limit = pagination.pageSize;

        const response = await apiClient.api.roles.index.get({
          query: {
            fields: ["id", "name", "active", "code", "created_at"].join(","),
            limit: limit.toString(),
            offset: offset.toString(),
            filters: JSON.stringify(filters),
          },
        });

        return {
          total: response.data?.total || 0,
          data: response.data?.data || [],
        };
      } catch (error) {
        toast.error("Failed to fetch roles", {
          description: "There was an error loading the roles. Please try again.",
        });
        throw error;
      }
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Список ролей</CardTitle>
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Поиск ролей..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="w-[300px]"
          />
          <Button asChild>
            <Link href="/dashboard/roles/create">
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          // @ts-ignore
          data={rolesData.data}
          loading={isLoading}
          pageCount={Math.ceil(rolesData.total / pagination.pageSize)}
          pagination={pagination}
          onPaginationChange={setPagination}
          pageSize={pagination.pageSize}
        />
      </CardContent>
    </Card>
  );
} 