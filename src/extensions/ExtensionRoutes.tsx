/**
 * 扩展路由组件 - 渲染所有扩展注册的路由
 */
import React from 'react';
import { Route } from 'react-router-dom';
import { getExtensionRoutes, RouteConfig } from './loader';

function RouteWithSubRoutes(route: RouteConfig) {
  return (
    <Route
      key={route.path}
      path={route.path}
      exact={route.exact}
      render={(props) => (
        <route.component {...props} routes={route.children} />
      )}
    />
  );
}

export const ExtensionRoutes: React.FC = () => {
  const routes = getExtensionRoutes();

  return (
    <>
      {routes.map((route, i) => (
        <RouteWithSubRoutes key={i} {...route} />
      ))}
    </>
  );
};

export default ExtensionRoutes;
