import request from '@/utils/request';
import { RequestMethod } from '@/store/common';

// Archery 实例信息
export interface ArcheryInstance {
    id: number;
    instance_name: string;
    type: string;
    db_type: string;
    host: string;
    port: number;
    user: string;
    charset: string;
    create_time: string;
    update_time: string;
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

// 获取 Archery 实例列表
export function getArcheryInstances(): Promise<{ dat: ArcheryInstance[]; err: string }> {
    return request('/api/n9e/dbm/archery/instances', {
        method: RequestMethod.Get,
    });
}

// Archery 健康检查
export function checkArcheryHealth(): Promise<{ dat: { status: string; service: string }; err: string }> {
    return request('/api/n9e/dbm/archery/health', {
        method: RequestMethod.Get,
    });
}

// ==================== 会话管理 ====================

// 获取会话列表
export function getSessions(params: {
    instance_id: number;
    command?: string;
    user?: string;
    db?: string;
}): Promise<{ dat: ArcherySession[]; err: string }> {
    return request('/api/n9e/dbm/archery/sessions', {
        method: RequestMethod.Post,
        data: params,
    });
}

// 批量Kill会话
export function killSessions(params: {
    instance_id: number;
    thread_ids: number[];
}): Promise<{ dat: any; err: string }> {
    return request('/api/n9e/dbm/archery/sessions/kill', {
        method: RequestMethod.Post,
        data: params,
    });
}

// 获取未提交事务
export function getUncommittedTransactions(params: {
    instance_id: number;
}): Promise<{ dat: ArcheryUncommittedTrx[]; err: string }> {
    return request('/api/n9e/dbm/archery/uncommitted-trx', {
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
    return request('/api/n9e/dbm/archery/slow-queries', {
        method: RequestMethod.Post,
        data: params,
    });
}

// 获取慢查询详情
export function getSlowQueryDetail(
    instance_id: number,
    checksum: string,
): Promise<{ dat: ArcherySlowQueryDetail; err: string }> {
    return request(`/api/n9e/dbm/archery/slow-query/${instance_id}/${checksum}`, {
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
    return request('/api/n9e/dbm/archery/sql/query', {
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
    return request('/api/n9e/dbm/archery/sql/check', {
        method: RequestMethod.Post,
        data: params,
    });
}

// 提交SQL工单
export function submitSQLWorkflow(params: {
    instance_id: number;
    db_name: string;
    sql_content: string;
    title?: string;
    workflow_name?: string;
    description?: string;
    demand_url?: string;
}): Promise<{ dat: any; err: string }> {
    return request('/api/n9e/dbm/archery/sql/workflow', {
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
    return request('/api/n9e/dbm/archery/lock-waits', {
        method: RequestMethod.Post,
        data: params,
    });
}

// 获取 InnoDB 锁信息
export function getInnoDBLocks(instanceId: number): Promise<{ dat: InnoDBLock[]; err: string }> {
    return request(`/api/n9e/dbm/archery/innodb-locks?instance_id=${instanceId}`, {
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
