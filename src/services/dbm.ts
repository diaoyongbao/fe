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
    title: string;
    description?: string;
}): Promise<{ dat: any; err: string }> {
    return request('/api/n9e/dbm/archery/sql/workflow', {
        method: RequestMethod.Post,
        data: params,
    });
}
