import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ArcheryInstance } from '@/services/dbm';

// 存储键
const STORAGE_KEY = 'dbm_state';

// DBM 共享状态接口
interface DBMState {
    // 通用状态
    selectedInstanceId: number | null;
    instances: ArcheryInstance[];
    
    // SQL 查询页状态
    sqlQuery: {
        selectedDatabase: string;
        sqlContent: string;
        limitNum: number;
    };
    
    // 会话管理页状态
    sessions: {
        commandFilter: string;
        userFilter: string;
    };
    
    // 慢查询页状态
    slowQueries: {
        dbNameFilter: string;
    };
    
    // Kill 日志页状态
    killLogs: {
        selectedInstanceId: number | null;
        selectedRuleId: number | null;
    };
}

// 默认状态
const defaultState: DBMState = {
    selectedInstanceId: null,
    instances: [],
    sqlQuery: {
        selectedDatabase: '',
        sqlContent: '',
        limitNum: 1000,
    },
    sessions: {
        commandFilter: '',
        userFilter: '',
    },
    slowQueries: {
        dbNameFilter: '',
    },
    killLogs: {
        selectedInstanceId: null,
        selectedRuleId: null,
    },
};

// Context 值接口
interface DBMContextValue {
    state: DBMState;
    // 通用
    setSelectedInstanceId: (id: number | null) => void;
    setInstances: (instances: ArcheryInstance[]) => void;
    // SQL 查询
    setSqlQueryState: (updates: Partial<DBMState['sqlQuery']>) => void;
    // 会话管理
    setSessionsState: (updates: Partial<DBMState['sessions']>) => void;
    // 慢查询
    setSlowQueriesState: (updates: Partial<DBMState['slowQueries']>) => void;
    // Kill 日志
    setKillLogsState: (updates: Partial<DBMState['killLogs']>) => void;
}

// 创建 Context
const DBMContext = createContext<DBMContextValue | null>(null);

// 从 sessionStorage 读取状态
const loadState = (): DBMState => {
    try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            return { ...defaultState, ...parsed };
        }
    } catch (e) {
        console.warn('Failed to load DBM state from sessionStorage:', e);
    }
    return defaultState;
};

// 保存状态到 sessionStorage
const saveState = (state: DBMState) => {
    try {
        // 不保存 instances（太大且会变化）
        const toSave = { ...state, instances: [] };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
        console.warn('Failed to save DBM state to sessionStorage:', e);
    }
};

// Provider 组件
export const DBMProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<DBMState>(loadState);

    // 状态变化时保存到 sessionStorage
    useEffect(() => {
        saveState(state);
    }, [state]);

    const setSelectedInstanceId = (id: number | null) => {
        setState(prev => ({ ...prev, selectedInstanceId: id }));
    };

    const setInstances = (instances: ArcheryInstance[]) => {
        setState(prev => ({ ...prev, instances }));
    };

    const setSqlQueryState = (updates: Partial<DBMState['sqlQuery']>) => {
        setState(prev => ({
            ...prev,
            sqlQuery: { ...prev.sqlQuery, ...updates },
        }));
    };

    const setSessionsState = (updates: Partial<DBMState['sessions']>) => {
        setState(prev => ({
            ...prev,
            sessions: { ...prev.sessions, ...updates },
        }));
    };

    const setSlowQueriesState = (updates: Partial<DBMState['slowQueries']>) => {
        setState(prev => ({
            ...prev,
            slowQueries: { ...prev.slowQueries, ...updates },
        }));
    };

    const setKillLogsState = (updates: Partial<DBMState['killLogs']>) => {
        setState(prev => ({
            ...prev,
            killLogs: { ...prev.killLogs, ...updates },
        }));
    };

    const value: DBMContextValue = {
        state,
        setSelectedInstanceId,
        setInstances,
        setSqlQueryState,
        setSessionsState,
        setSlowQueriesState,
        setKillLogsState,
    };

    return (
        <DBMContext.Provider value={value}>
            {children}
        </DBMContext.Provider>
    );
};

// 自定义 Hook
export const useDBMContext = (): DBMContextValue => {
    const context = useContext(DBMContext);
    if (!context) {
        throw new Error('useDBMContext must be used within DBMProvider');
    }
    return context;
};

export default DBMContext;
