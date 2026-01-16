// n9e-2kai: 云主机 ECS 列表页面
import React, { useState, useEffect } from 'react';
import { Table, Card, Input, Select, Tag, Space, message, Button, Row, Col, Tooltip, Popconfirm, Statistic } from 'antd';
import { ReloadOutlined, CloudServerOutlined, SyncOutlined, DesktopOutlined, PlayCircleOutlined, PauseCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ColumnsType } from 'antd/es/table';
import PageLayout from '@/components/pageLayout';
import { getCloudECSList, getCloudAccounts, syncCloudECS, CloudECS, CloudAccount } from '@/services/cloudManagement';
import './index.less';

const { Search } = Input;
const { Option } = Select;

// 状态颜色映射
const STATUS_COLORS: Record<string, string> = {
    running: 'green',
    stopped: 'red',
    starting: 'orange',
    stopping: 'orange',
    rebooting: 'orange',
    pending: 'blue',
    terminated: 'default',
};

// 云厂商颜色映射
const PROVIDER_COLORS: Record<string, string> = {
    huawei: 'red',
    aliyun: 'orange',
    tencent: 'blue',
    volcengine: 'volcano',
};

const CloudECSList: React.FC = () => {
    const { t } = useTranslation('cloudManagement');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<CloudECS[]>([]);
    const [total, setTotal] = useState(0);
    const [searchText, setSearchText] = useState('');
    const [accountFilter, setAccountFilter] = useState<number | undefined>(undefined);
    const [providerFilter, setProviderFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
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
            // 并行请求获取各状态数量
            // 注意：这里假设 limit: 1 可以返回 total，尽量减少数据传输
            const [totalRes, runningRes, stoppedRes] = await Promise.all([
                getCloudECSList({ limit: 1 }),
                getCloudECSList({ status: 'running', limit: 1 }),
                getCloudECSList({ status: 'stopped', limit: 1 })
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

    // 获取 ECS 列表
    const fetchECSList = async () => {
        setLoading(true);
        try {
            const res = await getCloudECSList({
                account_id: accountFilter,
                provider: providerFilter === 'all' ? undefined : providerFilter,
                status: statusFilter === 'all' ? undefined : statusFilter,
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
    }, []);

    useEffect(() => {
        fetchECSList();
    }, [pagination.current, pagination.pageSize, accountFilter, providerFilter, statusFilter, searchText]);

    // 同步 ECS 资源
    const handleSyncECS = async () => {
        if (!accountFilter) {
            message.warning(t('select_account'));
            return;
        }
        setSyncing(true);
        try {
            const res = await syncCloudECS({ account_id: accountFilter });
            if (res.err) {
                message.error(res.err);
                return;
            }
            message.success(t('sync_triggered'));
            // 延迟刷新列表
            setTimeout(() => {
                fetchECSList();
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

    const columns: ColumnsType<CloudECS> = [
        {
            title: t('instance_name'),
            dataIndex: 'instance_name',
            key: 'instance_name',
            width: 220,
            fixed: 'left',
            render: (text, record) => (
                <Space>
                    <div style={{ 
                        width: 32, height: 32, background: '#e6f7ff', borderRadius: 4, 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#1890ff'
                    }}>
                        <DesktopOutlined />
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
            title: t('status'),
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: string) => {
                let icon = <InfoCircleOutlined />;
                if (status === 'running') icon = <PlayCircleOutlined />;
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
            title: t('public_ip'),
            dataIndex: 'public_ips',
            key: 'public_ips',
            width: 150,
            render: formatIPs,
        },
        {
            title: t('spec'),
            key: 'spec',
            width: 200,
            render: (_, record) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{record.instance_type}</span>
                    <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                        {record.cpu} vCPU / {record.memory} GiB
                    </span>
                </div>
            ),
        },
        {
            title: t('os'),
            dataIndex: 'os_name',
            key: 'os_name',
            width: 150,
            ellipsis: true,
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
    ];

    return (
        <PageLayout title={<Space><CloudServerOutlined />{t('cloud_ecs')}</Space>}>
            <div className="cloud-ecs-page">
                <div className="stats-card-container">
                    <Row gutter={16}>
                        <Col span={8}>
                            <div className="stats-card">
                                <div className="stats-icon blue">
                                    <CloudServerOutlined />
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
                            <Search
                                placeholder={t('search_ecs_placeholder')}
                                value={searchText}
                                onChange={e => setSearchText(e.target.value)}
                                onSearch={() => fetchECSList()}
                                style={{ width: 250 }}
                                enterButton
                            />
                        </div>
                        <div className="filter-actions">
                            <Space>
                                <Popconfirm
                                    title={t('sync_confirm')}
                                    onConfirm={handleSyncECS}
                                    disabled={!accountFilter}
                                >
                                    <Button 
                                        icon={<SyncOutlined spin={syncing} />} 
                                        loading={syncing}
                                        disabled={!accountFilter}
                                    >
                                        {t('sync_ecs')}
                                    </Button>
                                </Popconfirm>
                                <Button icon={<ReloadOutlined />} onClick={() => { fetchECSList(); fetchStats(); }}>
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
                        scroll={{ x: 1500 }}
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
            </div>
        </PageLayout>
    );
};

export default CloudECSList;
