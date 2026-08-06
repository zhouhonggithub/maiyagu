'use client';

import { useTable } from '@refinedev/antd';
import {
  Table, Typography, Space, Button, Modal, Form, Input, Select, Tag, Slider, message, Popconfirm,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { apiFetch } from '../../lib/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface AIModel {
  id: string;
  modelName: string;
  versionIdentifier: string;
  adapterType: string;
  status: 'active' | 'testing' | 'deprecated';
  testingPercentage: number;
  endpointUrl: string;
  config?: string;
}

const statusColors: Record<string, string> = {
  active: 'green',
  testing: 'gold',
  deprecated: 'red',
};

export default function AIModelsListPage() {
  const { tableProps, tableQuery } = useTable<AIModel>({
    resource: 'admin/ai-models',
    syncWithLocation: true,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [testingModal, setTestingModal] = useState<AIModel | null>(null);
  const [testingPct, setTestingPct] = useState(0);
  const [form] = Form.useForm();

  const handleCreate = async () => {
    const values = await form.validateFields();
    const res = await apiFetch('/admin/ai-models', {
      method: 'POST',
      body: JSON.stringify(values),
    });
    if (res.ok) {
      message.success('Model registered');
      setCreateOpen(false);
      form.resetFields();
      tableQuery.refetch();
    } else {
      message.error('Failed to register model');
    }
  };

  const updateStatus = async (model: AIModel, status: string) => {
    await apiFetch(`/admin/ai-models/${model.id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    tableQuery.refetch();
  };

  const saveTestingPct = async () => {
    if (!testingModal) return;
    await apiFetch(`/admin/ai-models/${testingModal.id}`, {
      method: 'PUT',
      body: JSON.stringify({ testingPercentage: testingPct }),
    });
    setTestingModal(null);
    tableQuery.refetch();
  };

  return (
    <div>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>AI Models</Title>
            <Text type="secondary">Manage AI model registry and deployment</Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            Register Model
          </Button>
        </div>

        <Table
          {...tableProps}
          rowKey="id"
          columns={[
            { title: 'Model Name', dataIndex: 'modelName', key: 'modelName' },
            { title: 'Version', dataIndex: 'versionIdentifier', key: 'versionIdentifier' },
            {
              title: 'Adapter',
              dataIndex: 'adapterType',
              key: 'adapterType',
              render: (v: string) => <Tag>{v}</Tag>,
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (v: string) => <Tag color={statusColors[v] || 'default'}>{v}</Tag>,
            },
            {
              title: 'Testing %',
              dataIndex: 'testingPercentage',
              key: 'testingPercentage',
              render: (v: number) => `${v ?? 0}%`,
            },
            {
              title: 'Endpoint',
              dataIndex: 'endpointUrl',
              key: 'endpointUrl',
              ellipsis: true,
            },
            {
              title: 'Actions',
              key: 'actions',
              render: (_: unknown, r: AIModel) => (
                <Space>
                  {r.status !== 'active' && (
                    <Popconfirm title="Activate this model?" onConfirm={() => updateStatus(r, 'active')}>
                      <Button type="link" size="small">Activate</Button>
                    </Popconfirm>
                  )}
                  {r.status !== 'deprecated' && (
                    <Popconfirm title="Deprecate this model?" onConfirm={() => updateStatus(r, 'deprecated')}>
                      <Button type="link" size="small" danger>Deprecate</Button>
                    </Popconfirm>
                  )}
                  <Button
                    type="link"
                    size="small"
                    onClick={() => { setTestingModal(r); setTestingPct(r.testingPercentage ?? 0); }}
                  >
                    Set Testing %
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Space>

      <Modal
        title="Register AI Model"
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => setCreateOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="modelName" label="Model Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="versionIdentifier" label="Version" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="adapterType" label="Adapter Type" rules={[{ required: true }]}>
            <Select options={[
              { value: 'qwen_vl', label: 'Qwen VL' },
              { value: 'gpt4v', label: 'GPT-4V' },
              { value: 'custom', label: 'Custom' },
            ]} />
          </Form.Item>
          <Form.Item name="endpointUrl" label="Endpoint URL" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="config" label="Config (JSON)">
            <TextArea rows={4} placeholder='{"key": "value"}' />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Set Testing % — ${testingModal?.modelName}`}
        open={!!testingModal}
        onOk={saveTestingPct}
        onCancel={() => setTestingModal(null)}
      >
        <Slider min={0} max={100} value={testingPct} onChange={setTestingPct} />
        <Text>Current: {testingPct}%</Text>
      </Modal>
    </div>
  );
}
