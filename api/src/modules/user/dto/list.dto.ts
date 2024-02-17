import { roles, terminals, users } from "@api/drizzle/schema";
import { InferSelectModel } from "drizzle-orm";

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


export type CourierEfficiencyTerminalItem = {
  terminal_id: string;

  terminal_name: string;

  courier_count: number;

  total_count: number;

  efficiency: number;

  hour_period: string;

}

export type CourierEfficiencyReportItem = {
  courier_id: string;

  first_name: string;

  last_name: string;

  phone: string;

  drive_type: string;

  courier_count: number;

  total_count: number;

  efficiency: number | string;

  terminals: CourierEfficiencyTerminalItem[];

  period?: string;
}


export type UsersModel = InferSelectModel<typeof users> & {
  work_schedules: {
    id: string;
    user_id: string;
    work_schedule_id: string;
    start_time: string;
    end_time: string;
    day: string;
  }[];
  terminals: {
    id: string;
    user_id: string;
    terminal_id: string;
    start_time: string;
    end_time: string;
    day: string;
  }[];
  roles: InferSelectModel<typeof roles>;
};