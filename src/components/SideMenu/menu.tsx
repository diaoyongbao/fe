import React from 'react';
import { NotificationFilled, RobotOutlined, CloudOutlined } from '@ant-design/icons';

import IconFont from '@/components/IconFont';

import { MenuItem } from './types';
import './locale';

export const getMenuList = (embeddedProductMenu: MenuItem[] = [], hideDeprecatedMenus: boolean = false) => {
  const menu: MenuItem[] = [
    {
      key: 'infrastructure',
      label: 'menu.infrastructure',
      icon: <IconFont type='icon-Menu_Infrastructure' />,
      children: [
        {
          key: 'business_group',
          label: 'menu.business_group',
          type: 'tabs',
          children: [{ key: '/targets', label: 'menu.targets' }],
        },
      ],
    },
    {
      key: 'explorer',
      label: 'menu.explorer',
      icon: <IconFont type='icon-IndexManagement1' />,
      children: [
        {
          key: 'metrics',
          label: 'menu.metrics',
          type: 'tabs',
          children: [
            { key: '/metric/explorer', label: 'menu.metric_explorer' },
            { key: '/metrics-built-in', label: 'menu.metrics_built_in' },
            { key: '/object/explorer', label: 'menu.object_explorer' },
            { key: '/recording-rules', label: 'menu.recording_rules' },
          ],
        },
        {
          key: '/log/explorer',
          label: 'menu.logs_explorer',
        },
        {
          key: 'dashboards',
          label: 'menu.dashboards',
          type: 'tabs',
          children: [{ key: '/dashboards', label: 'menu.dashboards' }],
        },
      ],
    },
    {
      key: 'monitors',
      label: 'menu.monitors',
      icon: <IconFont type='icon-Menu_AlarmManagement' />,
      children: [
        {
          key: 'rules',
          label: 'menu.rules',
          type: 'tabs',
          children: [
            { key: '/alert-rules', label: 'menu.alert_rules' },
            { key: '/alert-mutes', label: 'menu.alert_mutes' },
            { key: '/alert-subscribes', label: 'menu.alert_subscribes' },
          ],
        },
        {
          key: 'job',
          label: 'menu.job',
          type: 'tabs',
          children: [
            { key: '/job-tpls', label: 'menu.job_tpls' },
            { key: '/job-tasks', label: 'menu.job_tasks' },
          ],
        },
        {
          key: 'events',
          label: 'menu.events',
          type: 'tabs',
          children: [
            { key: '/alert-cur-events', label: 'menu.cur_events' },
            { key: '/alert-his-events', role: ['Admin'], label: 'menu.his_events' },
          ],
        },
        {
          key: '/event-pipelines',
          label: 'menu.event_pipeline',
        },
      ],
    },
    {
      key: 'notification',
      label: 'menu.notification',
      icon: <NotificationFilled />,
      children: [
        {
          key: '/notification-rules',
          label: 'menu.notification_rules',
        },
        {
          key: '/notification-channels',
          label: 'menu.notification_channels',
        },
        {
          key: '/notification-templates',
          label: 'menu.notification_templates',
        },
        ...(hideDeprecatedMenus
          ? []
          : [
            {
              key: '/help/notification-settings',
              label: 'menu.notification_settings',
              deprecated: true,
            },
            {
              key: '/help/notification-tpls',
              label: 'menu.notification_tpls',
              deprecated: true,
            },
          ]),
      ],
    },
    {
      key: 'integrations',
      label: 'menu.integrations',
      icon: <IconFont type='icon-shujujicheng' />,
      children: [
        {
          key: '/datasources',
          label: 'menu.data_source',
        },
        {
          key: 'dbm',
          label: 'menu.dbm',
          role: ['Admin'],
          type: 'tabs',
          children: [
            { key: '/dbm', label: 'menu.dbm_instances' },
            { key: '/dbm/sessions', label: 'menu.dbm_sessions' },
            { key: '/dbm/slow-queries', label: 'menu.dbm_slow_queries' },
            { key: '/dbm/sql-query', label: 'menu.dbm_sql_query' },
            { key: '/dbm/uncommitted-trx', label: 'menu.dbm_uncommitted_trx' },
            { key: '/dbm/locks', label: 'menu.dbm_locks' },
            { key: '/dbm/sentinel', label: 'menu.dbm_sentinel' },
            { key: '/dbm/kill-logs', label: 'menu.dbm_kill_logs' },
          ],
        },
        {
          key: '/middleware',
          label: 'menu.middleware',
          role: ['Admin'],
        },
        {
          key: '/components',
          label: 'menu.built_in_components',
        },
        {
          key: '/embedded-products',
          label: 'menu.embedded_products',
        },
        ...embeddedProductMenu,
      ],
    },
    // n9e-2kai: 云服务管理模块 - 独立一级菜单
    // 仅管理员可见
    {
      key: 'cloudManagement',
      label: 'menu.cloud_management',
      icon: <CloudOutlined />,
      role: ['Admin'],
      children: [
        {
          key: 'cloud-resources',
          label: 'menu.cloud_resources',
          type: 'tabs',
          children: [
            { key: '/cloud-management/ecs', label: 'menu.cloud_ecs' },
            { key: '/cloud-management/rds', label: 'menu.cloud_rds' },
          ],
        },
        {
          key: 'cloud-reports',
          label: 'menu.cloud_reports',
          type: 'tabs',
          children: [
            { key: '/cloud-management/slowlog-report', label: 'menu.slowlog_report' },
            { key: '/cloud-management/slowsql-tracking', label: 'menu.slowsql_tracking' },
          ],
        },
        {
          key: 'cloud-settings',
          label: 'menu.cloud_settings',
          type: 'tabs',
          children: [
            { key: '/cloud-management/accounts', label: 'menu.cloud_accounts' },
            { key: '/cloud-management/sync-config', label: 'menu.cloud_sync_config' },
            { key: '/cloud-management/sync-logs', label: 'menu.cloud_sync_logs' },
            { key: '/cloud-management/staff', label: 'menu.cloud_staff' },
          ],
        },
      ],
    },
    // n9e-2kai: AI 助手模块 - 独立一级菜单
    // AI Chat 对所有用户可见，AI 设置仅管理员可见
    {
      key: 'aiassistant',
      label: 'menu.aiassistant',
      icon: <RobotOutlined />,
      children: [
        {
          key: '/ai-assistant',
          label: 'menu.aiassistant_chat',
          // 所有用户可见
        },
        {
          key: '/ai-assistant/settings',
          label: 'menu.aiassistant_settings',
          role: ['Admin'],  // 仅管理员可见
        },
      ],
    },
    {
      key: 'organization',
      label: 'menu.organization',
      icon: <IconFont type='icon-Menu_PersonnelOrganization' />,
      children: [
        {
          key: '/users',
          label: 'menu.users',
        },
        {
          key: '/user-groups',
          label: 'menu.teams',
        },
        {
          key: '/roles',
          label: 'menu.roles',
        },
      ],
    },
    {
      key: 'setting',
      label: 'menu.setting',
      icon: <IconFont type='icon-Menu_SystemInformation' />,
      children: [
        {
          key: '/system/site-settings',
          label: 'menu.site_setting',
        },
        {
          key: '/system/variable-settings',
          label: 'menu.variable_configs',
        },
        {
          key: '/system/sso-settings',
          label: 'menu.sso',
        },
        {
          key: '/system/alerting-engines',
          label: 'menu.alert_servers',
        },
        {
          key: '/system/version',
          label: 'menu.about',
        },
      ],
    },
  ];

  return menu;
};
