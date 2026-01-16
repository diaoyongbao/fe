/**
 * AI 助手 - 对话页面（Function Calling 统一入口）
 * n9e-2kai: AI 助手模块
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input, Button, Card, Space, message, Spin, Avatar, Tag, Modal, Upload, Tooltip, Result, Collapse, Dropdown, Menu } from 'antd';
import {
    SendOutlined,
    RobotOutlined,
    UserOutlined,
    DeleteOutlined,
    PlusOutlined,
    UploadOutlined,
    ExclamationCircleOutlined,
    SettingOutlined,
    ThunderboltOutlined,
    BulbOutlined,
    DatabaseOutlined,
    AlertOutlined,
    BookOutlined,
    ApiOutlined,
    MessageOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import PageLayout from '@/components/pageLayout';
import { sendChatMessage, uploadFile, aiAssistantHealth, ChatMessage, ChatResponse, getAIAgents, AIAgent } from '@/services/aiassistant';
import {
    Message,
    getChatState,
    setChatState,
    clearChatState,
    clearMessages as clearStoreMessages,
} from '../store/chatStore';
import './index.less';

const { TextArea } = Input;
const { Panel } = Collapse;

const AIChat: React.FC = () => {
    const { t } = useTranslation('aiassistant');
    const history = useHistory();

    // n9e-2kai: 从 store 恢复状态，实现页面切换后保留对话
    const initialState = getChatState();
    const [messages, setMessages] = useState<Message[]>(initialState.messages);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string>(initialState.sessionId);
    const [conversationId, setConversationId] = useState<string>(initialState.conversationId);
    const [uploadedFiles, setUploadedFiles] = useState<string[]>(initialState.uploadedFiles);
    const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
    const [checkingHealth, setCheckingHealth] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // n9e-2kai: @Mention 相关状态
    const [agents, setAgents] = useState<AIAgent[]>([]);
    const [mentionVisible, setMentionVisible] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
    const inputRef = useRef<any>(null);

    // n9e-2kai: 状态变更时同步到 store
    useEffect(() => {
        setChatState({ messages, sessionId, conversationId, uploadedFiles });
    }, [messages, sessionId, conversationId, uploadedFiles]);

    // n9e-2kai: 加载 Agent 列表用于 @Mention
    const loadAgents = useCallback(async () => {
        try {
            const res = await getAIAgents({ enabled: 'true' });
            if (!res.err && res.dat) {
                setAgents(res.dat);
            }
        } catch (error) {
            console.error('Failed to load agents:', error);
        }
    }, []);

    useEffect(() => {
        loadAgents();
    }, [loadAgents]);

    // 检查 AI 服务配置状态
    const checkAIHealth = async () => {
        setCheckingHealth(true);
        try {
            const res = await aiAssistantHealth();
            if (res.err) {
                setAiConfigured(false);
                return;
            }
            const healthData = res.dat as any;
            const aiStatus = healthData?.components?.ai;
            setAiConfigured(aiStatus === 'configured' || aiStatus === 'ok');
        } catch (error) {
            setAiConfigured(false);
        } finally {
            setCheckingHealth(false);
        }
    };

    useEffect(() => {
        checkAIHealth();
    }, []);


    // 滚动到底部
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 生成消息 ID
    const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 发送消息
    const handleSend = async () => {
        const trimmedInput = inputValue.trim();
        if (!trimmedInput) {
            message.warning(t('chat.empty_message'));
            return;
        }

        // n9e-2kai: 构建消息内容，如果选择了 Agent 则添加 @Mention
        let messageContent = trimmedInput;
        if (selectedAgent) {
            messageContent = `@${selectedAgent.name} ${trimmedInput}`;
        }

        // 添加用户消息
        const userMessage: Message = {
            id: generateId(),
            role: 'user',
            content: messageContent,
            timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setInputValue('');
        setSelectedAgent(null); // 清除选中的 Agent

        // 添加 AI 思考中的占位消息
        const aiMessageId = generateId();
        const aiPendingMessage: Message = {
            id: aiMessageId,
            role: 'assistant',
            content: '',
            pending: true,
        };
        setMessages((prev) => [...prev, aiPendingMessage]);
        setLoading(true);

        try {
            const res = await sendChatMessage({
                session_id: sessionId || undefined,
                conversation_id: conversationId || undefined,
                message: messageContent,
                files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
            });

            if (res.err) {
                // 更新为错误消息
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === aiMessageId
                            ? { ...m, content: res.err, pending: false, error: true }
                            : m
                    )
                );
                message.error(res.err);
            } else {
                const data: ChatResponse = res.dat;
                // 保存 session_id
                if (data.session_id && !sessionId) {
                    setSessionId(data.session_id);
                }
                // 保存 conversation_id（用于知识库连续对话）
                if (data.conversation_id) {
                    setConversationId(data.conversation_id);
                }

                // 更新 AI 回复
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === aiMessageId
                            ? {
                                ...m,
                                content: data.assistant_message?.content || '',
                                format: data.assistant_message?.format,
                                pending: false,
                                source: data.source,
                                tool: data.tool,
                            }
                            : m
                    )
                );

                // 清空已上传文件
                setUploadedFiles([]);
            }
        } catch (error) {
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === aiMessageId
                        ? { ...m, content: t('chat.error'), pending: false, error: true }
                        : m
                )
            );
            message.error(t('chat.error'));
        } finally {
            setLoading(false);
        }
    };

    // n9e-2kai: 清空对话 - 仅清空消息，保留会话 ID
    const handleClear = () => {
        Modal.confirm({
            title: t('chat.confirm_clear'),
            icon: <ExclamationCircleOutlined />,
            onOk: () => {
                setMessages([]);
                setUploadedFiles([]);
                clearStoreMessages();
                message.success(t('chat.session_cleared'));
            },
        });
    };

    // n9e-2kai: 新建会话 - 清空所有状态
    const handleNewSession = () => {
        setMessages([]);
        setSessionId('');
        setConversationId('');
        setUploadedFiles([]);
        clearChatState();
        message.success(t('chat.session_created'));
    };

    // 文件上传
    const handleUpload = async (file: File) => {
        try {
            const res = await uploadFile(file);
            if (res.err) {
                message.error(res.err);
                return false;
            }
            setUploadedFiles((prev) => [...prev, res.dat.file_id]);
            message.success(t('chat.file_uploaded'));
        } catch (error) {
            message.error(t('chat.file_upload_failed'));
        }
        return false; // 阻止默认上传行为
    };

    // 按键处理
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
        // n9e-2kai: @ 键触发 Mention
        if (e.key === '@' || (e.key === '2' && e.shiftKey)) {
            // 延迟设置，让 @ 字符先输入
            setTimeout(() => {
                setMentionVisible(true);
                setMentionSearch('');
            }, 50);
        }
        // ESC 关闭 Mention
        if (e.key === 'Escape') {
            setMentionVisible(false);
        }
    };

    // n9e-2kai: 处理输入变化，检测 @Mention
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setInputValue(value);

        // 检测是否正在输入 @mention
        const lastAtIndex = value.lastIndexOf('@');
        if (lastAtIndex !== -1 && mentionVisible) {
            const searchText = value.substring(lastAtIndex + 1);
            // 如果搜索文本包含空格，说明 @mention 输入完成
            if (searchText.includes(' ')) {
                setMentionVisible(false);
            } else {
                setMentionSearch(searchText.toLowerCase());
            }
        }
    };

    // n9e-2kai: 选择 Agent
    const handleSelectAgent = (agent: AIAgent) => {
        setSelectedAgent(agent);
        setMentionVisible(false);
        // 移除输入框中的 @xxx，因为已经选中了 Agent
        const lastAtIndex = inputValue.lastIndexOf('@');
        if (lastAtIndex !== -1) {
            setInputValue(inputValue.substring(0, lastAtIndex));
        }
    };

    // n9e-2kai: 取消选中的 Agent
    const handleRemoveAgent = () => {
        setSelectedAgent(null);
    };

    // n9e-2kai: 过滤 Agent 列表
    const filteredAgents = agents.filter((agent) => {
        if (!mentionSearch) return true;
        return (
            agent.name.toLowerCase().includes(mentionSearch) ||
            agent.description.toLowerCase().includes(mentionSearch)
        );
    });

    // n9e-2kai: 获取 Agent 类型图标
    const getAgentTypeIcon = (agentType: string) => {
        switch (agentType) {
            case 'system':
                return <RobotOutlined />;
            case 'expert':
                return <TeamOutlined />;
            case 'knowledge':
                return <BookOutlined />;
            default:
                return <RobotOutlined />;
        }
    };

    // 前往设置
    const goToSettings = () => {
        history.push('/ai-assistant/settings');
    };

    // 快捷问题
    const quickQuestions = [
        { icon: <ThunderboltOutlined />, text: '帮我分析今日告警趋势' },
        { icon: <DatabaseOutlined />, text: '查询数据库慢查询 TOP 10' },
        { icon: <AlertOutlined />, text: '查看最近 1 小时的 P0 告警' },
        { icon: <BulbOutlined />, text: '如何配置告警屏蔽规则' },
    ];

    const handleQuickQuestion = (text: string) => {
        setInputValue(text);
    };

    // 获取来源图标
    const getSourceIcon = (source?: string) => {
        switch (source) {
            case 'knowledge_base':
                return <BookOutlined style={{ color: '#52c41a' }} />;
            case 'mcp_tool':
                return <ApiOutlined style={{ color: '#1890ff' }} />;
            default:
                return <MessageOutlined style={{ color: '#722ed1' }} />;
        }
    };

    // 获取来源标签
    const getSourceTag = (source?: string) => {
        switch (source) {
            case 'knowledge_base':
                return <Tag color="green" icon={<BookOutlined />}>{t('chat.source_knowledge')}</Tag>;
            case 'mcp_tool':
                return <Tag color="blue" icon={<ApiOutlined />}>{t('chat.source_tool')}</Tag>;
            default:
                return null;
        }
    };

    // 渲染工具调用信息
    const renderToolInfo = (tool?: Message['tool']) => {
        if (!tool || !tool.called) return null;

        return (
            <Collapse ghost className="tool-info-collapse">
                <Panel
                    header={
                        <Space size="small">
                            <ApiOutlined />
                            <span>{t('chat.tool_called')}: {tool.name}</span>
                            {tool.status === 'success' ? (
                                <Tag color="success">{t('chat.tool_success')}</Tag>
                            ) : (
                                <Tag color="error">{t('chat.tool_failed')}</Tag>
                            )}
                        </Space>
                    }
                    key="tool"
                >
                    {tool.request && (
                        <div className="tool-detail">
                            <strong>{t('chat.tool_request')}:</strong>
                            <pre>{JSON.stringify(tool.request, null, 2)}</pre>
                        </div>
                    )}
                    {tool.error && (
                        <div className="tool-error">
                            <strong>{t('chat.tool_error')}:</strong> [{tool.error.code}] {tool.error.message}
                        </div>
                    )}
                </Panel>
            </Collapse>
        );
    };


    // 渲染消息内容
    const renderMessageContent = (msg: Message) => {
        if (msg.pending) {
            return (
                <div className="message-thinking">
                    <Spin size="small" />
                    <span>{t('chat.thinking')}</span>
                </div>
            );
        }

        // Debug: Log info about message content to trace image issues
        if (msg.role === 'assistant') {
            console.log('Rendering assistant message:', msg.id, msg.content);
        }

        return (
            <>
                {msg.role === 'assistant' && msg.source && (
                    <div className="message-source">
                        {getSourceTag(msg.source)}
                    </div>
                )}
                {msg.format === 'markdown' ? (
                    <div className="message-markdown">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            components={{
                                code({ node, inline, className, children, ...props }) {
                                    const match = /language-(\w+)/.exec(className || '');
                                    return !inline && match ? (
                                        <SyntaxHighlighter
                                            style={oneDark}
                                            language={match[1]}
                                            PreTag="div"
                                            {...props}
                                        >
                                            {String(children).replace(/\n$/, '')}
                                        </SyntaxHighlighter>
                                    ) : (
                                        <code className={className} {...props}>
                                            {children}
                                        </code>
                                    );
                                },
                            }}
                        >
                            {msg.content}
                        </ReactMarkdown>
                    </div>
                ) : (
                    <div className="message-text">{msg.content}</div>
                )}
                {msg.role === 'assistant' && renderToolInfo(msg.tool)}
            </>
        );
    };

    // 渲染欢迎界面
    const renderWelcome = () => {
        // 正在检查配置状态
        if (checkingHealth) {
            return (
                <div className="chat-welcome">
                    <Spin size="large" />
                    <p style={{ marginTop: 16 }}>{t('chat.checking_status')}</p>
                </div>
            );
        }

        // AI 未配置
        if (aiConfigured === false) {
            return (
                <div className="chat-welcome">
                    <Result
                        icon={<SettingOutlined style={{ color: '#faad14' }} />}
                        title={t('chat.config_needed')}
                        subTitle={t('chat.config_needed_desc')}
                        extra={
                            <Button type="primary" icon={<SettingOutlined />} onClick={goToSettings}>
                                {t('chat.go_to_settings')}
                            </Button>
                        }
                    />
                </div>
            );
        }

        // 已配置，显示欢迎信息
        return (
            <div className="chat-welcome">
                <div className="welcome-icon">
                    <RobotOutlined style={{ fontSize: 64, color: '#722ed1' }} />
                </div>
                <h2>{t('chat.welcome_title')}</h2>
                <p>{t('chat.welcome_subtitle')}</p>
                <div className="quick-questions">
                    {quickQuestions.map((q, index) => (
                        <Button
                            key={index}
                            icon={q.icon}
                            onClick={() => handleQuickQuestion(q.text)}
                            className="quick-question-btn"
                        >
                            {q.text}
                        </Button>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <PageLayout
            title={
                <Space>
                    <RobotOutlined />
                    {t('chat_title')}
                </Space>
            }
        >
            <div className="ai-chat-container">
                <Card
                    className="ai-chat-card"
                    extra={
                        <Space>
                            <Tooltip title={t('chat.new_session')}>
                                <Button icon={<PlusOutlined />} onClick={handleNewSession} disabled={loading}>
                                    {t('chat.new_session')}
                                </Button>
                            </Tooltip>
                            <Tooltip title={t('chat.clear')}>
                                <Button icon={<DeleteOutlined />} onClick={handleClear} disabled={loading || messages.length === 0}>
                                    {t('chat.clear')}
                                </Button>
                            </Tooltip>
                            <Tooltip title={t('chat.settings')}>
                                <Button icon={<SettingOutlined />} onClick={goToSettings} />
                            </Tooltip>
                        </Space>
                    }
                >
                    {/* 消息列表 */}
                    <div className="chat-messages">
                        {messages.length === 0 ? (
                            renderWelcome()
                        ) : (
                            messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`chat-message ${msg.role === 'user' ? 'user' : 'assistant'} ${msg.error ? 'error' : ''}`}
                                >
                                    <Avatar
                                        icon={msg.role === 'user' ? <UserOutlined /> : getSourceIcon(msg.source)}
                                        className={`message-avatar ${msg.role}`}
                                    />
                                    <div className="message-content">
                                        {renderMessageContent(msg)}
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* 输入区域 */}
                    <div className="chat-input-area">
                        {uploadedFiles.length > 0 && (
                            <div className="uploaded-files">
                                {uploadedFiles.map((fileId, index) => (
                                    <Tag
                                        key={fileId}
                                        closable
                                        onClose={() => setUploadedFiles((prev) => prev.filter((_, i) => i !== index))}
                                    >
                                        {fileId}
                                    </Tag>
                                ))}
                            </div>
                        )}
                        {/* n9e-2kai: 显示选中的 Agent */}
                        {selectedAgent && (
                            <div className="selected-agent">
                                <Tag
                                    color="purple"
                                    icon={getAgentTypeIcon(selectedAgent.agent_type)}
                                    closable
                                    onClose={handleRemoveAgent}
                                >
                                    @{selectedAgent.name}
                                </Tag>
                                <span className="agent-hint">{t('chat.agent_selected')}</span>
                            </div>
                        )}
                        <div className="input-row">
                            <Upload
                                showUploadList={false}
                                beforeUpload={handleUpload}
                                disabled={loading}
                            >
                                <Button icon={<UploadOutlined />} disabled={loading} />
                            </Upload>
                            {/* n9e-2kai: @Mention 下拉菜单 */}
                            <Dropdown
                                visible={mentionVisible && filteredAgents.length > 0}
                                overlay={
                                    <Menu className="mention-menu">
                                        {filteredAgents.slice(0, 10).map((agent) => (
                                            <Menu.Item
                                                key={agent.id}
                                                onClick={() => handleSelectAgent(agent)}
                                                icon={getAgentTypeIcon(agent.agent_type)}
                                            >
                                                <div className="mention-item">
                                                    <span className="mention-name">@{agent.name}</span>
                                                    <span className="mention-desc">{agent.description}</span>
                                                </div>
                                            </Menu.Item>
                                        ))}
                                    </Menu>
                                }
                                placement="topLeft"
                                trigger={[]}
                            >
                                <TextArea
                                    ref={inputRef}
                                    value={inputValue}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    onBlur={() => setTimeout(() => setMentionVisible(false), 200)}
                                    placeholder={t('chat.placeholder_mention')}
                                    autoSize={{ minRows: 1, maxRows: 4 }}
                                    disabled={loading || aiConfigured === false}
                                    className="chat-input"
                                />
                            </Dropdown>
                            <Button
                                type="primary"
                                icon={<SendOutlined />}
                                onClick={handleSend}
                                loading={loading}
                                disabled={!inputValue.trim() || aiConfigured === false}
                            >
                                {t('chat.send')}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </PageLayout>
    );
};

export default AIChat;
