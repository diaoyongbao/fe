import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, Input, Button, Avatar, Spin, Upload, Image } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import request from '@/utils/request';
import { GetProfile } from '@/services/account';

interface Message {
  id: number;
  role: 'user' | 'assistant' | 'welcome';
  content: string;
  toolCalls?: any[];
  images?: string[];
}

const WELCOME_MESSAGE = `👋 你好！我是**运维助手**，很高兴为你服务！

我目前支持以下能力：

🔧 **Kubernetes 管理**
- 查询集群状态、Pod、Deployment 等资源
- 执行 K8s 运维操作

📦 **Ansible 自动化**
- 执行 Ansible Playbook
- 批量运维任务

🔍 **Redis 运维**
- Redis 状态查询与管理

💬 请直接输入你的问题，我会尽力帮助你！`;

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: 'welcome', content: WELCOME_MESSAGE }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>();
  const [currentUser, setCurrentUser] = useState<string>('anonymous');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [pastedImages, setPastedImages] = useState<{ file: File; preview: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    GetProfile().then((res: any) => {
      const username = res?.dat?.nickname || res?.dat?.username || res?.nickname || res?.username || res?.dat?.name || res?.name;
      if (username) setCurrentUser(username);
    }).catch(() => { });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startNewChat = () => {
    setMessages([{ id: 0, role: 'welcome', content: WELCOME_MESSAGE }]);
    setSessionId(undefined);
    setFileList([]);
    setPastedImages([]);
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const preview = URL.createObjectURL(file);
          setPastedImages(prev => [...prev, { file, preview }]);
        }
      }
    }
  }, []);

  const removePastedImage = (index: number) => {
    setPastedImages(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSend = async () => {
    if ((!input.trim() && fileList.length === 0 && pastedImages.length === 0) || loading) return;
    setLoading(true);

    const userMsg: Message = { id: Date.now(), role: 'user', content: input, images: [] };

    const uploadedFiles: string[] = [];
    for (const file of fileList) {
      if (file.originFileObj) {
        const formData = new FormData();
        formData.append('file', file.originFileObj);
        try {
          const res = await request('/api/custom/v1/upload', { method: 'POST', data: formData });
          if (res?.url) uploadedFiles.push(res.url);
        } catch (err) { console.error('文件上传失败', err); }
      }
    }

    const uploadedImages: string[] = [];
    for (const img of pastedImages) {
      const formData = new FormData();
      formData.append('file', img.file);
      try {
        const res = await request('/api/custom/v1/upload', { method: 'POST', data: formData });
        if (res?.url) uploadedImages.push(res.url);
      } catch (err) { console.error('图片上传失败', err); }
    }
    userMsg.images = uploadedImages;

    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setFileList([]);
    setPastedImages([]);

    try {
      const res = await request('/api/custom/v1/chat', {
        method: 'POST',
        data: {
          message: currentInput,
          session_id: sessionId,
          user: currentUser,
          system_prompt: '你是一个专业的 AI 运维助手。',
          files: uploadedFiles,
          images: uploadedImages,
        },
        silence: true,
      });
      if (res?.session_id && !sessionId) {
        setSessionId(res.session_id);
      }
      const assistantMsg: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: res?.message || '无响应',
        toolCalls: res?.tool_calls,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errMsg = err?.data?.error || err?.message || '请求失败，请重试';
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: errMsg }]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = (msg: Message) => {
    if (msg.role === 'welcome') {
      return (
        <div key={msg.id} style={{ display: 'flex', marginBottom: 16 }}>
          <Avatar icon={<RobotOutlined />} style={{ marginRight: 8, backgroundColor: '#6C53B1' }} />
          <div style={{
            maxWidth: '70%',
            padding: '10px 14px',
            borderRadius: 12,
            backgroundColor: '#f0f0f0',
            color: '#262626',
            whiteSpace: 'pre-wrap',
          }}>
            {msg.content.split('**').map((part, i) =>
              i % 2 === 1 ? <strong key={i}>{part}</strong> : part
            )}
          </div>
        </div>
      );
    }

    return (
      <div key={msg.id} style={{ display: 'flex', marginBottom: 16, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
        {msg.role === 'assistant' && <Avatar icon={<RobotOutlined />} style={{ marginRight: 8, backgroundColor: '#6C53B1' }} />}
        <div style={{
          maxWidth: '70%',
          padding: '10px 14px',
          borderRadius: 12,
          backgroundColor: msg.role === 'user' ? '#6C53B1' : '#f0f0f0',
          color: msg.role === 'user' ? '#fff' : '#262626',
          whiteSpace: 'pre-wrap',
        }}>
          {msg.content}
          {msg.images && msg.images.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {msg.images.map((img, i) => (
                <Image key={i} src={img} width={100} style={{ borderRadius: 4 }} />
              ))}
            </div>
          )}
          {msg.toolCalls && msg.toolCalls.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
              工具调用: {msg.toolCalls.map((t: any) => t.name || t.tool_name).join(', ')}
            </div>
          )}
        </div>
        {msg.role === 'user' && <Avatar icon={<UserOutlined />} style={{ marginLeft: 8 }} />}
      </div>
    );
  };

  return (
    <Card
      title={<span>运维助手</span>}
      extra={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {sessionId && <span style={{ fontSize: 12, color: '#999' }}>{sessionId}</span>}
          <span style={{ fontSize: 12, color: '#666' }}>用户: {currentUser}</span>
          <Button onClick={startNewChat}>新对话</Button>
        </div>
      }
      style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 0' }}>
        {messages.map(renderMessage)}
        {loading && (
          <div style={{ display: 'flex', marginBottom: 16 }}>
            <Avatar icon={<RobotOutlined />} style={{ marginRight: 8, backgroundColor: '#6C53B1' }} />
            <div style={{ padding: '10px 14px', borderRadius: 12, backgroundColor: '#f0f0f0' }}>
              <Spin size="small" /> 思考中...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {pastedImages.length > 0 && (
        <div style={{ display: 'flex', gap: 8, padding: '8px 0', flexWrap: 'wrap' }}>
          {pastedImages.map((img, index) => (
            <div key={index} style={{ position: 'relative' }}>
              <img src={img.preview} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }} />
              <Button
                size="small"
                type="text"
                danger
                style={{ position: 'absolute', top: -8, right: -8, padding: 0, width: 20, height: 20, borderRadius: '50%', background: '#fff' }}
                onClick={() => removePastedImage(index)}
              >×</Button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, paddingTop: 16, borderTop: '1px solid #f0f0f0', alignItems: 'flex-end' }}>
        <Upload
          fileList={fileList}
          onChange={({ fileList }) => setFileList(fileList)}
          beforeUpload={() => false}
          multiple
        >
          <Button icon={<UploadOutlined />} />
        </Upload>
        <Input.TextArea
          placeholder="输入消息与AI对话...（可粘贴图片）"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPaste={handlePaste}
          onPressEnter={(e) => { if (!e.shiftKey) { e.preventDefault(); handleSend(); } }}
          disabled={loading}
          autoSize={{ minRows: 1, maxRows: 4 }}
          style={{ flex: 1 }}
        />
        <Button type="primary" icon={<SendOutlined />} onClick={handleSend} loading={loading} disabled={loading}>发送</Button>
      </div>
    </Card>
  );
};

export default AIChat;