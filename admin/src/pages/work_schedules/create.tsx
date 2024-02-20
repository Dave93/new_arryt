import { Create, useForm } from "@refinedev/antd";
import {
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Switch,
  TimePicker,
} from "antd";
import { client } from "@admin/src/graphConnect";
import { gql } from "graphql-request";
import { IOrganization, IWorkSchedules } from "@admin/src/interfaces";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { useGetIdentity } from "@refinedev/core";
import { apiClient } from "@admin/src/eden";
import { organization } from "@api/drizzle/schema";
import { WorkScheduleWithRelations } from "@api/src/modules/work_schedules/dto/list.dto";
import { InferSelectModel } from "drizzle-orm";

let daysOfWeekRu = {
  "1": "Понедельник",
  "2": "Вторник",
  "3": "Среда",
  "4": "Четверг",
  "5": "Пятница",
  "6": "Суббота",
  "7": "Воскресенье",
};

const format = "HH:mm";

export const WorkSchedulesCreate = () => {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const { formProps, saveButtonProps } = useForm<WorkScheduleWithRelations>({
    meta: {
      fields: [
        "id",
        "name",
        "active",
        "created_at",
        "organization_id",
        "days",
        "start_time",
        "end_time",
        "max_start_time",
        "bonus_price",
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
    const { data: organizations } =
      await apiClient.api.organizations.cached.get({
        $headers: {
          Authorization: `Bearer ${identity?.token.accessToken}`,
        },
      });
    setOrganizations(organizations);
  };

  useEffect(() => {
    fetchOrganizations();
  }, [identity]);

  return (
    <Create saveButtonProps={saveButtonProps} title="Создать рабочий график">
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
        <Form.Item
          label="Дни недели"
          name="days"
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Select mode="multiple">
            {Object.keys(daysOfWeekRu).map((key) => (
              <Select.Option key={key} value={key}>
                {daysOfWeekRu[key as keyof typeof daysOfWeekRu]}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Время начала"
              name="start_time"
              rules={[
                {
                  required: true,
                },
              ]}
              getValueProps={(value) => ({
                value: value ? dayjs(value) : "",
              })}
            >
              <TimePicker format={format} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Время окончания"
              name="end_time"
              rules={[
                {
                  required: true,
                },
              ]}
              getValueProps={(value) => ({
                value: value ? dayjs(value) : "",
              })}
            >
              <TimePicker format={format} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Максимальное время начала"
              name="max_start_time"
              rules={[
                {
                  required: true,
                },
              ]}
              getValueProps={(value) => ({
                value: value ? dayjs(value) : "",
              })}
            >
              <TimePicker format={format} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Бонусная сумма за успеваемость"
              name="bonus_price"
            >
              <InputNumber />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Create>
  );
};
