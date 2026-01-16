// n9e-2kai: 云数据库 RDS 列表页面
import React, { useState, useEffect } from 'react';
import { Table, Card, Input, Select, Tag, Space, message, Button, Row, Col, Tooltip, Popconfirm, Statistic, Modal, Drawer, Form } from 'antd';
import { ReloadOutlined, DatabaseOutlined, SyncOutlined, PlayCircleOutlined, PauseCircleOutlined, InfoCircleOutlined, HddOutlined, FileSearchOutlined, UserOutlined, EditOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ColumnsType } from 'antd/es/table';
import PageLayout from '@/components/pageLayout';
import { getCloudRDSList, getCloudAccounts, syncCloudRDS, CloudRDS, CloudAccount, getCloudRDSOwners, upsertCloudRDSOwner, CloudRDSOwner, getCloudStaffNames } from '@/services/cloudManagement';
import SlowLogStats from './SlowLogStats';
import './index.less';

const { Search } = Input;
const { Option } = Select;

// 状态颜色映射
const STATUS_COLORS: Record<string, string> = {
    running: 'green',
    available: 'green',
    stopped: 'red',
    creating: 'orange',
    deleting: 'orange',
    rebooting: 'orange',
    modifying: 'orange',
    backing_up: 'blue',
    restoring: 'blue',
};

// 云厂商颜色映射
const PROVIDER_COLORS: Record<string, string> = {
    huawei: 'red',
    aliyun: 'orange',
    tencent: 'blue',
    volcengine: 'volcano',
};

// 数据库引擎颜色
const ENGINE_COLORS: Record<string, string> = {
    mysql: 'blue',
    postgresql: 'purple',
    sqlserver: 'orange',
    mariadb: 'cyan',
};

const CloudRDSList: React.FC = () => {
    const { t } = useTranslation('cloudManagement');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<CloudRDS[]>([]);
    const [total, setTotal] = useState(0);
    const [searchText, setSearchText] = useState('');
    const [accountFilter, setAccountFilter] = useState<number | undefined>(undefined);
    const [providerFilter, setProviderFilter] = useState<string>('all');
    const [engineFilter, setEngineFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [ownerFilter, setOwnerFilter] = useState<string>('all');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

    // 统计数据
    const [stats, setStats] = useState({
        total: 0,
        running: 0,
        stopped: 0
    });

    // 账号列表
    const [accounts, setAccounts] = useState<CloudAccount[]>([]);
    const [syncing, setSyncing] = useState(false);

    // 慢日志抽屉
    const [slowLogDrawerVisible, setSlowLogDrawerVisible] = useState(false);
    const [selectedRDS, setSelectedRDS] = useState<CloudRDS | null>(null);

    // n9e-2kai: 负责人编辑
    const [ownerModalVisible, setOwnerModalVisible] = useState(false);
    const [ownerLoading, setOwnerLoading] = useState(false);
    const [ownerMap, setOwnerMap] = useState<Record<string, CloudRDSOwner>>({});
    const [ownerForm] = Form.useForm();
    // n9e-2kai: 负责人姓名列表（用于下拉选择）
    const [staffNames, setStaffNames] = useState<string[]>([]);

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

    // n9e-2kai: 获取负责人列表
    const fetchOwners = async () => {
        try {
            const res = await getCloudRDSOwners({ limit: 10000 });
            if (!res.err && res.dat?.list) {
                const map: Record<string, CloudRDSOwner> = {};
                res.dat.list.forEach((o: CloudRDSOwner) => {
                    map[o.instance_id] = o;
                });
                setOwnerMap(map);
            }
        } catch (error) {
            console.error('Failed to fetch owners:', error);
        }
    };

    // n9e-2kai: 获取负责人姓名列表
    const fetchStaffNames = async () => {
        try {
            const res = await getCloudStaffNames();
            if (!res.err && res.dat) {
                setStaffNames(res.dat);
            }
        } catch (error) {
            console.error('Failed to fetch staff names:', error);
        }
    };

    // 获取统计数据
    const fetchStats = async () => {
        try {
            const [totalRes, runningRes, stoppedRes] = await Promise.all([
                getCloudRDSList({ limit: 1 }),
                getCloudRDSList({ status: 'running', limit: 1 }),
                getCloudRDSList({ status: 'stopped', limit: 1 })
            ]);

            setStats({
                total: !totalRes.err ? totalRes.dat?.total || 0 : 0,
                running: !runningRes.err ? runningRes.dat?.total || 0 : 0,
                stopped: !stoppedRes.err ? stoppedRes.dat?.total || 0 : 0,
            });
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    // 获取 RDS 列表
    const fetchRDSList = async () => {
        setLoading(true);
        try {
            const res = await getCloudRDSList({
                account_id: accountFilter,
                provider: providerFilter === 'all' ? undefined : providerFilter,
                engine: engineFilter === 'all' ? undefined : engineFilter,
                status: statusFilter === 'all' ? undefined : statusFilter,
                owner: ownerFilter === 'all' ? undefined : ownerFilter,
                query: searchText || undefined,
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

    useEffect(() => {
        fetchAccounts();
        fetchStats();
        fetchOwners();
        fetchStaffNames();
    }, []);

    useEffect(() => {
        fetchRDSList();
    }, [pagination.current, pagination.pageSize, accountFilter, providerFilter, engineFilter, statusFilter, ownerFilter, searchText]);

    // 同步 RDS 资源
    const handleSyncRDS = async () => {
        if (!accountFilter) {
            message.warning(t('select_account'));
            return;
        }
        setSyncing(true);
        try {
            const res = await syncCloudRDS({ account_id: accountFilter });
            if (res.err) {
                message.error(res.err);
                return;
            }
            message.success(t('sync_triggered'));
            // 延迟刷新列表
            setTimeout(() => {
                fetchRDSList();
                fetchStats();
            }, 2000);
        } catch (error) {
            message.error(t('fetch_failed'));
        } finally {
            setSyncing(false);
        }
    };

    // 格式化时间戳
    const formatTime = (timestamp: number) => {
        if (!timestamp) return '-';
        return new Date(timestamp * 1000).toLocaleString();
    };

    // 格式化 IP 列表
    const formatIPs = (ips: string[]) => {
        if (!ips || ips.length === 0) return '-';
        if (ips.length === 1) return <span style={{ fontFamily: 'monospace' }}>{ips[0]}</span>;
        return (
            <Tooltip title={ips.join(', ')}>
                <span style={{ fontFamily: 'monospace' }}>{ips[0]} (+{ips.length - 1})</span>
            </Tooltip>
        );
    };

    // 打开慢日志抽屉
    const handleShowSlowLogs = (record: CloudRDS) => {
        setSelectedRDS(record);
        setSlowLogDrawerVisible(true);
    };

    // n9e-2kai: 打开负责人编辑弹窗（简化版）
    const handleEditOwner = (record: CloudRDS) => {
        setSelectedRDS(record);
        const owner = ownerMap[record.instance_id];
        ownerForm.setFieldsValue({
            owner: owner?.owner || undefined,
        });
        setOwnerModalVisible(true);
    };

    // n9e-2kai: 保存负责人信息（简化版）
    const handleSaveOwner = async () => {
        if (!selectedRDS) return;
        try {
            const values = await ownerForm.validateFields();
            setOwnerLoading(true);
            const res = await upsertCloudRDSOwner({
                instance_id: selectedRDS.instance_id,
                instance_name: selectedRDS.instance_name,
                provider: selectedRDS.provider,
                owner: values.owner || '',
            });
            if (res.err) {
                message.error(res.err);
                return;
            }
            message.success(t('update_success'));
            setOwnerModalVisible(false);
            fetchOwners();
        } catch (error) {
            console.error('Failed to save owner:', error);
        } finally {
            setOwnerLoading(false);
        }
    };

    const columns: ColumnsType<CloudRDS> = [
        {
            title: t('instance_name'),
            dataIndex: 'instance_name',
            key: 'instance_name',
            width: 220,
            fixed: 'left',
            render: (text, record) => (
                <Space>
                    <div style={{
                        width: 32, height: 32, background: '#f9f0ff', borderRadius: 4,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#722ed1'
                    }}>
                        <DatabaseOutlined />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="instance-name" style={{ fontWeight: 600, color: '#1890ff' }}>
                            {text || record.instance_id}
                        </span>
                        <span style={{ fontSize: 12, color: '#8c8c8c' }}>{record.instance_id}</span>
                    </div>
                </Space>
            ),
        },
        {
            title: t('provider'),
            dataIndex: 'provider',
            key: 'provider',
            width: 100,
            render: (provider: string) => {
                const color = PROVIDER_COLORS[provider];
                return <Tag color={color}>{provider.toUpperCase()}</Tag>;
            }
        },
        {
            title: t('region'),
            dataIndex: 'region',
            key: 'region',
            width: 120,
        },
        {
            title: t('engine'),
            key: 'engine',
            width: 140,
            render: (_, record) => (
                <Tag color={ENGINE_COLORS[record.engine] || 'default'}>
                    {record.engine} {record.engine_version}
                </Tag>
            ),
        },
        {
            title: t('status'),
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: string) => {
                let icon = <InfoCircleOutlined />;
                if (status === 'running' || status === 'available') icon = <PlayCircleOutlined />;
                else if (status === 'stopped') icon = <PauseCircleOutlined />;

                return <Tag color={STATUS_COLORS[status] || 'default'} icon={icon}>{status.toUpperCase()}</Tag>;
            },
        },
        {
            title: t('private_ip'),
            dataIndex: 'private_ips',
            key: 'private_ips',
            width: 150,
            render: formatIPs,
        },
        {
            title: t('port'),
            dataIndex: 'port',
            key: 'port',
            width: 80,
            render: (port) => <span style={{ fontFamily: 'monospace' }}>{port}</span>
        },
        {
            title: t('spec'),
            key: 'spec',
            width: 200,
            render: (_, record) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{record.instance_type}</span>
                    <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                        {record.cpu}C / {record.memory}G / {record.storage}G
                    </span>
                </div>
            ),
        },
        {
            title: t('charge_type'),
            dataIndex: 'charge_type',
            key: 'charge_type',
            width: 100,
            render: (chargeType: string) => (
                <Tag>{chargeType === 'prepaid' ? t('prepaid') : t('postpaid')}</Tag>
            ),
        },
        {
            title: t('expire_time'),
            dataIndex: 'expire_time',
            key: 'expire_time',
            width: 170,
            render: formatTime,
        },
        {
            title: t('sync_time'),
            dataIndex: 'sync_at',
            key: 'sync_at',
            width: 170,
            render: formatTime,
        },
        {
            title: t('owner'),
            key: 'owner',
            width: 150,
            render: (_, record) => {
                const owner = ownerMap[record.instance_id];
                return (
                    <Space size={4}>
                        {owner?.owner ? (
                            <Tooltip title={`${owner.team || ''} ${owner.department || ''}`}>
                                <Tag icon={<UserOutlined />} color="blue">
                                    {owner.owner}
                                </Tag>
                            </Tooltip>
                        ) : (
                            <Tag color="default">{t('unassigned')}</Tag>
                        )}
                        <Tooltip title={t('edit_owner')}>
                            <EditOutlined
                                style={{ color: '#1890ff', cursor: 'pointer' }}
                                onClick={() => handleEditOwner(record)}
                            />
                        </Tooltip>
                    </Space>
                );
            },
        },
        {
            title: t('actions'),
            key: 'actions',
            width: 120,
            fixed: 'right',
            render: (_, record) => (
                <Space>
                    <Tooltip title={t('slow_log_stats')}>
                        <Button
                            type="link"
                            size="small"
                            icon={<FileSearchOutlined />}
                            onClick={() => handleShowSlowLogs(record)}
                        >
                            {t('slow_logs')}
                        </Button>
                    </Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <PageLayout title={<Space><DatabaseOutlined />{t('cloud_rds')}</Space>}>
            <div className="cloud-rds-page">
                <div className="stats-card-container">
                    <Row gutter={16}>
                        <Col span={8}>
                            <div className="stats-card">
                                <div className="stats-icon purple">
                                    <DatabaseOutlined />
                                </div>
                                <div className="stats-content">
                                    <div className="stats-title">{t('total_instances')}</div>
                                    <div className="stats-value">{stats.total}</div>
                                </div>
                            </div>
                        </Col>
                        <Col span={8}>
                            <div className="stats-card">
                                <div className="stats-icon green">
                                    <PlayCircleOutlined />
                                </div>
                                <div className="stats-content">
                                    <div className="stats-title">{t('running_instances')}</div>
                                    <div className="stats-value">{stats.running}</div>
                                </div>
                            </div>
                        </Col>
                        <Col span={8}>
                            <div className="stats-card">
                                <div className="stats-icon red">
                                    <PauseCircleOutlined />
                                </div>
                                <div className="stats-content">
                                    <div className="stats-title">{t('stopped_instances')}</div>
                                    <div className="stats-value">{stats.stopped}</div>
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
                                style={{ width: 180 }}
                                placeholder={t('select_account')}
                                allowClear
                            >
                                {accounts.map(a => (
                                    <Option key={a.id} value={a.id}>{a.name}</Option>
                                ))}
                            </Select>
                        </div>
                        <div className="filter-item">
                            <span className="label">{t('provider')}:</span>
                            <Select
                                value={providerFilter}
                                onChange={setProviderFilter}
                                style={{ width: 120 }}
                            >
                                <Option value="all">{t('all_providers')}</Option>
                                <Option value="huawei">华为云</Option>
                                <Option value="aliyun">阿里云</Option>
                                <Option value="tencent">腾讯云</Option>
                                <Option value="volcengine">火山云</Option>
                            </Select>
                        </div>
                        <div className="filter-item">
                            <span className="label">{t('engine')}:</span>
                            <Select
                                value={engineFilter}
                                onChange={setEngineFilter}
                                style={{ width: 120 }}
                            >
                                <Option value="all">{t('all_engines')}</Option>
                                <Option value="mysql">MySQL</Option>
                                <Option value="postgresql">PostgreSQL</Option>
                                <Option value="sqlserver">SQL Server</Option>
                                <Option value="mariadb">MariaDB</Option>
                            </Select>
                        </div>
                        <div className="filter-item">
                            <span className="label">{t('status')}:</span>
                            <Select
                                value={statusFilter}
                                onChange={setStatusFilter}
                                style={{ width: 120 }}
                            >
                                <Option value="all">{t('all_status')}</Option>
                                <Option value="running">{t('status_running')}</Option>
                                <Option value="stopped">{t('status_stopped')}</Option>
                            </Select>
                        </div>
                        <div className="filter-item">
                            <span className="label">{t('owner')}:</span>
                            <Select
                                value={ownerFilter}
                                onChange={setOwnerFilter}
                                style={{ width: 120 }}
                                showSearch
                                optionFilterProp="children"
                            >
                                <Option value="all">{t('all_owners') || '全部负责人'}</Option>
                                {staffNames.map(name => (
                                    <Option key={name} value={name}>{name}</Option>
                                ))}
                            </Select>
                        </div>
                        <div className="filter-item">
                            <Search
                                placeholder={t('search_rds_placeholder')}
                                value={searchText}
                                onChange={e => setSearchText(e.target.value)}
                                onSearch={() => fetchRDSList()}
                                style={{ width: 250 }}
                                enterButton
                            />
                        </div>
                        <div className="filter-actions">
                            <Space>
                                <Popconfirm
                                    title={t('sync_confirm')}
                                    onConfirm={handleSyncRDS}
                                    disabled={!accountFilter}
                                >
                                    <Button
                                        icon={<SyncOutlined spin={syncing} />}
                                        loading={syncing}
                                        disabled={!accountFilter}
                                    >
                                        {t('sync_rds')}
                                    </Button>
                                </Popconfirm>
                                <Button icon={<ReloadOutlined />} onClick={() => { fetchRDSList(); fetchStats(); }}>
                                    {t('refresh')}
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
                        scroll={{ x: 2020 }}
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

                {/* 慢日志统计抽屉 */}
                <Drawer
                    title={
                        <Space>
                            <FileSearchOutlined />
                            {t('slow_log_stats')} - {selectedRDS?.instance_name || selectedRDS?.instance_id}
                        </Space>
                    }
                    visible={slowLogDrawerVisible}
                    onClose={() => setSlowLogDrawerVisible(false)}
                    width="80%"
                    destroyOnClose
                >
                    {selectedRDS && (
                        <SlowLogStats
                            rdsId={selectedRDS.id}
                            instanceId={selectedRDS.instance_id}
                            instanceName={selectedRDS.instance_name}
                        />
                    )}
                </Drawer>

                <Modal
                    title={
                        <Space>
                            <UserOutlined />
                            {t('edit_owner')} - {selectedRDS?.instance_name || selectedRDS?.instance_id}
                        </Space>
                    }
                    visible={ownerModalVisible}
                    onCancel={() => setOwnerModalVisible(false)}
                    onOk={handleSaveOwner}
                    confirmLoading={ownerLoading}
                    destroyOnClose
                    width={400}
                >
                    <Form
                        form={ownerForm}
                        layout="vertical"
                    >
                        <Form.Item name="owner" label={t('owner_name')}>
                            <Select
                                placeholder={t('select_owner')}
                                allowClear
                                showSearch
                            >
                                {staffNames.map(name => (
                                    <Option key={name} value={name}>{name}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <div style={{ color: '#8c8c8c', fontSize: 12 }}>
                            {t('owner_hint')}
                        </div>
                    </Form>
                </Modal>
            </div>
        </PageLayout>
    );
};

export default CloudRDSList;
