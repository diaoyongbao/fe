/**
 * AI 助手 - LLM 设置页面
 * n9e-2kai: AI 助手模块
 * 用于配置 LLM API 调用参数
 */
import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Space, message, Alert, Switch, Select, InputNumber, Divider, Typography, Tooltip } from 'antd';
import {
    SaveOutlined,
    ReloadOutlined,
    ApiOutlined,
    EyeInvisibleOutlined,
    EyeTwoTone,
    QuestionCircleOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    LoadingOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { getAIConfigs, updateAIConfig, reloadAIConfig, testAIConfig, aiAssistantHealth } from '@/services/aiassistant';

const { Text, Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface LLMSettingsProps {
    embedded?: boolean;
}

// LLM 配置结构
interface LLMConfig {
    provider: string;
    model: string;
    api_key: string;
    base_url: string;
    temperature: number;
    max_tokens: number;
    timeout: number;
}

// 预设模型列表
const PRESET_MODELS = [
    { label: 'GPT-4o', value: 'gpt-4o', provider: 'openai' },
    { label: 'GPT-4o-mini', value: 'gpt-4o-mini', provider: 'openai' },
    { label: 'GPT-4 Turbo', value: 'gpt-4-turbo', provider: 'openai' },
    { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo', provider: 'openai' },
    { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022', provider: 'anthropic' },
    { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229', provider: 'anthropic' },
    { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro', provider: 'google' },
    { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash', provider: 'google' },
    { label: 'DeepSeek Chat', value: 'deepseek-chat', provider: 'deepseek' },
    { label: 'DeepSeek Coder', value: 'deepseek-coder', provider: 'deepseek' },
    { label: 'Qwen Max', value: 'qwen-max', provider: 'alibaba' },
    { label: 'Qwen Plus', value: 'qwen-plus', provider: 'alibaba' },
    { label: '自定义模型', value: 'custom', provider: 'custom' },
];

// 预设 API 端点
const PRESET_ENDPOINTS: Record<string, string> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
    google: 'https://generativelanguage.googleapis.com/v1beta',
    deepseek: 'https://api.deepseek.com/v1',
    alibaba: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
};

const LLMSettings: React.FC<LLMSettingsProps> = ({ embedded = false }) => {
    const { t } = useTranslation('aiassistant');
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [healthStatus, setHealthStatus] = useState<'unknown' | 'ok' | 'error'>('unknown');
    const [customModel, setCustomModel] = useState(false);
    const [originalConfig, setOriginalConfig] = useState<LLMConfig | null>(null);

    // 加载配置
    const loadConfig = async () => {
        setLoading(true);
        try {
            const res = await getAIConfigs();
            if (res.err) {
                message.error(res.err);
                return;
            }

            // 查找默认模型配置
            const modelConfig = res.dat?.find((c: any) => c.config_key === 'ai.default_model');
            if (modelConfig && modelConfig.config_value) {
                try {
                    const config: LLMConfig = JSON.parse(modelConfig.config_value);
                    setOriginalConfig(config);

                    // 检查是否是预设模型
                    const isPreset = PRESET_MODELS.some(m => m.value === config.model && m.value !== 'custom');
                    setCustomModel(!isPreset);

                    form.setFieldsValue({
                        ...config,
                        model_select: isPreset ? config.model : 'custom',
                        custom_model: !isPreset ? config.model : '',
                    });
                } catch (e) {
                    console.error('解析配置失败:', e);
                }
            }

            // 检查健康状态
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
            // 访问健康状态中的 ai 组件状态
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
        loadConfig();
    }, []);

    // 模型选择变化
    const handleModelChange = (value: string) => {
        if (value === 'custom') {
            setCustomModel(true);
        } else {
            setCustomModel(false);
            form.setFieldsValue({ custom_model: '' });

            // 自动填充对应的 Base URL
            const modelInfo = PRESET_MODELS.find(m => m.value === value);
            if (modelInfo && PRESET_ENDPOINTS[modelInfo.provider]) {
                form.setFieldsValue({ base_url: PRESET_ENDPOINTS[modelInfo.provider] });
            }
        }
    };

    // 保存配置
    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);

            // 构建配置对象
            const config: LLMConfig = {
                provider: values.provider || 'openai',
                model: values.model_select === 'custom' ? values.custom_model : values.model_select,
                api_key: values.api_key,
                base_url: values.base_url,
                temperature: values.temperature || 0.7,
                max_tokens: values.max_tokens || 4096,
                timeout: values.timeout || 60,
            };

            // 保存到后端
            const configValue = JSON.stringify(config, null, 2);
            const res = await updateAIConfig('ai.default_model', configValue);

            if (res.err) {
                message.error(res.err);
                return;
            }

            // 重载配置
            await reloadAIConfig();

            message.success(t('llm.save_success'));
            setOriginalConfig(config);

            // 重新检查健康状态
            setTimeout(checkHealth, 1000);
        } catch (error) {
            console.error('保存失败:', error);
            message.error(t('common.operation_failed'));
        } finally {
            setSaving(false);
        }
    };

    // 测试连接
    const handleTestConnection = async () => {
        try {
            const values = await form.validateFields(['api_key', 'base_url', 'model_select', 'custom_model']);
            setTesting(true);

            // 构建配置对象
            const model = values.model_select === 'custom' ? values.custom_model : values.model_select;
            const config = {
                provider: 'openai', // 默认使用 OpenAI 兼容协议
                model: model,
                api_key: values.api_key,
                base_url: values.base_url,
                temperature: values.temperature || 0.7,
                max_tokens: values.max_tokens || 4096,
                timeout: values.timeout || 30,
            };

            // 直接测试配置，不保存
            const res = await testAIConfig('ai.default_model', JSON.stringify(config));
            if (res.err) {
                message.error(res.err);
                return;
            }

            if (res.dat.status === 'success') {
                message.success(t('llm.test_success'));
                setHealthStatus('ok');
            } else {
                message.error(res.dat.message);
                setHealthStatus('error');
            }
        } catch (error) {
            console.error('Test connection failed:', error);
            message.error(t('llm.test_failed'));
            setHealthStatus('error');
        } finally {
            setTesting(false);
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

    return (
        <div className="llm-settings-container">
            <Card
                loading={loading}
                title={
                    <Space>
                        <ApiOutlined />
                        <span>{t('llm.title')}</span>
                    </Space>
                }
                extra={renderHealthStatus()}
            >
                <Alert
                    message={t('llm.config_tip')}
                    description={t('llm.config_tip_detail')}
                    type="info"
                    showIcon
                    style={{ marginBottom: 24 }}
                />

                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{
                        provider: 'openai',
                        model_select: 'gpt-4o-mini',
                        base_url: 'https://api.openai.com/v1',
                        temperature: 0.7,
                        max_tokens: 4096,
                        timeout: 60,
                    }}
                >
                    <Title level={5}>{t('llm.basic_settings')}</Title>

                    <Form.Item
                        name="model_select"
                        label={
                            <Space>
                                {t('llm.model')}
                                <Tooltip title={t('llm.model_tip')}>
                                    <QuestionCircleOutlined />
                                </Tooltip>
                            </Space>
                        }
                        rules={[{ required: true, message: t('llm.model_required') }]}
                    >
                        <Select
                            placeholder={t('llm.model_placeholder')}
                            onChange={handleModelChange}
                            showSearch
                            optionFilterProp="label"
                        >
                            {PRESET_MODELS.map(model => (
                                <Option key={model.value} value={model.value} label={model.label}>
                                    <Space>
                                        <span>{model.label}</span>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            ({model.provider})
                                        </Text>
                                    </Space>
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    {customModel && (
                        <Form.Item
                            name="custom_model"
                            label={t('llm.custom_model')}
                            rules={[{ required: customModel, message: t('llm.custom_model_required') }]}
                        >
                            <Input placeholder="e.g., gpt-4-1106-preview" />
                        </Form.Item>
                    )}

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

                    <Divider />
                    <Title level={5}>{t('llm.advanced_settings')}</Title>

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
                            style={{ width: 200 }}
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
                            style={{ width: 200 }}
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
                            style={{ width: 200 }}
                        />
                    </Form.Item>

                    <Divider />

                    <Form.Item>
                        <Space>
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                onClick={handleSave}
                                loading={saving}
                            >
                                {t('common.save')}
                            </Button>
                            <Button
                                icon={<ApiOutlined />}
                                onClick={handleTestConnection}
                                loading={testing}
                            >
                                {t('llm.test_connection')}
                            </Button>
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={loadConfig}
                            >
                                {t('common.refresh')}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default LLMSettings;
