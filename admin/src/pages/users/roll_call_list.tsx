import { Button, Card, DatePicker, Form, Input, Space } from "antd";
import { useGetIdentity } from "@refinedev/core";
import { PhoneOutlined, CalculatorOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import dayjs from "dayjs";
import { RollCallItem } from "@admin/src/interfaces";
import {
  Card as TremorCard,
  Metric,
  Text,
  List,
  ListItem,
  ColGrid,
  Flex,
  Badge,
  Icon,
} from "@tremor/react";
import { debounce } from "lodash";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/solid";
import CourierDriveTypeIcon from "@admin/src/components/users/courier_drive_type_icon";
import { apiClient } from "@admin/src/eden";

const { Search } = Input;

const DailyGarant = ({
  day,
  user_id
}: {
  day: dayjs.Dayjs;
  user_id: string;
}) => {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const setDailyGarant = async () => {
    setIsLoading(true);
    const { data } = await apiClient.api.couriers.try_set_daily_garant.post({
      $body: {
        date: day.toISOString(),
        courier_id: user_id,
      },
      $headers: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    });
    setIsLoading(false);
  };

  return (
    <Button
      type="primary"
      icon={<CalculatorOutlined />}
      size="small"
      loading={isLoading}
      onClick={setDailyGarant}
    />
  );
};

export default function RollCallList() {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [data, setData] = useState<RollCallItem[]>([]);
  const [filteredData, setFilteredData] = useState<RollCallItem[]>([]);
  const { handleSubmit, control, watch } = useForm({
    defaultValues: {
      date: dayjs(),
    },
  });
  const filteredDate = watch("date");

  const onSubmit = async (data: any) => {
    loadData();
  };

  const loadData = async () => {
    setIsLoading(true);

    const { data: rollCallList } = await apiClient.api.couriers.roll_coll.get({
      $headers: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
      $query: {
        date: filteredDate.toISOString(),
      },
    });

    if (rollCallList && Array.isArray(rollCallList)) {
      setData(rollCallList);
      setFilteredData(rollCallList);
    }
    // setData(rollCallList ?? []);
    //   if (status) {
    //     calculateGarant = calculateGarant.filter(
    //       (item) => item.status === status
    //     );
    //   }
    //   if (driveType) {
    //     calculateGarant = calculateGarant.filter((item) =>
    //       driveType.includes(item.drive_type)
    //     );
    //   }

    // setFilteredData(rollCallList ?? []);
    setIsLoading(false);
  };

  const onSearch = (value: string) => {
    if (value) {
      setFilteredData(
        [...data].filter((item) =>
          item.name.toLowerCase().includes(value.toLowerCase())
        )
      );
    } else {
      setFilteredData(data);
    }
  };

  const changeHandler = (event: any) => {
    onSearch(event.target.value);
  };
  const debouncedChangeHandler = useMemo(
    () => debounce(changeHandler, 300),
    [data]
  );

  useEffect(() => {
    loadData();
  }, []);

  return (
    <Space direction="vertical" size="large" style={{ display: "flex" }}>
      <Form onFinish={handleSubmit(onSubmit)}>
        <Card>
          <Form.Item label="Дата">
            <Controller
              name="date"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <DatePicker
                  format={"DD.MM.YYYY"}
                  {...field}
                  placeholder="Выберите дату"
                />
              )}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={isLoading}>
              Обновить
            </Button>
          </Form.Item>
        </Card>
      </Form>
      <Search
        placeholder="Введите название филиала..."
        size="large"
        onSearch={onSearch}
        onChange={debouncedChangeHandler}
      />
      <ColGrid numColsSm={2} numColsLg={3} gapX="gap-x-6" gapY="gap-y-6">
        {filteredData.map((item) => (
          <TremorCard key={item.id}>
            <Metric>{item.name}</Metric>
            <Text>{item.couriers.length} курьеров</Text>
            <List marginTop="mt-1">
              {item.couriers.map((courier) => (
                <ListItem key={courier.id}>
                  <Flex
                    justifyContent="justify-start"
                    spaceX="space-x-2.5"
                    truncate={true}
                  >
                    <Icon
                      size="md"
                      icon={
                        courier.is_online
                          ? CheckCircleIcon
                          : ExclamationCircleIcon
                      }
                      color={courier.is_online ? "green" : "red"}
                    />
                    {courier.first_name} {courier.last_name}{" "}
                    <CourierDriveTypeIcon driveType={courier.drive_type!} />
                  </Flex>
                  <Space>
                    {courier.app_version && `v${courier.app_version}`}
                    <Badge
                      text={
                        courier.created_at
                          ? dayjs(courier.created_at).format("HH:mm")
                          : courier.is_online
                          ? "не сегодня"
                          : "не в сети"
                      }
                      color={
                        courier.is_late
                          ? "red"
                          : courier.is_online
                          ? "green"
                          : "red"
                      }
                    />
                    <Button
                      type="primary"
                      shape="circle"
                      icon={<PhoneOutlined />}
                      size="small"
                      onClick={() =>
                        (window.location.href = `tel:${courier!.phone!.replace(
                          "+998",
                          ""
                        )}`)
                      }
                    />
                    {
                      // @ts-ignore
                    courier.daily_garant_id && (
                      <DailyGarant
                        day={filteredDate}
                        user_id={courier.id}
                      />
                    )}
                  </Space>
                </ListItem>
              ))}
            </List>
          </TremorCard>
        ))}
      </ColGrid>
    </Space>
  );
}
