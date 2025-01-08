import { DevtoolsProvider, DevtoolsPanel } from "@refinedev/devtools";
import { Authenticated, CanParams, Refine } from "@refinedev/core";
import {
  notificationProvider,
  ErrorComponent,
  Header,
  Sider,
} from "@refinedev/antd";

import "@refinedev/antd/dist/reset.css";
import "./styles/main.css";

import routerProvider, {
  CatchAllNavigate,
  NavigateToResource,
} from "@refinedev/react-router-v6";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import { useTranslation } from "react-i18next";
import { authProvider, TOKEN_KEY } from "./authProvider";
import { useEffect, useMemo, lazy, Suspense } from "react";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import queryClient from "./dataprovider/reactQueryClient";
import Login from "./pages/login";
import MainPage from "./pages/main/list";
import { ThemedLayoutV2 } from "@refinedev/antd";
import { edenDataProvider } from "./dataprovider/edenDataProvider";
import { App as AntdApp } from "antd";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import * as openpgp from "openpgp";
import OrdersInMaps from "./pages/orders/in_maps";

// Lazy load components
const ApiTokensCreate = lazy(() =>
  import("@admin/src/pages/api_tokens/create").then((module) => ({
    default: module.default,
  }))
);
const ApiTokensList = lazy(() =>
  import("@admin/src/pages/api_tokens/list").then((module) => ({
    default: module.default,
  }))
);
const OrderStatusEdit = lazy(() =>
  import("@admin/src/pages/api_tokens/edit").then((module) => ({
    default: module.default,
  }))
);
const RolesCreate = lazy(() =>
  import("./pages/roles/create").then((module) => ({ default: module.default }))
);
const RolesEdit = lazy(() =>
  import("./pages/roles/edit").then((module) => ({ default: module.default }))
);
const RolesList = lazy(() =>
  import("./pages/roles/list").then((module) => ({ default: module.default }))
);
const RolesShow = lazy(() =>
  import("./pages/roles/show").then((module) => ({ default: module.default }))
);
const BrandsList = lazy(() =>
  import("./pages/brands/list").then((module) => ({ default: module.default }))
);
const BrandsCreate = lazy(() =>
  import("./pages/brands/create").then((module) => ({
    default: module.default,
  }))
);
const BrandsEdit = lazy(() =>
  import("./pages/brands/edit").then((module) => ({ default: module.default }))
);

const PrivacyPage = lazy(() =>
  import("./pages/privacy").then((module) => ({ default: module.default }))
);

const OrdersList = lazy(() =>
  import("./pages/orders/list").then((module) => ({ default: module.default }))
);

const OrdersShow = lazy(() =>
  import("./pages/orders/show").then((module) => ({ default: module.default }))
);

const MissedOrdersList = lazy(() =>
  import("./pages/missed_orders/list").then((module) => ({
    default: module.default,
  }))
);

const OrdersGarantReport = lazy(() =>
  import("./pages/orders/orders_garant_report").then((module) => ({
    default: module.default,
  }))
);

const YuriyOrdersGarantReport = lazy(() =>
  import("./pages/orders/yuriy_orders_garant_report").then((module) => ({
    default: module.default,
  }))
);

const ManagerWithdrawList = lazy(() =>
  import("./pages/manager_withdraw/list").then((module) => ({
    default: module.default,
  }))
);

const UsersList = lazy(() =>
  import("./pages/users/list").then((module) => ({
    default: module.default,
  }))
);

const UsersShow = lazy(() =>
  import("./pages/users/show").then((module) => ({
    default: module.default,
  }))
);

const UsersCreate = lazy(() =>
  import("./pages/users/create").then((module) => ({
    default: module.default,
  }))
);

const UsersEdit = lazy(() =>
  import("./pages/users/edit").then((module) => ({
    default: module.default,
  }))
);

const RollCallList = lazy(() =>
  import("./pages/users/roll_call_list").then((module) => ({
    default: module.default,
  }))
);

const CourierBalance = lazy(() =>
  import("./pages/users/courier_balance").then((module) => ({
    default: module.default,
  }))
);

const CourierEfficiency = lazy(() =>
  import("./pages/users/courier_efficiency").then((module) => ({
    default: module.default,
  }))
);

const OrderBonusPricingList = lazy(() =>
  import("./pages/order_bonus_pricing/list").then((module) => ({
    default: module.default,
  }))
);

const OrderBonusPricingCreate = lazy(() =>
  import("./pages/order_bonus_pricing/create").then((module) => ({
    default: module.default,
  }))
);

const OrderBonusPricingEdit = lazy(() =>
  import("./pages/order_bonus_pricing/edit").then((module) => ({
    default: module.default,
  }))
);

const ConstructedBonusPricingList = lazy(() =>
  import("./pages/constructed_bonus_pricing/list").then((module) => ({
    default: module.default,
  }))
);

const ConstructedBonusPricingCreate = lazy(() =>
  import("./pages/constructed_bonus_pricing/create").then((module) => ({
    default: module.default,
  }))
);

const ConstructedBonusPricingEdit = lazy(() =>
  import("./pages/constructed_bonus_pricing/edit").then((module) => ({
    default: module.default,
  }))
);

const DailyGarantList = lazy(() =>
  import("./pages/daily_garant/list").then((module) => ({
    default: module.default,
  }))
);

const DailyGarantCreate = lazy(() =>
  import("./pages/daily_garant/create").then((module) => ({
    default: module.default,
  }))
);

const DailyGarantEdit = lazy(() =>
  import("./pages/daily_garant/edit").then((module) => ({
    default: module.default,
  }))
);

const NotificationsList = lazy(() =>
  import("./pages/notifications/list").then((module) => ({
    default: module.default,
  }))
);

const CustomersList = lazy(() =>
  import("./pages/customers/list").then((module) => ({
    default: module.default,
  }))
);

const CustomersShow = lazy(() =>
  import("./pages/customers/show").then((module) => ({
    default: module.default,
  }))
);

const OrderStatusList = lazy(() =>
  import("./pages/order_status/list").then((module) => ({
    default: module.default,
  }))
);

const OrderStatusCreate = lazy(() =>
  import("./pages/order_status/create").then((module) => ({
    default: module.default,
  }))
);

const PermissionsCreate = lazy(() =>
  import("./pages/permissions/create").then((module) => ({
    default: module.default,
  }))
);

const PermissionsList = lazy(() =>
  import("./pages/permissions/list").then((module) => ({
    default: module.default,
  }))
);

const PermissionsEdit = lazy(() =>
  import("./pages/permissions/edit").then((module) => ({
    default: module.default,
  }))
);

const WhereCourierList = lazy(() =>
  import("./pages/users/where_courier_list").then((module) => ({
    default: module.default,
  }))
);

const OrganizationsList = lazy(() =>
  import("./pages/organization/list").then((module) => ({
    default: module.default,
  }))
);

const OrganizationsCreate = lazy(() =>
  import("./pages/organization/create").then((module) => ({
    default: module.default,
  }))
);

const OrganizationsEdit = lazy(() =>
  import("./pages/organization/edit").then((module) => ({
    default: module.default,
  }))
);

const TerminalsList = lazy(() =>
  import("./pages/terminals/list").then((module) => ({
    default: module.default,
  }))
);

const TerminalsCreate = lazy(() =>
  import("./pages/terminals/create").then((module) => ({
    default: module.default,
  }))
);

const TerminalsEdit = lazy(() =>
  import("./pages/terminals/edit").then((module) => ({
    default: module.default,
  }))
);

const DeliveryPricingList = lazy(() =>
  import("./pages/delivery_pricing/list").then((module) => ({
    default: module.default,
  }))
);

const DeliveryPricingCreate = lazy(() =>
  import("./pages/delivery_pricing/create").then((module) => ({
    default: module.default,
  }))
);

const DeliveryPricingEdit = lazy(() =>
  import("./pages/delivery_pricing/edit").then((module) => ({
    default: module.default,
  }))
);

const WorkSchedulesList = lazy(() =>
  import("./pages/work_schedules/list").then((module) => ({
    default: module.default,
  }))
);

const WorkSchedulesCreate = lazy(() =>
  import("./pages/work_schedules/create").then((module) => ({
    default: module.default,
  }))
);

const WorkSchedulesEdit = lazy(() =>
  import("./pages/work_schedules/edit").then((module) => ({
    default: module.default,
  }))
);

const SystemConfigsList = lazy(() =>
  import("./pages/system_configs/list").then((module) => ({
    default: module.default,
  }))
);

const WorkSchedulesReport = lazy(() =>
  import("./pages/work_schedule_entries_report/list").then((module) => ({
    default: module.default,
  }))
);

const CustomTitle = () => {
  return (
    <div className="mx-auto text-white font-bold uppercase text-center my-4 text-2xl">
      Arryt
    </div>
  );
};

const CustomSider = () => {
  return <Sider Title={CustomTitle} />;
};

function App() {
  const { t, i18n } = useTranslation('common');

  const i18nProvider = {
    translate: (key: string, params: object) => t(key, params),
    changeLocale: (lang: string) => i18n.changeLanguage(lang),
    getLocale: () => i18n.language,
  };

  const resources = useMemo(() => {
    const res = [
      {
        name: "home",
        list: "/",
        meta: {
          label: "Главная",
        },
      },
      {
        name: "orders",
        meta: {
          label: "Заказы",
        },
        list: "/orders",
        show: "/orders/show/:id",
      },
      {
        name: "missed_orders",
        meta: {
          label: "Упущенные заказы",
        },
        list: "/missed_orders",
      },
      {
        name: "orders_in_maps",
        meta: {
          label: "Заказы на карте",
        },
        list: "/orders_in_maps",
      },
      {
        name: "orders_garant_report",
        meta: {
          label: "Фин. Гарант",
        },
        list: "/orders_garant_report",
      },
      {
        name: "yuriy_orders_garant_report",
        meta: {
          label: "Гарант",
          resource: "orders_garant_report",
        },
        list: "/yuriy_orders_garant_report",
        // identifier: 'orders_garant_report',
      },
      {
        name: "users",
        list: "/users",
        create: "/users/create",
        edit: "/users/edit/:id",
        show: "/users/show/:id",
        meta: {
          label: "Список пользователей",
        },
      },
      {
        name: "roll_call",
        meta: {
          label: "Перекличка",
        },
        list: "/roll_call",
      },
      {
        name: "courier_balance",
        meta: {
          label: "Кошелёк",
        },
        list: "/courier_balance",
      },
      {
        name: "manager_withdraw",
        meta: {
          label: "Выплаты курьеров",
        },
        list: "/manager_withdraw",
      },
      {
        name: "courier_efficiency",
        list: "/courier_efficiency",
        meta: {
          label: "Эффективность курьера",
        },
      },
      {
        name: "order_bonus_pricing",
        meta: {
          label: "Условия бонуса за заказ",
        },
        list: "/order_bonus_pricing",
        create: "/order_bonus_pricing/create",
        edit: "/order_bonus_pricing/edit/:id",
      },
      {
        name: "constructed_bonus_pricing",
        meta: {
          label: "Новые Условия бонуса за заказ",
        },
        list: "/constructed_bonus_pricing",
        create: "/constructed_bonus_pricing/create",
        edit: "/constructed_bonus_pricing/edit/:id",
      },
      {
        name: "daily_garant",
        meta: {
          label: "Дневной гарант",
        },
        list: "/daily_garant",
        create: "/daily_garant/create",
        edit: "/daily_garant/edit/:id",
      },
      {
        name: "notifications",
        list: "/notifications",
        meta: {
          label: "Рассылки",
        },
      },
      {
        name: "orders-group",
        meta: {
          label: "Заказы",
        },
      },
      {
        name: "customers",
        meta: {
          label: "Клиенты",
          parent: "orders-group",
        },
        list: "/customers",
        show: "/customers/show/:id",
      },
      {
        name: "order_status",
        meta: {
          label: "Статусы заказов",
          parent: "orders-group",
        },
        list: "/order_status",
        create: "/order_status/create",
        edit: "/order_status/edit/:id",
      },
      {
        name: "users-group",
        meta: {
          label: "Пользователи",
        },
      },
      {
        name: "roles",
        list: "/roles",
        create: "/roles/create",
        edit: "/roles/edit/:id",
        show: "/roles/show/:id",
        meta: {
          label: "Роли",
          parent: "users-group",
        },
      },
      {
        name: "permissions",
        list: "/permissions",
        edit: "/permissions/edit/:id",
        create: "/permissions/create",
        meta: {
          label: "Разрешения",
          parent: "users-group",
        },
      },
      {
        name: "where_courier",
        list: "/where_courier",
        meta: {
          label: "Где курьер",
          parent: "users-group",
        },
      },
      {
        name: "organizations_menu",
        meta: {
          label: "Организации",
        },
      },
      {
        name: "organization",
        meta: {
          label: "Список организации",
          parent: "organizations_menu",
        },
        list: "/organizations",
        create: "/organizations/create",
        edit: "/organizations/edit/:id",
      },
      {
        name: "terminals",
        meta: {
          label: "Филиалы",
          parent: "organizations_menu",
        },
        list: "/terminals",
        create: "/terminals/create",
        edit: "/terminals/edit/:id",
      },
      {
        name: "delivery_pricing",
        meta: {
          label: "Условия доставки",
          parent: "organizations_menu",
        },
        list: "/delivery_pricing",
        create: "/delivery_pricing/create",
        edit: "/delivery_pricing/edit/:id",
      },
      {
        name: "time_management",
        meta: {
          label: "Время и отчёты",
        },
      },
      {
        name: "work_schedules",
        meta: {
          label: "Рабочие графики",
          parent: "time_management",
        },
        list: "/work_schedules",
        create: "/work_schedules/create",
        edit: "/work_schedules/edit/:id",
      },
      // {
      //   name: "work_schedule_entries_report",
      //   meta: {
      //     label: "Отчёт по рабочим графикам",
      //     parent: "time_management",
      //   },
      //   list: "/work_schedule_entries_report",
      // },
      {
        name: "settings",
        options: {
          label: "Настройки",
        },
      },
      {
        name: "api_tokens",
        meta: {
          label: "API Токены",
          parent: "settings",
        },
        list: "/api_tokens",
        create: "/api_tokens/create",
      },
      {
        name: "system_configs",
        meta: {
          label: "Системные настройки",
          parent: "settings",
        },
        list: "/system_configs",
      },
    ];

    if (import.meta.env.VITE_GRAPHQL_API_DOMAIN === "api.arryt.uz") {
      res.push({
        name: "brands",
        meta: {
          label: "Бренды",
          parent: "settings",
        },
        list: "/brands",
        create: "/brands/create",
        edit: "/brands/edit/:id",
      });
    }
    return res;
  }, []);

  useEffect(() => {
    if (navigator !== undefined) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data.type === "openWindow") {
          window.open(event.data.url);
        }
      });
    }

    return () => {
      if (navigator !== undefined) {
        navigator.serviceWorker.removeEventListener("message", () => {});
      }
    };
  }, []);

  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <AntdApp>
          <Refine
            notificationProvider={notificationProvider}
            options={{
              syncWithLocation: true,

              reactQuery: {
                clientConfig: queryClient,
              },
              disableTelemetry: true,
              projectId: "7UjA0s-GtR2fw-90I5AE",
            }}
            accessControlProvider={{
              can: async ({ action, params, resource }: CanParams) => {
                if (
                  action === "list" &&
                  Object.values({ ...params }).length === 0
                ) {
                  return Promise.resolve({
                    can: true,
                  });
                }
                if (!params?.resource?.route) {
                  return Promise.resolve({
                    can: true,
                  });
                }

                if (
                  params?.resource?.children &&
                  params?.resource?.children.length > 0 &&
                  !params?.resource?.parentName
                ) {
                  return Promise.resolve({
                    can: true,
                  });
                }

                if (resource && ["home", "orders_in_maps"].includes(resource)) {
                  return Promise.resolve({
                    can: true,
                  });
                }
                const token = localStorage.getItem(TOKEN_KEY);
                if (token) {
                  let password = import.meta.env.VITE_CRYPTO_KEY!;
                  const encryptedMessage = await openpgp.readMessage({
                    armoredMessage: token,
                  });
                  const { data: decrypted } = await openpgp.decrypt({
                    message: encryptedMessage,
                    passwords: [password], // decrypt with password
                    format: "binary", // output as Uint8Array
                  });

                  // binary to string
                  const decryptedString = new TextDecoder().decode(decrypted);

                  var decryptedData = JSON.parse(decryptedString);
                  const {
                    access: { additionalPermissions },
                  } = decryptedData;
                  let resourceName =
                    params?.resource?.meta?.resource ?? resource;
                  return Promise.resolve({
                    can: additionalPermissions.includes(
                      `${resourceName}.${action}`
                    ),
                    reason: additionalPermissions.includes(
                      `${resourceName}.${action}`
                    )
                      ? undefined
                      : "You are not allowed to do this",
                  });
                }
                return Promise.resolve({
                  can: true,
                });
              },
            }}
            routerProvider={routerProvider}
            dataProvider={edenDataProvider}
            authProvider={authProvider}
            i18nProvider={i18nProvider}
            // syncWithLocation={true}
            resources={resources}
          >
            <Routes>
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route
                element={
                  <Authenticated
                    key="authenticated-inner"
                    fallback={<CatchAllNavigate to="/login" />}
                  >
                    <ThemedLayoutV2 Sider={CustomSider}>
                      <Suspense fallback={<div>Loading...</div>}>
                        <Outlet />
                      </Suspense>
                    </ThemedLayoutV2>
                  </Authenticated>
                }
              >
                <Route index element={<MainPage />} />
                <Route path="/orders">
                  <Route
                    index
                    element={
                      <Suspense fallback={<div>Loading...</div>}>
                        <OrdersList />
                      </Suspense>
                    }
                  />
                  <Route
                    path="show/:id"
                    element={
                      <Suspense fallback={<div>Loading...</div>}>
                        <OrdersShow />
                      </Suspense>
                    }
                  />
                </Route>
                <Route path="/orders_in_maps">
                  <Route index element={<OrdersInMaps />} />
                </Route>
                <Route path="/missed_orders">
                  <Route index element={<MissedOrdersList />} />
                </Route>
                <Route
                  path="/orders_garant_report"
                  element={<OrdersGarantReport />}
                />
                <Route
                  path="/yuriy_orders_garant_report"
                  element={<YuriyOrdersGarantReport />}
                />
                <Route path="/manager_withdraw">
                  <Route index element={<ManagerWithdrawList />} />
                </Route>
                <Route path="/users">
                  <Route index element={<UsersList />} />
                  <Route path="show/:id" element={<UsersShow />} />
                  <Route path="create" element={<UsersCreate />} />
                  <Route path="edit/:id" element={<UsersEdit />} />
                </Route>
                <Route path="/roll_call">
                  <Route index element={<RollCallList />} />
                </Route>
                <Route path="/courier_balance">
                  <Route index element={<CourierBalance />} />
                </Route>
                <Route path="/courier_efficiency">
                  <Route index element={<CourierEfficiency />} />
                </Route>
                <Route path="/customers">
                  <Route index element={<CustomersList />} />
                  <Route path="show/:id" element={<CustomersShow />} />
                </Route>
                <Route path="/order_status">
                  <Route index element={<OrderStatusList />} />
                  <Route path="create" element={<OrderStatusCreate />} />
                  <Route path="edit/:id" element={<OrderStatusEdit />} />
                </Route>
                <Route path="/roles">
                  <Route index element={<RolesList />} />
                  <Route path="create" element={<RolesCreate />} />
                  <Route path="edit/:id" element={<RolesEdit />} />
                  <Route path="show/:id" element={<RolesShow />} />
                </Route>
                <Route path="/permissions">
                  <Route index element={<PermissionsList />} />
                  <Route path="create" element={<PermissionsCreate />} />
                  <Route path="edit/:id" element={<PermissionsEdit />} />
                </Route>
                <Route path="/where_courier">
                  <Route index element={<WhereCourierList />} />
                </Route>
                <Route path="/organizations">
                  <Route index element={<OrganizationsList />} />
                  <Route path="create" element={<OrganizationsCreate />} />
                  <Route path="edit/:id" element={<OrganizationsEdit />} />
                </Route>
                <Route path="/terminals">
                  <Route index element={<TerminalsList />} />
                  <Route path="create" element={<TerminalsCreate />} />
                  <Route path="edit/:id" element={<TerminalsEdit />} />
                </Route>
                <Route path="/delivery_pricing">
                  <Route index element={<DeliveryPricingList />} />
                  <Route path="create" element={<DeliveryPricingCreate />} />
                  <Route path="edit/:id" element={<DeliveryPricingEdit />} />
                </Route>
                <Route path="/order_bonus_pricing">
                  <Route index element={<OrderBonusPricingList />} />
                  <Route path="create" element={<OrderBonusPricingCreate />} />
                  <Route path="edit/:id" element={<OrderBonusPricingEdit />} />
                </Route>
                <Route path="/constructed_bonus_pricing">
                  <Route index element={<ConstructedBonusPricingList />} />
                  <Route
                    path="create"
                    element={<ConstructedBonusPricingCreate />}
                  />
                  <Route
                    path="edit/:id"
                    element={<ConstructedBonusPricingEdit />}
                  />
                </Route>
                <Route path="/work_schedules">
                  <Route index element={<WorkSchedulesList />} />
                  <Route path="create" element={<WorkSchedulesCreate />} />
                  <Route path="edit/:id" element={<WorkSchedulesEdit />} />
                </Route>
                <Route path="/work_schedule_entries_report">
                  <Route index element={<WorkSchedulesReport />} />
                </Route>
                <Route path="/api_tokens">
                  <Route
                    index
                    element={
                      <Suspense fallback={<div>Loading...</div>}>
                        <ApiTokensList />
                      </Suspense>
                    }
                  />
                  <Route
                    path="create"
                    element={
                      <Suspense fallback={<div>Loading...</div>}>
                        <ApiTokensCreate />
                      </Suspense>
                    }
                  />
                </Route>
                <Route path="/system_configs">
                  <Route
                    index
                    element={
                      <Suspense fallback={<div>Loading...</div>}>
                        <SystemConfigsList />
                      </Suspense>
                    }
                  />
                </Route>
                <Route path="/brands">
                  <Route
                    index
                    element={
                      <Suspense fallback={<div>Loading...</div>}>
                        <BrandsList />
                      </Suspense>
                    }
                  />
                  <Route
                    path="create"
                    element={
                      <Suspense fallback={<div>Loading...</div>}>
                        <BrandsCreate />
                      </Suspense>
                    }
                  />
                  <Route
                    path="edit/:id"
                    element={
                      <Suspense fallback={<div>Loading...</div>}>
                        <BrandsEdit />
                      </Suspense>
                    }
                  />
                </Route>
                <Route path="/notifications">
                  <Route index element={<NotificationsList />} />
                  {/* <Route path="create" element={<NotificationsCreate />} />
                    <Route path="edit/:id" element={<NotificationsEdit />} /> */}
                </Route>
                <Route path="/daily_garant">
                  <Route index element={<DailyGarantList />} />
                  <Route path="create" element={<DailyGarantCreate />} />
                  <Route path="edit/:id" element={<DailyGarantEdit />} />
                </Route>
                <Route path="*" element={<ErrorComponent />} />
              </Route>
              <Route
                element={
                  <Authenticated
                    key="authenticated-outer"
                    fallback={<Outlet />}
                  >
                    <NavigateToResource />
                  </Authenticated>
                }
              >
                <Route path="/login" element={<Login />} />
              </Route>
            </Routes>

            <ReactQueryDevtools initialIsOpen={false} />
            <RefineKbar />
          </Refine>
        </AntdApp>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
