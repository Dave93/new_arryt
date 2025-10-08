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
import { Switch } from "../../../components/ui/switch";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel } from "../../../components/ui/form";
import { useForm } from "react-hook-form";

// Определение типа терминала
interface Terminal {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  organization_id: string;
  organization: {
    id: string;
    name: string;
  };
  phone: string;
  latitude: number;
  longitude: number;
  external_id: string;
  manager_name: string;
  fuel_bonus: boolean;
  time_to_yandex: number;
  allow_close_anywhere: boolean;
  region: string;
}

// Определение типа организации
interface Organization {
  id: string;
  name: string;
}

// Определение колонок для таблицы
const columns: ColumnDef<Terminal>[] = [
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
    accessorKey: "organization.name",
    header: "Организация",
    cell: ({ row }) => {
      const terminal = row.original;
      return <div>{terminal.organization?.name || "-"}</div>;
    },
  },
  {
    accessorKey: "manager_name",
    header: "Менеджер",
    cell: ({ row }) => <div>{row.getValue("manager_name") || "-"}</div>,
  },
  {
    accessorKey: "phone",
    header: "Телефон",
    cell: ({ row }) => <div>{row.getValue("phone") || "-"}</div>,
  },
  {
    accessorKey: "latitude",
    header: "Широта",
    cell: ({ row }) => <div>{row.getValue("latitude")}</div>,
  },
  {
    accessorKey: "longitude",
    header: "Долгота",
    cell: ({ row }) => <div>{row.getValue("longitude")}</div>,
  },
  {
    accessorKey: "external_id",
    header: "Внешний ID",
    cell: ({ row }) => <div>{row.getValue("external_id") || "-"}</div>,
  },
  {
    accessorKey: "fuel_bonus",
    header: "Выдавать на топливо",
    cell: ({ row }) => (
      <Switch 
        checked={row.getValue("fuel_bonus")} 
        disabled 
        className="ml-2" 
      />
    ),
  },
  {
    accessorKey: "region",
    header: "Региональность",
    cell: ({ row }) => {
      const region = row.getValue("region") as string;
      const regionMap: Record<string, string> = {
        capital: "Столица",
        region: "Регион"
      };
      return <div>{regionMap[region] || region || "-"}</div>;
    }
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
          <Link href={`/dashboard/terminals/${row.original.id}`}>
            <Eye className="h-4 w-4 mr-2" />
            View
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/dashboard/terminals/edit?id=${row.original.id}`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>
    ),
  },
];

export default function TerminalsList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  const form = useForm({
    defaultValues: {
      organization_id: "all",
    }
  });

  const { data: organizationsData, isLoading: isLoadingOrganizations } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      try {
        const response = await apiClient.api.organizations.cached.get();
        setOrganizations(response?.data || []);
        return response?.data || [];
      } catch (error) {
        toast.error("Failed to fetch organizations");
        return [];
      }
    },
  });

  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      pageIndex: 0
    }));
  }, [searchQuery, selectedOrgId]);

  const { data: terminalsData = { total: 0, data: [] }, isLoading } = useQuery({
    queryKey: ["terminals", searchQuery, selectedOrgId, pagination.pageIndex, pagination.pageSize],
    queryFn: async () => {
      try {
        const filters = [];

        // Add search filter for name
        if (searchQuery) {
          filters.push({
            field: "name",
            operator: "contains",
            value: searchQuery,
          });
        }

        // Add organization filter
        if (selectedOrgId) {
          filters.push({
            field: "organization_id",
            operator: "eq",
            value: selectedOrgId,
          });
        }

        const offset = pagination.pageIndex * pagination.pageSize;
        const limit = pagination.pageSize;

        const response = await apiClient.api.terminals.get({
          query: {
            fields: [
              "id", "name", "active", "created_at", "organization_id", "phone",
              "latitude", "longitude", "external_id", "manager_name", "fuel_bonus",
              "time_to_yandex", "allow_close_anywhere", "region", "organization.id", "organization.name"
            ].join(","),
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
        toast.error("Failed to fetch terminals", {
          description: "There was an error loading the terminals. Please try again.",
        });
        throw error;
      }
    },
  });

  const onOrgFilterChange = (value: string) => {
    setSelectedOrgId(value === "all" ? "" : value);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Список филиалов</CardTitle>
        <div className="flex items-center space-x-2">
          <Form {...form}>
            <div className="flex items-center gap-2">
              <FormField
                control={form.control}
                name="organization_id"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <Select 
                      value={selectedOrgId || "all"}
                      onValueChange={onOrgFilterChange}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Организация" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все организации</SelectItem>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <Input
                placeholder="Поиск филиалов..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="w-[250px]"
              />
              <Button asChild>
                <Link href="/dashboard/terminals/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create
                </Link>
              </Button>
            </div>
          </Form>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          // @ts-ignore
          data={terminalsData.data}
          loading={isLoading}
          pageCount={Math.ceil(terminalsData.total / pagination.pageSize)}
          pagination={pagination}
          onPaginationChange={setPagination}
          pageSize={pagination.pageSize}
        />
      </CardContent>
    </Card>
  );
} 