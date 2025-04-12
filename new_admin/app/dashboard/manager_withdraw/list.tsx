"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, FilterIcon, Download, Eye } from "lucide-react";

import { DataTable } from "../../../components/ui/data-table";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { apiClient } from "../../../lib/eden-client";
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

// Define types
interface ManagerWithdraw {
  id: string;
  amount: string;
  amount_before: string;
  amount_after: string;
  created_at: string;
  payed_date: string;
  managers: User;
  terminals: Terminal;
  couriers: User;
}

interface Terminal {
  id: string;
  name: string;
}

interface Organization {
  id: string;
  name: string;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

// Новый интерфейс для транзакций, соответствующий API
interface ManagerWithdrawTransaction {
  id: string;
  order_number: string;
  transaction_created_at: string;
  order_created_at: string | null;
  withdraw_amount: string;
  transaction_id: string;
}

interface Transaction {
  field: string;
  operator: string;
  value: string;
}

// Define filter schema
const filterSchema = z.object({
  date_range: z.object({
    from: z.date(),
    to: z.date(),
  }),
  organization_id: z.string().optional().nullable(),
  terminal_id: z.array(z.string()).optional().nullable(),
  courier_id: z.string().optional().nullable(),
});

type FilterValues = z.infer<typeof filterSchema>;

// Component to show detailed transactions
function ManagerWithdrawTransactions({ record }: { 
  record: ManagerWithdraw, 
}) {
  const [transactions, setTransactions] = useState<ManagerWithdrawTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);


  // Загружаем данные транзакций при монтировании компонента
  useEffect(() => {
    const loadTransactions = async () => {
      if (!record?.id) return;
      
      try {
        setIsLoading(true);
        const { data } = await apiClient.api.manager_withdraw({id: record.id}).transactions.get();
        
        if (data && Array.isArray(data)) {
          // @ts-ignore
          setTransactions(data as ManagerWithdrawTransaction[]);
        }
      } catch {
        toast.error("Ошибка загрузки транзакций");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTransactions();
  }, [record?.id]);

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <p className="mt-2 text-sm text-muted-foreground">Загрузка транзакций...</p>
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return <div className="py-4 text-center text-muted-foreground">Нет транзакций</div>;
  }

  return (
    <div className="p-4">
      <div className="overflow-auto max-h-[60vh]">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Номер заказа
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Дата зачисления в кошелёк
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Дата заказа
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Выплачено
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <tr key={transaction.transaction_id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {transaction.order_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {format(new Date(transaction.transaction_created_at), "dd.MM.yyyy HH:mm")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {transaction.order_created_at ? 
                    format(new Date(transaction.order_created_at), "dd.MM.yyyy HH:mm") : 
                    "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {new Intl.NumberFormat("ru-RU").format(Number(transaction.withdraw_amount))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Заменяем функцию sortBy на собственную
function sortByName<T extends { name: string }>(array: T[]): T[] {
  return [...array].sort((a, b) => a.name.localeCompare(b.name));
}

export default function ManagerWithdrawList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  
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
      date_range: {
        from: startOfDay,
        to: endOfDay,
      },
      organization_id: "all",
      terminal_id: ["all"],
      courier_id: "all",
    },
  });

  // Get the current filter values
  const filterValues = form.watch();

  // Fetch terminals and organizations data
  useEffect(() => {
    const fetchFilterData = async () => {
      
      try {
        // Fetch terminals
        const { data: terminalsData } = await apiClient.api.terminals.cached.get();
        
        if (terminalsData && Array.isArray(terminalsData)) {
          setTerminals(sortByName(terminalsData as Terminal[]));
        }
        
        // Fetch organizations
        const { data: organizationsData } = await apiClient.api.organizations.cached.get();
        
        if (organizationsData && Array.isArray(organizationsData)) {
          setOrganizations(organizationsData as Organization[]);
        }
      } catch {
        toast.error("Ошибка загрузки данных филиалов и организаций");
      }
    };
    
    fetchFilterData();
  }, []);

  // Define columns for the manager withdraws table
  const columns: ColumnDef<ManagerWithdraw>[] = [
    {
      accessorKey: "created_at",
      header: "Дата",
      cell: ({ row }) => (
        <div>
          {format(new Date(row.original.created_at), "dd.MM.yyyy HH:mm")}
        </div>
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
      accessorKey: "couriers",
      header: "Курьер",
      cell: ({ row }) => (
        <div>
          {row.original.couriers.first_name} {row.original.couriers.last_name}
        </div>
      ),
    },
    {
      accessorKey: "managers",
      header: "Менеджер",
      cell: ({ row }) => (
        <div>
          {row.original.managers.first_name} {row.original.managers.last_name}
        </div>
      ),
    },
    {
      accessorKey: "amount",
      header: "Выплатил",
      cell: ({ row }) => (
        <div>
          {new Intl.NumberFormat("ru-RU").format(Number(row.original.amount))}
        </div>
      ),
    },
    {
      accessorKey: "amount_before",
      header: "Кошелёк до выплат",
      cell: ({ row }) => (
        <div>
          {new Intl.NumberFormat("ru-RU").format(Number(row.original.amount_before))}
        </div>
      ),
    },
    {
      accessorKey: "amount_after",
      header: "Кошелёк после выплат",
      cell: ({ row }) => (
        <div>
          {new Intl.NumberFormat("ru-RU").format(Number(row.original.amount_after))}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Действия",
      cell: ({ row }) => (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Детали
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader className="sticky top-0 z-10 pb-4">
              <DialogTitle className="font-medium">
                Детали выплаты №{row.original.id}
              </DialogTitle>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Дата</div>
                  <div>{format(new Date(row.original.created_at), "dd.MM.yyyy HH:mm")}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Филиал</div>
                  <div>{row.original.terminals.name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Курьер</div>
                  <div>{row.original.couriers.first_name} {row.original.couriers.last_name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Сумма выплаты</div>
                  <div className="font-semibold">{new Intl.NumberFormat("ru-RU").format(Number(row.original.amount))}</div>
                </div>
              </div>
            </DialogHeader>
            <div className="sticky top-[72px] z-10 bg-background h-px bg-border my-4"></div>
            <ManagerWithdrawTransactions record={row.original} />
          </DialogContent>
        </Dialog>
      ),
    },
  ];

  // Fetch withdraw data
  const { data = [], isLoading } = useQuery({
    queryKey: ["manager-withdraws", filterValues, searchQuery],
    queryFn: async () => {
      try {
        const { date_range, organization_id, terminal_id, courier_id } = filterValues;
        
        // Prepare API request parameters
        const params: {
          limit: string;
          offset: string;
          fields: string;
        } = {
          limit: "1000",
          offset: "0",
          fields: "id,created_at,amount,amount_before,amount_after,terminals,couriers,managers,transactions,terminals.name,couriers.first_name,couriers.last_name,managers.first_name,managers.last_name",
        };
        const filters: Transaction[] = [];
        filters.push({
          field: "created_at",
          operator: "gte",
          value: date_range.from.toISOString(),
        });

        filters.push({
          field: "created_at",
          operator: "lte",
          value: date_range.to.toISOString(),
        });
        
        
        
        
        // Добавляем опциональные фильтры
        if (organization_id && organization_id !== "all") {
          filters.push({
            field: "organization_id",
            operator: "eq",
            value: organization_id,
          });
        }
        
        if (terminal_id && terminal_id.length > 0 && terminal_id[0] !== "all") {
          filters.push({
            field: "terminal_id",
            operator: "in",
            value: JSON.stringify(terminal_id),
          });
        }
        
        if (courier_id && courier_id !== "all") {
          filters.push({
            field: "courier_id",
            operator: "eq",
            value: courier_id,
          });
        }
        
        // Добавляем поисковый запрос, если он есть
        if (searchQuery) {
          filters.push({
            field: "search",
            operator: "contains",
            value: searchQuery,
          });
        }
        
        const { data } = await apiClient.api.manager_withdraw.index.get({
          query: params,
        });
        
        return data?.data || [];
      } catch {
        toast.error("Ошибка загрузки данных выплат");
        return [];
      }
    }
  });

  // Handle export action
  const handleExport = async () => {
    // try {
    //   toast.info("Экспорт данных начат");
      
    //   const { date_range, organization_id, terminal_id, courier_id } = filterValues;
      
    //   const filters = [
    //     {
    //       field: "created_at",
    //       operator: "gte",
    //       value: date_range.from.toISOString(),
    //     },
    //     {
    //       field: "created_at",
    //       operator: "lte",
    //       value: date_range.to.toISOString(),
    //     },
    //   ];
      
    //   if (organization_id && organization_id !== "all") {
    //     filters.push({
    //       field: "organization_id",
    //       operator: "eq",
    //       value: organization_id,
    //     });
    //   }
      
    //   if (terminal_id && terminal_id.length > 0 && terminal_id[0] !== "all") {
    //     filters.push({
    //       field: "terminal_id",
    //       operator: "in",
    //       value: JSON.stringify(terminal_id),
    //     });
    //   }
      
    //   if (courier_id && courier_id !== "all") {
    //     filters.push({
    //       field: "courier_id",
    //       operator: "eq",
    //       value: courier_id,
    //     });
    //   }
      
    //   if (searchQuery) {
    //     filters.push({
    //       field: "search",
    //       operator: "contains",
    //       value: searchQuery,
    //     });
    //   }
      
    //   // Call export endpoint
    //   const response = await apiClient.api.manager_withdraw.index.export.get({
    //     $query: {
    //       filters: JSON.stringify(filters),
    //     },
    //     $responseType: "blob",
    //   });
      
    //   // Handle the blob response
    //   const url = window.URL.createObjectURL(new Blob([response.data]));
    //   const link = document.createElement("a");
    //   link.href = url;
    //   link.setAttribute("download", `manager-withdraws-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
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

  // Calculate totals for summary row
  const calculateTotals = () => {
    let total = 0;
    let amountBefore = 0;
    let amountAfter = 0;
    // @ts-ignore
    data.forEach((item: ManagerWithdraw) => {
      total += Number(item.amount);
      amountBefore += Number(item.amount_before);
      amountAfter += Number(item.amount_after);
    });
    
    return { total, amountBefore, amountAfter };
  };

  const { total, amountBefore, amountAfter } = calculateTotals();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Выплаты курьерам</CardTitle>
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
                name="date_range.from"
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
                name="date_range.to"
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

              {/* Organization selector */}
              <FormField
                control={form.control}
                name="organization_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Организация</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите организацию" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">Все организации</SelectItem>
                        {organizations.map((organization) => (
                          <SelectItem key={organization.id} value={organization.id}>
                            {organization.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                        {/* Implement dynamic courier search here */}
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
                Фильтровать
              </Button>
            </div>
          </form>
        </Form>

        <div className="rounded-md border">
          <DataTable 
            columns={columns} 
            // @ts-ignore
            data={data} 
            loading={isLoading}
          />
          
          {/* Summary row */}
          {data.length > 0 && (
            <div className="p-4 border-t bg-muted/30">
              <div className="grid grid-cols-7 gap-4">
                <div className="col-span-4 font-medium">Итого:</div>
                <div className="font-medium">
                  {new Intl.NumberFormat("ru-RU").format(total)}
                </div>
                <div className="font-medium">
                  {new Intl.NumberFormat("ru-RU").format(amountBefore)}
                </div>
                <div className="font-medium">
                  {new Intl.NumberFormat("ru-RU").format(amountAfter)}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 