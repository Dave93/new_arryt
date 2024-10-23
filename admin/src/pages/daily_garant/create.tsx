import { Create, useForm } from "@refinedev/antd";
import { Col, Form, Input, InputNumber, Row, TimePicker } from "antd";
import dayjs from "dayjs";
import { useGetIdentity } from "@refinedev/core";
import { daily_garant } from "@api/drizzle/schema";
import { InferInsertModel } from "drizzle-orm";

const format = "HH:mm";

export default function DailyGarantCreate() {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const { formProps, saveButtonProps } = useForm<
    InferInsertModel<typeof daily_garant>
  >({
    meta: {
      fields: ["id", "name", "date", "amount", "late_minus_sum"],
      pluralize: true,
      requestHeaders: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    },
  });

  return (
    <Create saveButtonProps={saveButtonProps} title="Создать рабочий график">
      <Form {...formProps} layout="vertical">
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
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Время начисления"
              name="date"
              rules={[
                {
                  required: true,
                },
              ]}
              getValueProps={(value) => ({
                value: value ? dayjs(value, "HH:mm:ss") : "",
              })}
            >
              <TimePicker format={format} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Сумма гаранта" name="amount">
              <InputNumber />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Сумма штрафа за опоздание за каждые 30 мин."
              name="late_minus_sum"
            >
              <InputNumber />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Create>
  );
}
