import React, { useState, useEffect } from 'react';
import { Table, Card, Input, Select, Tag, Space, message, Button, Modal } from 'antd';
import { ReloadOutlined, PlusOutlined, ApiOutlined, CheckCircleOutlined, CloseCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ColumnsType } from 'antd/es/table';
import {
  getMiddlewareDatasources,
  getMiddlewareTypes,
  deleteMiddlewareDatasources,
  testMiddlewareConnection,
  updateMiddlewareDatasourcesStatus,
  MiddlewareDatasource,
} from '@/services/middleware';
import FormModal from './Form';
import './locale';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;

const MiddlewareManage: React.FC = () => {
  const { t } = useTranslation('middleware');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MiddlewareDatasource[]>([]);
  const [filteredData, setFilteredData] = useState<MiddlewareDatasource[]>([]);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MiddlewareDatasource | undefined>();
  const [testingIds, setTestingIds] = useState<Set<number>>(new Set());

  // 获取数据列表
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getMiddlewareDatasources();
      if (res.err) {
        message.error(res.err);
        return;
      }
      setData(res.dat || []);
      setFilteredData(res.dat || []);
    } catch (error: any) {
      message.error(error.message || t('fetch_failed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 搜索和筛选
  useEffect(() => {
    let filtered = data;

    // 类型筛选
    if (typeFilter !== 'all') {
      filtered = filtered.filter((item) => item.type === typeFilter);
    }

    // 状态筛选
    if (statusFilter !== 'all') {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    // 搜索
    if (searchText) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchText.toLowerCase()) ||
          (item.description && item.description.toLowerCase().includes(searchText.toLowerCase())),
      );
    }

    setFilteredData(filtered);
  }, [data, searchText, typeFilter, statusFilter]);

  // 获取唯一的类型列表
  const types = Array.from(new Set(data.map((item) => item.type)));

  // 测试连接
  const handleTestConnection = async (id: number) => {
    setTestingIds(prev => new Set(prev).add(id));
    try {
      const res = await testMiddlewareConnection(id);
      if (res.err) {
        message.error(`${t('test_connection_failed')}: ${res.err}`);
      } else {
        message.success(t('test_connection_success'));
      }
    } catch (error: any) {
      message.error(`${t('test_connection_failed')}: ${error.message}`);
    } finally {
      setTestingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      // 刷新数据以更新健康状态
      fetchData();
    }
  };

  // 删除
  const handleDelete = (ids: number[]) => {
    Modal.confirm({
      title: t('delete_confirm_title'),
      content: t('delete_confirm_content', { count: ids.length }),
      okText: t('common:btn.confirm'),
      cancelText: t('common:btn.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const res = await deleteMiddlewareDatasources(ids);
          if (res.err) {
            message.error(res.err);
            return;
          }
          message.success(t('delete_success'));
          setSelectedRowKeys([]);
          fetchData();
        } catch (error: any) {
          message.error(error.message);
        }
      },
    });
  };

  // 批量启用/禁用
  const handleBatchUpdateStatus = async (status: string) => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('select_at_least_one'));
      return;
    }
    try {
      const res = await updateMiddlewareDatasourcesStatus(
        selectedRowKeys.map(id => Number(id)),
        status,
      );
      if (res.err) {
        message.error(res.err);
        return;
      }
      message.success(status === 'enabled' ? t('batch_enable_success') : t('batch_disable_success'));
      setSelectedRowKeys([]);
      fetchData();
    } catch (error: any) {
      message.error(error.message);
    }
  };

  // 健康状态标签
  const renderHealthStatus = (status?: string) => {
    if (!status || status === 'unknown') {
      return (
        <Tag icon={<QuestionCircleOutlined />} color="default">
          {t('health_unknown')}
        </Tag>
      );
    }
    if (status === 'healthy') {
      return (
        <Tag icon={<CheckCircleOutlined />} color="success">
          {t('health_healthy')}
        </Tag>
      );
    }
    return (
      <Tag icon={<CloseCircleOutlined />} color="error">
        {t('health_unhealthy')}
      </Tag>
    );
  };

  // 类型标签颜色映射
  const typeColorMap: Record<string, string> = {
    archery: 'blue',
    jumpserver: 'green',
    jenkins: 'orange',
    gitlab: 'purple',
    nacos: 'cyan',
    consul: 'magenta',
  };

  // 表格列定义
  const columns: ColumnsType<MiddlewareDatasource> = [
    {
      title: t('name'),
      dataIndex: 'name',
      key: 'name',
      width: 180,
      fixed: 'left',
      render: (text) => (
        <Space>
          <ApiOutlined />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: t('type'),
      dataIndex: 'type',
      key: 'type',
      width: 130,
      render: (text) => (
        <Tag color={typeColorMap[text] || 'default'}>
          {t(`type_${text}` as any) || text.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: t('address'),
      dataIndex: 'address',
      key: 'address',
      width: 200,
      ellipsis: true,
    },
    {
      title: t('status'),
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status) => (
        <Tag color={status === 'enabled' ? 'success' : 'default'}>
          {t(`status_${status}` as any)}
        </Tag>
      ),
    },
    {
      title: t('health_status'),
      dataIndex: 'health_status',
      key: 'health_status',
      width: 120,
      render: (status) => renderHealthStatus(status),
    },
    {
      title: t('description'),
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
    },
    {
      title: t('updated_at'),
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 160,
      render: (time) => (time ? dayjs.unix(time).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: t('common:table.operations'),
      key: 'operations',
      fixed: 'right',
      width: 220,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            loading={testingIds.has(record.id!)}
            onClick={() => handleTestConnection(record.id!)}
          >
            {t('test_connection')}
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setEditingRecord(record);
              setModalVisible(true);
            }}
          >
            {t('common:btn.edit')}
          </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={() => handleDelete([record.id!])}
          >
            {t('common:btn.delete')}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="middleware-manage">
      <Card
        title={
          <Space>
            <ApiOutlined />
            {t('title')}
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchData}
            >
              {t('refresh')}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingRecord(undefined);
                setModalVisible(true);
              }}
            >
              {t('add')}
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* 筛选区域 */}
          <Space wrap>
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
              <Option value="all">{t('all')}</Option>
              {types.map((type) => (
                <Option key={type} value={type}>
                  {t(`type_${type}` as any) || type.toUpperCase()}
                </Option>
              ))}
            </Select>
            <Select
              style={{ width: 150 }}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder={t('filter_by_status')}
            >
              <Option value="all">{t('all')}</Option>
              <Option value="enabled">{t('status_enabled')}</Option>
              <Option value="disabled">{t('status_disabled')}</Option>
            </Select>
          </Space>

          {/* 批量操作 */}
          {selectedRowKeys.length > 0 && (
            <Space>
              <span>
                已选择 {selectedRowKeys.length} 项
              </span>
              <Button
                size="small"
                onClick={() => handleBatchUpdateStatus('enabled')}
              >
                {t('batch_enable')}
              </Button>
              <Button
                size="small"
                onClick={() => handleBatchUpdateStatus('disabled')}
              >
                {t('batch_disable')}
              </Button>
              <Button
                size="small"
                danger
                onClick={() => handleDelete(selectedRowKeys.map(id => Number(id)))}
              >
                {t('common:btn.batch_delete')}
              </Button>
            </Space>
          )}

          {/* 表格 */}
          <Table
            columns={columns}
            dataSource={filteredData}
            loading={loading}
            rowKey="id"
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
              defaultPageSize: 20,
              pageSizeOptions: ['10', '20', '50', '100'],
            }}
            scroll={{ x: 1400 }}
          />
        </Space>
      </Card>

      {/* 创建/编辑模态框 */}
      {modalVisible && (
        <FormModal
          visible={modalVisible}
          editingRecord={editingRecord}
          onCancel={() => {
            setModalVisible(false);
            setEditingRecord(undefined);
          }}
          onSuccess={() => {
            setModalVisible(false);
            setEditingRecord(undefined);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

export default MiddlewareManage;
