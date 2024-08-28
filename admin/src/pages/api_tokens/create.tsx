import { Create, useForm } from "@refinedev/antd";
import { Button, Col, Form, Input, Row, Select, Switch } from "antd";
import { useGetIdentity } from "@refinedev/core";

import { useEffect, useState } from "react";
import { api_tokens, organization } from "@api/drizzle/schema";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { apiClient } from "@admin/src/eden";

export const ApiTokensCreate = () => {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const { formProps, saveButtonProps } = useForm<
    typeof api_tokens.$inferSelect
  >({
    meta: {
      fields: ["id", "active", "token", "organization_id"],
      pluralize: true,
      requestHeaders: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    },
  });

  const [organizations, setOrganizations] = useState<
    (typeof organization.$inferSelect)[]
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
      setOrganizations(organizations);
    }
  };

  const generateToken = () => {
    // generate token with length 50
    const token =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    formProps?.form?.setFieldsValue({ token });
  };

  useEffect(() => {
    fetchOrganizations();
  }, [identity]);

  return (
    <Create saveButtonProps={saveButtonProps} title="Создать токен">
      <Form {...formProps} layout="vertical">
        <Form.Item
          name="active"
          label="Активен"
          rules={[{ required: true }]}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Row align="middle" gutter={8}>
              <Col span={18}>
                <Form.Item
                  label="Токен"
                  name="token"
                  rules={[
                    {
                      required: true,
                    },
                  ]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Button type="primary" onClick={generateToken}>
                  Сгенерировать
                </Button>
              </Col>
            </Row>
          </Col>
          <Col span={12}>
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
          </Col>
        </Row>
      </Form>
    </Create>
  );
};
