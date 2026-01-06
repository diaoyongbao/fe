import request from '@/utils/request';

export interface MiddlewareDatasource {
  id?: number;
  name: string;
  type: string;
  description?: string;
  address: string;
  status: string;
  timeout?: number;
  connect_timeout?: number;
  insecure_skip_verify?: boolean;
  auth_type: string;
  auth_config: Record<string, any>;
  settings?: Record<string, any>;
  health_check_url?: string;
  health_check_interval?: number;
  last_health_check?: number;
  health_status?: string;
  health_message?: string;
  tags?: string;
  order_num?: number;
  created_at?: number;
  created_by?: string;
  updated_at?: number;
  updated_by?: string;
}

export interface QueryParams {
  type?: string;
  status?: string;
  keyword?: string;
  limit?: number;
  offset?: number;
}

export interface MiddlewareType {
  value: string;
  label: string;
  count: number;
}

// 获取中间件数据源列表
export function getMiddlewareDatasources(params?: QueryParams) {
  return request('/api/n9e/middleware-datasources', {
    method: 'GET',
    params,
  });
}

// 获取中间件数据源数量
export function getMiddlewareDatasourcesCount(params?: QueryParams) {
  return request('/api/n9e/middleware-datasources/count', {
    method: 'GET',
    params,
  });
}

// 获取单个中间件数据源
export function getMiddlewareDatasource(id: number) {
  return request(`/api/n9e/middleware-datasource/${id}`, {
    method: 'GET',
  });
}

// 创建中间件数据源
export function createMiddlewareDatasource(data: MiddlewareDatasource) {
  return request('/api/n9e/middleware-datasource', {
    method: 'POST',
    data,
  });
}

// 更新中间件数据源
export function updateMiddlewareDatasource(id: number, data: MiddlewareDatasource) {
  return request(`/api/n9e/middleware-datasource/${id}`, {
    method: 'PUT',
    data,
  });
}

// 删除中间件数据源
export function deleteMiddlewareDatasources(ids: number[]) {
  return request('/api/n9e/middleware-datasources', {
    method: 'DELETE',
    data: { ids },
  });
}

// 测试连接
export function testMiddlewareConnection(id: number) {
  return request(`/api/n9e/middleware-datasource/${id}/test`, {
    method: 'POST',
  });
}

// 获取支持的中间件类型
export function getMiddlewareTypes() {
  return request('/api/n9e/middleware-datasource/types', {
    method: 'GET',
  });
}

// 根据类型获取中间件数据源
export function getMiddlewareDatasourceByType(type: string) {
  return request('/api/n9e/middleware-datasource/by-type', {
    method: 'GET',
    params: { type },
  });
}

// 批量更新状态
export function updateMiddlewareDatasourcesStatus(ids: number[], status: string) {
  return request('/api/n9e/middleware-datasources/status', {
    method: 'POST',
    data: { ids, status },
  });
}

// 导出配置
export function exportMiddlewareDatasource(id: number) {
  return request(`/api/n9e/middleware-datasource/${id}/export`, {
    method: 'GET',
  });
}

// 从配置文件迁移 Archery
export function migrateArcheryConfig() {
  return request('/api/n9e/middleware-datasource/migrate-archery', {
    method: 'POST',
  });
}
