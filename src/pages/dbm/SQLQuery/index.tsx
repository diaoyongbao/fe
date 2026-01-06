import React, { useState, useEffect, useRef } from 'react';
import { Card, Select, Space, message, Button, Table, Tag, Alert, Tabs, InputNumber, Modal, Input } from 'antd';
import { PlayCircleOutlined, CheckCircleOutlined, DatabaseOutlined, ClearOutlined, FileTextOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ColumnsType } from 'antd/es/table';
import {
    getArcheryInstances,
    executeSQLQuery,
    checkSQL,
    submitSQLWorkflow,
    ArcheryInstance,
    ArcherySQLQueryResult
} from '@/services/dbm';
import './index.less';

const { Option } = Select;
const { TabPane } = Tabs;
const { TextArea } = Input;

const SQLQueryWorkbench: React.FC = () => {
    const { t } = useTranslation('dbm');
    const [loading, setLoading] = useState(false);
    const [instances, setInstances] = useState<ArcheryInstance[]>([]);
    const [selectedInstance, setSelectedInstance] = useState<number | null>(null);
    const [databases, setDatabases] = useState<string[]>([]);
    const [selectedDatabase, setSelectedDatabase] = useState<string>('');
    const [sqlContent, setSqlContent] = useState<string>('');
    const [queryResult, setQueryResult] = useState<ArcherySQLQueryResult | null>(null);
    const [limitNum, setLimitNum] = useState<number>(1000);
    const [activeTab, setActiveTab] = useState<string>('result');
    const [workflowVisible, setWorkflowVisible] = useState(false);
    const [workflowTitle, setWorkflowTitle] = useState<string>('');
    const [workflowDesc, setWorkflowDesc] = useState<string>('');

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
            message.error(t('sqlquery.fetch_instances_failed'));
        }
    };

    useEffect(() => {
        fetchInstances();
    }, []);

    // 实例变化时获取数据库列表(模拟,实际需要API支持)
    useEffect(() => {
        if (selectedInstance) {
            // 这里应该调用获取数据库列表的API
            // 暂时硬编码一些常见数据库
            setDatabases(['information_schema', 'mysql', 'performance_schema', 'sys', 'test']);
        }
    }, [selectedInstance]);

    // 执行SQL查询
    const handleExecuteQuery = async () => {
        if (!selectedInstance) {
            message.warning(t('sqlquery.select_instance_first'));
            return;
        }
        if (!selectedDatabase) {
            message.warning(t('sqlquery.select_database_first'));
            return;
        }
        if (!sqlContent.trim()) {
            message.warning(t('sqlquery.input_sql_first'));
            return;
        }

        setLoading(true);
        setActiveTab('result');
        try {
            const res = await executeSQLQuery({
                instance_id: selectedInstance,
                db_name: selectedDatabase,
                sql_content: sqlContent,
                limit_num: limitNum,
            });

            if (res.err) {
                message.error(res.err);
                return;
            }

            setQueryResult(res.dat);
            if (res.dat.status === 0) {
                message.success(t('sqlquery.execute_success'));
            } else {
                message.error(res.dat.msg || t('sqlquery.execute_failed'));
            }
        } catch (error) {
            message.error(t('sqlquery.execute_failed'));
        } finally {
            setLoading(false);
        }
    };

    // SQL语法检查
    const handleCheckSQL = async () => {
        if (!selectedInstance) {
            message.warning(t('sqlquery.select_instance_first'));
            return;
        }
        if (!selectedDatabase) {
            message.warning(t('sqlquery.select_database_first'));
            return;
        }
        if (!sqlContent.trim()) {
            message.warning(t('sqlquery.input_sql_first'));
            return;
        }

        setLoading(true);
        try {
            const res = await checkSQL({
                instance_id: selectedInstance,
                db_name: selectedDatabase,
                sql_content: sqlContent,
            });

            if (res.err) {
                message.error(res.err);
                return;
            }

            if (res.dat && res.dat.check_result) {
                if (res.dat.check_result === 'success') {
                    message.success(t('sqlquery.syntax_check_success'));
                } else {
                    Modal.warning({
                        title: t('sqlquery.syntax_check_failed'),
                        content: res.dat.error_message || t('sqlquery.syntax_error'),
                    });
                }
            }
        } catch (error) {
            message.error(t('sqlquery.check_failed'));
        } finally {
            setLoading(false);
        }
    };

    // 提交SQL工单
    const handleSubmitWorkflow = async () => {
        if (!workflowTitle.trim()) {
            message.warning(t('sqlquery.input_workflow_title'));
            return;
        }

        try {
            const res = await submitSQLWorkflow({
                instance_id: selectedInstance!,
                db_name: selectedDatabase,
                sql_content: sqlContent,
                title: workflowTitle,
                description: workflowDesc,
            });

            if (res.err) {
                message.error(res.err);
                return;
            }

            message.success(t('sqlquery.workflow_submit_success'));
            setWorkflowVisible(false);
            setWorkflowTitle('');
            setWorkflowDesc('');
        } catch (error) {
            message.error(t('sqlquery.workflow_submit_failed'));
        }
    };

    // 清空编辑器
    const handleClear = () => {
        setSqlContent('');
        setQueryResult(null);
    };

    // 动态生成表格列
    const generateColumns = (): ColumnsType<any> => {
        if (!queryResult || !queryResult.column_list || queryResult.column_list.length === 0) {
            return [];
        }

        return queryResult.column_list.map((col) => ({
            title: col,
            dataIndex: col,
            key: col,
            ellipsis: true,
            width: 150,
        }));
    };

    return (
        <div className="dbm-sql-query-workbench">
            <Card
                title={
                    <Space>
                        <DatabaseOutlined />
                        {t('sqlquery.title')}
                    </Space>
                }
                extra={
                    <Space>
                        <Select
                            style={{ width: 250 }}
                            value={selectedInstance}
                            onChange={setSelectedInstance}
                            placeholder={t('sqlquery.select_instance')}
                        >
                            {instances.map((instance) => (
                                <Option key={instance.id} value={instance.id}>
                                    {instance.instance_name} ({instance.host}:{instance.port})
                                </Option>
                            ))}
                        </Select>
                        <Select
                            style={{ width: 180 }}
                            value={selectedDatabase}
                            onChange={setSelectedDatabase}
                            placeholder={t('sqlquery.select_database')}
                            showSearch
                        >
                            {databases.map((db) => (
                                <Option key={db} value={db}>
                                    {db}
                                </Option>
                            ))}
                        </Select>
                    </Space>
                }
            >
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Alert
                        message={t('sqlquery.tip_title')}
                        description={t('sqlquery.tip_content')}
                        type="warning"
                        showIcon
                    />

                    <Card
                        title={t('sqlquery.sql_editor')}
                        size="small"
                        extra={
                            <Space>
                                <span>{t('sqlquery.limit')}:</span>
                                <InputNumber
                                    min={1}
                                    max={10000}
                                    value={limitNum}
                                    onChange={(val) => setLimitNum(val || 1000)}
                                    style={{ width: 100 }}
                                />
                                <Button icon={<ClearOutlined />} onClick={handleClear}>
                                    {t('sqlquery.clear')}
                                </Button>
                                <Button
                                    icon={<CheckCircleOutlined />}
                                    onClick={handleCheckSQL}
                                    disabled={!selectedInstance || !selectedDatabase || !sqlContent.trim()}
                                >
                                    {t('sqlquery.check_syntax')}
                                </Button>
                                <Button
                                    type="primary"
                                    icon={<PlayCircleOutlined />}
                                    onClick={handleExecuteQuery}
                                    loading={loading}
                                    disabled={!selectedInstance || !selectedDatabase || !sqlContent.trim()}
                                >
                                    {t('sqlquery.execute')}
                                </Button>
                                <Button
                                    icon={<FileTextOutlined />}
                                    onClick={() => setWorkflowVisible(true)}
                                    disabled={!selectedInstance || !selectedDatabase || !sqlContent.trim()}
                                >
                                    {t('sqlquery.submit_workflow')}
                                </Button>
                            </Space>
                        }
                    >
                        <TextArea
                            value={sqlContent}
                            onChange={(e) => setSqlContent(e.target.value)}
                            placeholder={t('sqlquery.sql_placeholder')}
                            rows={10}
                            style={{
                                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                                fontSize: '14px'
                            }}
                        />
                    </Card>

                    <Card title={t('sqlquery.query_result')} size="small">
                        <Tabs activeKey={activeTab} onChange={setActiveTab}>
                            <TabPane tab={t('sqlquery.tab_result')} key="result">
                                {queryResult ? (
                                    <div>
                                        <Space style={{ marginBottom: 16 }}>
                                            <Tag color={queryResult.status === 0 ? 'success' : 'error'}>
                                                {queryResult.status === 0 ? t('sqlquery.status_success') : t('sqlquery.status_failed')}
                                            </Tag>
                                            {queryResult.affected_rows !== undefined && (
                                                <Tag color="blue">
                                                    {t('sqlquery.affected_rows')}: {queryResult.affected_rows}
                                                </Tag>
                                            )}
                                            {queryResult.rows && (
                                                <Tag color="green">
                                                    {t('sqlquery.return_rows')}: {queryResult.rows.length}
                                                </Tag>
                                            )}
                                        </Space>

                                        {queryResult.msg && queryResult.status !== 0 && (
                                            <Alert
                                                message={t('sqlquery.error_message')}
                                                description={queryResult.msg}
                                                type="error"
                                                style={{ marginBottom: 16 }}
                                            />
                                        )}

                                        {queryResult.rows && queryResult.rows.length > 0 ? (
                                            <Table
                                                columns={generateColumns()}
                                                dataSource={queryResult.rows}
                                                rowKey={(record, index) => index?.toString() || '0'}
                                                pagination={{
                                                    showSizeChanger: true,
                                                    showQuickJumper: true,
                                                    showTotal: (total) => t('sqlquery.total_rows', { count: total }),
                                                    defaultPageSize: 50,
                                                    pageSizeOptions: ['20', '50', '100', '200'],
                                                }}
                                                scroll={{ x: 'max-content', y: 400 }}
                                                size="small"
                                            />
                                        ) : queryResult.status === 0 ? (
                                            <Alert message={t('sqlquery.no_result')} type="info" />
                                        ) : null}
                                    </div>
                                ) : (
                                    <Alert message={t('sqlquery.no_query_executed')} type="info" />
                                )}
                            </TabPane>

                            <TabPane tab={t('sqlquery.tab_sql')} key="sql">
                                {queryResult && queryResult.full_sql ? (
                                    <pre style={{
                                        background: '#f5f5f5',
                                        padding: '15px',
                                        borderRadius: '4px',
                                        maxHeight: '400px',
                                        overflow: 'auto'
                                    }}>
                                        {queryResult.full_sql}
                                    </pre>
                                ) : (
                                    <Alert message={t('sqlquery.no_sql')} type="info" />
                                )}
                            </TabPane>
                        </Tabs>
                    </Card>
                </Space>
            </Card>

            {/* 工单提交Modal */}
            <Modal
                title={t('sqlquery.submit_workflow')}
                visible={workflowVisible}
                onOk={handleSubmitWorkflow}
                onCancel={() => setWorkflowVisible(false)}
                okText={t('sqlquery.submit')}
                cancelText={t('sqlquery.cancel')}
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                        <label>{t('sqlquery.workflow_title')}:</label>
                        <TextArea
                            value={workflowTitle}
                            onChange={(e) => setWorkflowTitle(e.target.value)}
                            placeholder={t('sqlquery.workflow_title_placeholder')}
                            rows={2}
                        />
                    </div>
                    <div>
                        <label>{t('sqlquery.workflow_desc')}:</label>
                        <TextArea
                            value={workflowDesc}
                            onChange={(e) => setWorkflowDesc(e.target.value)}
                            placeholder={t('sqlquery.workflow_desc_placeholder')}
                            rows={4}
                        />
                    </div>
                </Space>
            </Modal>
        </div>
    );
};

export default SQLQueryWorkbench;
