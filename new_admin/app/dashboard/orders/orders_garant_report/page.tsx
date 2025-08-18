"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { apiClient } from "@/lib/eden-client";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ru } from "date-fns/locale";
import { FileDown, Loader2, CalendarIcon, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import MultipleSelector, { Option } from "@/components/ui/multiselect";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// Define the GarantReportItem interface
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
  delivery_price: number;
  bonus_total: number;
  earned: number;
  balance: number;
  terminal_name?: string;
  delivery_price_orgs?: Array<{
    id: string;
    name: string;
    children: Array<{
      terminal_id: string;
      terminal_name: string;
      delivery_price: number;
    }>;
  }>;
}

// Define interfaces for filter data
interface Terminal {
  id: string;
  name: string;
}

interface Organization {
  id: string;
  name: string;
  terminal_count: number;
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

// Format data for Excel export
const formatExcelData = (data: GarantReportItem[]) => {
  return data.map((item, index) => ({
    "№": index + 1,
    "Курьер": item.courier,
    "Сумма всех доставок": item.delivery_price,
    "Бонус": item.bonus_total,
    "Остаток для выплаты": item.balance_to_pay,
    "Количество заказов": item.orders_count,
    "Дата начала": format(new Date(item.begin_date), "dd.MM.yyyy", { locale: ru }),
    "Дата последнего заказа": format(new Date(item.last_order_date), "dd.MM.yyyy", { locale: ru }),
    "Дата создания": format(new Date(item.created_at), "dd.MM.yyyy", { locale: ru }),
    "Количество отработанных дней": item.order_dates_count,
  }));
};

export default function OrdersGarantReportPage() {
  // State for filters
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedTerminals, setSelectedTerminals] = useState<string[]>([]);
  const [selectedCouriers, setSelectedCouriers] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedDriveTypes, setSelectedDriveTypes] = useState<string[]>([]);
  const [walletPeriod, setWalletPeriod] = useState<Date | undefined>();

  // State for data and sorting
  const [reportData, setReportData] = useState<GarantReportItem[]>([]);
  const [filteredData, setFilteredData] = useState<GarantReportItem[]>([]);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Sorting state
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | undefined>();

  const tableRef = useRef<HTMLTableElement>(null);

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
          walletEndDate: walletPeriod?.toISOString(),
        },
      });

      if (response.data && Array.isArray(response.data)) {
        let data = response.data.map((item: any) => ({
          ...item,
          begin_date: typeof item.begin_date === 'string' ? item.begin_date : item.begin_date?.toISOString(),
          last_order_date: typeof item.last_order_date === 'string' ? item.last_order_date : item.last_order_date?.toISOString(),
          created_at: typeof item.created_at === 'string' ? item.created_at : item.created_at?.toISOString(),
        })) as GarantReportItem[];

        setReportData(data);

        // Apply client-side filters
        if (selectedStatus) {
          data = data.filter(item => item.status === selectedStatus);
        }
        if (selectedDriveTypes.length > 0) {
          data = data.filter(item => selectedDriveTypes.includes(item.drive_type));
        }

        setFilteredData(data);
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

  // Handle table sorting
  const handleSort = (field: string) => {
    if (field === sortField) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortDirection(undefined);
        setSortField(undefined);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Calculate organized data with sorting and grouping
  const organizedData = useMemo(() => {
    let data = [...filteredData];
    
    if (sortField && sortDirection) {
      // Apply sorting
      data = data.sort((a: any, b: any) => {
        const aVal = +a[sortField];
        const bVal = +b[sortField];
        
        if (sortDirection === "asc") {
          return aVal - bVal;
        } else {
          return bVal - aVal;
        }
      });
      
      return data;
    } else {
      // Group by terminal when no sorting is applied
      const grouped = data.reduce((acc: any, item) => {
        const terminal = item.terminal_name || 'Не указан';
        if (!acc[terminal]) {
          acc[terminal] = [];
        }
        acc[terminal].push(item);
        return acc;
      }, {});

      return Object.entries(grouped).map(([terminalName, items]: [string, any]) => ({
        name: terminalName,
        children: items,
        total_balance_to_pay: items.reduce((sum: number, item: any) => sum + item.balance_to_pay, 0),
      }));
    }
  }, [filteredData, sortField, sortDirection]);

  // Calculate dynamic organizations for table headers
  const organizations = useMemo((): Organization[] => {
    const orgsMap: { [key: string]: Organization } = {};
    
    filteredData.forEach((item) => {
      if (item.delivery_price_orgs) {
        item.delivery_price_orgs.forEach((org) => {
          if (!orgsMap[org.id]) {
            orgsMap[org.id] = {
              id: org.id,
              name: org.name,
              terminal_count: 0,
            };
          }

          const terminalCount = (org.children.length + 1) * 2;
          if (terminalCount > orgsMap[org.id].terminal_count && org.children.length < 5) {
            orgsMap[org.id].terminal_count = terminalCount;
          }
        });
      }
    });

    return Object.values(orgsMap);
  }, [filteredData]);

  const totalColspan = organizations.reduce((sum, org) => sum + org.terminal_count, 0);

  // Load data on component mount
  useEffect(() => {
    loadGarantData();
  }, []);

  // Terminal options for MultipleSelector
  const terminalOptions = useMemo((): Option[] => {
    return terminals.map(terminal => ({ value: terminal.id, label: terminal.name }));
  }, [terminals]);

  const selectedTerminalOptions = useMemo((): Option[] => {
    return selectedTerminals
      .map(id => terminals.find(t => t.id === id))
      .filter((terminal): terminal is Terminal => !!terminal)
      .map(terminal => ({ value: terminal.id, label: terminal.name }));
  }, [selectedTerminals, terminals]);

  const selectedDriveTypeOptions = useMemo((): Option[] => {
    return selectedDriveTypes
      .map(type => driveTypeOptions.find(option => option.value === type))
      .filter((option): option is Option => !!option);
  }, [selectedDriveTypes]);

  // Export to Excel function
  const exportToExcel = async () => {
    if (!tableRef.current) return;

    setIsExporting(true);
    try {
      // Clone the table and clean it up for export
      const clonedTable = tableRef.current.cloneNode(true) as HTMLTableElement;
      
      // Convert table to Excel
      const worksheet = XLSX.utils.table_to_sheet(clonedTable);
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

  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-2" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="w-4 h-4 ml-2" />;
    }
    if (sortDirection === "desc") {
      return <ArrowDown className="w-4 h-4 ml-2" />;
    }
    return <ArrowUpDown className="w-4 h-4 ml-2" />;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row items-center justify-between">
        <h1 className="text-2xl font-bold">Фин. гарант</h1>
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
                value={selectedTerminalOptions}
                onChange={(options) => setSelectedTerminals(options.map(opt => opt.value))}
                options={terminalOptions}
                placeholder="Выберите терминалы"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Курьер</Label>
              <MultipleSelector
                value={[]} // We'll need to implement this properly with selected couriers
                onChange={() => {}} // Implement courier selection
                onSearch={fetchCouriers}
                placeholder="Поиск курьера..."
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
            <div className="overflow-x-auto">
              <table
                ref={tableRef}
                className="w-full text-left border-collapse border border-gray-300"
              >
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-3 border border-gray-300">#</th>
                    <th className="px-2 py-3 border border-gray-300">Курьер</th>
                    <th 
                      className="px-2 py-3 border border-gray-300 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("delivery_price")}
                    >
                      <div className="flex items-center">
                        Сумма всех доставок
                        {renderSortIcon("delivery_price")}
                      </div>
                    </th>
                    <th className="px-2 py-3 border border-gray-300">Бонус</th>
                    <th 
                      className="px-2 py-3 border border-gray-300 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("balance_to_pay")}
                    >
                      <div className="flex items-center">
                        Остаток для выплаты
                        {renderSortIcon("balance_to_pay")}
                      </div>
                    </th>
                    <th className="px-2 py-3 border border-gray-300">Кол-во заказов</th>
                    <th className="px-2 py-3 border border-gray-300">Дата начала</th>
                    <th className="px-2 py-3 border border-gray-300">Дата последнего заказа</th>
                    <th className="px-2 py-3 border border-gray-300">Дата создания</th>
                    <th className="px-2 py-3 border border-gray-300">Кол-во отработанных дней</th>
                    {organizations.map((org) => (
                      <th
                        key={org.id}
                        className="px-2 py-3 border border-gray-300"
                        colSpan={org.terminal_count}
                      >
                        {org.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={10 + totalColspan} className="px-2 py-8 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        <p className="mt-2">Загрузка данных...</p>
                      </td>
                    </tr>
                  ) : sortField && sortDirection ? (
                    // Render sorted data
                    (organizedData as GarantReportItem[]).map((item, index) => (
                      <tr key={item.courier_id} className="hover:bg-gray-50">
                        <td className="px-2 py-2 border border-gray-300">{index + 1}</td>
                        <td className="px-2 py-2 border border-gray-300">{item.courier}</td>
                        <td className="px-2 py-2 border border-gray-300">
                          {new Intl.NumberFormat("ru-RU").format(item.delivery_price)}
                        </td>
                        <td className="px-2 py-2 border border-gray-300">
                          {new Intl.NumberFormat("ru-RU").format(item.bonus_total)}
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-right">
                          {new Intl.NumberFormat("ru-RU").format(item.balance_to_pay)}
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-right">{item.orders_count}</td>
                        <td className="px-2 py-2 border border-gray-300">
                          {format(new Date(item.begin_date), "dd.MM.yyyy", { locale: ru })}
                        </td>
                        <td className="px-2 py-2 border border-gray-300">
                          {format(new Date(item.last_order_date), "dd.MM.yyyy", { locale: ru })}
                        </td>
                        <td className="px-2 py-2 border border-gray-300">
                          {format(new Date(item.created_at), "dd.MM.yyyy", { locale: ru })}
                        </td>
                        <td className="px-2 py-2 border border-gray-300">{item.order_dates_count}</td>
                        {/* Organization columns */}
                        {organizations.map((org) => {
                          const orgData = item.delivery_price_orgs?.find(o => o.id === org.id);
                          if (!orgData) {
                            return Array(org.terminal_count).fill(0).map((_, i) => (
                              <td key={`${item.courier_id}_${org.id}_${i}`} className="px-2 py-2 border border-gray-300"></td>
                            ));
                          }
                          
                          const cells: JSX.Element[] = [];
                          orgData.children.forEach((child, i) => {
                            if (i < 5) {
                              cells.push(
                                <td key={`${item.courier_id}_${child.terminal_id}_name`} className="px-2 py-2 border border-gray-300 text-right">
                                  {child.terminal_name}
                                </td>
                              );
                              cells.push(
                                <td key={`${item.courier_id}_${child.terminal_id}_price`} className="px-2 py-2 border border-gray-300 text-right">
                                  {new Intl.NumberFormat("ru-RU").format(child.delivery_price)}
                                </td>
                              );
                            }
                          });
                          
                          // Fill remaining cells if needed
                          while (cells.length < org.terminal_count) {
                            cells.push(
                              <td key={`${item.courier_id}_${org.id}_empty_${cells.length}`} className="px-2 py-2 border border-gray-300"></td>
                            );
                          }
                          
                          return cells;
                        })}
                      </tr>
                    ))
                  ) : (
                    // Render grouped data by terminals
                    (organizedData as any[]).map((group) => (
                      <React.Fragment key={group.name}>
                        <tr className="bg-gray-100">
                          <th
                            colSpan={10 + totalColspan}
                            className="px-2 py-2 border border-gray-300 text-left font-semibold"
                          >
                            {group.name}
                          </th>
                        </tr>
                        {group.children.map((item: GarantReportItem, index: number) => (
                          <tr key={item.courier_id} className="hover:bg-gray-50">
                            <td className="px-2 py-2 border border-gray-300">{index + 1}</td>
                            <td className="px-2 py-2 border border-gray-300">{item.courier}</td>
                            <td className="px-2 py-2 border border-gray-300">
                              {new Intl.NumberFormat("ru-RU").format(item.delivery_price)}
                            </td>
                            <td className="px-2 py-2 border border-gray-300">
                              {new Intl.NumberFormat("ru-RU").format(item.bonus_total)}
                            </td>
                            <td className="px-2 py-2 border border-gray-300 text-right">
                              {new Intl.NumberFormat("ru-RU").format(item.balance_to_pay)}
                            </td>
                            <td className="px-2 py-2 border border-gray-300 text-right">{item.orders_count}</td>
                            <td className="px-2 py-2 border border-gray-300">
                              {format(new Date(item.begin_date), "dd.MM.yyyy", { locale: ru })}
                            </td>
                            <td className="px-2 py-2 border border-gray-300">
                              {format(new Date(item.last_order_date), "dd.MM.yyyy", { locale: ru })}
                            </td>
                            <td className="px-2 py-2 border border-gray-300">
                              {format(new Date(item.created_at), "dd.MM.yyyy", { locale: ru })}
                            </td>
                            <td className="px-2 py-2 border border-gray-300">{item.order_dates_count}</td>
                            {/* Organization columns - same logic as above */}
                            {organizations.map((org) => {
                              const orgData = item.delivery_price_orgs?.find(o => o.id === org.id);
                              if (!orgData) {
                                return Array(org.terminal_count).fill(0).map((_, i) => (
                                  <td key={`${item.courier_id}_${org.id}_${i}`} className="px-2 py-2 border border-gray-300"></td>
                                ));
                              }
                              
                              const cells: JSX.Element[] = [];
                              orgData.children.forEach((child, i) => {
                                if (i < 5) {
                                  cells.push(
                                    <td key={`${item.courier_id}_${child.terminal_id}_name`} className="px-2 py-2 border border-gray-300 text-right">
                                      {child.terminal_name}
                                    </td>
                                  );
                                  cells.push(
                                    <td key={`${item.courier_id}_${child.terminal_id}_price`} className="px-2 py-2 border border-gray-300 text-right">
                                      {new Intl.NumberFormat("ru-RU").format(child.delivery_price)}
                                    </td>
                                  );
                                }
                              });
                              
                              while (cells.length < org.terminal_count) {
                                cells.push(
                                  <td key={`${item.courier_id}_${org.id}_empty_${cells.length}`} className="px-2 py-2 border border-gray-300"></td>
                                );
                              }
                              
                              return cells;
                            })}
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-semibold">
                          <td colSpan={2} className="px-2 py-2 border border-gray-300 text-right">
                            Итого
                          </td>
                          <td colSpan={3} className="px-2 py-2 border border-gray-300 text-right">
                            {new Intl.NumberFormat("ru-RU").format(group.total_balance_to_pay)}
                          </td>
                          <td colSpan={5 + totalColspan} className="px-2 py-2 border border-gray-300"></td>
                        </tr>
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}