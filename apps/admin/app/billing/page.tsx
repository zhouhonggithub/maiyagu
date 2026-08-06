'use client';

import { useTable } from '@refinedev/antd';
import {
  Table, Typography, Space, Tag, Select, Button,
} from 'antd';
import Link from 'next/link';
import { useState } from 'react';

const { Title, Text } = Typography;

interface Invoice {
  id: string;
  farmId: string;
  farmName: string;
  billingPeriod: string;
  baseFee: number;
  overageCharges: number;
  totalAmount: number;
  status: 'pending' | 'paid' | 'overdue';
  dueDate: string;
  usageBreakdown?: { item: string; amount: number; cost: number }[];
}

const statusColors: Record<string, string> = {
  pending: 'default',
  paid: 'green',
  overdue: 'red',
};

export default function BillingListPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const { tableProps } = useTable<Invoice>({
    resource: 'admin/billing',
    syncWithLocation: true,
    filters: {
      permanent: statusFilter ? [{ field: 'status', operator: 'eq', value: statusFilter }] : [],
    },
  });

  return (
    <div>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>Billing</Title>
            <Text type="secondary">Invoice and payment management</Text>
          </div>
          <Space>
            <Text>Status:</Text>
            <Select
              allowClear
              placeholder="All"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 120 }}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'paid', label: 'Paid' },
                { value: 'overdue', label: 'Overdue' },
              ]}
            />
          </Space>
        </div>

        <Table
          {...tableProps}
          rowKey="id"
          expandable={{
            expandedRowRender: (record: Invoice) => (
              <Table
                dataSource={record.usageBreakdown || []}
                rowKey="item"
                pagination={false}
                size="small"
                columns={[
                  { title: 'Item', dataIndex: 'item', key: 'item' },
                  { title: 'Usage', dataIndex: 'amount', key: 'amount' },
                  { title: 'Cost (¥)', dataIndex: 'cost', key: 'cost', render: (v: number) => `¥${v}` },
                ]}
              />
            ),
          }}
          columns={[
            {
              title: 'Farm',
              dataIndex: 'farmName',
              key: 'farmName',
              render: (name: string, r: Invoice) => (
                <Link href={`/billing/${r.farmId}`}>{name}</Link>
              ),
            },
            { title: 'Period', dataIndex: 'billingPeriod', key: 'billingPeriod' },
            {
              title: 'Base Fee',
              dataIndex: 'baseFee',
              key: 'baseFee',
              render: (v: number) => `¥${v}`,
            },
            {
              title: 'Overage',
              dataIndex: 'overageCharges',
              key: 'overageCharges',
              render: (v: number) => `¥${v}`,
            },
            {
              title: 'Total',
              dataIndex: 'totalAmount',
              key: 'totalAmount',
              render: (v: number) => <Text strong>¥{v}</Text>,
            },
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
            {
              title: 'Actions',
              key: 'actions',
              render: (_: unknown, r: Invoice) => (
                <Link href={`/billing/${r.farmId}`}>
                  <Button type="link" size="small">Detail</Button>
                </Link>
              ),
            },
          ]}
        />
      </Space>
    </div>
  );
}
