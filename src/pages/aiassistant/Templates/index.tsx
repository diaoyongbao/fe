/**
 * AI 助手 - 模板中心页面
 * n9e-2kai: AI 助手模块
 */
import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, Modal, Form, Input, Select, Switch, message, Popconfirm } from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ColumnsType } from 'antd/es/table';
import PageLayout from '@/components/pageLayout';
import { getMCPTemplates, createMCPTemplate, updateMCPTemplate, deleteMCPTemplate, MCPTemplate } from '@/services/aiassistant';
import './index.less';

const { TextArea } = Input;
const { Option } = Select;

interface TemplateCenterProps {
  embedded?: boolean;
}

const TemplateCenter: React.FC<TemplateCenterProps> = ({ embedded = false }) => {
  const { t } = useTranslation('aiassistant');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MCPTemplate[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit'>('add');
  const [editingRecord, setEditingRecord] = useState<MCPTemplate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // 获取模板列表
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await getMCPTemplates();
      if (res?.err) {
        message.error(res.err);
        setData([]);
        return;
      }
      setData(res?.dat || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      message.error(t('common.operation_failed'));
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);


  // 打开添加弹窗
  const handleAdd = () => {
    setModalType('add');
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      category: 'general',
      is_default: false,
      is_public: true,
    });
    setModalVisible(true);
  };

  // 打开编辑弹窗
  const handleEdit = (record: MCPTemplate) => {
    setModalType('edit');
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
    });
    setModalVisible(true);
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (modalType === 'add') {
        const res = await createMCPTemplate(values);
        if (res.err) {
          message.error(res.err);
          return;
        }
        message.success(t('templates.add_success'));
      } else if (editingRecord) {
        const res = await updateMCPTemplate(editingRecord.id, values);
        if (res.err) {
          message.error(res.err);
          return;
        }
        message.success(t('templates.update_success'));
      }

      setModalVisible(false);
      fetchTemplates();
    } catch (error) {
      console.error('Form validation failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // 删除模板
  const handleDelete = async (id: number) => {
    try {
      const res = await deleteMCPTemplate(id);
      if (res.err) {
        message.error(res.err);
        return;
      }
      message.success(t('templates.delete_success'));
      fetchTemplates();
    } catch (error) {
      message.error(t('common.operation_failed'));
    }
  };

  // 表格列定义
  const columns: ColumnsType<MCPTemplate> = [
    {
      title: t('templates.name'),
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text) => (
        <Space>
          <FileTextOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: t('templates.category'),
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: t('templates.is_default'),
      dataIndex: 'is_default',
      key: 'is_default',
      width: 100,
      render: (val: boolean) => (
        val ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#d9d9d9' }} />
      ),
    },
    {
      title: t('templates.is_public'),
      dataIndex: 'is_public',
      key: 'is_public',
      width: 100,
      render: (val: boolean) => (
        val ? <Tag color="green">{t('templates.public')}</Tag> : <Tag color="default">{t('templates.private')}</Tag>
      ),
    },
    {
      title: t('templates.description'),
      dataIndex: 'description',
      key: 'description',
      width: 250,
      ellipsis: true,
    },
    {
      title: t('common.create_at'),
      dataIndex: 'create_at',
      key: 'create_at',
      width: 180,
      render: (val: number) => (val ? new Date(val * 1000).toLocaleString() : '-'),
    },
    {
      title: t('common.create_by'),
      dataIndex: 'create_by',
      key: 'create_by',
      width: 120,
    },
    {
      title: t('templates.actions'),
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            {t('common.edit')}
          </Button>
          <Popconfirm
            title={t('templates.confirm_delete')}
            onConfirm={() => handleDelete(record.id)}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              {t('common.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const content = (
    <div className={`templates-container ${embedded ? 'embedded-mode' : ''}`}>
      <Card
        extra={
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              {t('templates.add')}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchTemplates}>
              {t('common.refresh')}
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `${total} items`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 添加/编辑弹窗 */}
      <Modal
        title={modalType === 'add' ? t('templates.add') : t('templates.edit')}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        width={700}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={t('templates.name')}
            rules={[{ required: true, message: t('templates.name_required') }]}
          >
            <Input placeholder={t('templates.name')} />
          </Form.Item>

          <Form.Item name="category" label={t('templates.category')} rules={[{ required: true }]}>
            <Select>
              <Option value="general">{t('templates.category_general')}</Option>
              <Option value="k8s">{t('templates.category_k8s')}</Option>
              <Option value="database">{t('templates.category_database')}</Option>
              <Option value="alert">{t('templates.category_alert')}</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="server_config"
            label={t('templates.config')}
            rules={[{ required: true, message: t('templates.config_required') }]}
          >
            <TextArea rows={8} placeholder="JSON format" style={{ fontFamily: 'monospace' }} />
          </Form.Item>

          <Form.Item name="is_default" label={t('templates.is_default')} valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="is_public" label={t('templates.is_public')} valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="description" label={t('templates.description')}>
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <PageLayout
      title={
        <Space>
          <FileTextOutlined />
          {t('templates_title')}
        </Space>
      }
    >
      {content}
    </PageLayout>
  );
};

export default TemplateCenter;
