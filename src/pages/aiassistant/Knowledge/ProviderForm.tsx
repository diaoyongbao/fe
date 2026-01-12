/**
 * 知识库提供者表单组件
 * n9e-2kai: AI 助手模块 - 知识库设置
 */
import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Switch, InputNumber, Button, message, Divider } from 'antd';
import { ApiOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  KnowledgeProvider,
  CloudflareRAGConfig,
  createKnowledgeProvider,
  updateKnowledgeProvider,
  testKnowledgeProvider,
} from '@/services/aiassistant';

const { Option } = Select;

interface ProviderFormProps {
  visible: boolean;
  record?: KnowledgeProvider;
  onOk: () => void;
  onCancel: () => void;
}

// 支持的提供者类型
const PROVIDER_TYPES = [
  { value: 'cloudflare_autorag', label: 'Cloudflare AutoRAG' },
  { value: 'coze', label: 'Coze (Coming Soon)', disabled: true },
];

const ProviderForm: React.FC<ProviderFormProps> = ({ visible, record, onOk, onCancel }) => {
  const { t } = useTranslation('aiassistant');
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [providerType, setProviderType] = useState<string>('cloudflare_autorag');

  useEffect(() => {
    if (visible) {
      if (record) {
        // 编辑模式：解析配置
        let config: Partial<CloudflareRAGConfig> = {};
        try {
          config = JSON.parse(record.config || '{}');
        } catch (e) {
          console.error('Failed to parse config:', e);
        }

        form.setFieldsValue({
          name: record.name,
          provider_type: record.provider_type,
          enabled: record.enabled,
          // Cloudflare 配置
          account_id: config.account_id,
          rag_name: config.rag_name,
          api_token: config.api_token,
          model: config.model,
          rewrite_query: config.rewrite_query ?? true,
          max_num_results: config.max_num_results ?? 5,
          score_threshold: config.score_threshold ?? 0.7,
          timeout: config.timeout ?? 30,
        });
        setProviderType(record.provider_type);
      } else {
        // 新建模式：重置表单
        form.resetFields();
        form.setFieldsValue({
          provider_type: 'cloudflare_autorag',
          enabled: true,
          rewrite_query: true,
          max_num_results: 5,
          score_threshold: 0.7,
          timeout: 30,
        });
        setProviderType('cloudflare_autorag');
      }
    }
  }, [visible, record, form]);

  const handleProviderTypeChange = (value: string) => {
    setProviderType(value);
  };

  const buildConfig = (values: any): string => {
    if (providerType === 'cloudflare_autorag') {
      const config: CloudflareRAGConfig = {
        account_id: values.account_id,
        rag_name: values.rag_name,
        api_token: values.api_token,
        model: values.model,
        rewrite_query: values.rewrite_query,
        max_num_results: values.max_num_results,
        score_threshold: values.score_threshold,
        timeout: values.timeout,
      };
      return JSON.stringify(config);
    }
    return '{}';
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const params = {
        name: values.name,
        provider_type: values.provider_type,
        config: buildConfig(values),
        enabled: values.enabled,
      };

      let res;
      if (record) {
        res = await updateKnowledgeProvider(record.id, params);
      } else {
        res = await createKnowledgeProvider(params);
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

  const handleTest = async () => {
    if (!record) {
      message.warning(t('knowledge.save_before_test'));
      return;
    }

    setTesting(true);
    try {
      const res = await testKnowledgeProvider(record.id);
      if (res.err) {
        message.error(res.err);
      } else if (res.dat.status === 'success') {
        message.success(t('knowledge.test_success'));
      } else {
        message.warning(res.dat.message || t('knowledge.test_failed'));
      }
    } catch (error) {
      message.error(t('knowledge.test_failed'));
    } finally {
      setTesting(false);
    }
  };

  const renderCloudflareFields = () => (
    <>
      <Divider orientation="left">{t('knowledge.cloudflare_config')}</Divider>

      <Form.Item
        name="account_id"
        label={t('knowledge.account_id')}
        rules={[{ required: true, message: t('knowledge.account_id_required') }]}
      >
        <Input placeholder={t('knowledge.account_id_placeholder')} />
      </Form.Item>

      <Form.Item
        name="rag_name"
        label={t('knowledge.rag_name')}
        rules={[{ required: true, message: t('knowledge.rag_name_required') }]}
      >
        <Input placeholder={t('knowledge.rag_name_placeholder')} />
      </Form.Item>

      <Form.Item
        name="api_token"
        label={t('knowledge.api_token')}
        rules={[{ required: true, message: t('knowledge.api_token_required') }]}
      >
        <Input.Password placeholder={t('knowledge.api_token_placeholder')} />
      </Form.Item>

      <Form.Item name="model" label={t('knowledge.model')}>
        <Input placeholder={t('knowledge.model_placeholder')} />
      </Form.Item>

      <Form.Item name="rewrite_query" label={t('knowledge.rewrite_query')} valuePropName="checked">
        <Switch />
      </Form.Item>

      <Form.Item name="max_num_results" label={t('knowledge.max_num_results')}>
        <InputNumber min={1} max={20} style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item name="score_threshold" label={t('knowledge.score_threshold')}>
        <InputNumber min={0} max={1} step={0.1} style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item name="timeout" label={t('knowledge.timeout')}>
        <InputNumber min={5} max={120} addonAfter="s" style={{ width: '100%' }} />
      </Form.Item>
    </>
  );

  return (
    <Modal
      title={record ? t('knowledge.edit_provider') : t('knowledge.add_provider')}
      visible={visible}
      onCancel={onCancel}
      width={600}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {t('common:btn.cancel')}
        </Button>,
        record && (
          <Button key="test" icon={<ApiOutlined />} loading={testing} onClick={handleTest}>
            {t('knowledge.test_connection')}
          </Button>
        ),
        <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
          {t('common:btn.ok')}
        </Button>,
      ].filter(Boolean)}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label={t('knowledge.provider_name')}
          rules={[{ required: true, message: t('knowledge.name_required') }]}
        >
          <Input placeholder={t('knowledge.name_placeholder')} />
        </Form.Item>

        <Form.Item
          name="provider_type"
          label={t('knowledge.provider_type')}
          rules={[{ required: true }]}
        >
          <Select onChange={handleProviderTypeChange}>
            {PROVIDER_TYPES.map((type) => (
              <Option key={type.value} value={type.value} disabled={type.disabled}>
                {type.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="enabled" label={t('knowledge.enabled')} valuePropName="checked">
          <Switch />
        </Form.Item>

        {providerType === 'cloudflare_autorag' && renderCloudflareFields()}
      </Form>
    </Modal>
  );
};

export default ProviderForm;
