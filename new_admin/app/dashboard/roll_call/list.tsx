"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, FilterIcon, PhoneIcon, Calculator } from "lucide-react";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
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
import { Badge } from "../../../components/ui/badge";
import { cn } from "../../../lib/utils";
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

// Define filter schema
const filterSchema = z.object({
  date: z.date(),
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
  const queryClient = useQueryClient();
  
  // Initialize form with default values
  const form = useForm<FilterValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      date: new Date(),
    },
  });

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

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    
    return data.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [data, searchQuery]);

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Перекличка курьеров</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
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
                <Button type="submit" onClick={onRefresh}>
                  <FilterIcon className="h-4 w-4 mr-2" />
                  Обновить
                </Button>
              </div>
              <Input
                placeholder="Поиск филиала..."
                className="max-w-sm"
                onChange={handleSearchChange}
              />
            </div>
          </form>
        </Form>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="w-full">
                <CardHeader>
                  <Skeleton className="h-8 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-1/3 mb-4" />
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredData.map((terminal) => (
              <Card key={terminal.id} className="w-full">
                <CardHeader>
                  <CardTitle>{terminal.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {terminal.couriers.length} курьеров
                  </p>
                  <div className="space-y-3">
                    {terminal.couriers.map((courier) => (
                      <div key={courier.id} className="flex items-center justify-between p-2 border rounded-md">
                        <div className="flex items-center">
                          <Badge 
                            variant={courier.is_online ? "default" : "destructive"}
                            className="mr-2"
                          >
                            {courier.is_online ? "Онлайн" : "Офлайн"}
                          </Badge>
                          <div>
                            <span className="font-medium">
                              {courier.first_name} {courier.last_name}
                            </span>
                            <CourierDriveTypeIcon driveType={courier.drive_type} />
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={courier.is_late ? "destructive" : courier.is_online ? "outline" : "destructive"}
                          >
                            {courier.created_at
                              ? format(new Date(courier.created_at), "HH:mm")
                              : courier.is_online
                              ? "не сегодня"
                              : "не в сети"}
                          </Badge>
                          {courier.app_version && (
                            <Badge variant="outline">v{courier.app_version}</Badge>
                          )}
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8"
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
      </CardContent>
    </Card>
  );
} 