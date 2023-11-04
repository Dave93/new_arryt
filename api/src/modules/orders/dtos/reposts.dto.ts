interface GarantDeliveryPriceTerminal {
  terminal_id: string;

  terminal_name: string;

  delivery_price: number;
}

interface GarantDeliveryPriceOrg {
  id: string;

  name: string;

  children: GarantDeliveryPriceTerminal[];
}

export interface GarantReportItem {
  begin_date: Date;
  last_order_date: Date;
  delivery_price: number;
  courier: string;
  terminal_name: string;

  orders_count: number;

  avg_delivery_time: string;

  formatted_avg_delivery_time: string;

  orders_dates: Date[];

  courier_id: string;

  created_at: Date;

  status: keyof typeof user_status;

  possible_day_offs: number;

  garant_price: number;

  order_dates_count: number;

  actual_day_offs: number;

  actual_day_offs_list: Date[];

  balance: number;

  earned: number;

  balance_to_pay: number;

  garant_days: number;

  drive_type: string;

  possible_garant_price: number;

  bonus_total: number;

  delivery_price_orgs: GarantDeliveryPriceOrg[];
}
