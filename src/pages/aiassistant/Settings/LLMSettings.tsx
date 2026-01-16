/**
 * AI 助手 - LLM 模型管理页面
 * n9e-2kai: AI 助手模块
 * 用于管理多个自定义 LLM 模型
 */
import React, { useState, useEffect } from 'react';
import {
    Form, Input, Button, Card, Space, message, Alert, Switch, Table, Modal,
    InputNumber, Divider, Typography, Tooltip, Tag, Popconfirm
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    ApiOutlined,
    EyeInvisibleOutlined,
    EyeTwoTone,
    QuestionCircleOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    StarOutlined,
    StarFilled,
    LoadingOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ColumnsType } from 'antd/es/table';
import {
    getLLMModels, createLLMModel, updateLLMModel, deleteLLMModel,
    setDefaultLLMModel, testLLMModel, AILLMModel, aiAssistantHealth
} from '@/services/aiassistant';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface LLMSettingsProps {
    embedded?: boolean;
}

const LLMSettings: React.FC<LLMSettingsProps> = ({ embedded = false }) => {
    const { t } = useTranslation('aiassistant');
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [models, setModels] = useState<AILLMModel[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingModel, setEditingModel] = useState<AILLMModel | null>(null);
    const [saving, setSaving] = useState(false);
    const [testingId, setTestingId] = useState<number | null>(null);
    const [healthStatus, setHealthStatus] = useState<'unknown' | 'ok' | 'error'>('unknown');

    // 加载模型列表
    const loadModels = async () => {
        setLoading(true);
        try {
            const res = await getLLMModels();
            if (res.err) {
                message.error(res.err);
                return;
            }
            setModels(res.dat || []);
            checkHealth();
        } catch (error) {
            message.error(t('common.operation_failed'));
        } finally {
            setLoading(false);
        }
    };

    // 检查 AI 服务健康状态
    const checkHealth = async () => {
        try {
            const res = await aiAssistantHealth();
            if (res.err) {
                setHealthStatus('error');
                return;
            }
            const healthData = res.dat as any;
            const aiStatus = healthData?.components?.ai;
            if (aiStatus === 'configured' || aiStatus === 'ok') {
                setHealthStatus('ok');
            } else {
                setHealthStatus('error');
            }
        } catch (error) {
            setHealthStatus('error');
        }
    };

    useEffect(() => {
        loadModels();
    }, []);

    // 打开新建模态框
    const handleAdd = () => {
        setEditingModel(null);
        form.resetFields();
        form.setFieldsValue({
            temperature: 0.7,
            max_tokens: 4096,
            timeout: 60,
            enabled: true,
            is_default: false,
        });
        setModalVisible(true);
    };

    // 打开编辑模态框
    const handleEdit = (model: AILLMModel) => {
        setEditingModel(model);
        form.setFieldsValue({
            ...model,
        });
        setModalVisible(true);
    };

    // 保存模型
    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);

            if (editingModel) {
                // 更新
                const res = await updateLLMModel(editingModel.id, values);
                if (res.err) {
                    message.error(res.err);
                    return;
                }
                message.success(t('llm_model.update_success'));
            } else {
                // 创建
                const res = await createLLMModel(values);
                if (res.err) {
                    message.error(res.err);
                    return;
                }
                message.success(t('llm_model.create_success'));
            }

            setModalVisible(false);
            loadModels();
        } catch (error) {
            console.error('保存失败:', error);
        } finally {
            setSaving(false);
        }
    };

    // 删除模型
    const handleDelete = async (id: number) => {
        try {
            const res = await deleteLLMModel(id);
            if (res.err) {
                message.error(res.err);
                return;
            }
            message.success(t('llm_model.delete_success'));
            loadModels();
        } catch (error) {
            message.error(t('common.operation_failed'));
        }
    };

    // 设置默认模型
    const handleSetDefault = async (id: number) => {
        try {
            const res = await setDefaultLLMModel(id);
            if (res.err) {
                message.error(res.err);
                return;
            }
            message.success(t('llm_model.set_default_success'));
            loadModels();
        } catch (error) {
            message.error(t('common.operation_failed'));
        }
    };

    // 测试连接
    const handleTest = async (id: number) => {
        setTestingId(id);
        try {
            const res = await testLLMModel(id);
            if (res.err) {
                message.error(res.err);
                return;
            }
            if (res.dat.status === 'success') {
                message.success(t('llm_model.test_success'));
            } else {
                message.error(res.dat.message);
            }
        } catch (error) {
            message.error(t('llm_model.test_failed'));
        } finally {
            setTestingId(null);
        }
    };

    // 渲染健康状态图标
    const renderHealthStatus = () => {
        switch (healthStatus) {
            case 'ok':
                return (
                    <Space>
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        <Text type="success">{t('llm.status_connected')}</Text>
                    </Space>
                );
            case 'error':
                return (
                    <Space>
                        <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                        <Text type="danger">{t('llm.status_disconnected')}</Text>
                    </Space>
                );
            default:
                return (
                    <Space>
                        <LoadingOutlined />
                        <Text type="secondary">{t('llm.status_checking')}</Text>
                    </Space>
                );
        }
    };

    // 表格列定义
    const columns: ColumnsType<AILLMModel> = [
        {
            title: t('llm_model.name'),
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: AILLMModel) => (
                <Space>
                    {record.is_default && (
                        <Tooltip title={t('llm_model.default_model')}>
                            <StarFilled style={{ color: '#faad14' }} />
                        </Tooltip>
                    )}
                    <Text strong>{text}</Text>
                </Space>
            ),
        },
        {
            title: t('llm_model.model_id'),
            dataIndex: 'model_id',
            key: 'model_id',
            render: (text: string) => <Tag color="blue">{text}</Tag>,
        },
        {
            title: t('llm_model.provider'),
            dataIndex: 'provider',
            key: 'provider',
            render: (text: string) => <Tag>{text || 'openai'}</Tag>,
        },
        {
            title: t('llm_model.base_url'),
            dataIndex: 'base_url',
            key: 'base_url',
            ellipsis: true,
            width: 200,
        },
        {
            title: t('llm_model.temperature'),
            dataIndex: 'temperature',
            key: 'temperature',
            width: 80,
        },
        {
            title: t('llm.status_connected'),
            dataIndex: 'enabled',
            key: 'enabled',
            width: 80,
            render: (enabled: boolean) => (
                enabled ? (
                    <Tag color="success">{t('llm_model.enabled')}</Tag>
                ) : (
                    <Tag color="default">{t('llm_model.disabled')}</Tag>
                )
            ),
        },
        {
            title: t('common.actions'),
            key: 'actions',
            width: 200,
            render: (_: any, record: AILLMModel) => (
                <Space size="small">
                    <Tooltip title={t('llm_model.test_connection')}>
                        <Button
                            type="link"
                            size="small"
                            icon={<ApiOutlined />}
                            loading={testingId === record.id}
                            onClick={() => handleTest(record.id)}
                        />
                    </Tooltip>
                    {!record.is_default && (
                        <Tooltip title={t('llm_model.set_as_default')}>
                            <Button
                                type="link"
                                size="small"
                                icon={<StarOutlined />}
                                onClick={() => handleSetDefault(record.id)}
                            />
                        </Tooltip>
                    )}
                    <Tooltip title={t('common.edit')}>
                        <Button
                            type="link"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title={t('llm_model.confirm_delete')}
                        onConfirm={() => handleDelete(record.id)}
                    >
                        <Tooltip title={t('common.delete')}>
                            <Button
                                type="link"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                            />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div className="llm-settings-container">
            <Card
                loading={loading}
                title={
                    <Space>
                        <ApiOutlined />
                        <span>{t('llm_model.title')}</span>
                    </Space>
                }
                extra={
                    <Space>
                        {renderHealthStatus()}
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={loadModels}
                        >
                            {t('common.refresh')}
                        </Button>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleAdd}
                        >
                            {t('llm_model.add')}
                        </Button>
                    </Space>
                }
            >
                <Alert
                    message={t('llm_model.config_tip')}
                    description={t('llm_model.config_tip_detail')}
                    type="info"
                    showIcon
                    style={{ marginBottom: 24 }}
                />

                <Table
                    dataSource={models}
                    columns={columns}
                    rowKey="id"
                    pagination={false}
                    locale={{ emptyText: t('llm_model.no_models') }}
                />
            </Card>

            {/* 新建/编辑模态框 */}
            <Modal
                title={editingModel ? t('llm_model.edit') : t('llm_model.add')}
                visible={modalVisible}
                onOk={handleSave}
                onCancel={() => setModalVisible(false)}
                confirmLoading={saving}
                width={600}
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    preserve={false}
                >
                    <Form.Item
                        name="name"
                        label={t('llm_model.name')}
                        rules={[{ required: true, message: t('llm_model.name_required') }]}
                    >
                        <Input placeholder={t('llm_model.name_placeholder')} />
                    </Form.Item>

                    <Form.Item
                        name="model_id"
                        label={
                            <Space>
                                {t('llm_model.model_id')}
                                <Tooltip title={t('llm_model.model_id_tip')}>
                                    <QuestionCircleOutlined />
                                </Tooltip>
                            </Space>
                        }
                        rules={[{ required: true, message: t('llm_model.model_id_required') }]}
                    >
                        <Input placeholder="e.g., gpt-4o-mini, deepseek-chat" />
                    </Form.Item>

                    <Form.Item
                        name="provider"
                        label={t('llm_model.provider')}
                    >
                        <Input placeholder="e.g., openai, anthropic, deepseek" />
                    </Form.Item>

                    <Form.Item
                        name="api_key"
                        label={
                            <Space>
                                {t('llm.api_key')}
                                <Tooltip title={t('llm.api_key_tip')}>
                                    <QuestionCircleOutlined />
                                </Tooltip>
                            </Space>
                        }
                        rules={[{ required: true, message: t('llm.api_key_required') }]}
                    >
                        <Input.Password
                            placeholder={t('llm.api_key_placeholder')}
                            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                        />
                    </Form.Item>

                    <Form.Item
                        name="base_url"
                        label={
                            <Space>
                                {t('llm.base_url')}
                                <Tooltip title={t('llm.base_url_tip')}>
                                    <QuestionCircleOutlined />
                                </Tooltip>
                            </Space>
                        }
                        rules={[{ required: true, message: t('llm.base_url_required') }]}
                    >
                        <Input placeholder="https://api.openai.com/v1" />
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label={t('llm_model.description')}
                    >
                        <TextArea rows={2} placeholder={t('llm_model.description_placeholder')} />
                    </Form.Item>

                    <Divider />
                    <Title level={5}>{t('llm.advanced_settings')}</Title>

                    <Space size="large">
                        <Form.Item
                            name="temperature"
                            label={
                                <Space>
                                    {t('llm.temperature')}
                                    <Tooltip title={t('llm.temperature_tip')}>
                                        <QuestionCircleOutlined />
                                    </Tooltip>
                                </Space>
                            }
                        >
                            <InputNumber
                                min={0}
                                max={2}
                                step={0.1}
                                precision={1}
                                style={{ width: 120 }}
                            />
                        </Form.Item>

                        <Form.Item
                            name="max_tokens"
                            label={
                                <Space>
                                    {t('llm.max_tokens')}
                                    <Tooltip title={t('llm.max_tokens_tip')}>
                                        <QuestionCircleOutlined />
                                    </Tooltip>
                                </Space>
                            }
                        >
                            <InputNumber
                                min={100}
                                max={128000}
                                step={1000}
                                style={{ width: 120 }}
                            />
                        </Form.Item>

                        <Form.Item
                            name="timeout"
                            label={
                                <Space>
                                    {t('llm.timeout')}
                                    <Tooltip title={t('llm.timeout_tip')}>
                                        <QuestionCircleOutlined />
                                    </Tooltip>
                                </Space>
                            }
                        >
                            <InputNumber
                                min={10}
                                max={300}
                                step={10}
                                addonAfter={t('llm.seconds')}
                                style={{ width: 120 }}
                            />
                        </Form.Item>
                    </Space>

                    <Divider />

                    <Space size="large">
                        <Form.Item
                            name="enabled"
                            label={t('llm_model.enabled')}
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>

                        <Form.Item
                            name="is_default"
                            label={t('llm_model.is_default')}
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                    </Space>
                </Form>
            </Modal>
        </div>
    );
};

export default LLMSettings;
