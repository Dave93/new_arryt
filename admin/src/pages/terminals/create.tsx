import { Create, useForm } from "@refinedev/antd";
import { Col, Form, Input, InputNumber, Row, Select, Switch } from "antd";
import { useGetIdentity } from "@refinedev/core";
import { useEffect, useState } from "react";
import { sortBy } from "lodash";
import { apiClient } from "@admin/src/eden";
import { terminals, organization } from "@api/drizzle/schema";
import { InferSelectModel } from "drizzle-orm";

export default function TerminalsCreate() {
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
        "phone",
        "latitude",
        "longitude",
        "external_id",
      ],
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
    const { data: terminals } = await apiClient.api.terminals.cached.get({
      $fetch: {
        headers: {
          Authorization: `Bearer ${identity?.token.accessToken}`,
        },
      },
    });
    if (terminals && Array.isArray(terminals)) {
      setTerminals(sortBy(terminals, (item) => item.name));
    }
    const { data: organizations } =
      await apiClient.api.organizations.cached.get({
        $fetch: {
          headers: {
            Authorization: `Bearer ${identity?.token.accessToken}`,
          },
        },
      });
    if (organizations && Array.isArray(organizations)) {
      setOrganizations(organizations);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  return (
    <Create saveButtonProps={saveButtonProps} title="Создать филиал">
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
          <Input />
        </Form.Item>
      </Form>
    </Create>
  );
}
