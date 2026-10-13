import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '../types/index.ts';

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

export interface UIContextType {
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  language: 'en' | 'bn';
  setLanguage: (l: 'en' | 'bn') => void;
  toasts: ToastItem[];
  addToast: (title: string, message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  currentUserRole: UserRole;
  setCurrentUserRole: (r: UserRole) => void;
  activeView: 'merchant' | 'pay' | 'admin' | 'simulator';
  setActiveView: (v: 'merchant' | 'pay' | 'admin' | 'simulator') => void;
  activeMerchantTab: 'overview' | 'payments' | 'plans' | 'settlements' | 'developers' | 'settings';
  setActiveMerchantTab: (t: 'overview' | 'payments' | 'plans' | 'settlements' | 'developers' | 'settings') => void;
  activeAdminTab: 'device' | 'wallets' | 'review' | 'payouts' | 'audit' | 'fleet';
  setActiveAdminTab: (t: 'device' | 'wallets' | 'review' | 'payouts' | 'audit' | 'fleet') => void;
  selectedPaymentId: string | null;
  setSelectedPaymentId: (id: string | null) => void;
  popupPayModalId: string | null;
  setPopupPayModalId: (id: string | null) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('paygate_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const [language, setLanguage] = useState<'en' | 'bn'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('paygate_lang');
      if (saved === 'bn' || saved === 'en') return saved;
    }
    return 'en';
  });

  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('merchant');
  const [activeView, setActiveView] = useState<'merchant' | 'pay' | 'admin' | 'simulator'>('merchant');
  const [activeMerchantTab, setActiveMerchantTab] = useState<'overview' | 'payments' | 'plans' | 'settlements' | 'developers' | 'settings'>('overview');
  const [activeAdminTab, setActiveAdminTab] = useState<'device' | 'wallets' | 'review' | 'payouts' | 'audit' | 'fleet'>('device');
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [popupPayModalId, setPopupPayModalId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('paygate_theme', theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('paygate_lang', language);
    }
  }, [language]);

  const addToast = (
    title: string,
    message: string,
    type: 'success' | 'warning' | 'error' | 'info' = 'info'
  ) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastItem = { id, title, message, type };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <UIContext.Provider
      value={{
        theme,
        setTheme,
        language,
        setLanguage,
        toasts,
        addToast,
        removeToast,
        currentUserRole,
        setCurrentUserRole,
        activeView,
        setActiveView,
        activeMerchantTab,
        setActiveMerchantTab,
        activeAdminTab,
        setActiveAdminTab,
        selectedPaymentId,
        setSelectedPaymentId,
        popupPayModalId,
        setPopupPayModalId,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within a UIProvider');
  return ctx;
};
