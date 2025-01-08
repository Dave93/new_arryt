import { Card, Radio, RadioChangeEvent, Segmented, Space, Button } from 'antd';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { Bar } from 'react-chartjs-2';
import { useState, useEffect, useRef } from 'react';
import { useDateFilterStore } from '../filters/date-filter/store';
import { apiClient } from '../../../eden';
import { useGetIdentity } from "@refinedev/core";
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import { organization } from "@api/drizzle/schema";
import { InferSelectModel } from "drizzle-orm";
import { ChartOptions } from 'chart.js';

// Register plugins
dayjs.extend(isoWeek);
dayjs.extend(weekOfYear);

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  zoomPlugin
);

type Period = 'day' | 'week' | 'month' | 'year';

interface OrdersCountResponse {
  period: string;
  count: string;
}

interface OrdersCountData {
  labels: string[];
  counts: number[];
}

export function OrdersCountBarChart() {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const dateRange = useDateFilterStore(state => state.dateRange);
  const chartRef = useRef<ChartJS>(null);
  
  const [period, setPeriod] = useState<Period>('day');
  const [organizations, setOrganizations] = useState<InferSelectModel<typeof organization>[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [chartData, setChartData] = useState<OrdersCountData>({ labels: [], counts: [] });

  const formatDate = (dateStr: string, periodType: Period) => {
    const date = dayjs(dateStr);
    switch (periodType) {
      case 'day':
        return date.format('DD MMM');
      case 'week':
        return `Week ${date.isoWeek()}`;
      case 'month':
        return date.format('MMM YYYY');
      case 'year':
        return date.format('YYYY');
      default:
        return date.format('DD MMM');
    }
  };

  const getAllFilterData = async () => {
    if (!identity?.token.accessToken) return;

    const { data: organizations } = await apiClient.api.organizations.cached.get({
      $headers: {
        Authorization: `Bearer ${identity.token.accessToken}`,
      },
    });

    if (organizations && Array.isArray(organizations)) {
      setOrganizations(organizations);
    }
  };

  const fetchData = async () => {
    if (!dateRange?.[0] || !dateRange?.[1] || !identity?.token.accessToken) return;

    try {
      const response = await apiClient.api.chart.orders_count_per_period.get({
        $query: {
          start_date: dateRange[0].toISOString(),
          end_date: dateRange[1].toISOString(),
          period,
          ...(organizationId ? { organization_id: organizationId } : {})
        },
        $headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${identity.token.accessToken}`,
        }
      });

      if (response.data) {
        const data = response.data as OrdersCountResponse[];
        setChartData({
          labels: data.map(item => formatDate(item.period, period)),
          counts: data.map(item => parseInt(item.count, 10))
        });
      }
    } catch (error) {
      console.error('Error fetching orders count data:', error);
    }
  };

  useEffect(() => {
    getAllFilterData();
  }, [identity]);

  useEffect(() => {
    fetchData();
  }, [period, dateRange, identity, organizationId]);

  const handlePeriodChange = (e: RadioChangeEvent) => {
    setPeriod(e.target.value);
  };

  const handleOrganizationChange = (value: string | null) => {
    setOrganizationId(value);
  };

  const resetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
    }
  };

  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `Orders: ${context.formattedValue}`
        }
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x' as const,
          modifierKey: 'ctrl'
        },
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true
          },
          mode: 'x' as const,
          drag: {
            enabled: true,
            backgroundColor: 'rgba(225,225,225,0.3)',
            threshold: 10,
            modifierKey: undefined
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  };

  const chartDataConfig = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'Orders',
        data: chartData.counts,
        backgroundColor: '#1890ff',
        borderColor: '#096dd9',
        borderWidth: 1
      }
    ]
  };

  return (
    <Card title="Orders Count">
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Segmented
          options={[
            { label: 'Все', value: null },
            ...organizations.map(organization => ({ 
              label: organization.name, 
              value: organization.id 
            })),
          ]}
          onChange={handleOrganizationChange}
        />
        <div style={{ position: 'relative' }}>
          {/* @ts-ignore */}
          <Bar ref={chartRef} options={chartOptions} data={chartDataConfig} />
          <Button 
            size="small" 
            onClick={resetZoom}
            style={{ 
              position: 'absolute', 
              right: 10, 
              top: 10 
            }}
          >
            Reset Zoom
          </Button>
        </div>
        
        <div style={{ marginTop: 16 }}>
          <Radio.Group 
            value={period} 
            onChange={handlePeriodChange} 
            buttonStyle="solid"
          >
            <Radio.Button value="day">Daily</Radio.Button>
            <Radio.Button value="week">Weekly</Radio.Button>
            <Radio.Button value="month">Monthly</Radio.Button>
            <Radio.Button value="year">Yearly</Radio.Button>
          </Radio.Group>
        </div>
      </Space>
    </Card>
  );
}
