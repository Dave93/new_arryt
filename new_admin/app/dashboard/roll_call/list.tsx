"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, isToday } from "date-fns";
import { ru } from "date-fns/locale";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarIcon,
  ChevronRight,
  PhoneIcon,
  RefreshCw,
  Search,
} from "lucide-react";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { PageTitle } from "@/components/page-title";
import { DailyGarantDialog } from "@/components/roll-call/daily-garant-dialog";
import { Skeleton } from "../../../components/ui/skeleton";
import { apiClient } from "../../../lib/eden-client";
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
import { cn } from "../../../lib/utils";

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
  drive_type?: string;
  daily_garant_id?: string;
  work_schedule?: string | null;
  assigned_schedule?: string | null;
  schedule_mismatch?: boolean;
}

interface Terminal {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  linked_terminal_id?: string | null;
  organization_id: string;
  organization?: { name: string } | null;
}

interface GarantTariff {
  id: string;
  name: string;
}

interface GarantStatus {
  courierId: string;
  status: "paid" | "due" | "zero" | "blocked";
  amount: number;
  reason?: string;
}

type CourierStatus = "late" | "onshift" | "missing" | "off";
type Filter = "all" | "onshift" | "late" | "missing" | "off" | "mismatch";

interface Row extends Courier {
  status: CourierStatus;
  checkIn: string | null;
  lateMinutes: number;
  scheduleStart: string | null;
}

interface Point {
  id: string;
  name: string;
  brands: string[];
  terminalIds: string[];
  rows: Row[];
}

const driveTypeLabels: Record<string, string> = {
  car: "авто",
  bike: "мото",
  bycicle: "вело",
  foot: "пешком",
};

/** Терминалы двух брендов ближе этого — одна точка (как в расчёте гаранта). */
const SAME_POINT_METERS = 100;
/** Опоздание до 30 минут — не красным: это скорее «немного задержался». */
const LATE_GRACE_MINUTES = 30;

const sum = (n: number) => new Intl.NumberFormat("ru-RU").format(Math.round(n));

function distanceMeters(a: Terminal, b: Terminal) {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Название точки без бренда: «C5 Chopar» и «C5 Les Ailes» → «C5». */
function pointName(names: string[], brands: string[]) {
  const words = brands.flatMap((b) => [b, b.split(" ")[0]]).filter(Boolean);
  const strip = (n: string) =>
    words
      .reduce((acc, w) => acc.replace(new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), ""), n)
      .replace(/\s+/g, " ")
      .trim();
  const stripped = names.map(strip).filter(Boolean);
  return stripped.sort((a, b) => a.length - b.length)[0] || names[0];
}

/** Объединяет терминалы одной точки: явная связка или координаты ближе 100 м. */
function groupTerminals(ids: string[], terminals: Map<string, Terminal>) {
  const parent = new Map(ids.map((id) => [id, id]));
  const find = (id: string): string => {
    const p = parent.get(id)!;
    if (p === id) return id;
    const root = find(p);
    parent.set(id, root);
    return root;
  };
  const union = (a: string, b: string) => parent.set(find(a), find(b));
  for (let i = 0; i < ids.length; i++) {
    const a = terminals.get(ids[i]);
    if (!a) continue;
    if (a.linked_terminal_id && a.linked_terminal_id !== a.id && parent.has(a.linked_terminal_id)) {
      union(a.id, a.linked_terminal_id);
    }
    for (let j = i + 1; j < ids.length; j++) {
      const b = terminals.get(ids[j]);
      if (b && a.organization_id !== b.organization_id && distanceMeters(a, b) <= SAME_POINT_METERS) {
        union(a.id, b.id);
      }
    }
  }
  const groups = new Map<string, string[]>();
  ids.forEach((id) => {
    const root = find(id);
    groups.set(root, [...(groups.get(root) ?? []), id]);
  });
  return [...groups.values()];
}

/** Начало смены выбранного дня; смена после полуночи (до 04:00) — уже следующие сутки. */
function shiftStart(day: Date, schedule: string | null | undefined) {
  const match = schedule?.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const start = new Date(day);
  start.setHours(Number(match[1]), Number(match[2]), 0, 0);
  if (Number(match[1]) < 4) start.setDate(start.getDate() + 1);
  return start;
}

function lateLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `+${h ? `${h} ч ` : ""}${m} мин`;
}

function toRow(c: Courier, day: Date): Row {
  const start = shiftStart(day, c.work_schedule);
  const checkIn = c.created_at ? new Date(c.created_at) : null;
  const lateMinutes = checkIn && start ? Math.max(0, Math.floor((checkIn.getTime() - start.getTime()) / 60000)) : 0;
  let status: CourierStatus = "off";
  if (checkIn) status = lateMinutes > LATE_GRACE_MINUTES ? "late" : "onshift";
  else if (isToday(day) && start && Date.now() > start.getTime()) status = "missing";
  return {
    ...c,
    status,
    checkIn: checkIn ? format(checkIn, "HH:mm") : null,
    lateMinutes,
    scheduleStart: start ? format(start, "HH:mm") : null,
  };
}

const matches = (r: Row, f: Filter) =>
  f === "all" ||
  (f === "onshift" && (r.status === "onshift" || r.status === "late")) ||
  r.status === f ||
  (f === "mismatch" && !!r.schedule_mismatch);

const statusOrder: Record<CourierStatus, number> = { late: 0, onshift: 1, missing: 2, off: 3 };

const FILTERS: { id: Filter; label: string; dot: string }[] = [
  { id: "all", label: "Все", dot: "bg-slate-400" },
  { id: "onshift", label: "На смене", dot: "bg-green-500" },
  { id: "late", label: "Опоздали", dot: "bg-red-500" },
  { id: "missing", label: "Не отметились", dot: "bg-amber-500" },
  { id: "off", label: "Не в сети", dot: "bg-slate-300" },
  { id: "mismatch", label: "График не совпадает", dot: "bg-orange-600" },
];

const BLOCKED_TEXT: Record<string, string> = {
  no_garant: "тариф не назначен",
  no_shift: "нет смены — не начисляется",
  no_terminal: "не найден филиал для начисления",
};

function GarantCell({
  row,
  tariff,
  garant,
}: {
  row: Row;
  tariff?: GarantTariff;
  garant?: GarantStatus;
}) {
  if (!row.daily_garant_id) {
    return <span className="text-sm text-muted-foreground">без дневного гаранта</span>;
  }
  let text = "нет смены — не начисляется";
  let tone = "text-muted-foreground";
  if (garant?.status === "due") {
    text = `к начислению ${sum(garant.amount)} сум`;
    tone = "text-primary";
  } else if (garant?.status === "paid") {
    text = `начислено ${sum(garant.amount)} сум ✓`;
    tone = "text-green-700 dark:text-green-400";
  } else if (garant?.status === "zero") {
    text = "заработал гарант сам";
  } else if (garant?.status === "blocked") {
    text = BLOCKED_TEXT[garant.reason ?? ""] ?? "начислить нельзя";
  }
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate text-sm font-semibold">{tariff?.name ?? "тариф удалён"}</span>
      <span className={cn("text-[13px] font-semibold", tone)}>{text}</span>
    </div>
  );
}

function CourierRow({
  row,
  day,
  tariff,
  garant,
  onPaid,
}: {
  row: Row;
  day: Date;
  tariff?: GarantTariff;
  garant?: GarantStatus;
  onPaid: () => void;
}) {
  const name = [row.first_name, row.last_name].filter(Boolean).join(" ");
  const initials = [row.first_name, row.last_name].map((w) => w?.trim()?.[0] ?? "").join("").toUpperCase();
  const tone = {
    late: { badge: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300", avatar: "bg-red-100 text-red-800", row: "bg-red-50/40 dark:bg-red-950/10" },
    onshift: { badge: "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300", avatar: "bg-green-100 text-green-800", row: "bg-white dark:bg-card" },
    missing: { badge: "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300", avatar: "bg-amber-100 text-amber-900", row: "bg-white dark:bg-card" },
    off: { badge: "bg-muted text-muted-foreground", avatar: "bg-muted text-muted-foreground", row: "bg-white dark:bg-card" },
  }[row.status];

  let statusText = "Не в сети";
  let statusHint = row.scheduleStart ? `смена по графику с ${row.scheduleStart}` : "графика нет";
  if (row.status === "late") {
    statusText = `${row.checkIn} · ${lateLabel(row.lateMinutes)}`;
    statusHint = `опоздание от начала смены ${row.scheduleStart}`;
  } else if (row.status === "onshift") {
    statusText = row.lateMinutes > 0 ? `${row.checkIn} · ${lateLabel(row.lateMinutes)}` : `${row.checkIn} · вовремя`;
    statusHint = row.lateMinutes > 0 ? "опоздание от начала смены" : "отметился";
  } else if (row.status === "missing") {
    statusText = "Не отметился";
  }

  const canSettle = !!row.daily_garant_id && (garant?.status === "due" || garant?.status === "zero");

  return (
    <div
      className={cn(
        "grid grid-cols-1 items-center gap-x-4 gap-y-2.5 border-t px-4 py-3 first:border-t-0 sm:grid-cols-2 sm:px-5 xl:grid-cols-[minmax(220px,1.6fr)_minmax(140px,1fr)_minmax(160px,1fr)_minmax(200px,1.3fr)_168px]",
        tone.row,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold", tone.avatar)} aria-hidden="true">
          {initials}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          {/* Новая вкладка: перекличка с выбранной датой и фильтрами остаётся открытой */}
          <Link
            href={`/dashboard/users/${row.id}?from=roll_call`}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-[15px] font-semibold hover:text-primary hover:underline underline-offset-2"
          >
            {name}
          </Link>
          <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <span className={cn("h-1.5 w-1.5 rounded-full", row.is_online ? "bg-green-500" : "bg-slate-300")} aria-hidden="true" />
            {row.is_online ? "в сети" : "не в сети"}
            {row.drive_type && <> · {driveTypeLabels[row.drive_type] ?? row.drive_type}</>}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-start gap-1">
        <span className="font-mono text-sm">{row.assigned_schedule ?? row.work_schedule ?? "—"}</span>
        {row.schedule_mismatch && (
          <span
            className="rounded-md bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-900 dark:bg-orange-950/40 dark:text-orange-300"
            title="Опоздание для гаранта считается от графика тарифа"
          >
            по тарифу {row.work_schedule}
          </span>
        )}
      </div>

      <div className="flex flex-col items-start gap-1">
        <span className={cn("rounded-lg px-2.5 py-1 text-[13px] font-bold", row.checkIn && "font-mono", tone.badge)}>
          {statusText}
        </span>
        <span className="text-xs text-muted-foreground">{statusHint}</span>
      </div>

      <GarantCell row={row} tariff={tariff} garant={garant} />

      <div className="flex items-center gap-1.5 sm:justify-end">
        {row.phone && (
          <Button asChild variant="outline" size="icon" className="h-10 w-10" title={row.phone}>
            <a href={`tel:${row.phone}`} aria-label={`Позвонить: ${name}`}>
              <PhoneIcon className="h-4 w-4" />
            </a>
          </Button>
        )}
        {canSettle && (
          <DailyGarantDialog
            day={day}
            courierId={row.id}
            courierName={name}
            onSuccess={onPaid}
            trigger={garant?.status === "due" ? "button" : "outline"}
          />
        )}
      </div>
    </div>
  );
}

export default function RollCallList() {
  const [date, setDate] = useState<Date>(new Date());
  const [region, setRegion] = useState("capital");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("onshift");
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();

  const { data: terminalsData = [] } = useQuery({
    queryKey: ["terminals-cached"],
    queryFn: async () => {
      const { data } = await apiClient.api.terminals.cached.get();
      return (data as unknown as Terminal[]) || [];
    },
  });

  const { data: tariffs = [] } = useQuery({
    queryKey: ["dailyGarants"],
    queryFn: async () => ((await apiClient.api.daily_garant.cached.get()).data as GarantTariff[]) || [],
  });

  const { data = [], isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["roll-call", date.toDateString()],
    queryFn: async () => {
      const { data: list, error } = await apiClient.api.couriers.roll_coll.get({
        query: { date: date.toISOString() },
      });
      if (error) {
        toast.error("Ошибка загрузки данных переклички");
        return [];
      }
      return (Array.isArray(list) ? list : []) as unknown as RollCallItem[];
    },
  });

  // Статусы гаранта грузим отдельно — список показывается, не дожидаясь расчёта.
  const { data: garants = [] } = useQuery({
    queryKey: ["roll-call-garant", date.toDateString()],
    queryFn: async () => {
      const { data: list } = await apiClient.api.couriers.roll_coll.garant.get({
        query: { date: date.toISOString() },
      });
      return (Array.isArray(list) ? list : []) as GarantStatus[];
    },
  });

  const terminalMap = useMemo(() => new Map(terminalsData.map((t) => [t.id, t])), [terminalsData]);
  const tariffMap = useMemo(() => new Map(tariffs.map((t) => [t.id, t])), [tariffs]);
  const garantMap = useMemo(() => new Map(garants.map((g) => [g.courierId, g])), [garants]);

  // Точки: терминалы двух брендов на одном месте — один блок, курьеры без повторов.
  const points = useMemo<Point[]>(() => {
    const items = data.filter((t) => region === "all" || terminalMap.get(t.id)?.region === region);
    const byId = new Map(items.map((t) => [t.id, t]));
    return groupTerminals(items.map((t) => t.id), terminalMap).map((ids) => {
      const terms = ids.map((id) => byId.get(id)!);
      const brands = [...new Set(ids.map((id) => terminalMap.get(id)?.organization?.name).filter(Boolean) as string[])];
      const couriers = new Map<string, Courier>();
      terms.forEach((t) => t.couriers.forEach((c) => !couriers.has(c.id) && couriers.set(c.id, c)));
      const rows = [...couriers.values()]
        .map((c) => toRow(c, date))
        .sort(
          (a, b) =>
            statusOrder[a.status] - statusOrder[b.status] ||
            `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, "ru"),
        );
      return {
        id: ids.slice().sort()[0],
        name: pointName(terms.map((t) => t.name), brands),
        brands,
        terminalIds: ids,
        rows,
      };
    });
  }, [data, region, terminalMap, date]);

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return points;
    return points
      .map((p) => ({
        ...p,
        rows: p.rows.filter((r) =>
          `${r.first_name} ${r.last_name} ${r.phone ?? ""}`.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
        ),
      }))
      .filter((p) => p.rows.length > 0);
  }, [points, search]);

  // Счётчики — по уникальным курьерам: один курьер может работать в двух точках.
  const counts = useMemo(() => {
    const unique = new Map<string, Row>();
    searched.forEach((p) => p.rows.forEach((r) => unique.set(r.id, r)));
    const all = [...unique.values()];
    return Object.fromEntries(FILTERS.map((f) => [f.id, all.filter((r) => matches(r, f.id)).length])) as Record<Filter, number>;
  }, [searched]);

  const visible = useMemo(() => {
    const problems = (p: Point) => p.rows.filter((r) => r.status === "late" || r.status === "missing").length;
    const onShift = (p: Point) => p.rows.filter((r) => r.status === "late" || r.status === "onshift").length;
    return searched
      .map((p) => ({ ...p, shown: p.rows.filter((r) => matches(r, filter)) }))
      .filter((p) => p.shown.length > 0)
      .sort((a, b) => problems(b) - problems(a) || onShift(b) - onShift(a) || a.name.localeCompare(b.name, "ru"));
  }, [searched, filter]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["roll-call"] });
    queryClient.invalidateQueries({ queryKey: ["roll-call-garant"] });
  };

  const attention = counts.late + counts.missing + counts.mismatch;

  return (
    <>
      <PageTitle title="Перекличка курьеров" />
      <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-5 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {format(date, "EEEE, d MMMM", { locale: ru })}
            {dataUpdatedAt ? ` · обновлено в ${format(dataUpdatedAt, "HH:mm")}` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Курьер, телефон или точка"
                aria-label="Поиск курьера"
                className="h-11 w-[240px] pl-9"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-11 gap-2 font-normal">
                  <CalendarIcon className="h-4 w-4" />
                  {format(date, "dd.MM.yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
              </PopoverContent>
            </Popover>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="h-11 w-[150px]" aria-label="Регион">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все регионы</SelectItem>
                <SelectItem value="capital">Столица</SelectItem>
                <SelectItem value="region">Регион</SelectItem>
              </SelectContent>
            </Select>
            <Button className="h-11 gap-2" onClick={refresh}>
              <RefreshCw className="h-4 w-4" />
              Обновить
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5" role="group" aria-label="Фильтр по статусу">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={cn(
                "flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors",
                filter === f.id
                  ? "border-foreground bg-foreground text-background"
                  : "bg-white hover:border-primary dark:bg-card",
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", f.dot)} aria-hidden="true" />
              {f.label}
              <span className="font-extrabold">{isLoading ? "…" : counts[f.id]}</span>
            </button>
          ))}
        </div>

        {!isLoading && (filter === "all" || filter === "onshift") && attention > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <b>Требуют внимания:</b> {counts.late} опоздали, {counts.missing} не отметились
              {counts.mismatch > 0 && <>, у {counts.mismatch} график не совпадает с тарифом</>}. Точки с проблемами — сверху.
            </span>
          </div>
        )}

        <div className="flex flex-col gap-3.5">
          <div className="hidden gap-4 px-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground xl:grid xl:grid-cols-[minmax(220px,1.6fr)_minmax(140px,1fr)_minmax(160px,1fr)_minmax(200px,1.3fr)_168px]">
            <span>Курьер</span>
            <span>График курьера</span>
            <span>Отметка</span>
            <span>Дневной гарант</span>
            <span className="text-right">Действия</span>
          </div>

          {isLoading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-44 w-full rounded-2xl" />)
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-white py-12 text-center text-muted-foreground dark:bg-card">
              По этому фильтру курьеров нет
            </div>
          ) : (
            visible.map((p) => {
              const open = !closed[p.id];
              const late = p.rows.filter((r) => r.status === "late").length;
              const missing = p.rows.filter((r) => r.status === "missing").length;
              const onShift = p.rows.filter((r) => r.status === "late" || r.status === "onshift").length;
              return (
                <section key={p.id} className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-card">
                  <button
                    type="button"
                    onClick={() => setClosed((s) => ({ ...s, [p.id]: open }))}
                    aria-expanded={open}
                    className="flex w-full flex-wrap items-center justify-between gap-3 bg-white px-4 py-4 text-left hover:bg-slate-50 sm:px-5 dark:bg-card dark:hover:bg-muted/40"
                  >
                    <span className="flex items-center gap-3">
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
                        <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
                      </span>
                      <span className="flex flex-col">
                        <span className="text-[17px] font-bold">{p.name}</span>
                        <span className="text-[13px] text-muted-foreground">{p.brands.join(" · ")}</span>
                      </span>
                    </span>
                    <span className="flex flex-wrap gap-2 text-[13px] font-semibold">
                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-green-800 dark:bg-green-950/40 dark:text-green-300">
                        на смене {onShift} / {p.rows.length}
                      </span>
                      {late > 0 && (
                        <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-800 dark:bg-red-950/40 dark:text-red-300">
                          опоздали {late}
                        </span>
                      )}
                      {missing > 0 && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                          не отметились {missing}
                        </span>
                      )}
                    </span>
                  </button>
                  {open && (
                    <div className="border-t">
                      {p.shown.map((r) => (
                        <CourierRow
                          key={r.id}
                          row={r}
                          day={date}
                          tariff={r.daily_garant_id ? tariffMap.get(r.daily_garant_id) : undefined}
                          garant={garantMap.get(r.id)}
                          onPaid={refresh}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
