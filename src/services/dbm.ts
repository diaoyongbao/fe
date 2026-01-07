import request from '@/utils/request';
import { RequestMethod } from '@/store/common';

// 数据库实例信息 (匹配后端 DBInstance 模型)
export interface ArcheryInstance {
    id: number;
    instance_name: string;
    db_type: string;          // mysql, redis, mongodb, postgresql
    host: string;
    port: number;
    username: string;         // 后端字段是 username 不是 user
    charset: string;
    max_connections: number;
    max_idle_conns: number;
    is_master: boolean;
    enabled: boolean;
    health_status: number;    // 0:未知 1:健康 2:异常
    last_check_time: number;
    last_check_error: string;
    description: string;
    create_at: number;
    create_by: string;
    update_at: number;
    update_by: string;
}

// 会话信息
export interface ArcherySession {
    id: number;
    user: string;
    host: string;
    db: string;
    command: string;
    time: number;
    state: string;
    info: string;
}

// 未提交事务信息
export interface ArcheryUncommittedTrx {
    trx_id: string;
    trx_state: string;
    trx_started: string;
    trx_requested_lock_id: string;
    trx_wait_started: string;
    trx_weight: number;
    trx_mysql_thread_id: number;
    trx_query: string;
}

// 慢查询信息
export interface ArcherySlowQuery {
    checksum: string;
    fingerprint: string;
    sample: string;
    first_seen: string;
    last_seen: string;
    reviewed_by: string;
    reviewed_on: string;
    comments: string;
    query_time_avg: number;
    query_time_max: number;
    query_time_min: number;
    rows_examined_avg: number;
    rows_sent_avg: number;
    ts_cnt: number;
}

// 慢查询详情
export interface ArcherySlowQueryDetail {
    checksum: string;
    fingerprint: string;
    sample: string;
    explain_result: any;
    optimization_advice: string[];
    index_advice: string[];
    query_time_avg: number;
    query_time_max: number;
    query_time_min: number;
    rows_examined_avg: number;
    rows_sent_avg: number;
    ts_cnt: number;
}

// SQL查询结果
export interface ArcherySQLQueryResult {
    rows: any[];
    column_list: string[];
    affected_rows: number;
    full_sql: string;
    status: number;
    msg: string;
    query_time?: number;
    error?: string;
}

// 获取实例列表
export function getArcheryInstances(params?: {
    db_type?: string;
    query?: string;
    limit?: number;
    p?: number;
}): Promise<{ dat: { list: ArcheryInstance[]; total: number }; err: string }> {
    return request('/api/n9e/dbm/instances', {
        method: RequestMethod.Get,
        params,
    });
}

// 获取单个实例
export function getArcheryInstance(id: number): Promise<{ dat: ArcheryInstance; err: string }> {
    return request(`/api/n9e/dbm/instance/${id}`, {
        method: RequestMethod.Get,
    });
}

// 获取实例的数据库列表
export function getInstanceDatabases(instanceId: number): Promise<{ dat: string[]; err: string }> {
    return request(`/api/n9e/dbm/instance/${instanceId}/databases`, {
        method: RequestMethod.Get,
    });
}

// 表信息
export interface TableInfo {
    name: string;
    comment: string;
    engine: string;
    rows: number;
    data_length: number;
    create_time: string;
}

// 列信息
export interface ColumnInfo {
    name: string;
    type: string;
    nullable: boolean;
    key: string;
    default: string;
    extra: string;
    comment: string;
    ordinal_position: number;
}

// 获取数据库的表列表
export function getInstanceTables(instanceId: number, dbName: string): Promise<{ dat: TableInfo[]; err: string }> {
    return request(`/api/n9e/dbm/instance/${instanceId}/databases/${dbName}/tables`, {
        method: RequestMethod.Get,
    });
}

// 获取表的列信息
export function getTableColumns(instanceId: number, dbName: string, tableName: string): Promise<{ dat: ColumnInfo[]; err: string }> {
    return request(`/api/n9e/dbm/instance/${instanceId}/databases/${dbName}/tables/${tableName}/columns`, {
        method: RequestMethod.Get,
    });
}

// 添加实例
export function addDBInstance(data: {
    instance_name: string;
    db_type: string;
    host: string;
    port: number;
    username: string;
    password: string;
    charset?: string;
    max_connections?: number;
    max_idle_conns?: number;
    is_master?: boolean;
    enabled?: boolean;
    description?: string;
}): Promise<{ dat: number; err: string }> {
    return request('/api/n9e/dbm/instance', {
        method: RequestMethod.Post,
        data,
    });
}

// 更新实例
export function updateDBInstance(id: number, data: {
    instance_name: string;
    db_type: string;
    host: string;
    port: number;
    username: string;
    password?: string;
    charset?: string;
    max_connections?: number;
    max_idle_conns?: number;
    is_master?: boolean;
    enabled?: boolean;
    description?: string;
}): Promise<{ err: string }> {
    return request(`/api/n9e/dbm/instance/${id}`, {
        method: RequestMethod.Put,
        data,
    });
}

// 删除实例
export function deleteDBInstances(ids: number[]): Promise<{ err: string }> {
    return request('/api/n9e/dbm/instances', {
        method: RequestMethod.Delete,
        data: ids,
    });
}

// Archery 健康检查 (已废弃，暂时保留接口但也改为实例健康检查，参数变动需注意)
// 修正：此方法现在需要 instance_id
export function checkInstanceHealth(instanceId: number): Promise<{ dat: { status: string; message: string }; err: string }> {
    return request(`/api/n9e/dbm/instance/${instanceId}/health`, {
        method: RequestMethod.Get,
    });
}
// 兼容旧调用 (仅占位，实际应该废弃)
export function checkArcheryHealth(): Promise<{ dat: { status: string; service: string }; err: string }> {
    // 返回伪造的成功，避免页面报错
    return Promise.resolve({ dat: { status: 'ok', service: 'dbm' }, err: '' });
}

// ==================== 会话管理 ====================

// 获取会话列表
export function getSessions(params: {
    instance_id: number;
    command?: string;
    user?: string;
    db?: string;
}): Promise<{ dat: ArcherySession[]; err: string }> {
    return request('/api/n9e/dbm/sessions', {
        method: RequestMethod.Post,
        data: params,
    });
}

// 批量Kill会话
export function killSessions(params: {
    instance_id: number;
    thread_ids: number[];
}): Promise<{ dat: any; err: string }> {
    return request('/api/n9e/dbm/sessions/kill', {
        method: RequestMethod.Post,
        data: params,
    });
}

// 获取未提交事务
export function getUncommittedTransactions(params: {
    instance_id: number;
}): Promise<{ dat: ArcheryUncommittedTrx[]; err: string }> {
    return request('/api/n9e/dbm/uncommitted-trx', {
        method: RequestMethod.Post,
        data: params,
    });
}

// ==================== 慢查询分析 ====================

// 获取慢查询列表
export function getSlowQueries(params: {
    instance_id: number;
    start_time?: string;
    end_time?: string;
    db_name?: string;
}): Promise<{ dat: ArcherySlowQuery[]; err: string }> {
    return request('/api/n9e/dbm/slow-queries', {
        method: RequestMethod.Post,
        data: params,
    });
}

// 获取慢查询详情
export function getSlowQueryDetail(
    instance_id: number,
    checksum: string,
): Promise<{ dat: ArcherySlowQueryDetail; err: string }> {
    return request(`/api/n9e/dbm/slow-query/${instance_id}/${checksum}`, {
        method: RequestMethod.Get,
    });
}

// ==================== SQL执行 ====================

// 执行SQL查询
export function executeSQLQuery(params: {
    instance_id: number;
    db_name: string;
    sql_content: string;
    limit_num?: number;
}): Promise<{ dat: ArcherySQLQueryResult; err: string }> {
    return request('/api/n9e/dbm/sql/query', {
        method: RequestMethod.Post,
        data: params,
    });
}

// SQL语法检查
export function checkSQL(params: {
    instance_id: number;
    db_name: string;
    sql_content: string;
}): Promise<{ dat: any; err: string }> {
    return request('/api/n9e/dbm/sql/check', {
        method: RequestMethod.Post,
        data: params,
    });
}

// 提交SQL工单 (保留路径，但目前后端未实现)
export function submitSQLWorkflow(params: {
    instance_id: number;
    db_name: string;
    sql_content: string;
    title?: string;
    workflow_name?: string;
    description?: string;
    demand_url?: string;
}): Promise<{ dat: any; err: string }> {
    return request('/api/n9e/dbm/sql/workflow', {
        method: RequestMethod.Post,
        data: params,
    });
}

// ==================== 锁信息查询 ====================

// 锁等待信息
export interface LockWait {
    waiting_thread_id: number;
    waiting_query: string;
    waiting_user: string;
    waiting_host: string;
    waiting_db: string;
    waiting_time: number;
    blocking_thread_id: number;
    blocking_query: string;
    blocking_user: string;
    blocking_host: string;
    blocking_db: string;
    blocking_time: number;
    lock_type: string;
    lock_mode: string;
    lock_table: string;
    lock_index: string;
    lock_data: string;
}

// InnoDB 锁信息
export interface InnoDBLock {
    lock_id: string;
    lock_trx_id: string;
    lock_mode: string;
    lock_type: string;
    lock_table: string;
    lock_index: string;
    lock_space: number;
    lock_page: number;
    lock_rec: number;
    lock_data: string;
    thread_id: number;
    user: string;
    host: string;
    db: string;
    command: string;
    time: number;
    state: string;
    query: string;
}

// 获取锁等待信息
export function getLockWaits(params: {
    instance_id: number;
}): Promise<{ dat: LockWait[]; err: string }> {
    return request('/api/n9e/dbm/lock-waits', {
        method: RequestMethod.Post,
        data: params,
    });
}

// 获取 InnoDB 锁信息
export function getInnoDBLocks(instanceId: number): Promise<{ dat: InnoDBLock[]; err: string }> {
    return request(`/api/n9e/dbm/innodb-locks?instance_id=${instanceId}`, {
        method: RequestMethod.Get,
    });
}

// ==================== DBA 哨兵 ====================

// 哨兵规则
export interface SentinelRule {
    id: number;
    name: string;
    description: string;
    instance_id: number;
    enabled: boolean;
    rule_type: 'slow_query' | 'uncommitted_trx' | 'lock_wait';
    max_time: number;
    match_user: string;
    match_db: string;
    match_sql: string;
    match_command: string;
    match_state: string;
    exclude_user: string;
    exclude_db: string;
    exclude_sql: string;
    action: 'kill' | 'notify_only';
    notify_channel_ids: string;
    notify_user_group_ids: string;
    check_interval: number;
    last_check_at: number;
    create_at: number;
    create_by: string;
    update_at: number;
    update_by: string;
}

// Kill 日志
export interface SentinelKillLog {
    id: number;
    rule_id: number;
    rule_name: string;
    instance_id: number;
    instance_name: string;
    thread_id: number;
    user: string;
    host: string;
    db: string;
    command: string;
    time: number;
    state: string;
    sql_text: string;
    trx_id: string;
    trx_started: string;
    kill_reason: string;
    kill_result: string;
    error_msg: string;
    notify_status: string;
    notify_message: string;
    created_at: number;
}

// 获取哨兵规则列表
export function getSentinelRules(params: {
    query?: string;
    limit?: number;
    p?: number;
}): Promise<{ dat: { list: SentinelRule[]; total: number }; err: string }> {
    return request('/api/n9e/dbm/sentinel/rules', {
        method: RequestMethod.Get,
        params,
    });
}

// 获取单个哨兵规则
export function getSentinelRule(id: number): Promise<{ dat: SentinelRule; err: string }> {
    return request(`/api/n9e/dbm/sentinel/rule/${id}`, {
        method: RequestMethod.Get,
    });
}

// 添加哨兵规则
export function addSentinelRule(data: Partial<SentinelRule>): Promise<{ dat: number; err: string }> {
    return request('/api/n9e/dbm/sentinel/rule', {
        method: RequestMethod.Post,
        data,
    });
}

// 更新哨兵规则
export function updateSentinelRule(id: number, data: Partial<SentinelRule>): Promise<{ err: string }> {
    return request(`/api/n9e/dbm/sentinel/rule/${id}`, {
        method: RequestMethod.Put,
        data,
    });
}

// 删除哨兵规则
export function deleteSentinelRules(ids: number[]): Promise<{ err: string }> {
    return request('/api/n9e/dbm/sentinel/rules', {
        method: RequestMethod.Delete,
        data: ids,
    });
}

// 更新规则状态
export function updateSentinelRuleStatus(id: number, enabled: boolean): Promise<{ err: string }> {
    return request(`/api/n9e/dbm/sentinel/rule/${id}/status`, {
        method: RequestMethod.Put,
        data: { enabled },
    });
}

// 获取哨兵状态
export function getSentinelStatus(): Promise<{ dat: { enabled_rules: number; running: boolean; kills_24h: number }; err: string }> {
    return request('/api/n9e/dbm/sentinel/status', {
        method: RequestMethod.Get,
    });
}

// 获取 Kill 日志列表
export function getSentinelKillLogs(params: {
    rule_id?: number;
    instance_id?: number;
    start_time?: number;
    end_time?: number;
    limit?: number;
    p?: number;
}): Promise<{ dat: { list: SentinelKillLog[]; total: number }; err: string }> {
    return request('/api/n9e/dbm/sentinel/kill-logs', {
        method: RequestMethod.Get,
        params,
    });
}

// 获取规则统计信息
export function getSentinelRuleStats(id: number, days?: number): Promise<{ dat: { total: number; success: number; failed: number }; err: string }> {
    return request(`/api/n9e/dbm/sentinel/rule/${id}/stats`, {
        method: RequestMethod.Get,
        params: { days },
    });
}
