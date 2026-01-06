const zh_CN = {
  title: '中间件数据源',
  name: '名称',
  type: '类型',
  description: '描述',
  address: '地址',
  status: '状态',
  status_enabled: '启用',
  status_disabled: '禁用',
  auth_type: '认证方式',
  health_status: '健康状态',
  health_healthy: '健康',
  health_unhealthy: '不健康',
  health_unknown: '未知',
  created_at: '创建时间',
  created_by: '创建人',
  updated_at: '更新时间',
  updated_by: '更新人',
  
  // 操作
  add: '新建',
  edit: '编辑',
  delete: '删除',
  test_connection: '测试连接',
  export: '导出',
  migrate_archery: '迁移 Archery 配置',
  enable: '启用',
  disable: '禁用',
  batch_enable: '批量启用',
  batch_disable: '批量禁用',
  refresh: '刷新',
  
  // 筛选
  filter_by_type: '按类型筛选',
  filter_by_status: '按状态筛选',
  search_placeholder: '搜索名称或描述',
  all: '全部',
  
  // 表单
  form_basic_info: '基本信息',
  form_connection: '连接配置',
  form_auth: '认证配置',
  form_advanced: '高级配置',
  form_health_check: '健康检查',
  
  name_placeholder: '请输入数据源名称',
  name_required: '请输入数据源名称',
  name_rule: '只能包含字母、数字、下划线和中划线',
  
  type_placeholder: '请选择中间件类型',
  type_required: '请选择中间件类型',
  
  address_placeholder: '请输入中间件地址，如: https://example.com',
  address_required: '请输入中间件地址',
  address_rule: '请输入有效的 URL',
  
  description_placeholder: '请输入描述信息',
  
  timeout: '请求超时(毫秒)',
  timeout_placeholder: '默认 5000',
  connect_timeout: '连接超时(毫秒)',
  connect_timeout_placeholder: '默认 2000',
  insecure_skip_verify: '跳过 SSL 验证',
  
  auth_type_token: 'Token 认证',
  auth_type_basic: 'Basic Auth',
  auth_type_session: 'Session',
  auth_type_oauth2: 'OAuth2',
  auth_type_none: '无需认证',
  
  token: 'Token',
  token_placeholder: '请输入 API Token',
  token_required: '请输入 Token',
  
  username: '用户名',
  username_placeholder: '请输入用户名',
  username_required: '请输入用户名',
  
  password: '密码',
  password_placeholder: '请输入密码',
  password_required: '请输入密码',
  
  header_name: 'Header 名称',
  header_name_placeholder: '默认: Authorization',
  header_prefix: 'Header 前缀',
  header_prefix_placeholder: '默认: Bearer',
  
  login_url: '登录 URL',
  login_url_placeholder: '如: /api/login',
  
  client_id: 'Client ID',
  client_id_placeholder: '请输入 Client ID',
  client_secret: 'Client Secret',
  client_secret_placeholder: '请输入 Client Secret',
  token_url: 'Token URL',
  token_url_placeholder: '请输入 Token URL',
  
  health_check_url: '健康检查 URL',
  health_check_url_placeholder: '如: /api/health/',
  health_check_interval: '检查间隔(秒)',
  health_check_interval_placeholder: '默认 60',
  
  // 中间件类型
  type_archery: 'Archery SQL审核',
  type_jumpserver: 'JumpServer 堡垒机',
  type_jenkins: 'Jenkins CI/CD',
  type_gitlab: 'GitLab 代码仓库',
  type_nacos: 'Nacos 配置中心',
  type_consul: 'Consul 服务发现',
  
  // 消息
  add_success: '创建成功',
  edit_success: '更新成功',
  delete_success: '删除成功',
  delete_confirm_title: '确认删除',
  delete_confirm_content: '确定要删除选中的 {count} 个数据源吗？此操作不可恢复。',
  test_connection_success: '连接测试成功',
  test_connection_failed: '连接测试失败',
  test_connection_testing: '正在测试连接...',
  migrate_success: 'Archery 配置迁移成功',
  migrate_failed: 'Archery 配置迁移失败',
  batch_enable_success: '批量启用成功',
  batch_disable_success: '批量禁用成功',
  select_at_least_one: '请至少选择一条记录',
  
  // 提示
  last_check_time: '最后检查',
  never_checked: '从未检查',
  check_now: '立即检查',
};

export default zh_CN;
