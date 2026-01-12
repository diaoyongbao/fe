/**
 * AI 助手 - MCP 服务器管理页面
 * n9e-2kai: AI 助手模块
 */
import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, Modal, Form, Input, InputNumber, Switch, Select, message, Popconfirm } from 'antd';
import {
    PlusOutlined,
    ReloadOutlined,
    EditOutlined,
    DeleteOutlined,
    ApiOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    QuestionCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ColumnsType } from 'antd/es/table';
import PageLayout from '@/components/pageLayout';
import { getMCPServers, createMCPServer, updateMCPServer, deleteMCPServer, MCPServer } from '@/services/aiassistant';
import './index.less';

const { TextArea } = Input;
const { Option } = Select;

interface MCPManagementProps {
    embedded?: boolean;
}

const MCPManagement: React.FC<MCPManagementProps> = ({ embedded = false }) => {
    const { t } = useTranslation('aiassistant');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<MCPServer[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'add' | 'edit'>('add');
    const [editingRecord, setEditingRecord] = useState<MCPServer | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [form] = Form.useForm();

    // 获取服务器列表
    const fetchServers = async () => {
        setLoading(true);
        try {
            const res = await getMCPServers();
            if (res?.err) {
                message.error(res.err);
                setData([]);
                return;
            }
            setData(res?.dat || []);
        } catch (error) {
            console.error('Failed to fetch MCP servers:', error);
            message.error(t('common.operation_failed'));
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServers();
    }, []);

    // 打开添加弹窗
    const handleAdd = () => {
        setModalType('add');
        setEditingRecord(null);
        form.resetFields();
        form.setFieldsValue({
            server_type: 'http',
            health_check_interval: 60,
            enabled: true,
        });
        setModalVisible(true);
    };

    // 打开编辑弹窗
    const handleEdit = (record: MCPServer) => {
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
                const res = await createMCPServer(values);
                if (res.err) {
                    message.error(res.err);
                    return;
                }
                message.success(t('mcp.add_success'));
            } else if (editingRecord) {
                const res = await updateMCPServer(editingRecord.id, values);
                if (res.err) {
                    message.error(res.err);
                    return;
                }
                message.success(t('mcp.update_success'));
            }

            setModalVisible(false);
            fetchServers();
        } catch (error) {
            console.error('Form validation failed:', error);
        } finally {
            setSubmitting(false);
        }
    };

    // 删除服务器
    const handleDelete = async (id: number) => {
        try {
            const res = await deleteMCPServer(id);
            if (res.err) {
                message.error(res.err);
                return;
            }
            message.success(t('mcp.delete_success'));
            fetchServers();
        } catch (error) {
            message.error(t('common.operation_failed'));
        }
    };

    // 渲染健康状态
    const renderHealthStatus = (status: number) => {
        switch (status) {
            case 1:
                return <Tag icon={<CheckCircleOutlined />} color="success">{t('mcp.status_healthy')}</Tag>;
            case 2:
                return <Tag icon={<CloseCircleOutlined />} color="error">{t('mcp.status_failed')}</Tag>;
            default:
                return <Tag icon={<QuestionCircleOutlined />} color="default">{t('mcp.status_unknown')}</Tag>;
        }
    };

    // 表格列定义
    const columns: ColumnsType<MCPServer> = [
        {
            title: t('mcp.server_name'),
            dataIndex: 'name',
            key: 'name',
            width: 150,
            render: (text) => (
                <Space>
                    <ApiOutlined />
                    {text}
                </Space>
            ),
        },
        {
            title: t('mcp.server_type'),
            dataIndex: 'server_type',
            key: 'server_type',
            width: 100,
            render: (text) => <Tag color={text === 'http' ? 'blue' : 'green'}>{text?.toUpperCase()}</Tag>,
        },
        {
            title: t('mcp.endpoint'),
            dataIndex: 'endpoint',
            key: 'endpoint',
            width: 250,
            ellipsis: true,
        },
        {
            title: t('mcp.enabled'),
            dataIndex: 'enabled',
            key: 'enabled',
            width: 80,
            render: (val: boolean) => (
                val ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
            ),
        },
        {
            title: t('mcp.health_status'),
            dataIndex: 'health_status',
            key: 'health_status',
            width: 100,
            render: renderHealthStatus,
        },
        {
            title: t('mcp.description'),
            dataIndex: 'description',
            key: 'description',
            width: 200,
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
            title: t('mcp.actions'),
            key: 'actions',
            width: 150,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                        {t('common.edit')}
                    </Button>
                    <Popconfirm
                        title={t('mcp.confirm_delete')}
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
        <div className={`mcp-management-container ${embedded ? 'embedded-mode' : ''}`}>
            <Card
                extra={
                    <Space>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                            {t('mcp.add_server')}
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={fetchServers}>
                            {t('mcp.refresh')}
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
                title={modalType === 'add' ? t('mcp.add_server') : t('mcp.edit_server')}
                visible={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={handleSubmit}
                confirmLoading={submitting}
                width={600}
                destroyOnClose
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="name"
                        label={t('mcp.server_name')}
                        rules={[{ required: true, message: t('mcp.name_required') }]}
                    >
                        <Input placeholder={t('mcp.server_name')} />
                    </Form.Item>

                    <Form.Item name="server_type" label={t('mcp.server_type')} rules={[{ required: true }]}>
                        <Select>
                            <Option value="http">HTTP</Option>
                            <Option value="sse">SSE</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="endpoint"
                        label={t('mcp.endpoint')}
                        rules={[{ required: true, message: t('mcp.endpoint_required') }]}
                    >
                        <Input placeholder="https://mcp-server.example.com" />
                    </Form.Item>

                    <Form.Item name="health_check_url" label={t('mcp.health_check_url')}>
                        <Input placeholder="/health" />
                    </Form.Item>

                    <Form.Item name="health_check_interval" label={t('mcp.health_check_interval')}>
                        <InputNumber min={10} max={3600} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item name="allowed_envs" label={t('mcp.allowed_envs')}>
                        <TextArea rows={2} placeholder='["prod", "dev"]' />
                    </Form.Item>

                    <Form.Item name="allowed_prefixes" label={t('mcp.allowed_prefixes')}>
                        <TextArea rows={2} placeholder='["kubectl", "db"]' />
                    </Form.Item>

                    <Form.Item name="enabled" label={t('mcp.enabled')} valuePropName="checked">
                        <Switch />
                    </Form.Item>

                    <Form.Item name="description" label={t('mcp.description')}>
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
                    <ApiOutlined />
                    {t('mcp_title')}
                </Space>
            }
        >
            {content}
        </PageLayout>
    );
};

export default MCPManagement;
