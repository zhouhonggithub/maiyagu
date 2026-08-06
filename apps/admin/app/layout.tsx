'use client';

import { Refine } from '@refinedev/core';
import routerProvider from '@refinedev/nextjs-router';
import { App, ConfigProvider, Layout, Menu, theme } from 'antd';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  DashboardOutlined,
  GlobalOutlined,
  FileTextOutlined,
  RobotOutlined,
  PictureOutlined,
  SettingOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { adminDataProvider } from '../lib/data-provider';
import './globals.css';

const { Sider, Content } = Layout;

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: <Link href="/dashboard">Dashboard</Link> },
  { key: '/farms', icon: <GlobalOutlined />, label: <Link href="/farms">Farms</Link> },
  { key: '/plans', icon: <FileTextOutlined />, label: <Link href="/plans">Plans</Link> },
  { key: '/ai-models', icon: <RobotOutlined />, label: <Link href="/ai-models">AI Models</Link> },
  { key: '/assets', icon: <PictureOutlined />, label: <Link href="/assets">Assets</Link> },
  { key: '/config', icon: <SettingOutlined />, label: <Link href="/config">Config</Link> },
  { key: '/billing', icon: <DollarOutlined />, label: <Link href="/billing">Billing</Link> },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <html lang="zh-CN">
      <body>
        <ConfigProvider
          theme={{
            algorithm: theme.defaultAlgorithm,
            token: { colorPrimary: '#16a34a' },
          }}
        >
          <App>
            <Refine
              dataProvider={adminDataProvider}
              routerProvider={routerProvider}
              resources={[
                { name: 'dashboard', list: '/dashboard' },
                { name: 'farms', list: '/farms', show: '/farms/:id' },
                { name: 'plans', list: '/plans' },
                { name: 'ai-models', list: '/ai-models' },
                { name: 'assets', list: '/assets' },
                { name: 'config', list: '/config' },
                { name: 'billing', list: '/billing' },
              ]}
              options={{ syncWithLocation: true }}
            >
              <Layout style={{ minHeight: '100vh' }}>
                <Sider width={220} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
                  <div style={{ padding: '16px 24px', fontWeight: 700, fontSize: 18 }}>
                    🌱 AI Farm Admin
                  </div>
                  <Menu
                    mode="inline"
                    selectedKeys={[pathname]}
                    items={menuItems}
                    style={{ borderRight: 0 }}
                  />
                </Sider>
                <Content style={{ padding: 24, background: '#f5f5f5' }}>
                  {children}
                </Content>
              </Layout>
            </Refine>
          </App>
        </ConfigProvider>
      </body>
    </html>
  );
}
