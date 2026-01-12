/**
 * 知识库工具列表组件
 * n9e-2kai: AI 助手模块 - 知识库设置
 */
import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Switch, Popconfirm, message, Tag, Tooltip } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  KnowledgeTool,
  KnowledgeProvider,
  getKnowledgeTools,
  getKnowledgeProviders,
  deleteKnowledgeTool,
  updateKnowledgeTool,
} from '@/services/aiassistant';
import ToolForm from './ToolForm';

interface ToolListProps {
  onRefresh?: () => void;
}

const ToolList: React.FC<ToolListProps> = ({ onRefresh }) => {
  const { t } = useTranslation('aiassistant');
  const [loading, setLoading] = useState(false);
  const [tools, setTools] = useState<KnowledgeTool[]>([]);
  const [providers, setProviders] = useState<KnowledgeProvider[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<KnowledgeTool | undefined>();

  const fetchTools = async () => {
    setLoading(true);
    try {
      const res = await getKnowledgeTools();
      if (res.err) {
        message.error(res.err);
      } else {
        setTools(res.dat || []);
      }
    } catch (error) {
      message.error(t('knowledge.fetch_failed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchProviders = async () => {
    try {
      const res = await getKnowledgeProviders();
      if (!res.err) {
        setProviders(res.dat || []);
      }
    } catch (error) {
      // 静默失败
    }
  };


  useEffect(() => {
    fetchTools();
    fetchProviders();
  }, []);

  const handleAdd = () => {
    setEditingRecord(undefined);
    setFormVisible(true);
  };

  const handleEdit = (record: KnowledgeTool) => {
    setEditingRecord(record);
    setFormVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await deleteKnowledgeTool(id);
      if (res.err) {
        message.error(res.err);
      } else {
        message.success(t('knowledge.delete_success'));
        fetchTools();
        onRefresh?.();
      }
    } catch (error) {
      message.error(t('knowledge.delete_failed'));
    }
  };

  const handleToggleEnabled = async (record: KnowledgeTool) => {
    try {
      const res = await updateKnowledgeTool(record.id, {
        enabled: !record.enabled,
      });
      if (res.err) {
        message.error(res.err);
      } else {
        message.success(t('knowledge.update_success'));
        fetchTools();
      }
    } catch (error) {
      message.error(t('knowledge.update_failed'));
    }
  };

  const handleFormOk = () => {
    setFormVisible(false);
    setEditingRecord(undefined);
    fetchTools();
    onRefresh?.();
  };

  const handleFormCancel = () => {
    setFormVisible(false);
    setEditingRecord(undefined);
  };

  const getProviderName = (providerId: number) => {
    const provider = providers.find((p) => p.id === providerId);
    return provider ? provider.name : '-';
  };

  const parseKeywords = (keywordsStr: string): string[] => {
    try {
      return JSON.parse(keywordsStr || '[]');
    } catch {
      return [];
    }
  };

  const columns = [
    {
      title: t('knowledge.tool_name'),
      dataIndex: 'name',
      key: 'name',
      width: 180,
    },
    {
      title: t('knowledge.tool_description'),
      dataIndex: 'description',
      key: 'description',
      width: 250,
      ellipsis: true,
    },
    {
      title: t('knowledge.provider'),
      dataIndex: 'provider_id',
      key: 'provider_id',
      width: 150,
      render: (providerId: number) => getProviderName(providerId),
    },
    {
      title: t('knowledge.keywords'),
      dataIndex: 'keywords',
      key: 'keywords',
      width: 200,
      render: (keywords: string) => {
        const keywordList = parseKeywords(keywords);
        return (
          <Space size={[0, 4]} wrap>
            {keywordList.slice(0, 3).map((kw) => (
              <Tag key={kw} color="blue">
                {kw}
              </Tag>
            ))}
            {keywordList.length > 3 && (
              <Tooltip title={keywordList.slice(3).join(', ')}>
                <Tag>+{keywordList.length - 3}</Tag>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: t('knowledge.priority'),
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      sorter: (a: KnowledgeTool, b: KnowledgeTool) => a.priority - b.priority,
    },
    {
      title: t('knowledge.enabled'),
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled: boolean, record: KnowledgeTool) => (
        <Switch
          checked={enabled}
          onChange={() => handleToggleEnabled(record)}
          checkedChildren={<CheckCircleOutlined />}
          unCheckedChildren={<CloseCircleOutlined />}
        />
      ),
    },
    {
      title: t('knowledge.actions'),
      key: 'actions',
      width: 120,
      render: (_: any, record: KnowledgeTool) => (
        <Space size="small">
          <Tooltip title={t('common:btn.edit')}>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title={t('knowledge.confirm_delete_tool')}
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
    <div className="tool-list">
      <div className="tool-list-header" style={{ marginBottom: 16 }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            {t('knowledge.add_tool')}
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchTools} loading={loading}>
            {t('common:btn.refresh')}
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={tools}
        loading={loading}
        pagination={false}
        size="middle"
      />

      <ToolForm
        visible={formVisible}
        record={editingRecord}
        onOk={handleFormOk}
        onCancel={handleFormCancel}
      />
    </div>
  );
};

export default ToolList;
