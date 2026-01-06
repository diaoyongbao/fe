import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, Switch, message, Tabs } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  createMiddlewareDatasource,
  updateMiddlewareDatasource,
  getMiddlewareTypes,
  MiddlewareDatasource,
} from '@/services/middleware';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

interface FormModalProps {
  visible: boolean;
  editingRecord?: MiddlewareDatasource;
  onCancel: () => void;
  onSuccess: () => void;
}

const FormModal: React.FC<FormModalProps> = ({
  visible,
  editingRecord,
  onCancel,
  onSuccess,
}) => {
  const { t } = useTranslation('middleware');
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [authType, setAuthType] = useState<string>('token');
  const [middlewareTypes, setMiddlewareTypes] = useState<string[]>([
    'archery',
    'jumpserver',
    'jenkins',
    'gitlab',
    'nacos',
    'consul',
  ]);

  useEffect(() => {
    // 可选：从后端获取支持的类型
    getMiddlewareTypes().then((res: any) => {
      if (res.dat && Array.isArray(res.dat)) {
        setMiddlewareTypes(res.dat.map((item: any) => item.value || item));
      }
    }).catch(() => {
      // 使用默认类型
    });
  }, []);

  useEffect(() => {
    if (visible) {
      if (editingRecord) {
        // 编辑模式：填充表单
        const authConfig = editingRecord.auth_config || {};
        form.setFieldsValue({
          name: editingRecord.name,
          type: editingRecord.type,
          description: editingRecord.description,
          address: editingRecord.address,
          status: editingRecord.status,
          timeout: editingRecord.timeout || 5000,
          connect_timeout: editingRecord.connect_timeout || 2000,
          insecure_skip_verify: editingRecord.insecure_skip_verify || false,
          auth_type: editingRecord.auth_type,
          health_check_url: editingRecord.health_check_url,
          health_check_interval: editingRecord.health_check_interval || 60,
          // Auth config fields
          ...authConfig,
        });
        setAuthType(editingRecord.auth_type);
      } else {
        // 新建模式：重置表单
        form.resetFields();
        setAuthType('token');
      }
    }
  }, [visible, editingRecord, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 构造 auth_config 对象
      const authConfig: Record<string, any> = {};
      if (authType === 'token') {
        authConfig.token = values.token;
        authConfig.header_name = values.header_name || 'Authorization';
        authConfig.header_prefix = values.header_prefix || 'Bearer';
      } else if (authType === 'basic') {
        authConfig.username = values.username;
        authConfig.password = values.password;
      } else if (authType === 'session') {
        authConfig.username = values.username;
        authConfig.password = values.password;
        authConfig.login_url = values.login_url;
      } else if (authType === 'oauth2') {
        authConfig.client_id = values.client_id;
        authConfig.client_secret = values.client_secret;
        authConfig.token_url = values.token_url;
      }

      const data: MiddlewareDatasource = {
        name: values.name,
        type: values.type,
        description: values.description,
        address: values.address,
        status: values.status,
        timeout: values.timeout,
        connect_timeout: values.connect_timeout,
        insecure_skip_verify: values.insecure_skip_verify,
        auth_type: authType,
        auth_config: authConfig,
        health_check_url: values.health_check_url,
        health_check_interval: values.health_check_interval,
      };

      let res;
      if (editingRecord) {
        res = await updateMiddlewareDatasource(editingRecord.id!, data);
      } else {
        res = await createMiddlewareDatasource(data);
      }

      if (res.err) {
        message.error(res.err);
        return;
      }

      message.success(editingRecord ? t('edit_success') : t('add_success'));
      onSuccess();
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误
        return;
      }
      message.error(error.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  // 渲染认证配置表单项
  const renderAuthFields = () => {
    switch (authType) {
      case 'token':
        return (
          <>
            <Form.Item
              label={t('token')}
              name="token"
              rules={[{ required: true, message: t('token_required') }]}
            >
              <Input.Password placeholder={t('token_placeholder')} />
            </Form.Item>
            <Form.Item
              label={t('header_name')}
              name="header_name"
            >
              <Input placeholder={t('header_name_placeholder')} />
            </Form.Item>
            <Form.Item
              label={t('header_prefix')}
              name="header_prefix"
            >
              <Input placeholder={t('header_prefix_placeholder')} />
            </Form.Item>
          </>
        );

      case 'basic':
        return (
          <>
            <Form.Item
              label={t('username')}
              name="username"
              rules={[{ required: true, message: t('username_required') }]}
            >
              <Input placeholder={t('username_placeholder')} />
            </Form.Item>
            <Form.Item
              label={t('password')}
              name="password"
              rules={[{ required: true, message: t('password_required') }]}
            >
              <Input.Password placeholder={t('password_placeholder')} />
            </Form.Item>
          </>
        );

      case 'session':
        return (
          <>
            <Form.Item
              label={t('login_url')}
              name="login_url"
              rules={[{ required: true, message: '请输入登录 URL' }]}
            >
              <Input placeholder={t('login_url_placeholder')} />
            </Form.Item>
            <Form.Item
              label={t('username')}
              name="username"
              rules={[{ required: true, message: t('username_required') }]}
            >
              <Input placeholder={t('username_placeholder')} />
            </Form.Item>
            <Form.Item
              label={t('password')}
              name="password"
              rules={[{ required: true, message: t('password_required') }]}
            >
              <Input.Password placeholder={t('password_placeholder')} />
            </Form.Item>
          </>
        );

      case 'oauth2':
        return (
          <>
            <Form.Item
              label={t('client_id')}
              name="client_id"
              rules={[{ required: true, message: t('client_id_placeholder') }]}
            >
              <Input placeholder={t('client_id_placeholder')} />
            </Form.Item>
            <Form.Item
              label={t('client_secret')}
              name="client_secret"
              rules={[{ required: true, message: t('client_secret_placeholder') }]}
            >
              <Input.Password placeholder={t('client_secret_placeholder')} />
            </Form.Item>
            <Form.Item
              label={t('token_url')}
              name="token_url"
              rules={[{ required: true, message: t('token_url_placeholder') }]}
            >
              <Input placeholder={t('token_url_placeholder')} />
            </Form.Item>
          </>
        );

      case 'none':
        return (
          <div style={{ padding: '20px 0', color: '#999', textAlign: 'center' }}>
            无需配置认证信息
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      title={editingRecord ? t('edit') : t('add')}
      visible={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={700}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        preserve={false}
      >
        <Tabs defaultActiveKey="basic">
          <TabPane tab={t('form_basic_info')} key="basic">
            <Form.Item
              label={t('name')}
              name="name"
              rules={[
                { required: true, message: t('name_required') },
                { pattern: /^[a-zA-Z0-9_-]+$/, message: t('name_rule') },
              ]}
            >
              <Input placeholder={t('name_placeholder')} />
            </Form.Item>

            <Form.Item
              label={t('type')}
              name="type"
              rules={[{ required: true, message: t('type_required') }]}
            >
              <Select placeholder={t('type_placeholder')}>
                {middlewareTypes.map((type) => (
                  <Option key={type} value={type}>
                    {t(`type_${type}` as any)}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label={t('description')}
              name="description"
            >
              <TextArea
                rows={3}
                placeholder={t('description_placeholder')}
              />
            </Form.Item>

            <Form.Item
              label={t('status')}
              name="status"
              initialValue="enabled"
            >
              <Select>
                <Option value="enabled">{t('status_enabled')}</Option>
                <Option value="disabled">{t('status_disabled')}</Option>
              </Select>
            </Form.Item>
          </TabPane>

          <TabPane tab={t('form_connection')} key="connection">
            <Form.Item
              label={t('address')}
              name="address"
              rules={[
                { required: true, message: t('address_required') },
                { type: 'url', message: t('address_rule') },
              ]}
            >
              <Input placeholder={t('address_placeholder')} />
            </Form.Item>

            <Form.Item
              label={t('timeout')}
              name="timeout"
              initialValue={5000}
            >
              <InputNumber
                min={1000}
                max={60000}
                step={1000}
                style={{ width: '100%' }}
                placeholder={t('timeout_placeholder')}
                addonAfter="ms"
              />
            </Form.Item>

            <Form.Item
              label={t('connect_timeout')}
              name="connect_timeout"
              initialValue={2000}
            >
              <InputNumber
                min={500}
                max={30000}
                step={500}
                style={{ width: '100%' }}
                placeholder={t('connect_timeout_placeholder')}
                addonAfter="ms"
              />
            </Form.Item>

            <Form.Item
              label={t('insecure_skip_verify')}
              name="insecure_skip_verify"
              valuePropName="checked"
              initialValue={false}
            >
              <Switch />
            </Form.Item>
          </TabPane>

          <TabPane tab={t('form_auth')} key="auth">
            <Form.Item
              label={t('auth_type')}
              name="auth_type"
              initialValue="token"
            >
              <Select onChange={(value) => setAuthType(value)}>
                <Option value="token">{t('auth_type_token')}</Option>
                <Option value="basic">{t('auth_type_basic')}</Option>
                <Option value="session">{t('auth_type_session')}</Option>
                <Option value="oauth2">{t('auth_type_oauth2')}</Option>
                <Option value="none">{t('auth_type_none')}</Option>
              </Select>
            </Form.Item>

            {renderAuthFields()}
          </TabPane>

          <TabPane tab={t('form_health_check')} key="health">
            <Form.Item
              label={t('health_check_url')}
              name="health_check_url"
            >
              <Input placeholder={t('health_check_url_placeholder')} />
            </Form.Item>

            <Form.Item
              label={t('health_check_interval')}
              name="health_check_interval"
              initialValue={60}
            >
              <InputNumber
                min={10}
                max={3600}
                step={10}
                style={{ width: '100%' }}
                placeholder={t('health_check_interval_placeholder')}
                addonAfter={t('common:time.seconds')}
              />
            </Form.Item>
          </TabPane>
        </Tabs>
      </Form>
    </Modal>
  );
};

export default FormModal;

