export interface TerminalDeliveryStats {
  terminal_id: string;
  terminal_name: string;
  total_orders: number;
  fastest_delivery: string;
  slowest_delivery: string;
  average_delivery: string;
  fastest_order_id?: string;
  slowest_order_id?: string;
}

export interface TerminalDeliveryStatsResponse {
  data: TerminalDeliveryStats[];
} 