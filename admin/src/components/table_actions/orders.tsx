import { Alert, Button, Col, Row, Select, Space } from "antd";
import { useCan, useGetIdentity } from "@refinedev/core";
import { IOrders, IOrderStatus } from "@admin/src/interfaces";
import { FC, useState } from "react";
import { OrdersWithRelations } from "@api/src/modules/orders/dtos/list.dto";
import { order_status } from "@api/drizzle/schema";
import { InferSelectModel } from "drizzle-orm";
import { apiClient } from "@admin/src/eden";

interface IOrdersTableActionsProps {
  selectedOrders: OrdersWithRelations[] | undefined;
  onFinishAction: () => void;
}

export const OrdersTableActions: FC<IOrdersTableActionsProps> = ({
  selectedOrders,
  onFinishAction,
}) => {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [orderStatuses, setOrderStatuses] = useState<
    InferSelectModel<typeof order_status>[]
  >([]);
  const [chosenStatusId, setChosenStatusId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [enabledApply, setEnabledApply] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleActionChange = (value: string) => {
    setErrorMessage(null);
    changeOrdersStatus(null);
    setCurrentAction(value);
    if (value === "change_status") {
      loadOrderStatuses();
    }
  };

  const loadOrderStatuses = async () => {
    let organizations: any = {};
    selectedOrders?.forEach((order) => {
      organizations[order.organization.id] = order.organization.name;
    });
    if (Object.keys(organizations).length > 1) {
      setErrorMessage(
        "Вы не можете изменить статус заказов из разных организаций"
      );
      return;
    }
    const organizationId = Object.keys(organizations)[0];

    const { data } = await apiClient.api.order_status.cached.get({
      $query: {
        organization_id: organizationId,
      },
      $headers: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    });
    setErrorMessage(null);
    if (data && Array.isArray(data)) {
      setOrderStatuses(data);
    }
  };

  const changeOrdersStatus = async (statusId: string | null) => {
    setChosenStatusId(statusId);
    setEnabledApply(true);
  };

  const applyStatusChange = async () => {
    setErrorMessage(null);
    // const { query, variables } = gqlb.mutation({
    //   operation: "changeMultipleOrderStatus",
    //   variables: {
    //     orderIds: {
    //       value: selectedOrders?.map((order) => order.id),
    //       type: "[String!]!",
    //     },
    //     orderStatusId: {
    //       value: chosenStatusId,
    //       type: "String!",
    //     },
    //   },
    //   fields: ["id"],
    // });
    // const response = await client.request(query, variables, {
    //   Authorization: `Bearer ${identity?.token.accessToken}`,
    // });
    // setChosenStatusId(null);
    onFinishAction();
  };

  const applyChanges = async () => {
    setLoading(true);
    if (currentAction === "change_status") {
      await applyStatusChange();
    }
    setLoading(false);
    setEnabledApply(false);
    setCurrentAction(null);
  };

  const { data: ordersChangeMultipleStatus } = useCan({
    resource: "orders",
    action: "change_multiple_status",
  });

  return (
    <div>
      <Space>
        <Select
          placeholder="Выбрать действие"
          onChange={(value: string) => handleActionChange(value)}
          disabled={selectedOrders?.length === 0}
          allowClear
        >
          <Select.Option
            value="change_status"
            disabled={ordersChangeMultipleStatus?.can === false}
          >
            Сменить статус
          </Select.Option>
        </Select>
        {currentAction === "change_status" &&
          orderStatuses.length &&
          orderStatuses.length > 0 && (
            <div>
              <Select
                placeholder="Выбрать статус"
                onChange={changeOrdersStatus}
                disabled={selectedOrders?.length === 0}
              >
                {orderStatuses.map((orderStatus) => (
                  <Select.Option value={orderStatus.id}>
                    {orderStatus.name}
                  </Select.Option>
                ))}
              </Select>
            </div>
          )}
        {errorMessage && <Alert message={errorMessage} type="error" />}
        {!errorMessage && enabledApply && (
          <Button type="primary" onClick={applyChanges} loading={loading}>
            Применить
          </Button>
        )}
      </Space>
    </div>
  );
};
