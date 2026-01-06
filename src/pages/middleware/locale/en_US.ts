const en_US = {
  title: 'Middleware Datasources',
  name: 'Name',
  type: 'Type',
  description: 'Description',
  address: 'Address',
  status: 'Status',
  status_enabled: 'Enabled',
  status_disabled: 'Disabled',
  auth_type: 'Authentication Type',
  health_status: 'Health Status',
  health_healthy: 'Healthy',
  health_unhealthy: 'Unhealthy',
  health_unknown: 'Unknown',
  created_at: 'Created At',
  created_by: 'Created By',
  updated_at: 'Updated At',
  updated_by: 'Updated By',
  
  // Actions
  add: 'Add',
  edit: 'Edit',
  delete: 'Delete',
  test_connection: 'Test Connection',
  export: 'Export',
  migrate_archery: 'Migrate Archery Config',
  enable: 'Enable',
  disable: 'Disable',
  batch_enable: 'Batch Enable',
  batch_disable: 'Batch Disable',
  refresh: 'Refresh',
  
  // Filters
  filter_by_type: 'Filter by Type',
  filter_by_status: 'Filter by Status',
  search_placeholder: 'Search name or description',
  all: 'All',
  
  // Form
  form_basic_info: 'Basic Information',
  form_connection: 'Connection Settings',
  form_auth: 'Authentication',
  form_advanced: 'Advanced Settings',
  form_health_check: 'Health Check',
  
  name_placeholder: 'Enter datasource name',
  name_required: 'Please enter datasource name',
  name_rule: 'Only letters, numbers, underscores and hyphens allowed',
  
  type_placeholder: 'Select middleware type',
  type_required: 'Please select middleware type',
  
  address_placeholder: 'Enter middleware address, e.g.: https://example.com',
  address_required: 'Please enter middleware address',
  address_rule: 'Please enter a valid URL',
  
  description_placeholder: 'Enter description',
  
  timeout: 'Request Timeout (ms)',
  timeout_placeholder: 'Default: 5000',
  connect_timeout: 'Connect Timeout (ms)',
  connect_timeout_placeholder: 'Default: 2000',
  insecure_skip_verify: 'Skip SSL Verification',
  
  auth_type_token: 'Token Authentication',
  auth_type_basic: 'Basic Auth',
  auth_type_session: 'Session',
  auth_type_oauth2: 'OAuth2',
  auth_type_none: 'No Authentication',
  
  token: 'Token',
  token_placeholder: 'Enter API Token',
  token_required: 'Please enter Token',
  
  username: 'Username',
  username_placeholder: 'Enter username',
  username_required: 'Please enter username',
  
  password: 'Password',
  password_placeholder: 'Enter password',
  password_required: 'Please enter password',
  
  header_name: 'Header Name',
  header_name_placeholder: 'Default: Authorization',
  header_prefix: 'Header Prefix',
  header_prefix_placeholder: 'Default: Bearer',
  
  login_url: 'Login URL',
  login_url_placeholder: 'e.g.: /api/login',
  
  client_id: 'Client ID',
  client_id_placeholder: 'Enter Client ID',
  client_secret: 'Client Secret',
  client_secret_placeholder: 'Enter Client Secret',
  token_url: 'Token URL',
  token_url_placeholder: 'Enter Token URL',
  
  health_check_url: 'Health Check URL',
  health_check_url_placeholder: 'e.g.: /api/health',
  health_check_interval: 'Check Interval (seconds)',
  health_check_interval_placeholder: 'Default: 60',
  
  // Middleware Types
  type_archery: 'Archery SQL Audit',
  type_jumpserver: 'JumpServer Bastion',
  type_jenkins: 'Jenkins CI/CD',
  type_gitlab: 'GitLab Repository',
  type_nacos: 'Nacos Config Center',
  type_consul: 'Consul Service Discovery',
  
  // Messages
  add_success: 'Created successfully',
  edit_success: 'Updated successfully',
  delete_success: 'Deleted successfully',
  delete_confirm_title: 'Confirm Deletion',
  delete_confirm_content: 'Are you sure to delete {count} selected datasource(s)? This action cannot be undone.',
  test_connection_success: 'Connection test succeeded',
  test_connection_failed: 'Connection test failed',
  test_connection_testing: 'Testing connection...',
  migrate_success: 'Archery configuration migrated successfully',
  migrate_failed: 'Archery configuration migration failed',
  batch_enable_success: 'Batch enabled successfully',
  batch_disable_success: 'Batch disabled successfully',
  select_at_least_one: 'Please select at least one record',
  
  // Tips
  last_check_time: 'Last Check',
  never_checked: 'Never Checked',
  check_now: 'Check Now',
};

export default en_US;
