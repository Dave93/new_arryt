import { Edit, useForm } from "@refinedev/antd";

import {
  Button,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
} from "antd";

import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { useGetIdentity } from "@refinedev/core";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { apiClient } from "@admin/src/eden";
import {
  order_bonus_pricing,
  organization,
  terminals,
} from "@api/drizzle/schema";
import { sortBy } from "lodash";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";

dayjs.extend(utc);
dayjs.extend(timezone);

dayjs.tz.setDefault("Asia/Tashkent");

export default function OrderBonusPricingEdit() {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const { formProps, saveButtonProps } = useForm<
    InferInsertModel<typeof order_bonus_pricing>
  >({
    meta: {
      fields: [
        "id",
        "name",
        "active",
        "created_at",
        "max_order_time",
        "rules",
        "organization_id",
        "terminal_id",
        "min_distance_km",
        "courier_id",
        "terminal_ids",
      ],
      pluralize: true,
      updateInputName: "order_bonus_pricingUncheckedUpdateInput",
      requestHeaders: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    },
  });

  const [organizationsList, setOrganizations] = useState<
    InferSelectModel<typeof organization>[]
  >([]);
  const [terminalsList, setTerminals] = useState<
    InferSelectModel<typeof terminals>[]
  >([]);
  const [aproximatePrice, setAproximatePrice] = useState<number>(0);

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
      setOrganizations([...organizations]);
    }
  };

  const calculateAproximatePrice = (value: any) => {
    let formValues: any = formProps?.form?.getFieldsValue();
    let rules = formValues.rules;
    let price = 0;
    let distance = +value;
    if (rules) {
      rules.forEach((rule: any) => {
        let { from, to, price: rulePrice } = rule;
        if (distance > 0) {
          distance -= +to - +from;
          price += +rulePrice;
        }
      });
      if (distance > 0) {
        let additional = 0;
        const decimals = +(distance % 1).toFixed(3) * 1000;

        if (decimals > 0 && decimals < 250) {
          additional = 500;
        } else if (decimals >= 250 && decimals < 500) {
          additional = 1000;
        } else if (decimals >= 500 && decimals < 1000) {
          additional = 1500;
        }
        const pricePerKm = Math.floor(distance) * formValues.price_per_km;
        price += pricePerKm + additional;
      }
    }
    setAproximatePrice(price);
  };

  useEffect(() => {
    fetchOrganizations();
  }, [identity]);

  return (
    <Edit
      saveButtonProps={saveButtonProps}
      title="Редактировать условие доставки"
    >
      <Form {...formProps} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
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
          </Col>
        </Row>
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
        </Row>
        <Row gutter={16}>
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
                {organizationsList.map((organization) => (
                  <Select.Option key={organization.id} value={organization.id}>
                    {organization.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Филиал" name="terminal_id">
              <Select showSearch optionFilterProp="children" allowClear>
                {terminalsList.map((terminal) => (
                  <Select.Option key={terminal.id} value={terminal.id}>
                    {terminal.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label="Филиалы" name="terminal_ids">
              <Select
                showSearch
                optionFilterProp="children"
                allowClear
                mode="multiple"
              >
                {terminalsList.map((terminal) => (
                  <Select.Option key={terminal.id} value={terminal.id}>
                    {terminal.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Максимальное время доставки"
              name="max_order_time"
            >
              <InputNumber type="number" addonAfter="мин." />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Минимальная дистанция" name="min_distance_km">
              <InputNumber type="number" addonAfter="м." />
            </Form.Item>
          </Col>
        </Row>
        <Form.List name="rules">
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
                      name={[field.name, "from"]}
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
                      name={[field.name, "to"]}
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
      </Form>
      <Divider>Калькулятор примерного расчёта</Divider>
      <div>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Примерная дистанция(км)" name="distance">
              <InputNumber
                type="number"
                onChange={(value) => calculateAproximatePrice(value)}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Примерная цена доставки">
              <div>
                {new Intl.NumberFormat("ru-RU").format(aproximatePrice)} сум
              </div>
            </Form.Item>
          </Col>
        </Row>
      </div>
    </Edit>
  );
}
