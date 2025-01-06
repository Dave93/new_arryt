import DashboardDatePicker from "@admin/src/components/dashboard/filters/date-filter/picker";
import { OrdersCountBarChart } from '../../components/dashboard/charts/OrdersCountBarChart';
import { DeliveryTimeBarChart } from '../../components/dashboard/charts/DeliveryTimeBarChart';
import { Col, Row, Space } from "antd";

export default function DashboardPage() {
  return (
    <div>
      <h1>Home Page</h1>
      <Space direction="vertical" style={{ width: '100%' }}>
        <DashboardDatePicker />
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <OrdersCountBarChart />
          </Col>
          <Col span={12}>
            <DeliveryTimeBarChart />
          </Col>
        </Row>
      </Space>
    </div>
  );
}
