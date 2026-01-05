import React, { useState, useEffect } from 'react';
import { Table, Card, Input, Select, Tag, Space, message, Button } from 'antd';
import { ReloadOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ColumnsType } from 'antd/es/table';
import { getArcheryInstances, checkArcheryHealth, ArcheryInstance } from '@/services/dbm';
import './index.less';

const { Search } = Input;
const { Option } = Select;

const DBMInstanceList: React.FC = () => {
    const { t } = useTranslation('dbm');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<ArcheryInstance[]>([]);
    const [filteredData, setFilteredData] = useState<ArcheryInstance[]>([]);
    const [searchText, setSearchText] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [healthStatus, setHealthStatus] = useState<string>('');

    // 获取实例列表
    const fetchInstances = async () => {
        setLoading(true);
        try {
            const res = await getArcheryInstances();
            if (res.err) {
                message.error(res.err);
                return;
            }
            setData(res.dat || []);
            setFilteredData(res.dat || []);
        } catch (error) {
            message.error(t('fetch_failed'));
        } finally {
            setLoading(false);
        }
    };

    // 健康检查
    const checkHealth = async () => {
        try {
            const res = await checkArcheryHealth();
            if (res.err) {
                setHealthStatus('error');
                message.error(t('health_check_failed'));
                return;
            }
            setHealthStatus('ok');
            message.success(t('health_check_success'));
        } catch (error) {
            setHealthStatus('error');
            message.error(t('health_check_failed'));
        }
    };

    useEffect(() => {
        fetchInstances();
        checkHealth();
    }, []);

    // 搜索和筛选
    useEffect(() => {
        let filtered = data;

        // 类型筛选
        if (typeFilter !== 'all') {
            filtered = filtered.filter((item) => item.type === typeFilter);
        }

        // 搜索
        if (searchText) {
            filtered = filtered.filter(
                (item) =>
                    item.instance_name.toLowerCase().includes(searchText.toLowerCase()) ||
                    item.host.toLowerCase().includes(searchText.toLowerCase()),
            );
        }

        setFilteredData(filtered);
    }, [data, searchText, typeFilter]);

    // 获取唯一的数据库类型
    const dbTypes = Array.from(new Set(data.map((item) => item.type)));

    // 表格列定义
    const columns: ColumnsType<ArcheryInstance> = [
        {
            title: t('instance_name'),
            dataIndex: 'instance_name',
            key: 'instance_name',
            width: 200,
            render: (text) => (
                <Space>
                    <DatabaseOutlined />
                    <span>{text}</span>
                </Space>
            ),
        },
        {
            title: t('type'),
            dataIndex: 'type',
            key: 'type',
            width: 120,
            render: (text) => {
                const colorMap: Record<string, string> = {
                    mysql: 'blue',
                    redis: 'red',
                    mongodb: 'green',
                    postgresql: 'purple',
                };
                return <Tag color={colorMap[text] || 'default'}>{text.toUpperCase()}</Tag>;
            },
        },
        {
            title: t('db_type'),
            dataIndex: 'db_type',
            key: 'db_type',
            width: 100,
            render: (text) => <Tag color={text === 'master' ? 'gold' : 'cyan'}>{text}</Tag>,
        },
        {
            title: t('host'),
            dataIndex: 'host',
            key: 'host',
            width: 150,
        },
        {
            title: t('port'),
            dataIndex: 'port',
            key: 'port',
            width: 80,
        },
        {
            title: t('user'),
            dataIndex: 'user',
            key: 'user',
            width: 120,
        },
        {
            title: t('charset'),
            dataIndex: 'charset',
            key: 'charset',
            width: 100,
        },
        {
            title: t('create_time'),
            dataIndex: 'create_time',
            key: 'create_time',
            width: 180,
        },
    ];

    return (
        <div className="dbm-instance-list">
            <Card
                title={
                    <Space>
                        <DatabaseOutlined />
                        {t('title')}
                        {healthStatus && (
                            <Tag color={healthStatus === 'ok' ? 'success' : 'error'}>
                                {healthStatus === 'ok' ? t('service_online') : t('service_offline')}
                            </Tag>
                        )}
                    </Space>
                }
                extra={
                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={() => { fetchInstances(); checkHealth(); }}>
                            {t('refresh')}
                        </Button>
                    </Space>
                }
            >
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Space>
                        <Search
                            placeholder={t('search_placeholder')}
                            allowClear
                            style={{ width: 300 }}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                        <Select
                            style={{ width: 150 }}
                            value={typeFilter}
                            onChange={setTypeFilter}
                            placeholder={t('filter_by_type')}
                        >
                            <Option value="all">{t('all_types')}</Option>
                            {dbTypes.map((type) => (
                                <Option key={type} value={type}>
                                    {type.toUpperCase()}
                                </Option>
                            ))}
                        </Select>
                    </Space>

                    <Table
                        columns={columns}
                        dataSource={filteredData}
                        loading={loading}
                        rowKey="id"
                        pagination={{
                            showSizeChanger: true,
                            showQuickJumper: true,
                            showTotal: (total) => t('total_items', { count: total }),
                            defaultPageSize: 20,
                            pageSizeOptions: ['10', '20', '50', '100'],
                        }}
                        scroll={{ x: 1200 }}
                    />
                </Space>
            </Card>
        </div>
    );
};

export default DBMInstanceList;
