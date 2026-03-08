"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { FilterIcon, Download, Wallet } from "lucide-react";

import { DataTable } from "../../../components/ui/data-table";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { PageTitle } from "@/components/page-title";
import { Skeleton } from "../../../components/ui/skeleton";
import { apiClient } from "../../../lib/eden-client";
import { ColumnDef } from "@tanstack/react-table";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Define types
interface CourierBalance {
  id: string;
  balance: string;
  drive_type?: string;
  users: User;
  terminals: Terminal;
}

interface Terminal {
  id: string;
  name: string;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
}

// Define filter schema
const filterSchema = z.object({
  terminal_id: z.array(z.string()).optional().nullable(),
  courier_id: z.string().optional().nullable(),
  status: z.array(z.enum(["active", "inactive", "blocked"])).optional(),
});

type FilterValues = z.infer<typeof filterSchema>;


// Withdraw Modal Component
function CourierWithdrawModal({ courier, onWithdraw }: { courier: CourierBalance, onWithdraw: () => void}) {
  const [amount, setAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleWithdraw = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Введите корректную сумму для выплаты");
      return;
    }
    
    if (Number(amount) > Number(courier.balance)) {
      toast.error("Сумма выплаты не может превышать баланс");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      await apiClient.api.couriers.withdraw.post({
          courier_id: courier.users.id,
          terminal_id: courier.terminals.id,
          amount: +amount,
      });
      
      toast.success("Выплата успешно проведена");
      setAmount("");
      onWithdraw();
      
    } catch {
      toast.error("Ошибка при проведении выплаты");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Wallet className="h-4 w-4 mr-2" />
          Выплата
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Выплата курьеру</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right text-sm font-medium col-span-1">Курьер:</div>
            <div className="col-span-3">
              {courier.users.first_name} {courier.users.last_name}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right text-sm font-medium col-span-1">Филиал:</div>
            <div className="col-span-3">{courier.terminals.name}</div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right text-sm font-medium col-span-1">Баланс:</div>
            <div className="col-span-3 font-semibold">
              {new Intl.NumberFormat("ru-RU").format(Number(courier.balance))}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right text-sm font-medium col-span-1">Сумма выплаты:</div>
            <div className="col-span-3">
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Введите сумму"
                min="0"
                max={courier.balance}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => setAmount(courier.balance)}
            disabled={isSubmitting}
          >
            Максимум
          </Button>
          <Button 
            onClick={handleWithdraw} 
            disabled={isSubmitting || !amount || Number(amount) <= 0 || Number(amount) > Number(courier.balance)}
          >
            {isSubmitting ? "Выплата..." : "Выплатить"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper function for courier drive type icon (simplified)
function CourierDriveTypeIcon({ driveType }: { driveType?: string }) {
  if (!driveType) return null;
  
  const driveTypeMap: Record<string, { label: string, className: string }> = {
    "car": { label: "🚗", className: "text-blue-500" },
    "bicycle": { label: "🚲", className: "text-green-500" },
    "scooter": { label: "🛵", className: "text-yellow-500" },
    "foot": { label: "🚶", className: "text-orange-500" },
  };
  
  const dType = driveTypeMap[driveType] || { label: "❓", className: "text-gray-500" };
  
  return (
    <span className={`ml-2 ${dType.className}`} title={driveType}>
      {dType.label}
    </span>
  );
}

// Function to sort arrays by name
function sortByName<T extends { name: string }>(array: T[]): T[] {
  return [...array].sort((a, b) => a.name.localeCompare(b.name));
}

// Format phone number
function formatPhone(phone: string): string {
  if (!phone) return "";
  
  // Simple formatter (you may want to use a library like libphonenumber)
  const cleaned = phone.replace(/\D/g, "");
  
  if (cleaned.length === 11 && cleaned.startsWith("7")) {
    return `+7 (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7, 9)}-${cleaned.substring(9, 11)}`;
  }
  
  return phone;
}

export default function CourierBalanceList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  
  // Initialize form with default values
  const form = useForm<FilterValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      terminal_id: [],
      courier_id: "",
      status: ["active"],
    },
  });

  // Get the current filter values
  const filterValues = form.watch();

  // Fetch terminals data
  useEffect(() => {
    const fetchTerminals = async () => {
      
      try {
        const { data: terminalsData } = await apiClient.api.terminals.cached.get();
        
        if (terminalsData && Array.isArray(terminalsData)) {
          setTerminals(sortByName(terminalsData as Terminal[]));
        }
      } catch {
        toast.error("Ошибка загрузки данных филиалов");
      }
    };
    
    fetchTerminals();
  }, []);


  // Define columns for the courier balance table
  const columns: ColumnDef<CourierBalance>[] = [
    {
      id: "index",
      header: "№",
      cell: ({ row }) => <div>{row.index + 1}</div>,
    },
    {
      accessorKey: "users",
      header: "Курьер",
      cell: ({ row }) => (
        <div>
          {row.original.users.first_name} {row.original.users.last_name}{" "}
          <CourierDriveTypeIcon driveType={row.original.drive_type} />
        </div>
      ),
    },
    {
      accessorKey: "users.phone",
      header: "Телефон",
      cell: ({ row }) => (
        <div>{formatPhone(row.original.users.phone)}</div>
      ),
    },
    {
      accessorKey: "terminals.name",
      header: "Филиал",
      cell: ({ row }) => (
        <div>{row.original.terminals.name}</div>
      ),
    },
    {
      accessorKey: "balance",
      header: "Баланс",
      cell: ({ row }) => (
        <div className="font-medium">
          {new Intl.NumberFormat("ru-RU").format(Number(row.original.balance))}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Действия",
      cell: ({ row }) => (
        <CourierWithdrawModal 
          courier={row.original} 
          onWithdraw={() => refetch()} 
        />
      ),
    },
  ];

  // Fetch courier balance data
  const { data = [], isLoading, refetch } = useQuery<CourierBalance>({
    queryKey: ["courier-balance", filterValues, searchQuery],
    // @ts-ignore
    queryFn: async () => {
      try {
        const { terminal_id, courier_id, status } = filterValues;
        
        const { data: couriersBalanceData } = await apiClient.api.couriers.terminal_balance.post({
            terminal_id: terminal_id?.length && terminal_id[0] !== "all" ? terminal_id : undefined,
            courier_id: courier_id && courier_id !== "all" ? [courier_id] : undefined,
            status: status
        }, {
        });
        
        if (couriersBalanceData && Array.isArray(couriersBalanceData)) {
          // @ts-ignore
          return couriersBalanceData as CourierBalance[];
        }
        
        return [];
      } catch {
        toast.error("Ошибка загрузки данных баланса курьеров");
        return [];
      }
    }
  });

  // Handle export action
  const handleExport = async () => {
    // try {
    //   toast.info("Экспорт данных начат");
      
    //   const { terminal_id, courier_id, status } = filterValues;
      
    //   // Using Excel service from backend for export
    //   const response = await apiClient.api.couriers.balance.export.post({
    //     body: {
    //       terminal_id: terminal_id?.length && terminal_id[0] !== "all" ? terminal_id : undefined,
    //       courier_id: courier_id && courier_id !== "all" ? courier_id : undefined,
    //       status: status,
    //       search: searchQuery || undefined,
    //     },
    //     $responseType: "blob",
    //   });
      
    //   // Handle the blob response
    //   const url = window.URL.createObjectURL(new Blob([response.data]));
    //   const link = document.createElement("a");
    //   link.href = url;
    //   link.setAttribute("download", `courier-balance-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    //   document.body.appendChild(link);
    //   link.click();
    //   document.body.removeChild(link);
      
    //   toast.success("Экспорт данных завершен");
    // } catch {
    //   toast.error("Ошибка при экспорте данных");
    // }
  };

  // Handle filter submit
  const onSubmit = () => {
    // The query will automatically refetch with the new values
  };

  // Calculate total balance
  // @ts-ignore
  const totalBalance = data?.reduce((sum, item) => sum + Number(item.balance), 0);

  return (
    <>
    <PageTitle title="Кошелёк курьеров" />
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
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
            <div className="flex flex-wrap gap-4">
              {/* Terminal selector */}
              <FormField
                control={form.control}
                name="terminal_id"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>Филиал</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "all" ? ["all"] : [value])}
                      value={field.value?.[0] || "all"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите филиал" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">Все филиалы</SelectItem>
                        {terminals.map((terminal) => (
                          <SelectItem key={terminal.id} value={terminal.id}>
                            {terminal.name}
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
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>Статус</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange([value])}
                      value={field.value?.[0] || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите статус" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Активные</SelectItem>
                        <SelectItem value="inactive">Неактивные</SelectItem>
                        <SelectItem value="blocked">Заблокированные</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* Courier selector (simplified) */}
              <FormField
                control={form.control}
                name="courier_id"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>Курьер</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || "all"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите курьера" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">Все курьеры</SelectItem>
                        {/* Implement dynamic courier options here if needed */}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-between">
              <Input
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
              <Button type="submit">
                <FilterIcon className="h-4 w-4 mr-2" />
                Фильтр
              </Button>
            </div>
          </form>
        </Form>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <>
            {/* @ts-ignore */}
            <DataTable columns={columns} data={data} pageSize={100} />
            {/* @ts-ignore */}
            {data.length > 0 && (
              <div className="flex justify-end mt-4">
                <div className="text-base font-medium">
                  Общий баланс: <span className="font-bold">{new Intl.NumberFormat("ru-RU").format(totalBalance)}</span>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
    </>
  );
} 