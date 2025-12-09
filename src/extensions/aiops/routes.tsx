import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import loadComp from '@/routers/loadable';

const MCPManage = loadComp(lazy(() => import('./pages/MCPManage')));
const AIChat = loadComp(lazy(() => import('./pages/AIChat')));
const AISettings = loadComp(lazy(() => import('./pages/AISettings')));

export const aiopsRoutes = [
  <Route key="aiops-chat" exact path="/aiops/chat" component={AIChat} />,
  <Route key="aiops-mcp" exact path="/aiops/mcp" component={MCPManage} />,
  <Route key="aiops-settings" path="/aiops/settings" component={AISettings} />,
];