/**
 * AI 助手 API 服务
 * n9e-2kai: AI 助手模块
 */
import request from '@/utils/request';
import { RequestMethod } from '@/store/common';

// ===== 类型定义 =====

// 聊天消息
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    format?: 'text' | 'markdown' | 'json';
    timestamp?: number;
}

// 聊天请求（统一入口，无需 mode 字段）
export interface ChatRequest {
    session_id?: string;
    message: string;
    conversation_id?: string; // 知识库对话 ID（用于连续对话）
    client_context?: {
        busi_group_id?: number;
        user_timezone?: string;
        ui_language?: string;
        env?: string;
    };
    files?: string[]; // 文件 ID 列表
}

// 聊天响应（统一格式）
export interface ChatResponse {
    trace_id: string;
    session_id: string;
    status: 'completed' | 'pending_confirmation' | 'error';
    conversation_id?: string; // 知识库对话 ID
    assistant_message?: {
        format: 'text' | 'markdown' | 'json';
        content: string;
    };
    // 内容来源标记（Function Calling 新增）
    source?: 'knowledge_base' | 'mcp_tool' | 'direct';
    // 工具调用信息
    tool?: {
        called: boolean;
        name?: string;
        status?: 'success' | 'failed';
        request?: any;
        result?: any;
        error?: {
            code: string;
            message: string;
            raw?: string;
        };
    };
    pending_confirmation?: PendingAction;
    attachments?: Attachment[];
}

// 工具调用
export interface ToolCall {
    tool_name: string;
    arguments: Record<string, any>;
    result?: any;
    error?: string;
    duration_ms?: number;
}

// 待确认操作
export interface PendingAction {
    action_id: string;
    action_type: string;
    risk_level: 'low' | 'medium' | 'high';
    description: string;
    details: Record<string, any>;
    expires_at: number;
}

// 附件
export interface Attachment {
    type: 'file' | 'link';
    file_id?: string;
    url?: string;
    name: string;
    mime_type?: string;
    size?: number;
}

// MCP Server
export interface MCPServer {
    id: number;
    name: string;
    description: string;
    server_type: 'http' | 'sse';
    endpoint: string;
    health_check_url: string;
    health_check_interval: number;
    allowed_envs: string;
    allowed_prefixes: string;
    allowed_ips: string;
    enabled: boolean;
    health_status: number; // 0=未知 1=健康 2=异常
    last_check_time: number;
    last_check_error: string;
    create_at: number;
    create_by: string;
    update_at: number;
    update_by: string;
}

// MCP 模板
export interface MCPTemplate {
    id: number;
    name: string;
    description: string;
    server_config: string;
    category: string;
    is_default: boolean;
    is_public: boolean;
    create_at: number;
    create_by: string;
    update_at: number;
    update_by: string;
}

// AI 配置
export interface AIConfig {
    id: number;
    config_key: string;
    config_value: string;
    config_type: string;
    description: string;
    scope: string;
    scope_id: number;
    enabled: boolean;
    create_at: number;
    create_by: string;
    update_at: number;
    update_by: string;
}

// 会话统计
export interface SessionStats {
    active_count: number;
    last24h_created: number;
    last24h_active: number;
    storage_estimate: string;
}

// 会话信息
export interface SessionInfo {
    session_id: string;
    messages: ChatMessage[];
    created_at?: number;
    last_active_at?: number;
}

// ===== API 函数 =====

// 健康检查
export function aiAssistantHealth(): Promise<{ dat: { status: string; timestamp: number }; err: string }> {
    return request('/api/n9e/ai-assistant/health', {
        method: RequestMethod.Get,
    });
}

// 发送聊天消息
export function sendChatMessage(params: ChatRequest): Promise<{ dat: ChatResponse; err: string }> {
    return request('/api/n9e/ai-assistant/chat', {
        method: RequestMethod.Post,
        data: params,
    });
}

// 上传文件
export function uploadFile(file: File): Promise<{ dat: { file_id: string; file_name: string; mime_type: string; size: number; expires_at: number }; err: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return request('/api/n9e/ai-assistant/chat/upload', {
        method: RequestMethod.Post,
        data: formData,
    });
}

// 知识库查询
export function queryKnowledge(params: { query: string; top_k?: number }): Promise<{ dat: { answer: string; status: string }; err: string }> {
    return request('/api/n9e/ai-assistant/knowledge/query', {
        method: RequestMethod.Post,
        data: params,
    });
}

// 下载文件
export function getFileDownloadUrl(path: string): string {
    return `/api/n9e/ai-assistant/files/download/${encodeURIComponent(path)}`;
}

// ===== 会话管理 =====

// 获取会话统计
export function getSessionStats(): Promise<{ dat: SessionStats; err: string }> {
    return request('/api/n9e/ai-assistant/sessions/stats', {
        method: RequestMethod.Get,
    });
}

// 获取会话详情
export function getSession(sessionId: string): Promise<{ dat: SessionInfo; err: string }> {
    return request(`/api/n9e/ai-assistant/sessions/${sessionId}`, {
        method: RequestMethod.Get,
    });
}

// 删除会话
export function deleteSession(sessionId: string): Promise<{ dat: string; err: string }> {
    return request(`/api/n9e/ai-assistant/sessions/${sessionId}`, {
        method: RequestMethod.Delete,
    });
}

// 归档会话
export function archiveSessions(params: { before_days?: number }): Promise<{ dat: { archived_count: number }; err: string }> {
    return request('/api/n9e/ai-assistant/sessions/archive', {
        method: RequestMethod.Post,
        data: params,
    });
}

// ===== MCP Server 管理 =====

// 获取 MCP Server 列表
export function getMCPServers(): Promise<{ dat: MCPServer[]; err: string }> {
    return request('/api/n9e/ai-assistant/mcp/servers', {
        method: RequestMethod.Get,
    });
}

// 创建 MCP Server
export function createMCPServer(params: Partial<MCPServer>): Promise<{ dat: number; err: string }> {
    return request('/api/n9e/ai-assistant/mcp/servers', {
        method: RequestMethod.Post,
        data: params,
    });
}

// 更新 MCP Server
export function updateMCPServer(id: number, params: Partial<MCPServer>): Promise<{ dat: string; err: string }> {
    return request(`/api/n9e/ai-assistant/mcp/servers/${id}`, {
        method: RequestMethod.Put,
        data: params,
    });
}

// 删除 MCP Server
export function deleteMCPServer(id: number): Promise<{ dat: string; err: string }> {
    return request(`/api/n9e/ai-assistant/mcp/servers/${id}`, {
        method: RequestMethod.Delete,
    });
}

// ===== MCP 模板管理 =====

// 获取 MCP 模板列表
export function getMCPTemplates(): Promise<{ dat: MCPTemplate[]; err: string }> {
    return request('/api/n9e/ai-assistant/mcp/templates', {
        method: RequestMethod.Get,
    });
}

// 创建 MCP 模板
export function createMCPTemplate(params: Partial<MCPTemplate>): Promise<{ dat: number; err: string }> {
    return request('/api/n9e/ai-assistant/mcp/templates', {
        method: RequestMethod.Post,
        data: params,
    });
}

// 更新 MCP 模板
export function updateMCPTemplate(id: number, params: Partial<MCPTemplate>): Promise<{ dat: string; err: string }> {
    return request(`/api/n9e/ai-assistant/mcp/templates/${id}`, {
        method: RequestMethod.Put,
        data: params,
    });
}

// 删除 MCP 模板
export function deleteMCPTemplate(id: number): Promise<{ dat: string; err: string }> {
    return request(`/api/n9e/ai-assistant/mcp/templates/${id}`, {
        method: RequestMethod.Delete,
    });
}

// ===== AI 配置管理 =====

// 获取 AI 配置列表
export function getAIConfigs(): Promise<{ dat: AIConfig[]; err: string }> {
    return request('/api/n9e/ai-assistant/config', {
        method: RequestMethod.Get,
    });
}

// 获取单个 AI 配置
export function getAIConfig(key: string): Promise<{ dat: AIConfig; err: string }> {
    return request(`/api/n9e/ai-assistant/config/${key}`, {
        method: RequestMethod.Get,
    });
}

// 更新 AI 配置
export function updateAIConfig(key: string, configValue: string): Promise<{ dat: string; err: string }> {
    return request(`/api/n9e/ai-assistant/config/${key}`, {
        method: RequestMethod.Put,
        data: { config_value: configValue },
    });
}

// 重载配置
export function reloadAIConfig(): Promise<{ dat: string; err: string }> {
    return request('/api/n9e/ai-assistant/config/reload', {
        method: RequestMethod.Post,
    });
}

// 测试配置连接
export function testAIConfig(configKey: string, configValue: string): Promise<{ dat: { status: string; message: string; response?: string; model?: string; usage?: any }; err: string }> {
    return request('/api/n9e/ai-assistant/config/test', {
        method: RequestMethod.Post,
        data: { config_key: configKey, config_value: configValue },
    });
}


// ===== 知识库提供者管理 =====

// 知识库提供者
export interface KnowledgeProvider {
    id: number;
    name: string;
    provider_type: string; // cloudflare_autorag, coze, etc.
    config: string; // JSON 配置
    enabled: boolean;
    create_at: number;
    create_by: string;
    update_at: number;
    update_by: string;
}

// Cloudflare AutoRAG 配置
export interface CloudflareRAGConfig {
    account_id: string;
    rag_name: string;
    api_token: string;
    model?: string;
    rewrite_query?: boolean;
    max_num_results?: number;
    score_threshold?: number;
    timeout?: number;
}

// 知识库工具
export interface KnowledgeTool {
    id: number;
    name: string;
    description: string;
    provider_id: number;
    parameters: string; // JSON 配置
    keywords: string; // JSON 数组
    enabled: boolean;
    priority: number;
    create_at: number;
    create_by: string;
    update_at: number;
    update_by: string;
}

// 知识库工具参数
export interface KnowledgeToolParameters {
    max_results?: number;
    score_threshold?: number;
}

// 获取知识库提供者列表
export function getKnowledgeProviders(): Promise<{ dat: KnowledgeProvider[]; err: string }> {
    return request('/api/n9e/ai-assistant/knowledge-providers', {
        method: RequestMethod.Get,
    });
}

// 获取单个知识库提供者
export function getKnowledgeProvider(id: number): Promise<{ dat: KnowledgeProvider; err: string }> {
    return request(`/api/n9e/ai-assistant/knowledge-providers/${id}`, {
        method: RequestMethod.Get,
    });
}

// 创建知识库提供者
export function createKnowledgeProvider(params: Partial<KnowledgeProvider>): Promise<{ dat: number; err: string }> {
    return request('/api/n9e/ai-assistant/knowledge-providers', {
        method: RequestMethod.Post,
        data: params,
    });
}

// 更新知识库提供者
export function updateKnowledgeProvider(id: number, params: Partial<KnowledgeProvider>): Promise<{ dat: string; err: string }> {
    return request(`/api/n9e/ai-assistant/knowledge-providers/${id}`, {
        method: RequestMethod.Put,
        data: params,
    });
}

// 删除知识库提供者
export function deleteKnowledgeProvider(id: number): Promise<{ dat: string; err: string }> {
    return request(`/api/n9e/ai-assistant/knowledge-providers/${id}`, {
        method: RequestMethod.Delete,
    });
}

// 测试知识库提供者连接
export function testKnowledgeProvider(id: number): Promise<{ dat: { status: string; message: string; response?: any }; err: string }> {
    return request(`/api/n9e/ai-assistant/knowledge-providers/${id}/test`, {
        method: RequestMethod.Post,
    });
}

// ===== 知识库工具管理 =====

// 获取知识库工具列表
export function getKnowledgeTools(): Promise<{ dat: KnowledgeTool[]; err: string }> {
    return request('/api/n9e/ai-assistant/knowledge-tools', {
        method: RequestMethod.Get,
    });
}

// 获取单个知识库工具
export function getKnowledgeTool(id: number): Promise<{ dat: KnowledgeTool; err: string }> {
    return request(`/api/n9e/ai-assistant/knowledge-tools/${id}`, {
        method: RequestMethod.Get,
    });
}

// 创建知识库工具
export function createKnowledgeTool(params: Partial<KnowledgeTool>): Promise<{ dat: number; err: string }> {
    return request('/api/n9e/ai-assistant/knowledge-tools', {
        method: RequestMethod.Post,
        data: params,
    });
}

// 更新知识库工具
export function updateKnowledgeTool(id: number, params: Partial<KnowledgeTool>): Promise<{ dat: string; err: string }> {
    return request(`/api/n9e/ai-assistant/knowledge-tools/${id}`, {
        method: RequestMethod.Put,
        data: params,
    });
}

// 删除知识库工具
export function deleteKnowledgeTool(id: number): Promise<{ dat: string; err: string }> {
    return request(`/api/n9e/ai-assistant/knowledge-tools/${id}`, {
        method: RequestMethod.Delete,
    });
}


// 重载知识库配置
export function reloadKnowledgeConfig(): Promise<{ dat: { message: string; provider_count: number; tool_count: number; timestamp: number }; err: string }> {
    return request('/api/n9e/ai-assistant/knowledge-reload', {
        method: RequestMethod.Post,
    });
}

// ===== AI Agent 管理 =====

// AI Agent 定义
export interface AIAgent {
    id: number;
    name: string;
    description: string;
    system_prompt: string;
    model_config: string;
    keywords: string;
    priority: number;
    agent_type: 'system' | 'expert' | 'knowledge';
    enabled: boolean;
    create_at: number;
    create_by: string;
    update_at: number;
    update_by: string;
}

// 获取 Agent 列表（用于 @Mention）
export function getAIAgents(params?: { type?: string; enabled?: string }): Promise<{ dat: AIAgent[]; err: string }> {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.enabled) queryParams.append('enabled', params.enabled);
    const queryString = queryParams.toString();
    return request(`/api/n9e/ai-assistant/agents${queryString ? '?' + queryString : ''}`, {
        method: RequestMethod.Get,
    });
}

// 获取单个 Agent
export function getAIAgent(id: number): Promise<{ dat: { agent: AIAgent; tools: AITool[] }; err: string }> {
    return request(`/api/n9e/ai-assistant/agents/${id}`, {
        method: RequestMethod.Get,
    });
}

// 创建 Agent
export function createAIAgent(agent: Partial<AIAgent>): Promise<{ dat: number; err: string }> {
    return request('/api/n9e/ai-assistant/agents', {
        method: RequestMethod.Post,
        data: agent,
    });
}

// 更新 Agent
export function updateAIAgent(id: number, updates: Partial<AIAgent>): Promise<{ dat: string; err: string }> {
    return request(`/api/n9e/ai-assistant/agents/${id}`, {
        method: RequestMethod.Put,
        data: updates,
    });
}

// 删除 Agent
export function deleteAIAgent(id: number): Promise<{ dat: string; err: string }> {
    return request(`/api/n9e/ai-assistant/agents/${id}`, {
        method: RequestMethod.Delete,
    });
}

// 绑定工具到 Agent
export function bindAgentTools(agentId: number, toolIds: number[]): Promise<{ dat: string; err: string }> {
    return request(`/api/n9e/ai-assistant/agents/${agentId}/tools`, {
        method: RequestMethod.Put,
        data: { tool_ids: toolIds },
    });
}

// ===== AI Tool 管理 =====

// AI Tool 定义
export interface AITool {
    id: number;
    name: string;
    description: string;
    implementation_type: 'native' | 'api' | 'mcp' | 'knowledge';
    method?: string;
    url_path?: string;
    parameter_schema?: string;
    response_mapping?: string;
    mcp_server_id?: number;
    mcp_tool_name?: string;
    native_handler?: string;
    knowledge_provider_id?: number;
    risk_level: 'low' | 'medium' | 'high';
    enabled: boolean;
    create_at: number;
    create_by: string;
    update_at: number;
    update_by: string;
}

// 获取 Tool 列表
export function getAITools(params?: { type?: string; enabled?: string }): Promise<{ dat: AITool[]; err: string }> {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.enabled) queryParams.append('enabled', params.enabled);
    const queryString = queryParams.toString();
    return request(`/api/n9e/ai-assistant/tools${queryString ? '?' + queryString : ''}`, {
        method: RequestMethod.Get,
    });
}

// 获取单个 Tool
export function getAITool(id: number): Promise<{ dat: AITool; err: string }> {
    return request(`/api/n9e/ai-assistant/tools/${id}`, {
        method: RequestMethod.Get,
    });
}

// 创建 Tool
export function createAITool(tool: Partial<AITool>): Promise<{ dat: number; err: string }> {
    return request('/api/n9e/ai-assistant/tools', {
        method: RequestMethod.Post,
        data: tool,
    });
}

// 更新 Tool
export function updateAITool(id: number, updates: Partial<AITool>): Promise<{ dat: string; err: string }> {
    return request(`/api/n9e/ai-assistant/tools/${id}`, {
        method: RequestMethod.Put,
        data: updates,
    });
}

// 删除 Tool
export function deleteAITool(id: number): Promise<{ dat: string; err: string }> {
    return request(`/api/n9e/ai-assistant/tools/${id}`, {
        method: RequestMethod.Delete,
    });
}
