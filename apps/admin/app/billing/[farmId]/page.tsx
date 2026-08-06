'use client';

import {
  Typography, Space, Card, Table, Tag, Statistic, Row, Col, Descriptions,
} from 'antd';
import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../../lib/api';

const { Title, Text } = Typography;

interface FarmBilling {
  farmName: string;
  planName: string;
  planPrice: number;
  subscriptionStatus: string;
  invoices: {
    id: string;
    billingPeriod: string;
    baseFee: number;
    overageCharges: number;
    totalAmount: number;
    status: string;
    dueDate: string;
  }[];
}

const statusColors: Record<string, string> = {
  pending: 'default',
  paid: 'green',
  overdue: 'red',
  active: 'green',
  cancelled: 'red',
};

export default function FarmBillingDetailPage() {
  const params = useParams();
  const farmId = params.farmId as string;
  const [data, setData] = useState<FarmBilling | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch(`/admin/billing/${farmId}`);
    if (res.ok) {
      setData(await res.json());
    }
    setLoading(false);
  }, [farmId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <Card loading />;
  if (!data) return <Text>Farm billing data not found.</Text>;

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Title level={3} style={{ margin: 0 }}>{data.farmName} — Billing</Title>

        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic title="Current Plan" value={data.planName || 'N/A'} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="Monthly Fee" prefix="¥" value={data.planPrice ?? 0} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="Total Invoices" value={data.invoices?.length ?? 0} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Subscription Status"
                value={data.subscriptionStatus || 'Unknown'}
                valueStyle={{ color: data.subscriptionStatus === 'active' ? '#16a34a' : '#cf1322' }}
              />
            </Card>
          </Col>
        </Row>

        <Card title="Subscription Info">
          <Descriptions column={2}>
            <Descriptions.Item label="Farm">{data.farmName}</Descriptions.Item>
            <Descriptions.Item label="Plan">{data.planName}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={statusColors[data.subscriptionStatus] || 'default'}>
                {data.subscriptionStatus}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Monthly Fee">¥{data.planPrice}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Invoice History">
          <Table
            dataSource={data.invoices || []}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            columns={[
              { title: 'Period', dataIndex: 'billingPeriod', key: 'billingPeriod' },
              { title: 'Base Fee', dataIndex: 'baseFee', key: 'baseFee', render: (v: number) => `¥${v}` },
              { title: 'Overage', dataIndex: 'overageCharges', key: 'overageCharges', render: (v: number) => `¥${v}` },
              { title: 'Total', dataIndex: 'totalAmount', key: 'totalAmount', render: (v: number) => <Text strong>¥{v}</Text> },
              {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                render: (v: string) => <Tag color={statusColors[v] || 'default'}>{v}</Tag>,
              },
              {
                title: 'Due Date',
                dataIndex: 'dueDate',
                key: 'dueDate',
                render: (d: string) => d ? new Date(d).toLocaleDateString('zh-CN') : '-',
              },
            ]}
          />
        </Card>

        <Card title="Usage Chart (Placeholder)">
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', borderRadius: 8 }}>
            <Text type="secondary">📊 Usage chart will be integrated here</Text>
          </div>
        </Card>
      </Space>
    </div>
  );
}
