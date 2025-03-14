import { Edit, useForm } from "@refinedev/antd";
import { Col, Form, Input, InputNumber, Row, Switch } from "antd";
import { useGetIdentity } from "@refinedev/core";

import { useEffect, useState } from "react";
import { Colorpicker } from "antd-colorpicker";
import { apiClient } from "@admin/src/eden";
import { order_status, organization } from "@api/drizzle/schema";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";

export default function OrderStatusEdit() {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const { formProps, saveButtonProps, id } = useForm<
    InferInsertModel<typeof order_status>
  >({
    meta: {
      fields: [
        "id",
        "name",
        "sort",
        "color",
        "organization_id",
        "finish",
        "cancel",
        "waiting",
        "need_location",
        "on_way",
        "in_terminal",
        "yandex_delivery_statuses",
        "code",
        "status_change_text",
      ],
      updateOperation: "updateOneOrderStatus",
      pluralize: true,
      requestHeaders: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    },
  });

  const [organizations, setOrganizations] = useState<
    InferSelectModel<typeof organization>[]
  >([]);

  const fetchOrganizations = async () => {
    const { data: organizations } =
      await apiClient.api.organizations.cached.get({
        $fetch: {
          headers: {
            Authorization: `Bearer ${identity?.token.accessToken}`,
          },
        },
      });
    if (organizations && Array.isArray(organizations)) {
      setOrganizations([...organizations]);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [identity]);

  return (
    <Edit saveButtonProps={saveButtonProps} title="Редактировать статус заказа">
      <Form
        {...formProps}
        layout="vertical"
        initialValues={{
          ...formProps.initialValues,
          color: formProps?.initialValues?.color ?? "#fff",
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Название"
              name="name"
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Статусы Яндекс.Доставки"
              name="yandex_delivery_statuses"
            >
              <Input />
            </Form.Item>
          </Col>

          {/* <Col span={12}>
            <Form.Item
              label="Организация"
              name="organization_id"
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Select showSearch optionFilterProp="children">
                {organizations.map((organization) => (
                  <Select.Option key={organization.id} value={organization.id}>
                    {organization.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col> */}
        </Row>
        <Row gutter={16}>
          <Col span={4}>
            <Form.Item
              label="Сортировка"
              name="sort"
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <InputNumber />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item label="Цвет" name="color">
              <Colorpicker
                popup
                onColorResult={(color) => color.hex}
                picker={"PhotoshopPicker"}
              />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item label="Код" name="code">
              <Input />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item label="Текст уведомления" name="status_change_text">
              <Input />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item
              label="Завершающий"
              name="finish"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item label="Отменяющий" name="cancel" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item label="Ожидающий" name="waiting" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item
              label="Требует местоположение"
              name="need_location"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item
              label="В филиале"
              name="in_terminal"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item label="В пути" name="on_way" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Edit>
  );
}
