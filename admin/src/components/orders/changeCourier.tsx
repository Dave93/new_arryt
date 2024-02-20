import { Button, Modal, Select, Tooltip } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { FC, useState } from "react";
import { IUsers } from "@admin/src/interfaces";
import { gql } from "graphql-request";
import { client } from "@admin/src/graphConnect";
import { useGetIdentity } from "@refinedev/core";
import { apiClient } from "@admin/src/eden";

interface ChangeOrderProps {
  id?: string;
  terminal_id?: string;
}

export const ChangeOrdersCouirer: FC<ChangeOrderProps> = ({
  id,
  terminal_id,
}) => {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [couriers, setCouriers] = useState<IUsers[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<string>();

  const changeCourier = async () => {
    setConfirmLoading(true);

    const data = await apiClient.api.orders[id].assign.post({
      courier_id: selectedCourier,
      $headers: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    });
    window.location.reload();
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const loadCouriers = async () => {
    const { data } = await apiClient.api.couriers.for_terminal.get({
      $query: {
        terminal_id,
      },
      $headers: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    });

    if (data && Array.isArray(data)) {
      setCouriers(data);
    }
  };

  const showModal = () => {
    setIsModalOpen(true);
    loadCouriers();
  };

  return (
    <>
      <Tooltip title="Изменить">
        <Button
          shape="circle"
          icon={<EditOutlined />}
          size="small"
          danger
          onClick={showModal}
        />
      </Tooltip>
      <Modal
        title="Изменить курьера"
        visible={isModalOpen}
        okText="Изменить"
        cancelText="Отмена"
        onOk={changeCourier}
        confirmLoading={confirmLoading}
        onCancel={handleCancel}
      >
        <Select
          showSearch
          placeholder="Выберите курьера"
          optionFilterProp="children"
          onChange={(value) => setSelectedCourier(value)}
          filterOption={(input, option) =>
            (option!.label as unknown as string)
              .toLowerCase()
              .includes(input.toLowerCase())
          }
          options={couriers.map((courier) => ({
            value: courier.id,
            label: `${courier.first_name} ${courier.last_name}`,
          }))}
        />
      </Modal>
    </>
  );
};
