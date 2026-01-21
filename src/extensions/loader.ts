/**
 * 扩展加载器 - 运行时动态加载扩展模块
 * 这个模块负责从 /extensions/ 目录加载扩展 JS 文件
 */

import React from 'react';
import ReactDOM from 'react-dom';
import * as ReactRouterDOM from 'react-router-dom';
import * as antd from 'antd';
import * as icons from '@ant-design/icons';
import * as reactI18next from 'react-i18next';

// 暴露全局变量，供 IIFE 格式的扩展模块使用
(window as any).React = React;
(window as any).ReactDOM = ReactDOM;
(window as any).ReactRouterDOM = ReactRouterDOM;
(window as any).antd = antd;
(window as any).icons = icons;
(window as any).reactI18next = reactI18next;

export interface ExtensionModule {
  id: string;
  name: string;
  version: string;
  routes?: RouteConfig[];
  menuItems?: MenuItem[];
  /**
   * 是否需要权限检查，默认为 true（需要权限检查）
   * 设为 false 时，所有用户都可访问
   */
  requirePermission?: boolean;
  /**
   * 扩展权限点配置
   * 权限点名称应与菜单项的 key 保持一致，以便夜莺权限系统统一管理
   * 例如：菜单 key 为 '/ai-assistant'，则权限点也应为 '/ai-assistant'
   *
   * 注意：权限点需要在后端注册才能在权限管理页面显示
   * 后端注册位置参考：center/cconf/ops.go（或类似权限配置文件）
   */
  permissions?: {
    /** 权限组名称，用于权限管理页面分组显示 */
    groupName: string;
    /** 权限组显示名（中文） */
    groupCname: string;
    /** 权限点列表 */
    ops: {
      /** 权限点名称，应与路由/菜单 key 一致 */
      name: string;
      /** 权限点显示名（中文） */
      cname: string;
    }[];
  };
}

export interface RouteConfig {
  path: string;
  component: React.ComponentType<any>;
  exact?: boolean;
  children?: RouteConfig[];
}

export interface MenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  activeIcon?: React.ReactNode;
  children?: MenuItem[];
  order?: number;
}

// 全局扩展注册表
class ExtensionRegistry {
  private extensions: Map<string, ExtensionModule> = new Map();
  private routes: RouteConfig[] = [];
  private menuItems: MenuItem[] = [];
  private initialized = false;
  private loadPromise: Promise<void> | null = null;

  /**
   * 注册扩展模块
   */
  register(extension: ExtensionModule): void {
    if (this.extensions.has(extension.id)) {
      console.warn(`[ExtensionRegistry] Extension ${extension.id} already registered`);
      return;
    }

    this.extensions.set(extension.id, extension);

    if (extension.routes) {
      this.routes.push(...extension.routes);
    }

    if (extension.menuItems) {
      this.menuItems.push(...extension.menuItems);
    }

    console.log(`[ExtensionRegistry] Registered: ${extension.id} v${extension.version}`);
  }

  /**
   * 获取所有扩展路由
   */
  getAllRoutes(): RouteConfig[] {
    return [...this.routes];
  }

  /**
   * 获取所有扩展菜单项
   */
  getAllMenuItems(): MenuItem[] {
    return [...this.menuItems].sort((a, b) => (a.order || 100) - (b.order || 100));
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 设置初始化状态
   */
  setInitialized(value: boolean): void {
    this.initialized = value;
  }

  /**
   * 获取加载 Promise
   */
  getLoadPromise(): Promise<void> | null {
    return this.loadPromise;
  }

  /**
   * 设置加载 Promise
   */
  setLoadPromise(promise: Promise<void>): void {
    this.loadPromise = promise;
  }

  /**
   * 清空所有注册
   */
  clear(): void {
    this.extensions.clear();
    this.routes = [];
    this.menuItems = [];
    this.initialized = false;
    this.loadPromise = null;
  }

  /**
   * 获取扩展模块信息
   */
  getExtension(id: string): ExtensionModule | undefined {
    return this.extensions.get(id);
  }

  /**
   * 获取所有扩展模块
   */
  getAllExtensions(): ExtensionModule[] {
    return Array.from(this.extensions.values());
  }

  /**
   * 检查扩展是否需要权限
   * @param extensionId 扩展ID
   * @returns true 表示需要权限检查
   */
  requiresPermission(extensionId: string): boolean {
    const ext = this.extensions.get(extensionId);
    return ext?.requirePermission ?? false;
  }

  /**
   * 获取扩展所需权限点名称列表
   * @param extensionId 扩展ID
   * @returns 权限点名称列表
   */
  getPermissionNames(extensionId: string): string[] {
    const ext = this.extensions.get(extensionId);
    if (!ext?.permissions?.ops) return [];
    return ext.permissions.ops.map(op => op.name);
  }

  /**
   * 获取扩展权限配置
   * @param extensionId 扩展ID
   * @returns 权限配置
   */
  getPermissions(extensionId: string): ExtensionModule['permissions'] | undefined {
    const ext = this.extensions.get(extensionId);
    return ext?.permissions;
  }

  /**
   * 根据用户权限过滤扩展菜单项
   * @param userPermissions 用户拥有的权限列表
   * @returns 过滤后的菜单项
   */
  getFilteredMenuItems(userPermissions: string[]): MenuItem[] {
    const allMenus = this.getAllMenuItems();

    return allMenus.filter(menu => {
      // 查找该菜单对应的扩展
      const ext = Array.from(this.extensions.values()).find(e =>
        e.menuItems?.some(m => m.key === menu.key)
      );

      // 如果找不到扩展，默认显示
      if (!ext) {
        return true;
      }

      // 如果扩展不需要权限检查（requirePermission 为 false），则显示
      if (ext.requirePermission === false) {
        return true;
      }

      // 默认需要权限检查（requirePermission 默认为 true）
      // 如果扩展定义了权限点，检查用户是否拥有其中之一
      if (ext.permissions?.ops && ext.permissions.ops.length > 0) {
        return ext.permissions.ops.some(op => userPermissions.includes(op.name));
      }

      // 没有定义权限点但需要权限检查，默认不显示
      return false;
    });
  }

  /**
   * 获取所有扩展声明的权限点（用于后端权限注册参考）
   */
  getAllDeclaredPermissions(): { extensionId: string; permissions: ExtensionModule['permissions'] }[] {
    return Array.from(this.extensions.entries())
      .filter(([_, ext]) => ext.permissions?.ops && ext.permissions.ops.length > 0)
      .map(([id, ext]) => ({
        extensionId: id,
        permissions: ext.permissions,
      }));
  }
}

// 全局单例
export const extensionRegistry = new ExtensionRegistry();

// 暴露给扩展使用的全局注册函数
(window as any).__N9E_EXTENSION_REGISTRY__ = extensionRegistry;

/**
 * 动态加载脚本（ES 模块格式）
 */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // 检查是否已加载
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.type = 'module';  // ES 模块格式
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * 加载所有扩展
 */
export async function loadExtensions(): Promise<void> {
  // 避免重复加载
  if (extensionRegistry.isInitialized()) {
    return;
  }

  const existingPromise = extensionRegistry.getLoadPromise();
  if (existingPromise) {
    return existingPromise;
  }

  const loadPromise = doLoadExtensions();
  extensionRegistry.setLoadPromise(loadPromise);

  try {
    await loadPromise;
    extensionRegistry.setInitialized(true);
    // 触发扩展加载完成事件，通知菜单组件刷新
    window.dispatchEvent(new CustomEvent('n9e-extensions-loaded'));
    console.log('[ExtensionLoader] Extensions loaded, event dispatched');
  } catch (error) {
    console.error('[ExtensionLoader] Failed to load extensions:', error);
  }

  return loadPromise;
}

async function doLoadExtensions(): Promise<void> {
  const basePath = '/extensions';

  try {
    // 尝试加载核心模块
    try {
      await loadScript(`${basePath}/ext-core.js`);
      console.log('[ExtensionLoader] Loaded ext-core.js');
    } catch (e) {
      console.warn('[ExtensionLoader] ext-core.js not found, skipping');
    }

    // 尝试加载 AI Assistant 扩展
    try {
      await loadScript(`${basePath}/ext-ai-assistant.js`);
      console.log('[ExtensionLoader] Loaded ext-ai-assistant.js');
    } catch (e) {
      console.warn('[ExtensionLoader] ext-ai-assistant.js not found, skipping');
    }

    // 等待一小段时间，确保 ES 模块内的代码执行完成
    await new Promise(resolve => setTimeout(resolve, 200));

    // 打印当前注册的扩展信息
    const routes = extensionRegistry.getAllRoutes();
    const menus = extensionRegistry.getAllMenuItems();
    console.log('[ExtensionLoader] Registered routes:', routes.length);
    console.log('[ExtensionLoader] Registered menus:', menus.length, menus);

  } catch (error) {
    console.error('[ExtensionLoader] Error loading extensions:', error);
  }
}

/**
 * 获取扩展路由（用于路由组件）
 */
export function getExtensionRoutes(): RouteConfig[] {
  return extensionRegistry.getAllRoutes();
}

/**
 * 获取扩展菜单项（用于菜单组件）
 */
export function getExtensionMenuItems(): MenuItem[] {
  return extensionRegistry.getAllMenuItems();
}

/**
 * 获取过滤后的扩展菜单项（根据用户权限过滤）
 * @param userPermissions 用户拥有的权限列表
 */
export function getFilteredExtensionMenuItems(userPermissions: string[]): MenuItem[] {
  return extensionRegistry.getFilteredMenuItems(userPermissions);
}

/**
 * 检查扩展是否需要权限检查
 * @param extensionId 扩展ID
 */
export function extensionRequiresPermission(extensionId: string): boolean {
  return extensionRegistry.requiresPermission(extensionId);
}

/**
 * 获取所有扩展声明的权限点（用于后端权限注册参考）
 */
export function getAllExtensionPermissions(): { extensionId: string; permissions: ExtensionModule['permissions'] }[] {
  return extensionRegistry.getAllDeclaredPermissions();
}
