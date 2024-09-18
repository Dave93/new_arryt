import {
  CanAccess,
  useCan,
  useGetIdentity,
  useNavigation,
  useShow,
} from "@refinedev/core";
import { Show } from "@refinedev/antd";

import {
  Descriptions,
  Col,
  Row,
  Tag,
  Button,
  Tabs,
  Table,
  Timeline,
  Space,
  Popconfirm,
  Popover,
  List as AntdList,
} from "antd";

import dayjs from "dayjs";
import { FC, useEffect, useMemo, useRef, useState } from "react";
import { gql } from "graphql-request";
import { client } from "@admin/src/graphConnect";
import { YMaps, Map } from "react-yandex-maps";
import { IGroupedLocations, IOrderLocation } from "@admin/src/interfaces";
import "dayjs/locale/ru";
import duration from "dayjs/plugin/duration";
import { CloseOutlined } from "@ant-design/icons";
import { ChangeOrdersCouirer } from "@admin/src/components/orders/changeCourier";
import OrderDeliveryPricing from "@admin/src/components/orders/order_delivery_pricing";
import OrderNotes from "@admin/src/components/orders/order_notes";
import { chain, zipObjectDeep } from "lodash";
import { OrdersWithRelations } from "@api/src/modules/orders/dtos/list.dto";
import { order_items, order_status } from "@api/drizzle/schema";
import { InferSelectModel } from "drizzle-orm";
import { apiClient } from "@admin/src/eden";
import { OrderActionsWithRelations } from "@api/src/modules/order_actions/dto/list.dto";

dayjs.locale("ru");
dayjs.extend(duration);

interface OrderShowHeaderProps {
  startDate: string;
  endDate?: string | null;
  defaultButtons: React.ReactNode;
}

const OrderShowHeader: FC<OrderShowHeaderProps> = ({
  defaultButtons,
  startDate,
  endDate,
}) => {
  const duration = useMemo(() => {
    if (startDate && endDate) {
      return `Доставка завершена за ${dayjs(endDate).diff(
        startDate,
        "minute"
      )} минут`;
    } else {
      return "Доставка не завершена";
    }
  }, [startDate, endDate]);
  return (
    <Space>
      <div>
        <strong>{duration}</strong>
      </div>
      {defaultButtons}
    </Space>
  );
};

export const OrdersShow = () => {
  const map = useRef<any>(null);
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const [orderActions, setOrderActions] = useState<OrderActionsWithRelations[]>(
    []
  );
  const [orderLocations, setOrderLocations] = useState<IGroupedLocations[]>([]);
  const [orderStatuses, setOrderStatuses] = useState<
    InferSelectModel<typeof order_status>[]
  >([]);
  const [productsData, setProductsData] = useState<
    InferSelectModel<typeof order_items>[]
  >([]);

  const { show } = useNavigation();

  const { data: orderCanEdit } = useCan({
    resource: "orders",
    action: "edit",
  });

  const { queryResult, showId } = useShow<OrdersWithRelations>({
    meta: {
      fields: [
        "id",
        "delivery_type",
        "created_at",
        "order_price",
        "order_number",
        "duration",
        "delivery_price",
        "payment_type",
        "from_lat",
        "from_lon",
        "to_lat",
        "to_lon",
        "order_items",
        "delivery_pricing_id",
        "pre_distance",
        "pre_duration",
        "finished_date",
        "delivery_comment",
        "operator_notes",
        "delivery_schedule",
        "later_time",
        "cooked_time",
        "organization.id",
        "organization.name",
        "couriers.id",
        "couriers.first_name",
        "couriers.last_name",
        "customers.id",
        "customers.name",
        "customers.phone",
        "order_status.id",
        "order_status.name",
        "order_status.color",
        "terminals.id",
        "terminals.name",
      ],
      requestHeaders: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    },
  });
  const { data, isLoading } = queryResult;

  const record = data?.data;

  const loadOrderStatuses = async () => {
    let organizations: any = {};

    if (record) {
      const { data } = await apiClient.api.order_status.cached.get({
        $query: {
          organization_id: record.organization.id,
        },
        $headers: {
          Authorization: `Bearer ${identity?.token.accessToken}`,
        },
      });
      if (data && Array.isArray(data)) {
        setOrderStatuses(data);
      }
    }
  };

  const productsColumns = [
    {
      title: "Название",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Количество",
      dataIndex: "quantity",
      key: "quantity",
    },
    {
      title: "Цена",
      dataIndex: "price",
      key: "price",
      render: (text: string, record: any) => (
        <div>{new Intl.NumberFormat("ru").format(+text)}</div>
      ),
    },
    {
      title: "Сумма",
      dataIndex: "price",
      key: "price",
      render: (text: string, record: InferSelectModel<typeof order_items>) => (
        <div>
          {new Intl.NumberFormat("ru").format(record.price * record.quantity)}
        </div>
      ),
    },
  ];

  const onTabChange = async (key: string) => {
    if (key === "3") {
      const { data } = await apiClient.api.order_actions.get({
        $query: {
          limit: "100",
          offset: "0",
          fields:
            "id,created_at,action,action_text,duration,users.first_name,users.last_name",
          filters: JSON.stringify([
            {
              field: "order_id",
              operator: "eq",
              value: showId,
            },
            {
              field: "order_created_at",
              operator: "eq",
              value: record?.created_at,
            },
          ]),
        },
        $headers: {
          Authorization: `Bearer ${identity?.token.accessToken}`,
        },
      });
      if (data && data.data && Array.isArray(data.data)) {
        setOrderActions(data.data);
      }
    }

    if (key == "2") {
      const { data } = await apiClient.api.orders[showId!].items.get({
        $headers: {
          Authorization: `Bearer ${identity?.token.accessToken}`,
        },
      });
      if (data && Array.isArray(data)) {
        setProductsData(data);
      }
    }
  };

  const loadOrderLocations = async () => {
    if (record) {
      const { data } = await apiClient.api.orders[showId!].locations.post({
        created_at: record.created_at,
        $headers: {
          Authorization: `Bearer ${identity?.token.accessToken}`,
        },
      });

      if (data && Array.isArray(data)) {
        const result = chain(data)
          .groupBy(
            (item) =>
              `${item.order_status_id}_${item.order_status.color}_${item.order_status.name}`
          )
          .toPairs()
          .map((currentItem) => {
            return zipObjectDeep(["order_status", "location"], currentItem);
          })
          .value() as IGroupedLocations[];
        setOrderLocations(result);
      }
    }
  };

  const updateOrderStatus = async (id: string) => {
    const data = await apiClient.api.orders[showId!].set_status.post({
      $headers: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
      status_id: id,
      created_at: record?.created_at,
    });

    window.location.reload();
  };

  const clearCourier = async (id: string | undefined) => {
    const data = await apiClient.api.orders[showId!].revoke.post({
      $headers: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    });

    window.location.reload();
  };

  const cookingTime = useMemo(() => {
    if (record?.cooked_time) {
      const ft = dayjs(record.created_at);
      const tt = dayjs(record.cooked_time);
      const mins = tt.diff(ft, "minutes", true);
      const totalHours = parseInt((mins / 60).toString());
      const totalMins = dayjs().minute(mins).format("mm");
      return `${totalHours}:${totalMins}`;
    } else {
      return "Не заполнена выпечка";
    }
  }, [record]);

  useEffect(() => {
    loadOrderStatuses();
    loadOrderLocations();
  }, [identity, record]);

  return (
    <Show
      isLoading={isLoading}
      title={`Заказ #${record?.order_number}`}
      headerButtons={({ defaultButtons }) => (
        <OrderShowHeader
          startDate={record?.created_at!}
          endDate={record?.finished_date}
          defaultButtons={defaultButtons}
        />
      )}
    >
      <Tabs defaultActiveKey="1" onChange={onTabChange}>
        <Tabs.TabPane tab="Основная информация" key="1">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Дата заказа">
                  {dayjs(record?.created_at).format("DD.MM.YYYY HH:mm")}
                </Descriptions.Item>
                <Descriptions.Item label="Статус">
                  <Tag color={record?.order_status.color!}>
                    <div
                      style={{
                        fontWeight: 800,
                        color: "#000",
                        textTransform: "uppercase",
                      }}
                    >
                      {record?.order_status?.name}
                    </div>
                  </Tag>
                  <CanAccess resource="orders" action="edit">
                    <Popover
                      placement="bottom"
                      title="Выберите статус"
                      content={() => (
                        <div>
                          <AntdList
                            size="small"
                            dataSource={orderStatuses}
                            renderItem={(item) => (
                              <AntdList.Item>
                                <Button
                                  type="link"
                                  size="small"
                                  style={{
                                    background: item.color
                                      ? item.color
                                      : "#fff",
                                    color: "#000",
                                    fontWeight: 800,
                                    textTransform: "uppercase",
                                  }}
                                  onClick={() => {
                                    updateOrderStatus(item.id);
                                  }}
                                >
                                  {item.name}
                                </Button>
                              </AntdList.Item>
                            )}
                          />
                        </div>
                      )}
                      trigger="click"
                    >
                      <Button
                        size="small"
                        block
                        style={{
                          marginTop: 8,
                        }}
                      >
                        Сменить статус
                      </Button>
                    </Popover>
                  </CanAccess>
                </Descriptions.Item>
                <Descriptions.Item label="Организация">
                  <Button
                    type="link"
                    size="small"
                    onClick={() =>
                      show("organizations", record?.organization.id ?? "")
                    }
                  >
                    {record?.organization?.name}
                  </Button>
                </Descriptions.Item>
                <Descriptions.Item label="Филиал">
                  <Button
                    type="link"
                    size="small"
                    onClick={() =>
                      show("terminals", record?.terminals.id ?? "")
                    }
                  >
                    {record?.terminals?.name}
                  </Button>
                </Descriptions.Item>
                <Descriptions.Item label="Курьер">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-around",
                    }}
                  >
                    {record?.couriers && (
                      <div
                        style={{
                          flex: 1,
                        }}
                      >
                        <Button
                          type="link"
                          size="small"
                          onClick={() => show("couriers", record.couriers.id)}
                        >
                          {record.couriers.first_name}{" "}
                          {record.couriers.last_name}
                        </Button>
                      </div>
                    )}

                    <div
                      style={{
                        marginLeft: 5,
                        marginRight: 5,
                      }}
                    >
                      <CanAccess resource="orders" action="changeCourier">
                        <ChangeOrdersCouirer
                          id={showId?.toString()}
                          terminal_id={record?.terminals.id}
                        />
                      </CanAccess>
                    </div>
                    <CanAccess resource="orders" action="clear_courier">
                      <Popconfirm
                        title="Вы действительно хотите очистить курьера?"
                        onConfirm={() => {
                          clearCourier(showId?.toString());
                        }}
                        // onCancel={cancel}
                        okText="Да"
                        cancelText="Нет"
                      >
                        <Button
                          shape="circle"
                          danger
                          size="small"
                          icon={<CloseOutlined />}
                        />
                      </Popconfirm>
                    </CanAccess>
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label="ФИО">
                  {record?.customers?.name}
                </Descriptions.Item>
                <Descriptions.Item label="Телефон">
                  {record?.customers?.phone}
                </Descriptions.Item>
                <Descriptions.Item label="Способ оплаты">
                  {record?.payment_type}
                </Descriptions.Item>
                <Descriptions.Item label="График доставки">
                  {record?.delivery_schedule == "later"
                    ? "На время"
                    : "В ближайшее время"}
                </Descriptions.Item>
                {record?.delivery_schedule == "later" && (
                  <Descriptions.Item label="Когда доставить">
                    {record?.later_time}
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Стоимость заказа">
                  {new Intl.NumberFormat("ru").format(record?.order_price!)} сум
                </Descriptions.Item>
                <Descriptions.Item label="Стоимость доставки">
                  {new Intl.NumberFormat("ru").format(record?.delivery_price!)}{" "}
                  сум
                </Descriptions.Item>
                <Descriptions.Item label="Дистанция">
                  {record?.pre_distance} км
                </Descriptions.Item>
                <Descriptions.Item label="Дата выпечки">
                  {record?.cooked_time
                    ? dayjs
                        .duration(record?.cooked_time)
                        .format("DD.MM.YYYY HH:mm")
                    : "Не указано"}
                </Descriptions.Item>
                <Descriptions.Item label="Время выпечки">
                  {cookingTime}
                </Descriptions.Item>
                <Descriptions.Item label="Время доставки">
                  {dayjs
                    .duration(record?.pre_duration! * 1000)
                    .format("HH:mm:ss")}
                </Descriptions.Item>
                <Descriptions.Item label="Комментарий">
                  {record?.delivery_comment}
                </Descriptions.Item>
                {orderCanEdit?.can && (
                  <Descriptions.Item label="Заметки">
                    <OrderNotes
                      orderId={showId!.toString()}
                      notes={record?.operator_notes}
                    />
                  </Descriptions.Item>
                )}
                {record?.cancel_reason && (
                  <Descriptions.Item label="Причина отмены">
                    {record?.cancel_reason}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Col>
            <Col xs={24} md={12}>
              <YMaps
                query={{
                  lang: "ru_RU",
                  load: "package.full",
                  coordorder: "latlong",
                }}
              >
                <Map
                  defaultState={{
                    center: [record?.from_lat!, record?.from_lon!],
                    zoom: 15,
                    controls: ["zoomControl"],
                  }}
                  instanceRef={(ref) => (map.current = ref)}
                  width="100%"
                  height="100vh"
                  modules={["control.ZoomControl"]}
                  onLoad={(ymaps) => {
                    // Создадим ломаную.
                    if (orderLocations?.length > 0) {
                      // itterate over orderLocations
                      orderLocations.forEach((location, index) => {
                        var mapPoints: any[] = [];
                        const status_color =
                          location.order_status.split("_")[1];
                        const status_name = location.order_status.split("_")[2];

                        location.location.map((point) => {
                          mapPoints.push([point.lat, point.lon]);
                        });
                        if (orderLocations[index + 1]) {
                          mapPoints.push([
                            orderLocations[index + 1].location[0].lat,
                            orderLocations[index + 1].location[0].lon,
                          ]);
                        }
                        var polyline = new ymaps.Polyline(
                          mapPoints,
                          {
                            hintContent: status_name,
                          },
                          {
                            // draggable: true,
                            strokeColor: status_color,
                            strokeWidth: 5,
                            // Первой цифрой задаем длину штриха. Второй — длину разрыва.
                            // strokeStyle: "1 5",
                          }
                        );
                        // Добавляем линию на карту.
                        map.current.geoObjects.add(polyline);
                      });
                    }
                    var placemark = new ymaps.Placemark(
                      [record?.from_lat, record?.from_lon],
                      {
                        hintContent: "Адрес отправления",
                        iconContent: "A",
                      },
                      {
                        // Задаем стиль метки (метка в виде круга).
                        preset: "islands#blueCircleIcon",
                      }
                    );
                    map.current.geoObjects.add(placemark);

                    placemark = new ymaps.Placemark(
                      [record?.to_lat, record?.to_lon],
                      {
                        hintContent: "Адрес клиента",
                        iconContent: "B",
                      },
                      {
                        // Задаем стиль метки (метка в виде круга).
                        preset: "islands#darkGreenCircleIcon",
                      }
                    );
                    map.current.geoObjects.add(placemark);
                    let bounds = map.current.geoObjects.getBounds();
                    // Применяем область показа к карте
                    map.current.setBounds(bounds);
                  }}
                ></Map>
              </YMaps>
            </Col>
          </Row>
        </Tabs.TabPane>
        <Tabs.TabPane tab="Товары" key="2">
          <Table
            columns={productsColumns}
            dataSource={productsData}
            summary={(pageData) => {
              let total = 0;
              pageData.forEach((item) => {
                total += item.price * item.quantity;
              });
              return (
                <>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}>
                      <strong>Итого</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell
                      index={1}
                      colSpan={2}
                    ></Table.Summary.Cell>
                    <Table.Summary.Cell index={3}>
                      <strong>
                        {new Intl.NumberFormat("ru").format(total)}
                      </strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </>
              );
            }}
          />
        </Tabs.TabPane>
        <Space direction="vertical" />
        <Tabs.TabPane tab="История" key="3">
          <Timeline mode="left">
            {orderActions.map((item, key) => (
              <Timeline.Item
                key={item.id}
                color={key % 2 === 0 ? "green" : "red"}
                label={
                  <div>
                    Дата: {dayjs(item.created_at).format("DD.MM.YYYY HH:mm")}
                    <br />
                    Разница:{" "}
                    {dayjs.duration(item.duration * 1000).format("HH:mm:ss")}
                  </div>
                }
                style={{
                  paddingBottom: item.users ? "20px" : "40px",
                }}
              >
                <Space direction="vertical" style={{ display: "flex" }}>
                  <div>{item.action_text}</div>
                  {item.users && (
                    <div>
                      <strong>Пользователь: </strong>
                      <Tag color="blue">{item.users.first_name}</Tag>
                    </div>
                  )}
                </Space>
              </Timeline.Item>
            ))}
          </Timeline>
          <Row>
            <Col span={8} offset={8}>
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Дата заказа">
                  {dayjs(record?.created_at).format("DD.MM.YYYY HH:mm")}
                </Descriptions.Item>
              </Descriptions>
            </Col>
          </Row>
        </Tabs.TabPane>
        <Tabs.TabPane tab="Калькулятор суммы доставки" key="4">
          <OrderDeliveryPricing order={record!} />
        </Tabs.TabPane>
      </Tabs>
    </Show>
  );
};
