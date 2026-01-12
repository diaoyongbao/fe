/**
 * AI 助手 - Agent 管理页面
 * n9e-2kai: AI 助手模块
 */
import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, Modal, Form, Input, InputNumber, Switch, Select, message, Popconfirm, Tooltip } from 'antd';
import {
    PlusOutlined,
    ReloadOutlined,
    EditOutlined,
    DeleteOutlined,
    RobotOutlined,
    TeamOutlined,
    BookOutlined,
    LinkOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ColumnsType } from 'antd/es/table';
import PageLayout from '@/components/pageLayout';
import { getAIAgents, createAIAgent, updateAIAgent, deleteAIAgent, getAITools, bindAgentTools, AIAgent, AITool } from '@/services/aiassistant';
import './index.less';

const { TextArea } = Input;
const { Option } = Select;

interface AgentManagementProps {
    embedded?: boolean;
}

const AgentManagement: React.FC<AgentManagementProps> = ({ embedded = false }) => {
    const { t } = useTranslation('aiassistant');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<AIAgent[]>([]);
    const [tools, setTools] = useState<AITool[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [toolsModalVisible, setToolsModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'add' | 'edit'>('add');
    const [editingRecord, setEditingRecord] = useState<AIAgent | null>(null);
    const [selectedToolIds, setSelectedToolIds] = useState<number[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [form] = Form.useForm();

    // 获取 Agent 列表
    const fetchAgents = async () => {
        setLoading(true);
        try {
            const res = await getAIAgents({ enabled: 'all' });
            if (res?.err) {
                message.error(res.err);
                setData([]);
                return;
            }
            setData(res?.dat || []);
        } catch (error) {
            console.error('Failed to fetch agents:', error);
            message.error(t('common.operation_failed'));
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    // 获取 Tool 列表
    const fetchTools = async () => {
        try {
            const res = await getAITools({ enabled: 'all' });
            if (!res?.err && res?.dat) {
                setTools(res.dat);
            }
        } catch (error) {
            console.error('Failed to fetch tools:', error);
        }
    };

    useEffect(() => {
        fetchAgents();
        fetchTools();
    }, []);

    // 打开添加弹窗
    const handleAdd = () => {
        setModalType('add');
        setEditingRecord(null);
        form.resetFields();
        form.setFieldsValue({
            agent_type: 'expert',
            priority: 0,
            enabled: true,
        });
        setModalVisible(true);
    };

    // 打开编辑弹窗
    const handleEdit = (record: AIAgent) => {
        setModalType('edit');
        setEditingRecord(record);
        
        // 解析 keywords
        let keywords: string[] = [];
        try {
            if (record.keywords) {
                keywords = JSON.parse(record.keywords);
            }
        } catch (e) {
            keywords = [];
        }

        form.setFieldsValue({
            ...record,
            keywords,
        });
        setModalVisible(true);
    };

    // 打开工具绑定弹窗
    const handleBindTools = async (record: AIAgent) => {
        setEditingRecord(record);
        // TODO: 获取已绑定的工具
        setSelectedToolIds([]);
        setToolsModalVisible(true);
    };

    // 提交表单
    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);

            // 序列化 keywords
            const payload = {
                ...values,
                keywords: JSON.stringify(values.keywords || []),
            };

            if (modalType === 'add') {
                const res = await createAIAgent(payload);
                if (res.err) {
                    message.error(res.err);
                    return;
                }
                message.success(t('agent.create_success'));
            } else if (editingRecord) {
                const res = await updateAIAgent(editingRecord.id, payload);
                if (res.err) {
                    message.error(res.err);
                    return;
                }
                message.success(t('agent.update_success'));
            }

            setModalVisible(false);
            fetchAgents();
        } catch (error) {
            console.error('Form validation failed:', error);
        } finally {
            setSubmitting(false);
        }
    };

    // 保存工具绑定
    const handleSaveTools = async () => {
        if (!editingRecord) return;
        try {
            setSubmitting(true);
            const res = await bindAgentTools(editingRecord.id, selectedToolIds);
            if (res.err) {
                message.error(res.err);
                return;
            }
            message.success(t('agent.bind_tools_success'));
            setToolsModalVisible(false);
        } catch (error) {
            message.error(t('common.operation_failed'));
        } finally {
            setSubmitting(false);
        }
    };

    // 删除 Agent
    const handleDelete = async (id: number) => {
        try {
            const res = await deleteAIAgent(id);
            if (res.err) {
                message.error(res.err);
                return;
            }
            message.success(t('agent.delete_success'));
            fetchAgents();
        } catch (error) {
            message.error(t('common.operation_failed'));
        }
    };

    // 渲染 Agent 类型
    const renderAgentType = (type: string) => {
        switch (type) {
            case 'system':
                return <Tag icon={<RobotOutlined />} color="purple">{t('agent.agent_type_system')}</Tag>;
            case 'expert':
                return <Tag icon={<TeamOutlined />} color="blue">{t('agent.agent_type_expert')}</Tag>;
            case 'knowledge':
                return <Tag icon={<BookOutlined />} color="green">{t('agent.agent_type_knowledge')}</Tag>;
            default:
                return <Tag>{type}</Tag>;
        }
    };

    // 表格列定义
    const columns: ColumnsType<AIAgent> = [
        {
            title: t('agent.name'),
            dataIndex: 'name',
            key: 'name',
            width: 150,
            render: (text, record) => (
                <Space>
                    {record.agent_type === 'system' ? <RobotOutlined /> : <TeamOutlined />}
                    <span style={{ fontWeight: 500 }}>{text}</span>
                </Space>
            ),
        },
        {
            title: t('agent.agent_type'),
            dataIndex: 'agent_type',
            key: 'agent_type',
            width: 120,
            render: renderAgentType,
        },
        {
            title: t('agent.description'),
            dataIndex: 'description',
            key: 'description',
            width: 200,
            ellipsis: true,
        },
        {
            title: t('agent.priority'),
            dataIndex: 'priority',
            key: 'priority',
            width: 80,
            align: 'center',
        },
        {
            title: t('agent.enabled'),
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
            width: 200,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title={t('agent.tools')}>
                        <Button type="link" size="small" icon={<LinkOutlined />} onClick={() => handleBindTools(record)}>
                            {t('agent.tools')}
                        </Button>
                    </Tooltip>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                        {t('common.edit')}
                    </Button>
                    {record.agent_type !== 'system' && (
                        <Popconfirm
                            title={t('agent.confirm_delete')}
                            onConfirm={() => handleDelete(record.id)}
                            okText={t('common.confirm')}
                            cancelText={t('common.cancel')}
                        >
                            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                                {t('common.delete')}
                            </Button>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    const content = (
        <div className={`agent-management-container ${embedded ? 'embedded-mode' : ''}`}>
            <Card
                extra={
                    <Space>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                            {t('agent.add')}
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={fetchAgents}>
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
                title={modalType === 'add' ? t('agent.add') : t('agent.edit')}
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
                        label={t('agent.name')}
                        rules={[{ required: true, message: t('agent.name_required') }]}
                    >
                        <Input placeholder={t('agent.name_placeholder')} disabled={modalType === 'edit'} />
                    </Form.Item>

                    <Form.Item name="description" label={t('agent.description')}>
                        <Input placeholder={t('agent.description_placeholder')} />
                    </Form.Item>

                    <Form.Item
                        name="system_prompt"
                        label={t('agent.system_prompt')}
                        rules={[{ required: true, message: t('agent.system_prompt_required') }]}
                    >
                        <TextArea rows={4} placeholder={t('agent.system_prompt_placeholder')} />
                    </Form.Item>

                    <Form.Item name="model_config" label={t('agent.model_config')}>
                        <TextArea rows={2} placeholder={t('agent.model_config_placeholder')} />
                    </Form.Item>

                    <Form.Item name="keywords" label={t('agent.keywords')}>
                        <Select
                            mode="tags"
                            placeholder={t('agent.keywords_placeholder')}
                            tokenSeparators={[',']}
                        />
                    </Form.Item>

                    <Space style={{ width: '100%' }} size="large">
                        <Form.Item name="agent_type" label={t('agent.agent_type')}>
                            <Select style={{ width: 150 }} disabled={editingRecord?.agent_type === 'system'}>
                                <Option value="system">{t('agent.agent_type_system')}</Option>
                                <Option value="expert">{t('agent.agent_type_expert')}</Option>
                                <Option value="knowledge">{t('agent.agent_type_knowledge')}</Option>
                            </Select>
                        </Form.Item>

                        <Form.Item name="priority" label={t('agent.priority')}>
                            <InputNumber min={0} max={100} />
                        </Form.Item>

                        <Form.Item name="enabled" label={t('agent.enabled')} valuePropName="checked">
                            <Switch />
                        </Form.Item>
                    </Space>
                </Form>
            </Modal>

            {/* 工具绑定弹窗 */}
            <Modal
                title={t('agent.select_tools')}
                visible={toolsModalVisible}
                onCancel={() => setToolsModalVisible(false)}
                onOk={handleSaveTools}
                confirmLoading={submitting}
                width={600}
            >
                <Select
                    mode="multiple"
                    style={{ width: '100%' }}
                    placeholder={t('agent.select_tools')}
                    value={selectedToolIds}
                    onChange={setSelectedToolIds}
                >
                    {tools.map((tool) => (
                        <Option key={tool.id} value={tool.id}>
                            {tool.name} - {tool.description}
                        </Option>
                    ))}
                </Select>
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
                    <TeamOutlined />
                    {t('agent.title')}
                </Space>
            }
        >
            {content}
        </PageLayout>
    );
};

export default AgentManagement;
