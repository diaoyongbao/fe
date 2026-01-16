// n9e-2kai: 负责人管理页面
import React, { useState, useEffect } from 'react';
import { Table, Card, Input, Button, Space, message, Modal, Form, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/pageLayout';
import { getCloudStaffList, addCloudStaff, updateCloudStaff, deleteCloudStaff, CloudStaff } from '@/services/cloudManagement';
import './index.less';

const { Search } = Input;

const StaffManagement: React.FC = () => {
    const { t } = useTranslation('cloudManagement');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<CloudStaff[]>([]);
    const [total, setTotal] = useState(0);
    const [searchText, setSearchText] = useState('');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

    // 弹窗
    const [modalVisible, setModalVisible] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [editingStaff, setEditingStaff] = useState<CloudStaff | null>(null);
    const [form] = Form.useForm();

    // 获取列表
    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await getCloudStaffList({
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
        fetchData();
    }, [pagination.current, pagination.pageSize, searchText]);

    // 打开添加弹窗
    const handleAdd = () => {
        setEditingStaff(null);
        form.resetFields();
        setModalVisible(true);
    };

    // 打开编辑弹窗
    const handleEdit = (record: CloudStaff) => {
        setEditingStaff(record);
        form.setFieldsValue({ name: record.name });
        setModalVisible(true);
    };

    // 保存
    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setModalLoading(true);

            if (editingStaff) {
                // 更新
                const res = await updateCloudStaff(editingStaff.id, { name: values.name });
                if (res.err) {
                    message.error(res.err);
                    return;
                }
                message.success(t('update_success'));
            } else {
                // 添加
                const res = await addCloudStaff({ name: values.name });
                if (res.err) {
                    message.error(res.err);
                    return;
                }
                message.success(t('add_success'));
            }

            setModalVisible(false);
            fetchData();
        } catch (error) {
            console.error('Save failed:', error);
        } finally {
            setModalLoading(false);
        }
    };

    // 删除
    const handleDelete = async (id: number) => {
        try {
            const res = await deleteCloudStaff([id]);
            if (res.err) {
                message.error(res.err);
                return;
            }
            message.success(t('delete_success'));
            fetchData();
        } catch (error) {
            message.error(t('delete_failed'));
        }
    };

    // 格式化时间
    const formatTime = (timestamp: number) => {
        if (!timestamp) return '-';
        return new Date(timestamp * 1000).toLocaleString();
    };

    const columns = [
        {
            title: t('staff_name'),
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => (
                <Space>
                    <UserOutlined style={{ color: '#1890ff' }} />
                    <span style={{ fontWeight: 500 }}>{text}</span>
                </Space>
            ),
        },
        {
            title: t('create_time'),
            dataIndex: 'created_at',
            key: 'created_at',
            width: 180,
            render: formatTime,
        },
        {
            title: t('actions'),
            key: 'actions',
            width: 150,
            render: (_: any, record: CloudStaff) => (
                <Space>
                    <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    >
                        {t('edit')}
                    </Button>
                    <Popconfirm
                        title={t('delete_staff_confirm')}
                        onConfirm={() => handleDelete(record.id)}
                    >
                        <Button
                            type="link"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                        >
                            {t('delete')}
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <PageLayout title={<Space><UserOutlined />{t('staff_management')}</Space>}>
            <div className="staff-management-page">
                <Card className="search-filter-card" bodyStyle={{ padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space>
                            <Search
                                placeholder={t('staff_name_placeholder')}
                                value={searchText}
                                onChange={e => setSearchText(e.target.value)}
                                onSearch={() => fetchData()}
                                style={{ width: 250 }}
                                enterButton
                            />
                            <Button icon={<ReloadOutlined />} onClick={fetchData}>
                                {t('refresh')}
                            </Button>
                        </Space>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                            {t('add_staff')}
                        </Button>
                    </div>
                </Card>

                <Card className="data-table-card" bordered={false} bodyStyle={{ padding: 0 }}>
                    <Table
                        rowKey="id"
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
                    />
                </Card>

                {/* 添加/编辑弹窗 */}
                <Modal
                    title={
                        <Space>
                            <UserOutlined />
                            {editingStaff ? t('edit_staff') : t('add_staff')}
                        </Space>
                    }
                    visible={modalVisible}
                    onCancel={() => setModalVisible(false)}
                    onOk={handleSave}
                    confirmLoading={modalLoading}
                    destroyOnClose
                    width={400}
                >
                    <Form form={form} layout="vertical">
                        <Form.Item
                            name="name"
                            label={t('staff_name')}
                            rules={[{ required: true, message: t('staff_name_required') }]}
                        >
                            <Input placeholder={t('staff_name_placeholder')} />
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        </PageLayout>
    );
};

export default StaffManagement;
