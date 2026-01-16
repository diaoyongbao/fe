// n9e-2kai: 云服务管理 API 服务
import request from '@/utils/request';
import { RequestMethod } from '@/store/common';

// ==================== 类型定义 ====================

// 云账号
export interface CloudAccount {
    id: number;
    name: string;
    provider: string;  // huawei, aliyun, tencent, volcengine
    description: string;
    access_key: string;
    regions: string[];
    default_region: string;
    sync_enabled: boolean;
    sync_interval: number;
    enabled: boolean;
    health_status: number;  // 0:未知 1:健康 2:异常
    last_sync_status: number;  // 0:未同步 1:成功 2:失败
    last_sync_time: number;
    last_sync_message: string;
    create_at: number;
    create_by: string;
    update_at: number;
    update_by: string;
}

// 云厂商信息
export interface ProviderInfo {
    key: string;
    name: string;
    enabled: boolean;
}

// 区域信息
export interface Region {
    region: string;
    name: string;
}

// 云主机 ECS
export interface CloudECS {
    id: number;
    account_id: number;
    account_name: string;
    provider: string;
    region: string;
    instance_id: string;
    instance_name: string;
    instance_type: string;
    status: string;  // running, stopped, starting, stopping, etc.
    private_ips: string[];
    public_ips: string[];
    vpc_id: string;
    vpc_name: string;
    cpu: number;
    memory: number;  // GB
    os_name: string;
    os_type: string;  // linux, windows
    charge_type: string;  // prepaid, postpaid
    expire_time: number;
    create_time: number;
    tags: Record<string, string>;
    sync_at: number;
}

// 云数据库 RDS
export interface CloudRDS {
    id: number;
    account_id: number;
    account_name: string;
    provider: string;
    region: string;
    instance_id: string;
    instance_name: string;
    instance_type: string;
    engine: string;  // mysql, postgresql, sqlserver, mariadb
    engine_version: string;
    status: string;  // running, stopped, creating, etc.
    private_ips: string[];
    public_ips: string[];
    vpc_id: string;
    vpc_name: string;
    cpu: number;
    memory: number;  // GB
    storage: number;  // GB
    storage_type: string;
    port: number;
    charge_type: string;
    expire_time: number;
    create_time: number;
    tags: Record<string, string>;
    sync_at: number;
}

// 同步日志
export interface CloudSyncLog {
    id: number;
    account_id: number;
    account_name: string;
    provider: string;
    region: string;
    sync_type: string;  // manual, auto
    resource_types: string;  // ecs,rds
    status: number;  // 0:进行中 1:成功 2:失败 3:部分成功
    start_time: number;
    end_time: number;
    duration: number;  // 秒
    ecs_total: number;
    ecs_added: number;
    ecs_updated: number;
    ecs_deleted: number;
    rds_total: number;
    rds_added: number;
    rds_updated: number;
    rds_deleted: number;
    error_message: string;
    operator: string;
}

// 分页响应
export interface PaginatedResponse<T> {
    list: T[];
    total: number;
}

// ==================== 云账号管理 ====================

// 获取云账号列表
export function getCloudAccounts(params?: {
    provider?: string;
    query?: string;
    limit?: number;
    offset?: number;
}): Promise<{ dat: PaginatedResponse<CloudAccount>; err: string }> {
    return request('/api/n9e/cloud-management/accounts', {
        method: RequestMethod.Get,
        params,
    });
}

// 获取单个云账号
export function getCloudAccount(id: number): Promise<{ dat: CloudAccount; err: string }> {
    return request(`/api/n9e/cloud-management/account/${id}`, {
        method: RequestMethod.Get,
    });
}

// 添加云账号
export function addCloudAccount(data: {
    name: string;
    provider: string;
    description?: string;
    access_key: string;
    secret_key: string;
    regions: string[];
    default_region?: string;
    sync_enabled?: boolean;
    sync_interval?: number;
    enabled?: boolean;
}): Promise<{ dat: number; err: string }> {
    return request('/api/n9e/cloud-management/account', {
        method: RequestMethod.Post,
        data,
    });
}

// 更新云账号
export function updateCloudAccount(id: number, data: {
    name?: string;
    description?: string;
    access_key?: string;
    secret_key?: string;
    regions?: string[];
    default_region?: string;
    sync_enabled?: boolean;
    sync_interval?: number;
    enabled?: boolean;
}): Promise<{ err: string }> {
    return request(`/api/n9e/cloud-management/account/${id}`, {
        method: RequestMethod.Put,
        data,
    });
}

// 删除云账号
export function deleteCloudAccounts(ids: number[]): Promise<{ err: string }> {
    return request('/api/n9e/cloud-management/accounts', {
        method: RequestMethod.Delete,
        data: ids,
    });
}

// 测试云账号连接
export function testCloudAccount(id: number): Promise<{ dat: { success: boolean; message: string }; err: string }> {
    return request(`/api/n9e/cloud-management/account/${id}/test`, {
        method: RequestMethod.Post,
    });
}

// 触发同步
export function triggerSync(id: number): Promise<{ err: string }> {
    return request(`/api/n9e/cloud-management/account/${id}/sync`, {
        method: RequestMethod.Post,
    });
}

// ==================== 云厂商和区域 ====================

// 获取支持的云厂商列表
export function getCloudProviders(): Promise<{ dat: ProviderInfo[]; err: string }> {
    return request('/api/n9e/cloud-management/providers', {
        method: RequestMethod.Get,
    });
}

// 获取云厂商的区域列表
export function getCloudRegions(provider: string): Promise<{ dat: Region[]; err: string }> {
    return request('/api/n9e/cloud-management/regions', {
        method: RequestMethod.Get,
        params: { provider },
    });
}

// ==================== ECS 管理 ====================

// 获取 ECS 列表
export function getCloudECSList(params?: {
    account_id?: number;
    provider?: string;
    region?: string;
    status?: string;
    query?: string;
    limit?: number;
    offset?: number;
}): Promise<{ dat: PaginatedResponse<CloudECS>; err: string }> {
    return request('/api/n9e/cloud-management/ecs', {
        method: RequestMethod.Get,
        params,
    });
}

// 获取单个 ECS
export function getCloudECS(id: number): Promise<{ dat: CloudECS; err: string }> {
    return request(`/api/n9e/cloud-management/ecs/${id}`, {
        method: RequestMethod.Get,
    });
}

// 刷新 ECS（从云端重新获取信息）
export function refreshCloudECS(id: number): Promise<{ err: string }> {
    return request(`/api/n9e/cloud-management/ecs/${id}/refresh`, {
        method: RequestMethod.Post,
    });
}

// ==================== RDS 管理 ====================

// 获取 RDS 列表
export function getCloudRDSList(params?: {
    account_id?: number;
    provider?: string;
    region?: string;
    engine?: string;
    status?: string;
    query?: string;
    owner?: string;
    limit?: number;
    offset?: number;
}): Promise<{ dat: PaginatedResponse<CloudRDS>; err: string }> {
    return request('/api/n9e/cloud-management/rds', {
        method: RequestMethod.Get,
        params,
    });
}

// 获取单个 RDS
export function getCloudRDS(id: number): Promise<{ dat: CloudRDS; err: string }> {
    return request(`/api/n9e/cloud-management/rds/${id}`, {
        method: RequestMethod.Get,
    });
}

// 刷新 RDS（从云端重新获取信息）
export function refreshCloudRDS(id: number): Promise<{ err: string }> {
    return request(`/api/n9e/cloud-management/rds/${id}/refresh`, {
        method: RequestMethod.Post,
    });
}

// ==================== 同步日志 ====================

// 获取同步日志列表
// n9e-2kai: 增加 sync_type 参数支持按同步类型筛选
export function getCloudSyncLogs(params?: {
    account_id?: number;
    provider?: string;
    resource_type?: string;
    status?: number;
    sync_type?: string;
    start_time?: number;
    end_time?: number;
    limit?: number;
    offset?: number;
}): Promise<{ dat: PaginatedResponse<CloudSyncLog>; err: string }> {
    return request('/api/n9e/cloud-management/sync-logs', {
        method: RequestMethod.Get,
        params,
    });
}

// 获取单条同步日志详情
export function getCloudSyncLog(id: number): Promise<{ dat: CloudSyncLog; err: string }> {
    return request(`/api/n9e/cloud-management/sync-log/${id}`, {
        method: RequestMethod.Get,
    });
}

// ==================== 统计信息 ====================

// 获取资源统计
export function getCloudStats(): Promise<{
    dat: {
        accounts: number;
        ecs_total: number;
        ecs_running: number;
        rds_total: number;
        rds_running: number;
    };
    err: string;
}> {
    return request('/api/n9e/cloud-management/stats', {
        method: RequestMethod.Get,
    });
}

// ==================== 资源同步 ====================

// 同步全部资源
export function syncCloudResources(data: {
    account_id: number;
    regions?: string[];
    resource_types?: string[];
}): Promise<{ dat: { message: string }; err: string }> {
    return request('/api/n9e/cloud-management/sync', {
        method: RequestMethod.Post,
        data,
    });
}

// 仅同步 ECS 资源
export function syncCloudECS(data: {
    account_id: number;
    regions?: string[];
}): Promise<{ dat: { message: string; resource_types: string[] }; err: string }> {
    return request('/api/n9e/cloud-management/sync/ecs', {
        method: RequestMethod.Post,
        data,
    });
}

// 仅同步 RDS 资源
export function syncCloudRDS(data: {
    account_id: number;
    regions?: string[];
}): Promise<{ dat: { message: string; resource_types: string[] }; err: string }> {
    return request('/api/n9e/cloud-management/sync/rds', {
        method: RequestMethod.Post,
        data,
    });
}

// ==================== 同步配置管理 ====================

// 同步配置类型
export interface CloudSyncConfig {
    id: number;
    account_id: number;
    resource_type: string;  // ecs, rds
    enabled: boolean;
    sync_interval: number;  // 秒
    regions: string[];
    filters: Record<string, any>;
    last_sync_time: number;
    last_sync_status: number;  // 0:未同步 1:成功 2:失败 3:进行中
    last_sync_error: string;
    last_sync_count: number;
    last_sync_added: number;
    last_sync_updated: number;
    last_sync_deleted: number;
    create_at: number;
    create_by: string;
    update_at: number;
    update_by: string;
}

// 获取同步配置列表
export function getCloudSyncConfigs(params?: {
    account_id?: number;
    resource_type?: string;
    limit?: number;
    offset?: number;
}): Promise<{ dat: PaginatedResponse<CloudSyncConfig>; err: string }> {
    return request('/api/n9e/cloud-management/sync-configs', {
        method: RequestMethod.Get,
        params,
    });
}

// 获取单个同步配置
export function getCloudSyncConfig(id: number): Promise<{ dat: CloudSyncConfig; err: string }> {
    return request(`/api/n9e/cloud-management/sync-config/${id}`, {
        method: RequestMethod.Get,
    });
}

// 添加同步配置
export function addCloudSyncConfig(data: {
    account_id: number;
    resource_type: string;
    enabled?: boolean;
    sync_interval?: number;
    regions?: string[];
    filters?: Record<string, any>;
}): Promise<{ dat: { id: number }; err: string }> {
    return request('/api/n9e/cloud-management/sync-config', {
        method: RequestMethod.Post,
        data,
    });
}

// 更新同步配置
export function updateCloudSyncConfig(id: number, data: {
    enabled?: boolean;
    sync_interval?: number;
    regions?: string[];
    filters?: Record<string, any>;
}): Promise<{ err: string }> {
    return request(`/api/n9e/cloud-management/sync-config/${id}`, {
        method: RequestMethod.Put,
        data,
    });
}

// 删除同步配置
export function deleteCloudSyncConfigs(ids: number[]): Promise<{ err: string }> {
    return request('/api/n9e/cloud-management/sync-configs', {
        method: RequestMethod.Delete,
        data: { ids },
    });
}

// 手动触发同步配置
// n9e-2kai: 增加时间参数支持慢日志按时间同步
export function triggerCloudSyncConfig(id: number, startTime?: number, endTime?: number): Promise<{ dat: { message: string; config_id: number; resource_type: string }; err: string }> {
    return request(`/api/n9e/cloud-management/sync-config/${id}/trigger`, {
        method: RequestMethod.Post,
        data: startTime && endTime ? { start_time: startTime, end_time: endTime } : undefined,
    });
}

// ==================== RDS 慢日志统计 ====================
// 注意: CloudRDSSlowLog 类型和 getCloudRDSSlowLogs API 已废弃并删除
// 新架构使用 SlowLogReportItem 类型和 getSlowLogReport API

// n9e-2kai: 手动同步 RDS 慢日志
export function syncCloudRDSSlowLogs(rdsId: number, params?: {
    start_time?: string;  // 格式: 2026-01-12T00:00:00+08:00
    end_time?: string;
}): Promise<{ dat: { message: string; instance_id: string; instance_name: string; start_time: string; end_time: string }; err: string }> {
    return request(`/api/n9e/cloud-management/rds/${rdsId}/slowlogs/sync`, {
        method: RequestMethod.Post,
        data: params || {},
    });
}

// ==================== 慢日志统计报告 ====================

// 慢日志统计报告项
export interface SlowLogReportItem {
    sql_hash: string;          // SQL 指纹哈希
    sql_fingerprint: string;   // SQL 指纹
    sql_type: string;          // SQL 类型
    database: string;          // 数据库
    instance_id: string;       // RDS 实例 ID
    instance_name: string;     // RDS 实例名称
    total_executions: number;  // 总执行次数
    avg_time: number;          // 平均执行时间
    max_avg_time: number;      // 最大平均执行时间
    min_avg_time: number;      // 最小平均执行时间
    total_rows_sent: number;   // 总返回行数
    instance_count: number;    // 涉及的实例数量
    sample_sql: string;        // 示例 SQL
    first_seen: string;        // 首次出现时间

    // n9e-2kai: 异常标记字段
    is_high_frequency?: boolean;  // 高频查询: 执行次数 > 平均值 * 3
    is_slow_growing?: boolean;    // 异常增长: 与前一周期对比增长 > 50%
    is_critical_slow?: boolean;   // 严重慢查询: avg_time > 1s
    growth_rate?: number;         // 增长率百分比
}

// 慢日志报告摘要
export interface SlowLogReportSummary {
    total_unique_queries: number;  // 唯一查询数
    total_executions: number;      // 总执行次数
    avg_execution_time: number;    // 平均执行时间
    top_slow_queries: number;      // 慢查询数量（>1s）
    by_type: Record<string, number>;  // 按类型统计
}

// 获取慢日志统计报告
export function getSlowLogReport(params: {
    period?: 'yesterday' | 'today' | 'week' | 'month';
    start_time?: string;
    end_time?: string;
    sql_type?: string;
    instance_id?: string;
    database?: string;
    sort_field?: string;
    sort_order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}): Promise<{ dat: { list: SlowLogReportItem[]; total: number; start_time: string; end_time: string; period: string }; err: string }> {
    return request('/api/n9e/cloud-management/slowlog-report', {
        method: RequestMethod.Get,
        params,
    });
}

// 获取慢日志报告摘要
export function getSlowLogReportSummary(params: {
    period?: 'yesterday' | 'today' | 'week' | 'month';
    start_time?: string;
    end_time?: string;
    instance_id?: string;
    database?: string;
}): Promise<{ dat: { summary: SlowLogReportSummary; databases: string[]; start_time: string; end_time: string; period: string }; err: string }> {
    return request('/api/n9e/cloud-management/slowlog-report/summary', {
        method: RequestMethod.Get,
        params,
    });
}

// n9e-2kai: 慢日志统计搜索（支持 SQL 指纹模糊搜索）
export function searchSlowLogReport(params: {
    period?: 'yesterday' | 'today' | 'week' | 'month';
    start_time?: string;
    end_time?: string;
    sql_type?: string;
    sql_fingerprint?: string;  // 新增：SQL 指纹模糊搜索
    instance_id?: string;
    database?: string;
    sort_field?: string;
    sort_order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}): Promise<{ dat: { list: SlowLogReportItem[]; total: number; start_time: string; end_time: string }; err: string }> {
    return request('/api/n9e/cloud-management/slowlog-report/search', {
        method: RequestMethod.Get,
        params,
    });
}

// n9e-2kai: 导出慢日志统计为 CSV
export function exportSlowLogReportCSV(params: {
    period?: 'yesterday' | 'today' | 'week' | 'month';
    start_time?: string;
    end_time?: string;
    sql_type?: string;
    sql_fingerprint?: string;
    instance_id?: string;
    database?: string;
}): string {
    // 返回下载 URL
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value) query.append(key, value);
    });
    return `/api/n9e/cloud-management/slowlog-report/export-csv?${query.toString()}`;
}

// ==================== RDS 负责人管理 ====================

// RDS 负责人
export interface CloudRDSOwner {
    id: number;
    instance_id: string;
    instance_name: string;
    provider: string;
    owner: string;
    owner_email: string;
    owner_phone: string;
    backup: string;
    team: string;
    department: string;
    note: string;
    create_by: string;
    update_by: string;
    created_at: number;
    updated_at: number;
}

// 获取 RDS 负责人列表
export function getCloudRDSOwners(params?: {
    query?: string;
    limit?: number;
    offset?: number;
}): Promise<{ dat: { list: CloudRDSOwner[]; total: number }; err: string }> {
    return request('/api/n9e/cloud-management/rds-owners', {
        method: RequestMethod.Get,
        params,
    });
}

// 获取单个 RDS 负责人
export function getCloudRDSOwner(instanceId: string): Promise<{ dat: CloudRDSOwner | null; err: string }> {
    return request(`/api/n9e/cloud-management/rds-owner/${instanceId}`, {
        method: RequestMethod.Get,
    });
}

// 创建或更新 RDS 负责人
export function upsertCloudRDSOwner(data: {
    instance_id: string;
    instance_name?: string;
    provider?: string;
    owner?: string;
    owner_email?: string;
    owner_phone?: string;
    backup?: string;
    team?: string;
    department?: string;
    note?: string;
}): Promise<{ dat: { instance_id: string }; err: string }> {
    return request('/api/n9e/cloud-management/rds-owner', {
        method: RequestMethod.Post,
        data,
    });
}

// 删除 RDS 负责人
export function deleteCloudRDSOwners(ids: number[]): Promise<{ err: string }> {
    return request('/api/n9e/cloud-management/rds-owners', {
        method: RequestMethod.Delete,
        data: { ids },
    });
}

// ==================== 慢SQL优化跟踪 ====================

// 慢SQL跟踪状态（简化版）
export const SlowSQLStatus = {
    PENDING: 'pending',      // 待评估
    URGENT: 'urgent',        // 紧急（替代高优先级）
    OBSERVING: 'observing',  // 观察期（疑似已优化，等待确认）
    OPTIMIZED: 'optimized',  // 已优化
    IGNORED: 'ignored',      // 已忽略
};

// 优先级
export const SlowSQLPriority = {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
};

// 慢SQL跟踪记录
export interface SlowSQLTracking {
    id: number;
    sql_hash: string;
    sql_fingerprint: string;
    sql_type: string;
    sample_sql: string;
    database: string;
    instance_id: string;
    instance_name: string;
    status: string;
    priority: string;
    owner: string;
    owner_email: string;
    team: string;
    first_seen_at: number;
    last_seen_at: number;
    status_changed_at: number;
    expected_complete_at: number;
    total_executions: number;
    avg_time: number;
    max_time: number;
    last_week_count: number;
    this_week_count: number;
    optimize_note: string;
    optimize_result: string;
    auto_optimized: boolean;
    created_at: number;
    updated_at: number;
}

// 慢SQL跟踪统计（简化版）
export interface SlowSQLTrackingStats {
    pending_count: number;
    urgent_count: number;       // 紧急状态数量
    observing_count: number;    // 观察期数量
    optimized_count: number;
    ignored_count: number;
    total_count: number;
    this_week_new: number;
    this_week_done: number;
    high_priority_pending: number;
}

// 周趋势
export interface SlowSQLWeeklyTrend {
    week_key: string;
    pending_count: number;
    new_count: number;
    done_count: number;
    net_change: number;
}

// n9e-2kai: 负责人统计数据
export interface OwnerStats {
    owner: string;
    team: string;
    department: string;
    instance_count: number;
    pending_count: number;
    urgent_count: number;
    observing_count: number;    // 观察期数量
    optimized_count: number;
    ignored_count: number;
    total_count: number;
    this_week_new: number;
    this_week_done: number;
    completion_rate: number;
}

// n9e-2kai: 负责人排行榜项
export interface OwnerLeaderboardItem {
    rank: number;
    owner: string;
    team: string;
    done_count: number;
    pending_count: number;
    completion_rate: number;
}

// n9e-2kai: 负责人周趋势
export interface OwnerWeeklyTrend {
    week_key: string;
    new_count: number;
    done_count: number;
    pending_count: number;
    net_change: number;
}

// 获取慢SQL跟踪列表
export function getSlowSQLTrackingList(params?: {
    instance_id?: string;
    status?: string;
    priority?: string;
    owner?: string;
    query?: string;
    limit?: number;
    offset?: number;
}): Promise<{ dat: { list: SlowSQLTracking[]; total: number }; err: string }> {
    return request('/api/n9e/cloud-management/slowsql-tracking', {
        method: RequestMethod.Get,
        params,
    });
}

// 获取单个慢SQL跟踪详情（基于 sql_hash）
export function getSlowSQLTracking(sqlHash: string): Promise<{ dat: SlowSQLTracking; err: string }> {
    return request('/api/n9e/cloud-management/slowsql-tracking/detail', {
        method: RequestMethod.Get,
        params: { sql_hash: sqlHash },
    });
}

// 更新慢SQL跟踪（基于 sql_hash）
export function updateSlowSQLTracking(sqlHash: string, data: {
    priority?: string;
    owner?: string;
    owner_email?: string;
    team?: string;
    expected_complete_at?: number;
    optimize_note?: string;
    optimize_result?: string;
}): Promise<{ err: string }> {
    return request('/api/n9e/cloud-management/slowsql-tracking/update', {
        method: RequestMethod.Put,
        data: { sql_hash: sqlHash, ...data },
    });
}

// 更新慢SQL状态（基于 sql_hash）
export function updateSlowSQLTrackingStatus(sqlHash: string, data: {
    status: string;
    comment?: string;
}): Promise<{ err: string }> {
    return request('/api/n9e/cloud-management/slowsql-tracking/status', {
        method: RequestMethod.Put,
        data: { sql_hash: sqlHash, ...data },
    });
}

// 指派负责人（基于 sql_hash）
export function assignSlowSQLTracking(sqlHash: string, data: {
    owner: string;
    owner_email?: string;
    team?: string;
}): Promise<{ err: string }> {
    return request('/api/n9e/cloud-management/slowsql-tracking/assign', {
        method: RequestMethod.Put,
        data: { sql_hash: sqlHash, ...data },
    });
}

// 批量更新状态（基于 sql_hashes）
export function batchUpdateSlowSQLTrackingStatus(data: {
    sql_hashes: string[];
    status: string;
    comment?: string;
}): Promise<{ dat: { success: number; failed: number }; err: string }> {
    return request('/api/n9e/cloud-management/slowsql-tracking/batch-status', {
        method: RequestMethod.Post,
        data,
    });
}

// 获取统计数据
// n9e-2kai: 增加 owner 参数支持按负责人筛选
export function getSlowSQLTrackingStats(params?: {
    instance_id?: string;
    owner?: string;
}): Promise<{ dat: SlowSQLTrackingStats; err: string }> {
    return request('/api/n9e/cloud-management/slowsql-tracking/stats', {
        method: RequestMethod.Get,
        params,
    });
}

// 获取趋势数据
// n9e-2kai: 支持按负责人筛选
export function getSlowSQLTrackingTrend(params?: {
    instance_id?: string;
    owner?: string;
    weeks?: number;
}): Promise<{ dat: { trends: SlowSQLWeeklyTrend[] }; err: string }> {
    return request('/api/n9e/cloud-management/slowsql-tracking/trend', {
        method: RequestMethod.Get,
        params,
    });
}

// 自动判断已优化
export function autoOptimizeSlowSQL(params?: {
    instance_id?: string;
}): Promise<{ dat: { optimized_count: number; message: string }; err: string }> {
    return request('/api/n9e/cloud-management/slowsql-tracking/auto-optimize', {
        method: RequestMethod.Post,
        params,
    });
}

// 获取周优化报告（Markdown）
export function getSlowSQLWeeklyReport(params?: {
    instance_id?: string;
    instance_name?: string;
}): Promise<{ dat: { markdown: string; week_key: string; instance_id: string }; err: string }> {
    return request('/api/n9e/cloud-management/slowsql-tracking/weekly-report', {
        method: RequestMethod.Get,
        params,
    });
}

// ==================== n9e-2kai: 负责人维度统计 ====================

// 获取负责人统计列表
export function getSlowSQLTrackingOwnerStats(params?: {
    week_offset?: number;
}): Promise<{ dat: { list: OwnerStats[]; total: number }; err: string }> {
    return request('/api/n9e/cloud-management/slowsql-tracking/owner-stats', {
        method: RequestMethod.Get,
        params,
    });
}

// 获取负责人排行榜
export function getSlowSQLTrackingOwnerLeaderboard(params?: {
    week_offset?: number;
    limit?: number;
    sort_by?: 'done_count' | 'completion_rate';
}): Promise<{ dat: { list: OwnerLeaderboardItem[] }; err: string }> {
    return request('/api/n9e/cloud-management/slowsql-tracking/owner-leaderboard', {
        method: RequestMethod.Get,
        params,
    });
}

// 获取负责人趋势数据
export function getSlowSQLTrackingOwnerTrend(params: {
    owner: string;
    weeks?: number;
}): Promise<{ dat: { owner: string; trends: OwnerWeeklyTrend[] }; err: string }> {
    return request('/api/n9e/cloud-management/slowsql-tracking/owner-trend', {
        method: RequestMethod.Get,
        params,
    });
}

// n9e-2kai: 获取所有负责人趋势汇总数据
// 用于趋势图同时展示多个负责人的数据
export interface OwnerTrendData {
    owner: string;
    team: string;
    trends: OwnerWeeklyTrend[];
}

export function getSlowSQLTrackingOwnerTrendsAll(params?: {
    weeks?: number;
}): Promise<{ dat: { overall: OwnerWeeklyTrend[]; owners: OwnerTrendData[] }; err: string }> {
    return request('/api/n9e/cloud-management/slowsql-tracking/owner-trends-all', {
        method: RequestMethod.Get,
        params,
    });
}


// 获取状态变更日志（基于 sql_hash）
export function getSlowSQLTrackingLogs(sqlHash: string): Promise<{
    dat: {
        list: Array<{
            id: number;
            tracking_id: number;
            sql_hash: string;
            old_status: string;
            new_status: string;
            operator: string;
            comment: string;
            created_at: number;
        }>
    }; err: string
}> {
    return request('/api/n9e/cloud-management/slowsql-tracking/logs', {
        method: RequestMethod.Get,
        params: { sql_hash: sqlHash },
    });
}

// 从慢日志报表同步数据到跟踪表
export function syncSlowSQLFromReport(params?: {
    instance_id?: string;
}): Promise<{ dat: { created: number; updated: number; skipped: number; message: string }; err: string }> {
    return request('/api/n9e/cloud-management/slowsql-tracking/sync', {
        method: RequestMethod.Post,
        params,
    });
}

// ==================== 负责人管理（简化版） ====================

// 负责人类型
export interface CloudStaff {
    id: number;
    name: string;
    create_by: string;
    update_by: string;
    created_at: number;
    updated_at: number;
}

// 获取负责人列表
export function getCloudStaffList(params?: {
    query?: string;
    limit?: number;
    offset?: number;
}): Promise<{ dat: { list: CloudStaff[]; total: number }; err: string }> {
    return request('/api/n9e/cloud-management/staff', {
        method: RequestMethod.Get,
        params,
    });
}

// 获取负责人姓名列表（用于下拉选择）
export function getCloudStaffNames(): Promise<{ dat: string[]; err: string }> {
    return request('/api/n9e/cloud-management/staff/names', {
        method: RequestMethod.Get,
    });
}

// 添加负责人
export function addCloudStaff(data: {
    name: string;
}): Promise<{ dat: { id: number }; err: string }> {
    return request('/api/n9e/cloud-management/staff', {
        method: RequestMethod.Post,
        data,
    });
}

// 更新负责人
export function updateCloudStaff(id: number, data: {
    name: string;
}): Promise<{ err: string }> {
    return request(`/api/n9e/cloud-management/staff/${id}`, {
        method: RequestMethod.Put,
        data,
    });
}

// 删除负责人
export function deleteCloudStaff(ids: number[]): Promise<{ err: string }> {
    return request('/api/n9e/cloud-management/staff', {
        method: RequestMethod.Delete,
        data: { ids },
    });
}
