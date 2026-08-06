'use client';

import { Card, Col, Row, Statistic, Typography } from 'antd';
import {
  GlobalOutlined,
  UserOutlined,
  RobotOutlined,
  DollarOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

export default function DashboardPage() {
  return (
    <div>
      <Title level={3}>Platform Dashboard</Title>
      <Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>
        Platform-wide metrics and overview
      </Text>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Farms"
              value={0}
              prefix={<GlobalOutlined />}
              valueStyle={{ color: '#16a34a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Users"
              value={0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#2563eb' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="AI Tasks (24h)"
              value={0}
              prefix={<RobotOutlined />}
              valueStyle={{ color: '#9333ea' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Monthly Revenue"
              value={0}
              prefix={<DollarOutlined />}
              suffix="¥"
              valueStyle={{ color: '#ea580c' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Recent Farm Registrations">
            <Text type="secondary">No recent registrations</Text>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Pending Approvals">
            <Text type="secondary">No pending approvals</Text>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
