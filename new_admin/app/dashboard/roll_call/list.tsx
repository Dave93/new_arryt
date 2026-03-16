"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, FilterIcon, PhoneIcon, Calculator } from "lucide-react";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { PageTitle } from "@/components/page-title";
import { Skeleton } from "../../../components/ui/skeleton";
import { apiClient } from "../../../lib/eden-client";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
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
import { cn } from "../../../lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Define types
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
}

interface Terminal {
  id: string;
  name: string;
  region: string;
}

// Define filter schema
const filterSchema = z.object({
  date: z.date(),
  region: z.string().optional(),
});

type FilterValues = z.infer<typeof filterSchema>;

// Daily Garant Component
function DailyGarantButton({ day, user_id, onSuccess }: { day: Date, user_id: string, onSuccess?: () => void }) {
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
      variant="outline" 
      size="icon" 
      className="h-8 w-8" 
      disabled={isLoading}
      onClick={setDailyGarant}
    >
      <Calculator className="h-4 w-4" />
    </Button>
  );
}

// Helper function for courier drive type icon
function CourierDriveTypeIcon({ driveType }: { driveType?: string }) {
  if (!driveType) return null;
  
  const driveTypeMap: Record<string, { label: string, className: string }> = {
    "car": { label: "🚗", className: "text-blue-500" },
    "bike": { label: "🚴", className: "text-green-500" },
    "bycicle": { label: "🚲", className: "text-yellow-500" },
    "foot": { label: "🚶", className: "text-orange-500" },
  };
  
  const dType = driveTypeMap[driveType] || { label: "❓", className: "text-gray-500" };
  
  return (
    <span className={`ml-2 ${dType.className}`} title={driveType}>
      {dType.label}
    </span>
  );
}

export default function RollCallList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const queryClient = useQueryClient();

  // Initialize form with default values
  const form = useForm<FilterValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      date: new Date(),
      region: "capital",
    },
  });

  // Fetch terminals for region mapping
  useEffect(() => {
    const fetchTerminals = async () => {
      try {
        const { data: terminalsData } = await apiClient.api.terminals.cached.get();
        if (terminalsData && Array.isArray(terminalsData)) {
          setTerminals(terminalsData as Terminal[]);
        }
      } catch {}
    };
    fetchTerminals();
  }, []);

  // Get the current filter values
  const filterValues = form.watch();

  // Fetch roll call data
  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["roll-call", filterValues.date, searchQuery],
    queryFn: async () => {
      try {
        const { data: rollCallList } = await apiClient.api.couriers.roll_coll.get({
          query: {
            date: filterValues.date.toISOString(),
            // search: searchQuery || undefined,
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
    }
  });

  // Build a map of terminal id -> region
  const terminalRegionMap = useMemo(() => {
    const map = new Map<string, string>();
    terminals.forEach(t => map.set(t.id, t.region));
    return map;
  }, [terminals]);

  // Filter data based on search query and region
  const filteredData = useMemo(() => {
    let result = data;

    const region = filterValues.region;
    if (region && region !== "all" && terminalRegionMap.size > 0) {
      result = result.filter((item) => terminalRegionMap.get(item.id) === region);
    }

    if (searchQuery) {
      result = result.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return result;
  }, [data, searchQuery, filterValues.region, terminalRegionMap]);

  // Simple debounce implementation using useCallback and setTimeout
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    const timeoutId = setTimeout(() => {
      setSearchQuery(value);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, []);

  const onRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["roll-call"] });
  }

  // Handle filter submit
  const onSubmit = (values: FilterValues) => {
    // The query will automatically refetch with the new values
  };

  return (
    <>
    <PageTitle title="Перекличка курьеров" />
    <div className="px-4 py-2">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex items-center gap-3">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-[240px] pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
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
                      <SelectTrigger className="w-[160px]">
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
            <Button type="submit" size="sm" onClick={onRefresh}>
              <FilterIcon className="h-4 w-4 mr-2" />
              Обновить
            </Button>
            <Input
              placeholder="Поиск филиала..."
              className="max-w-[200px]"
              onChange={handleSearchChange}
            />
          </div>
        </form>
      </Form>
    </div>

    <div className="px-4 py-1">
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="w-full">
              <CardHeader className="p-4">
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Skeleton className="h-4 w-1/3 mb-3" />
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredData.map((terminal) => (
            <Card key={terminal.id} className="w-full">
              <CardHeader className="px-5 py-4">
                <CardTitle className="text-lg font-semibold">{terminal.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {terminal.couriers.length} курьеров
                </p>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                <div className="space-y-3">
                  {terminal.couriers.map((courier) => (
                    <div key={courier.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge
                          variant={courier.is_online ? "default" : "destructive"}
                          className="shrink-0 text-xs px-2.5 py-0.5"
                        >
                          {courier.is_online ? "Онлайн" : "Офлайн"}
                        </Badge>
                        <div className="min-w-0">
                          <span className="font-medium text-sm leading-tight block truncate">
                            {courier.first_name} {courier.last_name}
                          </span>
                        </div>
                        <CourierDriveTypeIcon driveType={courier.drive_type} />
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Badge
                          variant={
                            courier.created_at
                              ? courier.is_late ? "destructive" : "default"
                              : "destructive"
                          }
                          className="text-xs px-2.5 py-0.5"
                        >
                          {courier.created_at
                            ? format(new Date(courier.created_at), "HH:mm")
                            : courier.is_online
                            ? "не сегодня"
                            : "не в сети"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => {
                            if (courier.phone) {
                              window.location.href = `tel:${courier.phone.replace("+998", "")}`;
                            }
                          }}
                        >
                          <PhoneIcon className="h-4 w-4" />
                        </Button>
                        {courier.daily_garant_id && (
                          <DailyGarantButton
                            day={filterValues.date}
                            user_id={courier.id}
                            onSuccess={refetch}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </>
  );
} 