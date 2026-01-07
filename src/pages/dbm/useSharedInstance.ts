import { useState, useEffect } from 'react';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { getArcheryInstances } from '@/services/dbm';
import { useDBMContext } from './context';

/**
 * 共享实例选择 Hook
 * 用于在各个 DBM 子页面统一管理实例选择
 */
export const useSharedInstance = () => {
    const { t } = useTranslation('dbm');
    const { state, setSelectedInstanceId, setInstances } = useDBMContext();
    const [loading, setLoading] = useState(false);

    const selectedInstance = state.selectedInstanceId;
    const instances = state.instances;

    // 获取实例列表
    const fetchInstances = async () => {
        if (instances.length > 0) {
            // 已有实例列表，不再请求
            return;
        }
        setLoading(true);
        try {
            const res = await getArcheryInstances();
            if (res.err) {
                message.error(res.err);
                return;
            }
            const list = res.dat?.list || [];
            setInstances(list);
            // 如果没有选中实例且有实例列表，选中第一个
            if (!selectedInstance && list.length > 0) {
                setSelectedInstanceId(list[0].id);
            }
        } catch (error) {
            message.error(t('fetch_failed'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInstances();
    }, []);

    const handleInstanceChange = (id: number) => {
        setSelectedInstanceId(id);
    };

    return {
        selectedInstance,
        instances,
        loading,
        handleInstanceChange,
        refreshInstances: fetchInstances,
    };
};

export default useSharedInstance;
