/**
 * 知识库设置主组件
 * n9e-2kai: AI 助手模块 - 知识库设置
 */
import React, { useState } from 'react';
import { Tabs, Alert, Button, Space, message } from 'antd';
import { DatabaseOutlined, ToolOutlined, SyncOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { reloadKnowledgeConfig } from '@/services/aiassistant';
import ProviderList from './ProviderList';
import ToolList from './ToolList';
import './index.less';

const { TabPane } = Tabs;

interface KnowledgeSettingsProps {
  embedded?: boolean; // 是否嵌入到设置页面
}

const KnowledgeSettings: React.FC<KnowledgeSettingsProps> = ({ embedded = false }) => {
  const { t } = useTranslation('aiassistant');
  const [activeTab, setActiveTab] = useState('providers');
  const [refreshKey, setRefreshKey] = useState(0);
  const [reloading, setReloading] = useState(false);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleReloadConfig = async () => {
    setReloading(true);
    try {
      const res = await reloadKnowledgeConfig();
      if (res.err) {
        message.error(res.err);
      } else {
        message.success(
          t('knowledge.reload_success', {
            providers: res.dat.provider_count,
            tools: res.dat.tool_count,
          })
        );
        handleRefresh();
      }
    } catch (error) {
      message.error(t('knowledge.reload_failed'));
    } finally {
      setReloading(false);
    }
  };

  const containerClass = embedded ? 'knowledge-settings embedded' : 'knowledge-settings';

  return (
    <div className={containerClass}>
      <Alert
        message={t('knowledge.tip_title')}
        description={t('knowledge.tip_description')}
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 16 }}
        action={
          <Button
            type="primary"
            size="small"
            icon={<SyncOutlined spin={reloading} />}
            loading={reloading}
            onClick={handleReloadConfig}
          >
            {t('knowledge.reload_config')}
          </Button>
        }
      />

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane
          tab={
            <span>
              <DatabaseOutlined />
              {t('knowledge.providers_tab')}
            </span>
          }
          key="providers"
        >
          <ProviderList key={`providers-${refreshKey}`} onRefresh={handleRefresh} />
        </TabPane>
        <TabPane
          tab={
            <span>
              <ToolOutlined />
              {t('knowledge.tools_tab')}
              <span style={{ color: '#999', fontSize: 12, marginLeft: 4 }}>({t('knowledge.optional')})</span>
            </span>
          }
          key="tools"
        >
          <ToolList key={`tools-${refreshKey}`} onRefresh={handleRefresh} />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default KnowledgeSettings;
