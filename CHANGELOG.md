# Changelog

## [2025-12-08]

### Changed
- 重构 AI 功能菜单结构：
  - 新增 `/aiops/settings` 路由，统一管理提示词和模型设置
  - 创建 AISettings 页面，包含提示词管理和模型管理两个 Tab
  - 去除角色管理功能入口
  - 更新菜单配置和国际化文件
  - 删除不需要的页面文件夹：AIModels、AIPrompts、AIRoles
- AI Chat 优化：
  - 新增欢迎语，展示当前支持的能力（K8s管理、Ansible自动化、Redis运维）
  - 简化为单一"运维助手"角色，后续从接口获取角色能力