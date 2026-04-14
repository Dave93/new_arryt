import {
  parseAsString,
  parseAsInteger,
  parseAsArrayOf,
  parseAsIsoDateTime,
  createSerializer,
} from "nuqs";
import { startOfWeek, endOfWeek, setHours } from "date-fns";

const now = new Date();

export const ordersFiltersParsers = {
  dateFrom: parseAsIsoDateTime.withDefault(
    setHours(startOfWeek(now, { weekStartsOn: 1 }), 10),
  ),
  dateTo: parseAsIsoDateTime.withDefault(endOfWeek(now, { weekStartsOn: 1 })),
  search: parseAsString.withDefault(""),
  phone: parseAsString.withDefault(""),
  organization: parseAsString.withDefault("all"),
  terminals: parseAsArrayOf(parseAsString).withDefault([]),
  courierId: parseAsString.withDefault(""),
  courierLabel: parseAsString.withDefault(""),
  statuses: parseAsArrayOf(parseAsString).withDefault([]),
  region: parseAsString.withDefault("capital"),
  page: parseAsInteger.withDefault(0),
  pageSize: parseAsInteger.withDefault(100),
};

export const serializeOrdersFilters = createSerializer(ordersFiltersParsers);
