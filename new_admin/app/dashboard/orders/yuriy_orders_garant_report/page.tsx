"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { apiClient } from "@/lib/eden-client";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ru } from "date-fns/locale";
import { FileDown, Loader2, CalendarIcon, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import MultipleSelector, { Option } from "@/components/ui/multiselect";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// Define the GarantReportItem interface based on the old implementation
interface GarantReportItem {
  courier_id: string;
  courier: string;
  drive_type: string;
  status: string;
  balance_to_pay: number;
  orders_count: number;
  begin_date: string;
  last_order_date: string;
  created_at: string;
  order_dates_count: number;
  formatted_avg_delivery_time: string;
  garant_days: number;
  possible_day_offs: number;
  actual_day_offs: number;
  delivery_price: number;
  bonus_total: number;
  earned: number;
  balance: number;
  garant_price: number;
  possible_garant_price: number;
  terminal_name?: string;
}

// Define interfaces for filter data
interface Terminal {
  id: string;
  name: string;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
}

// Drive type options
const driveTypeOptions = [
  { value: "car", label: "Автомобиль" },
  { value: "bycicle", label: "Велосипед" },
  { value: "bike", label: "Мотоцикл" },
  { value: "foot", label: "Пешком" },
];

// Status options
const statusOptions = [
  { value: "active", label: "Активный" },
  { value: "inactive", label: "Неактивный" },
  { value: "blocked", label: "Заблокирован" },
];

// Define columns for the guarantee report table
const columns: ColumnDef<GarantReportItem>[] = [
  {
    id: "index",
    header: "№",
    cell: ({ row, table }) => {
      const pageIndex = table.getState().pagination.pageIndex;
      const pageSize = table.getState().pagination.pageSize;
      return <div>{pageIndex * pageSize + row.index + 1}</div>;
    },
    size: 50,
  },
  {
    accessorKey: "courier",
    header: "Курьер",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span>{row.getValue("courier")}</span>
        <Badge variant="outline" className="text-xs">
          {row.original.drive_type}
        </Badge>
      </div>
    ),
    size: 150,
  },
  {
    accessorKey: "balance_to_pay",
    header: "Остаток для выплаты",
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {new Intl.NumberFormat("ru-RU").format(row.getValue("balance_to_pay"))}
      </div>
    ),
    size: 120,
  },
  {
    accessorKey: "orders_count",
    header: "Количество заказов",
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("orders_count")}</div>
    ),
    size: 100,
  },
  {
    accessorKey: "begin_date",
    header: "Дата начала",
    cell: ({ row }) => (
      <div>{format(new Date(row.getValue("begin_date")), "dd.MM.yyyy", { locale: ru })}</div>
    ),
    size: 100,
  },
  {
    accessorKey: "last_order_date",
    header: "Дата последнего заказа",
    cell: ({ row }) => (
      <div>{format(new Date(row.getValue("last_order_date")), "dd.MM.yyyy", { locale: ru })}</div>
    ),
    size: 120,
  },
  {
    accessorKey: "created_at",
    header: "Дата создания",
    cell: ({ row }) => (
      <div>{format(new Date(row.getValue("created_at")), "dd.MM.yyyy", { locale: ru })}</div>
    ),
    size: 100,
  },
  {
    accessorKey: "order_dates_count",
    header: "Количество отработанных дней",
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("order_dates_count")}</div>
    ),
    size: 120,
  },
  {
    accessorKey: "formatted_avg_delivery_time",
    header: "Среднее время доставки",
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("formatted_avg_delivery_time")}</div>
    ),
    size: 120,
  },
  {
    accessorKey: "garant_days",
    header: "Количество гарантных дней",
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("garant_days")}</div>
    ),
    size: 120,
  },
  {
    accessorKey: "possible_day_offs",
    header: "Возможные дни отгула",
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("possible_day_offs")}</div>
    ),
    size: 120,
  },
  {
    accessorKey: "actual_day_offs",
    header: "Дни без заказа",
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("actual_day_offs")}</div>
    ),
    size: 100,
  },
  {
    accessorKey: "delivery_price",
    header: "Сумма всех доставок",
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {new Intl.NumberFormat("ru-RU").format(row.getValue("delivery_price"))}
      </div>
    ),
    size: 120,
  },
  {
    accessorKey: "bonus_total",
    header: "Сумма бонусов",
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {new Intl.NumberFormat("ru-RU").format(row.getValue("bonus_total"))}
      </div>
    ),
    size: 100,
  },
  {
    accessorKey: "earned",
    header: "Получил",
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {new Intl.NumberFormat("ru-RU").format(row.getValue("earned"))}
      </div>
    ),
    size: 100,
  },
  {
    accessorKey: "balance",
    header: "Кошелёк",
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {new Intl.NumberFormat("ru-RU").format(row.getValue("balance"))}
      </div>
    ),
    size: 100,
  },
  {
    accessorKey: "garant_price",
    header: "Стоимость гаранта",
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {new Intl.NumberFormat("ru-RU").format(row.getValue("garant_price"))}
      </div>
    ),
    size: 120,
  },
  {
    accessorKey: "possible_garant_price",
    header: "Упущенный гарант",
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {new Intl.NumberFormat("ru-RU").format(row.getValue("possible_garant_price"))}
      </div>
    ),
    size: 120,
  },
];

// Format data for Excel export
const formatExcelData = (data: GarantReportItem[]) => {
  return data.map(item => ({
    "№": data.indexOf(item) + 1,
    "Курьер": item.courier,
    "Тип доставки": item.drive_type,
    "Остаток для выплаты": item.balance_to_pay,
    "Количество заказов": item.orders_count,
    "Дата начала": format(new Date(item.begin_date), "dd.MM.yyyy", { locale: ru }),
    "Дата последнего заказа": format(new Date(item.last_order_date), "dd.MM.yyyy", { locale: ru }),
    "Дата создания": format(new Date(item.created_at), "dd.MM.yyyy", { locale: ru }),
    "Количество отработанных дней": item.order_dates_count,
    "Среднее время доставки": item.formatted_avg_delivery_time,
    "Количество гарантных дней": item.garant_days,
    "Возможные дни отгула": item.possible_day_offs,
    "Дни без заказа": item.actual_day_offs,
    "Сумма всех доставок": item.delivery_price,
    "Сумма бонусов": item.bonus_total,
    "Получил": item.earned,
    "Кошелёк": item.balance,
    "Стоимость гаранта": item.garant_price,
    "Упущенный гарант": item.possible_garant_price,
  }));
};

export default function YuriyOrdersGarantReportPage() {
  // State for filters
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedTerminal, setSelectedTerminal] = useState<string>("all");
  const [selectedCourier, setSelectedCourier] = useState<Option | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedDriveTypes, setSelectedDriveTypes] = useState<string[]>([]);
  const [walletPeriod, setWalletPeriod] = useState<Date | undefined>();

  // State for data
  const [reportData, setReportData] = useState<GarantReportItem[]>([]);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });

  // Sorting state - по умолчанию сортировка по "Остаток для выплаты" по убыванию
  const [sortField, setSortField] = useState<string>("balance_to_pay");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Load terminals data
  useEffect(() => {
    const fetchTerminals = async () => {
      try {
        const response = await apiClient.api.terminals.cached.get();
        if (response.data && Array.isArray(response.data)) {
          setTerminals(response.data);
        }
      } catch (error) {
        toast.error("Ошибка загрузки терминалов");
      }
    };
    fetchTerminals();
  }, []);

  // Function to fetch couriers for search
  const fetchCouriers = useCallback(async (search: string): Promise<Option[]> => {
    try {
      const response = await apiClient.api.couriers.search.get({
        query: { search },
      });
      const usersData = response.data || [];
      return usersData.map((user: any) => ({
        value: user.id,
        label: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      }));
    } catch (error) {
      console.error("Failed to fetch couriers:", error);
      toast.error("Ошибка поиска курьеров");
      return [];
    }
  }, []);

  // Function to load guarantee report data
  const loadGarantData = async () => {
    setIsLoading(true);
    try {
      // Calculate start and end of the selected month
      const startDate = startOfMonth(selectedMonth).toISOString();
      const endOfMonthDate = endOfMonth(selectedMonth);
      endOfMonthDate.setHours(23, 59, 59, 999);
      const endDate = endOfMonthDate.toISOString();

      const response = await apiClient.api.orders.calculate_garant.post({
        data: {
          startDate,
          endDate,
        },
      });

      if (response.data && Array.isArray(response.data)) {
        let filteredData = response.data.map((item: any) => ({
          ...item,
          begin_date: typeof item.begin_date === 'string' ? item.begin_date : item.begin_date?.toISOString(),
          last_order_date: typeof item.last_order_date === 'string' ? item.last_order_date : item.last_order_date?.toISOString(),
          created_at: typeof item.created_at === 'string' ? item.created_at : item.created_at?.toISOString(),
        })) as GarantReportItem[];

        // Apply client-side filters
        if (selectedStatus) {
          filteredData = filteredData.filter(item => item.status === selectedStatus);
        }
        if (selectedDriveTypes.length > 0) {
          filteredData = filteredData.filter(item => selectedDriveTypes.includes(item.drive_type));
        }

        setReportData(filteredData);
      }
    } catch (error) {
      console.error("Error loading garant data:", error);
      toast.error("Ошибка загрузки данных гаранта");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle filter button click
  const handleFilter = () => {
    loadGarantData();
  };

  // Load data on component mount
  useEffect(() => {
    loadGarantData();
  }, []);

  // Terminal options for MultipleSelector
  const terminalOptions = useMemo((): Option[] => {
    const options = terminals.map(terminal => ({ value: terminal.id, label: terminal.name }));
    return [{ value: "all", label: "Все терминалы" }, ...options];
  }, [terminals]);

  const selectedTerminalOption = useMemo((): Option[] => {
    if (selectedTerminal === "all") return [];
    const terminal = terminals.find(t => t.id === selectedTerminal);
    return terminal ? [{ value: terminal.id, label: terminal.name }] : [];
  }, [selectedTerminal, terminals]);

  const selectedDriveTypeOptions = useMemo((): Option[] => {
    return selectedDriveTypes
      .map(type => driveTypeOptions.find(option => option.value === type))
      .filter((option): option is Option => !!option);
  }, [selectedDriveTypes]);

  // Get sorted data
  const sortedData = useMemo(() => {
    if (sortField) {
      const sorted = [...reportData].sort((a, b) => {
        const aValue = a[sortField as keyof GarantReportItem] as number;
        const bValue = b[sortField as keyof GarantReportItem] as number;
        
        if (sortDirection === "desc") {
          return bValue - aValue;
        } else {
          return aValue - bValue;
        }
      });
      return sorted;
    }
    return reportData;
  }, [reportData, sortField, sortDirection]);

  // Handle sort toggle
  const handleSort = () => {
    if (sortField === "balance_to_pay") {
      setSortField("");
      setSortDirection("desc");
    } else {
      setSortField("balance_to_pay");
      setSortDirection("desc");
    }
  };

  // Export to Excel function
  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const worksheet = XLSX.utils.json_to_sheet(formatExcelData(reportData));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Гарант отчет");
      
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const data = new Blob([excelBuffer], { type: "application/octet-stream" });
      
      const fileName = `Гарант_отчет_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      saveAs(data, fileName);
      
      toast.success("Экспорт выполнен успешно");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Ошибка экспорта");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row items-center justify-between">
        <h1 className="text-2xl font-bold">Гарант</h1>
        <Button 
          onClick={exportToExcel} 
          disabled={isExporting}
          className="gap-2"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          {isExporting ? "Экспорт..." : "Экспорт в Excel"}
        </Button>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Месяц</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedMonth && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedMonth ? format(selectedMonth, "MMMM yyyy", { locale: ru }) : "Выберите месяц"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Год</Label>
                        <Select
                          value={selectedMonth.getFullYear().toString()}
                          onValueChange={(year) => {
                            const newDate = new Date(selectedMonth);
                            newDate.setFullYear(parseInt(year));
                            setSelectedMonth(startOfMonth(newDate));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 11 }, (_, i) => 2020 + i).map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Месяц</Label>
                        <Select
                          value={selectedMonth.getMonth().toString()}
                          onValueChange={(month) => {
                            const newDate = new Date(selectedMonth);
                            newDate.setMonth(parseInt(month));
                            setSelectedMonth(startOfMonth(newDate));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {format(new Date(2025, i, 1), "MMMM", { locale: ru })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Филиал</Label>
              <MultipleSelector
                value={selectedTerminalOption}
                onChange={(options) => setSelectedTerminal(options[0]?.value ?? "all")}
                options={terminalOptions}
                placeholder="Выберите терминал"
                maxSelected={1}
                hidePlaceholderWhenSelected
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Курьер</Label>
              <MultipleSelector
                value={selectedCourier ? [selectedCourier] : []}
                onChange={(options) => setSelectedCourier(options[0] ?? null)}
                onSearch={fetchCouriers}
                placeholder="Поиск курьера..."
                maxSelected={1}
                hidePlaceholderWhenSelected
                className="w-full"
                triggerSearchOnFocus
                delay={300}
              />
            </div>

            <div className="space-y-2">
              <Label>Статус</Label>
              <MultipleSelector
                value={selectedStatus ? [{ value: selectedStatus, label: statusOptions.find(s => s.value === selectedStatus)?.label || selectedStatus }] : []}
                onChange={(options) => setSelectedStatus(options[0]?.value ?? "")}
                options={statusOptions}
                placeholder="Выберите статус"
                maxSelected={1}
                hidePlaceholderWhenSelected
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Тип доставки</Label>
              <MultipleSelector
                value={selectedDriveTypeOptions}
                onChange={(options) => setSelectedDriveTypes(options.map(opt => opt.value))}
                options={driveTypeOptions}
                placeholder="Выберите типы доставки"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Период кошелька</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !walletPeriod && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {walletPeriod ? format(walletPeriod, "dd.MM.yyyy", { locale: ru }) : "Выберите дату"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={walletPeriod}
                    onSelect={(date) => setWalletPeriod(date)}
                    defaultMonth={walletPeriod}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button onClick={handleFilter} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Фильтровать
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="p-6">
            <div className="mb-4">
              <Button 
                onClick={handleSort}
                variant={sortField === "balance_to_pay" ? "default" : "outline"}
                className="gap-2"
              >
                {sortField === "balance_to_pay" ? (
                  <ArrowDown className="h-4 w-4" />
                ) : (
                  <ArrowUpDown className="h-4 w-4" />
                )}
                {sortField === "balance_to_pay" 
                  ? "Отсортировано по убыванию ✓" 
                  : "Сортировать по «Остаток для выплаты»"}
              </Button>
            </div>
            <DataTable
              columns={columns}
              data={sortedData}
              loading={isLoading}
              pageCount={Math.ceil(sortedData.length / pagination.pageSize)}
              pagination={pagination}
              onPaginationChange={setPagination}
              pageSizeOptions={[20, 50, 100, 200]}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}