import React, { useState, useEffect } from 'react';
import { Table, Card, Select, Space, message, Button, Modal, Tag, Tooltip, Tabs } from 'antd';
import { ReloadOutlined, DeleteOutlined, ExclamationCircleOutlined, LockOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ColumnsType } from 'antd/es/table';
import {
    getArcheryInstances,
    getLockWaits,
    getInnoDBLocks,
    killSessions,
    ArcheryInstance,
    LockWait,
    InnoDBLock
} from '@/services/dbm';
import PageLayout from '@/components/pageLayout';
import './index.less';

const { Option } = Select;
const { TabPane } = Tabs;

const Locks: React.FC = () => {
    const { t } = useTranslation('dbm');
    const [loading, setLoading] = useState(false);
    const [instances, setInstances] = useState<ArcheryInstance[]>([]);
    const [selectedInstance, setSelectedInstance] = useState<number | null>(null);
    const [lockWaits, setLockWaits] = useState<LockWait[]>([]);
    const [innoDBLocks, setInnoDBLocks] = useState<InnoDBLock[]>([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [activeTab, setActiveTab] = useState<string>('lock-waits');

    // 获取实例列表
    const fetchInstances = async () => {
        try {
            const res = await getArcheryInstances();
            if (res.err) {
                message.error(res.err);
                return;
            }
            setInstances(res.dat?.list || []);
            if (res.dat?.list && res.dat.list.length > 0) {
                setSelectedInstance(res.dat.list[0].id);
            }
        } catch (error) {
            message.error(t('locks.fetch_instances_failed'));
        }
    };

    // 获取锁信息
    const fetchLockData = async () => {
        if (!selectedInstance) {
            return;
        }
        setLoading(true);
        try {
            const [lockWaitsRes, innoDBLocksRes] = await Promise.all([
                getLockWaits({ instance_id: selectedInstance }),
                getInnoDBLocks(selectedInstance),
            ]);

            if (!lockWaitsRes.err) {
                setLockWaits(lockWaitsRes.dat || []);
            }
            if (!innoDBLocksRes.err) {
                setInnoDBLocks(innoDBLocksRes.dat || []);
            }
        } catch (error) {
            message.error(t('locks.fetch_failed'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInstances();
    }, []);

    useEffect(() => {
        if (selectedInstance) {
            fetchLockData();
        }
    }, [selectedInstance]);

    // 格式化时间
    const formatDuration = (seconds: number): string => {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    };

    // Kill 阻塞线程
    const handleKillBlocking = (threadId: number) => {
        if (!selectedInstance) return;

        Modal.confirm({
            title: t('locks.confirm_kill_title'),
            icon: <ExclamationCircleOutlined />,
            content: t('locks.confirm_kill_blocking', { threadId }),
            okText: t('sessions.confirm'),
            cancelText: t('sessions.cancel'),
            okType: 'danger',
            onOk: async () => {
                try {
                    const res = await killSessions({
                        instance_id: selectedInstance,
                        thread_ids: [threadId],
                    });

                    if (res.err) {
                        message.error(res.err);
                        return;
                    }

                    message.success(t('locks.kill_success'));
                    fetchLockData();
                } catch (error) {
                    message.error(t('locks.kill_failed'));
                }
            },
        });
    };

    // 锁等待表格列定义
    const lockWaitColumns: ColumnsType<LockWait> = [
        {
            title: t('locks.waiting_thread'),
            dataIndex: 'waiting_thread_id',
            key: 'waiting_thread_id',
            width: 100,
            render: (text) => <Tag color="orange">{text}</Tag>,
        },
        {
            title: t('locks.waiting_user'),
            dataIndex: 'waiting_user',
            key: 'waiting_user',
            width: 100,
        },
        {
            title: t('locks.waiting_time'),
            dataIndex: 'waiting_time',
            key: 'waiting_time',
            width: 100,
            render: (time) => {
                const color = time > 60 ? 'red' : time > 10 ? 'orange' : 'default';
                return <Tag color={color}>{formatDuration(time)}</Tag>;
            },
            sorter: (a, b) => a.waiting_time - b.waiting_time,
            defaultSortOrder: 'descend',
        },
        {
            title: t('locks.waiting_query'),
            dataIndex: 'waiting_query',
            key: 'waiting_query',
            width: 250,
            ellipsis: { showTitle: false },
            render: (query) => (
                <Tooltip placement="topLeft" title={query}>
                    {query || '-'}
                </Tooltip>
            ),
        },
        {
            title: t('locks.blocking_thread'),
            dataIndex: 'blocking_thread_id',
            key: 'blocking_thread_id',
            width: 100,
            render: (text) => <Tag color="red">{text}</Tag>,
        },
        {
            title: t('locks.blocking_user'),
            dataIndex: 'blocking_user',
            key: 'blocking_user',
            width: 100,
        },
        {
            title: t('locks.blocking_query'),
            dataIndex: 'blocking_query',
            key: 'blocking_query',
            width: 250,
            ellipsis: { showTitle: false },
            render: (query) => (
                <Tooltip placement="topLeft" title={query}>
                    {query || '-'}
                </Tooltip>
            ),
        },
        {
            title: t('locks.lock_table'),
            dataIndex: 'lock_table',
            key: 'lock_table',
            width: 150,
        },
        {
            title: t('locks.lock_mode'),
            dataIndex: 'lock_mode',
            key: 'lock_mode',
            width: 80,
            render: (mode) => <Tag color="purple">{mode}</Tag>,
        },
        {
            title: t('locks.actions'),
            key: 'actions',
            width: 120,
            fixed: 'right',
            render: (_, record) => (
                <Button
                    type="link"
                    danger
                    size="small"
                    onClick={() => handleKillBlocking(record.blocking_thread_id)}
                >
                    {t('locks.kill_blocking')}
                </Button>
            ),
        },
    ];

    // InnoDB锁表格列定义
    const innoDBLockColumns: ColumnsType<InnoDBLock> = [
        {
            title: t('locks.lock_id'),
            dataIndex: 'lock_id',
            key: 'lock_id',
            width: 150,
        },
        {
            title: t('locks.lock_trx_id'),
            dataIndex: 'lock_trx_id',
            key: 'lock_trx_id',
            width: 120,
            render: (text) => <Tag color="purple">{text}</Tag>,
        },
        {
            title: t('locks.thread_id'),
            dataIndex: 'thread_id',
            key: 'thread_id',
            width: 80,
        },
        {
            title: t('locks.user'),
            dataIndex: 'user',
            key: 'user',
            width: 80,
            render: (text) => <Tag color="blue">{text}</Tag>,
        },
        {
            title: t('locks.lock_mode'),
            dataIndex: 'lock_mode',
            key: 'lock_mode',
            width: 80,
            render: (mode) => {
                const colorMap: Record<string, string> = {
                    'X': 'red',
                    'S': 'green',
                    'IX': 'orange',
                    'IS': 'blue',
                };
                return <Tag color={colorMap[mode] || 'default'}>{mode}</Tag>;
            },
        },
        {
            title: t('locks.lock_type'),
            dataIndex: 'lock_type',
            key: 'lock_type',
            width: 100,
        },
        {
            title: t('locks.lock_table'),
            dataIndex: 'lock_table',
            key: 'lock_table',
            width: 150,
        },
        {
            title: t('locks.lock_index'),
            dataIndex: 'lock_index',
            key: 'lock_index',
            width: 120,
        },
        {
            title: t('locks.time'),
            dataIndex: 'time',
            key: 'time',
            width: 100,
            render: (time) => {
                const color = time > 60 ? 'red' : time > 10 ? 'orange' : 'default';
                return <Tag color={color}>{formatDuration(time)}</Tag>;
            },
            sorter: (a, b) => a.time - b.time,
        },
        {
            title: t('locks.query'),
            dataIndex: 'query',
            key: 'query',
            width: 300,
            ellipsis: { showTitle: false },
            render: (query) => (
                <Tooltip placement="topLeft" title={query}>
                    {query || '-'}
                </Tooltip>
            ),
        },
    ];

    return (
        <PageLayout title={
            <Space>
                <LockOutlined style={{ color: '#ff4d4f' }} />
                {t('locks.title')}
            </Space>
        }>
            <div className="dbm-locks">
                <Card
                    extra={
                        <Space>
                            <Select
                                style={{ width: 250 }}
                                value={selectedInstance}
                                onChange={setSelectedInstance}
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
                                onClick={fetchLockData}
                                disabled={!selectedInstance}
                            >
                                {t('refresh')}
                            </Button>
                        </Space>
                    }
                >
                    <Tabs activeKey={activeTab} onChange={setActiveTab}>
                        <TabPane tab={t('locks.tab_lock_waits') + ` (${lockWaits.length})`} key="lock-waits">
                            <Table
                                columns={lockWaitColumns}
                                dataSource={lockWaits}
                                loading={loading}
                                rowKey={(record) => `${record.waiting_thread_id}-${record.blocking_thread_id}`}
                                pagination={{
                                    showSizeChanger: true,
                                    showQuickJumper: true,
                                    showTotal: (total) => t('total_items', { count: total }),
                                    defaultPageSize: 20,
                                }}
                                scroll={{ x: 1500 }}
                            />
                        </TabPane>
                        <TabPane tab={t('locks.tab_innodb_locks') + ` (${innoDBLocks.length})`} key="innodb-locks">
                            <Table
                                columns={innoDBLockColumns}
                                dataSource={innoDBLocks}
                                loading={loading}
                                rowKey="lock_id"
                                pagination={{
                                    showSizeChanger: true,
                                    showQuickJumper: true,
                                    showTotal: (total) => t('total_items', { count: total }),
                                    defaultPageSize: 20,
                                }}
                                scroll={{ x: 1400 }}
                            />
                        </TabPane>
                    </Tabs>
                </Card>
            </div>
        </PageLayout>
    );
};

export default Locks;
