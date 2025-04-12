"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, FilterIcon, Download } from "lucide-react";

import { DataTable } from "../../../components/ui/data-table";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { apiClient, useGetAuthHeaders } from "../../../lib/eden-client";
import { ColumnDef } from "@tanstack/react-table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover";
import { Calendar } from "../../../components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "../../../components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import { cn } from "../../../lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { sortTerminalsByName } from "../../../lib/sort_terminals_by_name";

// Define types
interface CourierEfficiency {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  drive_type: "walking" | "bicycle" | "car";
  status: string;
  courier_count: number;
  total_count: number;
  efficiency: number;
  terminals: TerminalEfficiency[];
}

interface TerminalEfficiency {
  id: string;
  name: string;
  courier_count: number;
  total_count: number;
  efficiency: number;
}

interface Terminal {
  id: string;
  name: string;
}

interface Courier {
  id: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
}

// Define filter schema
const filterSchema = z.object({
  date_from: z.date(),
  date_to: z.date(),
  courier_id: z.string().optional().nullable(),
  terminal_id: z.array(z.string()).optional().nullable(),
  status: z.enum(["active", "inactive", "blocked"]).optional().nullable(),
});

type FilterValues = z.infer<typeof filterSchema>;

// Add this interface with the other type definitions at the top of your file
interface CourierEfficiencyParams {
  startDate: string;
  endDate: string;
  status?: "active" | "inactive" | "blocked";
  courier_id?: string;
  terminal_id?: string[];
  search?: string;
}

// Helper function to format phone number
function formatPhoneNumber(phone: string) {
  if (!phone) return "";
  
  try {
    // Basic formatting for display purposes
    const cleaned = phone.replace(/\D/g, "");
    const match = cleaned.match(/^(\d{1})(\d{3})(\d{3})(\d{2})(\d{2})$/);
    
    if (match) {
      return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}-${match[5]}`;
    }
    
    return phone;
  } catch {
    return phone;
  }
}

// Simple component to display courier transport type icon
function CourierDriveTypeIcon({ driveType }: { driveType: string }) {
  if (driveType === "walking") {
    return <span title="Пеший" className="ml-1">🚶</span>;
  } else if (driveType === "bicycle") {
    return <span title="Велосипед" className="ml-1">🚲</span>;
  } else if (driveType === "car") {
    return <span title="Автомобиль" className="ml-1">🚗</span>;
  }
  return null;
}

// Helper function to get status badge class
function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs";
    case "inactive":
      return "bg-gray-100 text-gray-800 px-2 py-1 rounded-md text-xs";
    case "blocked":
      return "bg-red-100 text-red-800 px-2 py-1 rounded-md text-xs";
    default:
      return "bg-gray-100 text-gray-800 px-2 py-1 rounded-md text-xs";
  }
}

// Helper function to get translated status
function getStatusText(status: string) {
  switch (status) {
    case "active":
      return "Активный";
    case "inactive":
      return "Неактивный";
    case "blocked":
      return "Заблокирован";
    default:
      return status;
  }
}

// Component to show detailed information about courier efficiency in a modal
function CourierEfficiencyDetails({ courier }: { courier: CourierEfficiency }) {
  if (!courier) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Детали
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            {courier.first_name} {courier.last_name}{" "}
            <span className="ml-2">
              <CourierDriveTypeIcon driveType={courier.drive_type} />
            </span>
            <span className={`ml-3 ${getStatusBadge(courier.status)}`}>
              {getStatusText(courier.status)}
            </span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Телефон</h3>
              <p className="mt-1">{formatPhoneNumber(courier.phone)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Тип транспорта</h3>
              <p className="mt-1">
                {courier.drive_type === "walking" && "Пеший"}
                {courier.drive_type === "bicycle" && "Велосипед"}
                {courier.drive_type === "car" && "Автомобиль"}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Статус</h3>
              <p className="mt-1">{getStatusText(courier.status)}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Эффективность</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Обработанные заказы</div>
                <div className="text-2xl font-bold mt-1">
                  {new Intl.NumberFormat("ru-RU").format(courier.courier_count)}
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Всего заказов</div>
                <div className="text-2xl font-bold mt-1">
                  {new Intl.NumberFormat("ru-RU").format(courier.total_count)}
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Процент эффективности</div>
                <div className="text-2xl font-bold mt-1">
                  {new Intl.NumberFormat("ru-RU").format(
                    Number(Number.parseFloat(String(courier.efficiency)).toFixed(0))
                  )}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Define columns for the efficiency table
const columns = (efficiencyData: CourierEfficiency[]): ColumnDef<CourierEfficiency>[] => [
  {
    accessorKey: "index",
    header: "№",
    cell: ({ row }) => <div>{row.index + 1}</div>,
    size: 50,
  },
  {
    accessorKey: "name",
    header: "Курьер",
    cell: ({ row }) => (
      <div className="font-medium">
        {row.original.first_name} {row.original.last_name}{" "}
        <CourierDriveTypeIcon driveType={row.original.drive_type} />
      </div>
    ),
  },
  {
    accessorKey: "phone",
    header: "Телефон",
    cell: ({ row }) => (
      <div>{formatPhoneNumber(row.original.phone)}</div>
    ),
  },
  {
    accessorKey: "courier_count",
    header: "Кол-во обработанных заказов",
    cell: ({ row }) => (
      <div>{new Intl.NumberFormat("ru-RU").format(Number(row.original.courier_count))}</div>
    ),
  },
  {
    accessorKey: "total_count",
    header: "Кол-во всех заказов",
    cell: ({ row }) => (
      <div>{new Intl.NumberFormat("ru-RU").format(Number(row.original.total_count))}</div>
    ),
  },
  {
    accessorKey: "efficiency",
    header: "Эффективность",
    cell: ({ row }) => (
      <div>
        {new Intl.NumberFormat("ru-RU").format(
          Number(Number.parseFloat(String(row.original.efficiency)).toFixed(0))
        )}
        %
      </div>
    ),
  },
  {
    id: "details",
    header: "Действия",
    cell: ({ row }) => {
      // Find the full courier object with all data
      const courier = efficiencyData.find(c => c.id === row.original.id);
      return courier ? <CourierEfficiencyDetails courier={courier} /> : null;
    },
  },
];

export default function CourierEfficiencyList() {
  const [searchQuery, setSearchQuery] = useState("");
  const authHeaders = useGetAuthHeaders();
  
  // Get current date for default filter values
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);
  
  // Initialize form with default values
  const form = useForm<FilterValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      date_from: startOfDay,
      date_to: endOfDay,
      courier_id: "all",
      terminal_id: ["all"],
      status: "active",
    },
  });

  // Fetch terminals list
  const { data: terminals = [] } = useQuery({
    queryKey: ["terminals"],
    queryFn: async () => {
      try {
        const { data } = await apiClient.api.terminals.cached.get({
          headers: authHeaders,
        });
        return sortTerminalsByName(data || []);
      } catch {
        toast.error("Ошибка загрузки филиалов");
        return [];
      }
    },
    enabled: !!authHeaders,
  });

  // Fetch couriers list
  const { data: couriers = [] } = useQuery({
    queryKey: ["couriers"],
    queryFn: async () => {
      try {
        const { data } = await apiClient.api.couriers.all.get({
          headers: authHeaders,
        });
        return data || [];
      } catch {
        toast.error("Ошибка загрузки курьеров");
        return [];
      }
    },
    enabled: !!authHeaders,
  });

  // Get the current filter values
  const filterValues = form.watch();

  // Fetch efficiency data
  const { data: efficiencyData = [], isLoading } = useQuery<CourierEfficiency[]>({
    queryKey: ["courier-efficiency", filterValues, searchQuery],
    // @ts-ignore
    queryFn: async () => {
      try {
        const { date_from, date_to, courier_id, terminal_id, status } = filterValues;

        // Then update the API params section:
        const apiParams: CourierEfficiencyParams = {
          startDate: date_from.toISOString(),
          endDate: date_to.toISOString(),
          status: status || undefined,
        };
        
        // Добавляем courier_id только если не "all"
        if (courier_id && courier_id !== "all") {
          apiParams.courier_id = courier_id;
        }
        
        // Добавляем terminal_id только если массив не пустой и не содержит "all"
        if (terminal_id && terminal_id.length > 0 && terminal_id[0] !== "all") {
          apiParams.terminal_id = terminal_id;
        }
        
        // Добавляем поисковый запрос, если он задан
        if (searchQuery) {
          apiParams.search = searchQuery;
        }
        
        const { data } = await apiClient.api.couriers.efficiency.post({
          ...apiParams,
        }, {

            headers: authHeaders,
        });
        
        return data || [];
      } catch {
        toast.error("Ошибка загрузки данных эффективности курьеров");
        return [];
      }
    },
    enabled: !!authHeaders,
  });

  // Handle export action
  const handleExport = async () => {
    toast.info("Экспорт данных...");
    // Implement export functionality here
  };

  // Handle filter submit
  const onSubmit = () => {
    // The query will automatically refetch with the new values
  };

  // Generate columns with access to efficiencyData
  // @ts-ignore
  const tableColumns = columns(efficiencyData);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Эффективность курьеров</CardTitle>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex gap-4">
              {/* Date range selector */}
              <FormField
                control={form.control}
                name="date_from"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Дата от</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd.MM.yyyy")
                            ) : (
                              <span>Выберите дату</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="date_to"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Дата до</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd.MM.yyyy")
                            ) : (
                              <span>Выберите дату</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />

              {/* Terminal selector */}
              <FormField
                control={form.control}
                name="terminal_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Филиал</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? [value] : null)}
                      value={field.value?.[0] || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите филиал" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">Все филиалы</SelectItem>
                        {terminals.map((terminal: Terminal) => (
                          <SelectItem key={terminal.id} value={terminal.id}>
                            {terminal.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* Courier selector */}
              <FormField
                control={form.control}
                name="courier_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Курьер</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите курьера" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">Все курьеры</SelectItem>
                        {couriers.map((courier: Courier) => (
                          <SelectItem key={courier.id} value={courier.id}>
                            {courier.first_name} {courier.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* Status selector */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Статус</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите статус" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Активный</SelectItem>
                        <SelectItem value="inactive">Неактивный</SelectItem>
                        <SelectItem value="blocked">Заблокирован</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-between">
              <Input
                placeholder="Поиск по ФИО или телефону..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
              <Button type="submit">
                <FilterIcon className="h-4 w-4 mr-2" />
                Фильтровать
              </Button>
            </div>
          </form>
        </Form>

        <DataTable 
          columns={tableColumns}
          // @ts-ignore
          data={efficiencyData} 
          loading={isLoading}
        />
      </CardContent>
    </Card>
  );
} 