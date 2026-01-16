// n9e-2kai: 云同步配置管理页面
import React, { useState, useEffect } from 'react';
import { Table, Card, Input, Select, Tag, Space, message, Button, Modal, Form, Switch, InputNumber, Popconfirm, Row, Col, Tooltip, Statistic, DatePicker } from 'antd';
import { ReloadOutlined, SettingOutlined, PlusOutlined, EditOutlined, DeleteOutlined, SyncOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, CloudServerOutlined, DatabaseOutlined, ScheduleOutlined, FieldTimeOutlined } from '@ant-design/icons';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import { ColumnsType } from 'antd/es/table';
import PageLayout from '@/components/pageLayout';
import { 
    getCloudSyncConfigs, 
    addCloudSyncConfig, 
    updateCloudSyncConfig, 
    deleteCloudSyncConfigs, 
    getCloudAccounts, 
    getCloudRegions,
    triggerCloudSyncConfig,
    CloudSyncConfig, 
    CloudAccount,
    Region 
} from '@/services/cloudManagement';
import './index.less';

const { Option } = Select;

// 同步状态颜色映射
const SYNC_STATUS_MAP: Record<number, { color: string; icon: React.ReactNode; label: string }> = {
    0: { color: 'default', icon: <ClockCircleOutlined />, label: 'not_synced' },
    1: { color: 'success', icon: <CheckCircleOutlined />, label: 'sync_success' },
    2: { color: 'error', icon: <CloseCircleOutlined />, label: 'sync_failed' },
    3: { color: 'processing', icon: <SyncOutlined spin />, label: 'sync_running' },
};

// 资源类型映射
const RESOURCE_TYPE_MAP: Record<string, string> = {
    ecs: 'resource_type_ecs',
    rds: 'resource_type_rds',
    rds_slowlog: 'resource_type_rds_slowlog',
};

const CloudSyncConfigList: React.FC = () => {
    const { t } = useTranslation('cloudManagement');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<CloudSyncConfig[]>([]);
    const [total, setTotal] = useState(0);
    const [accountFilter, setAccountFilter] = useState<number | undefined>(undefined);
    const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('all');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
    
    // 统计数据
    const [stats, setStats] = useState({
        total: 0,
        ecs: 0,
        rds: 0
    });

    // 账号和区域数据
    const [accounts, setAccounts] = useState<CloudAccount[]>([]);
    const [regions, setRegions] = useState<Region[]>([]);
    
    // 表单相关
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'add' | 'edit'>('add');
    const [editingRecord, setEditingRecord] = useState<CloudSyncConfig | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [form] = Form.useForm();
    
    // 选中行
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    
    // n9e-2kai: 慢日志同步时间选择弹窗
    const [syncTimeModalVisible, setSyncTimeModalVisible] = useState(false);
    const [syncTimeRecord, setSyncTimeRecord] = useState<CloudSyncConfig | null>(null);
    const [syncStartTime, setSyncStartTime] = useState<moment.Moment | null>(null);
    const [syncEndTime, setSyncEndTime] = useState<moment.Moment | null>(null);

    // 获取账号列表
    const fetchAccounts = async () => {
        try {
            const res = await getCloudAccounts({ limit: 1000 });
            if (!res.err) {
                setAccounts(res.dat?.list || []);
            }
        } catch (error) {
            console.error('Failed to fetch accounts:', error);
        }
    };

    // 获取统计数据
    const fetchStats = async () => {
        try {
            const [totalRes, ecsRes, rdsRes] = await Promise.all([
                getCloudSyncConfigs({ limit: 1 }),
                getCloudSyncConfigs({ resource_type: 'ecs', limit: 1 }),
                getCloudSyncConfigs({ resource_type: 'rds', limit: 1 })
            ]);

            setStats({
                total: !totalRes.err ? totalRes.dat?.total || 0 : 0,
                ecs: !ecsRes.err ? ecsRes.dat?.total || 0 : 0,
                rds: !rdsRes.err ? rdsRes.dat?.total || 0 : 0,
            });
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    // 获取同步配置列表
    const fetchConfigs = async () => {
        setLoading(true);
        try {
            const res = await getCloudSyncConfigs({
                account_id: accountFilter,
                resource_type: resourceTypeFilter === 'all' ? undefined : resourceTypeFilter,
                limit: pagination.pageSize,
                offset: (pagination.current - 1) * pagination.pageSize,
            });
            if (res.err) {
                message.error(res.err);
                return;
            }
            setData(res.dat?.list || []);
            setTotal(res.dat?.total || 0);
        } catch (error) {
            message.error(t('fetch_failed'));
        } finally {
            setLoading(false);
        }
    };

    // 获取账号对应的区域列表
    const fetchRegionsForAccount = async (accountId: number) => {
        const account = accounts.find(a => a.id === accountId);
        if (account) {
            try {
                const res = await getCloudRegions(account.provider);
                if (!res.err) {
                    setRegions(res.dat || []);
                }
            } catch (error) {
                console.error('Failed to fetch regions:', error);
            }
        }
    };

    useEffect(() => {
        fetchAccounts();
        fetchStats();
    }, []);

    useEffect(() => {
        fetchConfigs();
    }, [pagination.current, pagination.pageSize, accountFilter, resourceTypeFilter]);

    // 打开添加弹窗
    const handleAdd = () => {
        setModalType('add');
        setEditingRecord(null);
        form.resetFields();
        form.setFieldsValue({
            enabled: true,
            sync_interval: 300,
            regions: [],
        });
        setRegions([]);
        setModalVisible(true);
    };

    // 打开编辑弹窗
    const handleEdit = (record: CloudSyncConfig) => {
        setModalType('edit');
        setEditingRecord(record);
        form.setFieldsValue({
            ...record,
        });
        fetchRegionsForAccount(record.account_id);
        setModalVisible(true);
    };

    // 处理账号选择变化
    const handleAccountChange = (accountId: number) => {
        form.setFieldsValue({ regions: [] });
        fetchRegionsForAccount(accountId);
    };

    // 提交表单
    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);
            
            if (modalType === 'add') {
                const res = await addCloudSyncConfig(values);
                if (res.err) {
                    message.error(res.err);
                    return;
                }
                message.success(t('add_success'));
            } else if (editingRecord) {
                const res = await updateCloudSyncConfig(editingRecord.id, values);
                if (res.err) {
                    message.error(res.err);
                    return;
                }
                message.success(t('update_success'));
            }
            
            setModalVisible(false);
            fetchConfigs();
            fetchStats();
        } catch (error) {
            console.error('Form validation failed:', error);
        } finally {
            setSubmitting(false);
        }
    };

    // 删除配置
    const handleDelete = async (ids: number[]) => {
        try {
            const res = await deleteCloudSyncConfigs(ids);
            if (res.err) {
                message.error(res.err);
                return;
            }
            message.success(t('delete_success'));
            setSelectedRowKeys([]);
            fetchConfigs();
            fetchStats();
        } catch (error) {
            message.error(t('delete_failed'));
        }
    };

    // 手动触发同步
    const handleTriggerSync = async (record: CloudSyncConfig) => {
        // n9e-2kai: 如果是慢日志类型，弹出时间选择窗口
        if (record.resource_type === 'rds_slowlog') {
            setSyncTimeRecord(record);
            // 默认选择昨天
            const yesterday = moment().subtract(1, 'days').startOf('day');
            setSyncStartTime(yesterday);
            setSyncEndTime(yesterday.clone().endOf('day'));
            setSyncTimeModalVisible(true);
            return;
        }
        
        // 其他类型直接触发同步
        await doTriggerSync(record);
    };
    
    // n9e-2kai: 执行同步
    const doTriggerSync = async (record: CloudSyncConfig, startTime?: number, endTime?: number) => {
        try {
            const res = await triggerCloudSyncConfig(record.id, startTime, endTime);
            if (res.err) {
                message.error(res.err);
                return;
            }
            message.success(t('sync_started'));
            // 刷新数据，显示同步中状态
            fetchConfigs();
        } catch (error) {
            message.error(t('sync_failed'));
        }
    };
    
    // n9e-2kai: 确认慢日志同步时间
    const handleConfirmSyncTime = async () => {
        if (!syncTimeRecord) return;
        
        if (!syncStartTime || !syncEndTime) {
            message.error(t('please_select_sync_time'));
            return;
        }
        
        const startTimeSec = Math.floor(syncStartTime.valueOf() / 1000);
        const endTimeSec = Math.floor(syncEndTime.valueOf() / 1000);
        
        setSyncTimeModalVisible(false);
        await doTriggerSync(syncTimeRecord, startTimeSec, endTimeSec);
        setSyncTimeRecord(null);
        setSyncStartTime(null);
        setSyncEndTime(null);
    };
    
    // n9e-2kai: 获取近2周的日期禁用规则
    const disabledDate = (current: moment.Moment) => {
        if (!current) return false;
        const twoWeeksAgo = moment().subtract(14, 'days').startOf('day');
        const today = moment().endOf('day');
        return current < twoWeeksAgo || current > today;
    };

    // 格式化时间戳
    const formatTime = (timestamp: number) => {
        if (!timestamp) return '-';
        return new Date(timestamp * 1000).toLocaleString();
    };

    // 获取账号名称
    const getAccountName = (accountId: number) => {
        const account = accounts.find(a => a.id === accountId);
        return account?.name || String(accountId);
    };

    const columns: ColumnsType<CloudSyncConfig> = [
        {
            title: t('account'),
            dataIndex: 'account_id',
            key: 'account_id',
            width: 150,
            render: (id) => <span style={{ fontWeight: 600 }}>{getAccountName(id)}</span>,
        },
        {
            title: t('resource_type'),
            dataIndex: 'resource_type',
            key: 'resource_type',
            width: 120,
            render: (type: string) => {
                let icon: React.ReactNode = null;
                if (type === 'ecs') icon = <CloudServerOutlined />;
                if (type === 'rds') icon = <DatabaseOutlined />;
                return <Tag icon={icon}>{t(RESOURCE_TYPE_MAP[type] || type)}</Tag>;
            },
        },
        {
            title: t('enabled'),
            dataIndex: 'enabled',
            key: 'enabled',
            width: 100,
            render: (enabled: boolean) => (
                enabled ? <Tag color="green">{t('enabled')}</Tag> : <Tag>{t('disabled')}</Tag>
            ),
        },
        {
            title: t('sync_interval'),
            dataIndex: 'sync_interval',
            key: 'sync_interval',
            width: 120,
            render: (interval: number) => <Tag color="blue">{interval} {t('seconds')}</Tag>,
        },
        {
            title: t('regions_filter'),
            dataIndex: 'regions',
            key: 'regions',
            width: 150,
            render: (regions: string[]) => {
                if (!regions || regions.length === 0) return <span style={{ color: '#bfbfbf' }}>{t('all_regions')}</span>;
                if (regions.length <= 2) return regions.join(', ');
                return (
                    <Tooltip title={regions.join(', ')}>
                        <span>{regions.slice(0, 2).join(', ')} (+{regions.length - 2})</span>
                    </Tooltip>
                );
            },
        },
        {
            title: t('last_sync_status'),
            dataIndex: 'last_sync_status',
            key: 'last_sync_status',
            width: 120,
            render: (status: number) => {
                const config = SYNC_STATUS_MAP[status] || SYNC_STATUS_MAP[0];
                return (
                    <Tag color={config.color} icon={config.icon}>
                        {t(config.label)}
                    </Tag>
                );
            },
        },
        {
            title: t('last_sync_time'),
            dataIndex: 'last_sync_time',
            key: 'last_sync_time',
            width: 170,
            render: formatTime,
        },
        {
            title: t('last_sync_count'),
            key: 'last_sync_stats',
            width: 250,
            render: (_, record) => (
                <Space size="small">
                    <span>{t('total')}: {record.last_sync_count}</span>
                    <Tag color="success" style={{ marginRight: 0 }}>+{record.last_sync_added}</Tag>
                    <Tag color="blue" style={{ marginRight: 0 }}>~{record.last_sync_updated}</Tag>
                    <Tag color="error" style={{ marginRight: 0 }}>-{record.last_sync_deleted}</Tag>
                </Space>
            ),
        },
        {
            title: t('actions'),
            key: 'actions',
            width: 200,
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title={record.last_sync_status === 3 ? t('sync_running') : t('trigger_sync')}>
                        <Button 
                            type="link" 
                            size="small" 
                            icon={<SyncOutlined spin={record.last_sync_status === 3} />} 
                            onClick={() => handleTriggerSync(record)}
                            disabled={record.last_sync_status === 3}
                        >
                            {t('sync')}
                        </Button>
                    </Tooltip>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                        {t('edit')}
                    </Button>
                    <Popconfirm
                        title={t('delete_confirm')}
                        onConfirm={() => handleDelete([record.id])}
                    >
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                            {t('delete')}
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <PageLayout title={<Space><SettingOutlined />{t('sync_config_title')}</Space>}>
            <div className="cloud-sync-config-page">
                <div className="stats-card-container">
                    <Row gutter={16}>
                        <Col span={8}>
                            <div className="stats-card">
                                <div className="stats-icon blue">
                                    <ScheduleOutlined />
                                </div>
                                <div className="stats-content">
                                    <div className="stats-title">{t('total_configs')}</div>
                                    <div className="stats-value">{stats.total}</div>
                                </div>
                            </div>
                        </Col>
                        <Col span={8}>
                            <div className="stats-card">
                                <div className="stats-icon green">
                                    <CloudServerOutlined />
                                </div>
                                <div className="stats-content">
                                    <div className="stats-title">{t('ecs_configs')}</div>
                                    <div className="stats-value">{stats.ecs}</div>
                                </div>
                            </div>
                        </Col>
                        <Col span={8}>
                            <div className="stats-card">
                                <div className="stats-icon orange">
                                    <DatabaseOutlined />
                                </div>
                                <div className="stats-content">
                                    <div className="stats-title">{t('rds_configs')}</div>
                                    <div className="stats-value">{stats.rds}</div>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </div>

                <Card className="search-filter-card" bodyStyle={{ padding: 24 }}>
                    <div className="filter-row">
                        <div className="filter-item">
                            <span className="label">{t('account')}:</span>
                            <Select
                                value={accountFilter}
                                onChange={setAccountFilter}
                                style={{ width: 200 }}
                                placeholder={t('select_account')}
                                allowClear
                            >
                                {accounts.map(a => (
                                    <Option key={a.id} value={a.id}>{a.name}</Option>
                                ))}
                            </Select>
                        </div>
                        <div className="filter-item">
                            <span className="label">{t('resource_type')}:</span>
                            <Select
                                value={resourceTypeFilter}
                                onChange={setResourceTypeFilter}
                                style={{ width: 150 }}
                            >
                                <Option value="all">{t('all_types')}</Option>
                                <Option value="ecs">{t('resource_type_ecs')}</Option>
                                <Option value="rds">{t('resource_type_rds')}</Option>
                                <Option value="rds_slowlog">{t('resource_type_rds_slowlog')}</Option>
                            </Select>
                        </div>
                        <div className="filter-actions">
                            <Space>
                                {selectedRowKeys.length > 0 && (
                                    <Popconfirm
                                        title={t('batch_delete_confirm')}
                                        onConfirm={() => handleDelete(selectedRowKeys as number[])}
                                    >
                                        <Button danger>{t('batch_delete')} ({selectedRowKeys.length})</Button>
                                    </Popconfirm>
                                )}
                                <Button icon={<ReloadOutlined />} onClick={() => { fetchConfigs(); fetchStats(); }}>
                                    {t('refresh')}
                                </Button>
                                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                                    {t('add_config')}
                                </Button>
                            </Space>
                        </div>
                    </div>
                </Card>

                <Card className="data-table-card" bordered={false} bodyStyle={{ padding: 0 }}>
                    <Table
                        rowKey="id"
                        columns={columns}
                        dataSource={data}
                        loading={loading}
                        rowSelection={{
                            selectedRowKeys,
                            onChange: setSelectedRowKeys,
                        }}
                        pagination={{
                            current: pagination.current,
                            pageSize: pagination.pageSize,
                            total,
                            showSizeChanger: true,
                            showQuickJumper: true,
                            showTotal: (total) => t('total_items', { total }),
                            onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
                        }}
                    />
                </Card>

                <Modal
                    title={modalType === 'add' ? t('add_sync_config') : t('edit_sync_config')}
                    visible={modalVisible}
                    onOk={handleSubmit}
                    onCancel={() => setModalVisible(false)}
                    confirmLoading={submitting}
                    width={600}
                >
                    <Form
                        form={form}
                        layout="vertical"
                    >
                        <Form.Item
                            name="account_id"
                            label={t('account')}
                            rules={[{ required: true, message: t('account_required') }]}
                        >
                            <Select 
                                placeholder={t('select_account')} 
                                onChange={handleAccountChange}
                                disabled={modalType === 'edit'}
                            >
                                {accounts.map(a => (
                                    <Option key={a.id} value={a.id}>{a.name}</Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="resource_type"
                            label={t('resource_type')}
                            rules={[{ required: true, message: t('resource_type_required') }]}
                        >
                            <Select placeholder={t('resource_type')} disabled={modalType === 'edit'}>
                                <Option value="ecs">{t('resource_type_ecs')}</Option>
                                <Option value="rds">{t('resource_type_rds')}</Option>
                                <Option value="rds_slowlog">{t('resource_type_rds_slowlog')}</Option>
                            </Select>
                        </Form.Item>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="enabled" label={t('enabled')} valuePropName="checked">
                                    <Switch />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="sync_interval" label={t('sync_interval')}>
                                    <InputNumber 
                                        min={60} 
                                        max={86400} 
                                        style={{ width: '100%' }} 
                                        addonAfter={t('seconds')} 
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item
                            name="regions"
                            label={t('regions_filter')}
                            tooltip={t('regions_filter_tip')}
                        >
                            <Select mode="multiple" placeholder={t('regions_filter_tip')} allowClear>
                                {regions.map(r => (
                                    <Option key={r.region} value={r.region}>{r.name} ({r.region})</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Form>
                </Modal>

                {/* n9e-2kai: 慢日志同步时间选择弹窗 */}
                <Modal
                    title={<Space><FieldTimeOutlined />{t('select_sync_time_range')}</Space>}
                    visible={syncTimeModalVisible}
                    onOk={handleConfirmSyncTime}
                    onCancel={() => {
                        setSyncTimeModalVisible(false);
                        setSyncTimeRecord(null);
                        setSyncStartTime(null);
                        setSyncEndTime(null);
                    }}
                    okText={t('start_sync')}
                    cancelText={t('cancel')}
                    width={480}
                >
                    <div style={{ marginBottom: 16 }}>
                        <p style={{ color: '#666', marginBottom: 16 }}>
                            {t('slowlog_sync_time_tip')}
                        </p>
                    </div>
                    <Form layout="vertical">
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item label={t('start_time')}>
                                    <DatePicker
                                        value={syncStartTime}
                                        onChange={(date) => setSyncStartTime(date)}
                                        disabledDate={disabledDate}
                                        showTime={{ defaultValue: moment('00:00:00', 'HH:mm:ss') }}
                                        format="YYYY-MM-DD HH:mm:ss"
                                        style={{ width: '100%' }}
                                        placeholder={t('select_start_time')}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label={t('end_time')}>
                                    <DatePicker
                                        value={syncEndTime}
                                        onChange={(date) => setSyncEndTime(date)}
                                        disabledDate={disabledDate}
                                        showTime={{ defaultValue: moment('23:59:59', 'HH:mm:ss') }}
                                        format="YYYY-MM-DD HH:mm:ss"
                                        style={{ width: '100%' }}
                                        placeholder={t('select_end_time')}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                        <div style={{ background: '#f5f5f5', padding: '12px 16px', borderRadius: 6 }}>
                            <Space direction="vertical" size={4}>
                                <div><strong>{t('quick_select')}:</strong></div>
                                <Space wrap>
                                    <Button size="small" onClick={() => {
                                        const yesterday = moment().subtract(1, 'days').startOf('day');
                                        setSyncStartTime(yesterday);
                                        setSyncEndTime(yesterday.clone().endOf('day'));
                                    }}>{t('yesterday')}</Button>
                                    <Button size="small" onClick={() => {
                                        const start = moment().subtract(3, 'days').startOf('day');
                                        setSyncStartTime(start);
                                        setSyncEndTime(moment().subtract(1, 'days').endOf('day'));
                                    }}>{t('last_3_days')}</Button>
                                    <Button size="small" onClick={() => {
                                        const start = moment().subtract(7, 'days').startOf('day');
                                        setSyncStartTime(start);
                                        setSyncEndTime(moment().subtract(1, 'days').endOf('day'));
                                    }}>{t('last_7_days')}</Button>
                                    <Button size="small" onClick={() => {
                                        const start = moment().subtract(14, 'days').startOf('day');
                                        setSyncStartTime(start);
                                        setSyncEndTime(moment().subtract(1, 'days').endOf('day'));
                                    }}>{t('last_14_days')}</Button>
                                </Space>
                            </Space>
                        </div>
                    </Form>
                </Modal>
            </div>
        </PageLayout>
    );
};

export default CloudSyncConfigList;
