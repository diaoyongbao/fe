// n9e-2kai: 同步日志列表页面 - 日志流展示风格
import React, { useState, useEffect } from 'react';
import { Card, Input, Select, Tag, Space, message, Button, Row, Col, DatePicker, Tooltip, Empty, Spin, Badge } from 'antd';
import { 
    ReloadOutlined, 
    HistoryOutlined, 
    CheckCircleOutlined, 
    CloseCircleOutlined, 
    SyncOutlined,
    CloudServerOutlined,
    DatabaseOutlined,
    ClockCircleOutlined,
    UserOutlined,
    ExclamationCircleOutlined,
    InfoCircleOutlined,
    FilterOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/pageLayout';
import { getCloudSyncLogs, getCloudAccounts, CloudSyncLog, CloudAccount } from '@/services/cloudManagement';
import './index.less';

const { Option } = Select;
const { RangePicker } = DatePicker;

// 云厂商颜色映射
const PROVIDER_COLORS: Record<string, string> = {
    huawei: '#c7254e',
    aliyun: '#ff6a00',
    tencent: '#006eff',
    volcengine: '#ff4d00',
};

// 资源类型图标映射
const RESOURCE_TYPE_ICONS: Record<string, React.ReactNode> = {
    ecs: <CloudServerOutlined />,
    rds: <DatabaseOutlined />,
    rds_slowlog: <DatabaseOutlined />,
};

// 同步类型标签
const SYNC_TYPE_LABELS: Record<string, { label: string; color: string }> = {
    manual: { label: 'manual_sync', color: 'blue' },
    auto: { label: 'auto_sync', color: 'green' },
};

const CloudSyncLogList: React.FC = () => {
    const { t } = useTranslation('cloudManagement');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<CloudSyncLog[]>([]);
    const [total, setTotal] = useState(0);
    const [accountFilter, setAccountFilter] = useState<number | undefined>(undefined);
    const [providerFilter, setProviderFilter] = useState<string>('all');
    const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
    const [syncTypeFilter, setSyncTypeFilter] = useState<string>('all');
    const [timeRange, setTimeRange] = useState<[number, number] | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(50);
    const [hasMore, setHasMore] = useState(true);

    // 统计数据
    const [stats, setStats] = useState({
        total: 0,
        success: 0,
        failed: 0,
        running: 0
    });

    // 账号列表
    const [accounts, setAccounts] = useState<CloudAccount[]>([]);
    
    // 展开过滤器
    const [showFilters, setShowFilters] = useState(false);

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
            const [totalRes, successRes, failedRes, runningRes] = await Promise.all([
                getCloudSyncLogs({ limit: 1 }),
                getCloudSyncLogs({ status: 1, limit: 1 }),
                getCloudSyncLogs({ status: 2, limit: 1 }),
                getCloudSyncLogs({ status: 0, limit: 1 })
            ]);

            setStats({
                total: !totalRes.err ? totalRes.dat?.total || 0 : 0,
                success: !successRes.err ? successRes.dat?.total || 0 : 0,
                failed: !failedRes.err ? failedRes.dat?.total || 0 : 0,
                running: !runningRes.err ? runningRes.dat?.total || 0 : 0,
            });
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    // 获取同步日志列表
    const fetchSyncLogs = async (reset: boolean = false) => {
        setLoading(true);
        try {
            const currentPage = reset ? 1 : page;
            const res = await getCloudSyncLogs({
                account_id: accountFilter,
                provider: providerFilter === 'all' ? undefined : providerFilter,
                resource_type: resourceTypeFilter === 'all' ? undefined : resourceTypeFilter,
                status: statusFilter,
                sync_type: syncTypeFilter === 'all' ? undefined : syncTypeFilter,
                start_time: timeRange?.[0],
                end_time: timeRange?.[1],
                limit: pageSize,
                offset: (currentPage - 1) * pageSize,
            });
            if (res.err) {
                message.error(res.err);
                return;
            }
            const newData = res.dat?.list || [];
            if (reset) {
                setData(newData);
                setPage(1);
            } else {
                setData(prev => [...prev, ...newData]);
            }
            setTotal(res.dat?.total || 0);
            setHasMore(newData.length === pageSize);
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
        fetchSyncLogs(true);
    }, [accountFilter, providerFilter, resourceTypeFilter, statusFilter, syncTypeFilter, timeRange]);

    // 加载更多
    const loadMore = () => {
        if (!loading && hasMore) {
            setPage(prev => prev + 1);
        }
    };

    useEffect(() => {
        if (page > 1) {
            fetchSyncLogs(false);
        }
    }, [page]);

    // 格式化时间戳
    const formatTime = (timestamp: number) => {
        if (!timestamp) return '-';
        const date = new Date(timestamp * 1000);
        return date.toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // 格式化完整时间
    const formatFullTime = (timestamp: number) => {
        if (!timestamp) return '-';
        return new Date(timestamp * 1000).toLocaleString();
    };

    // 处理时间范围变化
    const handleTimeRangeChange = (dates: any) => {
        if (dates && dates[0] && dates[1]) {
            setTimeRange([
                Math.floor(dates[0].valueOf() / 1000),
                Math.floor(dates[1].valueOf() / 1000),
            ]);
        } else {
            setTimeRange(null);
        }
    };

    // 获取状态信息
    const getStatusInfo = (status: number) => {
        switch (status) {
            case 0:
                return { icon: <SyncOutlined spin />, color: '#1890ff', label: t('syncing'), bgColor: '#e6f7ff' };
            case 1:
                return { icon: <CheckCircleOutlined />, color: '#52c41a', label: t('sync_success'), bgColor: '#f6ffed' };
            case 2:
                return { icon: <CloseCircleOutlined />, color: '#ff4d4f', label: t('sync_failed'), bgColor: '#fff2f0' };
            case 3:
                return { icon: <ExclamationCircleOutlined />, color: '#faad14', label: t('partial_success'), bgColor: '#fffbe6' };
            default:
                return { icon: <InfoCircleOutlined />, color: '#8c8c8c', label: t('unknown'), bgColor: '#fafafa' };
        }
    };

    // 渲染单个日志条目
    const renderLogItem = (log: CloudSyncLog) => {
        const statusInfo = getStatusInfo(log.status);
        const providerColor = PROVIDER_COLORS[log.provider] || '#8c8c8c';
        
        return (
            <div key={log.id} className="sync-log-item" style={{ borderLeftColor: statusInfo.color }}>
                <div className="log-header">
                    <div className="log-time">
                        <ClockCircleOutlined />
                        <Tooltip title={formatFullTime(log.start_time)}>
                            <span>{formatTime(log.start_time)}</span>
                        </Tooltip>
                        {log.duration > 0 && (
                            <Tag className="duration-tag" style={{ 
                                color: log.duration < 5 ? '#52c41a' : log.duration < 30 ? '#faad14' : '#ff4d4f'
                            }}>
                                {log.duration}s
                            </Tag>
                        )}
                    </div>
                    <div className="log-status" style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}>
                        {statusInfo.icon}
                        <span>{statusInfo.label}</span>
                    </div>
                </div>
                
                <div className="log-body">
                    <div className="log-meta">
                        <Tag color={providerColor} className="provider-tag">
                            {log.provider?.toUpperCase()}
                        </Tag>
                        <span className="account-name">
                            <UserOutlined /> {log.account_name}
                        </span>
                        <span className="resource-type">
                            {RESOURCE_TYPE_ICONS[log.resource_types] || <DatabaseOutlined />}
                            <span>{log.resource_types?.toUpperCase()}</span>
                        </span>
                        {log.sync_type && (
                            <Tag color={SYNC_TYPE_LABELS[log.sync_type]?.color || 'default'}>
                                {t(SYNC_TYPE_LABELS[log.sync_type]?.label || log.sync_type)}
                            </Tag>
                        )}
                    </div>
                    
                    <div className="log-stats">
                        {(log.ecs_total > 0 || log.ecs_added > 0 || log.ecs_updated > 0 || log.ecs_deleted > 0) && (
                            <div className="stat-group">
                                <span className="stat-label"><CloudServerOutlined /> ECS:</span>
                                <span className="stat-total">{log.ecs_total}</span>
                                {log.ecs_added > 0 && <Tag color="success">+{log.ecs_added}</Tag>}
                                {log.ecs_updated > 0 && <Tag color="blue">~{log.ecs_updated}</Tag>}
                                {log.ecs_deleted > 0 && <Tag color="error">-{log.ecs_deleted}</Tag>}
                            </div>
                        )}
                        {(log.rds_total > 0 || log.rds_added > 0 || log.rds_updated > 0 || log.rds_deleted > 0) && (
                            <div className="stat-group">
                                <span className="stat-label"><DatabaseOutlined /> RDS:</span>
                                <span className="stat-total">{log.rds_total}</span>
                                {log.rds_added > 0 && <Tag color="success">+{log.rds_added}</Tag>}
                                {log.rds_updated > 0 && <Tag color="blue">~{log.rds_updated}</Tag>}
                                {log.rds_deleted > 0 && <Tag color="error">-{log.rds_deleted}</Tag>}
                            </div>
                        )}
                    </div>

                    {log.error_message && (
                        <div className="log-error">
                            <ExclamationCircleOutlined />
                            <Tooltip title={log.error_message}>
                                <span className="error-text">{log.error_message}</span>
                            </Tooltip>
                        </div>
                    )}

                    {log.operator && (
                        <div className="log-operator">
                            <UserOutlined /> {t('operator')}: {log.operator}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <PageLayout title={<Space><HistoryOutlined />{t('sync_logs')}</Space>}>
            <div className="cloud-sync-logs-page log-stream-view">
                {/* 统计卡片 */}
                <div className="stats-bar">
                    <div className="stat-item">
                        <Badge status="processing" />
                        <span className="stat-label">{t('total_logs')}</span>
                        <span className="stat-value">{stats.total}</span>
                    </div>
                    <div className="stat-item success">
                        <Badge status="success" />
                        <span className="stat-label">{t('sync_success')}</span>
                        <span className="stat-value">{stats.success}</span>
                    </div>
                    <div className="stat-item error">
                        <Badge status="error" />
                        <span className="stat-label">{t('sync_failed')}</span>
                        <span className="stat-value">{stats.failed}</span>
                    </div>
                    {stats.running > 0 && (
                        <div className="stat-item running">
                            <SyncOutlined spin />
                            <span className="stat-label">{t('syncing')}</span>
                            <span className="stat-value">{stats.running}</span>
                        </div>
                    )}
                </div>

                {/* 筛选栏 */}
                <Card className="filter-card" bodyStyle={{ padding: '16px 24px' }}>
                    <div className="filter-bar">
                        <div className="filter-main">
                            <Select
                                value={accountFilter}
                                onChange={setAccountFilter}
                                style={{ width: 160 }}
                                placeholder={t('select_account')}
                                allowClear
                            >
                                {accounts.map(a => (
                                    <Option key={a.id} value={a.id}>{a.name}</Option>
                                ))}
                            </Select>
                            <Select
                                value={statusFilter}
                                onChange={setStatusFilter}
                                style={{ width: 120 }}
                                placeholder={t('all_status')}
                                allowClear
                            >
                                <Option value={0}><SyncOutlined /> {t('syncing')}</Option>
                                <Option value={1}><CheckCircleOutlined /> {t('sync_success')}</Option>
                                <Option value={2}><CloseCircleOutlined /> {t('sync_failed')}</Option>
                                <Option value={3}><ExclamationCircleOutlined /> {t('partial_success')}</Option>
                            </Select>
                            <RangePicker
                                showTime
                                onChange={handleTimeRangeChange}
                                style={{ width: 340 }}
                            />
                        </div>
                        <div className="filter-actions">
                            <Button 
                                icon={<FilterOutlined />} 
                                onClick={() => setShowFilters(!showFilters)}
                                type={showFilters ? 'primary' : 'default'}
                            >
                                {t('more_filters')}
                            </Button>
                            <Button icon={<ReloadOutlined />} onClick={() => { fetchSyncLogs(true); fetchStats(); }}>
                                {t('refresh')}
                            </Button>
                        </div>
                    </div>
                    
                    {showFilters && (
                        <div className="filter-expand">
                            <div className="filter-row">
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
                                    <span className="label">{t('resource_type')}:</span>
                                    <Select
                                        value={resourceTypeFilter}
                                        onChange={setResourceTypeFilter}
                                        style={{ width: 140 }}
                                    >
                                        <Option value="all">{t('all_types')}</Option>
                                        <Option value="ecs">ECS</Option>
                                        <Option value="rds">RDS</Option>
                                        <Option value="rds_slowlog">RDS 慢日志</Option>
                                    </Select>
                                </div>
                                <div className="filter-item">
                                    <span className="label">{t('sync_type')}:</span>
                                    <Select
                                        value={syncTypeFilter}
                                        onChange={setSyncTypeFilter}
                                        style={{ width: 120 }}
                                    >
                                        <Option value="all">{t('all_sync_types')}</Option>
                                        <Option value="manual">{t('manual_sync')}</Option>
                                        <Option value="auto">{t('auto_sync')}</Option>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>

                {/* 日志流 */}
                <div className="log-stream-container">
                    {data.length === 0 && !loading ? (
                        <Empty description={t('no_sync_logs')} />
                    ) : (
                        <>
                            <div className="log-stream">
                                {data.map(renderLogItem)}
                            </div>
                            {loading && (
                                <div className="loading-more">
                                    <Spin />
                                </div>
                            )}
                            {hasMore && !loading && data.length > 0 && (
                                <div className="load-more">
                                    <Button onClick={loadMore}>{t('load_more')}</Button>
                                </div>
                            )}
                            {!hasMore && data.length > 0 && (
                                <div className="no-more">
                                    {t('no_more_logs')}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </PageLayout>
    );
};

export default CloudSyncLogList;
