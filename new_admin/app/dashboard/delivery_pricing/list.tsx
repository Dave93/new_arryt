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
import { Form, FormControl, FormField, FormItem } from "../../../components/ui/form";
import { useForm } from "react-hook-form";

// Определение типа для ценообразования доставки
interface DeliveryPricing {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  organization_id: string;
  organization: {
    id: string;
    name: string;
  };
  terminal_id?: string;
  terminal?: {
    id: string;
    name: string;
  };
  default: boolean;
  drive_type: string;
  days: number[];
  start_time: string;
  end_time: string;
  min_price: number;
  price_per_km: number;
  payment_type?: string;
}

// Определение типа организации
interface Organization {
  id: string;
  name: string;
}

// Определение колонок для таблицы
const columns: ColumnDef<DeliveryPricing>[] = [
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
    accessorKey: "default",
    header: "По-умолчанию",
    cell: ({ row }) => (
      <Switch 
        checked={row.getValue("default")} 
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
      const pricing = row.original;
      return <div>{pricing.organization?.name || "-"}</div>;
    },
  },
  {
    accessorKey: "drive_type",
    header: "Вид передвижения",
    cell: ({ row }) => {
      const driveType = row.getValue("drive_type") as string;
      const driveTypeMap: Record<string, string> = {
        car: "Автомобиль",
        foot: "Пешком",
        bike: "Велосипед",
        scooter: "Самокат"
      };
      return <div>{driveTypeMap[driveType] || driveType || "-"}</div>;
    }
  },
  {
    accessorKey: "min_price",
    header: "Мин. цена",
    cell: ({ row }) => <div>{row.getValue("min_price") || "-"}</div>,
  },
  {
    accessorKey: "price_per_km",
    header: "Цена за км",
    cell: ({ row }) => <div>{row.getValue("price_per_km") || "-"}</div>,
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
          <Link href={`/dashboard/delivery_pricing/${row.original.id}`}>
            <Eye className="h-4 w-4 mr-2" />
            View
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/dashboard/delivery_pricing/edit?id=${row.original.id}`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>
    ),
  },
];

export default function DeliveryPricingList() {
  const [searchQuery, setSearchQuery] = useState("");
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

  const { data: organizationsData } = useQuery({
    queryKey: ["organizations_cached"],
    queryFn: async () => {
      try {
        const {data: response} = await apiClient.api.organizations.cached.get();
        return response || [];
      } catch {
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

  const { data: deliveryPricingData = { total: 0, data: [] }, isLoading } = useQuery({
    queryKey: ["deliveryPricing", searchQuery, selectedOrgId, pagination.pageIndex, pagination.pageSize],
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
        if (selectedOrgId && selectedOrgId !== "all") {
          filters.push({
            field: "organization_id",
            operator: "eq",
            value: selectedOrgId,
          });
        }

        const {data: response} = await apiClient.api.delivery_pricing.index.get({
          query: {
            fields: "id,name,active,organization_id,organization.name,default,drive_type,days,start_time,end_time,min_price,price_per_km,payment_type,created_at",
            limit: pagination.pageSize.toString(),
            offset: (pagination.pageIndex * pagination.pageSize).toString(),
            sort: JSON.stringify([
              {
                field: "created_at",
                order: "desc",
              },
            ]),
            ...(filters.length > 0 ? { filters: JSON.stringify(filters) } : {}),
          },
        });

        return {
          total: response?.total || 0,
          data: response?.data || [],
        };
      } catch {
        toast.error("Failed to fetch delivery pricing data");
        return { total: 0, data: [] };
      }
    },
  });

  const onOrgFilterChange = (value: string) => {
    setSelectedOrgId(value === "all" ? "" : value);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Условия доставки</CardTitle>
        <div className="flex items-center space-x-2">
          <Form {...form}>
            <FormField
              control={form.control}
              name="organization_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      onOrgFilterChange(value);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter by Organization" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">All Organizations</SelectItem>
                      {organizationsData?.map((org: Organization) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </Form>
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-[200px]"
          />
          <Button asChild>
            <Link href="/dashboard/delivery_pricing/create">
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
          data={deliveryPricingData.data} 
          loading={isLoading}
          pageCount={Math.ceil(deliveryPricingData.total / pagination.pageSize)}
          pagination={pagination}
          onPaginationChange={setPagination}
        />
      </CardContent>
    </Card>
  );
} 