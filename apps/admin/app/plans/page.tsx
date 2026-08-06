'use client';

import { useTable } from '@refinedev/antd';
import {
  Table, Typography, Space, Button, Modal, Form, Input, InputNumber, Switch, Tag, message,
} from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { apiFetch } from '../../lib/api';

const { Title, Text } = Typography;

interface Plan {
  id: string;
  name: string;
  memberMin: number;
  memberMax: number;
  monthlyPrice: number;
  aiCallsIncluded: number;
  storageGbIncluded: number;
  aiCallOveragePrice: number;
  storageOveragePrice: number;
  isActive: boolean;
}

export default function PlansListPage() {
  const { tableProps, tableQuery } = useTable<Plan>({
    resource: 'admin/plans',
    syncWithLocation: true,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form] = Form.useForm();

  const openCreate = () => {
    setEditingPlan(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    form.setFieldsValue(plan);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const method = editingPlan ? 'PUT' : 'POST';
    const endpoint = editingPlan ? `/admin/plans/${editingPlan.id}` : '/admin/plans';
    const res = await apiFetch(endpoint, { method, body: JSON.stringify(values) });
    if (res.ok) {
      message.success(editingPlan ? 'Plan updated' : 'Plan created');
      setModalOpen(false);
      tableQuery.refetch();
    } else {
      message.error('Operation failed');
    }
  };

  const toggleActive = async (plan: Plan) => {
    await apiFetch(`/admin/plans/${plan.id}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: !plan.isActive }),
    });
    tableQuery.refetch();
  };

  return (
    <div>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>Plans</Title>
            <Text type="secondary">Manage subscription plans</Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Create Plan</Button>
        </div>

        <Table
          {...tableProps}
          rowKey="id"
          columns={[
            { title: 'Name', dataIndex: 'name', key: 'name' },
            {
              title: 'Members',
              key: 'members',
              render: (_: unknown, r: Plan) => `${r.memberMin} - ${r.memberMax}`,
            },
            {
              title: 'Monthly Price',
              dataIndex: 'monthlyPrice',
              key: 'monthlyPrice',
              render: (v: number) => <Text strong>¥{v}</Text>,
            },
            { title: 'AI Calls', dataIndex: 'aiCallsIncluded', key: 'aiCallsIncluded' },
            { title: 'Storage (GB)', dataIndex: 'storageGbIncluded', key: 'storageGbIncluded' },
            {
              title: 'Active',
              dataIndex: 'isActive',
              key: 'isActive',
              render: (v: boolean, r: Plan) => (
                <Switch checked={v} onChange={() => toggleActive(r)} />
              ),
            },
            {
              title: 'Actions',
              key: 'actions',
              render: (_: unknown, r: Plan) => (
                <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(r)}>Edit</Button>
              ),
            },
          ]}
        />
      </Space>

      <Modal
        title={editingPlan ? 'Edit Plan' : 'Create Plan'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Space>
            <Form.Item name="memberMin" label="Member Min" rules={[{ required: true }]}>
              <InputNumber min={1} />
            </Form.Item>
            <Form.Item name="memberMax" label="Member Max" rules={[{ required: true }]}>
              <InputNumber min={1} />
            </Form.Item>
          </Space>
          <Form.Item name="monthlyPrice" label="Monthly Price (¥)" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Space>
            <Form.Item name="aiCallsIncluded" label="AI Calls Included">
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="storageGbIncluded" label="Storage (GB)">
              <InputNumber min={0} />
            </Form.Item>
          </Space>
          <Space>
            <Form.Item name="aiCallOveragePrice" label="AI Call Overage (¥)">
              <InputNumber min={0} step={0.01} />
            </Form.Item>
            <Form.Item name="storageOveragePrice" label="Storage Overage (¥/GB)">
              <InputNumber min={0} step={0.01} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
