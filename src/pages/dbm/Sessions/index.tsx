import React, { useState, useEffect } from 'react';
import { Table, Card, Input, Select, Space, message, Button, Modal, Tag, Tooltip } from 'antd';
import { ReloadOutlined, DeleteOutlined, ExclamationCircleOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ColumnsType } from 'antd/es/table';
import {
    getArcheryInstances,
    getSessions,
    killSessions,
    ArcheryInstance,
    ArcherySession
} from '@/services/dbm';
import PageLayout from '@/components/pageLayout';
import './index.less';

const { Search } = Input;
const { Option } = Select;

const SessionManagement: React.FC = () => {
    const { t } = useTranslation('dbm');
    const [loading, setLoading] = useState(false);
    const [instances, setInstances] = useState<ArcheryInstance[]>([]);
    const [selectedInstance, setSelectedInstance] = useState<number | null>(null);
    const [sessions, setSessions] = useState<ArcherySession[]>([]);
    const [filteredSessions, setFilteredSessions] = useState<ArcherySession[]>([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [searchText, setSearchText] = useState('');
    const [commandFilter, setCommandFilter] = useState<string>('all');
    const [userFilter, setUserFilter] = useState<string>('all');

    // 获取实例列表
    const fetchInstances = async () => {
        try {
            const res = await getArcheryInstances();
            if (res.err) {
                message.error(res.err);
                return;
            }
            setInstances(res.dat || []);
            // 默认选择第一个实例
            if (res.dat && res.dat.length > 0) {
                setSelectedInstance(res.dat[0].id);
            }
        } catch (error) {
            message.error(t('sessions.fetch_instances_failed'));
        }
    };

    // 获取会话列表
    const fetchSessions = async () => {
        if (!selectedInstance) {
            return;
        }
        setLoading(true);
        try {
            const res = await getSessions({ instance_id: selectedInstance });
            if (res.err) {
                message.error(res.err);
                return;
            }
            setSessions(res.dat || []);
            setFilteredSessions(res.dat || []);
        } catch (error) {
            message.error(t('sessions.fetch_sessions_failed'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInstances();
    }, []);

    useEffect(() => {
        if (selectedInstance) {
            fetchSessions();
        }
    }, [selectedInstance]);

    // 搜索和筛选
    useEffect(() => {
        let filtered = sessions;

        // 命令类型筛选
        if (commandFilter !== 'all') {
            filtered = filtered.filter((item) => item.command === commandFilter);
        }

        // 用户筛选
        if (userFilter !== 'all') {
            filtered = filtered.filter((item) => item.user === userFilter);
        }

        // 搜索
        if (searchText) {
            filtered = filtered.filter(
                (item) =>
                    item.user.toLowerCase().includes(searchText.toLowerCase()) ||
                    (item.db && item.db.toLowerCase().includes(searchText.toLowerCase())) ||
                    (item.info && item.info.toLowerCase().includes(searchText.toLowerCase())),
            );
        }

        setFilteredSessions(filtered);
    }, [sessions, searchText, commandFilter, userFilter]);

    // 批量Kill会话
    const handleKillSessions = () => {
        if (selectedRowKeys.length === 0) {
            message.warning(t('sessions.select_sessions_first'));
            return;
        }

        Modal.confirm({
            title: t('sessions.confirm_kill_title'),
            icon: <ExclamationCircleOutlined />,
            content: t('sessions.confirm_kill_content', { count: selectedRowKeys.length }),
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

                    message.success(t('sessions.kill_success', { count: threadIds.length }));
                    setSelectedRowKeys([]);
                    fetchSessions();
                } catch (error) {
                    message.error(t('sessions.kill_failed'));
                }
            },
        });
    };

    // 获取唯一的命令类型和用户
    const commands = Array.from(new Set(sessions.map((item) => item.command)));
    const users = Array.from(new Set(sessions.map((item) => item.user)));

    // 格式化时间（秒转为可读格式）
    const formatTime = (seconds: number): string => {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    };

    // 表格列定义
    const columns: ColumnsType<ArcherySession> = [
        {
            title: t('sessions.thread_id'),
            dataIndex: 'id',
            key: 'id',
            width: 100,
            fixed: 'left',
        },
        {
            title: t('sessions.user'),
            dataIndex: 'user',
            key: 'user',
            width: 120,
            render: (text) => <Tag color="blue">{text}</Tag>,
        },
        {
            title: t('sessions.host'),
            dataIndex: 'host',
            key: 'host',
            width: 150,
        },
        {
            title: t('sessions.database'),
            dataIndex: 'db',
            key: 'db',
            width: 120,
            render: (text) => text || '-',
        },
        {
            title: t('sessions.command'),
            dataIndex: 'command',
            key: 'command',
            width: 100,
            render: (text) => {
                const colorMap: Record<string, string> = {
                    'Query': 'orange',
                    'Sleep': 'default',
                    'Connect': 'green',
                    'Binlog Dump': 'purple',
                };
                return <Tag color={colorMap[text] || 'default'}>{text}</Tag>;
            },
        },
        {
            title: t('sessions.time'),
            dataIndex: 'time',
            key: 'time',
            width: 100,
            render: (time) => {
                const color = time > 300 ? 'red' : time > 60 ? 'orange' : 'default';
                return <Tag color={color}>{formatTime(time)}</Tag>;
            },
            sorter: (a, b) => a.time - b.time,
        },
        {
            title: t('sessions.state'),
            dataIndex: 'state',
            key: 'state',
            width: 150,
            render: (text) => text || '-',
        },
        {
            title: t('sessions.info'),
            dataIndex: 'info',
            key: 'info',
            width: 400,
            ellipsis: {
                showTitle: false,
            },
            render: (info) => (
                <Tooltip placement="topLeft" title={info}>
                    {info || '-'}
                </Tooltip>
            ),
        },
    ];

    const rowSelection = {
        selectedRowKeys,
        onChange: (keys: React.Key[]) => {
            setSelectedRowKeys(keys);
        },
        getCheckboxProps: (record: ArcherySession) => ({
            disabled: record.command === 'Binlog Dump', // 禁止Kill系统进程
        }),
    };

    return (
        <PageLayout title={
            <Space>
                <DatabaseOutlined />
                {t('sessions.title')}
            </Space>
        }>
            <div className="dbm-session-management">
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
                                onClick={fetchSessions}
                                disabled={!selectedInstance}
                            >
                                {t('sessions.refresh')}
                            </Button>
                            <Button
                                type="primary"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={handleKillSessions}
                                disabled={selectedRowKeys.length === 0}
                            >
                                {t('sessions.kill_selected')} ({selectedRowKeys.length})
                            </Button>
                        </Space>
                    }
                >
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        <Space>
                            <Search
                                placeholder={t('sessions.search_placeholder')}
                                allowClear
                                style={{ width: 300 }}
                                onChange={(e) => setSearchText(e.target.value)}
                            />
                            <Select
                                style={{ width: 150 }}
                                value={commandFilter}
                                onChange={setCommandFilter}
                                placeholder={t('sessions.filter_by_command')}
                            >
                                <Option value="all">{t('sessions.all_commands')}</Option>
                                {commands.map((cmd) => (
                                    <Option key={cmd} value={cmd}>
                                        {cmd}
                                    </Option>
                                ))}
                            </Select>
                            <Select
                                style={{ width: 150 }}
                                value={userFilter}
                                onChange={setUserFilter}
                                placeholder={t('sessions.filter_by_user')}
                            >
                                <Option value="all">{t('sessions.all_users')}</Option>
                                {users.map((user) => (
                                    <Option key={user} value={user}>
                                        {user}
                                    </Option>
                                ))}
                            </Select>
                        </Space>

                        <Table
                            columns={columns}
                            dataSource={filteredSessions}
                            loading={loading}
                            rowKey="id"
                            rowSelection={rowSelection}
                            pagination={{
                                showSizeChanger: true,
                                showQuickJumper: true,
                                showTotal: (total) => t('sessions.total_items', { count: total }),
                                defaultPageSize: 20,
                                pageSizeOptions: ['10', '20', '50', '100'],
                            }}
                            scroll={{ x: 1400 }}
                        />
                    </Space>
                </Card>
            </div>
        </PageLayout>
    );
};

export default SessionManagement;
