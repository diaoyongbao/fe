import React from 'react';
import { RobotOutlined } from '@ant-design/icons';
import { MenuItem } from '@/components/SideMenu/types';

export const aiopsMenu: MenuItem = {
  key: 'aiops',
  label: 'menu.aiops',
  icon: <RobotOutlined />,
  children: [
    { key: '/aiops/chat', label: 'menu.aiops_chat' },
    { key: '/aiops/mcp', label: 'menu.aiops_mcp' },
    { key: '/aiops/settings', label: 'menu.aiops_settings' },
  ],
};