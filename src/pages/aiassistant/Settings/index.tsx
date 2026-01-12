/**
 * AI 助手 - 设置页面
 * n9e-2kai: AI 助手模块
 * 整合 LLM 配置、MCP 服务器、模板中心、AI 配置、知识库
 */
import React, { useState, useContext, useEffect } from 'react';
import { Tabs, Space } from 'antd';
import { SettingOutlined, CloudServerOutlined, FileTextOutlined, ToolOutlined, ApiOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { CommonStateContext } from '@/App';
import PageLayout from '@/components/pageLayout';
import LLMSettings from './LLMSettings';
import MCPManagement from '../MCP';
import TemplateCenter from '../Templates';
import AIConfiguration from '../Config';
import KnowledgeSettings from '../Knowledge';
import './index.less';

const { TabPane } = Tabs;

const AISettings: React.FC = () => {
  const { t } = useTranslation('aiassistant');
  const history = useHistory();
  const location = useLocation();
  const { profile } = useContext(CommonStateContext);

  // 权限检查：非管理员重定向到 AI Chat
  useEffect(() => {
    if (profile?.roles && profile.roles.indexOf('Admin') === -1) {
      history.replace('/ai-assistant');
    }
  }, [profile, history]);

  // 从 URL 参数获取当前 tab，默认显示 LLM 配置
  const searchParams = new URLSearchParams(location.search);
  const defaultTab = searchParams.get('tab') || 'llm';
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    history.replace(`/ai-assistant/settings?tab=${key}`);
  };

  // 如果不是管理员，不渲染内容
  if (!profile?.roles || profile.roles.indexOf('Admin') === -1) {
    return null;
  }

  return (
    <PageLayout
      title={
        <Space>
          <SettingOutlined />
          {t('settings_title')}
        </Space>
      }
    >
      <div className="ai-settings-container">
        <Tabs activeKey={activeTab} onChange={handleTabChange} type="card">
          <TabPane
            tab={
              <span>
                <ApiOutlined />
                {t('settings.llm_config')}
              </span>
            }
            key="llm"
          >
            <LLMSettings embedded />
          </TabPane>
          <TabPane
            tab={
              <span>
                <CloudServerOutlined />
                {t('settings.mcp_servers')}
              </span>
            }
            key="mcp"
          >
            <MCPManagement embedded />
          </TabPane>
          <TabPane
            tab={
              <span>
                <FileTextOutlined />
                {t('settings.templates')}
              </span>
            }
            key="templates"
          >
            <TemplateCenter embedded />
          </TabPane>
          <TabPane
            tab={
              <span>
                <ToolOutlined />
                {t('settings.ai_config')}
              </span>
            }
            key="config"
          >
            <AIConfiguration embedded />
          </TabPane>
          <TabPane
            tab={
              <span>
                <DatabaseOutlined />
                {t('settings.knowledge')}
              </span>
            }
            key="knowledge"
          >
            <KnowledgeSettings embedded />
          </TabPane>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default AISettings;
