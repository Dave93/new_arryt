import { DevtoolsProvider, DevtoolsPanel } from "@refinedev/devtools";
import { Authenticated, CanParams, Refine } from "@refinedev/core";
import { notificationProvider, ErrorComponent } from "@refinedev/antd";

import "@refinedev/antd/dist/reset.css";
import "./styles/main.css";

import routerProvider, {
  CatchAllNavigate,
  NavigateToResource,
} from "@refinedev/react-router-v6";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import { useTranslation } from "react-i18next";
import { authProvider, TOKEN_KEY } from "./authProvider";
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  split,
  HttpLink,
} from "@apollo/client";
import {
  ApiTokensCreate,
  ApiTokensList,
  OrderStatusEdit,
} from "@admin/src/pages/api_tokens";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import { useEffect, useMemo } from "react";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { RolesCreate, RolesEdit, RolesList, RolesShow } from "./pages/roles";
import { getMainDefinition } from "@apollo/client/utilities";
import queryClient from "./dataprovider/reactQueryClient";
import { BrandsList, BrandsCreate, BrandsEdit } from "./pages/brands";
import {
  ConstructedBonusPricingList,
  ConstructedBonusPricingCreate,
  ConstructedBonusPricingEdit,
} from "./pages/constructed_bonus_pricing";
import { CustomersList, CustomersShow } from "./pages/customers";
import {
  DailyGarantList,
  DailyGarantCreate,
  DailyGarantEdit,
} from "./pages/daily_garant";
import {
  DeliveryPricingList,
  DeliveryPricingCreate,
  DeliveryPricingEdit,
} from "./pages/delivery_pricing";
import { Login } from "./pages/login";
import { MainPage } from "./pages/main/list";
import { ManagerWithdrawList } from "./pages/manager_withdraw";
import MissedOrdersList from "./pages/missed_orders/list";
import NotificationsList from "./pages/notifications/list";
import {
  OrderBonusPricingList,
  OrderBonusPricingCreate,
  OrderBonusPricingEdit,
} from "./pages/order_bonus_pricing";
import { OrderStatusList, OrderStatusCreate } from "./pages/order_status";
import { OrdersList } from "./pages/orders";
import OrdersGarantReport from "./pages/orders/orders_garant_report";
import { OrdersShow } from "./pages/orders/show";
import YuriyOrdersGarantReport from "./pages/orders/yuriy_orders_garant_report";
import {
  OrganizationList,
  OrganizationsCreate,
  OrganizationsEdit,
} from "./pages/organization";
import {
  PermissionsList,
  PermissionsCreate,
  PermissionsEdit,
} from "./pages/permissions";
import PrivacyPage from "./pages/privacy";
import { SystemConfigsList } from "./pages/system_configs/list";
import {
  TerminalsList,
  TerminalsCreate,
  TerminalsEdit,
} from "./pages/terminals";
import { UsersList, UsersCreate, UsersEdit } from "./pages/users";
import CourierBalance from "./pages/users/courier_balance";
import CourierEfficiency from "./pages/users/courier_efficiency";
import { RollCallList } from "./pages/users/roll_call_list";
import UsersShow from "./pages/users/show";
import WhereCourierList from "./pages/users/where_courier_list";
import { WorkSchedulesReport } from "./pages/work_schedule_entries_report";
import {
  WorkSchedulesList,
  WorkSchedulesCreate,
  WorkSchedulesEdit,
} from "./pages/work_schedules";
import { ThemedLayoutV2 } from "@refinedev/antd";
import { edenDataProvider } from "./dataprovider/edenDataProvider";
import { App as AntdApp } from "antd";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import * as openpgp from "openpgp";

const httpLink = new HttpLink({
  uri: `https://${import.meta.env.VITE_GRAPHQL_API_DOMAIN!}/graphql`,
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: `wss://${import.meta.env.VITE_GRAPHQL_API_DOMAIN!}/ws`,
  })
);

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === "OperationDefinition" &&
      definition.operation === "subscription"
    );
  },
  wsLink,
  httpLink
);

const gqlClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

function App() {
  const { t, i18n } = useTranslation();

  const i18nProvider = {
    translate: (key: string, params: object) => t(key, params),
    changeLocale: (lang: string) => i18n.changeLanguage(lang),
    getLocale: () => i18n.language,
  };

  const resources = useMemo(() => {
    const res = [
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

  console.log("app");
  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <ApolloProvider client={gqlClient}>
          <AntdApp>
            <DevtoolsProvider>
              <Refine
                notificationProvider={notificationProvider}
                options={{
                  syncWithLocation: true,

                  reactQuery: {
                    clientConfig: queryClient,
                  },

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

                    if (resource === "dashboard") {
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
                      const decryptedString = new TextDecoder().decode(
                        decrypted
                      );

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
                        <ThemedLayoutV2>
                          <Outlet />
                        </ThemedLayoutV2>
                      </Authenticated>
                    }
                  >
                    <Route index element={<MainPage />} />
                    <Route path="/orders">
                      <Route index element={<OrdersList />} />
                      <Route path="show/:id" element={<OrdersShow />} />
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
                      <Route index element={<OrganizationList />} />
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
                      <Route
                        path="create"
                        element={<DeliveryPricingCreate />}
                      />
                      <Route
                        path="edit/:id"
                        element={<DeliveryPricingEdit />}
                      />
                    </Route>
                    <Route path="/order_bonus_pricing">
                      <Route index element={<OrderBonusPricingList />} />
                      <Route
                        path="create"
                        element={<OrderBonusPricingCreate />}
                      />
                      <Route
                        path="edit/:id"
                        element={<OrderBonusPricingEdit />}
                      />
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
                      <Route index element={<ApiTokensList />} />
                      <Route path="create" element={<ApiTokensCreate />} />
                    </Route>
                    <Route path="/system_configs">
                      <Route index element={<SystemConfigsList />} />
                    </Route>
                    <Route path="/brands">
                      <Route index element={<BrandsList />} />
                      <Route path="create" element={<BrandsCreate />} />
                      <Route path="edit/:id" element={<BrandsEdit />} />
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
              <DevtoolsPanel />
            </DevtoolsProvider>
          </AntdApp>
        </ApolloProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
