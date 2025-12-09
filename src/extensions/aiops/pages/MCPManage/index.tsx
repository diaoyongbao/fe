import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Space, Tag, Modal, Form, Input, message, Spin, Descriptions, Drawer, Empty, Tabs } from 'antd';
import { ReloadOutlined, PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, AppstoreOutlined, UnorderedListOutlined, SettingOutlined } from '@ant-design/icons';
import request from '@/utils/request';

interface Tool {
  name: string;
  description?: string;
  category?: string;
  version?: string;
  parameters?: any;
  available?: boolean;
  init_error?: string | null;
  source?: string;
  tags?: string[];
}

interface MCPServer {
  name: string;
  connected: boolean;
  tools: string[];
  config: any;
}

const MCPManage: React.FC = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'unhealthy' | 'unknown'>('unknown');
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [executeModal, setExecuteModal] = useState<{ visible: boolean; tool?: Tool }>({ visible: false });
  const [executing, setExecuting] = useState(false);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('tools');

  const fetchTools = async () => {
    setLoading(true);
    try {
      const res = await request('/api/custom/v1/tools', { silence: true });
      const data = Array.isArray(res) ? res : (res?.dat || res?.data || []);
      setTools(data);
      if (data.length > 0) setHealthStatus('healthy');
    } catch (err: any) {
      if (err?.data && Array.isArray(err.data)) {
        setTools(err.data);
        setHealthStatus('healthy');
      } else {
        message.error('获取工具列表失败');
        setHealthStatus('unhealthy');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchServers = async () => {
    try {
      const res = await request('/api/custom/v1/mcp-servers', { silence: true });
      setServers(res?.servers || []);
    } catch (err) {
      console.error('获取MCP服务器列表失败', err);
    }
  };

  useEffect(() => {
    fetchTools();
    fetchServers();
  }, []);

  const handleExecute = async (values: { arguments: string }) => {
    if (!executeModal.tool) return;
    setExecuting(true);
    try {
      const args = values.arguments ? JSON.parse(values.arguments) : {};
      const res = await request('/api/custom/v1/tools/execute', {
        method: 'POST',
        data: { tool_name: executeModal.tool.name, arguments: args },
        silence: true,
      });
      const result = res?.result || res?.dat?.result || res;
      if (res?.success !== false) {
        message.success('执行成功');
        Modal.info({ title: '执行结果', content: <pre style={{ maxHeight: 400, overflow: 'auto' }}>{JSON.stringify(result, null, 2)}</pre>, width: 600 });
      } else {
        message.error(res?.error || '执行失败');
      }
    } catch (err: any) {
      message.error(err?.message || '执行失败');
    } finally {
      setExecuting(false);
      setExecuteModal({ visible: false });
      form.resetFields();
    }
  };

  const openToolDetail = (tool: Tool) => {
    setSelectedTool(tool);
    setDrawerVisible(true);
  };

  // 按分类分组工具
  const toolsByCategory = tools.reduce((acc, tool) => {
    const category = tool.category || 'unknown';
    if (!acc[category]) acc[category] = [];
    acc[category].push(tool);
    return acc;
  }, {} as Record<string, Tool[]>);

  const renderToolCard = (tool: Tool) => (
    <Col xs={24} sm={12} md={8} lg={6} key={tool.name}>
      <Card
        hoverable
        size="small"
        onClick={() => openToolDetail(tool)}
        style={{ height: '100%' }}
        actions={[
          <Button
            type="link"
            size="small"
            icon={<PlayCircleOutlined />}
            disabled={!tool.available}
            onClick={(e) => { e.stopPropagation(); setExecuteModal({ visible: true, tool }); }}
          >
            执行
          </Button>
        ]}
      >
        <Card.Meta
          title={
            <Space>
              <span style={{ fontSize: 13 }}>{tool.name}</span>
              {tool.available ? (
                <Tag color="success" style={{ fontSize: 10 }}>可用</Tag>
              ) : (
                <Tag color="error" style={{ fontSize: 10 }}>不可用</Tag>
              )}
            </Space>
          }
          description={
            <div style={{ fontSize: 12, color: '#666', height: 40, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {tool.description || '暂无描述'}
            </div>
          }
        />
        <div style={{ marginTop: 8 }}>
          {tool.source && <Tag style={{ fontSize: 10 }}>{tool.source}</Tag>}
          {tool.tags?.slice(0, 2).map(tag => <Tag key={tag} style={{ fontSize: 10 }}>{tag}</Tag>)}
        </div>
      </Card>
    </Col>
  );

  const renderServerCard = (server: MCPServer) => (
    <Col xs={24} sm={12} md={8} key={server.name}>
      <Card size="small">
        <Card.Meta
          title={
            <Space>
              <SettingOutlined />
              {server.name}
              {server.connected ? (
                <Tag color="success">已连接</Tag>
              ) : (
                <Tag color="error">未连接</Tag>
              )}
            </Space>
          }
          description={`${server.tools?.length || 0} 个工具`}
        />
      </Card>
    </Col>
  );

  return (
    <div style={{ padding: 16 }}>
      <Card
        title={
          <Space>
            <AppstoreOutlined />
            MCP 能力管理
            {healthStatus === 'healthy' && <Tag icon={<CheckCircleOutlined />} color="success">服务正常</Tag>}
            {healthStatus === 'unhealthy' && <Tag icon={<CloseCircleOutlined />} color="error">服务异常</Tag>}
          </Space>
        }
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => { fetchTools(); fetchServers(); }}>
            刷新
          </Button>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <Tabs.TabPane tab={`工具能力 (${tools.length})`} key="tools">
            <Spin spinning={loading}>
              {Object.keys(toolsByCategory).length === 0 ? (
                <Empty description="暂无工具" />
              ) : (
                Object.entries(toolsByCategory).map(([category, categoryTools]) => (
                  <div key={category} style={{ marginBottom: 24 }}>
                    <h4 style={{ marginBottom: 12, color: '#1890ff' }}>
                      <UnorderedListOutlined style={{ marginRight: 8 }} />
                      {category} ({categoryTools.length})
                    </h4>
                    <Row gutter={[12, 12]}>
                      {categoryTools.map(renderToolCard)}
                    </Row>
                  </div>
                ))
              )}
            </Spin>
          </Tabs.TabPane>
          <Tabs.TabPane tab={`MCP 服务器 (${servers.length})`} key="servers">
            <Row gutter={[12, 12]}>
              {servers.map(renderServerCard)}
            </Row>
          </Tabs.TabPane>
        </Tabs>
      </Card>

      {/* 工具详情抽屉 */}
      <Drawer
        title={selectedTool?.name || '工具详情'}
        placement="right"
        width={500}
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        extra={
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            disabled={!selectedTool?.available}
            onClick={() => { setDrawerVisible(false); setExecuteModal({ visible: true, tool: selectedTool! }); }}
          >
            执行
          </Button>
        }
      >
        {selectedTool && (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="名称">{selectedTool.name}</Descriptions.Item>
              <Descriptions.Item label="描述">{selectedTool.description || '-'}</Descriptions.Item>
              <Descriptions.Item label="分类">{selectedTool.category || '-'}</Descriptions.Item>
              <Descriptions.Item label="版本">{selectedTool.version || '-'}</Descriptions.Item>
              <Descriptions.Item label="来源">{selectedTool.source || 'local'}</Descriptions.Item>
              <Descriptions.Item label="状态">
                {selectedTool.available ? (
                  <Tag color="success">可用</Tag>
                ) : (
                  <Tag color="error">不可用</Tag>
                )}
              </Descriptions.Item>
              {selectedTool.init_error && (
                <Descriptions.Item label="错误信息">
                  <span style={{ color: 'red' }}>{selectedTool.init_error}</span>
                </Descriptions.Item>
              )}
              {selectedTool.tags && selectedTool.tags.length > 0 && (
                <Descriptions.Item label="标签">
                  {selectedTool.tags.map(tag => <Tag key={tag}>{tag}</Tag>)}
                </Descriptions.Item>
              )}
            </Descriptions>

            {selectedTool.parameters?.properties && (
              <div style={{ marginTop: 16 }}>
                <h4>参数说明</h4>
                <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 12 }}>
                  {Object.entries(selectedTool.parameters.properties).map(([key, val]: [string, any]) => (
                    <div key={key} style={{ marginBottom: 8 }}>
                      <strong>{key}</strong>
                      {selectedTool.parameters.required?.includes(key) && <Tag color="red" style={{ marginLeft: 4 }}>必填</Tag>}
                      <div style={{ color: '#666', marginLeft: 12 }}>
                        类型: {val.type || 'any'}
                        {val.description && <span> - {val.description}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Drawer>

      {/* 执行工具弹窗 */}
      <Modal
        title={`执行工具: ${executeModal.tool?.name}`}
        visible={executeModal.visible}
        onCancel={() => { setExecuteModal({ visible: false }); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={executing}
        width={600}
      >
        <p style={{ color: '#666', marginBottom: 16 }}>{executeModal.tool?.description}</p>
        {executeModal.tool?.parameters?.properties && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4, fontSize: 12 }}>
            <div style={{ fontWeight: 500, marginBottom: 8 }}>参数说明:</div>
            {Object.entries(executeModal.tool.parameters.properties).map(([key, val]: [string, any]) => (
              <div key={key}>• <b>{key}</b>{executeModal.tool?.parameters?.required?.includes(key) ? ' (必填)' : ''}: {val.description || val.title}</div>
            ))}
          </div>
        )}
        <Form form={form} onFinish={handleExecute} layout="vertical">
          <Form.Item name="arguments" label="参数 (JSON 格式)">
            <Input.TextArea rows={4} placeholder='{"key": "value"}' />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MCPManage;