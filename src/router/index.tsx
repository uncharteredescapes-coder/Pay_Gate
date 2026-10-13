import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppDomain } from '../types';

interface RouterContextType {
  currentPath: string;
  navigate: (path: string) => void;
  params: Record<string, string>;
  activeDomain: AppDomain;
  setActiveDomain: (domain: AppDomain, targetPath?: string) => void;
  domainHost: string;
  fullSimulatedUrl: string;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

function detectInitialDomain(): AppDomain {
  if (typeof window === 'undefined') return 'merchant';
  const host = window.location.hostname.toLowerCase();

  if (host.startsWith('admin.')) return 'admin';
  if (host.startsWith('api.')) return 'api';
  if (host.startsWith('merchant.')) return 'merchant';

  // In preview / single-origin environment, fallback to localStorage or default
  const saved = localStorage.getItem('paygate_active_domain') as AppDomain;
  if (saved === 'admin' || saved === 'api' || saved === 'merchant') {
    return saved;
  }

  // Check URL pathname hint
  if (window.location.pathname.startsWith('/admin')) return 'admin';
  if (window.location.pathname.startsWith('/api')) return 'api';

  return 'merchant';
}

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  const [activeDomain, setActiveDomainState] = useState<AppDomain>(() => {
    return detectInitialDomain();
  });

  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname || '/';
      setCurrentPath(p);
      if (p.startsWith('/admin')) {
        setActiveDomainState('admin');
        localStorage.setItem('paygate_active_domain', 'admin');
      } else if (p.startsWith('/api')) {
        setActiveDomainState('api');
        localStorage.setItem('paygate_active_domain', 'api');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const setActiveDomain = (domain: AppDomain, targetPath = '/') => {
    setActiveDomainState(domain);
    localStorage.setItem('paygate_active_domain', domain);
    window.history.pushState({}, '', targetPath);
    setCurrentPath(targetPath);
  };

  const navigate = (path: string) => {
    // Auto sync activeDomain if path has domain prefix
    if (path.startsWith('/admin')) {
      if (activeDomain !== 'admin') {
        setActiveDomainState('admin');
        localStorage.setItem('paygate_active_domain', 'admin');
      }
    } else if (path.startsWith('/api')) {
      if (activeDomain !== 'api') {
        setActiveDomainState('api');
        localStorage.setItem('paygate_active_domain', 'api');
      }
    }

    if (path !== currentPath) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo(0, 0);
    }
  };

  // Helper to extract params like /pay/:id
  const params: Record<string, string> = {};
  if (currentPath.startsWith('/pay/')) {
    const parts = currentPath.split('/');
    if (parts[2]) {
      params.id = parts[2];
    }
  }

  const domainHost =
    activeDomain === 'admin'
      ? 'admin.example.com'
      : activeDomain === 'api'
      ? 'api.example.com'
      : 'merchant.example.com';

  const fullSimulatedUrl = `https://${domainHost}${currentPath === '/' ? '' : currentPath}`;

  return (
    <RouterContext.Provider
      value={{
        currentPath,
        navigate,
        params,
        activeDomain,
        setActiveDomain,
        domainHost,
        fullSimulatedUrl,
      }}
    >
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = () => {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within a RouterProvider');
  return ctx;
};

export const Link: React.FC<{
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}> = ({ href, children, className = '', onClick }) => {
  const { navigate } = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) onClick(e);
    navigate(href);
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
};
