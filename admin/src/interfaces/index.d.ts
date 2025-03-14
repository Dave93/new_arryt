import { terminals, users } from "@api/drizzle/schema";
import { drive_type, organization_system_type, user_status } from "./enums";
import { InferSelectModel } from "drizzle-orm";

export interface IPermissions {
  id: number;

  slug: string;

  description: string;

  active: boolean;

  created_at: Date;

  updated_at: Date;

  created_by: string | null;

  updated_by: string | null;
}

export interface IRoles {
  id: string;

  name: string;

  active: boolean;
}

export interface IDeliveryPricing {
  id: string;

  active: boolean;

  default: boolean;

  name: string;

  drive_type: keyof typeof drive_type;

  days: Array<string>;

  start_time: Date;

  end_time: Date;

  min_price?: number | null;

  rules: any;

  price_per_km: number;

  organization_id: string;
  organization?: organization;
}

export class IOrganization {
  id: string;

  name: string;

  active: boolean;

  system_type: keyof typeof organization_system_type;

  phone: string;

  webhook?: string | null;

  group_id?: string | null;

  apelsin_login?: string | null;

  apelsin_password?: string | null;

  sender_name?: string | null;

  sender_number?: string | null;

  description?: string | null;

  created_at: Date;

  updated_at: Date;

  created_by?: string | null;

  updated_by?: string | null;

  _count?: OrganizationCount;
}

export class IWorkSchedules {
  id: string;

  name: string;

  active: boolean;

  organization_id: string;

  organization?: organization;

  days: Array<string>;

  start_time: Date;

  end_time: Date;

  max_start_time: Date;

  created_at: Date;

  updated_at: Date;

  created_by?: string | null;

  updated_by?: string | null;

  work_schedules_created_byTousers?: users | null;

  work_schedules_updated_byTousers?: users | null;
}

export class ITerminals {
  id: string;

  name: string;

  active: boolean;

  phone: string | null;

  address: string | null;

  latitude: number;

  longitude: number;

  external_id: string;

  organization_id: string;

  organization?: organization;

  created_at: Date;

  updated_at: Date;

  created_by: string | null;

  updated_by: string | null;
}

export class IUsers {
  [x: string]: any;
  id: string;

  phone: string;

  first_name?: string | null;

  last_name?: string | null;

  password?: string | null;

  is_super_user: boolean;

  status: keyof typeof user_status;

  drive_type?: keyof typeof drive_type | null;

  card_name?: string | null;

  card_number?: string | null;

  birth_date?: Date | null;

  car_model?: string | null;

  car_number?: string | null;

  is_online: boolean;

  latitude?: number | null;

  longitude?: number | null;

  created_at: Date;

  updated_at: Date;

  otp?: Array<otp>;

  permissions_permissions_created_byTousers?: Array<permissions>;

  permissions_permissions_updated_byTousers?: Array<permissions>;

  post_post_created_byTousers?: Array<post>;

  post_updated_byTousers?: Array<post>;

  post_post_user_idTousers?: Array<post>;

  roles_roles_created_byTousers?: Array<roles>;

  roles_roles_updated_byTousers?: Array<roles>;

  roles_permissions_roles_permissions_created_byTousers?: Array<roles_permissions>;

  roles_permissions_roles_permissions_updated_byTousers?: Array<roles_permissions>;

  users_permissions_usersTousers_permissions_created_by?: Array<users_permissions>;

  users_permissions_usersTousers_permissions_updated_by?: Array<users_permissions>;

  users_permissions_usersTousers_permissions_user_id?: Array<users_permissions>;

  users_roles_usersTousers_roles_created_by?: Array<users_roles>;

  users_roles_usersTousers_roles_updated_by?: Array<users_roles>;

  users_roles_usersTousers_roles_user_id?: Array<users_roles>;

  post_prop_types_created_byTousers?: Array<post_prop_types>;

  post_prop_types_updated_byTousers?: Array<post_prop_types>;

  delivery_pricing_created_byTousers?: Array<delivery_pricing>;

  delivery_pricing_updated_byTousers?: Array<delivery_pricing>;

  city_created_byTousers?: Array<city>;

  city_updated_byTousers?: Array<city>;

  organization_created_byTousers?: Array<organization>;

  organization_updated_byTousers?: Array<organization>;

  work_schedules_created_byTousers?: Array<work_schedules>;

  work_schedules_updated_byTousers?: Array<work_schedules>;

  terminals_created_byTousers?: Array<terminals>;

  terminals_updated_byTousers?: Array<terminals>;

  users_terminals?: Array<users_terminals>;

  users_work_schedules?: Array<users_work_schedules>;

  _count?: UsersCount;
}

class WorkScheduleEntriesReportCouriers {
  id: string;

  first_name: string;

  last_name: string;
}

export class WorkScheduleEntriesReportForPeriod {
  users: WorkScheduleEntriesReportCouriers[];

  work_schedule_entries: WorkScheduleEntriesReportRecord[];
}

class WorkScheduleEntriesReportRecord {
  user_id: string;

  duration: number;

  day: Date;

  late: boolean;

  first_name: string;

  last_name: string;
}

export class ICustomers {
  id: string;

  name: string;

  phone: string;

  customers_comments_customers?: Array<customers_comments>;

  _count?: CustomersCount;
}

export class customers_comments {
  id: string;

  customer_id: string;

  comment: string;

  created_at: Date;

  created_by: string | null;

  customers_comments_created_byTousers?: users | null;

  customers_comments_customers?: customers;
}

export class IOrderStatus {
  id: string;

  name: string;

  sort: number;

  organization_id: string;

  finish: boolean;

  cancel: boolean;

  waiting: boolean;

  color: string;

  organization?: organization;
}

export class IOrders {
  id: string;

  organization_id: string;

  customer_id: string;

  courier_id: string;

  terminal_id: string;

  order_status_id: string;

  delivery_type: keyof typeof drive_type;

  from_lat: number;

  from_lon: number;

  to_lat: number;

  to_lon: number;

  pre_distance: number;

  pre_duration: number;

  order_number: string;

  distance: number | null;

  duration: number | null;

  order_price: number;

  delivery_price: number;

  delivery_address: string;

  delivery_date: Date;

  finished_date: Date | null;

  cooked_time: Date | null;

  delivery_comment: string | null;

  delivery_phone: string;

  delivery_name: string;

  payment_type_id: string;

  payment_type: string;

  delivery_pricing_id: string;

  cancel_reason: string | null;

  order_items: any | null;

  created_at: Date;

  updated_at: Date;

  created_by: string | null;

  updated_by: string | null;

  orders_created_byTousers?: users | null;

  orders_updated_byTousers?: users | null;

  customers?: customers;

  couriers?: users;

  order_status?: order_status;

  organization?: organization;

  terminals?: terminals;

  allowYandex: boolean;

  yandex_delivery_data: any;

  bonus: number;
}

export class IOrderActions {
  id: string;

  order_id: string;

  action: string | null;
  duration: number;

  action_text: string;

  terminal_id: string;

  created_at: Date;

  created_by: string | null;

  order_actions_created_byTousers?: users | null;

  order_actions_orders?: orders;

  order_actions_terminals?: terminals;
}

export class IOrderLocation {
  order_id: string;

  terminal_id: string;

  courier_id: string;

  created_at: Date;

  lat: number;
  lon: number;

  order_status_id: string;

  status_color: string;

  status_name: string;
}

export class IGroupedLocations {
  order_status: string;

  location: IOrderLocation[];
}

export class IApiTokens {
  id: string;

  active: boolean;

  token: string;

  organization_id: string;

  created_at: Date;

  updated_at: Date;

  created_by: string | null;

  updated_by: string | null;

  api_tokens_created_byTousers?: users | null;

  api_tokens_updated_byTousers?: users | null;

  organization?: organization;
}

export class ICouriersByTerminal {
  name: string;

  couriers: IUsers[];
}

export class ISystemConfigs {
  id: string;

  name: string;

  value: string;
}

export class IBrands {
  id: string;

  name: string;

  sign: string;

  api_url: string;

  logo_path: string | null;

  created_at: Date;

  updated_at: Date;
}

class GarantDeliveryPriceTerminal {
  terminal_id: string;

  terminal_name: string;

  delivery_price: number;
}

class GarantDeliveryPriceOrg {
  id: string;

  name: string;

  children: GarantDeliveryPriceTerminal[];
}

export type GarantReportItem = {
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
};

export class RollCallCourier {
  id: string;

  first_name: string | null;

  last_name: string | null;

  created_at?: string | null;

  date?: string | null;

  is_late?: boolean | null;

  is_online?: boolean | null;

  drive_type?: string | null;
  phone?: string | null;

  app_version?: string | null;
}

export class RollCallItem {
  id: string;

  name: string;

  couriers: RollCallCourier[];
}

export type WalletStatus = {
  id: string;

  courier_id: string;

  terminal_id: string;

  balance: number;

  terminals?: Pick<InferSelectModel<typeof terminals>, "id" | "name">;
  users?: Pick<
    InferSelectModel<typeof users>,
    "id" | "first_name" | "last_name" | "status" | "phone"
  >;
};

export class CourierEfficiencyTerminalItem {
  terminal_id: string;

  terminal_name: string;

  courier_count: number;

  total_count: number;

  efficiency: number;

  hour_period: string;

  courier_ids: string[] | null;
}

export class CourierEfficiencyReportItem {
  courier_id: string;

  first_name: string;

  last_name: string;

  phone: string;

  drive_type: string;

  courier_count: number;

  total_count: number;

  efficiency: number;

  terminals: CourierEfficiencyTerminalItem[];

  period: string;
}

export class ITimesheet {
  id: string;

  user_id: string;

  is_late: boolean;

  date: Date;

  created_at: Date;

  updated_at: Date;

  timesheet_users?: users;
}

export class IManagerWithdraw {
  id: string;

  manager_id: string;

  courier_id: string;

  terminal_id: string;

  organization_id: string;

  amount: number;

  amount_before: number;

  amount_after: number;

  created_at: Date;

  payed_date: Date | null;

  created_by: string | null;

  manager_withdraw_created_byTousers?: users | null;

  manager_withdraw_managers?: users;

  manager_withdraw_organizations?: organization;

  manager_withdraw_couriers?: users;

  manager_withdraw_terminals?: terminals;

  manager_withdraw_transactions_withdraw?: Array<manager_withdraw_transactions>;

  _count?: Manager_withdrawCount;
}

export class IManagerWithdrawTransactions {
  id: string;

  withdraw_id: string;

  transaction_id: string;

  amount: number;

  created_at: Date;

  payed_date: Date | null;

  manager_withdraw_transactions_withdraw?: manager_withdraw;

  manager_withdraw_transactions_transaction?: order_transactions;
}

export class INotifications {
  id: string;

  title: string;

  body: string;

  created_at: Date;

  send_at: Date;

  status: string;

  role: string;
}

export class INotificationStatistic extends INotifications {
  deliver_status: string;

  user: users;
}

export class ICourierEfficiencyReportPerDayItem {
  courier_id: string;

  order_day: string;

  efficiency: number;

  hour_period?: CourierEfficiencyReportItem[];
}

export class IOrderTransactions {
  id: string;

  order_id?: string | null;

  terminal_id: string;

  courier_id: string;

  organization_id: string;

  card_number?: string | null;

  amount: number;

  balance_before: number;

  balance_after: number;

  not_paid_amount: number;

  status: keyof typeof order_transaction_status;

  transaction_payment_type: keyof typeof order_transaction_payment_type;

  transaction_type: string;

  comment?: string | null;

  error_text: string | null;

  created_at: Date;

  created_by?: string | null;

  order_transactions_created_byTousers?: users | null;

  order_transactions_orders?: orders | null;

  order_transactions_terminals?: terminals;

  order_transactions_couriers?: users;

  order_transactions_organizations?: organization;

  manager_withdraw_transactions_transaction?: Array<manager_withdraw_transactions>;

  _count?: Order_transactionsCount;
}

export class IMissedOrderEntity {
  id: string;

  order_id: string;

  order_number: string;

  created_at: Date;

  order_created_at: Date;

  organization_id: string;

  terminal_id: string;

  system_minutes_config: number;

  is_courier_set: boolean;

  order_status: order_status;

  order_price: number;
}

export class IDailyGarant {
  id: string;

  name: string;

  date: Date;

  amount: number;

  late_minus_sum: number;

  created_at: Date;

  updated_at: Date;

  daily_garant_daily_garant_tasks?: Array<daily_garant_tasks>;

  _count?: Daily_garantCount;
}

export class IConstructedBonusPricing {
  id!: string;

  name!: string;

  organization_id!: string;

  pricing!: any;

  created_at!: Date;

  updated_at!: Date;

  constructed_bonus_pricing_organization?: organization;
}
