/**
 * AI 助手 - AI 配置管理页面
 * n9e-2kai: AI 助手模块
 */
import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, Modal, Form, Input, message } from 'antd';
import {
    ReloadOutlined,
    EditOutlined,
    SettingOutlined,
    SyncOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ColumnsType } from 'antd/es/table';
import PageLayout from '@/components/pageLayout';
import { getAIConfigs, updateAIConfig, reloadAIConfig, testAIConfig, AIConfig } from '@/services/aiassistant';
import './index.less';

const { TextArea } = Input;

interface AIConfigurationProps {
    embedded?: boolean;
}

const AIConfiguration: React.FC<AIConfigurationProps> = ({ embedded = false }) => {
    const { t } = useTranslation('aiassistant');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<AIConfig[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState<AIConfig | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [testing, setTesting] = useState(false);
    const [form] = Form.useForm();

    // 获取配置列表
    const fetchConfigs = async () => {
        setLoading(true);
        try {
            const res = await getAIConfigs();
            if (res.err) {
                message.error(res.err);
                return;
            }
            setData(res.dat || []);
        } catch (error) {
            message.error(t('common.operation_failed'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfigs();
    }, []);

    // 打开编辑弹窗
    const handleEdit = (record: AIConfig) => {
        setEditingRecord(record);
        form.setFieldsValue({
            config_value: record.config_value,
        });
        setModalVisible(true);
    };

    // 测试连接
    const handleTest = async () => {
        try {
            const values = await form.validateFields();
            setTesting(true);

            if (editingRecord) {
                const res = await testAIConfig(editingRecord.config_key, values.config_value);
                if (res.err) {
                    message.error(res.err);
                    return;
                }

                if (res.dat.status === 'success') {
                    message.success(res.dat.message);
                } else {
                    message.error(res.dat.message);
                }
            }
        } catch (error) {
            console.error('Test failed:', error);
            message.error(t('config.test_failed'));
        } finally {
            setTesting(false);
        }
    };

    // 提交表单
    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);

            if (editingRecord) {
                const res = await updateAIConfig(editingRecord.config_key, values.config_value);
                if (res.err) {
                    message.error(res.err);
                    return;
                }
                message.success(t('config.update_success'));
            }

            setModalVisible(false);
            fetchConfigs();
        } catch (error) {
            console.error('Form validation failed:', error);
        } finally {
            setSubmitting(false);
        }
    };

    // 重载配置
    const handleReload = async () => {
        try {
            const res = await reloadAIConfig();
            if (res.err) {
                message.error(res.err);
                return;
            }
            message.success(t('config.reload_success'));
            fetchConfigs();
        } catch (error) {
            message.error(t('common.operation_failed'));
        }
    };

    // 渲染配置类型
    const renderConfigType = (type: string) => {
        const typeMap: Record<string, { color: string; label: string }> = {
            ai_model: { color: 'blue', label: t('config.type_ai_model') },
            knowledge: { color: 'green', label: t('config.type_knowledge') },
            session: { color: 'orange', label: t('config.type_session') },
            file: { color: 'purple', label: t('config.type_file') },
            general: { color: 'default', label: t('config.type_general') },
        };
        const info = typeMap[type] || typeMap.general;
        return <Tag color={info.color}>{info.label}</Tag>;
    };

    // 渲染作用范围
    const renderScope = (scope: string) => {
        if (scope === 'global') {
            return <Tag color="blue">{t('config.scope_global')}</Tag>;
        }
        return <Tag color="green">{t('config.scope_busi_group')}</Tag>;
    };

    // 表格列定义
    const columns: ColumnsType<AIConfig> = [
        {
            title: t('config.key'),
            dataIndex: 'config_key',
            key: 'config_key',
            width: 200,
            render: (text) => <code>{text}</code>,
        },
        {
            title: t('config.type'),
            dataIndex: 'config_type',
            key: 'config_type',
            width: 120,
            render: renderConfigType,
        },
        {
            title: t('config.scope'),
            dataIndex: 'scope',
            key: 'scope',
            width: 100,
            render: renderScope,
        },
        {
            title: t('config.description'),
            dataIndex: 'description',
            key: 'description',
            width: 200,
            ellipsis: true,
        },
        {
            title: t('config.value'),
            dataIndex: 'config_value',
            key: 'config_value',
            width: 300,
            ellipsis: true,
            render: (text) => (
                <code style={{ fontSize: 12, color: '#666' }}>
                    {text?.length > 50 ? text.substring(0, 50) + '...' : text}
                </code>
            ),
        },
        {
            title: t('config.enabled'),
            dataIndex: 'enabled',
            key: 'enabled',
            width: 80,
            render: (val: boolean) => (
                val ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
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
            title: t('config.actions'),
            key: 'actions',
            width: 100,
            fixed: 'right',
            render: (_, record) => (
                <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                    {t('config.edit')}
                </Button>
            ),
        },
    ];

    const content = (
        <div className={`ai-config-container ${embedded ? 'embedded-mode' : ''}`}>
            <Card
                extra={
                    <Space>
                        <Button icon={<SyncOutlined />} onClick={handleReload}>
                            {t('config.reload')}
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={fetchConfigs}>
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

            {/* 编辑弹窗 */}
            <Modal
                title={`${t('config.edit')}: ${editingRecord?.config_key || ''}`}
                visible={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={[
                    <Button key="cancel" onClick={() => setModalVisible(false)}>
                        {t('common.cancel')}
                    </Button>,
                    <Button
                        key="test"
                        type="default"
                        loading={testing}
                        onClick={handleTest}
                        disabled={!editingRecord || !['ai.default_model', 'knowledge.provider'].includes(editingRecord.config_key)}
                    >
                        {t('config.test_connection')}
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        loading={submitting}
                        onClick={handleSubmit}
                    >
                        {t('common.save')}
                    </Button>,
                ]}
                width={700}
                destroyOnClose
            >
                <Form form={form} layout="vertical">
                    <Form.Item label={t('config.description')}>
                        <Input.TextArea value={editingRecord?.description} disabled rows={2} />
                    </Form.Item>

                    <Form.Item
                        name="config_value"
                        label={t('config.value')}
                        rules={[{ required: true, message: t('config.value_required') }]}
                    >
                        <TextArea rows={10} placeholder="JSON format" style={{ fontFamily: 'monospace' }} />
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
                    <SettingOutlined />
                    {t('config_title')}
                </Space>
            }
        >
            {content}
        </PageLayout>
    );
};

export default AIConfiguration;
