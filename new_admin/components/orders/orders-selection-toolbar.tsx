"use client";

import { useSelectedOrdersStore } from "@/lib/selected-orders-store";
import { Button } from "@/components/ui/button";
import { X, CheckSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ChangeStatusPopover } from "./change-status-popover";

interface OrdersSelectionToolbarProps {
  onSelectAll?: () => void;
}

export function OrdersSelectionToolbar({ onSelectAll }: OrdersSelectionToolbarProps) {
  const { selectedOrderIds, clearSelection, getSelectedCount, getSelectedOrganizationId } = useSelectedOrdersStore();
  const count = getSelectedCount();
  const isVisible = count > 0;
  const organizationId = getSelectedOrganizationId();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 border bg-background shadow-xl rounded-xl max-w-4xl"
        >
          <div className="px-6 py-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                    {count}
                  </div>
                  <span className="text-sm font-medium">
                    {count === 1 ? 'заказ выбран' : count < 5 ? 'заказа выбрано' : 'заказов выбрано'}
                  </span>
                </div>

                <div className="h-6 w-px bg-border hidden sm:block" />

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onSelectAll}
                    className="gap-2"
                  >
                    <CheckSquare className="h-4 w-4" />
                    Выбрать все
                  </Button>

                  {organizationId && (
                    <ChangeStatusPopover organizationId={organizationId} />
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Очистить
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
