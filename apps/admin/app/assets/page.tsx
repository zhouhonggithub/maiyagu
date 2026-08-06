'use client';

import {
  Typography, Space, Button, Modal, Form, Input, Select, Card, Tag, Upload, Checkbox,
  Row, Col, Tabs, message, Popconfirm,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, InboxOutlined } from '@ant-design/icons';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../lib/api';

const { Title, Text } = Typography;
const { Dragger } = Upload;
const { Meta } = Card;

interface Asset {
  id: string;
  displayName: string;
  category: string;
  imageUrl: string;
  mappingKeywords: string[];
  isDefault: boolean;
}

const categories = ['All', 'Crop', 'Visitor', 'Status'];

export default function AssetsListPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch('/admin/assets');
    if (res.ok) {
      const data = await res.json();
      setAssets(data.data || data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const filtered = activeTab === 'All' ? assets : assets.filter(a => a.category === activeTab);

  const handleUpload = async () => {
    const values = await form.validateFields();
    const res = await apiFetch('/admin/assets', {
      method: 'POST',
      body: JSON.stringify({
        ...values,
        mappingKeywords: values.mappingKeywords?.split(',').map((s: string) => s.trim()) || [],
      }),
    });
    if (res.ok) {
      message.success('Asset uploaded');
      setUploadOpen(false);
      form.resetFields();
      fetchAssets();
    } else {
      message.error('Upload failed');
    }
  };

  const handleEdit = async () => {
    if (!editingAsset) return;
    const values = await editForm.validateFields();
    const res = await apiFetch(`/admin/assets/${editingAsset.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...values,
        mappingKeywords: values.mappingKeywords?.split(',').map((s: string) => s.trim()) || [],
      }),
    });
    if (res.ok) {
      message.success('Asset updated');
      setEditingAsset(null);
      fetchAssets();
    }
  };

  const handleDelete = async (id: string) => {
    await apiFetch(`/admin/assets/${id}`, { method: 'DELETE' });
    message.success('Deleted');
    fetchAssets();
  };

  return (
    <div>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>Asset Library</Title>
            <Text type="secondary">Manage visual assets for farms</Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setUploadOpen(true)}>
            Upload Asset
          </Button>
        </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab}
          items={categories.map(c => ({ key: c, label: c }))}
        />

        <Row gutter={[16, 16]}>
          {filtered.map(asset => (
            <Col key={asset.id} xs={12} sm={8} md={6} lg={4}>
              <Card
                hoverable
                cover={
                  <div style={{ height: 120, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {asset.imageUrl ? (
                      <img src={asset.imageUrl} alt={asset.displayName} style={{ maxHeight: '100%', maxWidth: '100%' }} />
                    ) : (
                      <InboxOutlined style={{ fontSize: 32, color: '#ccc' }} />
                    )}
                  </div>
                }
                actions={[
                  <EditOutlined key="edit" onClick={() => { setEditingAsset(asset); editForm.setFieldsValue({ ...asset, mappingKeywords: asset.mappingKeywords?.join(', ') }); }} />,
                  <Popconfirm key="del" title="Delete this asset?" onConfirm={() => handleDelete(asset.id)}>
                    <DeleteOutlined />
                  </Popconfirm>,
                ]}
              >
                <Meta
                  title={asset.displayName}
                  description={<Tag color="blue">{asset.category}</Tag>}
                />
              </Card>
            </Col>
          ))}
        </Row>
      </Space>

      <Modal title="Upload Asset" open={uploadOpen} onOk={handleUpload} onCancel={() => setUploadOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="imageUrl" label="Image URL" rules={[{ required: true }]}>
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="displayName" label="Display Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category" label="Category" rules={[{ required: true }]}>
            <Select options={[
              { value: 'Crop', label: 'Crop' },
              { value: 'Visitor', label: 'Visitor' },
              { value: 'Status', label: 'Status' },
            ]} />
          </Form.Item>
          <Form.Item name="mappingKeywords" label="Keywords (comma separated)">
            <Input placeholder="wheat, rice, corn" />
          </Form.Item>
          <Form.Item name="isDefault" valuePropName="checked" label="">
            <Checkbox>Set as default</Checkbox>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Edit Asset" open={!!editingAsset} onOk={handleEdit} onCancel={() => setEditingAsset(null)} destroyOnClose>
        <Form form={editForm} layout="vertical">
          <Form.Item name="displayName" label="Display Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="mappingKeywords" label="Keywords (comma separated)">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
