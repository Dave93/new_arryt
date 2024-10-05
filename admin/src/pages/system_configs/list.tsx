import { PageHeader } from "@refinedev/antd";
import {
  Card,
  Form,
  Input,
  Space,
  Spin,
  TimePicker,
  Button,
  Col,
  Row,
  InputNumber,
  DatePicker,
  Divider,
  Select,
  Tabs,
  TabsProps,
  Switch,
} from "antd";
import { useGetIdentity, useTranslate } from "@refinedev/core";
import dayjs from "dayjs";
import * as gql from "gql-query-builder";
import { client } from "@admin/src/graphConnect";
import { ITerminals } from "@admin/src/interfaces";
import { useEffect, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { drive_type } from "@admin/src/interfaces/enums";
import { sortBy } from "lodash";
import StickyBox from "react-sticky-box";
import DebounceSelect from "@admin/src/components/select/debounceSelector";
import { apiClient } from "@admin/src/eden";
import { terminals } from "@api/drizzle/schema";
import { InferSelectModel } from "drizzle-orm";

const { TabPane } = Tabs;

export default function SystemConfigsList() {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [terminalsList, setTerminals] = useState<
    (typeof terminals.$inferSelect)[]
  >([]);
  const tr = useTranslate();

  const renderTabBar: TabsProps["renderTabBar"] = (
    props: any,
    DefaultTabBar: any
  ) => (
    <StickyBox offsetTop={0} offsetBottom={20} style={{ zIndex: 1 }}>
      <DefaultTabBar {...props} />
    </StickyBox>
  );

  const {
    handleSubmit,
    control,
    register,
    setValue,
    formState: { errors },
  } = useForm();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "close_dates",
  });

  const {
    fields: garantPriceFields,
    append: garantPriceAppend,
    remove: garantPriceRemove,
  } = useFieldArray({
    control,
    name: "garant_prices",
  });

  const {
    fields: terminalCloseDaysFields,
    append: terminalCloseDaysAppend,
    remove: terminalCloseDaysRemove,
  } = useFieldArray({
    control,
    name: "terminal_close_days",
  });

  const loadDefaultData = async () => {
    setIsLoading(true);
    const { data } = await apiClient.api.system_configs.cached.get({
      $headers: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    });
    setIsLoading(false);
    if (data && Object.entries(data).length) {
      for (const [key, value] of Object.entries(data)) {
        if (
          key.indexOf("time") !== -1 &&
          ![
            "late_order_time",
            "yandex_courier_wait_time",
            "courier_assign_time",
            "courier_accept_order_time",
          ].includes(key)
        ) {
          // @ts-ignore
          setValue(key, dayjs(value));
        } else {
          if (key == "close_dates") {
            try {
              // @ts-ignore
              let closeDates = JSON.parse(value);
              closeDates = closeDates.map((item: any) => {
                return {
                  date: dayjs(item.date),
                  reason: item.reason,
                };
              });
              setValue(key, closeDates);
            } catch (error) {
              console.log(error);
            }
          } else if (["garant_prices", "yandex_courier_id"].includes(key)) {
            try {
              // @ts-ignore
              let closeDates = JSON.parse(value);
              setValue(key, closeDates);
            } catch (error) {
              console.log(error);
            }
          } else if (key === "terminal_close_days") {
            try {
              // @ts-ignore
              let terminalCloseDays = JSON.parse(value);
              terminalCloseDays = terminalCloseDays.map((item: any) => {
                return {
                  date: dayjs(item.date),
                  terminal_id: item.terminal_id,
                };
              });
              setValue(key, terminalCloseDays);
            } catch (error) {
              console.log(error);
            }
          } else if (key === "yandex_delivery_payment_types") {
            // @ts-ignore
            setValue(key, value.split(","));
          } else {
            setValue(key, value);
          }
        }
      }
    }
  };

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    let formData = [];
    for (const key in data) {
      if (typeof data[key].toISOString !== "undefined") {
        formData.push({
          name: key,
          value: data[key].toISOString(),
        });
      } else {
        if (
          [
            "close_dates",
            "garant_prices",
            "terminal_close_days",
            "yandex_courier_id",
          ].includes(key)
        ) {
          formData.push({
            name: key,
            value: JSON.stringify(data[key]),
          });
        } else {
          formData.push({
            name: key,
            value: data[key].toString(),
          });
        }
      }
    }

    await apiClient.api.system_configs.set_multiple.post(
      {
        data: formData,
      },
      {
        headers: {
          Authorization: `Bearer ${identity?.token.accessToken}`,
        },
      }
    );

    // const { query, variables } = gql.mutation({
    //   operation: "createSystemConfig",
    //   variables: {
    //     data: {
    //       value: { items: formData },
    //       type: "CreateSystemConfigInput",
    //       required: true,
    //     },
    //   },
    //   fields: ["name", "value"],
    // });
    // const response = await client.request(query, variables, {
    //   Authorization: `Bearer ${identity?.token.accessToken}`,
    // });

    setIsLoading(false);
  };

  const fetchAllData = async () => {
    const { data: terminals } = await apiClient.api.terminals.cached.get({
      $headers: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    });
    if (terminals && Array.isArray(terminals)) {
      setTerminals(sortBy(terminals, (item) => item.name));
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
    loadDefaultData();
    fetchAllData();
  }, [identity]);

  return (
    <div>
      <PageHeader title="Системные настройки" ghost={false}>
        <Spin spinning={isLoading}>
          <Form onFinish={handleSubmit(onSubmit)}>
            <Card
              bordered={false}
              actions={[
                <Space key="save-btn">
                  <Button type="primary" htmlType="submit">
                    Сохранить
                  </Button>
                </Space>,
              ]}
            >
              <Tabs
                defaultActiveKey="1"
                type="card"
                renderTabBar={renderTabBar}
              >
                <TabPane tab="Основные" key="1">
                  <Row gutter={16}>
                    <Col span={6}>
                      <Form.Item
                        label="Время начала дня системы"
                        rules={[
                          {
                            required: true,
                            message: "Обязательно для заполнения",
                          },
                        ]}
                      >
                        <Controller
                          name="work_start_time"
                          control={control}
                          rules={{ required: true }}
                          render={({ field }) => (
                            <TimePicker format="HH:mm" {...field} />
                          )}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item
                        label="Время окончания дня системы"
                        rules={[
                          {
                            required: true,
                            message: "Обязательно для заполнения",
                          },
                        ]}
                      >
                        <Controller
                          name="work_end_time"
                          control={control}
                          rules={{ required: true }}
                          render={({ field }) => (
                            <TimePicker format="HH:mm" {...field} />
                          )}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item
                        label="Телефон для звонков"
                        rules={[
                          {
                            required: true,
                            message: "Обязательно для заполнения",
                          },
                        ]}
                      >
                        <Controller
                          name="admin_phone"
                          control={control}
                          rules={{ required: true }}
                          render={({ field }) => <Input {...field} />}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item
                        label="Сумма гаранта"
                        rules={[
                          {
                            required: true,
                            message: "Обязательно для заполнения",
                          },
                        ]}
                      >
                        <Controller
                          name="garant_price"
                          control={control}
                          rules={{ required: true }}
                          render={({ field }) => (
                            <InputNumber size="small" {...field} />
                          )}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Divider>Упущенные заказы</Divider>
                  <Row gutter={16}>
                    <Col span={6}>
                      <Form.Item
                        label="Время фиксации опоздания заказа"
                        rules={[
                          {
                            required: true,
                            message: "Обязательно для заполнения",
                          },
                        ]}
                      >
                        <Controller
                          name="late_order_time"
                          control={control}
                          rules={{ required: true }}
                          render={({ field }) => (
                            <InputNumber
                              size="small"
                              {...field}
                              addonAfter="мин."
                            />
                          )}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label="Способы оплаты заказов для отправки в Яндекс.Доставку"
                        labelCol={{ span: 14 }}
                        wrapperCol={{ span: 10 }}
                        rules={[
                          {
                            required: true,
                            message: "Обязательно для заполнения",
                          },
                        ]}
                      >
                        <Controller
                          name="yandex_delivery_payment_types"
                          control={control}
                          rules={{ required: true }}
                          render={({ field }) => (
                            <Select
                              mode="multiple"
                              allowClear
                              style={{ width: "100%" }}
                              placeholder="Выберите способы оплаты"
                              {...field}
                            >
                              <Select.Option value="Наличными">
                                Наличные
                              </Select.Option>
                              <Select.Option value="uzcard">
                                UzCard
                              </Select.Option>
                              <Select.Option value="click">Click</Select.Option>
                              <Select.Option value="payme">Payme</Select.Option>
                            </Select>
                          )}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item
                        label="Максимальное время ожидания курьера"
                        rules={[
                          {
                            required: true,
                            message: "Обязательно для заполнения",
                          },
                        ]}
                      >
                        <Controller
                          name="yandex_courier_wait_time"
                          control={control}
                          rules={{ required: true }}
                          render={({ field }) => (
                            <InputNumber
                              size="small"
                              {...field}
                              addonAfter="мин."
                            />
                          )}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="Имя отправителя для Яндекс.Доставки">
                        <Controller
                          name="yandex_sender_name"
                          control={control}
                          render={({ field }) => <Input {...field} />}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="Телефон отправителя для Яндекс.Доставки">
                        <Controller
                          name="yandex_sender_phone"
                          control={control}
                          render={({ field }) => <Input {...field} />}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={6}>
                      <Form.Item label="Курьер для яндекс доставки">
                        <Controller
                          name="yandex_courier_id"
                          control={control}
                          render={({ field }) => (
                            <DebounceSelect
                              fetchOptions={fetchCourier}
                              allowClear
                              {...field}
                            />
                          )}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Divider>Нерабочие дни</Divider>
                  <Row gutter={16}>
                    <Col span={12}>
                      {fields.map((field, index) => {
                        return (
                          <Row key={field.id}>
                            <Col span={10}>
                              <Form.Item label="Дата">
                                <Controller
                                  name={`close_dates.${index}.date`}
                                  control={control}
                                  rules={{ required: true }}
                                  render={({ field }) => (
                                    <DatePicker
                                      format="DD.MM.YYYY"
                                      {...field}
                                    />
                                  )}
                                />
                              </Form.Item>
                            </Col>
                            <Col span={10}>
                              <Form.Item label="Причина">
                                <Controller
                                  name={`close_dates.${index}.reason`}
                                  control={control}
                                  rules={{ required: true }}
                                  render={({ field }) => <Input {...field} />}
                                />
                              </Form.Item>
                            </Col>
                            <Col span={4}>
                              <Form.Item label="&nbsp;">
                                <Button
                                  danger
                                  shape="circle"
                                  icon={<DeleteOutlined />}
                                  onClick={() => {
                                    remove(index);
                                  }}
                                />
                              </Form.Item>
                            </Col>
                          </Row>
                        );
                      })}
                      <Form.Item>
                        <Button
                          type="dashed"
                          onClick={() =>
                            append({
                              date: null,
                              reason: "",
                            })
                          }
                          block
                          icon={<PlusOutlined />}
                        >
                          Добавить нерабочие дни
                        </Button>
                      </Form.Item>
                    </Col>
                  </Row>
                </TabPane>
                <TabPane tab="Гарант" key="2">
                  <Divider>Суммы гаранта</Divider>
                  <Row gutter={16}>
                    <Col span={12}>
                      {garantPriceFields.map((field, index) => {
                        return (
                          <Row key={field.id} gutter={16}>
                            <Col span={10}>
                              <Form.Item label="Тип доставки">
                                <Controller
                                  name={`garant_prices.${index}.drive_type`}
                                  control={control}
                                  rules={{ required: true }}
                                  render={({ field }) => (
                                    <Select {...field}>
                                      {Object.keys(drive_type).map(
                                        (type: string) => (
                                          <Select.Option
                                            key={type}
                                            value={type}
                                          >
                                            {tr(
                                              `deliveryPricing.driveType.${type}`
                                            )}
                                          </Select.Option>
                                        )
                                      )}
                                    </Select>
                                  )}
                                />
                              </Form.Item>
                            </Col>
                            <Col span={10}>
                              <Form.Item label="Сумма">
                                <Controller
                                  name={`garant_prices.${index}.price`}
                                  control={control}
                                  rules={{ required: true }}
                                  render={({ field }) => (
                                    <InputNumber {...field} />
                                  )}
                                />
                              </Form.Item>
                            </Col>
                            <Col span={4}>
                              <Form.Item label="&nbsp;">
                                <Button
                                  danger
                                  shape="circle"
                                  icon={<DeleteOutlined />}
                                  onClick={() => {
                                    garantPriceRemove(index);
                                  }}
                                />
                              </Form.Item>
                            </Col>
                          </Row>
                        );
                      })}
                      <Form.Item>
                        <Button
                          type="dashed"
                          onClick={() =>
                            garantPriceAppend({
                              drive_type: null,
                              price: 0,
                            })
                          }
                          block
                          icon={<PlusOutlined />}
                        >
                          Добавить сумму гаранта
                        </Button>
                      </Form.Item>
                    </Col>
                  </Row>
                  <Divider>Закрытые дни филиалов</Divider>
                  <Row gutter={16}>
                    <Col span={12}>
                      {terminalCloseDaysFields.map((field, index) => {
                        return (
                          <Row key={field.id} gutter={16}>
                            <Col span={10}>
                              <Form.Item label="Филиал">
                                <Controller
                                  name={`terminal_close_days.${index}.terminal_id`}
                                  control={control}
                                  rules={{ required: true }}
                                  render={({ field }) => (
                                    <Select {...field}>
                                      {terminalsList.map((terminal: any) => (
                                        <Select.Option
                                          key={terminal.id}
                                          value={terminal.id}
                                        >
                                          {terminal.name}
                                        </Select.Option>
                                      ))}
                                    </Select>
                                  )}
                                />
                              </Form.Item>
                            </Col>
                            <Col span={10}>
                              <Form.Item label="Дата">
                                <Controller
                                  name={`terminal_close_days.${index}.date`}
                                  control={control}
                                  rules={{ required: true }}
                                  render={({ field }) => (
                                    <DatePicker
                                      format="DD.MM.YYYY"
                                      {...field}
                                    />
                                  )}
                                />
                              </Form.Item>
                            </Col>
                            <Col span={4}>
                              <Form.Item label="&nbsp;">
                                <Button
                                  danger
                                  shape="circle"
                                  icon={<DeleteOutlined />}
                                  onClick={() => {
                                    terminalCloseDaysRemove(index);
                                  }}
                                />
                              </Form.Item>
                            </Col>
                          </Row>
                        );
                      })}
                      <Form.Item>
                        <Button
                          type="dashed"
                          onClick={() =>
                            terminalCloseDaysAppend({
                              date: dayjs(),
                              terminal_id: null,
                            })
                          }
                          block
                          icon={<PlusOutlined />}
                        >
                          Добавить
                        </Button>
                      </Form.Item>
                    </Col>
                  </Row>
                  <Divider>Дневной гарант</Divider>
                  <Row gutter={16}>
                    <Col span={6}>
                      <Form.Item label="Максимальная разница времени гаранта и фактического времени закрытия смены">
                        <Controller
                          name="daily_garant_max_difference"
                          control={control}
                          rules={{ required: true }}
                          render={({ field }) => (
                            <InputNumber {...field} addonAfter="мин." />
                          )}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item label="Максимальная время опоздания для гаранта">
                        <Controller
                          name="daily_garant_max_difference"
                          control={control}
                          rules={{ required: true }}
                          render={({ field }) => (
                            <InputNumber {...field} addonAfter="мин." />
                          )}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </TabPane>
                <TabPane tab="Назначение курьеров" key="3">
                  <Row gutter={16}>
                    <Col span={6}>
                      <Form.Item
                        label="Ожидание назначения курьера"
                        rules={[
                          {
                            required: true,
                            message: "Обязательно для заполнения",
                          },
                        ]}
                      >
                        <Controller
                          name="courier_assign_time"
                          control={control}
                          rules={{ required: true }}
                          render={({ field }) => (
                            <InputNumber
                              size="small"
                              {...field}
                              addonAfter="мин."
                            />
                          )}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item label="Время для принятия заказа">
                        <Controller
                          name="courier_accept_order_time"
                          control={control}
                          render={({ field }) => (
                            <InputNumber
                              size="small"
                              {...field}
                              addonAfter="мин."
                            />
                          )}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item label="Перекидывать в яндекс доставку">
                        <Controller
                          name="allow_yandex_transfer"
                          control={control}
                          render={({ field }) => <Switch {...field} />}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </TabPane>
              </Tabs>
            </Card>
          </Form>
        </Spin>
      </PageHeader>
    </div>
  );
};
