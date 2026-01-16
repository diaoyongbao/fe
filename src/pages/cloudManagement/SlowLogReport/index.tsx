// n9e-2kai: 慢日志统计报告页面
import React, { useState, useEffect } from 'react';
import { Table, Card, Select, Tag, Space, message, Button, Row, Col, Typography, Tooltip, Modal, Statistic, Tabs, Input } from 'antd';
import {
    ReloadOutlined,
    ThunderboltOutlined,
    FieldTimeOutlined,
    CodeOutlined,
    DatabaseOutlined,
    WarningOutlined,
    CalendarOutlined,
    CopyOutlined,
    CloudServerOutlined,
    FireOutlined,
    SearchOutlined,
    DownloadOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ColumnsType } from 'antd/es/table';
import PageLayout from '@/components/pageLayout';
import {
    getSlowLogReport,
    getSlowLogReportSummary,
    searchSlowLogReport,
    exportSlowLogReportCSV,
    SlowLogReportItem,
    SlowLogReportSummary,
    getCloudRDSList,
} from '@/services/cloudManagement';
import './index.less';

const { Option } = Select;
const { Text, Paragraph } = Typography;

// SQL 类型颜色映射
const SQL_TYPE_COLORS: Record<string, string> = {
    SELECT: 'blue',
    INSERT: 'green',
    UPDATE: 'orange',
    DELETE: 'red',
    CREATE: 'purple',
    ALTER: 'magenta',
    DROP: 'volcano',
};

const SlowLogReportPage: React.FC = () => {
    const { t } = useTranslation('cloudManagement');
    const [loading, setLoading] = useState(false);
    const [reports, setReports] = useState<SlowLogReportItem[]>([]);
    const [total, setTotal] = useState(0);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 50 });

    // 筛选条件
    const [period, setPeriod] = useState<'yesterday' | 'today' | 'week' | 'month'>('yesterday');
    const [instanceId, setInstanceId] = useState<string>('');
    const [database, setDatabase] = useState<string>('');
    const [sqlType, setSqlType] = useState<string>('');
    const [sqlFingerprint, setSqlFingerprint] = useState<string>('');

    // 实例和数据库选项
    const [instances, setInstances] = useState<{ id: string; name: string }[]>([]);
    const [databases, setDatabases] = useState<string[]>([]);

    // 摘要
    const [summary, setSummary] = useState<SlowLogReportSummary | null>(null);

    // 详情弹窗
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState<SlowLogReportItem | null>(null);

    // 获取实例列表
    const fetchInstances = async () => {
        try {
            const res = await getCloudRDSList({ limit: 1000 });
            if (!res.err && res.dat?.list) {
                setInstances(
                    res.dat.list.map((item: any) => ({
                        id: item.instance_id,
                        name: item.instance_name || item.instance_id,
                    }))
                );
            }
        } catch (error) {
            console.error('Failed to fetch instances:', error);
        }
    };

    // 获取报告数据
    const fetchData = async () => {
        setLoading(true);
        try {
            // 如果有指纹搜索，使用 search API
            const apiFunc = sqlFingerprint ? searchSlowLogReport : getSlowLogReport;
            const res = await apiFunc({
                period,
                instance_id: instanceId || undefined,
                database: database || undefined,
                sql_type: sqlType || undefined,
                sql_fingerprint: sqlFingerprint || undefined,
                sort_field: 'execute_count',
                sort_order: 'desc',
                limit: pagination.pageSize,
                offset: (pagination.current - 1) * pagination.pageSize,
            } as any);

            if (res.err) {
                message.error(res.err);
                return;
            }

            setReports(res.dat?.list || []);
            setTotal(res.dat?.total || 0);
        } catch (error) {
            message.error(t('fetch_failed'));
        } finally {
            setLoading(false);
        }
    };

    // 获取摘要
    const fetchSummary = async () => {
        try {
            const res = await getSlowLogReportSummary({
                period,
                instance_id: instanceId || undefined,
                database: database || undefined,
            });
            if (!res.err && res.dat) {
                setSummary(res.dat.summary);
                setDatabases(res.dat.databases || []);
            }
        } catch (error) {
            console.error('Failed to fetch summary:', error);
        }
    };

    // 导出 CSV
    const handleExportCSV = () => {
        const url = exportSlowLogReportCSV({
            period,
            instance_id: instanceId || undefined,
            database: database || undefined,
            sql_type: sqlType || undefined,
            sql_fingerprint: sqlFingerprint || undefined,
        });
        window.open(url, '_blank');
    };

    // 复制到剪贴板
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        message.success(t('copied'));
    };

    // 查看详情
    const handleViewDetail = (item: SlowLogReportItem) => {
        setSelectedItem(item);
        setDetailModalVisible(true);
    };

    useEffect(() => {
        fetchInstances();
    }, []);

    useEffect(() => {
        fetchData();
        fetchSummary();
    }, [period, instanceId, database, sqlType, pagination.current, pagination.pageSize]);

    // 格式化时间
    const formatTime = (seconds: number) => {
        if (seconds === undefined || seconds === null) return '-';
        if (seconds < 0.001) return '< 0.001 s';
        if (seconds < 1) return `${(seconds * 1000).toFixed(2)} ms`;
        return `${seconds.toFixed(3)} s`;
    };

    // 格式化大数字
    const formatNumber = (num: number) => {
        if (num === undefined || num === null) return '0';
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    // 列定义
    const columns: ColumnsType<SlowLogReportItem> = [
        {
            title: t('sql_fingerprint'),
            dataIndex: 'sql_fingerprint',
            key: 'sql_fingerprint',
            width: 350,
            render: (text, record) => (
                <Tooltip title={record.sample_sql || text}>
                    <Paragraph
                        ellipsis={{ rows: 2 }}
                        style={{ marginBottom: 0, fontFamily: 'monospace', fontSize: 12, cursor: 'pointer' }}
                        onClick={() => handleViewDetail(record)}
                    >
                        {text}
                    </Paragraph>
                </Tooltip>
            ),
        },
        {
            title: t('tags'),
            key: 'tags',
            width: 150,
            render: (_, record) => (
                <Space size={4} wrap>
                    {record.is_high_frequency && (
                        <Tooltip title={t('high_frequency_tip')}>
                            <Tag color="volcano" icon={<FireOutlined />}>
                                {t('high_frequency')}
                            </Tag>
                        </Tooltip>
                    )}
                    {record.is_critical_slow && (
                        <Tooltip title={t('critical_slow_tip')}>
                            <Tag color="red" icon={<WarningOutlined />}>
                                {t('critical_slow')}
                            </Tag>
                        </Tooltip>
                    )}
                </Space>
            ),
        },
        {
            title: t('sql_type'),
            dataIndex: 'sql_type',
            key: 'sql_type',
            width: 80,
            render: (type) => <Tag color={SQL_TYPE_COLORS[type] || 'default'}>{type}</Tag>,
        },
        {
            title: t('database'),
            dataIndex: 'database',
            key: 'database',
            width: 120,
            render: (db) => <Tag icon={<DatabaseOutlined />}>{db || '-'}</Tag>,
        },
        {
            title: t('instance'),
            key: 'instance',
            width: 150,
            render: (_, record) => (
                <Tooltip title={record.instance_id}>
                    <Tag icon={<CloudServerOutlined />} color="purple">
                        {record.instance_name || record.instance_id}
                    </Tag>
                </Tooltip>
            ),
        },
        {
            title: t('total_executions'),
            dataIndex: 'total_executions',
            key: 'total_executions',
            width: 100,
            align: 'right',
            sorter: true,
            render: (count) => <Text strong style={{ color: '#1890ff' }}>{formatNumber(count)}</Text>,
        },
        {
            title: t('avg_time'),
            dataIndex: 'avg_time',
            key: 'avg_time',
            width: 110,
            sorter: true,
            render: (time) => (
                <Tag color={time > 1 ? 'error' : time > 0.1 ? 'warning' : 'success'}>
                    {formatTime(time)}
                </Tag>
            ),
        },
        {
            title: `${t('max')}/${t('min')}`,
            key: 'time_range',
            width: 130,
            render: (_, record) => (
                <div style={{ fontSize: 12 }}>
                    <div>{t('max')}: {formatTime(record.max_avg_time)}</div>
                    <div>{t('min')}: {formatTime(record.min_avg_time)}</div>
                </div>
            ),
        },
        {
            title: t('action'),
            key: 'action',
            width: 80,
            fixed: 'right',
            render: (_, record) => (
                <Space>
                    <Tooltip title={t('copy_fingerprint')}>
                        <Button
                            type="link"
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => copyToClipboard(record.sql_fingerprint)}
                        />
                    </Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <PageLayout title={<Space><CalendarOutlined />{t('slowlog_report')}</Space>}>
            <div className="slowlog-report-page">
                {/* 统计卡片 */}
                {summary && (
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                        <Col span={6}>
                            <Card size="small">
                                <Statistic
                                    title={t('unique_queries')}
                                    value={summary.total_unique_queries}
                                    prefix={<CodeOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card size="small">
                                <Statistic
                                    title={t('total_executions')}
                                    value={summary.total_executions}
                                    prefix={<ThunderboltOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card size="small">
                                <Statistic
                                    title={t('avg_execution_time')}
                                    value={formatTime(summary.avg_execution_time)}
                                    prefix={<FieldTimeOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card size="small">
                                <Statistic
                                    title={t('slow_queries_gt_1s')}
                                    value={summary.top_slow_queries}
                                    prefix={<WarningOutlined />}
                                    valueStyle={{ color: '#f5222d' }}
                                />
                            </Card>
                        </Col>
                    </Row>
                )}

                {/* 筛选区 */}
                <Card size="small" style={{ marginBottom: 16 }}>
                    <Space wrap>
                        <span>{t('period')}:</span>
                        <Select value={period} onChange={setPeriod} style={{ width: 120 }}>
                            <Option value="yesterday">{t('yesterday')}</Option>
                            <Option value="today">{t('today')}</Option>
                            <Option value="week">{t('this_week')}</Option>
                            <Option value="month">{t('this_month')}</Option>
                        </Select>

                        <span>{t('instance')}:</span>
                        <Select
                            value={instanceId}
                            onChange={setInstanceId}
                            style={{ width: 180 }}
                            allowClear
                            showSearch
                            optionFilterProp="children"
                            placeholder={t('all_instances')}
                        >
                            {instances.map((inst) => (
                                <Option key={inst.id} value={inst.id}>
                                    {inst.name}
                                </Option>
                            ))}
                        </Select>

                        <span>{t('database')}:</span>
                        <Select
                            value={database}
                            onChange={setDatabase}
                            style={{ width: 150 }}
                            allowClear
                            showSearch
                            placeholder={t('all_databases')}
                        >
                            {databases.map((db) => (
                                <Option key={db} value={db}>
                                    {db}
                                </Option>
                            ))}
                        </Select>

                        <span>{t('sql_type')}:</span>
                        <Select
                            value={sqlType}
                            onChange={setSqlType}
                            style={{ width: 100 }}
                            allowClear
                            placeholder="ALL"
                        >
                            {Object.keys(SQL_TYPE_COLORS).map((type) => (
                                <Option key={type} value={type}>
                                    {type}
                                </Option>
                            ))}
                        </Select>

                        <Input
                            placeholder={t('sql_fingerprint_search_placeholder')}
                            value={sqlFingerprint}
                            onChange={(e) => setSqlFingerprint(e.target.value)}
                            style={{ width: 250 }}
                            allowClear
                            prefix={<SearchOutlined />}
                            onPressEnter={fetchData}
                        />

                        <Button icon={<ReloadOutlined />} onClick={fetchData}>
                            {t('refresh')}
                        </Button>
                        <Button icon={<DownloadOutlined />} onClick={handleExportCSV}>
                            {t('download_csv')}
                        </Button>
                    </Space>
                </Card>

                {/* 数据表格 */}
                <Card bodyStyle={{ padding: 0 }}>
                    <Table
                        rowKey="sql_hash"
                        columns={columns}
                        dataSource={reports}
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
                        scroll={{ x: 1400 }}
                    />
                </Card>

                {/* SQL 详情弹窗 */}
                <Modal
                    title={<Space><CodeOutlined />{t('sql_detail')}</Space>}
                    visible={detailModalVisible}
                    onCancel={() => setDetailModalVisible(false)}
                    footer={[
                        <Button key="copy-sample" icon={<CopyOutlined />} onClick={() => selectedItem && copyToClipboard(selectedItem.sample_sql)}>
                            {t('copy_sample')}
                        </Button>,
                        <Button key="copy-fingerprint" onClick={() => selectedItem && copyToClipboard(selectedItem.sql_fingerprint)}>
                            {t('copy_fingerprint')}
                        </Button>,
                        <Button key="close" type="primary" onClick={() => setDetailModalVisible(false)}>
                            {t('close')}
                        </Button>,
                    ]}
                    width={800}
                >
                    {selectedItem && (
                        <div>
                            <Row gutter={16} style={{ marginBottom: 16 }}>
                                <Col span={8}>
                                    <Text type="secondary">{t('sql_type')}:</Text>
                                    <div><Tag color={SQL_TYPE_COLORS[selectedItem.sql_type]}>{selectedItem.sql_type}</Tag></div>
                                </Col>
                                <Col span={8}>
                                    <Text type="secondary">{t('database')}:</Text>
                                    <div><Tag>{selectedItem.database}</Tag></div>
                                </Col>
                                <Col span={8}>
                                    <Text type="secondary">{t('instance')}:</Text>
                                    <div><Tag color="purple">{selectedItem.instance_name}</Tag></div>
                                </Col>
                            </Row>
                            <Row gutter={16} style={{ marginBottom: 16 }}>
                                <Col span={6}>
                                    <Text type="secondary">{t('total_executions')}:</Text>
                                    <div><Text strong>{formatNumber(selectedItem.total_executions)}</Text></div>
                                </Col>
                                <Col span={6}>
                                    <Text type="secondary">{t('avg_time')}:</Text>
                                    <div><Text strong>{formatTime(selectedItem.avg_time)}</Text></div>
                                </Col>
                                <Col span={6}>
                                    <Text type="secondary">{t('max_time')}:</Text>
                                    <div><Text strong>{formatTime(selectedItem.max_avg_time)}</Text></div>
                                </Col>
                                <Col span={6}>
                                    <Text type="secondary">{t('min_time')}:</Text>
                                    <div><Text strong>{formatTime(selectedItem.min_avg_time)}</Text></div>
                                </Col>
                            </Row>
                            <div style={{ marginBottom: 16 }}>
                                <Text type="secondary">{t('sql_fingerprint')}:</Text>
                                <pre style={{
                                    background: '#f6f8fa',
                                    border: '1px solid #e1e4e8',
                                    borderRadius: 6,
                                    padding: 12,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    fontFamily: 'monospace',
                                    fontSize: 12,
                                    maxHeight: 150,
                                    overflow: 'auto',
                                }}>
                                    {selectedItem.sql_fingerprint}
                                </pre>
                            </div>
                            <div>
                                <Text type="secondary">{t('sample_sql')}:</Text>
                                <pre style={{
                                    background: '#1e1e1e',
                                    color: '#d4d4d4',
                                    borderRadius: 6,
                                    padding: 12,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    fontFamily: 'monospace',
                                    fontSize: 12,
                                    maxHeight: 200,
                                    overflow: 'auto',
                                }}>
                                    {selectedItem.sample_sql}
                                </pre>
                            </div>
                        </div>
                    )}
                </Modal>
            </div>
        </PageLayout>
    );
};

export default SlowLogReportPage;
