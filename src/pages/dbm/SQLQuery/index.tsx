import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Select, Space, message, Button, Table, Alert, Tabs, InputNumber, Modal, Input, Tree, Tooltip, Tag, Spin, Empty, Layout } from 'antd';
import { PlayCircleOutlined, CheckCircleOutlined, DatabaseOutlined, ClearOutlined, FileTextOutlined, TableOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ColumnsType } from 'antd/es/table';
import {
    getArcheryInstances,
    getInstanceDatabases,
    executeSQLQuery,
    checkSQL,
    submitSQLWorkflow,
    getInstanceTables,
    getTableColumns,
    TableInfo,
    ColumnInfo,
    ArcherySQLQueryResult
} from '@/services/dbm';
import PageLayout from '@/components/pageLayout';
import { useDBMContext } from '../context';
import './index.less';

const { Option } = Select;
const { TabPane } = Tabs;
const { TextArea } = Input;
const { Sider, Content } = Layout;

const SQLQueryWorkbench: React.FC = () => {
    const { t } = useTranslation('dbm');
    const { state, setSelectedInstanceId, setInstances, setSqlQueryState } = useDBMContext();
    
    const [loading, setLoading] = useState(false);
    const [databases, setDatabases] = useState<string[]>([]);
    const [queryResult, setQueryResult] = useState<ArcherySQLQueryResult | null>(null);
    const [activeTab, setActiveTab] = useState<string>('result');
    const [workflowVisible, setWorkflowVisible] = useState(false);
    const [workflowTitle, setWorkflowTitle] = useState<string>('');
    const [workflowDesc, setWorkflowDesc] = useState<string>('');

    // Tables Sidebar State
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [tableColumns, setTableColumns] = useState<Record<string, ColumnInfo[]>>({});
    const [loadingTables, setLoadingTables] = useState(false);
    const [tablesFilter, setTablesFilter] = useState('');
    const textAreaRef = useRef<any>(null);

    // 从 Context 读取状态
    const selectedInstance = state.selectedInstanceId;
    const instances = state.instances;
    const { selectedDatabase, sqlContent, limitNum } = state.sqlQuery;

    // 获取实例列表
    const fetchInstances = async () => {
        try {
            const res = await getArcheryInstances();
            if (res.err) {
                message.error(res.err);
                return;
            }
            const list = res.dat?.list || [];
            setInstances(list);
            // 如果没有选中实例且有实例列表，选中第一个
            if (!selectedInstance && list.length > 0) {
                setSelectedInstanceId(list[0].id);
            }
        } catch (error) {
            message.error(t('sqlquery.fetch_instances_failed'));
        }
    };

    // 获取数据库列表
    const fetchDatabases = async (instanceId: number) => {
        try {
            const res = await getInstanceDatabases(instanceId);
            if (res.err) {
                message.error(res.err);
                setDatabases([]);
                return;
            }
            setDatabases(res.dat || []);
        } catch (error) {
            message.error(t('sqlquery.fetch_databases_failed'));
            setDatabases([]);
        }
    };

    // 获取表列表
    const fetchTables = async (instanceId: number, dbName: string) => {
        if (!instanceId || !dbName) return;
        setLoadingTables(true);
        try {
            const res = await getInstanceTables(instanceId, dbName);
            if (res.err) {
                message.error(res.err);
                setTables([]);
            } else {
                setTables(res.dat || []);
            }
        } catch (error) {
            console.error(error);
            message.error('Failed to fetch tables');
        } finally {
            setLoadingTables(false);
        }
    };

    useEffect(() => {
        if (instances.length === 0) {
            fetchInstances();
        }
    }, []);

    // 当选择实例变化时，获取数据库列表
    useEffect(() => {
        if (selectedInstance) {
            fetchDatabases(selectedInstance);
        } else {
            setDatabases([]);
            setTables([]);
        }
    }, [selectedInstance]);

    // 当数据库变化时，获取表列表
    useEffect(() => {
        if (selectedInstance && selectedDatabase) {
            fetchTables(selectedInstance, selectedDatabase);
            setTableColumns({}); // Clear columns cache when DB changes
        } else {
            setTables([]);
            setTableColumns({});
        }
    }, [selectedInstance, selectedDatabase]);

    // 实例变化处理
    const handleInstanceChange = (id: number) => {
        setSelectedInstanceId(id);
        setSqlQueryState({ selectedDatabase: '' }); // 重置数据库选择
    };

    // 数据库变化处理
    const handleDatabaseChange = (db: string) => {
        setSqlQueryState({ selectedDatabase: db });
    };

    // SQL 内容变化处理
    const handleSqlChange = (value: string) => {
        setSqlQueryState({ sqlContent: value });
    };

    // 插入文本到编辑器
    const insertToEditor = (text: string) => {
        const textarea = textAreaRef.current?.resizableTextArea?.textArea;
        if (!textarea) {
            // Fallback if ref is not working
            handleSqlChange(sqlContent + text);
            return;
        }

        const { selectionStart, selectionEnd, value } = textarea;
        const newValue = value.substring(0, selectionStart) + text + value.substring(selectionEnd);
        
        handleSqlChange(newValue);
        
        // Restore focus and cursor position
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(selectionStart + text.length, selectionStart + text.length);
        }, 0);
    };

    // Limit 变化处理
    const handleLimitChange = (value: number | null) => {
        setSqlQueryState({ limitNum: value || 1000 });
    };

    // 执行SQL查询
    const handleExecuteQuery = async () => {
        if (!selectedInstance) {
            message.warning(t('sqlquery.select_instance_first'));
            return;
        }
        if (!sqlContent.trim()) {
            message.warning(t('sqlquery.input_sql_first'));
            return;
        }

        setLoading(true);
        try {
            const res = await executeSQLQuery({
                instance_id: selectedInstance,
                db_name: selectedDatabase || '',
                sql_content: sqlContent.trim(),
                limit_num: limitNum,
            });

            if (res.err) {
                setQueryResult({
                    rows: [],
                    column_list: [],
                    affected_rows: 0,
                    full_sql: sqlContent,
                    status: 1,
                    msg: res.err,
                    error: res.err,
                });
                setActiveTab('messages');
                message.error(res.err);
                return;
            }

            setQueryResult(res.dat);
            setActiveTab('result');
            if (res.dat?.status === 0) {
                message.success(t('sqlquery.execute_success'));
            } else if (res.dat?.error) {
                message.error(res.dat.error);
                setActiveTab('messages');
            }
        } catch (error: any) {
            setQueryResult({
                rows: [],
                column_list: [],
                affected_rows: 0,
                full_sql: sqlContent,
                status: 1,
                msg: error?.message || t('sqlquery.execute_failed'),
                error: error?.message || t('sqlquery.execute_failed'),
            });
            setActiveTab('messages');
            message.error(t('sqlquery.execute_failed'));
        } finally {
            setLoading(false);
        }
    };

    // SQL语法检查
    const handleCheckSQL = async () => {
        if (!selectedInstance || !sqlContent.trim()) {
            message.warning(t('sqlquery.please_input_sql'));
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

            if (res.dat?.is_ok) {
                message.success(t('sqlquery.check_passed'));
            } else {
                message.warning(res.dat?.msg || t('sqlquery.check_warning'));
            }
        } catch (error) {
            message.error(t('sqlquery.check_failed'));
        } finally {
            setLoading(false);
        }
    };

    // 提交工单
    const handleSubmitWorkflow = async () => {
        if (!workflowTitle.trim()) {
            message.warning(t('sqlquery.workflow_title_required'));
            return;
        }

        try {
            const res = await submitSQLWorkflow({
                instance_id: selectedInstance!,
                db_name: selectedDatabase,
                sql_content: sqlContent,
                workflow_name: workflowTitle,
                demand_url: workflowDesc,
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

    // 清空
    const handleClear = () => {
        setSqlQueryState({ sqlContent: '' });
        setQueryResult(null);
    };

    // 动态生成结果表格列
    const getResultColumns = (): ColumnsType<any> => {
        if (!queryResult?.column_list || queryResult.column_list.length === 0) {
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

    // Tree Load Data
    const onLoadData = ({ key }: any) => {
        return new Promise<void>(async (resolve) => {
            const tableName = key as string;
            if (tableColumns[tableName]) {
                resolve();
                return;
            }
            try {
                const res = await getTableColumns(selectedInstance!, selectedDatabase, tableName);
                if (res.dat) {
                    setTableColumns(prev => ({ ...prev, [tableName]: res.dat }));
                }
            } catch (e) {
                console.error(e);
            }
            resolve();
        });
    };

    // Tree Data Construction
    const treeData = useMemo(() => {
        return tables
            .filter(t => t.name.toLowerCase().includes(tablesFilter.toLowerCase()))
            .map(table => {
                const cols = tableColumns[table.name];
                return {
                    title: (
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', paddingRight: 8 }}>
                            <Tooltip title={table.comment}>
                                <span style={{ fontFamily: 'monospace', marginRight: 8 }}>{table.name}</span>
                            </Tooltip>
                            <span style={{ color: '#999', fontSize: '12px', transform: 'scale(0.9)' }}>{table.rows > 1000 ? (table.rows / 1000).toFixed(1) + 'k' : table.rows}</span>
                        </div>
                    ),
                    key: table.name,
                    isLeaf: false,
                    icon: <TableOutlined />,
                    children: cols ? cols.map(col => ({
                        title: (
                            <Space size={4} style={{ fontSize: '12px' }}>
                                <span style={{ fontFamily: 'monospace' }}>{col.name}</span>
                                <span style={{ color: '#999', transform: 'scale(0.9)' }}>{col.type}</span>
                                {col.key === 'PRI' && <Tag color="blue" style={{ margin: 0, lineHeight: '12px', fontSize: '10px', padding: '0 2px' }}>PK</Tag>}
                            </Space>
                        ),
                        key: `${table.name}.${col.name}`,
                        isLeaf: true,
                        selectable: true
                    })) : undefined
                };
            });
    }, [tables, tablesFilter, tableColumns]);

    return (
        <PageLayout title={
            <Space>
                <DatabaseOutlined />
                {t('sqlquery.title')}
            </Space>
        }>
            <div className="dbm-sql-query-workbench">
                <div className="dbm-sql-query-container">
                    {/* Left Sidebar: Tables */}
                    <div className="dbm-sql-query-sidebar">
                        <div className="sidebar-header">
                            <Input 
                                placeholder={t('sqlquery.search_tables') || "Search Tables..."} 
                                prefix={<SearchOutlined />} 
                                size="small"
                                allowClear
                                value={tablesFilter}
                                onChange={e => setTablesFilter(e.target.value)}
                            />
                            <Tooltip title={t('sqlquery.refresh_tables') || "Refresh"}>
                                <Button 
                                    type="text" 
                                    size="small" 
                                    icon={<ReloadOutlined />} 
                                    onClick={() => fetchTables(selectedInstance!, selectedDatabase)}
                                    disabled={!selectedInstance || !selectedDatabase}
                                />
                            </Tooltip>
                        </div>
                        <div className="sidebar-content">
                            {loadingTables ? (
                                <div style={{ textAlign: 'center', padding: 20 }}>
                                    <Spin size="small" />
                                </div>
                            ) : tables.length === 0 ? (
                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('sqlquery.no_tables')} />
                            ) : (
                                <Tree
                                    treeData={treeData}
                                    loadData={onLoadData}
                                    showIcon
                                    blockNode
                                    onDoubleClick={(e, node) => {
                                        // Handle double click to insert
                                        let text = node.key as string;
                                        if (text.includes('.')) {
                                            // It's a column: table.col -> insert col
                                            text = text.split('.')[1];
                                        }
                                        insertToEditor(text);
                                    }}
                                    height={500} // Virtual scroll for performance
                                    style={{ background: 'transparent' }}
                                />
                            )}
                        </div>
                    </div>

                    {/* Right Main Content */}
                    <div className="dbm-sql-query-main">
                        <Card
                            extra={
                                <Space>
                                    <Select
                                        style={{ width: 250 }}
                                        value={selectedInstance}
                                        onChange={handleInstanceChange}
                                        placeholder={t('sqlquery.select_instance')}
                                    >
                                        {instances.map((instance) => (
                                            <Option key={instance.id} value={instance.id}>
                                                {instance.instance_name} ({instance.host}:{instance.port})
                                            </Option>
                                        ))}
                                    </Select>
                                    <Select
                                        style={{ width: 150 }}
                                        value={selectedDatabase}
                                        onChange={handleDatabaseChange}
                                        placeholder={t('sqlquery.select_database')}
                                        allowClear
                                        showSearch
                                    >
                                        {databases.map((db) => (
                                            <Option key={db} value={db}>
                                                {db}
                                            </Option>
                                        ))}
                                    </Select>
                                    <span>{t('sqlquery.limit')}:</span>
                                    <InputNumber
                                        min={1}
                                        max={10000}
                                        value={limitNum}
                                        onChange={handleLimitChange}
                                        style={{ width: 100 }}
                                    />
                                </Space>
                            }
                            bodyStyle={{ padding: 0 }} // Remove default padding to handle inner layout better
                        >
                            <div style={{ padding: '24px' }}>
                                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                    {/* SQL 输入区域 */}
                                    <div>
                                        <TextArea
                                            ref={textAreaRef}
                                            value={sqlContent}
                                            onChange={(e) => handleSqlChange(e.target.value)}
                                            placeholder={t('sqlquery.sql_placeholder')}
                                            rows={8}
                                            style={{ fontFamily: 'monospace' }}
                                        />
                                    </div>

                                    {/* 操作按钮 */}
                                    <Space>
                                        <Button
                                            type="primary"
                                            icon={<PlayCircleOutlined />}
                                            onClick={handleExecuteQuery}
                                            loading={loading}
                                        >
                                            {t('sqlquery.execute')}
                                        </Button>
                                        <Button
                                            icon={<CheckCircleOutlined />}
                                            onClick={handleCheckSQL}
                                            loading={loading}
                                        >
                                            {t('sqlquery.check')}
                                        </Button>
                                        <Button
                                            icon={<FileTextOutlined />}
                                            onClick={() => setWorkflowVisible(true)}
                                            disabled={!sqlContent.trim()}
                                        >
                                            {t('sqlquery.submit_workflow')}
                                        </Button>
                                        <Button icon={<ClearOutlined />} onClick={handleClear}>
                                            {t('sqlquery.clear')}
                                        </Button>
                                    </Space>

                                    {/* 结果展示区域 */}
                                    <Tabs activeKey={activeTab} onChange={setActiveTab}>
                                        <TabPane tab={t('sqlquery.tab_result')} key="result">
                                            {queryResult ? (
                                                <div>
                                                    <Alert
                                                        message={
                                                            <Space>
                                                                <span>{t('sqlquery.affected_rows')}: {queryResult.affected_rows}</span>
                                                                <span>|</span>
                                                                <span>{t('sqlquery.query_time')}: {queryResult.query_time}s</span>
                                                            </Space>
                                                        }
                                                        type="info"
                                                        style={{ marginBottom: 16 }}
                                                    />
                                                    <Table
                                                        columns={getResultColumns()}
                                                        dataSource={queryResult.rows?.map((row, idx) => ({ ...row, _key: idx })) || []}
                                                        rowKey="_key"
                                                        pagination={{
                                                            showSizeChanger: true,
                                                            showQuickJumper: true,
                                                            defaultPageSize: 20,
                                                        }}
                                                        scroll={{ x: 'max-content' }}
                                                        size="small"
                                                    />
                                                </div>
                                            ) : (
                                                <Alert message={t('sqlquery.no_result')} type="info" />
                                            )}
                                        </TabPane>
                                        <TabPane tab={t('sqlquery.tab_messages')} key="messages">
                                            {queryResult?.error ? (
                                                <Alert message={queryResult.error} type="error" />
                                            ) : (
                                                <Alert message={t('sqlquery.no_messages')} type="info" />
                                            )}
                                        </TabPane>
                                    </Tabs>
                                </Space>
                            </div>
                        </Card>

                        {/* 提交工单弹窗 */}
                        <Modal
                            title={t('sqlquery.submit_workflow')}
                            visible={workflowVisible}
                            onOk={handleSubmitWorkflow}
                            onCancel={() => setWorkflowVisible(false)}
                            okText={t('sqlquery.submit')}
                            cancelText={t('sessions.cancel')}
                        >
                            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                <div>
                                    <div style={{ marginBottom: 8 }}>{t('sqlquery.workflow_title')}</div>
                                    <Input
                                        value={workflowTitle}
                                        onChange={(e) => setWorkflowTitle(e.target.value)}
                                        placeholder={t('sqlquery.workflow_title_placeholder')}
                                    />
                                </div>
                                <div>
                                    <div style={{ marginBottom: 8 }}>{t('sqlquery.workflow_desc')}</div>
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
                </div>
            </div>
        </PageLayout>
    );
};

export default SQLQueryWorkbench;
