/**
 * 知识库提供者列表组件
 * n9e-2kai: AI 助手模块 - 知识库设置
 */
import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Switch, Popconfirm, message, Tag, Tooltip } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  KnowledgeProvider,
  getKnowledgeProviders,
  deleteKnowledgeProvider,
  updateKnowledgeProvider,
  testKnowledgeProvider,
} from '@/services/aiassistant';
import ProviderForm from './ProviderForm';

interface ProviderListProps {
  onRefresh?: () => void;
}

const ProviderList: React.FC<ProviderListProps> = ({ onRefresh }) => {
  const { t } = useTranslation('aiassistant');
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<KnowledgeProvider[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<KnowledgeProvider | undefined>();
  const [testingId, setTestingId] = useState<number | null>(null);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const res = await getKnowledgeProviders();
      if (res.err) {
        message.error(res.err);
      } else {
        setProviders(res.dat || []);
      }
    } catch (error) {
      message.error(t('knowledge.fetch_failed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleAdd = () => {
    setEditingRecord(undefined);
    setFormVisible(true);
  };

  const handleEdit = (record: KnowledgeProvider) => {
    setEditingRecord(record);
    setFormVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await deleteKnowledgeProvider(id);
      if (res.err) {
        message.error(res.err);
      } else {
        message.success(t('knowledge.delete_success'));
        fetchProviders();
        onRefresh?.();
      }
    } catch (error) {
      message.error(t('knowledge.delete_failed'));
    }
  };

  const handleToggleEnabled = async (record: KnowledgeProvider) => {
    try {
      const res = await updateKnowledgeProvider(record.id, {
        enabled: !record.enabled,
      });
      if (res.err) {
        message.error(res.err);
      } else {
        message.success(t('knowledge.update_success'));
        fetchProviders();
      }
    } catch (error) {
      message.error(t('knowledge.update_failed'));
    }
  };

  const handleTest = async (id: number) => {
    setTestingId(id);
    try {
      const res = await testKnowledgeProvider(id);
      if (res.err) {
        message.error(res.err);
      } else if (res.dat.status === 'success') {
        message.success(t('knowledge.test_success'));
      } else {
        message.warning(res.dat.message || t('knowledge.test_failed'));
      }
    } catch (error) {
      message.error(t('knowledge.test_failed'));
    } finally {
      setTestingId(null);
    }
  };

  const handleFormOk = () => {
    setFormVisible(false);
    setEditingRecord(undefined);
    fetchProviders();
    onRefresh?.();
  };

  const handleFormCancel = () => {
    setFormVisible(false);
    setEditingRecord(undefined);
  };

  const getProviderTypeTag = (type: string) => {
    const typeMap: Record<string, { color: string; label: string }> = {
      cloudflare_autorag: { color: 'orange', label: 'Cloudflare AutoRAG' },
      coze: { color: 'blue', label: 'Coze' },
    };
    const config = typeMap[type] || { color: 'default', label: type };
    return <Tag color={config.color}>{config.label}</Tag>;
  };

  const columns = [
    {
      title: t('knowledge.provider_name'),
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: t('knowledge.provider_type'),
      dataIndex: 'provider_type',
      key: 'provider_type',
      width: 180,
      render: (type: string) => getProviderTypeTag(type),
    },
    {
      title: t('knowledge.enabled'),
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled: boolean, record: KnowledgeProvider) => (
        <Switch
          checked={enabled}
          onChange={() => handleToggleEnabled(record)}
          checkedChildren={<CheckCircleOutlined />}
          unCheckedChildren={<CloseCircleOutlined />}
        />
      ),
    },
    {
      title: t('knowledge.create_time'),
      dataIndex: 'create_at',
      key: 'create_at',
      width: 180,
      render: (ts: number) => ts ? new Date(ts * 1000).toLocaleString() : '-',
    },
    {
      title: t('knowledge.actions'),
      key: 'actions',
      width: 200,
      render: (_: any, record: KnowledgeProvider) => (
        <Space size="small">
          <Tooltip title={t('knowledge.test_connection')}>
            <Button
              type="link"
              size="small"
              icon={<ApiOutlined />}
              loading={testingId === record.id}
              onClick={() => handleTest(record.id)}
            />
          </Tooltip>
          <Tooltip title={t('common:btn.edit')}>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title={t('knowledge.confirm_delete')}
            onConfirm={() => handleDelete(record.id)}
            okText={t('common:btn.ok')}
            cancelText={t('common:btn.cancel')}
          >
            <Tooltip title={t('common:btn.delete')}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="provider-list">
      <div className="provider-list-header" style={{ marginBottom: 16 }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            {t('knowledge.add_provider')}
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchProviders} loading={loading}>
            {t('common:btn.refresh')}
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={providers}
        loading={loading}
        pagination={false}
        size="middle"
      />

      <ProviderForm
        visible={formVisible}
        record={editingRecord}
        onOk={handleFormOk}
        onCancel={handleFormCancel}
      />
    </div>
  );
};

export default ProviderList;
