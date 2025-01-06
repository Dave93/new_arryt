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

interface DeliveryTimeResponse {
  period: string;
  average_delivery_time: string;
}

interface DeliveryTimeData {
  labels: string[];
  averages: number[];
}

export function DeliveryTimeBarChart() {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const dateRange = useDateFilterStore(state => state.dateRange);
  const chartRef = useRef<ChartJS>(null);
  
  const [period, setPeriod] = useState<Period>('day');
  const [organizations, setOrganizations] = useState<InferSelectModel<typeof organization>[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [chartData, setChartData] = useState<DeliveryTimeData>({ labels: [], averages: [] });

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

  const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
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
      const response = await apiClient.api.chart.delivery_time_per_period.get({
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
        const data = response.data as DeliveryTimeResponse[];
        setChartData({
          labels: data.map(item => formatDate(item.period, period)),
          averages: data.map(item => {
            const minutes = parseFloat(item.average_delivery_time);
            return isNaN(minutes) ? 0 : Math.round(minutes * 100) / 100;
          })
        });
      }
    } catch (error) {
      console.error('Error fetching delivery time data:', error);
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
          label: (context: any) => `Average Time: ${formatMinutes(context.raw)}`
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
            modifierKey: null
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => formatMinutes(Number(value))
        }
      }
    }
  };

  const chartDataConfig = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'Delivery Time',
        data: chartData.averages,
        backgroundColor: '#52c41a',
        borderColor: '#389e0d',
        borderWidth: 1
      }
    ]
  };

  return (
    <Card title="Average Delivery Time">
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