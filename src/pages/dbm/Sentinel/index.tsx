import React, { useState, useEffect } from 'react';
import {
    Table, Card, Space, message, Button, Modal, Tag, Switch, Form, Input,
    Select, InputNumber, Popconfirm, Tooltip, Badge
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
    RobotOutlined, ReloadOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ColumnsType } from 'antd/es/table';
import {
    getArcheryInstances,
    getSentinelRules,
    addSentinelRule,
    updateSentinelRule,
    deleteSentinelRules,
    updateSentinelRuleStatus,
    getSentinelStatus,
    ArcheryInstance,
    SentinelRule
} from '@/services/dbm';
import PageLayout from '@/components/pageLayout';
import './index.less';

const { Option } = Select;
const { TextArea } = Input;

const Sentinel: React.FC = () => {
    const { t } = useTranslation('dbm');
    const [loading, setLoading] = useState(false);
    const [rules, setRules] = useState<SentinelRule[]>([]);
    const [total, setTotal] = useState(0);
    const [instances, setInstances] = useState<ArcheryInstance[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingRule, setEditingRule] = useState<SentinelRule | null>(null);
    const [form] = Form.useForm();
    const [status, setStatus] = useState<{ enabled_rules: number; running: boolean; kills_24h: number }>({
        enabled_rules: 0,
        running: false,
        kills_24h: 0,
    });

    // 获取实例列表
    const fetchInstances = async () => {
        try {
            const res = await getArcheryInstances();
            if (!res.err) {
                setInstances(res.dat?.list || []);
            }
        } catch (error) {
            console.error('Failed to fetch instances:', error);
        }
    };

    // 获取规则列表
    const fetchRules = async () => {
        setLoading(true);
        try {
            const res = await getSentinelRules({});
            if (res.err) {
                message.error(res.err);
                return;
            }
            setRules(res.dat?.list || []);
            setTotal(res.dat?.total || 0);
        } catch (error) {
            message.error(t('sentinel.fetch_failed'));
        } finally {
            setLoading(false);
        }
    };

    // 获取哨兵状态
    const fetchStatus = async () => {
        try {
            const res = await getSentinelStatus();
            if (!res.err) {
                setStatus(res.dat);
            }
        } catch (error) {
            console.error('Failed to fetch sentinel status:', error);
        }
    };

    useEffect(() => {
        fetchInstances();
        fetchRules();
        fetchStatus();
    }, []);

    // 打开编辑弹窗
    const handleEdit = (rule: SentinelRule | null) => {
        setEditingRule(rule);
        if (rule) {
            form.setFieldsValue({
                ...rule,
                notify_channel_ids: rule.notify_channel_ids ? rule.notify_channel_ids.split(',').filter(Boolean) : [],
                notify_user_group_ids: rule.notify_user_group_ids ? rule.notify_user_group_ids.split(',').filter(Boolean) : [],
            });
        } else {
            form.resetFields();
            form.setFieldsValue({
                enabled: true,
                action: 'notify_only',
                rule_type: 'slow_query',
                max_time: 60,
                check_interval: 30,
            });
        }
        setModalVisible(true);
    };

    // 保存规则
    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            const data = {
                ...values,
                notify_channel_ids: Array.isArray(values.notify_channel_ids)
                    ? values.notify_channel_ids.join(',')
                    : values.notify_channel_ids || '',
                notify_user_group_ids: Array.isArray(values.notify_user_group_ids)
                    ? values.notify_user_group_ids.join(',')
                    : values.notify_user_group_ids || '',
            };

            if (editingRule) {
                const res = await updateSentinelRule(editingRule.id, data);
                if (res.err) {
                    message.error(res.err);
                    return;
                }
                message.success(t('sentinel.update_success'));
            } else {
                const res = await addSentinelRule(data);
                if (res.err) {
                    message.error(res.err);
                    return;
                }
                message.success(t('sentinel.add_success'));
            }

            setModalVisible(false);
            fetchRules();
            fetchStatus();
        } catch (error) {
            console.error('Validation failed:', error);
        }
    };

    // 删除规则
    const handleDelete = async (ids: number[]) => {
        try {
            const res = await deleteSentinelRules(ids);
            if (res.err) {
                message.error(res.err);
                return;
            }
            message.success(t('sentinel.delete_success'));
            fetchRules();
            fetchStatus();
        } catch (error) {
            message.error(t('sentinel.delete_failed'));
        }
    };

    // 切换启用状态
    const handleToggleStatus = async (rule: SentinelRule, enabled: boolean) => {
        try {
            const res = await updateSentinelRuleStatus(rule.id, enabled);
            if (res.err) {
                message.error(res.err);
                return;
            }
            message.success(enabled ? t('sentinel.enabled') : t('sentinel.disabled'));
            fetchRules();
            fetchStatus();
        } catch (error) {
            message.error(t('sentinel.toggle_failed'));
        }
    };

    // 获取实例名称
    const getInstanceName = (instanceId: number) => {
        const instance = instances.find(i => i.id === instanceId);
        return instance ? `${instance.instance_name}` : `ID: ${instanceId}`;
    };

    // 表格列定义
    const columns: ColumnsType<SentinelRule> = [
        {
            title: t('sentinel.status'),
            dataIndex: 'enabled',
            key: 'enabled',
            width: 80,
            render: (enabled, record) => (
                <Switch
                    checked={enabled}
                    onChange={(checked) => handleToggleStatus(record, checked)}
                    size="small"
                />
            ),
        },
        {
            title: t('sentinel.name'),
            dataIndex: 'name',
            key: 'name',
            width: 150,
            ellipsis: true,
        },
        {
            title: t('sentinel.instance'),
            dataIndex: 'instance_id',
            key: 'instance_id',
            width: 150,
            render: (id) => <Tag color="blue">{getInstanceName(id)}</Tag>,
        },
        {
            title: t('sentinel.rule_type'),
            dataIndex: 'rule_type',
            key: 'rule_type',
            width: 120,
            render: (type) => {
                const typeMap: Record<string, { color: string; label: string }> = {
                    'slow_query': { color: 'orange', label: t('sentinel.type_slow_query') },
                    'uncommitted_trx': { color: 'red', label: t('sentinel.type_uncommitted_trx') },
                    'lock_wait': { color: 'purple', label: t('sentinel.type_lock_wait') },
                };
                const info = typeMap[type] || { color: 'default', label: type };
                return <Tag color={info.color}>{info.label}</Tag>;
            },
        },
        {
            title: t('sentinel.max_time'),
            dataIndex: 'max_time',
            key: 'max_time',
            width: 100,
            render: (time) => `${time}s`,
        },
        {
            title: t('sentinel.action'),
            dataIndex: 'action',
            key: 'action',
            width: 100,
            render: (action) => {
                const actionMap: Record<string, { color: string; label: string }> = {
                    'kill': { color: 'red', label: t('sentinel.action_kill') },
                    'notify_only': { color: 'blue', label: t('sentinel.action_notify') },
                };
                const info = actionMap[action] || { color: 'default', label: action };
                return <Tag color={info.color}>{info.label}</Tag>;
            },
        },
        {
            title: t('sentinel.check_interval'),
            dataIndex: 'check_interval',
            key: 'check_interval',
            width: 100,
            render: (interval) => `${interval}s`,
        },
        {
            title: t('sentinel.description'),
            dataIndex: 'description',
            key: 'description',
            width: 200,
            ellipsis: { showTitle: false },
            render: (desc) => (
                <Tooltip placement="topLeft" title={desc}>
                    {desc || '-'}
                </Tooltip>
            ),
        },
        {
            title: t('sentinel.actions'),
            key: 'actions',
            width: 150,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    >
                        {t('sentinel.edit')}
                    </Button>
                    <Popconfirm
                        title={t('sentinel.confirm_delete')}
                        onConfirm={() => handleDelete([record.id])}
                        okText={t('sessions.confirm')}
                        cancelText={t('sessions.cancel')}
                    >
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                            {t('sentinel.delete')}
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <PageLayout title={
            <Space>
                <RobotOutlined style={{ color: '#1890ff' }} />
                {t('sentinel.title')}
                <Badge
                    status={status.running ? 'success' : 'default'}
                    text={status.running ? t('sentinel.running') : t('sentinel.stopped')}
                />
            </Space>
        }>
            <div className="dbm-sentinel">
                <Card
                    extra={
                        <Space>
                            <Tag color="blue">{t('sentinel.enabled_rules')}: {status.enabled_rules}</Tag>
                            <Tag color="orange">{t('sentinel.kills_24h')}: {status.kills_24h}</Tag>
                            <Button icon={<ReloadOutlined />} onClick={() => { fetchRules(); fetchStatus(); }}>
                                {t('refresh')}
                            </Button>
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleEdit(null)}>
                                {t('sentinel.add_rule')}
                            </Button>
                        </Space>
                    }
                >
                    <Table
                        columns={columns}
                        dataSource={rules}
                        loading={loading}
                        rowKey="id"
                        pagination={{
                            total,
                            showSizeChanger: true,
                            showQuickJumper: true,
                            showTotal: (total) => t('total_items', { count: total }),
                            defaultPageSize: 20,
                        }}
                        scroll={{ x: 1300 }}
                    />
                </Card>

                {/* 编辑弹窗 */}
                <Modal
                    title={editingRule ? t('sentinel.edit_rule') : t('sentinel.add_rule')}
                    visible={modalVisible}
                    onOk={handleSave}
                    onCancel={() => setModalVisible(false)}
                    width={700}
                    okText={t('sentinel.save')}
                    cancelText={t('sessions.cancel')}
                >
                    <Form form={form} layout="vertical">
                        <Form.Item
                            name="name"
                            label={t('sentinel.name')}
                            rules={[{ required: true, message: t('sentinel.name_required') }]}
                        >
                            <Input placeholder={t('sentinel.name_placeholder')} />
                        </Form.Item>

                        <Form.Item name="description" label={t('sentinel.description')}>
                            <TextArea rows={2} placeholder={t('sentinel.description_placeholder')} />
                        </Form.Item>

                        <Space style={{ width: '100%' }} size="large">
                            <Form.Item
                                name="instance_id"
                                label={t('sentinel.instance')}
                                rules={[{ required: true, message: t('sentinel.instance_required') }]}
                                style={{ width: 300 }}
                            >
                                <Select placeholder={t('sentinel.select_instance')}>
                                    {instances.map((instance) => (
                                        <Option key={instance.id} value={instance.id}>
                                            {instance.instance_name} ({instance.host}:{instance.port})
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="rule_type"
                                label={t('sentinel.rule_type')}
                                rules={[{ required: true }]}
                                style={{ width: 200 }}
                            >
                                <Select>
                                    <Option value="slow_query">{t('sentinel.type_slow_query')}</Option>
                                    <Option value="uncommitted_trx">{t('sentinel.type_uncommitted_trx')}</Option>
                                    <Option value="lock_wait">{t('sentinel.type_lock_wait')}</Option>
                                </Select>
                            </Form.Item>
                        </Space>

                        <Space style={{ width: '100%' }} size="large">
                            <Form.Item
                                name="max_time"
                                label={t('sentinel.max_time_label')}
                                rules={[{ required: true }]}
                            >
                                <InputNumber min={1} max={86400} addonAfter="s" style={{ width: 150 }} />
                            </Form.Item>

                            <Form.Item
                                name="check_interval"
                                label={t('sentinel.check_interval_label')}
                                rules={[{ required: true }]}
                            >
                                <InputNumber min={5} max={3600} addonAfter="s" style={{ width: 150 }} />
                            </Form.Item>

                            <Form.Item
                                name="action"
                                label={t('sentinel.action_label')}
                                rules={[{ required: true }]}
                            >
                                <Select style={{ width: 150 }}>
                                    <Option value="notify_only">{t('sentinel.action_notify')}</Option>
                                    <Option value="kill">{t('sentinel.action_kill')}</Option>
                                </Select>
                            </Form.Item>
                        </Space>

                        <Form.Item name="match_user" label={t('sentinel.match_user')}>
                            <Input placeholder={t('sentinel.match_user_placeholder')} />
                        </Form.Item>

                        <Form.Item name="match_db" label={t('sentinel.match_db')}>
                            <Input placeholder={t('sentinel.match_db_placeholder')} />
                        </Form.Item>

                        <Form.Item name="match_sql" label={t('sentinel.match_sql')}>
                            <Input placeholder={t('sentinel.match_sql_placeholder')} />
                        </Form.Item>

                        <Form.Item name="exclude_user" label={t('sentinel.exclude_user')}>
                            <Input placeholder={t('sentinel.exclude_user_placeholder')} />
                        </Form.Item>

                        <Form.Item name="exclude_db" label={t('sentinel.exclude_db')}>
                            <Input placeholder={t('sentinel.exclude_db_placeholder')} />
                        </Form.Item>

                        <Form.Item name="exclude_sql" label={t('sentinel.exclude_sql')}>
                            <Input placeholder={t('sentinel.exclude_sql_placeholder')} />
                        </Form.Item>

                        <Form.Item name="enabled" label={t('sentinel.enabled_label')} valuePropName="checked">
                            <Switch />
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        </PageLayout>
    );
};

export default Sentinel;
