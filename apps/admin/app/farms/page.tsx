'use client';

import { useTable } from '@refinedev/antd';
import { Table, Tag, Typography, Space, Button } from 'antd';
import Link from 'next/link';

const { Title, Text } = Typography;

export default function FarmsListPage() {
  const { tableProps } = useTable({
    resource: 'farms',
    syncWithLocation: true,
  });

  return (
    <div>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>Farms</Title>
            <Text type="secondary">Manage all registered farms on the platform</Text>
          </div>
        </div>

        <Table
          {...tableProps}
          rowKey="id"
          columns={[
            {
              title: 'Farm Name',
              dataIndex: 'name',
              key: 'name',
              render: (name: any, record: any) => (
                <Link href={`/farms/${record.id}`}>{name}</Link>
              ),
            },
            {
              title: 'Owner',
              dataIndex: 'ownerName',
              key: 'ownerName',
            },
            {
              title: 'Plan',
              dataIndex: 'plan',
              key: 'plan',
              render: (plan: string) => <Tag color="blue">{plan || 'Free'}</Tag>,
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status: string) => {
                const color = status === 'active' ? 'green' : status === 'suspended' ? 'red' : 'default';
                return <Tag color={color}>{status || 'pending'}</Tag>;
              },
            },
            {
              title: 'Devices',
              dataIndex: 'deviceCount',
              key: 'deviceCount',
            },
            {
              title: 'Created',
              dataIndex: 'createdAt',
              key: 'createdAt',
              render: (date: string) => date ? new Date(date).toLocaleDateString('zh-CN') : '-',
            },
            {
              title: 'Actions',
              key: 'actions',
              render: (_: any, record: any) => (
                <Link href={`/farms/${record.id}`}>
                  <Button type="link" size="small">View</Button>
                </Link>
              ),
            },
          ]}
        />
      </Space>
    </div>
  );
}
