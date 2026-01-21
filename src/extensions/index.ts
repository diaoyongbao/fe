/**
 * 扩展模块入口
 */
export {
  loadExtensions,
  getExtensionRoutes,
  getExtensionMenuItems,
  getFilteredExtensionMenuItems,
  extensionRequiresPermission,
  getAllExtensionPermissions,
  extensionRegistry
} from './loader';
export { ExtensionRoutes } from './ExtensionRoutes';
export type { ExtensionModule, RouteConfig, MenuItem } from './loader';
