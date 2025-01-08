import { Card, Select, Drawer } from "antd";
import { useGetIdentity } from "@refinedev/core";
import { FC, useEffect, useMemo, useRef, useState } from "react";
import { Map, Placemark, YMaps } from "@pbe/react-yandex-maps";
import useSWR from "swr";
import { apiClient } from "@admin/src/eden";
import { terminals } from "@api/drizzle/schema";
import DebounceSelect from "@admin/src/components/select/debounceSelector";
import { InferSelectModel } from "drizzle-orm";
import OrdersShow from "./show";

const OrdersInMapsWithToken = () => {
    const { data: identity } = useGetIdentity<{
      token: { accessToken: string };
    }>();
  
    return (
      <>
        {identity?.token.accessToken && (
          <OrdersInMaps token={identity.token.accessToken} />
        )}
      </>
    );
  };


interface IOrdersInMapsProps {
    token: string;
  }
  
  const OrdersInMaps: FC<IOrdersInMapsProps> = (props) => {
    const map = useRef<any>(null);
    const [zoom, setZoom] = useState(12);
    const [center, setCenter] = useState([41.311151, 69.279737]);
    const mapState = useMemo(() => ({ center: center, zoom }), [zoom, center]);
    const [terminalsList, setTerminals] = useState<
      InferSelectModel<typeof terminals>[]
    >([]);
    const [selectedTerminals, setSelectedTerminals] = useState<string[] | undefined>(undefined);
    const [selectedCourier, setSelectedCourier] = useState<string | undefined>(undefined);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [drawerVisible, setDrawerVisible] = useState(false);

    const getAllFilterData = async () => {
        const { data: terminals } = await apiClient.api.terminals.cached.get({
            $headers: {
              Authorization: `Bearer ${props.token}`,
            },
          });

        if (terminals && Array.isArray(terminals)) {
            setTerminals(terminals);
        }
    }

  const getOrders = async () => {
    const { data } = await apiClient.api.orders.list_in_map.get({
      $headers: {
        Authorization: `Bearer ${props.token}`,
      },
      $query: selectedTerminals?.length ? {
        terminal_id: selectedTerminals
      } : undefined
    });

    return data;
  };



  const fetchCourier = async (queryText: string) => {
    const { data: users } = await apiClient.api.couriers.search.get({
      $query: {
        search: queryText,
      },
      $headers: {
        Authorization: `Bearer ${props.token}`,
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

  const handleTerminalChange = (value: string[]) => {
    setSelectedTerminals(value);
  };


  useEffect(() => {
    getAllFilterData();
  }, []);

  const { data, error, isLoading, mutate } = useSWR(
    ["/orders_in_maps", selectedTerminals],
    getOrders,
    {
      //   refreshInterval: 5000,
    }
  );

  // Force re-render when courier changes
  useEffect(() => {
    if (data) {
      // This will trigger a re-render without refetching data
      mutate(data, false);
    }
  }, [selectedCourier, data, mutate]);

  const getPinColor = (order: any) => {
    if (selectedCourier && order.courier_id === selectedCourier) {
        return '#ff4d4f'; // Red color for selected courier's orders
    }
    return '#1677ff'; // Default blue color
  };

  const handlePlacemarkClick = (order: any) => {
    window.open(`/orders/show/${order.id}`)
  };

  return (
    <div
      style={{
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
        top: "20px",
        left: "20vw",
        zIndex: 1000,
        minWidth: "300px",
      }}
    >
      <Card title="Заказы на карте" size="small" hoverable>
        <div  style={{ display: "flex", gap: "10px", width: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
          <div>Филиалы</div>
          
          <Select
            showSearch
            optionFilterProp="children"
            allowClear
            style={{ width: '100%' }}
            mode="multiple"
            onChange={(value) => {
              handleTerminalChange(value);
            }}
        >
            {terminalsList.map((terminal: any) => (
            <Select.Option key={terminal.id} value={terminal.id}>
                {terminal.name}
            </Select.Option>
            ))}
            </Select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
            <div>Курьеры</div>
                <DebounceSelect fetchOptions={fetchCourier} allowClear onChange={(value) => value ? setSelectedCourier(value.value) : setSelectedCourier(undefined)} />
          </div>
          </div>
        </Card>
      </div>
      <YMaps
        query={{
          lang: "ru_RU",
          load: "package.full",
          coordorder: "latlong",
        }}
      >
        <Map
          state={mapState}
          width="100%"
          height="85vh"
          instanceRef={(ref) => (map.current = ref)}
          modules={["control.ZoomControl"]}
        >
          {!isLoading && !error && data && (
            <>
              {data &&
                Array.isArray(data) &&
                data.map((order) => (
                  <Placemark
                    key={order.id}
                    geometry={[order.to_lat, order.to_lon]}
                    properties={{
                      iconCaption: order.order_number,
                      hintContent: `
                        Заказ: ${order.order_number}
                        ${order.address || ''}
                      `,
                    }}
                    options={{
                      preset: 'islands#blueIcon',
                      iconColor: getPinColor(order),
                    }}
                    modules={["geoObject.addon.hint"]}
                    onClick={() => handlePlacemarkClick(order)}
                  />
                ))}
            </>
          )}
        </Map>
      </YMaps>

      <Drawer
        title="Информация о заказе"
        placement="right"
        width="80%"
        onClose={() => {
          setDrawerVisible(false);
          setSelectedOrderId(null);
        }}
        open={drawerVisible}
      >
        {selectedOrderId && (
          <OrdersShow />
        )}
      </Drawer>
    </div>
  );
}

export default OrdersInMapsWithToken;
