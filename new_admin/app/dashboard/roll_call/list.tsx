"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  CalendarIcon,
  RefreshCw,
  PhoneIcon,
  Calculator,
  Users,
  Wifi,
  WifiOff,
  Clock,
} from "lucide-react";

import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { PageTitle } from "@/components/page-title";
import { Skeleton } from "../../../components/ui/skeleton";
import { apiClient } from "../../../lib/eden-client";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from "../../../components/ui/form";
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
import { Badge } from "../../../components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "../../../components/ui/tooltip";
import { cn } from "../../../lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

interface RollCallItem {
  id: string;
  name: string;
  couriers: Courier[];
}

interface Courier {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_online: boolean;
  is_late?: boolean;
  created_at?: string;
  app_version?: string;
  drive_type?: string;
  daily_garant_id?: string;
  work_schedule?: string | null;
}

interface Terminal {
  id: string;
  name: string;
  region: string;
}

const filterSchema = z.object({
  date: z.date(),
  region: z.string().optional(),
});

type FilterValues = z.infer<typeof filterSchema>;

const driveTypeIcons: Record<string, string> = {
  car: "🚗",
  bike: "🚴",
  bycicle: "🚲",
  foot: "🚶",
};

function DailyGarantButton({
  day,
  user_id,
  onSuccess,
}: {
  day: Date;
  user_id: string;
  onSuccess?: () => void;
}) {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const setDailyGarant = async () => {
    setIsLoading(true);
    try {
      await apiClient.api.couriers.try_set_daily_garant.post({
        day: day.toISOString(),
        courier_id: user_id,
      });
      toast.success("Дневная гарантия установлена");
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error("Ошибка при установке дневной гарантии");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-primary"
      disabled={isLoading}
      onClick={setDailyGarant}
      title="Установить дневную гарантию"
    >
      <Calculator className="h-3.5 w-3.5" />
    </Button>
  );
}

function CourierRow({
  courier,
  date,
  onRefetch,
}: {
  courier: Courier;
  date: Date;
  onRefetch?: () => void;
}) {
  const checkedInToday = !!courier.created_at;
  const timeStr = checkedInToday
    ? format(new Date(courier.created_at!), "HH:mm")
    : null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
        courier.is_online
          ? "bg-green-50 dark:bg-green-950/20"
          : "bg-muted/30"
      )}
    >
      {/* Status dot */}
      <div
        className={cn(
          "h-2.5 w-2.5 rounded-full shrink-0",
          courier.is_online
            ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]"
            : "bg-gray-300 dark:bg-gray-600"
        )}
      />

      {/* Name + drive type + schedule */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                "text-sm truncate cursor-default",
                courier.is_online ? "font-medium" : "text-muted-foreground"
              )}
            >
              {courier.first_name} {courier.last_name}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {courier.first_name} {courier.last_name}
          </TooltipContent>
        </Tooltip>
        {courier.drive_type && (
          <span className="text-sm shrink-0" title={courier.drive_type}>
            {driveTypeIcons[courier.drive_type] || "❓"}
          </span>
        )}
        {courier.work_schedule && (
          <span className="text-[11px] text-muted-foreground/70 shrink-0">
            ({courier.work_schedule})
          </span>
        )}
      </div>

      {/* Check-in time / status */}
      <div className="flex items-center gap-1.5 shrink-0">
        {checkedInToday ? (
          <span
            className={cn(
              "text-xs font-mono font-semibold px-2 py-0.5 rounded",
              courier.is_late
                ? "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                : "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400"
            )}
          >
            {timeStr}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/60 px-2">
            {courier.is_online ? "не сегодня" : "не в сети"}
          </span>
        )}

        {/* Actions */}
        {courier.phone && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-blue-600"
            onClick={() => {
              window.location.href = `tel:${courier.phone!.replace("+998", "")}`;
            }}
            title={courier.phone}
          >
            <PhoneIcon className="h-3.5 w-3.5" />
          </Button>
        )}
        {courier.daily_garant_id && (
          <DailyGarantButton
            day={date}
            user_id={courier.id}
            onSuccess={onRefetch}
          />
        )}
      </div>
    </div>
  );
}

function TerminalCard({
  terminal,
  date,
  onRefetch,
}: {
  terminal: RollCallItem;
  date: Date;
  onRefetch?: () => void;
}) {
  const onlineCount = terminal.couriers.filter((c) => c.is_online).length;
  const totalCount = terminal.couriers.length;
  const onlinePercent = totalCount > 0 ? (onlineCount / totalCount) * 100 : 0;

  // Sort: online first, then by check-in time (earliest first), then offline
  const sortedCouriers = useMemo(() => {
    return [...terminal.couriers].sort((a, b) => {
      if (a.is_online !== b.is_online) return a.is_online ? -1 : 1;
      if (a.created_at && b.created_at) {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (a.created_at) return -1;
      if (b.created_at) return 1;
      return 0;
    });
  }, [terminal.couriers]);

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="px-4 py-3 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold leading-tight">
              {terminal.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              <span className="text-green-600 font-medium">{onlineCount}</span>
              {" / "}
              {totalCount} курьеров
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-1">
        <div className="space-y-1.5">
          {sortedCouriers.map((courier) => (
            <CourierRow
              key={courier.id}
              courier={courier}
              date={date}
              onRefetch={onRefetch}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Mock data for UI preview
const MOCK_DATA: RollCallItem[] = [
  {
    id: "t1",
    name: "40 Chopar Pizza",
    couriers: [
      { id: "c1", first_name: "Азиз", last_name: "Каримов", phone: "+998901234567", is_online: true, created_at: new Date().toISOString(), drive_type: "car", daily_garant_id: "dg1", work_schedule: "10:00-22:00" },
      { id: "c2", first_name: "Бобур", last_name: "Рахимов", phone: "+998901234568", is_online: true, created_at: new Date(Date.now() - 3600000).toISOString(), drive_type: "bike", work_schedule: "10:00-22:00" },
      { id: "c3", first_name: "Санжар", last_name: "Юсупов", phone: "+998901234569", is_online: false, drive_type: "foot", work_schedule: "15:00-03:00" },
      { id: "c4", first_name: "Дилшод", last_name: "Алиев", phone: "+998901234570", is_online: true, is_late: true, created_at: new Date(Date.now() - 1800000).toISOString(), drive_type: "car", work_schedule: "10:00-22:00" },
    ],
  },
  {
    id: "t2",
    name: "40 Les Ailes",
    couriers: [
      { id: "c5", first_name: "Жасур", last_name: "Тошматов", phone: "+998901234571", is_online: true, created_at: new Date(Date.now() - 900000).toISOString(), drive_type: "bike", work_schedule: "10:00-22:00" },
      { id: "c6", first_name: "Шерзод", last_name: "Бекназаров", phone: "+998901234572", is_online: false, drive_type: "car", work_schedule: "15:00-03:00" },
      { id: "c7", first_name: "Нодир", last_name: "Курьер", phone: "+998901234573", is_online: false, work_schedule: "10:00-22:00" },
    ],
  },
  {
    id: "t3",
    name: "Alpomish Les Ailes",
    couriers: [
      { id: "c8", first_name: "Отабек", last_name: "Мирзаев", phone: "+998901234574", is_online: true, created_at: new Date(Date.now() - 600000).toISOString(), drive_type: "car", work_schedule: "10:00-22:00" },
      { id: "c9", first_name: "Фаррух", last_name: "Садиков", phone: "+998901234575", is_online: true, created_at: new Date(Date.now() - 2400000).toISOString(), drive_type: "bike", work_schedule: "15:00-03:00" },
      { id: "c10", first_name: "Ислом", last_name: "Набиев", phone: "+998901234576", is_online: true, is_late: false, created_at: new Date(Date.now() - 300000).toISOString(), drive_type: "foot", work_schedule: "10:00-22:00" },
      { id: "c11", first_name: "Рустам", last_name: "Холматов", phone: "+998901234577", is_online: false, drive_type: "car", work_schedule: "10:00-22:00" },
      { id: "c12", first_name: "Улугбек", last_name: "Сафаров", phone: "+998901234578", is_online: true, created_at: new Date(Date.now() - 1200000).toISOString(), drive_type: "bycicle", work_schedule: "10:00-22:00, 15:00-03:00" },
    ],
  },
  {
    id: "t4",
    name: "Atlas",
    couriers: [
      { id: "c13", first_name: "Акбар", last_name: "Юлдашев", phone: "+998901234579", is_online: true, created_at: new Date(Date.now() - 7200000).toISOString(), drive_type: "car", daily_garant_id: "dg2", work_schedule: "10:00-22:00" },
      { id: "c14", first_name: "Бахром", last_name: "Исмоилов", phone: "+998901234580", is_online: false, drive_type: "bike", work_schedule: "15:00-03:00" },
    ],
  },
  {
    id: "t5",
    name: "Azia Chopar",
    couriers: [
      { id: "c15", first_name: "Мухаммад", last_name: "Расулов", phone: "+998901234581", is_online: true, created_at: new Date(Date.now() - 500000).toISOString(), drive_type: "car", work_schedule: "10:00-22:00" },
      { id: "c16", first_name: "Абдулла", last_name: "Маматов", phone: "+998901234582", is_online: true, created_at: new Date(Date.now() - 4500000).toISOString(), drive_type: "foot", work_schedule: "15:00-03:00" },
      { id: "c17", first_name: "Хусан", last_name: "Тургунов", phone: "+998901234583", is_online: false, work_schedule: "10:00-22:00" },
      { id: "c18", first_name: "Сардор", last_name: "Достонов", phone: "+998901234584", is_online: true, is_late: true, created_at: new Date(Date.now() - 200000).toISOString(), drive_type: "bike", work_schedule: "10:00-22:00" },
      { id: "c19", first_name: "Лазиз", last_name: "Камолов", phone: "+998901234585", is_online: false, drive_type: "car", work_schedule: "15:00-03:00" },
    ],
  },
  {
    id: "t6",
    name: "Azia Les Ailes",
    couriers: [
      { id: "c20", first_name: "Тимур", last_name: "Ашуров", phone: "+998901234586", is_online: true, created_at: new Date(Date.now() - 1500000).toISOString(), drive_type: "car", work_schedule: "10:00-22:00" },
      { id: "c21", first_name: "Комил", last_name: "Нурматов", phone: "+998901234587", is_online: true, created_at: new Date(Date.now() - 3000000).toISOString(), drive_type: "bike", work_schedule: "15:00-03:00" },
      { id: "c22", first_name: "Элдор", last_name: "Хамидов", phone: "+998901234588", is_online: false, drive_type: "foot", work_schedule: "10:00-22:00" },
    ],
  },
];

const USE_MOCK = false; // Toggle to true to preview UI with mock data

export default function RollCallList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const queryClient = useQueryClient();

  const form = useForm<FilterValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      date: new Date(),
      region: "capital",
    },
  });

  // Fetch terminals for region mapping
  const { data: terminalsData } = useQuery({
    queryKey: ["terminals-cached"],
    queryFn: async () => {
      const { data } = await apiClient.api.terminals.cached.get();
      return (data as Terminal[]) || [];
    },
  });

  const filterValues = form.watch();

  const {
    data = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["roll-call", filterValues.date, searchQuery],
    queryFn: async () => {
      if (USE_MOCK) return MOCK_DATA;
      try {
        const { data: rollCallList } =
          await apiClient.api.couriers.roll_coll.get({
            query: {
              date: filterValues.date.toISOString(),
            },
          });

        if (rollCallList && Array.isArray(rollCallList)) {
          return rollCallList as RollCallItem[];
        }
        return [];
      } catch (error) {
        toast.error("Ошибка загрузки данных переклички");
        return [];
      }
    },
  });

  const terminalRegionMap = useMemo(() => {
    const map = new Map<string, string>();
    (terminalsData || []).forEach((t) => map.set(t.id, t.region));
    return map;
  }, [terminalsData]);

  const filteredData = useMemo(() => {
    let result = data;

    const region = filterValues.region;
    if (region && region !== "all" && terminalRegionMap.size > 0) {
      result = result.filter(
        (item) => terminalRegionMap.get(item.id) === region
      );
    }

    if (searchQuery) {
      result = result.filter((item) => item.name === searchQuery);
    }

    return result;
  }, [data, searchQuery, filterValues.region, terminalRegionMap]);

  // Summary stats (unique couriers only)
  const stats = useMemo(() => {
    const totalTerminals = filteredData.length;
    const uniqueCouriers = new Map<string, { is_online: boolean; is_late?: boolean }>();
    filteredData.forEach((t) => {
      t.couriers.forEach((c) => {
        if (!uniqueCouriers.has(c.id)) {
          uniqueCouriers.set(c.id, { is_online: c.is_online, is_late: c.is_late });
        }
      });
    });
    const totalCouriers = uniqueCouriers.size;
    const onlineCouriers = [...uniqueCouriers.values()].filter((c) => c.is_online).length;
    const lateCouriers = [...uniqueCouriers.values()].filter((c) => c.is_late).length;
    return { totalTerminals, totalCouriers, onlineCouriers, lateCouriers };
  }, [filteredData]);

  const onRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["roll-call"] });
  };

  return (
    <>
      <PageTitle title="Перекличка курьеров" />
      <div className="px-4 py-3">
        {/* Filters */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(() => {})}>
            <div className="flex items-center gap-3 flex-wrap">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-[200px] pl-3 text-left font-normal",
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
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || "all"}
                    >
                      <FormControl>
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Регион" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">Все регионы</SelectItem>
                        <SelectItem value="capital">Столица</SelectItem>
                        <SelectItem value="region">Регион</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <Select
                onValueChange={(val) => setSearchQuery(val === "all" ? "" : val)}
                value={searchQuery || "all"}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Все филиалы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все филиалы</SelectItem>
                  {data.map((terminal) => (
                    <SelectItem key={terminal.id} value={terminal.name}>
                      {terminal.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRefresh}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Обновить
              </Button>
            </div>
          </form>
        </Form>

        {/* Stats */}
        {!isLoading && (
          <div className="flex items-center gap-6 mt-3 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>
                <span className="font-semibold text-foreground">
                  {stats.totalTerminals}
                </span>{" "}
                филиалов
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Wifi className="h-4 w-4 text-green-500" />
              <span>
                <span className="font-semibold text-green-600">
                  {stats.onlineCouriers}
                </span>{" "}
                онлайн
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <WifiOff className="h-4 w-4" />
              <span>
                <span className="font-semibold text-foreground">
                  {stats.totalCouriers - stats.onlineCouriers}
                </span>{" "}
                офлайн
              </span>
            </div>
            {stats.lateCouriers > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-4 w-4 text-red-500" />
                <span>
                  <span className="font-semibold text-red-600">
                    {stats.lateCouriers}
                  </span>{" "}
                  опоздали
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="w-full">
                <CardHeader className="p-4">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-1/3 mt-1" />
                  <Skeleton className="h-1 w-full mt-2" />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-1.5">
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Нет данных для отображения
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filteredData.map((terminal) => (
              <TerminalCard
                key={terminal.id}
                terminal={terminal}
                date={filterValues.date}
                onRefetch={refetch}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
