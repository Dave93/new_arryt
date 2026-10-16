"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Calculator, Loader2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/eden-client";
import { cn } from "@/lib/utils";

type Settlement = {
  status: "paid" | "skipped" | "dry_run";
  reason?: string;
  garantName?: string;
  garantAmount?: number;
  earned?: number;
  lateMinutes?: number;
  penalty?: number;
  payout?: number;
  adjustment?: number;
  total?: number;
};

const sum = (n?: number) => new Intl.NumberFormat("ru-RU").format(Math.round(n ?? 0));

/** Причины, при которых начислить нельзя совсем — даже с корректировкой. */
const BLOCKING_REASONS: Record<string, string> = {
  no_garant: "Курьеру не назначен дневной гарант",
  no_shift: "В этот день у курьера не было смены",
  unfinished_orders: "У курьера есть незавершённые заказы за этот день",
  no_terminal: "Не удалось определить филиал для начисления",
  already_paid: "Гарант за этот день уже начислен",
};

export function DailyGarantDialog({
  day,
  courierId,
  courierName,
  onSuccess,
}: {
  day: Date;
  courierId: string;
  courierName: string;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Settlement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sign, setSign] = useState<1 | -1>(1);
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");

  // Пробный расчёт при открытии: показываем цифры до того, как деньги уйдут.
  useEffect(() => {
    if (!open) return;
    setPreview(null);
    setSign(1);
    setAmount("");
    setComment("");
    setIsLoading(true);
    apiClient.api.couriers.try_set_daily_garant
      .post({ day: day.toISOString(), courier_id: courierId, dry_run: true })
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error("Не удалось посчитать дневной гарант");
          setOpen(false);
          return;
        }
        setPreview(data as Settlement);
      })
      .catch(() => {
        toast.error("Не удалось посчитать дневной гарант");
        setOpen(false);
      })
      .finally(() => setIsLoading(false));
  }, [open, day, courierId]);

  const blockedText = preview?.reason ? BLOCKING_REASONS[preview.reason] : undefined;
  const payout = preview?.payout ?? 0;
  const amountNumber = Number(amount.replace(/\s/g, "")) || 0;
  const adjustment = sign * amountNumber;
  const total = Math.max(0, payout + adjustment);
  const needsComment = adjustment !== 0 && !comment.trim();
  const canSubmit = !!preview && !blockedText && total > 0 && !needsComment && !isSubmitting;

  const submit = async () => {
    setIsSubmitting(true);
    try {
      const { data, error } = await apiClient.api.couriers.try_set_daily_garant.post({
        day: day.toISOString(),
        courier_id: courierId,
        adjustment: adjustment || undefined,
        adjustment_comment: adjustment ? comment.trim() : undefined,
      });
      if (error?.status === 403) {
        toast.error("Начислять дневной гарант может только администратор");
        return;
      }
      if (error || !data) {
        toast.error("Ошибка при начислении дневного гаранта");
        return;
      }
      const result = data as Settlement;
      if (result.status === "paid") {
        toast.success(`Начислено ${sum(result.total)} сум`, { description: courierName });
        setOpen(false);
        onSuccess?.();
      } else {
        toast.info("Гарант не начислен", {
          description: BLOCKING_REASONS[result.reason ?? ""] ?? "Итог к начислению равен нулю",
        });
      }
    } catch {
      toast.error("Ошибка при начислении дневного гаранта");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-primary"
        onClick={() => setOpen(true)}
        title="Дневной гарант"
      >
        <Calculator className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Дневной гарант</DialogTitle>
            <DialogDescription>
              {courierName} · {format(day, "d MMMM yyyy", { locale: ru })}
              {preview?.garantName ? ` · ${preview.garantName}` : ""}
            </DialogDescription>
          </DialogHeader>

          {isLoading || !preview ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : blockedText ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {blockedText}
            </div>
          ) : (
            <div className="space-y-5">
              <dl className="space-y-2 text-sm">
                <Row label="Гарант" value={sum(preview.garantAmount)} />
                <Row label="Заработано за день" value={`− ${sum(preview.earned)}`} />
                <Row
                  label={`Штраф за опоздание${preview.lateMinutes ? ` (${preview.lateMinutes} мин)` : ""}`}
                  value={preview.penalty ? `− ${sum(preview.penalty)}` : "0"}
                />
                <div className="border-t pt-2">
                  <Row label="Доплата по расчёту" value={sum(payout)} strong />
                </div>
              </dl>

              <div className="space-y-2">
                <Label>Корректировка</Label>
                <div className="flex gap-2">
                  <div className="flex rounded-md border p-0.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={sign === 1 ? "default" : "ghost"}
                      className="h-8 gap-1 px-2.5"
                      onClick={() => setSign(1)}
                    >
                      <Plus className="h-3.5 w-3.5" /> Доплатить
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={sign === -1 ? "default" : "ghost"}
                      className="h-8 gap-1 px-2.5"
                      onClick={() => setSign(-1)}
                    >
                      <Minus className="h-3.5 w-3.5" /> Удержать
                    </Button>
                  </div>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d\s]/g, ""))}
                    className="flex-1"
                  />
                </div>
                <Textarea
                  placeholder="Причина: доп. часы вне гаранта, удержание…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={300}
                  rows={2}
                  className={cn(needsComment && amount && "border-amber-400")}
                />
                {needsComment && amount && (
                  <p className="text-xs text-amber-700">Укажите причину корректировки</p>
                )}
              </div>

              <div className="flex items-baseline justify-between rounded-lg bg-muted px-4 py-3">
                <span className="text-sm text-muted-foreground">Итог к начислению</span>
                <span className="text-xl font-semibold tabular-nums">{sum(total)} сум</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button onClick={submit} disabled={!canSubmit}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Начислить {total > 0 ? `${sum(total)} сум` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("tabular-nums", strong && "font-semibold text-foreground")}>{value}</dd>
    </div>
  );
}
