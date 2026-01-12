/**
 * AI 助手 - Tool 管理页面
 * n9e-2kai: AI 助手模块
 */
import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, Modal, Form, Input, InputNumber, Switch, Select, message, Popconfirm, Tooltip } from 'antd';
import {
    PlusOutlined,
    ReloadOutlined,
    EditOutlined,
    DeleteOutlined,
    ApiOutlined,
    CodeOutlined,
    CloudOutlined,
    BookOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ColumnsType } from 'antd/es/table';
import PageLayout from '@/components/pageLayout';
import { getAITools, createAITool, updateAITool, deleteAITool, getMCPServers, getKnowledgeProviders, AITool, MCPServer, KnowledgeProvider } from '@/services/aiassistant';
import './index.less';

const { TextArea } = Input;
const { Option } = Select;

interface ToolManagementProps {
    embedded?: boolean;
}

const ToolManagement: React.FC<ToolManagementProps> = ({ embedded = false }) => {
    const { t } = useTranslation('aiassistant');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<AITool[]>([]);
    const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
    const [knowledgeProviders, setKnowledgeProviders] = useState<KnowledgeProvider[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'add' | 'edit'>('add');
    const [editingRecord, setEditingRecord] = useState<AITool | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [implType, setImplType] = useState<string>('api');
    const [form] = Form.useForm();

    // 获取 Tool 列表
    const fetchTools = async () => {
        setLoading(true);
        try {
            const res = await getAITools({ enabled: 'all' });
            if (res?.err) {
                message.error(res.err);
                setData([]);
                return;
            }
            setData(res?.dat || []);
        } catch (error) {
            console.error('Failed to fetch tools:', error);
            message.error(t('common.operation_failed'));
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    // 获取 MCP 服务器列表
    const fetchMCPServers = async () => {
        try {
            const res = await getMCPServers();
            if (!res?.err && res?.dat) {
                setMcpServers(res.dat);
            }
        } catch (error) {
            console.error('Failed to fetch MCP servers:', error);
        }
    };

    // 获取知识库提供者列表
    const fetchKnowledgeProviders = async () => {
        try {
            const res = await getKnowledgeProviders();
            if (!res?.err && res?.dat) {
                setKnowledgeProviders(res.dat);
            }
        } catch (error) {
            console.error('Failed to fetch knowledge providers:', error);
        }
    };

    useEffect(() => {
        fetchTools();
        fetchMCPServers();
        fetchKnowledgeProviders();
    }, []);

    // 打开添加弹窗
    const handleAdd = () => {
        setModalType('add');
        setEditingRecord(null);
        setImplType('api');
        form.resetFields();
        form.setFieldsValue({
            implementation_type: 'api',
            method: 'GET',
            risk_level: 'low',
            enabled: true,
        });
        setModalVisible(true);
    };

    // 打开编辑弹窗
    const handleEdit = (record: AITool) => {
        setModalType('edit');
        setEditingRecord(record);
        setImplType(record.implementation_type);
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
                const res = await createAITool(values);
                if (res.err) {
                    message.error(res.err);
                    return;
                }
                message.success(t('tool.create_success'));
            } else if (editingRecord) {
                const res = await updateAITool(editingRecord.id, values);
                if (res.err) {
                    message.error(res.err);
                    return;
                }
                message.success(t('tool.update_success'));
            }

            setModalVisible(false);
            fetchTools();
        } catch (error) {
            console.error('Form validation failed:', error);
        } finally {
            setSubmitting(false);
        }
    };

    // 删除 Tool
    const handleDelete = async (id: number) => {
        try {
            const res = await deleteAITool(id);
            if (res.err) {
                message.error(res.err);
                return;
            }
            message.success(t('tool.delete_success'));
            fetchTools();
        } catch (error) {
            message.error(t('common.operation_failed'));
        }
    };

    // 渲染实现类型
    const renderImplType = (type: string) => {
        switch (type) {
            case 'native':
                return <Tag icon={<CodeOutlined />} color="purple">{t('tool.type_native')}</Tag>;
            case 'api':
                return <Tag icon={<ApiOutlined />} color="blue">{t('tool.type_api')}</Tag>;
            case 'mcp':
                return <Tag icon={<CloudOutlined />} color="cyan">{t('tool.type_mcp')}</Tag>;
            case 'knowledge':
                return <Tag icon={<BookOutlined />} color="green">{t('tool.type_knowledge')}</Tag>;
            default:
                return <Tag>{type}</Tag>;
        }
    };

    // 渲染风险等级
    const renderRiskLevel = (level: string) => {
        switch (level) {
            case 'low':
                return <Tag color="success">{t('tool.risk_low')}</Tag>;
            case 'medium':
                return <Tag color="warning">{t('tool.risk_medium')}</Tag>;
            case 'high':
                return <Tag color="error">{t('tool.risk_high')}</Tag>;
            default:
                return <Tag>{level}</Tag>;
        }
    };

    // 表格列定义
    const columns: ColumnsType<AITool> = [
        {
            title: t('tool.name'),
            dataIndex: 'name',
            key: 'name',
            width: 150,
            render: (text) => (
                <Space>
                    <ApiOutlined />
                    <span style={{ fontWeight: 500 }}>{text}</span>
                </Space>
            ),
        },
        {
            title: t('tool.implementation_type'),
            dataIndex: 'implementation_type',
            key: 'implementation_type',
            width: 130,
            render: renderImplType,
        },
        {
            title: t('tool.description'),
            dataIndex: 'description',
            key: 'description',
            width: 250,
            ellipsis: true,
        },
        {
            title: t('tool.risk_level'),
            dataIndex: 'risk_level',
            key: 'risk_level',
            width: 100,
            render: renderRiskLevel,
        },
        {
            title: t('tool.enabled'),
            dataIndex: 'enabled',
            key: 'enabled',
            width: 80,
            render: (val: boolean) => (
                <Tag color={val ? 'success' : 'default'}>{val ? '启用' : '禁用'}</Tag>
            ),
        },
        {
            title: t('common.update_at'),
            dataIndex: 'update_at',
            key: 'update_at',
            width: 180,
            render: (val: number) => (val ? new Date(val * 1000).toLocaleString() : '-'),
        },
        {
            title: t('common.edit'),
            key: 'actions',
            width: 150,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                        {t('common.edit')}
                    </Button>
                    <Popconfirm
                        title={t('tool.confirm_delete')}
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

    // 根据实现类型渲染不同的配置表单
    const renderTypeConfig = () => {
        switch (implType) {
            case 'api':
                return (
                    <>
                        <Form.Item name="method" label={t('tool.method')}>
                            <Select style={{ width: 120 }}>
                                <Option value="GET">GET</Option>
                                <Option value="POST">POST</Option>
                                <Option value="PUT">PUT</Option>
                                <Option value="DELETE">DELETE</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item name="url_path" label={t('tool.url_path')}>
                            <Input placeholder={t('tool.url_path_placeholder')} />
                        </Form.Item>
                        <Form.Item name="parameter_schema" label={t('tool.parameter_schema')}>
                            <TextArea rows={4} placeholder={t('tool.parameter_schema_placeholder')} />
                        </Form.Item>
                        <Form.Item name="response_mapping" label={t('tool.response_mapping')}>
                            <TextArea rows={2} placeholder="JSON 响应映射配置" />
                        </Form.Item>
                    </>
                );
            case 'mcp':
                return (
                    <>
                        <Form.Item name="mcp_server_id" label={t('tool.mcp_server')}>
                            <Select placeholder="选择 MCP 服务器">
                                {mcpServers.map((server) => (
                                    <Option key={server.id} value={server.id}>
                                        {server.name}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item name="mcp_tool_name" label={t('tool.mcp_tool_name')}>
                            <Input placeholder="MCP 工具名称" />
                        </Form.Item>
                    </>
                );
            case 'native':
                return (
                    <Form.Item name="native_handler" label={t('tool.native_handler')}>
                        <Input placeholder="Go 代码中注册的 handler 名称" />
                    </Form.Item>
                );
            case 'knowledge':
                return (
                    <Form.Item name="knowledge_provider_id" label={t('tool.knowledge_provider')}>
                        <Select placeholder="选择知识库提供者">
                            {knowledgeProviders.map((provider) => (
                                <Option key={provider.id} value={provider.id}>
                                    {provider.name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                );
            default:
                return null;
        }
    };

    const content = (
        <div className={`tool-management-container ${embedded ? 'embedded-mode' : ''}`}>
            <Card
                extra={
                    <Space>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                            {t('tool.add')}
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={fetchTools}>
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
                title={modalType === 'add' ? t('tool.add') : t('tool.edit')}
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
                        label={t('tool.name')}
                        rules={[{ required: true, message: t('tool.name_required') }]}
                    >
                        <Input placeholder={t('tool.name_placeholder')} disabled={modalType === 'edit'} />
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label={t('tool.description')}
                        rules={[{ required: true, message: t('tool.description_required') }]}
                    >
                        <TextArea rows={2} placeholder={t('tool.description_placeholder')} />
                    </Form.Item>

                    <Form.Item
                        name="implementation_type"
                        label={t('tool.implementation_type')}
                        rules={[{ required: true }]}
                    >
                        <Select 
                            style={{ width: 200 }}
                            onChange={(value) => setImplType(value)}
                            disabled={modalType === 'edit'}
                        >
                            <Option value="api">{t('tool.type_api')}</Option>
                            <Option value="mcp">{t('tool.type_mcp')}</Option>
                            <Option value="native">{t('tool.type_native')}</Option>
                            <Option value="knowledge">{t('tool.type_knowledge')}</Option>
                        </Select>
                    </Form.Item>

                    {renderTypeConfig()}

                    <Space style={{ width: '100%' }} size="large">
                        <Form.Item name="risk_level" label={t('tool.risk_level')}>
                            <Select style={{ width: 120 }}>
                                <Option value="low">{t('tool.risk_low')}</Option>
                                <Option value="medium">{t('tool.risk_medium')}</Option>
                                <Option value="high">{t('tool.risk_high')}</Option>
                            </Select>
                        </Form.Item>

                        <Form.Item name="enabled" label={t('tool.enabled')} valuePropName="checked">
                            <Switch />
                        </Form.Item>
                    </Space>
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
                    {t('tool.title')}
                </Space>
            }
        >
            {content}
        </PageLayout>
    );
};

export default ToolManagement;
