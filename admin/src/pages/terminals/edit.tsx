import { useForm, Edit } from "@refinedev/antd";
import { Form, Input, Switch, Row, Col, InputNumber, Select } from "antd";
import { useGetIdentity } from "@refinedev/core";
import { useEffect, useState } from "react";
import { sortBy } from "lodash";
import { apiClient } from "@admin/src/eden";
import { terminals } from "@api/drizzle/schema";
import { InferSelectModel } from "drizzle-orm";

export default function TerminalsEdit() {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const [terminalsList, setTerminals] = useState<
    InferSelectModel<typeof terminals>[]
  >([]);
  const { formProps, saveButtonProps } = useForm<
    InferSelectModel<typeof terminals>
  >({
    meta: {
      fields: [
        "id",
        "name",
        "active",
        "created_at",
        "organization_id",
        "linked_terminal_id",
        "phone",
        "latitude",
        "longitude",
        "external_id",
        "manager_name",
        "address",
        "fuel_bonus",
        "time_to_yandex",
        "allow_close_anywhere",
        "region",
      ],
      pluralize: true,
      updateInputName: "terminalsUncheckedUpdateInput",
      requestHeaders: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    },
  });

  const fetchOrganizations = async () => {
    const { data: organizations } = await apiClient.api.terminals.cached.get({
      $fetch: {
        headers: {
          Authorization: `Bearer ${identity?.token.accessToken}`,
        },
      },
    });
    if (organizations && Array.isArray(organizations)) {
      setTerminals(sortBy(organizations, (item) => item.name));
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item
          label="Активность"
          name="active"
          rules={[
            {
              required: true,
            },
          ]}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="Разрешить закрытие заказа в любом месте"
          name="allow_close_anywhere"
          rules={[
            {
              required: true,
            },
          ]}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="Выдавать на топливо"
          name="fuel_bonus"
          rules={[
            {
              required: true,
            },
          ]}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
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
          <Form.Item label="Региональность" name="region">
              <Select showSearch optionFilterProp="children">
                <Select.Option value="capital">Столица</Select.Option>
                <Select.Option value="region">Регион</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        {/* <Form.Item
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
        </Form.Item> */}
        <Form.Item label="Адрес" name="address">
          <Input />
        </Form.Item>
        <Form.Item label="Менеджер" name="manager_name">
          <Input />
        </Form.Item>
        <Form.Item label="Телефон" name="phone">
          <Input />
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Широта"
              name="latitude"
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <InputNumber type="number" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Долгота"
              name="longitude"
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <InputNumber type="number" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item label="Филиал" name="linked_terminal_id">
              <Select showSearch optionFilterProp="children">
                {terminalsList.map((terminal) => (
                  <Select.Option key={terminal.id} value={terminal.id}>
                    {terminal.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Минуты до отправки Яндексом"
              name="time_to_yandex"
              extra="Если не указать минуты или указать 0, то по-умолчанию будет 15 мин."
            >
              <InputNumber />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="Внешний идентификатор" name="external_id">
          <Input disabled />
        </Form.Item>
      </Form>
    </Edit>
  );
}
