import { useForm, Edit } from "@refinedev/antd";
import { Form, Input, Switch } from "antd";
import { useGetIdentity } from "@refinedev/core";
import { permissions } from "@api/drizzle/schema";
import { InferInsertModel } from "drizzle-orm";

export default function PermissionsEdit() {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const { formProps, saveButtonProps } = useForm<
    InferInsertModel<typeof permissions>
  >({
    meta: {
      fields: ["id", "slug", "active", "created_at", "description"],
      pluralize: true,
      requestHeaders: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    },
  });

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item
          label="Активность"
          name="active"
          valuePropName="checked"
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="Код"
          name="slug"
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Input />
        </Form.Item>
      </Form>
    </Edit>
  );
}
