/**
 * 知识库工具表单组件
 * n9e-2kai: AI 助手模块 - 知识库设置
 */
import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Switch, InputNumber, message, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  KnowledgeTool,
  KnowledgeProvider,
  KnowledgeToolParameters,
  createKnowledgeTool,
  updateKnowledgeTool,
  getKnowledgeProviders,
} from '@/services/aiassistant';

const { Option } = Select;
const { TextArea } = Input;

interface ToolFormProps {
  visible: boolean;
  record?: KnowledgeTool;
  onOk: () => void;
  onCancel: () => void;
}

const ToolForm: React.FC<ToolFormProps> = ({ visible, record, onOk, onCancel }) => {
  const { t } = useTranslation('aiassistant');
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<KnowledgeProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [inputKeyword, setInputKeyword] = useState('');

  // 加载提供者列表
  const fetchProviders = async () => {
    setLoadingProviders(true);
    try {
      const res = await getKnowledgeProviders();
      if (res.err) {
        message.error(res.err);
      } else {
        setProviders(res.dat || []);
      }
    } catch (error) {
      message.error(t('knowledge.load_providers_failed'));
    } finally {
      setLoadingProviders(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchProviders();
      if (record) {
        // 编辑模式：解析配置
        let parameters: KnowledgeToolParameters = {};
        let keywordList: string[] = [];
        try {
          parameters = JSON.parse(record.parameters || '{}');
          keywordList = JSON.parse(record.keywords || '[]');
        } catch (e) {
          console.error('Failed to parse config:', e);
        }

        form.setFieldsValue({
          name: record.name,
          description: record.description,
          provider_id: record.provider_id,
          enabled: record.enabled,
          priority: record.priority,
          max_results: parameters.max_results ?? 5,
          score_threshold: parameters.score_threshold ?? 0.7,
        });
        setKeywords(keywordList);
      } else {
        // 新建模式：重置表单
        form.resetFields();
        form.setFieldsValue({
          enabled: true,
          priority: 0,
          max_results: 5,
          score_threshold: 0.7,
        });
        setKeywords([]);
      }
    }
  }, [visible, record, form]);


  const handleAddKeyword = () => {
    const keyword = inputKeyword.trim();
    if (keyword && !keywords.includes(keyword)) {
      setKeywords([...keywords, keyword]);
      setInputKeyword('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword));
  };

  const handleKeywordInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const buildParameters = (values: any): string => {
    const params: KnowledgeToolParameters = {
      max_results: values.max_results,
      score_threshold: values.score_threshold,
    };
    return JSON.stringify(params);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const params = {
        name: values.name,
        description: values.description,
        provider_id: values.provider_id,
        parameters: buildParameters(values),
        keywords: JSON.stringify(keywords),
        enabled: values.enabled,
        priority: values.priority,
      };

      let res;
      if (record) {
        res = await updateKnowledgeTool(record.id, params);
      } else {
        res = await createKnowledgeTool(params);
      }

      if (res.err) {
        message.error(res.err);
      } else {
        message.success(record ? t('knowledge.update_success') : t('knowledge.create_success'));
        onOk();
      }
    } catch (error) {
      // 表单验证失败
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={record ? t('knowledge.edit_tool') : t('knowledge.add_tool')}
      visible={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label={t('knowledge.tool_name')}
          rules={[{ required: true, message: t('knowledge.tool_name_required') }]}
        >
          <Input placeholder={t('knowledge.tool_name_placeholder')} />
        </Form.Item>

        <Form.Item
          name="description"
          label={t('knowledge.tool_description')}
          rules={[{ required: true, message: t('knowledge.tool_description_required') }]}
        >
          <TextArea rows={3} placeholder={t('knowledge.tool_description_placeholder')} />
        </Form.Item>

        <Form.Item
          name="provider_id"
          label={t('knowledge.provider')}
          rules={[{ required: true, message: t('knowledge.provider_required') }]}
        >
          <Select
            placeholder={t('knowledge.provider_placeholder')}
            loading={loadingProviders}
            showSearch
            optionFilterProp="children"
          >
            {providers
              .filter((p) => p.enabled)
              .map((provider) => (
                <Option key={provider.id} value={provider.id}>
                  {provider.name} ({provider.provider_type})
                </Option>
              ))}
          </Select>
        </Form.Item>

        <Form.Item label={t('knowledge.keywords')}>
          <div style={{ marginBottom: 8 }}>
            {keywords.map((keyword) => (
              <Tag
                key={keyword}
                closable
                onClose={() => handleRemoveKeyword(keyword)}
                style={{ marginBottom: 4 }}
              >
                {keyword}
              </Tag>
            ))}
          </div>
          <Input
            value={inputKeyword}
            onChange={(e) => setInputKeyword(e.target.value)}
            onKeyDown={handleKeywordInputKeyDown}
            onBlur={handleAddKeyword}
            placeholder={t('knowledge.keywords_placeholder')}
            style={{ width: '100%' }}
          />
          <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
            {t('knowledge.keywords_tip')}
          </div>
        </Form.Item>

        <Form.Item name="priority" label={t('knowledge.priority')}>
          <InputNumber min={0} max={100} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="max_results" label={t('knowledge.max_results')}>
          <InputNumber min={1} max={20} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="score_threshold" label={t('knowledge.score_threshold')}>
          <InputNumber min={0} max={1} step={0.1} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="enabled" label={t('knowledge.enabled')} valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ToolForm;
