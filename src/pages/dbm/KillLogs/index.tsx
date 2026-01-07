import React, { useState, useEffect } from 'react';
import { Table, Card, Select, Space, message, Button, Tag, Tooltip, DatePicker } from 'antd';
import { ReloadOutlined, HistoryOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ColumnsType } from 'antd/es/table';
import moment from 'moment';
import {
    getArcheryInstances,
    getSentinelRules,
    getSentinelKillLogs,
    SentinelRule,
    SentinelKillLog
} from '@/services/dbm';
import { useDBMContext } from '../context';
import PageLayout from '@/components/pageLayout';
import './index.less';

const { Option } = Select;
const { RangePicker } = DatePicker;

const KillLogs: React.FC = () => {
    const { t } = useTranslation('dbm');
    const { state, setInstances, setKillLogsState } = useDBMContext();
    const { instances, killLogs } = state;
    
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<SentinelKillLog[]>([]);
    const [total, setTotal] = useState(0);
    const [rules, setRules] = useState<SentinelRule[]>([]);
    // 使用 Context 中的筛选条件
    const [selectedInstance, setSelectedInstance] = useState<number | undefined>(
        killLogs.selectedInstanceId ?? undefined
    );
    const [selectedRule, setSelectedRule] = useState<number | undefined>(
        killLogs.selectedRuleId ?? undefined
    );
    const [dateRange, setDateRange] = useState<[moment.Moment, moment.Moment] | null>(null);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

    // 同步筛选条件到 Context
    useEffect(() => {
        setKillLogsState({
            selectedInstanceId: selectedInstance ?? null,
            selectedRuleId: selectedRule ?? null,
        });
    }, [selectedInstance, selectedRule]);

    // 获取实例列表（使用共享 Context）
    const fetchInstances = async () => {
        // 如果 Context 中已有实例列表，不重复请求
        if (instances.length > 0) return;
        
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
        try {
            const res = await getSentinelRules({});
            if (!res.err) {
                setRules(res.dat?.list || []);
            }
        } catch (error) {
            console.error('Failed to fetch rules:', error);
        }
    };

    // 获取日志列表
    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params: any = {
                limit: pagination.pageSize,
                p: pagination.current,
            };

            if (selectedInstance) {
                params.instance_id = selectedInstance;
            }
            if (selectedRule) {
                params.rule_id = selectedRule;
            }
            if (dateRange && dateRange[0] && dateRange[1]) {
                params.start_time = dateRange[0].unix();
                params.end_time = dateRange[1].unix();
            }

            const res = await getSentinelKillLogs(params);
            if (res.err) {
                message.error(res.err);
                return;
            }
            setLogs(res.dat?.list || []);
            setTotal(res.dat?.total || 0);
        } catch (error) {
            message.error(t('killlogs.fetch_failed'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInstances();
        fetchRules();
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [pagination, selectedInstance, selectedRule, dateRange]);

    // 格式化时间
    const formatDuration = (seconds: number): string => {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    };

    // 格式化时间戳
    const formatTimestamp = (ts: number): string => {
        return moment(ts * 1000).format('YYYY-MM-DD HH:mm:ss');
    };

    // 获取实例名称
    const getInstanceName = (instanceId: number) => {
        const instance = instances.find(i => i.id === instanceId);
        return instance ? instance.instance_name : `ID: ${instanceId}`;
    };

    // 表格列定义
    const columns: ColumnsType<SentinelKillLog> = [
        {
            title: t('killlogs.time'),
            dataIndex: 'created_at',
            key: 'created_at',
            width: 180,
            render: (ts) => formatTimestamp(ts),
            sorter: (a, b) => a.created_at - b.created_at,
            defaultSortOrder: 'descend',
        },
        {
            title: t('killlogs.rule_name'),
            dataIndex: 'rule_name',
            key: 'rule_name',
            width: 150,
            ellipsis: true,
        },
        {
            title: t('killlogs.instance'),
            dataIndex: 'instance_name',
            key: 'instance_name',
            width: 150,
            render: (name, record) => (
                <Tag color="blue">{name || getInstanceName(record.instance_id)}</Tag>
            ),
        },
        {
            title: t('killlogs.thread_id'),
            dataIndex: 'thread_id',
            key: 'thread_id',
            width: 100,
        },
        {
            title: t('killlogs.user'),
            dataIndex: 'user',
            key: 'user',
            width: 100,
            render: (text) => <Tag color="cyan">{text}</Tag>,
        },
        {
            title: t('killlogs.db'),
            dataIndex: 'db',
            key: 'db',
            width: 100,
            render: (text) => text || '-',
        },
        {
            title: t('killlogs.time_duration'),
            dataIndex: 'time',
            key: 'time',
            width: 100,
            render: (time) => {
                const color = time > 300 ? 'red' : time > 60 ? 'orange' : 'default';
                return <Tag color={color}>{formatDuration(time)}</Tag>;
            },
        },
        {
            title: t('killlogs.sql_text'),
            dataIndex: 'sql_text',
            key: 'sql_text',
            width: 300,
            ellipsis: { showTitle: false },
            render: (sql) => (
                <Tooltip placement="topLeft" title={sql}>
                    {sql || '-'}
                </Tooltip>
            ),
        },
        {
            title: t('killlogs.kill_reason'),
            dataIndex: 'kill_reason',
            key: 'kill_reason',
            width: 150,
            ellipsis: { showTitle: false },
            render: (reason) => (
                <Tooltip placement="topLeft" title={reason}>
                    {reason || '-'}
                </Tooltip>
            ),
        },
        {
            title: t('killlogs.kill_result'),
            dataIndex: 'kill_result',
            key: 'kill_result',
            width: 100,
            render: (result, record) => {
                if (result === 'success') {
                    return <Tag color="green">{t('killlogs.success')}</Tag>;
                } else if (result === 'failed') {
                    return (
                        <Tooltip title={record.error_msg}>
                            <Tag color="red">{t('killlogs.failed')}</Tag>
                        </Tooltip>
                    );
                }
                return <Tag>{result}</Tag>;
            },
        },
        {
            title: t('killlogs.notify_status'),
            dataIndex: 'notify_status',
            key: 'notify_status',
            width: 100,
            render: (status) => {
                const statusMap: Record<string, { color: string; label: string }> = {
                    'sent': { color: 'green', label: t('killlogs.notify_sent') },
                    'failed': { color: 'red', label: t('killlogs.notify_failed') },
                    'pending': { color: 'orange', label: t('killlogs.notify_pending') },
                };
                const info = statusMap[status] || { color: 'default', label: status };
                return <Tag color={info.color}>{info.label}</Tag>;
            },
        },
    ];

    return (
        <PageLayout title={
            <Space>
                <HistoryOutlined style={{ color: '#722ed1' }} />
                {t('killlogs.title')}
            </Space>
        }>
            <div className="dbm-killlogs">
                <Card
                    extra={
                        <Space>
                            <RangePicker
                                showTime
                                value={dateRange}
                                onChange={(dates) => setDateRange(dates as [moment.Moment, moment.Moment] | null)}
                                style={{ width: 380 }}
                            />
                            <Select
                                style={{ width: 180 }}
                                value={selectedInstance}
                                onChange={setSelectedInstance}
                                placeholder={t('killlogs.filter_instance')}
                                allowClear
                            >
                                {instances.map((instance) => (
                                    <Option key={instance.id} value={instance.id}>
                                        {instance.instance_name}
                                    </Option>
                                ))}
                            </Select>
                            <Select
                                style={{ width: 180 }}
                                value={selectedRule}
                                onChange={setSelectedRule}
                                placeholder={t('killlogs.filter_rule')}
                                allowClear
                            >
                                {rules.map((rule) => (
                                    <Option key={rule.id} value={rule.id}>
                                        {rule.name}
                                    </Option>
                                ))}
                            </Select>
                            <Button icon={<ReloadOutlined />} onClick={fetchLogs}>
                                {t('refresh')}
                            </Button>
                        </Space>
                    }
                >
                    <Table
                        columns={columns}
                        dataSource={logs}
                        loading={loading}
                        rowKey="id"
                        pagination={{
                            total,
                            current: pagination.current,
                            pageSize: pagination.pageSize,
                            showSizeChanger: true,
                            showQuickJumper: true,
                            showTotal: (total) => t('total_items', { count: total }),
                            onChange: (page, pageSize) => setPagination({ current: page, pageSize: pageSize || 20 }),
                        }}
                        scroll={{ x: 1700 }}
                    />
                </Card>
            </div>
        </PageLayout>
    );
};

export default KillLogs;
