/**
 * AI Chat State Store
 * n9e-2kai: AI 助手模块 - 对话状态存储
 * 
 * 使用模块级状态存储对话历史，页面切换时保留，刷新页面时清空
 */

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  format?: string;
  pending?: boolean;
  error?: boolean;
  source?: 'knowledge_base' | 'mcp_tool' | 'direct';
  tool?: {
    called: boolean;
    name?: string;
    status?: string;
    request?: any;
    error?: { code: string; message: string };
  };
}

export interface ChatState {
  messages: Message[];
  sessionId: string;
  conversationId: string;
  uploadedFiles: string[];
}

// 模块级状态存储（不使用 localStorage，刷新即清空）
let chatState: ChatState = {
  messages: [],
  sessionId: '',
  conversationId: '',
  uploadedFiles: [],
};

/**
 * 获取当前对话状态
 */
export const getChatState = (): ChatState => {
  return { ...chatState };
};

/**
 * 更新对话状态（部分更新）
 */
export const setChatState = (state: Partial<ChatState>): void => {
  chatState = { ...chatState, ...state };
};

/**
 * 清空所有对话状态（新建会话时使用）
 */
export const clearChatState = (): void => {
  chatState = {
    messages: [],
    sessionId: '',
    conversationId: '',
    uploadedFiles: [],
  };
};

/**
 * 仅清空消息和上传文件（清空对话时使用，保留会话 ID）
 */
export const clearMessages = (): void => {
  chatState = {
    ...chatState,
    messages: [],
    uploadedFiles: [],
  };
};

/**
 * 添加消息
 */
export const addMessage = (message: Message): void => {
  chatState = {
    ...chatState,
    messages: [...chatState.messages, message],
  };
};

/**
 * 更新指定消息
 */
export const updateMessage = (id: string, updates: Partial<Message>): void => {
  chatState = {
    ...chatState,
    messages: chatState.messages.map((msg) =>
      msg.id === id ? { ...msg, ...updates } : msg
    ),
  };
};

/**
 * 检查是否有保存的状态
 */
export const hasStoredState = (): boolean => {
  return chatState.messages.length > 0 || chatState.sessionId !== '';
};
