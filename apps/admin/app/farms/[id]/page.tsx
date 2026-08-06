'use client';

import { useShow } from '@refinedev/core';
import { Card, Descriptions, Typography, Space, Button, Tag, Divider, Row, Col, Statistic } from 'antd';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircleOutlined, StopOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function FarmDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { queryResult } = useShow({ resource: 'farms', id: params.id as string });
  const { data, isLoading } = queryResult;
  const farm = data?.data as Record<string, unknown> | undefined;

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Button type="link" onClick={() => router.push('/farms')} style={{ padding: 0 }}>
              ← Back to Farms
            </Button>
            <Title level={3} style={{ margin: '8px 0 0' }}>
              {(farm?.name as string) || 'Farm Detail'}
            </Title>
          </div>
          <Space>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              style={{ background: '#16a34a' }}
            >
              Approve
            </Button>
            <Button
              danger
              icon={<StopOutlined />}
            >
              Suspend
            </Button>
          </Space>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic title="Devices" value={(farm?.deviceCount as number) || 0} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic title="Members" value={(farm?.memberCount as number) || 0} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic title="AI Tasks" value={(farm?.taskCount as number) || 0} />
            </Card>
          </Col>
        </Row>

        <Card title="Farm Information">
          <Descriptions column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Farm ID">{(farm?.id as string) || '-'}</Descriptions.Item>
            <Descriptions.Item label="Name">{(farm?.name as string) || '-'}</Descriptions.Item>
            <Descriptions.Item label="Owner">{(farm?.ownerName as string) || '-'}</Descriptions.Item>
            <Descriptions.Item label="Plan">
              <Tag color="blue">{(farm?.plan as string) || 'Free'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={(farm?.status as string) === 'active' ? 'green' : 'red'}>
                {(farm?.status as string) || 'pending'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Region">{(farm?.region as string) || '-'}</Descriptions.Item>
            <Descriptions.Item label="Created">
              {farm?.createdAt ? new Date(farm.createdAt as string).toLocaleDateString('zh-CN') : '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Activity Log">
          <Text type="secondary">No activity recorded yet.</Text>
        </Card>
      </Space>
    </div>
  );
}
