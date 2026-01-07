import React, { useState, useEffect } from 'react';
import { Table, Card, Input, Select, Tag, Space, message, Button, Modal, Form, InputNumber, Switch, Popconfirm } from 'antd';
import { ReloadOutlined, DatabaseOutlined, PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ColumnsType } from 'antd/es/table';
import { getArcheryInstances, addDBInstance, updateDBInstance, deleteDBInstances, checkInstanceHealth, ArcheryInstance } from '@/services/dbm';
import PageLayout from '@/components/pageLayout';
import './index.less';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

// 数据库类型选项
const DB_TYPES = [
    { value: 'mysql', label: 'MySQL', color: 'blue' },
    { value: 'postgresql', label: 'PostgreSQL', color: 'purple' },
    { value: 'redis', label: 'Redis', color: 'red' },
    { value: 'mongodb', label: 'MongoDB', color: 'green' },
];

// 默认端口
const DEFAULT_PORTS: Record<string, number> = {
    mysql: 3306,
    postgresql: 5432,
    redis: 6379,
    mongodb: 27017,
};

const DBMInstanceList: React.FC = () => {
    const { t } = useTranslation('dbm');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<ArcheryInstance[]>([]);
    const [total, setTotal] = useState(0);
    const [searchText, setSearchText] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
    
    // 表单相关
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'add' | 'edit'>('add');
    const [editingRecord, setEditingRecord] = useState<ArcheryInstance | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [form] = Form.useForm();
    
    // 选中行
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

    // 获取实例列表
    const fetchInstances = async () => {
        setLoading(true);
        try {
            const res = await getArcheryInstances({
                db_type: typeFilter === 'all' ? undefined : typeFilter,
                query: searchText || undefined,
                limit: pagination.pageSize,
                p: pagination.current,
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
        fetchInstances();
    }, [pagination.current, pagination.pageSize, typeFilter, searchText]);

    // 打开添加弹窗
    const handleAdd = () => {
        setModalType('add');
        setEditingRecord(null);
        form.resetFields();
        form.setFieldsValue({
            db_type: 'mysql',
            port: 3306,
            charset: 'utf8mb4',
            max_connections: 10,
            max_idle_conns: 5,
            is_master: true,
            enabled: true,
        });
        setModalVisible(true);
    };

    // 打开编辑弹窗
    const handleEdit = (record: ArcheryInstance) => {
        setModalType('edit');
        setEditingRecord(record);
        form.setFieldsValue({
            ...record,
            password: '', // 编辑时不显示密码
        });
        setModalVisible(true);
    };

    // 提交表单
    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);
            
            if (modalType === 'add') {
                const res = await addDBInstance(values);
                if (res.err) {
                    message.error(res.err);
                    return;
                }
                message.success(t('add_success'));
            } else if (editingRecord) {
                const res = await updateDBInstance(editingRecord.id, values);
                if (res.err) {
                    message.error(res.err);
                    return;
                }
                message.success(t('update_success'));
            }
            
            setModalVisible(false);
            fetchInstances();
        } catch (error) {
            console.error('Form validation failed:', error);
        } finally {
            setSubmitting(false);
        }
    };

    // 删除实例
    const handleDelete = async (ids: number[]) => {
        try {
            const res = await deleteDBInstances(ids);
            if (res.err) {
                message.error(res.err);
                return;
            }
            message.success(t('delete_success'));
            setSelectedRowKeys([]);
            fetchInstances();
        } catch (error) {
            message.error(t('delete_failed'));
        }
    };

    // 批量删除
    const handleBatchDelete = () => {
        if (selectedRowKeys.length === 0) {
            message.warning(t('select_first'));
            return;
        }
        Modal.confirm({
            title: t('confirm_delete_title'),
            content: t('confirm_delete_content', { count: selectedRowKeys.length }),
            okText: t('confirm'),
            cancelText: t('cancel'),
            okType: 'danger',
            onOk: () => handleDelete(selectedRowKeys as number[]),
        });
    };

    // 健康检查
    const handleHealthCheck = async (record: ArcheryInstance) => {
        try {
            const res = await checkInstanceHealth(record.id);
            if (res.err) {
                message.error(res.err);
            } else {
                message.success(t('health_check_success'));
                fetchInstances();
            }
        } catch (error) {
            message.error(t('health_check_failed'));
        }
    };

    // 数据库类型变化时自动设置默认端口
    const handleDBTypeChange = (value: string) => {
        form.setFieldsValue({ port: DEFAULT_PORTS[value] || 3306 });
    };

    // 表格列定义
    const columns: ColumnsType<ArcheryInstance> = [
        {
            title: t('instance_name'),
            dataIndex: 'instance_name',
            key: 'instance_name',
            width: 180,
            fixed: 'left',
            render: (text) => (
                <Space>
                    <DatabaseOutlined />
                    <span>{text}</span>
                </Space>
            ),
        },
        {
            title: t('db_type'),
            dataIndex: 'db_type',
            key: 'db_type',
            width: 120,
            render: (text) => {
                const typeInfo = DB_TYPES.find(t => t.value === text);
                return <Tag color={typeInfo?.color || 'default'}>{text?.toUpperCase()}</Tag>;
            },
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
            title: t('username'),
            dataIndex: 'username',
            key: 'username',
            width: 120,
        },
        {
            title: t('is_master'),
            dataIndex: 'is_master',
            key: 'is_master',
            width: 100,
            render: (val: boolean) => <Tag color={val ? 'gold' : 'cyan'}>{val ? t('master') : t('slave')}</Tag>,
        },
        {
            title: t('enabled'),
            dataIndex: 'enabled',
            key: 'enabled',
            width: 80,
            render: (val: boolean) => val ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
        },
        {
            title: t('health_status'),
            dataIndex: 'health_status',
            key: 'health_status',
            width: 100,
            render: (val: number) => {
                const statusMap: Record<number, { color: string; text: string }> = {
                    0: { color: 'default', text: t('status_unknown') },
                    1: { color: 'success', text: t('status_healthy') },
                    2: { color: 'error', text: t('status_failed') },
                };
                const status = statusMap[val] || statusMap[0];
                return <Tag color={status.color}>{status.text}</Tag>;
            },
        },
        {
            title: t('description'),
            dataIndex: 'description',
            key: 'description',
            width: 200,
            ellipsis: true,
        },
        {
            title: t('create_at'),
            dataIndex: 'create_at',
            key: 'create_at',
            width: 180,
            render: (val: number) => val ? new Date(val * 1000).toLocaleString() : '-',
        },
        {
            title: t('actions'),
            key: 'actions',
            width: 180,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="link"
                        size="small"
                        icon={<ExclamationCircleOutlined />}
                        onClick={() => handleHealthCheck(record)}
                    >
                        {t('health_check')}
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    >
                        {t('edit')}
                    </Button>
                    <Popconfirm
                        title={t('confirm_delete_single')}
                        onConfirm={() => handleDelete([record.id])}
                        okText={t('confirm')}
                        cancelText={t('cancel')}
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
        <PageLayout title={
            <Space>
                <DatabaseOutlined />
                {t('title')}
            </Space>
        }>
            <div className="dbm-instance-list">
                <Card
                    extra={
                        <Space>
                            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                                {t('add_instance')}
                            </Button>
                            <Button 
                                danger 
                                icon={<DeleteOutlined />} 
                                onClick={handleBatchDelete}
                                disabled={selectedRowKeys.length === 0}
                            >
                                {t('batch_delete')}
                            </Button>
                            <Button icon={<ReloadOutlined />} onClick={fetchInstances}>
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
                                onSearch={(value) => {
                                    setSearchText(value);
                                    setPagination({ ...pagination, current: 1 });
                                }}
                            />
                            <Select
                                style={{ width: 150 }}
                                value={typeFilter}
                                onChange={(value) => {
                                    setTypeFilter(value);
                                    setPagination({ ...pagination, current: 1 });
                                }}
                                placeholder={t('filter_by_type')}
                            >
                                <Option value="all">{t('all_types')}</Option>
                                {DB_TYPES.map((type) => (
                                    <Option key={type.value} value={type.value}>
                                        {type.label}
                                    </Option>
                                ))}
                            </Select>
                        </Space>

                        <Table
                            columns={columns}
                            dataSource={data}
                            loading={loading}
                            rowKey="id"
                            rowSelection={{
                                selectedRowKeys,
                                onChange: setSelectedRowKeys,
                            }}
                            pagination={{
                                current: pagination.current,
                                pageSize: pagination.pageSize,
                                total: total,
                                showSizeChanger: true,
                                showQuickJumper: true,
                                showTotal: (total) => t('total_items', { count: total }),
                                pageSizeOptions: ['10', '20', '50', '100'],
                                onChange: (page, pageSize) => {
                                    setPagination({ current: page, pageSize: pageSize || 20 });
                                },
                            }}
                            scroll={{ x: 1600 }}
                        />
                    </Space>
                </Card>
            </div>

            {/* 添加/编辑弹窗 */}
            <Modal
                title={modalType === 'add' ? t('add_instance') : t('edit_instance')}
                visible={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={handleSubmit}
                confirmLoading={submitting}
                width={600}
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{
                        db_type: 'mysql',
                        port: 3306,
                        charset: 'utf8mb4',
                        max_connections: 10,
                        max_idle_conns: 5,
                        is_master: true,
                        enabled: true,
                    }}
                >
                    <Form.Item
                        name="instance_name"
                        label={t('instance_name')}
                        rules={[{ required: true, message: t('instance_name_required') }]}
                    >
                        <Input placeholder={t('instance_name_placeholder')} />
                    </Form.Item>

                    <Form.Item
                        name="db_type"
                        label={t('db_type')}
                        rules={[{ required: true }]}
                    >
                        <Select onChange={handleDBTypeChange}>
                            {DB_TYPES.map((type) => (
                                <Option key={type.value} value={type.value}>
                                    {type.label}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Space size="middle" style={{ display: 'flex' }}>
                        <Form.Item
                            name="host"
                            label={t('host')}
                            rules={[{ required: true, message: t('host_required') }]}
                            style={{ flex: 2 }}
                        >
                            <Input placeholder={t('host_placeholder')} />
                        </Form.Item>

                        <Form.Item
                            name="port"
                            label={t('port')}
                            rules={[{ required: true, message: t('port_required') }]}
                            style={{ flex: 1 }}
                        >
                            <InputNumber min={1} max={65535} style={{ width: '100%' }} />
                        </Form.Item>
                    </Space>

                    <Space size="middle" style={{ display: 'flex' }}>
                        <Form.Item
                            name="username"
                            label={t('username')}
                            rules={[{ required: true, message: t('username_required') }]}
                            style={{ flex: 1 }}
                        >
                            <Input placeholder={t('username_placeholder')} />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            label={t('password')}
                            rules={modalType === 'add' ? [{ required: true, message: t('password_required') }] : []}
                            style={{ flex: 1 }}
                        >
                            <Input.Password placeholder={modalType === 'edit' ? t('password_placeholder_edit') : t('password_placeholder')} />
                        </Form.Item>
                    </Space>

                    <Form.Item name="charset" label={t('charset')}>
                        <Select>
                            <Option value="utf8mb4">utf8mb4</Option>
                            <Option value="utf8">utf8</Option>
                            <Option value="latin1">latin1</Option>
                        </Select>
                    </Form.Item>

                    <Space size="middle" style={{ display: 'flex' }}>
                        <Form.Item name="max_connections" label={t('max_connections')} style={{ flex: 1 }}>
                            <InputNumber min={1} max={1000} style={{ width: '100%' }} />
                        </Form.Item>

                        <Form.Item name="max_idle_conns" label={t('max_idle_conns')} style={{ flex: 1 }}>
                            <InputNumber min={1} max={100} style={{ width: '100%' }} />
                        </Form.Item>
                    </Space>

                    <Space size="large">
                        <Form.Item name="is_master" label={t('is_master')} valuePropName="checked">
                            <Switch checkedChildren={t('master')} unCheckedChildren={t('slave')} />
                        </Form.Item>

                        <Form.Item name="enabled" label={t('enabled')} valuePropName="checked">
                            <Switch />
                        </Form.Item>
                    </Space>

                    <Form.Item name="description" label={t('description')}>
                        <TextArea rows={3} placeholder={t('description_placeholder')} />
                    </Form.Item>
                </Form>
            </Modal>
        </PageLayout>
    );
};

export default DBMInstanceList;
