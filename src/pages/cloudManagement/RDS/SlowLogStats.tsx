// n9e-2kai: RDS 慢日志统计组件
import React, { useState, useEffect } from 'react';
import { Table, Card, Select, Tag, Space, message, Button, DatePicker, Row, Col, Tooltip, Statistic, Typography, Input, Modal, Descriptions, Badge } from 'antd';
import { ReloadOutlined, SearchOutlined, FieldTimeOutlined, DatabaseOutlined, CodeOutlined, ThunderboltOutlined, SyncOutlined, EyeOutlined, DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ColumnsType } from 'antd/es/table';
import moment from 'moment';
import {
    syncCloudRDSSlowLogs,
    getSlowLogReport,
    getSlowLogReportSummary,
    SlowLogReportItem,
    searchSlowLogReport,
    exportSlowLogReportCSV,
} from '@/services/cloudManagement';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Paragraph } = Typography;

interface SlowLogStatsProps {
    rdsId: number;
    instanceId: string;
    instanceName: string;
}

// SQL 类型颜色映射
const SQL_TYPE_COLORS: Record<string, string> = {
    SELECT: 'blue',
    INSERT: 'green',
    UPDATE: 'orange',
    DELETE: 'red',
    CREATE: 'purple',
};

const SlowLogStats: React.FC<SlowLogStatsProps> = ({ rdsId, instanceId, instanceName }) => {
    const { t } = useTranslation('cloudManagement');
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [data, setData] = useState<SlowLogReportItem[]>([]);
    const [total, setTotal] = useState(0);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

    // 详情弹窗状态
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [currentRecord, setCurrentRecord] = useState<SlowLogReportItem | null>(null);

    // 过滤条件 - 默认设置为昨天 00:00:00 到 今天 00:00:00，确保能查询到按天聚合的数据
    const [timeRange, setTimeRange] = useState<[moment.Moment, moment.Moment]>([
        moment().subtract(1, 'days').startOf('day'),
        moment().startOf('day'),
    ]);
    const [database, setDatabase] = useState<string>('');
    const [sqlType, setSqlType] = useState<string>('all');

    const [sqlFingerprint, setSqlFingerprint] = useState<string>('');

    // 统计数据
    const [stats, setStats] = useState({
        totalQueries: 0,
        totalExecutions: 0,
        avgTime: 0,
    });

    // 获取数据（列表 + 统计）
    const fetchData = async () => {
        if (!timeRange[0] || !timeRange[1]) {
            message.warning(t('please_select_time_range'));
            return;
        }

        setLoading(true);
        try {
            // n9e-2kai: 如果有 SQL 指纹搜索，使用 search API
            const listPromise = sqlFingerprint
                ? searchSlowLogReport({
                    instance_id: instanceId,
                    start_time: timeRange[0].toISOString(),
                    end_time: timeRange[1].toISOString(),
                    database: database || undefined,
                    sql_type: sqlType === 'all' ? undefined : sqlType,
                    sql_fingerprint: sqlFingerprint,
                    limit: pagination.pageSize,
                    offset: (pagination.current - 1) * pagination.pageSize,
                    sort_field: 'total_executions',
                    sort_order: 'desc',
                })
                : getSlowLogReport({
                    instance_id: instanceId,
                    start_time: timeRange[0].toISOString(),
                    end_time: timeRange[1].toISOString(),
                    database: database || undefined,
                    sql_type: sqlType === 'all' ? undefined : sqlType,
                    limit: pagination.pageSize,
                    offset: (pagination.current - 1) * pagination.pageSize,
                    sort_field: 'total_executions',
                    sort_order: 'desc',
                });

            // 并行请求列表和统计摘要
            const [listRes, statRes] = await Promise.all([
                listPromise,
                getSlowLogReportSummary({
                    instance_id: instanceId,
                    start_time: timeRange[0].toISOString(),
                    end_time: timeRange[1].toISOString(),
                    database: database || undefined,
                })
            ]);

            if (listRes.err) {
                message.error(listRes.err);
            } else {
                setData(listRes.dat?.list || []);
                setTotal(listRes.dat?.total || 0);
            }

            if (statRes.err) {
                console.error("Failed to fetch stats summary:", statRes.err);
            } else {
                const summary = statRes.dat?.summary;
                if (summary) {
                    setStats({
                        totalQueries: summary.total_unique_queries,
                        totalExecutions: summary.total_executions,
                        avgTime: summary.avg_execution_time,
                    });
                }
            }
        } catch (error) {
            message.error(t('fetch_failed'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [pagination.current, pagination.pageSize]);

    // n9e-2kai: 手动同步慢日志（并聚合）
    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await syncCloudRDSSlowLogs(rdsId, {
                start_time: timeRange[0].toISOString(),
                end_time: timeRange[1].toISOString(),
            });
            if (res.err) {
                message.error(res.err);
                return;
            }
            message.success(t('sync_started'));
            // 等待 3 秒后刷新数据，给后端聚合一些时间
            setTimeout(() => {
                fetchData();
            }, 3000);
        } catch (error) {
            message.error(t('sync_failed'));
        } finally {
            setSyncing(false);
        }
    };



    // n9e-2kai: 下载 CSV
    const handleDownloadCSV = () => {
        const url = exportSlowLogReportCSV({
            instance_id: instanceId,
            start_time: timeRange[0].toISOString(),
            end_time: timeRange[1].toISOString(),
            database: database || undefined,
            sql_type: sqlType === 'all' ? undefined : sqlType,
            sql_fingerprint: sqlFingerprint || undefined,
        });
        window.open(url, '_blank');
    };

    // 显示详情
    const showDetail = (record: SlowLogReportItem) => {
        setCurrentRecord(record);
        setDetailModalVisible(true);
    };

    // 格式化执行时间
    const formatTime = (seconds: number) => {
        if (seconds < 0.001) return '< 0.001 s';
        if (seconds < 1) return `${(seconds * 1000).toFixed(2)} ms`;
        return `${seconds.toFixed(3)} s`;
    };

    // 格式化大数字
    const formatNumber = (num: number) => {
        if (!num) return '0';
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    const columns: ColumnsType<SlowLogReportItem> = [
        {
            title: t('sql_text'), // 显示 "SQL 文本"
            dataIndex: 'sample_sql',
            key: 'sample_sql',
            width: 400,
            render: (text: string, record) => (
                <div style={{ cursor: 'pointer' }} onClick={() => showDetail(record)}>
                    <Tooltip title={t('click_to_view_detail')}>
                        <Paragraph
                            ellipsis={{ rows: 2 }}
                            style={{ marginBottom: 0, fontFamily: 'monospace', fontSize: 12, color: '#1890ff' }}
                        >
                            {text || record.sql_fingerprint || '-'}
                        </Paragraph>
                    </Tooltip>
                </div>
            ),
        },
        {
            title: t('sql_type'),
            dataIndex: 'sql_type',
            key: 'sql_type',
            width: 100,
            render: (type: string) => (
                <Tag color={SQL_TYPE_COLORS[type] || 'default'}>{type}</Tag>
            ),
        },
        {
            title: t('total_executions'),
            dataIndex: 'total_executions',
            key: 'total_executions',
            width: 120,
            sorter: true, // 后端已支持排序
            render: (val: number) => <span style={{ fontWeight: 600 }}>{formatNumber(val)}</span>,
        },
        {
            title: t('avg_time'),
            dataIndex: 'avg_time',
            key: 'avg_time',
            width: 120,
            sorter: true,
            render: (time: number) => (
                <Tag color={time > 1 ? 'error' : time > 0.1 ? 'warning' : 'success'}>
                    {formatTime(time)}
                </Tag>
            ),
        },
        {
            title: t('max_time'), // 需要确认翻译key，如果没有会显示 literal key
            dataIndex: 'max_avg_time',
            key: 'max_avg_time',
            width: 120,
            render: (time: number) => formatTime(time),
        },
        // 计算平均返回行数
        {
            title: t('avg_rows_sent'),
            key: 'avg_rows_sent',
            width: 120,
            render: (_, record) => formatNumber(Math.round((record.total_rows_sent || 0) / (record.total_executions || 1))),
        },
        {
            title: t('database'),
            dataIndex: 'database',
            key: 'database',
            width: 150,
            render: (db: string) => (
                <Tag icon={<DatabaseOutlined />}>{db || '-'}</Tag>
            ),
        },
        {
            title: t('action'),
            key: 'action',
            width: 80,
            fixed: 'right',
            render: (_, record) => (
                <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => showDetail(record)}>
                    {t('detail')}
                </Button>
            ),
        }
    ];

    return (
        <div className="slow-log-stats">
            {/* 统计卡片 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                    <Card size="small">
                        <Statistic
                            title={t('total_slow_queries')} // 实际上是唯一 SQL 数
                            value={stats.totalQueries}
                            prefix={<CodeOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card size="small">
                        <Statistic
                            title={t('total_executions')}
                            value={stats.totalExecutions}
                            prefix={<ThunderboltOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card size="small">
                        <Statistic
                            title={t('avg_execution_time')}
                            value={stats.avgTime.toFixed(3)}
                            suffix="s"
                            prefix={<FieldTimeOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* 筛选区域 */}
            <Card size="small" style={{ marginBottom: 16 }}>
                <Space wrap>
                    <span>{t('time_range')}:</span>
                    <RangePicker
                        showTime
                        value={timeRange}
                        onChange={(dates) => {
                            if (dates && dates[0] && dates[1]) {
                                setTimeRange([dates[0], dates[1]]);
                            }
                        }}
                        disabledDate={(current) => current && current > moment()}
                        style={{ width: 380 }}
                    />
                    <span>{t('database')}:</span>
                    <Input
                        placeholder={t('database_placeholder')}
                        value={database}
                        onChange={(e) => setDatabase(e.target.value)}
                        style={{ width: 150 }}
                        allowClear
                    />
                    <span>{t('sql_type')}:</span>
                    <Select
                        value={sqlType}
                        onChange={setSqlType}
                        style={{ width: 120 }}
                    >
                        <Option value="all">{t('all_types')}</Option>
                        <Option value="SELECT">SELECT</Option>
                        <Option value="INSERT">INSERT</Option>
                        <Option value="UPDATE">UPDATE</Option>
                        <Option value="DELETE">DELETE</Option>
                        <Option value="CREATE">CREATE</Option>
                    </Select>
                </Space>
                {/* n9e-2kai: SQL 指纹搜索 */}
                <div style={{ marginTop: 12 }}>
                    <Space wrap>
                        <span>{t('sql_fingerprint_search')}:</span>
                        <Input
                            placeholder={t('sql_fingerprint_search_placeholder')}
                            value={sqlFingerprint}
                            onChange={(e) => setSqlFingerprint(e.target.value)}
                            style={{ width: 350 }}
                            allowClear
                        />
                        <Button
                            type="primary"
                            icon={<SearchOutlined />}
                            onClick={() => {
                                setPagination({ ...pagination, current: 1 });
                                fetchData();
                            }}
                        >
                            {t('search')}
                        </Button>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={fetchData}
                        >
                            {t('refresh')}
                        </Button>
                        <Button
                            type="primary"
                            icon={<SyncOutlined spin={syncing} />}
                            onClick={handleSync}
                            loading={syncing}
                            ghost
                        >
                            {t('sync_slowlogs')}
                        </Button>

                        <Button
                            icon={<DownloadOutlined />}
                            onClick={handleDownloadCSV}
                        >
                            {t('download_csv')}
                        </Button>
                    </Space>
                </div>
            </Card>

            {/* 数据表格 */}
            <Card bodyStyle={{ padding: 0 }}>
                <Table
                    rowKey={(record) => record.sql_hash}
                    columns={columns}
                    dataSource={data}
                    loading={loading}
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.pageSize,
                        total,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => t('total_items', { total }),
                        onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
                    }}
                    scroll={{ x: 1300 }}
                    size="middle"
                />
            </Card>

            {/* 详情弹窗 */}
            <Modal
                title={t('slow_log_detail') || "Slow Log Detail"}
                visible={detailModalVisible}
                onCancel={() => setDetailModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setDetailModalVisible(false)}>
                        {t('close')}
                    </Button>
                ]}
                width={900}
                destroyOnClose
            >
                {currentRecord && (
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        {/* 状态标记 */}
                        <Space>
                            {currentRecord.is_critical_slow && <Badge count="Critical Slow" style={{ backgroundColor: '#f5222d' }} />}
                            {currentRecord.is_high_frequency && <Badge count="High Frequency" style={{ backgroundColor: '#faad14' }} />}
                            {currentRecord.is_slow_growing && <Badge count="Slow Growing" style={{ backgroundColor: '#fa8c16' }} />}
                        </Space>

                        <Descriptions bordered column={2} size="small">
                            <Descriptions.Item label={t('database')}>{currentRecord.database}</Descriptions.Item>
                            <Descriptions.Item label={t('sql_type')}><Tag color={SQL_TYPE_COLORS[currentRecord.sql_type]}>{currentRecord.sql_type}</Tag></Descriptions.Item>
                            <Descriptions.Item label={t('total_executions')}>{formatNumber(currentRecord.total_executions)}</Descriptions.Item>
                            <Descriptions.Item label={t('avg_time')}>{formatTime(currentRecord.avg_time)}</Descriptions.Item>
                            <Descriptions.Item label={t('max_time')}>{formatTime(currentRecord.max_avg_time)}</Descriptions.Item>
                            <Descriptions.Item label={t('min_time')}>{formatTime(currentRecord.min_avg_time)}</Descriptions.Item>
                            <Descriptions.Item label="First Seen">{currentRecord.first_seen ? moment(currentRecord.first_seen).format('YYYY-MM-DD HH:mm:ss') : '-'}</Descriptions.Item>
                            <Descriptions.Item label="Instance Count">{currentRecord.instance_count}</Descriptions.Item>
                        </Descriptions>

                        <Card size="small" title={t('sql_fingerprint') || "SQL Fingerprint"} type="inner">
                            <Paragraph copyable>
                                <pre style={{
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                    maxHeight: 200,
                                    overflowY: 'auto',
                                    backgroundColor: '#f5f5f5',
                                    padding: 8,
                                    borderRadius: 4,
                                    margin: 0
                                }}>
                                    {currentRecord.sql_fingerprint}
                                </pre>
                            </Paragraph>
                        </Card>

                        <Card size="small" title={t('sample_sql') || "Sample SQL"} type="inner">
                            <Paragraph copyable>
                                <pre style={{
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                    maxHeight: 300,
                                    overflowY: 'auto',
                                    backgroundColor: '#f5f5f5',
                                    padding: 8,
                                    borderRadius: 4,
                                    margin: 0
                                }}>
                                    {currentRecord.sample_sql || currentRecord.sql_fingerprint || t('no_sample_sql')}
                                </pre>
                            </Paragraph>
                        </Card>
                    </Space>
                )}
            </Modal>
        </div>
    );
};

export default SlowLogStats;
