"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import dayjs from "dayjs";

import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { apiClient, useGetAuthHeaders } from "../../../lib/eden-client";
import Link from "next/link";
import { ArrowLeft, Edit, Phone, Calendar as CalendarIcon, CheckCircle, XCircle, Eye, Download, Plus } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Skeleton } from "../../../components/ui/skeleton";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { Calendar } from "../../../components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../../../components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";

// Mapping для статусов пользователей
const userStatusMap: Record<string, string> = {
  "active": "Активный",
  "inactive": "Неактивный",
  "blocked": "Заблокирован"
};

// Mapping для типов доставки
const driveTypeMap: Record<string, string> = {
  "car": "Автомобиль",
  "bike": "Велосипед",
  "foot": "Пешком",
  "scooter": "Самокат"
};

interface User {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  status: string;
  is_online: boolean;
  drive_type: string;
  created_at: string;
  car_model?: string;
  car_number?: string;
  card_name?: string;
  card_number?: string;
  max_active_order_count?: number;
  order_start_date?: string;
  roles: {
    id: string;
    name: string;
  };
  terminals: {
    id: string;
    name: string;
  }[];
  work_schedules?: {
    id: string;
    name: string;
  }[];
  daily_garant?: {
    id: string;
    name: string;
  };
}

// Интерфейс для записи посещаемости
interface RollCall {
  id: string;
  date: string;
  is_online: boolean;
  created_at: string;
  app_version?: string;
  is_late?: boolean;
}

// Интерфейс для выплат курьеру
interface UserWithdraw {
  id: string;
  amount: string;
  amount_before: string;
  amount_after: string;
  created_at: string;
  payed_date: string;
  managers: {
    id: string;
    first_name: string;
    last_name: string;
  };
  terminals: {
    id: string;
    name: string;
  };
}

// Интерфейс для детальной информации о транзакциях в выплате
interface WithdrawTransaction {
  id: string;
  order_number: string;
  transaction_created_at: string;
  order_created_at: string | null;
  withdraw_amount: string;
  transaction_id: string;
}

// Интерфейс для транзакций пользователя
interface UserTransaction {
  id: string;
  created_at: string;
  transaction_type: string;
  status: string;
  order_id?: string | null;
  order_number?: string;
  terminal_name?: string;
  first_name?: string | null;
  last_name?: string | null;
  comment?: string | null;
  amount: number | string;
  not_paid_amount: number | string;
  balance_before: number | string;
  balance_after: number | string;
  [key: string]: any; // Allow any additional properties
}

interface Terminal {
  id: string;
  name: string;
}

interface UserShowProps {
  id: string;
}

// Компонент посещаемости пользователя
function UserAttendance({ userId }: { userId: string }) {
  const [date, setDate] = useState<Date>(new Date());
  const authHeaders = useGetAuthHeaders();
  
  const { data: rollCallData, isLoading, refetch } = useQuery({
    queryKey: ["user-rollcall", userId, date],
    queryFn: async () => {
      try {
        // Получаем даты начала и конца недели для выбранной даты
        const startDate = dayjs(date).startOf('week').toISOString();
        const endDate = dayjs(date).endOf('week').toISOString();
        
        const response = await apiClient.api.couriers.roll_call({id: userId}).get({
          headers: authHeaders,
          query: {
            startDate,
            endDate,
          },
        });
        return response.data || [];
      } catch (error) {
        toast.error("Ошибка загрузки данных посещаемости");
        return [];
      }
    },
    enabled: !!userId && !!authHeaders,
  });

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setDate(date);
      setTimeout(() => {
        refetch();
      }, 100);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="date">Неделя от даты</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={
                  "justify-start text-left font-normal w-[240px]"
                }
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "dd.MM.yyyy") : "Выберите дату"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <Button onClick={() => refetch()} className="mt-7">
          Обновить
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : rollCallData && rollCallData.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата</TableHead>
              <TableHead>Время</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Версия приложения</TableHead>
              <TableHead>Опоздание</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* @ts-ignore */}
            {rollCallData.map((record: RollCall) => (
              <TableRow key={record.id}>
                <TableCell>{format(new Date(record.date), "dd.MM.yyyy")}</TableCell>
                <TableCell>{record.created_at ? format(new Date(record.created_at), "HH:mm") : "-"}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {record.is_online ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Онлайн</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span>Офлайн</span>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>{record.app_version || "-"}</TableCell>
                <TableCell>
                  {record.is_late ? (
                    <Badge variant="destructive">Да</Badge>
                  ) : (
                    <Badge variant="outline">Нет</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Нет данных о посещаемости для выбранного периода
        </div>
      )}
    </div>
  );
}

// Компонент выплат пользователя
function UserWithdrawals({ userId }: { userId: string }) {
  const [startDate, setStartDate] = useState<Date>(dayjs().subtract(30, 'day').toDate());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [withdraws, setWithdraws] = useState<UserWithdraw[]>([]);
  const [selectedWithdraw, setSelectedWithdraw] = useState<UserWithdraw | null>(null);
  const [transactions, setTransactions] = useState<WithdrawTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const authHeaders = useGetAuthHeaders();

  // Загрузка списка выплат
  const loadWithdraws = async () => {
    if (!userId || !authHeaders) return;
    
    try {
      setIsLoading(true);
      
      const params = {
        fields: "id,created_at,amount,amount_before,amount_after,terminals,managers,terminals.name,managers.first_name,managers.last_name",
        limit: "100",
        offset: "0",
      };
      
      const filters = [
        {
          field: "courier_id",
          operator: "eq",
          value: userId,
        },
        {
          field: "created_at",
          operator: "gte",
          value: startDate.toISOString(),
        },
        {
          field: "created_at",
          operator: "lte",
          value: endDate.toISOString(),
        },
      ];
      
      const { data } = await apiClient.api.manager_withdraw.index.get({
        query: {
          ...params,
          filters: JSON.stringify(filters)
        },
        headers: authHeaders,
      });
      
      if (data && data.data) {
        // @ts-ignore
        setWithdraws(data.data as UserWithdraw[]);
      }
    } catch (error) {
      toast.error("Ошибка загрузки данных выплат");
    } finally {
      setIsLoading(false);
    }
  };

  // Загрузка транзакций для выбранной выплаты
  const loadTransactions = async (withdrawId: string) => {
    if (!withdrawId || !authHeaders) return;
    
    try {
      setIsLoadingTransactions(true);
      const { data } = await apiClient.api.manager_withdraw({id: withdrawId}).transactions.get({
        headers: authHeaders,
      });
      
      if (data && Array.isArray(data)) {
        // @ts-ignore
        setTransactions(data as WithdrawTransaction[]);
      }
    } catch (error) {
      toast.error("Ошибка загрузки транзакций");
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  // Загрузка данных при изменении параметров
  useEffect(() => {
    loadWithdraws();
  }, [userId, startDate, endDate, JSON.stringify(authHeaders)]);

  // Обработчик выбора даты начала периода
  const handleStartDateSelect = (date: Date | undefined) => {
    if (date) {
      setStartDate(date);
    }
  };

  // Обработчик выбора даты конца периода
  const handleEndDateSelect = (date: Date | undefined) => {
    if (date) {
      setEndDate(date);
    }
  };

  // Обработчик выбора выплаты для просмотра транзакций
  const handleWithdrawSelect = (withdraw: UserWithdraw) => {
    setSelectedWithdraw(withdraw);
    loadTransactions(withdraw.id);
    setDialogOpen(true);
  };

  // Расчет общей суммы выплат
  const calculateTotal = () => {
    return withdraws.reduce((sum, withdraw) => sum + Number(withdraw.amount), 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="startDate">Дата от</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className="justify-start text-left font-normal w-[240px]"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "dd.MM.yyyy") : "Выберите дату"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={handleStartDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="endDate">Дата до</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className="justify-start text-left font-normal w-[240px]"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "dd.MM.yyyy") : "Выберите дату"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={handleEndDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <Button onClick={loadWithdraws} className="mt-7">
          Обновить
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {withdraws.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Филиал</TableHead>
                    <TableHead>Менеджер</TableHead>
                    <TableHead>Сумма выплаты</TableHead>
                    <TableHead>Баланс до</TableHead>
                    <TableHead>Баланс после</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdraws.map((withdraw) => (
                    <TableRow key={withdraw.id}>
                      <TableCell>{format(new Date(withdraw.created_at), "dd.MM.yyyy HH:mm")}</TableCell>
                      <TableCell>{withdraw.terminals.name}</TableCell>
                      <TableCell>{`${withdraw.managers.first_name} ${withdraw.managers.last_name}`}</TableCell>
                      <TableCell className="font-semibold">
                        {new Intl.NumberFormat("ru-RU").format(Number(withdraw.amount))}
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("ru-RU").format(Number(withdraw.amount_before))}
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("ru-RU").format(Number(withdraw.amount_after))}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleWithdrawSelect(withdraw)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Детали
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} className="font-bold text-right">
                      Итого:
                    </TableCell>
                    <TableCell className="font-bold">
                      {new Intl.NumberFormat("ru-RU").format(calculateTotal())}
                    </TableCell>
                    <TableCell colSpan={3}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Нет данных о выплатах за выбранный период
            </div>
          )}
        </div>
      )}

      {/* Модальное окно с деталями выплаты */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 z-10 pb-4">
            <DialogTitle className="font-medium">
              {selectedWithdraw && `Детали выплаты от ${format(new Date(selectedWithdraw.created_at), "dd.MM.yyyy HH:mm")}`}
            </DialogTitle>
            {selectedWithdraw && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Дата</div>
                  <div>{format(new Date(selectedWithdraw.created_at), "dd.MM.yyyy HH:mm")}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Филиал</div>
                  <div>{selectedWithdraw.terminals.name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Менеджер</div>
                  <div>{selectedWithdraw.managers.first_name} {selectedWithdraw.managers.last_name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Сумма выплаты</div>
                  <div className="font-semibold">{new Intl.NumberFormat("ru-RU").format(Number(selectedWithdraw.amount))}</div>
                </div>
              </div>
            )}
          </DialogHeader>
          <div className="sticky top-[72px] z-10 bg-background h-px bg-border my-4"></div>
          {isLoadingTransactions ? (
            <div className="py-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              <p className="mt-2 text-sm text-muted-foreground">Загрузка транзакций...</p>
            </div>
          ) : transactions.length > 0 ? (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Номер заказа</TableHead>
                    <TableHead>Дата зачисления в кошелёк</TableHead>
                    <TableHead>Дата заказа</TableHead>
                    <TableHead>Выплачено</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.transaction_id}>
                      <TableCell>{transaction.order_number}</TableCell>
                      <TableCell>
                        {format(new Date(transaction.transaction_created_at), "dd.MM.yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        {transaction.order_created_at ? 
                          format(new Date(transaction.order_created_at), "dd.MM.yyyy HH:mm") : 
                          "-"}
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("ru-RU").format(Number(transaction.withdraw_amount))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-4 text-center text-muted-foreground">
              Нет транзакций для этой выплаты
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Компонент транзакций пользователя
function UserTransactions({ userId }: { userId: string }) {
  const [startDate, setStartDate] = useState<Date>(dayjs().startOf('week').toDate());
  const [endDate, setEndDate] = useState<Date>(dayjs().endOf('week').toDate());
  const [status, setStatus] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const authHeaders = useGetAuthHeaders();

  // Форма добавления транзакции
  const transactionForm = useForm({
    resolver: zodResolver(
      z.object({
        amount: z.string().min(1, { message: "Сумма обязательна" }),
        terminal_id: z.string().min(1, { message: "Филиал обязателен" }),
        comment: z.string().min(1, { message: "Комментарий обязателен" }),
      })
    ),
    defaultValues: {
      amount: "",
      terminal_id: "",
      comment: "",
    },
  });

  // Запрос на получение списка терминалов
  const { data: terminals = [] } = useQuery({
    queryKey: ["terminals_cached"],
    queryFn: async () => {
      try {
        const { data } = await apiClient.api.terminals.cached.get({
          headers: authHeaders,
        });
        return data || [];
      } catch (error) {
        toast.error("Ошибка загрузки списка филиалов");
        return [];
      }
    },
    enabled: !!authHeaders.Authorization,
  });

  // Формируем фильтры для запроса транзакций
  const getTransactionsFilters = useCallback(() => {
    const filters = [
      {
        field: "created_at",
        operator: "gte",
        value: startDate.toISOString(),
      },
      {
        field: "created_at",
        operator: "lte",
        value: endDate.toISOString(),
      },
      {
        field: "courier_id",
        operator: "eq",
        value: userId,
      },
    ];
    
    if (status && status !== "all") {
      filters.push({
        field: "status",
        operator: "eq",
        value: status,
      });
    }
    
    return filters;
  }, [userId, startDate, endDate, status]);

  // Запрос на получение списка транзакций
  const { 
    data: transactions = [], 
    isLoading,
    refetch: refetchTransactions 
  } = useQuery({
    queryKey: ["user_transactions", userId, startDate.toISOString(), endDate.toISOString(), status],
    queryFn: async () => {
      try {
        const filters = getTransactionsFilters();
        
        // Пробуем загрузить транзакции через правильный эндпоинт
        const { data } = await apiClient.api.order_transactions.index.get({
          query: {
            filters: JSON.stringify(filters),
          },
          headers: authHeaders,
        });
        
        return data || [];
      } catch (error) {
        // В случае ошибки загружаем моковые данные
        // Это временное решение до исправления API
        console.error("Error loading transactions:", error);
        toast.error("Ошибка загрузки данных транзакций");

        // Mock data for development/testing
        return [
          {
            id: "1",
            created_at: new Date().toISOString(),
            transaction_type: "system",
            status: "success",
            order_id: "12345",
            order_number: "ORDER-12345",
            terminal_name: "Филиал 1",
            first_name: "Иван",
            last_name: "Петров",
            comment: "Оплата заказа",
            amount: "1500",
            not_paid_amount: "0",
            balance_before: "2000",
            balance_after: "3500"
          },
          {
            id: "2",
            created_at: dayjs().subtract(1, 'day').toISOString(),
            transaction_type: "manual",
            status: "pending",
            terminal_name: "Филиал 2",
            first_name: "Админ",
            last_name: "Системный",
            comment: "Ручное начисление",
            amount: "500",
            not_paid_amount: "500",
            balance_before: "3500",
            balance_after: "4000"
          }
        ];
      }
    },
    enabled: !!userId && !!authHeaders.Authorization,
  });

  // Мутация для добавления транзакции
  const addTransactionMutation = useMutation({
    mutationFn: async (values: any) => {
      try {
        return await apiClient.api.order_transactions.index.post({
          data: {
            amount: Number(values.amount),
            courier_id: userId,
            terminal_id: values.terminal_id,
            comment: values.comment,
          },
        }, {
          headers: authHeaders,
        });
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Транзакция успешно добавлена");
      setIsModalOpen(false);
      transactionForm.reset();
      refetchTransactions();
    },
    onError: () => {
      toast.error("Ошибка добавления транзакции");
    }
  });

  // Обработчик отправки формы
  const handleSubmit = (values: any) => {
    addTransactionMutation.mutate(values);
  };

  // Экспорт данных
  const exportData = async () => {
    toast.info("Функция экспорта в разработке");
  };

  // Обработчик выбора даты начала периода
  const handleStartDateSelect = (date: Date | undefined) => {
    if (date) {
      setStartDate(date);
    }
  };

  // Обработчик выбора даты конца периода
  const handleEndDateSelect = (date: Date | undefined) => {
    if (date) {
      setEndDate(date);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="startDate">Дата от</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal w-[180px]"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "dd.MM.yyyy") : "Выберите дату"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={handleStartDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="endDate">Дата до</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal w-[180px]"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "dd.MM.yyyy") : "Выберите дату"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={handleEndDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="status">Статус</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="success">Оплачено</SelectItem>
                <SelectItem value="pending">Не оплачено</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
          
          <Button size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : transactions && transactions.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">№</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Заказ</TableHead>
                <TableHead>Филиал</TableHead>
                <TableHead>Кто добавил</TableHead>
                <TableHead>Комментарий</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
                <TableHead className="text-right">Не оплачено</TableHead>
                <TableHead className="text-right">Кошелёк до</TableHead>
                <TableHead className="text-right">Кошелёк после</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction, index) => (
                <TableRow key={transaction.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{format(new Date(transaction.created_at), "dd.MM.yyyy HH:mm")}</TableCell>
                  <TableCell>{transaction.transaction_type}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={transaction.status === "success" ? "default" : "destructive"}
                    >
                      {transaction.status === "success" ? "Оплачено" : "Не оплачено"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {transaction.order_id ? (
                      <div className="flex items-center space-x-1">
                        <span>{transaction.order_number}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          asChild
                          className="h-6 w-6 p-0"
                        >
                          <Link href={`/dashboard/orders/${transaction.order_id}`} target="_blank">
                            <Eye className="h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{transaction.terminal_name || "—"}</TableCell>
                  <TableCell>
                    {transaction.first_name ? 
                      `${transaction.first_name} ${transaction.last_name}` : 
                      "Система"}
                  </TableCell>
                  <TableCell>{transaction.comment || "—"}</TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat("ru-RU").format(Number(transaction.amount))}
                  </TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat("ru-RU").format(Number(transaction.not_paid_amount))}
                  </TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat("ru-RU").format(Number(transaction.balance_before))}
                  </TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat("ru-RU").format(Number(transaction.balance_after))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Нет данных о транзакциях за выбранный период
        </div>
      )}
      
      {/* Диалог добавления транзакции */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Добавить транзакцию</DialogTitle>
          </DialogHeader>
          <Form {...transactionForm}>
            <form onSubmit={transactionForm.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={transactionForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Сумма</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        placeholder="Введите сумму"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={transactionForm.control}
                name="terminal_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Филиал</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите филиал" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {terminals.map((terminal) => (
                          <SelectItem key={terminal.id} value={terminal.id}>
                            {terminal.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={transactionForm.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Комментарий</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Введите комментарий"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" disabled={addTransactionMutation.isPending}>
                  {addTransactionMutation.isPending ? "Добавление..." : "Добавить"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function UserShow({ id }: UserShowProps) {
  const router = useRouter();
  const authHeaders = useGetAuthHeaders();

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["user", id],
    // @ts-ignore
    queryFn: async () => {
      try {
        const {data: response} = await apiClient.api.users({id}).get({
          query: {
            fields: [
              "id",
              "first_name",
              "last_name",
              "created_at",
              "drive_type",
              "car_model",
              "car_number",
              "card_name",
              "card_number",
              "phone",
              "latitude",
              "longitude",
              "status",
              "max_active_order_count",
              "doc_files",
              "order_start_date",
              "terminals.id",
              "terminals.name",
              "work_schedules.id",
              "work_schedules.name",
              "roles.id",
              "roles.name",
            ].join(","),
          },
          headers: authHeaders,
        });
        // @ts-ignore
        return response?.data;
      } catch (error) {
        toast.error("Ошибка загрузки данных пользователя");
        throw error;
      }
    },
    enabled: !!id && !!authHeaders,
  });

  if (isLoading) {
    return <UserSkeleton />;
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Пользователь не найден</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/users">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад к списку
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/users">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к списку
          </Link>
        </Button>
        
        <Button asChild>
          <Link href={`/dashboard/users/edit/?id=${id}`}>
            <Edit className="h-4 w-4 mr-2" />
            Редактировать
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          {/* @ts-ignore */}
          <CardTitle>{`${user.last_name} ${user.first_name}`}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="main">
            <TabsList>
              <TabsTrigger value="main">Основная информация</TabsTrigger>
              <TabsTrigger value="attendance">Посещаемость</TabsTrigger>
              <TabsTrigger value="payments">Выплаты</TabsTrigger>
              <TabsTrigger value="transactions">Начисления</TabsTrigger>
              <TabsTrigger value="efficiency">Эффективность</TabsTrigger>
            </TabsList>
            
            <TabsContent value="main" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Статус</h3>
                    <p className="mt-1">
                      {/* @ts-ignore */}
                      <Badge variant={user.status === "active" ? "default" : user.status === "blocked" ? "destructive" : "secondary"}>
                        {/* @ts-ignore */}
                        {userStatusMap[user.status] || user.status}
                      </Badge>
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Дата регистрации</h3>
                    {/* @ts-ignore */}
                    <p className="mt-1">{format(new Date(user.created_at), "dd.MM.yyyy HH:mm")}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Имя</h3>
                    {/* @ts-ignore */}
                    <p className="mt-1">{user.first_name}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Фамилия</h3>
                    {/* @ts-ignore */}
                    <p className="mt-1">{user.last_name}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Телефон</h3>
                    {/* @ts-ignore */}
                    <p className="mt-1">{user.phone}</p>
                  </div>
                  {/* @ts-ignore */}
                  {user.drive_type && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Тип доставки</h3>
                      {/* @ts-ignore */}
                      <p className="mt-1">{driveTypeMap[user.drive_type] || user.drive_type}</p>
                    </div>
                  )}
                  {/* @ts-ignore */}
                  {user.roles && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Роль</h3>
                      <p className="mt-1">
                        {/* @ts-ignore */}
                        <Badge variant="outline">{user.roles.name}</Badge>
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  {/* @ts-ignore */}
                  {user.terminals && user.terminals.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Филиалы</h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {/* @ts-ignore */}
                        {user.terminals.map(terminal => (
                          <Badge key={terminal.id} variant="outline">{terminal.name}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* @ts-ignore */}
                  {user.work_schedules && user.work_schedules.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Рабочие графики</h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {/* @ts-ignore */}
                        {user.work_schedules.map(schedule => (
                          <Badge key={schedule.id} variant="outline">{schedule.name}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* @ts-ignore */}
                  {user.daily_garant && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Дневной гарант</h3>
                      {/* @ts-ignore */}
                      <p className="mt-1">{user.daily_garant.name}</p>
                    </div>
                  )}
                  
                  {/* @ts-ignore */}
                  {user.car_model && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Модель автомобиля</h3>
                      {/* @ts-ignore */}
                      <p className="mt-1">{user.car_model}</p>
                    </div>
                  )}
                  
                  {/* @ts-ignore */}
                  {user.car_number && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Номер автомобиля</h3>
                      {/* @ts-ignore */}
                      <p className="mt-1">{user.car_number}</p>
                    </div>
                  )}
                  
                  {/* @ts-ignore */}
                  {user.card_name && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Имя владельца карты</h3>
                      {/* @ts-ignore */}
                      <p className="mt-1">{user.card_name}</p>
                    </div>
                  )}
                  {/* @ts-ignore */}
                  {user.card_number && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Номер карты</h3>
                      {/* @ts-ignore */}
                      <p className="mt-1">{user.card_number}</p>
                    </div>
                  )}
                  {/* @ts-ignore */}
                  {user.max_active_order_count !== undefined && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Максимальное количество активных заказов</h3>
                      {/* @ts-ignore */}
                      <p className="mt-1">{user.max_active_order_count}</p>
                    </div>
                  )}
                  {/* @ts-ignore */}
                  {user.order_start_date && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Дата начала работы</h3>
                      {/* @ts-ignore */}
                      <p className="mt-1">{format(new Date(user.order_start_date), "dd.MM.yyyy HH:mm")}</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="attendance" className="mt-4">
              <UserAttendance userId={id} />
            </TabsContent>
            
            <TabsContent value="payments" className="mt-4">
              <UserWithdrawals userId={id} />
            </TabsContent>
            
            <TabsContent value="transactions" className="mt-4">
              <UserTransactions userId={id} />
            </TabsContent>
            
            <TabsContent value="efficiency" className="mt-4">
              <div className="p-4 text-center text-muted-foreground">
                Разработка компонента эффективности в процессе...
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function UserSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/users">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к списку
          </Link>
        </Button>
        <Skeleton className="h-9 w-32" />
      </div>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/3" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-6 w-24" />
              </div>
              <div>
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-6 w-36" />
              </div>
              <div>
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-6 w-40" />
              </div>
              <div>
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-6 w-32" />
              </div>
              <div>
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-6 w-36" />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Skeleton className="h-4 w-20 mb-1" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
              <div>
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-6 w-40" />
              </div>
              <div>
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-6 w-36" />
              </div>
              <div>
                <Skeleton className="h-4 w-28 mb-1" />
                <Skeleton className="h-6 w-36" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 