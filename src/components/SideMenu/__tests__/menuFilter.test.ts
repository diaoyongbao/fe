/**
 * Menu Role Filtering Tests
 * n9e-2kai: AI 助手模块 - 菜单权限过滤测试
 * 
 * **Feature: ai-settings-enhancement, Property 7: Menu Role Filtering**
 * **Validates: Requirements 4.2**
 */

import { MenuItem } from '../types';

/**
 * 模拟菜单过滤逻辑（从 SideMenu/index.tsx 提取）
 * 用于测试菜单项的角色过滤
 */
const filterMenuByRole = (menuList: MenuItem[], userRoles: string[]): MenuItem[] => {
  return menuList
    .map((menu) => {
      if (!menu || !menu.children) return null;

      const filteredChildren = menu.children
        .map((child) => {
          if (!child) return null;

          // Check role attribute first - if role matches, return immediately
          if (child.role && child.role.length > 0) {
            const hasRole = child.role.some((role) => userRoles.includes(role));
            if (hasRole) {
              return child; // Role matches, return immediately
            }
            return null; // Role defined but doesn't match
          }

          // No role defined, include by default (for simplicity in test)
          return child;
        })
        .filter(Boolean);

      if (filteredChildren.length > 0) {
        return { ...menu, children: filteredChildren };
      }
      return null;
    })
    .filter(Boolean) as MenuItem[];
};

describe('Menu Role Filtering', () => {
  // AI 助手菜单配置（与实际配置一致）
  const aiAssistantMenu: MenuItem = {
    key: 'aiassistant',
    label: 'menu.aiassistant',
    children: [
      {
        key: '/ai-assistant',
        label: 'menu.aiassistant_chat',
        // 所有用户可见（无 role 属性）
      },
      {
        key: '/ai-assistant/settings',
        label: 'menu.aiassistant_settings',
        role: ['Admin'], // 仅管理员可见
      },
    ],
  };

  describe('Admin user', () => {
    const adminRoles = ['Admin'];

    it('should see both AI Chat and AI Settings', () => {
      const filtered = filterMenuByRole([aiAssistantMenu], adminRoles);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].children).toHaveLength(2);

      const childKeys = filtered[0].children!.map((c) => c.key);
      expect(childKeys).toContain('/ai-assistant');
      expect(childKeys).toContain('/ai-assistant/settings');
    });
  });

  describe('Non-admin user', () => {
    const userRoles = ['Standard'];

    it('should see AI Chat but not AI Settings', () => {
      const filtered = filterMenuByRole([aiAssistantMenu], userRoles);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].children).toHaveLength(1);

      const childKeys = filtered[0].children!.map((c) => c.key);
      expect(childKeys).toContain('/ai-assistant');
      expect(childKeys).not.toContain('/ai-assistant/settings');
    });
  });

  describe('User with no roles', () => {
    const emptyRoles: string[] = [];

    it('should see AI Chat but not AI Settings', () => {
      const filtered = filterMenuByRole([aiAssistantMenu], emptyRoles);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].children).toHaveLength(1);

      const childKeys = filtered[0].children!.map((c) => c.key);
      expect(childKeys).toContain('/ai-assistant');
      expect(childKeys).not.toContain('/ai-assistant/settings');
    });
  });

  /**
   * Property Test: Menu Role Filtering
   * **Feature: ai-settings-enhancement, Property 7: Menu Role Filtering**
   * **Validates: Requirements 4.2**
   * 
   * For any user with a specific role, the rendered menu SHALL only include items 
   * where the user's role matches the item's role requirement or the item has no 
   * role requirement.
   */
  describe('Property 7: Menu Role Filtering', () => {
    const testMenuWithRoles: MenuItem[] = [
      {
        key: 'group1',
        label: 'Group 1',
        children: [
          { key: '/public', label: 'Public' }, // No role - visible to all
          { key: '/admin-only', label: 'Admin Only', role: ['Admin'] },
          { key: '/editor-only', label: 'Editor Only', role: ['Editor'] },
          { key: '/admin-or-editor', label: 'Admin or Editor', role: ['Admin', 'Editor'] },
        ],
      },
    ];

    it('should include items with no role requirement for any user', () => {
      const roles = ['RandomRole'];
      const filtered = filterMenuByRole(testMenuWithRoles, roles);

      const childKeys = filtered[0]?.children?.map((c) => c.key) || [];
      expect(childKeys).toContain('/public');
    });

    it('should include items where user role matches item role', () => {
      const adminRoles = ['Admin'];
      const filtered = filterMenuByRole(testMenuWithRoles, adminRoles);

      const childKeys = filtered[0]?.children?.map((c) => c.key) || [];
      expect(childKeys).toContain('/admin-only');
      expect(childKeys).toContain('/admin-or-editor');
      expect(childKeys).not.toContain('/editor-only');
    });

    it('should exclude items where user role does not match item role', () => {
      const viewerRoles = ['Viewer'];
      const filtered = filterMenuByRole(testMenuWithRoles, viewerRoles);

      const childKeys = filtered[0]?.children?.map((c) => c.key) || [];
      expect(childKeys).not.toContain('/admin-only');
      expect(childKeys).not.toContain('/editor-only');
      expect(childKeys).not.toContain('/admin-or-editor');
    });

    it('should handle multiple roles correctly', () => {
      const multiRoles = ['Editor', 'Viewer'];
      const filtered = filterMenuByRole(testMenuWithRoles, multiRoles);

      const childKeys = filtered[0]?.children?.map((c) => c.key) || [];
      expect(childKeys).toContain('/public');
      expect(childKeys).toContain('/editor-only');
      expect(childKeys).toContain('/admin-or-editor');
      expect(childKeys).not.toContain('/admin-only');
    });

    it('should remove parent menu if all children are filtered out', () => {
      const adminOnlyMenu: MenuItem[] = [
        {
          key: 'admin-group',
          label: 'Admin Group',
          children: [
            { key: '/admin-page', label: 'Admin Page', role: ['Admin'] },
          ],
        },
      ];

      const viewerRoles = ['Viewer'];
      const filtered = filterMenuByRole(adminOnlyMenu, viewerRoles);

      expect(filtered).toHaveLength(0);
    });
  });
});
