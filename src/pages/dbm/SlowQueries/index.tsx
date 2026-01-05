import React, { useState, useEffect } from 'react';
import { Table, Card, Select, Space, message, Button, Modal, Descriptions, Tag, Tabs, Alert } from 'antd';
import { ReloadOutlined, DatabaseOutlined, EyeOutlined, LineChartOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ColumnsType } from 'antd/es/table';
import { 
    getArcheryInstances, 
    getSlowQueries, 
    getSlowQueryDetail,
    ArcheryInstance, 
    ArcherySlowQuery,
    ArcherySlowQueryDetail
} from '@/services/dbm';
import './index.less';

const { Option } = Select;
const { TabPane } = Tabs;

const SlowQueryAnalysis: React.FC = () => {
    const { t } = useTranslation('dbm');
    const [loading, setLoading] = useState(false);
    const [instances, setInstances] = useState<ArcheryInstance[]>([]);
    const [selectedInstance, setSelectedInstance] = useState<number | null>(null);
    const [slowQueries, setSlowQueries] = useState<ArcherySlowQuery[]>([]);
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [currentDetail, setCurrentDetail] = useState<ArcherySlowQueryDetail | null>(null);

    // 获取实例列表
    const fetchInstances = async () => {
        try {
            const res = await getArcheryInstances();
            if (res.err) {
                message.error(res.err);
                return;
            }
            setInstances(res.dat || []);
            if (res.dat && res.dat.length > 0) {
                setSelectedInstance(res.dat[0].id);
            }
        } catch (error) {
            message.error(t('slowquery.fetch_instances_failed'));
        }
    };

    // 获取慢查询列表
    const fetchSlowQueries = async () => {
        if (!selectedInstance) {
            return;
        }
        setLoading(true);
        try {
            const res = await getSlowQueries({ instance_id: selectedInstance });
            if (res.err) {
                message.error(res.err);
                return;
            }
            setSlowQueries(res.dat || []);
        } catch (error) {
            message.error(t('slowquery.fetch_failed'));
        } finally {
            setLoading(false);
        }
    };

    // 查看详情
    const handleViewDetail = async (record: ArcherySlowQuery) => {
        if (!selectedInstance) return;
        
        setDetailVisible(true);
        setDetailLoading(true);
        setCurrentDetail(null);

        try {
            const res = await getSlowQueryDetail(selectedInstance, record.checksum);
            if (res.err) {
                message.error(res.err);
                setDetailVisible(false);
                return;
            }
            setCurrentDetail(res.dat);
        } catch (error) {
            message.error(t('slowquery.fetch_detail_failed'));
            setDetailVisible(false);
        } finally {
            setDetailLoading(false);
        }
    };

    useEffect(() => {
        fetchInstances();
    }, []);

    useEffect(() => {
        if (selectedInstance) {
            fetchSlowQueries();
        }
    }, [selectedInstance]);

    // 格式化时间
    const formatQueryTime = (seconds: number): string => {
        if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
        if (seconds < 60) return `${seconds.toFixed(2)}s`;
        return `${(seconds / 60).toFixed(2)}min`;
    };

    // 表格列定义
    const columns: ColumnsType<ArcherySlowQuery> = [
        {
            title: t('slowquery.fingerprint'),
            dataIndex: 'fingerprint',
            key: 'fingerprint',
            width: 400,
            ellipsis: true,
            render: (text) => <code style={{ fontSize: '12px' }}>{text}</code>,
        },
        {
            title: t('slowquery.query_time_avg'),
            dataIndex: 'query_time_avg',
            key: 'query_time_avg',
            width: 120,
            render: (time) => {
                const color = time > 10 ? 'red' : time > 1 ? 'orange' : 'green';
                return <Tag color={color}>{formatQueryTime(time)}</Tag>;
            },
            sorter: (a, b) => a.query_time_avg - b.query_time_avg,
        },
        {
            title: t('slowquery.query_time_max'),
            dataIndex: 'query_time_max',
            key: 'query_time_max',
            width: 120,
            render: (time) => <Tag color="volcano">{formatQueryTime(time)}</Tag>,
            sorter: (a, b) => a.query_time_max - b.query_time_max,
        },
        {
            title: t('slowquery.rows_examined_avg'),
            dataIndex: 'rows_examined_avg',
            key: 'rows_examined_avg',
            width: 120,
            render: (rows) => {
                const color = rows > 10000 ? 'red' : rows > 1000 ? 'orange' : 'default';
                return <Tag color={color}>{rows.toLocaleString()}</Tag>;
            },
            sorter: (a, b) => a.rows_examined_avg - b.rows_examined_avg,
        },
        {
            title: t('slowquery.rows_sent_avg'),
            dataIndex: 'rows_sent_avg',
            key: 'rows_sent_avg',
            width: 120,
            render: (rows) => rows.toLocaleString(),
        },
        {
            title: t('slowquery.ts_cnt'),
            dataIndex: 'ts_cnt',
            key: 'ts_cnt',
            width: 100,
            render: (cnt) => <Tag>{cnt}</Tag>,
            sorter: (a, b) => a.ts_cnt - b.ts_cnt,
        },
        {
            title: t('slowquery.first_seen'),
            dataIndex: 'first_seen',
            key: 'first_seen',
            width: 180,
        },
        {
            title: t('slowquery.last_seen'),
            dataIndex: 'last_seen',
            key: 'last_seen',
            width: 180,
        },
        {
            title: t('slowquery.actions'),
            key: 'actions',
            width: 120,
            fixed: 'right',
            render: (_, record) => (
                <Button
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => handleViewDetail(record)}
                >
                    {t('slowquery.view_detail')}
                </Button>
            ),
        },
    ];

    return (
        <div className="dbm-slowquery-analysis">
            <Card
                title={
                    <Space>
                        <LineChartOutlined />
                        {t('slowquery.title')}
                    </Space>
                }
                extra={
                    <Space>
                        <Select
                            style={{ width: 250 }}
                            value={selectedInstance}
                            onChange={setSelectedInstance}
                            placeholder={t('slowquery.select_instance')}
                        >
                            {instances.map((instance) => (
                                <Option key={instance.id} value={instance.id}>
                                    {instance.instance_name} ({instance.host}:{instance.port})
                                </Option>
                            ))}
                        </Select>
                        <Button 
                            icon={<ReloadOutlined />} 
                            onClick={fetchSlowQueries}
                            disabled={!selectedInstance}
                        >
                            {t('slowquery.refresh')}
                        </Button>
                    </Space>
                }
            >
                <Alert
                    message={t('slowquery.tip_title')}
                    description={t('slowquery.tip_content')}
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />

                <Table
                    columns={columns}
                    dataSource={slowQueries}
                    loading={loading}
                    rowKey="checksum"
                    pagination={{
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => t('slowquery.total_items', { count: total }),
                        defaultPageSize: 20,
                        pageSizeOptions: ['10', '20', '50', '100'],
                    }}
                    scroll={{ x: 1600 }}
                />
            </Card>

            {/* 详情Modal */}
            <Modal
                title={t('slowquery.detail_title')}
                visible={detailVisible}
                onCancel={() => setDetailVisible(false)}
                footer={null}
                width={1000}
                destroyOnClose
            >
                {detailLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>加载中...</div>
                ) : currentDetail ? (
                    <Tabs defaultActiveKey="1">
                        <TabPane tab={t('slowquery.tab_basic')} key="1">
                            <Descriptions column={2} bordered>
                                <Descriptions.Item label={t('slowquery.query_time_avg')} span={1}>
                                    <Tag color="blue">{formatQueryTime(currentDetail.query_time_avg)}</Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label={t('slowquery.query_time_max')} span={1}>
                                    <Tag color="red">{formatQueryTime(currentDetail.query_time_max)}</Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label={t('slowquery.query_time_min')} span={1}>
                                    <Tag color="green">{formatQueryTime(currentDetail.query_time_min)}</Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label={t('slowquery.ts_cnt')} span={1}>
                                    <Tag>{currentDetail.ts_cnt}</Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label={t('slowquery.rows_examined_avg')} span={1}>
                                    {currentDetail.rows_examined_avg.toLocaleString()}
                                </Descriptions.Item>
                                <Descriptions.Item label={t('slowquery.rows_sent_avg')} span={1}>
                                    {currentDetail.rows_sent_avg.toLocaleString()}
                                </Descriptions.Item>
                                <Descriptions.Item label={t('slowquery.fingerprint')} span={2}>
                                    <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                                        {currentDetail.fingerprint}
                                    </pre>
                                </Descriptions.Item>
                                <Descriptions.Item label={t('slowquery.sample')} span={2}>
                                    <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', maxHeight: '200px', overflow: 'auto' }}>
                                        {currentDetail.sample}
                                    </pre>
                                </Descriptions.Item>
                            </Descriptions>
                        </TabPane>

                        <TabPane tab={t('slowquery.tab_optimization')} key="2">
                            {currentDetail.optimization_advice && currentDetail.optimization_advice.length > 0 ? (
                                <div>
                                    <h4>{t('slowquery.optimization_advice')}</h4>
                                    <ul style={{ lineHeight: '2' }}>
                                        {currentDetail.optimization_advice.map((advice, index) => (
                                            <li key={index}>
                                                <Alert message={advice} type="warning" showIcon style={{ marginBottom: 8 }} />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : (
                                <Alert message={t('slowquery.no_optimization_advice')} type="info" />
                            )}

                            {currentDetail.index_advice && currentDetail.index_advice.length > 0 && (
                                <div style={{ marginTop: 20 }}>
                                    <h4>{t('slowquery.index_advice')}</h4>
                                    <ul style={{ lineHeight: '2' }}>
                                        {currentDetail.index_advice.map((advice, index) => (
                                            <li key={index}>
                                                <Alert message={advice} type="success" showIcon style={{ marginBottom: 8 }} />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </TabPane>

                        <TabPane tab={t('slowquery.tab_explain')} key="3">
                            {currentDetail.explain_result ? (
                                <pre style={{ background: '#f5f5f5', padding: '15px', borderRadius: '4px', maxHeight: '400px', overflow: 'auto' }}>
                                    {JSON.stringify(currentDetail.explain_result, null, 2)}
                                </pre>
                            ) : (
                                <Alert message={t('slowquery.no_explain_result')} type="info" />
                            )}
                        </TabPane>
                    </Tabs>
                ) : null}
            </Modal>
        </div>
    );
};

export default SlowQueryAnalysis;
