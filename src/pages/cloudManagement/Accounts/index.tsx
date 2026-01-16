import React, { useState, useEffect } from 'react';
import { Table, Card, Input, Select, Tag, Space, message, Button, Modal, Form, Switch, Popconfirm, Row, Col, Typography, Tooltip, Statistic } from 'antd';
import { ReloadOutlined, CloudOutlined, PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, SyncOutlined, GlobalOutlined, AppstoreOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ColumnsType } from 'antd/es/table';
import PageLayout from '@/components/pageLayout';
import { getCloudAccounts, addCloudAccount, updateCloudAccount, deleteCloudAccounts, testCloudAccount, getCloudProviders, getCloudRegions, syncCloudResources, CloudAccount, ProviderInfo, Region } from '@/services/cloudManagement';
import './index.less';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;
const { Title } = Typography;

const CloudAccountList: React.FC = () => {
    const { t } = useTranslation('cloudManagement');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<CloudAccount[]>([]);
    const [total, setTotal] = useState(0);
    const [searchText, setSearchText] = useState('');
    const [providerFilter, setProviderFilter] = useState<string>('all');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
    
    // 云厂商和区域数据
    const [providers, setProviders] = useState<ProviderInfo[]>([]);
    const [regions, setRegions] = useState<Region[]>([]);
    
    // 表单相关
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'add' | 'edit'>('add');
    const [editingRecord, setEditingRecord] = useState<CloudAccount | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [form] = Form.useForm();
    
    // 选中行
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    
    // 同步状态
    const [syncingIds, setSyncingIds] = useState<Set<number>>(new Set());

    // 获取云厂商列表
    const fetchProviders = async () => {
        try {
            const res = await getCloudProviders();
            if (!res.err) {
                setProviders(res.dat || []);
            }
        } catch (error) {
            console.error('Failed to fetch providers:', error);
        }
    };

    // 获取区域列表
    const fetchRegions = async (provider: string) => {
        try {
            const res = await getCloudRegions(provider);
            if (!res.err) {
                setRegions(res.dat || []);
            }
        } catch (error) {
            console.error('Failed to fetch regions:', error);
        }
    };

    // 获取账号列表
    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const res = await getCloudAccounts({
                provider: providerFilter === 'all' ? undefined : providerFilter,
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
        fetchProviders();
    }, []);

    useEffect(() => {
        fetchAccounts();
    }, [pagination.current, pagination.pageSize, providerFilter, searchText]);

    // 监听表单中云厂商变化，加载区域列表
    const handleProviderChange = (provider: string) => {
        fetchRegions(provider);
        form.setFieldsValue({ regions: [] });
    };

    // 打开添加弹窗
    const handleAdd = () => {
        setModalType('add');
        setEditingRecord(null);
        form.resetFields();
        form.setFieldsValue({
            provider: 'huawei',
            sync_enabled: true,
            sync_interval: 300,
            enabled: true,
        });
        fetchRegions('huawei');
        setModalVisible(true);
    };

    // 打开编辑弹窗
    const handleEdit = (record: CloudAccount) => {
        setModalType('edit');
        setEditingRecord(record);
        form.setFieldsValue({
            ...record,
            access_key: '',
            secret_key: '',
        });
        fetchRegions(record.provider);
        setModalVisible(true);
    };

    // 提交表单
    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);
            
            if (modalType === 'add') {
                const res = await addCloudAccount(values);
                if (res.err) {
                    message.error(res.err);
                    return;
                }
                message.success(t('add_success'));
            } else if (editingRecord) {
                const res = await updateCloudAccount(editingRecord.id, values);
                if (res.err) {
                    message.error(res.err);
                    return;
                }
                message.success(t('update_success'));
            }
            
            setModalVisible(false);
            fetchAccounts();
        } catch (error) {
            console.error('Form validation failed:', error);
        } finally {
            setSubmitting(false);
        }
    };

    // 删除账号
    const handleDelete = async (ids: number[]) => {
        try {
            const res = await deleteCloudAccounts(ids);
            if (res.err) {
                message.error(res.err);
                return;
            }
            message.success(t('delete_success'));
            setSelectedRowKeys([]);
            fetchAccounts();
        } catch (error) {
            message.error(t('delete_failed'));
        }
    };

    // 测试连接
    const handleTest = async (id: number) => {
        try {
            const res = await testCloudAccount(id);
            if (res.err) {
                message.error(res.err);
                return;
            }
            if (res.dat?.success) {
                message.success(t('test_success'));
            } else {
                message.error(res.dat?.message || t('test_failed'));
            }
            fetchAccounts();
        } catch (error) {
            message.error(t('test_failed'));
        }
    };

    // 同步账号资源
    const handleSync = async (id: number) => {
        setSyncingIds(prev => new Set(prev).add(id));
        try {
            const res = await syncCloudResources({ account_id: id });
            if (res.err) {
                message.error(res.err);
                return;
            }
            message.success(t('sync_triggered'));
            // 延迟刷新列表
            setTimeout(() => fetchAccounts(), 2000);
        } catch (error) {
            message.error(t('fetch_failed'));
        } finally {
            setSyncingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
        }
    };

    // 健康状态图标
    const renderHealthStatus = (status: number) => {
        switch (status) {
            case 1:
                return <Tag icon={<CheckCircleOutlined />} color="success">{t('healthy')}</Tag>;
            case 2:
                return <Tag icon={<CloseCircleOutlined />} color="error">{t('unhealthy')}</Tag>;
            default:
                return <Tag icon={<ExclamationCircleOutlined />} color="warning">{t('unknown')}</Tag>;
        }
    };

    // 同步状态渲染
    const renderSyncStatus = (status: number) => {
        switch (status) {
            case 1:
                return <Tag color="success">{t('sync_success')}</Tag>;
            case 2:
                return <Tag color="error">{t('sync_failed')}</Tag>;
            default:
                return <Tag>{t('not_synced')}</Tag>;
        }
    };

    const columns: ColumnsType<CloudAccount> = [
        {
            title: t('name'),
            dataIndex: 'name',
            key: 'name',
            width: 180,
            render: (text) => <b>{text}</b>
        },
        {
            title: t('provider'),
            dataIndex: 'provider',
            key: 'provider',
            width: 120,
            render: (provider: string) => {
                const info = providers.find(p => p.key === provider);
                return <span className={`provider-tag ${provider}`}>{info?.name || provider}</span>;
            },
        },
        {
            title: t('access_key'),
            dataIndex: 'access_key',
            key: 'access_key',
            width: 200,
            render: (text) => <span style={{ fontFamily: 'monospace' }}>{text}</span>
        },
        {
            title: t('regions'),
            dataIndex: 'regions',
            key: 'regions',
            width: 200,
            render: (regions: string[]) => {
                if (!regions || regions.length === 0) return '-';
                if (regions.length <= 2) return regions.join(', ');
                return (
                    <Tooltip title={regions.join(', ')}>
                        <span>{regions[0]} +{regions.length - 1} more</span>
                    </Tooltip>
                );
            },
        },
        {
            title: t('health_status'),
            dataIndex: 'health_status',
            key: 'health_status',
            width: 120,
            align: 'center',
            render: renderHealthStatus,
        },
        {
            title: t('last_sync_status'),
            dataIndex: 'last_sync_status',
            key: 'last_sync_status',
            width: 120,
            render: renderSyncStatus,
        },
        {
            title: t('enabled'),
            dataIndex: 'enabled',
            key: 'enabled',
            width: 100,
            render: (enabled: boolean) => enabled ? <Tag color="green">{t('enabled')}</Tag> : <Tag>{t('disabled')}</Tag>,
        },
        {
            title: t('actions'),
            key: 'actions',
            width: 280,
            render: (_, record) => (
                <Space size="small">
                    <Button type="link" size="small" onClick={() => handleTest(record.id)}>
                        {t('test')}
                    </Button>
                    <Popconfirm
                        title={t('sync_confirm')}
                        onConfirm={() => handleSync(record.id)}
                        disabled={!record.enabled}
                    >
                        <Button 
                            type="link" 
                            size="small" 
                            icon={<SyncOutlined spin={syncingIds.has(record.id)} />}
                            loading={syncingIds.has(record.id)}
                            disabled={!record.enabled}
                        >
                            {t('sync')}
                        </Button>
                    </Popconfirm>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                        {t('edit')}
                    </Button>
                    <Popconfirm
                        title={t('delete_confirm')}
                        onConfirm={() => handleDelete([record.id])}
                    >
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                            {t('delete')}
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <PageLayout title={<Space><CloudOutlined />{t('cloud_accounts')}</Space>}>
            <div className="cloud-management-page">
                <div className="stats-card-container">
                    <Row gutter={16}>
                        <Col span={8}>
                            <div className="stats-card">
                                <div className="stats-icon blue">
                                    <CloudOutlined />
                                </div>
                                <div className="stats-content">
                                    <div className="stats-title">{t('total_accounts')}</div>
                                    <div className="stats-value">{total}</div>
                                </div>
                            </div>
                        </Col>
                        <Col span={8}>
                            <div className="stats-card">
                                <div className="stats-icon orange">
                                    <GlobalOutlined />
                                </div>
                                <div className="stats-content">
                                    <div className="stats-title">{t('supported_providers')}</div>
                                    <div className="stats-value">{providers.length}</div>
                                </div>
                            </div>
                        </Col>
                        <Col span={8}>
                            <div className="stats-card">
                                <div className="stats-icon green">
                                    <SafetyCertificateOutlined />
                                </div>
                                <div className="stats-content">
                                    <div className="stats-title">{t('active_providers')}</div>
                                    <div className="stats-value">{providers.filter(p => p.enabled).length}</div>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </div>

                <Card className="search-filter-card" bodyStyle={{ padding: 24 }}>
                    <div className="filter-row">
                        <div className="filter-item">
                            <span className="label">{t('provider')}:</span>
                            <Select
                                value={providerFilter}
                                onChange={setProviderFilter}
                                style={{ width: 160 }}
                            >
                                <Option value="all">{t('all_providers')}</Option>
                                {providers.filter(p => p.enabled).map(p => (
                                    <Option key={p.key} value={p.key}>{p.name}</Option>
                                ))}
                            </Select>
                        </div>
                        <div className="filter-item">
                            <Search
                                placeholder={t('search_placeholder')}
                                value={searchText}
                                onChange={e => setSearchText(e.target.value)}
                                onSearch={() => fetchAccounts()}
                                style={{ width: 300 }}
                                enterButton
                            />
                        </div>
                        <div className="filter-actions">
                            <Space>
                                {selectedRowKeys.length > 0 && (
                                    <Popconfirm
                                        title={t('batch_delete_confirm')}
                                        onConfirm={() => handleDelete(selectedRowKeys as number[])}
                                    >
                                        <Button danger>{t('batch_delete')} ({selectedRowKeys.length})</Button>
                                    </Popconfirm>
                                )}
                                <Button icon={<ReloadOutlined />} onClick={fetchAccounts}>
                                    {t('refresh')}
                                </Button>
                                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                                    {t('add_account')}
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
                        rowSelection={{
                            selectedRowKeys,
                            onChange: setSelectedRowKeys,
                        }}
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

                <Modal
                    title={modalType === 'add' ? t('add_account') : t('edit_account')}
                    visible={modalVisible}
                    onOk={handleSubmit}
                    onCancel={() => setModalVisible(false)}
                    confirmLoading={submitting}
                    width={600}
                >
                    <Form
                        form={form}
                        layout="vertical"
                    >
                        <Form.Item
                            name="name"
                            label={t('name')}
                            rules={[{ required: true, message: t('name_required') }]}
                        >
                            <Input placeholder={t('name_placeholder')} />
                        </Form.Item>

                        <Form.Item
                            name="provider"
                            label={t('provider')}
                            rules={[{ required: true }]}
                        >
                            <Select onChange={handleProviderChange} disabled={modalType === 'edit'}>
                                {providers.filter(p => p.enabled).map(p => (
                                    <Option key={p.key} value={p.key}>{p.name}</Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="description"
                            label={t('description')}
                        >
                            <TextArea rows={2} placeholder={t('description_placeholder')} />
                        </Form.Item>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="access_key"
                                    label={t('access_key')}
                                    rules={[{ required: modalType === 'add', message: t('access_key_required') }]}
                                >
                                    <Input placeholder={modalType === 'edit' ? t('leave_empty_keep') : t('access_key_placeholder')} />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="secret_key"
                                    label={t('secret_key')}
                                    rules={[{ required: modalType === 'add', message: t('secret_key_required') }]}
                                >
                                    <Input.Password placeholder={modalType === 'edit' ? t('leave_empty_keep') : t('secret_key_placeholder')} />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item
                            name="regions"
                            label={t('regions')}
                            rules={[{ required: true, message: t('regions_required') }]}
                        >
                            <Select mode="multiple" placeholder={t('regions_placeholder')}>
                                {regions.map(r => (
                                    <Option key={r.region} value={r.region}>{r.name} ({r.region})</Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="default_region"
                            label={t('default_region')}
                        >
                            <Select placeholder={t('default_region_placeholder')} allowClear>
                                {regions.map(r => (
                                    <Option key={r.region} value={r.region}>{r.name}</Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Row gutter={16}>
                            <Col span={8}>
                                <Form.Item name="sync_enabled" label={t('sync_enabled')} valuePropName="checked">
                                    <Switch />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item name="sync_interval" label={t('sync_interval')}>
                                    <Input type="number" addonAfter={t('seconds')} />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item name="enabled" label={t('enabled')} valuePropName="checked">
                                    <Switch />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Form>
                </Modal>
            </div>
        </PageLayout>
    );
};

export default CloudAccountList;
