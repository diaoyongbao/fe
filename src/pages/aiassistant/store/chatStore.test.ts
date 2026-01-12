/**
 * Chat State Store Tests
 * n9e-2kai: AI 助手模块 - 状态存储测试
 * 
 * **Feature: ai-settings-enhancement, Property 1: Chat State Persistence Across Navigation**
 * **Validates: Requirements 2.1, 2.2**
 */
import {
  Message,
  ChatState,
  getChatState,
  setChatState,
  clearChatState,
  clearMessages,
  addMessage,
  updateMessage,
  hasStoredState,
} from './chatStore';

describe('Chat State Store', () => {
  // 每个测试前清空状态
  beforeEach(() => {
    clearChatState();
  });

  describe('getChatState', () => {
    it('should return initial empty state', () => {
      const state = getChatState();
      expect(state.messages).toEqual([]);
      expect(state.sessionId).toBe('');
      expect(state.conversationId).toBe('');
      expect(state.uploadedFiles).toEqual([]);
    });

    it('should return a copy of state, not the original reference', () => {
      const state1 = getChatState();
      const state2 = getChatState();
      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe('setChatState', () => {
    it('should update partial state', () => {
      setChatState({ sessionId: 'test-session' });
      const state = getChatState();
      expect(state.sessionId).toBe('test-session');
      expect(state.messages).toEqual([]);
    });

    it('should preserve existing state when updating partial', () => {
      setChatState({ sessionId: 'session-1', conversationId: 'conv-1' });
      setChatState({ sessionId: 'session-2' });
      const state = getChatState();
      expect(state.sessionId).toBe('session-2');
      expect(state.conversationId).toBe('conv-1');
    });
  });

  describe('clearChatState', () => {
    it('should reset all state to initial values', () => {
      const message: Message = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
      };
      setChatState({
        messages: [message],
        sessionId: 'session-1',
        conversationId: 'conv-1',
        uploadedFiles: ['file-1'],
      });

      clearChatState();
      const state = getChatState();

      expect(state.messages).toEqual([]);
      expect(state.sessionId).toBe('');
      expect(state.conversationId).toBe('');
      expect(state.uploadedFiles).toEqual([]);
    });
  });

  describe('clearMessages', () => {
    it('should clear messages and uploadedFiles but preserve sessionId and conversationId', () => {
      const message: Message = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
      };
      setChatState({
        messages: [message],
        sessionId: 'session-1',
        conversationId: 'conv-1',
        uploadedFiles: ['file-1'],
      });

      clearMessages();
      const state = getChatState();

      expect(state.messages).toEqual([]);
      expect(state.uploadedFiles).toEqual([]);
      expect(state.sessionId).toBe('session-1');
      expect(state.conversationId).toBe('conv-1');
    });
  });

  describe('addMessage', () => {
    it('should add a message to the messages array', () => {
      const message: Message = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
      };
      addMessage(message);
      const state = getChatState();
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0]).toEqual(message);
    });

    it('should append messages in order', () => {
      const msg1: Message = { id: 'msg-1', role: 'user', content: 'Hello' };
      const msg2: Message = { id: 'msg-2', role: 'assistant', content: 'Hi' };
      addMessage(msg1);
      addMessage(msg2);
      const state = getChatState();
      expect(state.messages).toHaveLength(2);
      expect(state.messages[0].id).toBe('msg-1');
      expect(state.messages[1].id).toBe('msg-2');
    });
  });

  describe('updateMessage', () => {
    it('should update an existing message by id', () => {
      const message: Message = {
        id: 'msg-1',
        role: 'assistant',
        content: '',
        pending: true,
      };
      addMessage(message);
      updateMessage('msg-1', { content: 'Updated content', pending: false });
      const state = getChatState();
      expect(state.messages[0].content).toBe('Updated content');
      expect(state.messages[0].pending).toBe(false);
    });

    it('should not affect other messages', () => {
      const msg1: Message = { id: 'msg-1', role: 'user', content: 'Hello' };
      const msg2: Message = { id: 'msg-2', role: 'assistant', content: 'Hi' };
      addMessage(msg1);
      addMessage(msg2);
      updateMessage('msg-1', { content: 'Updated' });
      const state = getChatState();
      expect(state.messages[0].content).toBe('Updated');
      expect(state.messages[1].content).toBe('Hi');
    });

    it('should do nothing if message id not found', () => {
      const message: Message = { id: 'msg-1', role: 'user', content: 'Hello' };
      addMessage(message);
      updateMessage('non-existent', { content: 'Updated' });
      const state = getChatState();
      expect(state.messages[0].content).toBe('Hello');
    });
  });

  describe('hasStoredState', () => {
    it('should return false for initial state', () => {
      expect(hasStoredState()).toBe(false);
    });

    it('should return true if messages exist', () => {
      addMessage({ id: 'msg-1', role: 'user', content: 'Hello' });
      expect(hasStoredState()).toBe(true);
    });

    it('should return true if sessionId exists', () => {
      setChatState({ sessionId: 'session-1' });
      expect(hasStoredState()).toBe(true);
    });

    it('should return false after clearChatState', () => {
      addMessage({ id: 'msg-1', role: 'user', content: 'Hello' });
      clearChatState();
      expect(hasStoredState()).toBe(false);
    });
  });

  /**
   * Property Test: Chat State Persistence Across Navigation
   * **Feature: ai-settings-enhancement, Property 1: Chat State Persistence Across Navigation**
   * **Validates: Requirements 2.1, 2.2**
   * 
   * For any chat state (messages, sessionId, conversationId), when the user navigates 
   * away from the AI Chat page and returns, the state SHALL be identical to the state 
   * before navigation.
   */
  describe('Property 1: Chat State Persistence Across Navigation', () => {
    it('should persist state across simulated navigation (get -> set -> get)', () => {
      // Simulate setting state before navigation
      const originalState: ChatState = {
        messages: [
          { id: 'msg-1', role: 'user', content: 'Hello' },
          { id: 'msg-2', role: 'assistant', content: 'Hi there!' },
        ],
        sessionId: 'session-123',
        conversationId: 'conv-456',
        uploadedFiles: ['file-1', 'file-2'],
      };

      setChatState(originalState);

      // Simulate navigation away (component unmount - state persists in module)
      // Simulate navigation back (component mount - get state)
      const restoredState = getChatState();

      // Verify state is identical
      expect(restoredState.messages).toEqual(originalState.messages);
      expect(restoredState.sessionId).toBe(originalState.sessionId);
      expect(restoredState.conversationId).toBe(originalState.conversationId);
      expect(restoredState.uploadedFiles).toEqual(originalState.uploadedFiles);
    });

    it('should persist complex message state with tool info', () => {
      const messageWithTool: Message = {
        id: 'msg-1',
        role: 'assistant',
        content: 'Query result',
        source: 'mcp_tool',
        tool: {
          called: true,
          name: 'query_alerts',
          status: 'success',
          request: { query: 'SELECT * FROM alerts' },
        },
      };

      setChatState({ messages: [messageWithTool] });
      const restored = getChatState();

      expect(restored.messages[0].tool).toEqual(messageWithTool.tool);
      expect(restored.messages[0].source).toBe('mcp_tool');
    });

    it('should handle multiple navigation cycles', () => {
      // First navigation cycle
      setChatState({ sessionId: 'session-1' });
      addMessage({ id: 'msg-1', role: 'user', content: 'First message' });

      // Simulate first return
      let state = getChatState();
      expect(state.messages).toHaveLength(1);

      // Continue conversation
      addMessage({ id: 'msg-2', role: 'assistant', content: 'Response' });

      // Second navigation cycle
      state = getChatState();
      expect(state.messages).toHaveLength(2);
      expect(state.sessionId).toBe('session-1');
    });
  });
});
