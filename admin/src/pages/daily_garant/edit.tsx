import { useForm, Edit } from "@refinedev/antd";
import { Form, Input, Row, Col, TimePicker, InputNumber } from "antd";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useGetIdentity } from "@refinedev/core";
import { daily_garant } from "@api/drizzle/schema";
import { InferInsertModel } from "drizzle-orm";

dayjs.extend(utc);
dayjs.extend(timezone);

dayjs.tz.setDefault("Asia/Tashkent");

const format = "HH:mm";
export default function DailyGarantEdit() {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const { formProps, saveButtonProps } = useForm<
    InferInsertModel<typeof daily_garant>
  >({
    meta: {
      fields: ["id", "name", "date", "amount", "late_minus_sum"],
      pluralize: true,
      updateInputName: "daily_garantUncheckedUpdateInput",
      requestHeaders: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    },
  });

  return (
    <Edit saveButtonProps={saveButtonProps}>
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
                value: value ? dayjs(value) : "",
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
    </Edit>
  );
}
