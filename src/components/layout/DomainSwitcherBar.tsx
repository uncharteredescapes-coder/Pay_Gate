import React, { useState } from 'react';
import { useRouter } from '../../router';
import { AppDomain } from '../../types';
import { Globe, ShieldAlert, Code2, LayoutDashboard, ChevronUp, ChevronDown, Check } from 'lucide-react';

export const DomainSwitcherBar: React.FC = () => {
  const { activeDomain, setActiveDomain, domainHost, currentPath } = useRouter();
  const [isMinimized, setIsMinimized] = useState(false);

  const domains: { id: AppDomain; host: string; label: string; icon: React.ReactNode; color: string }[] = [
    {
      id: 'merchant',
      host: 'merchant.example.com',
      label: 'Merchant App',
      icon: <LayoutDashboard className="w-3.5 h-3.5" />,
      color: 'text-indigo-400',
    },
    {
      id: 'admin',
      host: 'admin.example.com',
      label: 'Super Admin App',
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
      color: 'text-amber-400',
    },
    {
      id: 'api',
      host: 'api.example.com',
      label: 'API Gateway Backend',
      icon: <Code2 className="w-3.5 h-3.5" />,
      color: 'text-emerald-400',
    },
  ];

  if (isMinimized) {
    return (
      <div className="fixed top-2 right-2 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-neutral-900/90 text-neutral-300 hover:text-white border border-neutral-700/80 px-2.5 py-1 rounded-full text-[11px] font-mono flex items-center gap-1.5 shadow-lg backdrop-blur-md cursor-pointer"
          title="Open Domain Switcher"
        >
          <Globe className="w-3 h-3 text-indigo-400 animate-pulse" />
          <span>{domainHost}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-neutral-950 text-neutral-200 border-b border-neutral-800 text-xs px-3 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-2 z-50 select-none shadow-inner">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-1.5 text-neutral-400 font-mono text-[11px]">
          <Globe className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold uppercase tracking-wider text-[10px] text-neutral-400">
            Multi-Domain Routing:
          </span>
          <span className="text-white font-bold bg-neutral-800/80 px-1.5 py-0.5 rounded border border-neutral-700">
            {domainHost}
          </span>
          <span className="text-neutral-500 hidden md:inline">({currentPath})</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {domains.map((d) => {
          const isActive = activeDomain === d.id;
          return (
            <button
              key={d.id}
              onClick={() => setActiveDomain(d.id)}
              className={`h-6 px-2.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-neutral-800 text-white font-bold border border-neutral-600 shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 border border-transparent'
              }`}
            >
              <span className={d.color}>{d.icon}</span>
              <span>{d.host}</span>
              {isActive && <Check className="w-3 h-3 text-indigo-400" />}
            </button>
          );
        })}

        <button
          onClick={() => setIsMinimized(true)}
          className="text-neutral-500 hover:text-neutral-300 p-1 rounded cursor-pointer ml-1"
          title="Minimize bar"
        >
          <ChevronUp className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
