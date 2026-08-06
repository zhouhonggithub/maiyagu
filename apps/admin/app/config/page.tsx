'use client';

import {
  Typography, Space, Button, Card, Form, InputNumber, TimePicker, Select, message, Divider,
} from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../lib/api';

const { Title, Text } = Typography;

interface TimeWaveEntry {
  startTime: string;
  endTime: string;
  interval: number;
}

interface AIModelOption {
  id: string;
  modelName: string;
  versionIdentifier: string;
}

export default function ConfigPage() {
  const [entries, setEntries] = useState<TimeWaveEntry[]>([
    { startTime: '00:00', endTime: '06:00', interval: 300 },
    { startTime: '06:00', endTime: '18:00', interval: 60 },
    { startTime: '18:00', endTime: '24:00', interval: 180 },
  ]);
  const [models, setModels] = useState<AIModelOption[]>([]);
  const [defaultModel, setDefaultModel] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, modelsRes] = await Promise.all([
        apiFetch('/admin/config'),
        apiFetch('/admin/ai-models'),
      ]);
      if (configRes.ok) {
        const config = await configRes.json();
        if (config.timeWaveEntries) setEntries(config.timeWaveEntries);
        if (config.defaultModelId) setDefaultModel(config.defaultModelId);
      }
      if (modelsRes.ok) {
        const data = await modelsRes.json();
        const list = data.data || data;
        setModels(list.filter((m: AIModelOption & { status: string }) => m.status === 'active'));
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const updateEntry = (index: number, field: keyof TimeWaveEntry, value: string | number) => {
    const updated = [...entries];
    (updated[index] as any)[field] = value;
    setEntries(updated);
  };

  const addEntry = () => {
    setEntries([...entries, { startTime: '00:00', endTime: '00:00', interval: 60 }]);
  };

  const removeEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const saveTimeWave = async () => {
    const res = await apiFetch('/admin/config', {
      method: 'PUT',
      body: JSON.stringify({ timeWaveEntries: entries }),
    });
    if (res.ok) message.success('Time wave config saved');
    else message.error('Save failed');
  };

  const saveDefaultModel = async () => {
    const res = await apiFetch('/admin/config', {
      method: 'PUT',
      body: JSON.stringify({ defaultModelId: defaultModel }),
    });
    if (res.ok) message.success('Default model saved');
    else message.error('Save failed');
  };

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Title level={3} style={{ margin: 0 }}>Platform Configuration</Title>

        <Card title="Global Time Wave Config" loading={loading}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {entries.map((entry, index) => (
              <Space key={index} align="center">
                <input
                  type="time"
                  value={entry.startTime}
                  onChange={e => updateEntry(index, 'startTime', e.target.value)}
                  style={{ padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: 6 }}
                />
                <Text>—</Text>
                <input
                  type="time"
                  value={entry.endTime}
                  onChange={e => updateEntry(index, 'endTime', e.target.value)}
                  style={{ padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: 6 }}
                />
                <InputNumber
                  value={entry.interval}
                  onChange={v => updateEntry(index, 'interval', v ?? 60)}
                  min={1}
                  addonAfter="seconds"
                  style={{ width: 160 }}
                />
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeEntry(index)}
                  disabled={entries.length <= 1}
                />
              </Space>
            ))}
            <Space>
              <Button icon={<PlusOutlined />} onClick={addEntry}>Add Entry</Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={saveTimeWave}>Save</Button>
            </Space>
          </Space>
        </Card>

        <Card title="Default AI Model">
          <Space>
            <Select
              value={defaultModel}
              onChange={setDefaultModel}
              style={{ width: 320 }}
              placeholder="Select default model"
              options={models.map(m => ({
                value: m.id,
                label: `${m.modelName} (${m.versionIdentifier})`,
              }))}
            />
            <Button type="primary" icon={<SaveOutlined />} onClick={saveDefaultModel}>Save</Button>
          </Space>
        </Card>
      </Space>
    </div>
  );
}
