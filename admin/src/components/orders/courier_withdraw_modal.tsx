import { useState } from "react";

import { Button, InputNumber, Modal } from "antd";

import { useNotification } from "@refinedev/core";
import { WalletStatus } from "@api/src/modules/user/dto/list.dto";
import { apiClient } from "@admin/src/eden";
interface Props {
  order: WalletStatus;
  onWithdraw: () => void;
  identity: any;
}

const CourierWithdrawModal = ({ order, onWithdraw, identity }: Props) => {
  const { open } = useNotification();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(order.balance);

  const handleWithdraw = async () => {
    if (withdrawAmount <= order.balance && withdrawAmount > 0) {
      setIsSubmitting(true);
      try {
        await apiClient.api.couriers.withdraw.post(
          {
            amount: withdrawAmount,
            courier_id: order.courier_id,
            terminal_id: order.terminal_id,
          },
          {
            headers: {
              Authorization: `Bearer ${identity?.token.accessToken}`,
            },
          }
        );
        // const query = gql`
        //     mutation {
        //         withdrawCourierBalance(amount: ${withdrawAmount}, courier_id: "${order.courier_id}", terminal_id: "${order.terminal_id}") {
        //             id
        //         }
        //     }
        // `;
        // await client.request(
        //   query,
        //   {
        //     amount: withdrawAmount,
        //     courier_id: order.courier_id,
        //     terminal_id: order.terminal_id,
        //   },
        //   {
        //     Authorization: `Bearer ${identity?.token.accessToken}`,
        //   }
        // );
        setIsSubmitting(false);
        onWithdraw();
        setIsModalOpen(false);
      } catch (error: any) {
        setIsSubmitting(false);
        open!({
          type: "error",
          message: error.message,
        });
        console.log(error);
      }
    } else {
      setIsModalOpen(false);
    }
    onWithdraw();
  };

  return (
    <>
      <Button color="primary" onClick={() => setIsModalOpen(true)}>
        Списать
      </Button>
      <Modal
        open={isModalOpen}
        confirmLoading={isSubmitting}
        onCancel={() => setIsModalOpen(false)}
        title="Укажите сумму для списания"
        onOk={handleWithdraw}
      >
        <InputNumber
          style={{ width: "100%" }}
          min={0}
          max={order.balance}
          formatter={(value: any) =>
            new Intl.NumberFormat("ru-RU").format(+value)
          }
          defaultValue={order.balance}
          onChange={(value: any) => {
            setWithdrawAmount(value);
          }}
        />
      </Modal>
    </>
  );
};

export default CourierWithdrawModal;
