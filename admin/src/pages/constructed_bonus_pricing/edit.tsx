import { Edit, useForm } from "@refinedev/antd";

import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
} from "antd";

import { PlusOutlined, DeleteOutlined, CloseOutlined } from "@ant-design/icons";
import { useGetIdentity } from "@refinedev/core";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import DebounceSelect from "@admin/src/components/select/debounceSelector";
import { apiClient } from "@admin/src/eden";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  constructed_bonus_pricing,
  organization,
  terminals,
} from "@api/drizzle/schema";
import { sortBy } from "lodash";

dayjs.extend(utc);
dayjs.extend(timezone);

dayjs.tz.setDefault("Asia/Tashkent");

export default function ConstructedBonusPricingEdit() {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const { formProps, saveButtonProps } = useForm<
    InferInsertModel<typeof constructed_bonus_pricing>
  >({
    meta: {
      fields: ["id", "name", "organization_id", "pricing"],
      pluralize: true,
      updateInputName: "constructed_bonus_pricingUncheckedUpdateInput",
      requestHeaders: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    },
  });

  const [organizations, setOrganizations] = useState<
    InferSelectModel<typeof organization>[]
  >([]);
  const [terminalsList, setTerminals] = useState<
    InferSelectModel<typeof terminals>[]
  >([]);

  const fetchOrganizations = async () => {
    const { data: terminals } = await apiClient.api.terminals.cached.get({
      $headers: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    });
    if (terminals && Array.isArray(terminals)) {
      setTerminals(sortBy(terminals, (item) => item.name));
    }
    const { data: organizations } =
      await apiClient.api.organizations.cached.get({
        $headers: {
          Authorization: `Bearer ${identity?.token.accessToken}`,
        },
      });
    if (organizations && Array.isArray(organizations)) {
      setOrganizations(organizations);
    }
  };

  const fetchCourier = async (queryText: string) => {
    const { data: users } = await apiClient.api.couriers.search.get({
      $query: {
        search: queryText,
      },
      $headers: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    });
    if (users && Array.isArray(users)) {
      return (
        users?.map((user) => ({
          key: user.id,
          value: user.id,
          label: `${user.first_name} ${user.last_name} (${user.phone})`,
        })) ?? []
      );
    } else {
      return [];
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [identity]);

  return (
    <Edit
      saveButtonProps={saveButtonProps}
      title="Редактировать условие бонуса"
    >
      <Form {...formProps} layout="vertical">
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
        <Form.List name="pricing">
          {(pricingFields, { add, remove }) => {
            return (
              <div>
                {pricingFields.map((pricingField) => (
                  <div
                    key={pricingField.key}
                    // className="border-2 rounded-lg shadow-md px-5 py-4 "
                  >
                    <Card
                      size="small"
                      title=""
                      className="mb-6"
                      extra={
                        <CloseOutlined
                          onClick={() => {
                            remove(pricingField.name);
                          }}
                        />
                      }
                    >
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item
                            label="Филиал"
                            name={[pricingField.name, "terminal_ids"]}
                          >
                            <Select
                              showSearch
                              optionFilterProp="children"
                              allowClear
                              mode="multiple"
                            >
                              {terminalsList.map((terminal) => (
                                <Select.Option
                                  key={terminal.id}
                                  value={terminal.id}
                                >
                                  {terminal.name}
                                </Select.Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            name={[pricingField.name, "courier_id"]}
                            label="Курьер"
                          >
                            <DebounceSelect
                              fetchOptions={fetchCourier}
                              allowClear
                              labelInValue={false}
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.List name={[pricingField.name, "rules"]}>
                        {(fields, { add, remove }) => {
                          return (
                            <div>
                              {fields.map((field, index) => (
                                <Space
                                  key={field.key}
                                  style={{ display: "flex", marginBottom: 8 }}
                                  align="baseline"
                                >
                                  <Form.Item
                                    label="От (км)"
                                    name={[field.name, "distance_from"]}
                                    rules={[
                                      {
                                        required: true,
                                      },
                                    ]}
                                  >
                                    <InputNumber type="number" />
                                  </Form.Item>
                                  <Form.Item
                                    label="До (км)"
                                    name={[field.name, "distance_to"]}
                                    rules={[
                                      {
                                        required: true,
                                      },
                                    ]}
                                  >
                                    <InputNumber type="number" />
                                  </Form.Item>
                                  <Form.Item
                                    label="От (мин)"
                                    name={[field.name, "time_from"]}
                                    rules={[
                                      {
                                        required: true,
                                      },
                                    ]}
                                  >
                                    <InputNumber type="number" />
                                  </Form.Item>
                                  <Form.Item
                                    label="До (мин)"
                                    name={[field.name, "time_to"]}
                                    rules={[
                                      {
                                        required: true,
                                      },
                                    ]}
                                  >
                                    <InputNumber type="number" />
                                  </Form.Item>
                                  <Form.Item
                                    label="Цена"
                                    name={[field.name, "price"]}
                                    rules={[
                                      {
                                        required: true,
                                      },
                                    ]}
                                  >
                                    <InputNumber type="number" />
                                  </Form.Item>
                                  {index > 0 && (
                                    <Form.Item label=" ">
                                      <Button
                                        danger
                                        shape="circle"
                                        icon={<DeleteOutlined />}
                                        onClick={() => {
                                          remove(field.name);
                                        }}
                                      />
                                    </Form.Item>
                                  )}
                                </Space>
                              ))}
                              <Form.Item>
                                <Button
                                  type="dashed"
                                  onClick={() => add()}
                                  block
                                  icon={<PlusOutlined />}
                                >
                                  Добавить условие
                                </Button>
                              </Form.Item>
                            </div>
                          );
                        }}
                      </Form.List>
                    </Card>
                  </div>
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                  >
                    Добавить ценовую категорию
                  </Button>
                </Form.Item>
              </div>
            );
          }}
        </Form.List>
      </Form>
    </Edit>
  );
}
