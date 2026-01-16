import React, { useState, useEffect, useMemo } from 'react';
import {
  Row, Col, Card, Table, Tag, Button, Space, Input, Select,
  Modal, message, Form, Tooltip, List
} from 'antd';
import {
  SearchOutlined, ReloadOutlined, FileTextOutlined,
  CheckCircleOutlined, EditOutlined, FireOutlined,
  StopOutlined, WarningOutlined, TrophyOutlined, UserOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';
import PageLayout from '@/components/pageLayout';
import {
  getSlowSQLTrackingList, getSlowSQLTrackingStats, getSlowSQLTrackingTrend,
  updateSlowSQLTrackingStatus, batchUpdateSlowSQLTrackingStatus,
  getSlowSQLWeeklyReport, getCloudRDSList, getCloudRDSOwners,
  getSlowSQLTrackingOwnerStats, getSlowSQLTrackingOwnerLeaderboard,
  getSlowSQLTrackingOwnerTrendsAll,
  SlowSQLStatus, SlowSQLPriority, SlowSQLTracking, SlowSQLTrackingStats, CloudRDSOwner,
  OwnerStats, OwnerLeaderboardItem, OwnerTrendData
} from '@/services/cloudManagement';
import moment from 'moment';
import './index.less';

const { Option } = Select;
const { TextArea } = Input;

export default function SlowSQLTrackingPage() {
  const { t } = useTranslation('cloudManagement');

  // State
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SlowSQLTracking[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<SlowSQLTrackingStats | null>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  // n9e-2kai: 负责人趋势汇总数据
  const [ownerTrendsData, setOwnerTrendsData] = useState<OwnerTrendData[]>([]);
  const [trendViewMode, setTrendViewMode] = useState<'overall' | 'by_owner'>('overall');

  // Filters
  const [filters, setFilters] = useState({
    instance_id: undefined as string | undefined,
    status: undefined as string | undefined,
    priority: undefined as string | undefined,
    owner: undefined as string | undefined,
    query: undefined as string | undefined,
    limit: 10,
    offset: 0,
  });

  // Modals state
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportMarkdown, setReportMarkdown] = useState('');
  const [currentRecord, setCurrentRecord] = useState<SlowSQLTracking | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Form instances
  const [statusForm] = Form.useForm();

  // Instance list for filter
  const [instanceList, setInstanceList] = useState<any[]>([]);
  // RDS 负责人映射
  const [ownerMap, setOwnerMap] = useState<Record<string, CloudRDSOwner>>({});
  // n9e-2kai: 负责人统计和排行榜
  const [ownerStats, setOwnerStats] = useState<OwnerStats[]>([]);
  const [ownerLeaderboard, setOwnerLeaderboard] = useState<OwnerLeaderboardItem[]>([]);
  // 负责人列表（去重）
  const [ownerList, setOwnerList] = useState<string[]>([]);

  // Initial Fetch
  useEffect(() => {
    fetchInstances();
    fetchOwners();
    fetchStats();
    fetchTrend();
    fetchOwnerStats();
    fetchOwnerLeaderboard();
    fetchOwnerTrendsAll();
  }, []);

  // n9e-2kai: 当筛选条件改变时，同时更新趋势数据和统计数据
  useEffect(() => {
    fetchData();
    fetchStats();
    fetchTrend();
  }, [filters.instance_id, filters.owner, filters.status, filters.priority, filters.query, filters.limit, filters.offset]);

  const fetchInstances = async () => {
    try {
      const res = await getCloudRDSList({ limit: 100 });
      setInstanceList(res.dat.list || []);
    } catch (error) {
      console.error(error);
    }
  };

  // 获取 RDS 负责人列表
  const fetchOwners = async () => {
    try {
      const res = await getCloudRDSOwners({ limit: 10000 });
      if (!res.err && res.dat?.list) {
        const map: Record<string, CloudRDSOwner> = {};
        const owners = new Set<string>();
        res.dat.list.forEach((o: CloudRDSOwner) => {
          map[o.instance_id] = o;
          if (o.owner) {
            owners.add(o.owner);
          }
        });
        setOwnerMap(map);
        setOwnerList(Array.from(owners).sort());
      }
    } catch (error) {
      console.error(error);
    }
  };

  // n9e-2kai: 获取负责人统计
  const fetchOwnerStats = async () => {
    try {
      const res = await getSlowSQLTrackingOwnerStats({ week_offset: 0 });
      if (!res.err && res.dat?.list) {
        setOwnerStats(res.dat.list);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // n9e-2kai: 获取负责人排行榜
  const fetchOwnerLeaderboard = async () => {
    try {
      const res = await getSlowSQLTrackingOwnerLeaderboard({ week_offset: 0, limit: 10, sort_by: 'done_count' });
      if (!res.err && res.dat?.list) {
        setOwnerLeaderboard(res.dat.list);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await getSlowSQLTrackingStats({ instance_id: filters.instance_id, owner: filters.owner });
      setStats(res.dat);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTrend = async () => {
    try {
      // n9e-2kai: 支持按负责人筛选趋势数据
      const res = await getSlowSQLTrackingTrend({
        instance_id: filters.instance_id,
        owner: filters.owner
      });
      setTrendData(res.dat.trends || []);
    } catch (error) {
      console.error(error);
    }
  };

  // n9e-2kai: 获取所有负责人趋势汇总数据
  const fetchOwnerTrendsAll = async () => {
    try {
      const res = await getSlowSQLTrackingOwnerTrendsAll({ weeks: 4 });
      if (!res.err && res.dat?.owners) {
        setOwnerTrendsData(res.dat.owners);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getSlowSQLTrackingList(filters);
      setData(res.dat.list || []);
      setTotal(res.dat.total || 0);
    } catch (error: any) {
      message.error(error?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (values: any) => {
    if (!currentRecord) return;
    try {
      await updateSlowSQLTrackingStatus(currentRecord.sql_hash, values);
      message.success(t('Updated successfully'));
      setStatusModalVisible(false);
      fetchData();
      fetchStats();
    } catch (error: any) {
      message.error(error?.message || 'Update failed');
    }
  };

  const handleBatchStatusUpdate = async (status: string) => {
    if (selectedRowKeys.length === 0) return;
    try {
      await batchUpdateSlowSQLTrackingStatus({
        sql_hashes: selectedRowKeys as string[],
        status
      });
      message.success(t('Batch updated successfully'));
      setSelectedRowKeys([]);
      fetchData();
      fetchStats();
    } catch (error: any) {
      message.error(error?.message || 'Batch update failed');
    }
  };




  const handleGenerateReport = async () => {
    try {
      // First generate/ensure report exists
      // If we need parameters for report generation, we might need a small form or default to 'this week'
      // The requirement says "shows Markdown report", so we fetch it.
      // If the API requires generation first, we might need that step.
      // Assuming getSlowSQLWeeklyReport fetches the latest or generates one.
      // The API doc shows `getSlowSQLWeeklyReport` takes optional instance_id.

      const res = await getSlowSQLWeeklyReport({
        instance_id: filters.instance_id
      });
      setReportMarkdown(res.dat.markdown);
      setReportModalVisible(true);
    } catch (error: any) {
      message.error(error?.message || 'Generate report failed');
    }
  };

  const columns = [
    {
      title: t('sql_fingerprint'),
      dataIndex: 'sql_fingerprint',
      key: 'sql_fingerprint',
      width: 200,
      render: (text: string) => (
        <Tooltip title={text}>
          <div style={{
            maxWidth: 200,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: 'monospace',
            cursor: 'pointer'
          }}>
            {text}
          </div>
        </Tooltip>
      )
    },
    {
      title: t('sql_type'),
      dataIndex: 'sql_type',
      key: 'sql_type',
      render: (text: string) => <Tag color="blue">{text}</Tag>
    },
    {
      title: t('status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'default';
        switch (status) {
          case SlowSQLStatus.PENDING: color = 'orange'; break;
          case SlowSQLStatus.URGENT: color = 'red'; break;
          case SlowSQLStatus.OBSERVING: color = 'blue'; break;
          case SlowSQLStatus.OPTIMIZED: color = 'green'; break;
          case SlowSQLStatus.IGNORED: color = 'gray'; break;
        }
        return <Tag color={color}>{t(`status.${status}`)}</Tag>;
      }
    },
    {
      title: t('priority'),
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => {
        let color = 'default';
        switch (priority) {
          case SlowSQLPriority.HIGH: color = 'red'; break;
          case SlowSQLPriority.MEDIUM: color = 'orange'; break;
          case SlowSQLPriority.LOW: color = 'green'; break;
        }
        return <Tag color={color}>{t(`priority.${priority}`)}</Tag>;
      }
    },
    {
      title: t('database'),
      dataIndex: 'database',
      key: 'database',
    },
    {
      title: t('owner'),
      key: 'owner',
      render: (_: any, record: SlowSQLTracking) => {
        // 从 RDS 负责人映射中获取
        const rdsOwner = ownerMap[record.instance_id];
        return rdsOwner?.owner || '-';
      }
    },
    {
      title: t('confidence'),
      dataIndex: 'confidence',
      key: 'confidence',
      sorter: true,
      render: (val: number) => {
        if (!val || val === 0) return '-';
        const percent = (val * 100).toFixed(1);
        let color = 'default';
        if (val >= 0.7) color = 'green';
        else if (val >= 0.4) color = 'orange';
        else color = 'red';
        return <Tag color={color}>{percent}%</Tag>;
      }
    },
    {
      title: t('avg_time'),
      dataIndex: 'avg_time',
      key: 'avg_time',
      sorter: true,
      render: (val: number) => val ? val.toFixed(2) : '-'
    },
    {
      title: t('last_seen'),
      dataIndex: 'last_seen_at',
      key: 'last_seen_at',
      render: (ts: number) => ts ? moment(ts * 1000).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: t('actions'),
      key: 'actions',
      render: (_: any, record: SlowSQLTracking) => (
        <Space>
          <Tooltip title={t('update_status')}>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setCurrentRecord(record);
                statusForm.setFieldsValue({ status: record.status });
                setStatusModalVisible(true);
              }}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  const StatusCard = ({ status, count, icon, title, className }: any) => (
    <Card className={`status-card ${className}`} bordered={false}>
      <div className="stat-content">
        <span className="stat-label">{t(title)}</span>
        <span className="stat-value">{count || 0}</span>
      </div>
      <div className="icon-wrapper">
        {icon}
      </div>
    </Card>
  );

  return (
    <PageLayout title={t('slowsql_tracking')}>
      <div className="slow-sql-tracking-container">
        {/* Status Cards Row */}
        <div className="status-cards-row">
          <Row gutter={[12, 12]}>
            <Col span={5}>
              <StatusCard
                status="pending"
                count={stats?.pending_count}
                icon={<WarningOutlined />}
                title="status.pending"
                className="status-pending"
              />
            </Col>
            <Col span={5}>
              <StatusCard
                status="urgent"
                count={stats?.urgent_count}
                icon={<FireOutlined />}
                title="status.urgent"
                className="status-urgent"
              />
            </Col>
            <Col span={4}>
              <StatusCard
                status="observing"
                count={stats?.observing_count}
                icon={<EyeOutlined />}
                title="status.observing"
                className="status-observing"
              />
            </Col>
            <Col span={5}>
              <StatusCard
                status="optimized"
                count={stats?.optimized_count}
                icon={<CheckCircleOutlined />}
                title="status.optimized"
                className="status-optimized"
              />
            </Col>
            <Col span={5}>
              <StatusCard
                status="ignored"
                count={stats?.ignored_count}
                icon={<StopOutlined />}
                title="status.ignored"
                className="status-ignored"
              />
            </Col>
          </Row>
        </div>

        {/* Summary & Chart Row */}
        <Row gutter={16} className="main-content-row">
          <Col span={6}>
            <div className="summary-cards-row">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Card className="summary-card" bordered={false}>
                    <div className="summary-title">{t('this_week_new')}</div>
                    <div className="summary-value neutral">{stats?.this_week_new || 0}</div>
                    <div className="summary-sub">SQLs</div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card className="summary-card" bordered={false}>
                    <div className="summary-title">{t('this_week_done')}</div>
                    <div className="summary-value positive">{stats?.this_week_done || 0}</div>
                    <div className="summary-sub">SQLs</div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card className="summary-card" bordered={false}>
                    <div className="summary-title">{t('net_change')}</div>
                    <div className={`summary-value ${(stats?.this_week_new || 0) - (stats?.this_week_done || 0) > 0 ? 'negative' : 'positive'}`}>
                      {((stats?.this_week_new || 0) - (stats?.this_week_done || 0)) > 0 ? '+' : ''}
                      {(stats?.this_week_new || 0) - (stats?.this_week_done || 0)}
                    </div>
                    <div className="summary-sub">{t('optimization_trend')}</div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card className="summary-card" bordered={false}>
                    <div className="summary-title">{t('high_priority_pending')}</div>
                    <div className="summary-value negative">{stats?.high_priority_pending || 0}</div>
                    <div className="summary-sub">{t('priority_high')}</div>
                  </Card>
                </Col>
              </Row>
            </div>
          </Col>
          <Col span={12}>
            <Card
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{t('optimization_trend')}</span>
                  <Select
                    size="small"
                    value={trendViewMode}
                    onChange={(val) => setTrendViewMode(val)}
                    style={{ width: 120 }}
                  >
                    <Option value="overall">{t('overall_trend') || '总体趋势'}</Option>
                    <Option value="by_owner">{t('by_owner_trend') || '按负责人'}</Option>
                  </Select>
                </div>
              }
              className="chart-card"
              bordered={false}
            >
              <div style={{ height: 260, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  {trendViewMode === 'overall' ? (
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="week_key" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Line type="monotone" dataKey="new_count" name={t('this_week_new')} stroke="#ff7a45" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="done_count" name={t('this_week_done')} stroke="#52c41a" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  ) : (
                    <LineChart data={(() => {
                      // n9e-2kai: 将负责人趋势数据转换为图表数据格式
                      // 每个周为一个数据点，包含所有负责人的 new_count 和 done_count
                      if (!ownerTrendsData || ownerTrendsData.length === 0) return trendData;

                      // 获取所有周的 key
                      const weekKeys = ownerTrendsData[0]?.trends?.map(t => t.week_key) || [];

                      return weekKeys.map(weekKey => {
                        const dataPoint: any = { week_key: weekKey };
                        ownerTrendsData.forEach(owner => {
                          const weekData = owner.trends?.find(t => t.week_key === weekKey);
                          dataPoint[`${owner.owner}_new`] = weekData?.new_count || 0;
                          dataPoint[`${owner.owner}_done`] = weekData?.done_count || 0;
                        });
                        return dataPoint;
                      });
                    })()}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="week_key" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      {ownerTrendsData.flatMap((owner, index) => {
                        // n9e-2kai: 为每个负责人生成不同颜色的趋势线
                        // 新增用实线，完成用虚线
                        const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];
                        const color = colors[index % colors.length];
                        return [
                          <Line
                            key={`${owner.owner}_new`}
                            type="monotone"
                            dataKey={`${owner.owner}_new`}
                            name={`${owner.owner} 新增`}
                            stroke={color}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                          />,
                          <Line
                            key={`${owner.owner}_done`}
                            type="monotone"
                            dataKey={`${owner.owner}_done`}
                            name={`${owner.owner} 完成`}
                            stroke={color}
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        ];
                      })}
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>
          {/* n9e-2kai: 负责人排行榜 */}
          <Col span={6}>
            <Card
              title={<span><TrophyOutlined style={{ marginRight: 8, color: '#faad14' }} />{t('owner_leaderboard')}</span>}
              className="leaderboard-card"
              bordered={false}
              bodyStyle={{ padding: '12px 16px' }}
            >
              <List
                size="small"
                dataSource={ownerLeaderboard}
                renderItem={(item, index) => (
                  <List.Item
                    style={{ padding: '8px 0', cursor: 'pointer' }}
                    onClick={() => setFilters({ ...filters, owner: item.owner })}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <span style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: index < 3 ? ['#ffd700', '#c0c0c0', '#cd7f32'][index] : '#f0f0f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 8,
                        fontSize: 12,
                        fontWeight: 'bold',
                        color: index < 3 ? '#fff' : '#666'
                      }}>
                        {item.rank}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{item.owner}</div>
                        <div style={{ fontSize: 12, color: '#999' }}>{item.team || '-'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#52c41a', fontWeight: 500 }}>{item.done_count}</div>
                        <div style={{ fontSize: 12, color: '#999' }}>{item.completion_rate.toFixed(1)}%</div>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>

        {/* Filter Row */}
        <div className="filter-row">
          <div className="filter-left">
            <Select
              placeholder={t('instance')}
              style={{ width: 200 }}
              allowClear
              value={filters.instance_id}
              onChange={(val) => setFilters({ ...filters, instance_id: val })}
            >
              {instanceList.map(i => (
                <Option key={i.id} value={i.instance_id}>{i.instance_name}</Option>
              ))}
            </Select>
            {/* n9e-2kai: 负责人筛选下拉框 */}
            <Select
              placeholder={t('owner')}
              style={{ width: 150 }}
              allowClear
              value={filters.owner}
              onChange={(val) => setFilters({ ...filters, owner: val })}
            >
              {ownerList.map(owner => (
                <Option key={owner} value={owner}>{owner}</Option>
              ))}
            </Select>
            <Select
              placeholder={t('status')}
              style={{ width: 150 }}
              allowClear
              onChange={(val) => setFilters({ ...filters, status: val })}
            >
              {Object.values(SlowSQLStatus).map((s: string) => (
                <Option key={s} value={s}>{t(`status.${s}`)}</Option>
              ))}
            </Select>
            <Select
              placeholder={t('priority')}
              style={{ width: 120 }}
              allowClear
              onChange={(val) => setFilters({ ...filters, priority: val })}
            >
              {Object.values(SlowSQLPriority).map((s: string) => (
                <Option key={s} value={s}>{t(`priority.${s}`)}</Option>
              ))}
            </Select>
            <Input
              placeholder={t('sql_fingerprint_search_placeholder')}
              style={{ width: 200 }}
              prefix={<SearchOutlined />}
              onPressEnter={(e) => setFilters({ ...filters, query: e.currentTarget.value })}
            />
            <Button icon={<ReloadOutlined />} onClick={() => fetchData()} />
          </div>
          <div className="filter-right">
            <Button type="primary" icon={<FileTextOutlined />} onClick={handleGenerateReport}>
              {t('weekly_report')}
            </Button>
          </div>
        </div>

        {/* Tracking Table */}
        <div className="table-card">
          <Card bordered={false} bodyStyle={{ padding: 0 }}>
            <Table
              rowSelection={{
                selectedRowKeys,
                onChange: (keys) => setSelectedRowKeys(keys)
              }}
              columns={columns}
              dataSource={data}
              rowKey="sql_hash"
              pagination={{
                total,
                pageSize: filters.limit,
                current: filters.offset / filters.limit + 1,
                onChange: (page, pageSize) => {
                  setFilters({
                    ...filters,
                    limit: pageSize || 10,
                    offset: (page - 1) * (pageSize || 10)
                  });
                }
              }}
              loading={loading}
            />
            {selectedRowKeys.length > 0 && (
              <div style={{ padding: '16px', background: '#f5f5f5', borderTop: '1px solid #e8e8e8' }}>
                <Space>
                  <span>{t('Selected')}: {selectedRowKeys.length}</span>
                  <Button size="small" onClick={() => handleBatchStatusUpdate(SlowSQLStatus.OPTIMIZED)}>
                    {t('Batch Optimize')}
                  </Button>
                  <Button size="small" onClick={() => handleBatchStatusUpdate(SlowSQLStatus.IGNORED)}>
                    {t('Batch Ignore')}
                  </Button>
                </Space>
              </div>
            )}
          </Card>
        </div>

        {/* Update Status Modal */}
        <Modal
          title={t('update_status')}
          visible={statusModalVisible}
          onCancel={() => setStatusModalVisible(false)}
          onOk={() => statusForm.submit()}
        >
          <Form form={statusForm} onFinish={handleStatusUpdate} layout="vertical">
            <Form.Item name="status" label={t('status')} rules={[{ required: true }]}>
              <Select>
                {Object.values(SlowSQLStatus).map((s: string) => (
                  <Option key={s} value={s}>{t(`status.${s}`)}</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="comment" label={t('status_comment')}>
              <TextArea rows={4} />
            </Form.Item>
          </Form>
        </Modal>

        {/* Weekly Report Modal */}
        <Modal
          title={t('weekly_optimization_report')}
          visible={reportModalVisible}
          onCancel={() => setReportModalVisible(false)}
          width={800}
          footer={[
            <Button key="copy" onClick={() => {
              navigator.clipboard.writeText(reportMarkdown);
              message.success(t('copied'));
            }}>
              {t('copy_markdown')}
            </Button>,
            <Button key="close" type="primary" onClick={() => setReportModalVisible(false)}>
              {t('close')}
            </Button>
          ]}
        >
          <div className="slow-sql-report-markdown" style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {reportMarkdown}
            </ReactMarkdown>
          </div>
        </Modal>
      </div>
    </PageLayout>
  );
}
