import { Button, Space } from "antd";
import React, { useState } from "react";
import { gql } from "graphql-request";
import { client } from "@admin/src/graphConnect";
import { useQueryClient } from "@tanstack/react-query";
import { useNotification } from "@refinedev/core";
import { IOrders } from "@admin/src/interfaces";
import { sleep } from "radash";
import { apiClient } from "@admin/src/eden";

export const SendOrderToYandex = ({
  order,
  token,
}: {
  order: IOrders;
  token: string;
}) => {
  const queryClient = useQueryClient();
  const { open } = useNotification();
  const [isLoading, setIsLoading] = useState(false);

  // const sendToYandex = async (id: string) => {
  //   try {
  //     setIsLoading(true);
  //     const query = gql`
  //       mutation ($id: String!) {
  //         checkPriceOrderToYandex(id: $id)
  //       }
  //     `;
  //     await client.request(
  //       query,
  //       { id },
  //       {
  //         Authorization: `Bearer ${token}`,
  //       }
  //     );
  //   } catch (e: any) {
  //     setIsLoading(false);
  //     open!({
  //       type: "error",
  //       message: e.message,
  //     });
  //   }

  //   await sleep(300);
  //   queryClient.invalidateQueries(["default", "missed_orders", "list"]);
  //   await sleep(100);
  //   setIsLoading(false);
  //   queryClient.invalidateQueries(["default", "missed_orders", "list"]);
  // };

  const cancelYandex = async (id: string) => {
    try {
      setIsLoading(true);
      const query = gql`
        mutation ($id: String!) {
          cancelOrderToYandex(id: $id)
        }
      `;
      await client.request(
        query,
        { id },
        {
          Authorization: `Bearer ${token}`,
        }
      );
      // setIsLoading(false);
    } catch (e: any) {
      setIsLoading(false);
      open!({
        type: "error",
        message: e.message,
      });
    }
    await sleep(1000);
    setIsLoading(false);
    queryClient.invalidateQueries(["default", "missed_orders", "list"]);
  };

  const approveYandex = async (id: string) => {
    try {
      setIsLoading(true);
      // @ts-ignore
      await apiClient.api.missed_orders.send_yandex.post({
        id,
        $headers: { Authorization: `Bearer ${token}` },
      });
      // const query = gql`
      //   mutation ($id: String!) {
      //     sendToYandexWithApprove(id: $id)
      //   }
      // `;
      // await client.request(
      //   query,
      //   { id },
      //   {
      //     Authorization: `Bearer ${token}`,
      //   }
      // );
    } catch (e: any) {
      setIsLoading(false);
      open!({
        type: "error",
        message: e.message,
      });
    }
    // await sleep(500);
    // queryClient.invalidateQueries(["default", "missed_orders", "list"]);
    // await sleep(100);
    // setIsLoading(false);
    queryClient.invalidateQueries(["default", "missed_orders", "list"]);
  };
  return (
    <Button
      type="primary"
      shape="round"
      size="small"
      loading={isLoading}
      onClick={() => approveYandex(order.id)}
    >
      Отправить Яндексом
    </Button>
  );
};
