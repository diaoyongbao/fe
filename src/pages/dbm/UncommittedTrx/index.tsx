import React, { useState, useEffect } from 'react';
import { Table, Card, Select, Space, message, Button, Modal, Tag, Tooltip } from 'antd';
import { ReloadOutlined, DeleteOutlined, ExclamationCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ColumnsType } from 'antd/es/table';
import {
    getUncommittedTransactions,
    killSessions,
    ArcheryUncommittedTrx
} from '@/services/dbm';
import PageLayout from '@/components/pageLayout';
import { useSharedInstance } from '../useSharedInstance';
import './index.less';

const { Option } = Select;

const UncommittedTrx: React.FC = () => {
    const { t } = useTranslation('dbm');
    const { selectedInstance, instances, handleInstanceChange } = useSharedInstance();
    
    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState<ArcheryUncommittedTrx[]>([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

    // 获取未提交事务列表
    const fetchTransactions = async () => {
        if (!selectedInstance) {
            return;
        }
        setLoading(true);
        try {
            const res = await getUncommittedTransactions({ instance_id: selectedInstance });
            if (res.err) {
                message.error(res.err);
                return;
            }
            setTransactions(res.dat || []);
        } catch (error) {
            message.error(t('uncommitted.fetch_failed'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedInstance) {
            fetchTransactions();
        }
    }, [selectedInstance]);

    // 批量 Kill 事务
    const handleKillTransactions = () => {
        if (selectedRowKeys.length === 0) {
            message.warning(t('uncommitted.select_first'));
            return;
        }

        Modal.confirm({
            title: t('uncommitted.confirm_kill_title'),
            icon: <ExclamationCircleOutlined />,
            content: t('uncommitted.confirm_kill_content', { count: selectedRowKeys.length }),
            okText: t('sessions.confirm'),
            cancelText: t('sessions.cancel'),
            okType: 'danger',
            onOk: async () => {
                if (!selectedInstance) return;

                try {
                    const threadIds = selectedRowKeys.map((key) => Number(key));
                    const res = await killSessions({
                        instance_id: selectedInstance,
                        thread_ids: threadIds,
                    });

                    if (res.err) {
                        message.error(res.err);
                        return;
                    }

                    message.success(t('uncommitted.kill_success', { count: threadIds.length }));
                    setSelectedRowKeys([]);
                    fetchTransactions();
                } catch (error) {
                    message.error(t('uncommitted.kill_failed'));
                }
            },
        });
    };

    // 格式化时间（秒转为可读格式）
    const formatDuration = (seconds: number): string => {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    };

    // 计算事务运行时间（从 trx_started 到现在）
    const calculateRuntime = (trxStarted: string): number => {
        if (!trxStarted) return 0;
        const started = new Date(trxStarted).getTime();
        const now = Date.now();
        return Math.floor((now - started) / 1000);
    };

    // 表格列定义
    const columns: ColumnsType<ArcheryUncommittedTrx> = [
        {
            title: t('uncommitted.thread_id'),
            dataIndex: 'trx_mysql_thread_id',
            key: 'trx_mysql_thread_id',
            width: 100,
            fixed: 'left',
        },
        {
            title: t('uncommitted.trx_id'),
            dataIndex: 'trx_id',
            key: 'trx_id',
            width: 150,
            render: (text) => <Tag color="purple">{text}</Tag>,
        },
        {
            title: t('uncommitted.trx_state'),
            dataIndex: 'trx_state',
            key: 'trx_state',
            width: 120,
            render: (text) => {
                const colorMap: Record<string, string> = {
                    'RUNNING': 'green',
                    'LOCK WAIT': 'orange',
                    'ROLLING BACK': 'red',
                    'COMMITTING': 'blue',
                };
                return <Tag color={colorMap[text] || 'default'}>{text}</Tag>;
            },
        },
        {
            title: t('uncommitted.trx_started'),
            dataIndex: 'trx_started',
            key: 'trx_started',
            width: 180,
        },
        {
            title: t('uncommitted.runtime'),
            key: 'runtime',
            width: 120,
            render: (_, record) => {
                const runtime = calculateRuntime(record.trx_started);
                const color = runtime > 300 ? 'red' : runtime > 60 ? 'orange' : 'default';
                return <Tag color={color}>{formatDuration(runtime)}</Tag>;
            },
            sorter: (a, b) => calculateRuntime(a.trx_started) - calculateRuntime(b.trx_started),
            defaultSortOrder: 'descend',
        },
        {
            title: t('uncommitted.trx_weight'),
            dataIndex: 'trx_weight',
            key: 'trx_weight',
            width: 80,
            sorter: (a, b) => a.trx_weight - b.trx_weight,
        },
        {
            title: t('uncommitted.trx_query'),
            dataIndex: 'trx_query',
            key: 'trx_query',
            width: 400,
            ellipsis: {
                showTitle: false,
            },
            render: (query) => (
                <Tooltip placement="topLeft" title={query}>
                    {query || '-'}
                </Tooltip>
            ),
        },
        {
            title: t('uncommitted.trx_lock_id'),
            dataIndex: 'trx_requested_lock_id',
            key: 'trx_requested_lock_id',
            width: 200,
            render: (text) => text || '-',
        },
    ];

    const rowSelection = {
        selectedRowKeys,
        onChange: (keys: React.Key[]) => {
            setSelectedRowKeys(keys);
        },
    };

    return (
        <PageLayout title={
            <Space>
                <WarningOutlined style={{ color: '#faad14' }} />
                {t('uncommitted.title')}
            </Space>
        }>
            <div className="dbm-uncommitted-trx">
                <Card
                    extra={
                        <Space>
                            <Select
                                style={{ width: 250 }}
                                value={selectedInstance}
                                onChange={handleInstanceChange}
                                placeholder={t('sessions.select_instance')}
                            >
                                {instances.map((instance) => (
                                    <Option key={instance.id} value={instance.id}>
                                        {instance.instance_name} ({instance.host}:{instance.port})
                                    </Option>
                                ))}
                            </Select>
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={fetchTransactions}
                                disabled={!selectedInstance}
                            >
                                {t('refresh')}
                            </Button>
                            <Button
                                type="primary"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={handleKillTransactions}
                                disabled={selectedRowKeys.length === 0}
                            >
                                {t('uncommitted.kill_selected')} ({selectedRowKeys.length})
                            </Button>
                        </Space>
                    }
                >
                    <Table
                        columns={columns}
                        dataSource={transactions}
                        loading={loading}
                        rowKey="trx_mysql_thread_id"
                        rowSelection={rowSelection}
                        pagination={{
                            showSizeChanger: true,
                            showQuickJumper: true,
                            showTotal: (total) => t('total_items', { count: total }),
                            defaultPageSize: 20,
                            pageSizeOptions: ['10', '20', '50', '100'],
                        }}
                        scroll={{ x: 1500 }}
                    />
                </Card>
            </div>
        </PageLayout>
    );
};

export default UncommittedTrx;
