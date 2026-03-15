"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, FilterIcon, Download, Eye } from "lucide-react";

import { DataTable } from "../../../components/ui/data-table";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { PageTitle } from "@/components/page-title";
import { apiClient } from "../../../lib/eden-client";
import { ColumnDef } from "@tanstack/react-table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover";
import { Calendar } from "../../../components/ui/calendar";
import MultipleSelector, { Option } from "@/components/ui/multiselect";
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
  organization_id: z.array(z.string()).optional().nullable(),
  terminal_id: z.array(z.string()).optional().nullable(),
  courier_id: z.array(z.string()).optional().nullable(),
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
  const [selectedCourierOptions, setSelectedCourierOptions] = useState<Option[]>([]);
  
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
      organization_id: [],
      terminal_id: [],
      courier_id: [],
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

  // Fetch couriers for search
  const fetchCouriers = async (query: string): Promise<Option[]> => {
    try {
      const { data: couriers } = await apiClient.api.couriers.search.get({
        query: { search: query },
      });
      if (couriers && Array.isArray(couriers)) {
        return couriers.map((c: any) => ({
          value: c.id,
          label: `${c.first_name} ${c.last_name} (${c.phone})`,
        }));
      }
      return [];
    } catch {
      return [];
    }
  };

  // Organization options for MultipleSelector
  const organizationOptions: Option[] = organizations.map(o => ({ value: o.id, label: o.name }));
  const selectedOrganizationOptions: Option[] = (form.watch("organization_id") || [])
    .map((id: string) => organizations.find(o => o.id === id))
    .filter((o: Organization | undefined): o is Organization => !!o)
    .map((o: Organization) => ({ value: o.id, label: o.name }));

  // Terminal options for MultipleSelector
  const terminalOptions: Option[] = terminals.map(t => ({ value: t.id, label: t.name }));
  const selectedTerminalOptions: Option[] = (form.watch("terminal_id") || [])
    .map((id: string) => terminals.find(t => t.id === id))
    .filter((t: Terminal | undefined): t is Terminal => !!t)
    .map((t: Terminal) => ({ value: t.id, label: t.name }));

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
        if (organization_id && organization_id.length > 0) {
          filters.push({
            field: "organization_id",
            operator: "in",
            value: organization_id as any,
          });
        }
        
        if (terminal_id && terminal_id.length > 0) {
          filters.push({
            field: "terminal_id",
            operator: "in",
            value: terminal_id as any,
          });
        }

        if (courier_id && courier_id.length > 0) {
          filters.push({
            field: "courier_id",
            operator: "in",
            value: courier_id as any,
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
        
        const { data } = await apiClient.api.manager_withdraw.get({
          query: {
            ...params,
            filters: JSON.stringify(filters),
          },
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

  const exportButton = (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="h-4 w-4 mr-2" />
      Экспорт
    </Button>
  );

  return (
    <>
    <PageTitle title="Выплаты курьерам" actions={exportButton} />
    <div className="px-4 py-2">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
          <div className="flex items-end gap-3 flex-wrap">
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
                  <MultipleSelector
                    value={selectedOrganizationOptions}
                    onChange={(opts) => field.onChange(opts.map(o => o.value))}
                    options={organizationOptions}
                    placeholder="Выберите организации"
                    className="w-full"
                  />
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
                  <MultipleSelector
                    value={selectedTerminalOptions}
                    onChange={(opts) => field.onChange(opts.map(o => o.value))}
                    options={terminalOptions}
                    placeholder="Выберите филиалы"
                    className="w-full"
                  />
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
                  <MultipleSelector
                    value={selectedCourierOptions}
                    onChange={(opts) => {
                      setSelectedCourierOptions(opts);
                      field.onChange(opts.map(o => o.value));
                    }}
                    onSearch={fetchCouriers}
                    placeholder="Поиск курьеров..."
                    className="w-full"
                    triggerSearchOnFocus
                    delay={300}
                  />
                </FormItem>
              )}
            />

            <Input
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-[200px]"
            />

            <Button type="submit" size="sm">
              <FilterIcon className="h-4 w-4 mr-2" />
              Фильтровать
            </Button>
          </div>
        </form>
      </Form>
    </div>

    <div className="px-4 py-1">
      <DataTable
        columns={columns}
        // @ts-ignore
        data={data}
        loading={isLoading}
        footerContent={data.length > 0 ? (
          <tr className="border-t font-semibold">
            <td className="p-3" colSpan={4}>Итого:</td>
            <td className="p-3">{new Intl.NumberFormat("ru-RU").format(total)}</td>
            <td className="p-3">{new Intl.NumberFormat("ru-RU").format(amountBefore)}</td>
            <td className="p-3">{new Intl.NumberFormat("ru-RU").format(amountAfter)}</td>
            <td className="p-3"></td>
          </tr>
        ) : undefined}
      />
    </div>
    </>
  );
} 