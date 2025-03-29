"use client";

import { toast } from "sonner";

export { toast };

export function useToast() {
  return {
    toast,
    dismiss: toast.dismiss,
  };
} 