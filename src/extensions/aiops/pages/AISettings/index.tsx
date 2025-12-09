import React from 'react';
import { Tabs, Card, Empty } from 'antd';
import { useHistory, useLocation } from 'react-router-dom';

const { TabPane } = Tabs;

const AISettings: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const activeKey = location.pathname.split('/').pop() || 'prompts';

  const handleTabChange = (key: string) => {
    history.push(`/aiops/settings/${key}`);
  };

  return (
    <Card title="AI设置">
      <Tabs activeKey={activeKey === 'settings' ? 'prompts' : activeKey} onChange={handleTabChange}>
        <TabPane tab="提示词管理" key="prompts">
          <Empty description="功能开发中..." />
        </TabPane>
        <TabPane tab="模型管理" key="models">
          <Empty description="功能开发中..." />
        </TabPane>
      </Tabs>
    </Card>
  );
};

export default AISettings;