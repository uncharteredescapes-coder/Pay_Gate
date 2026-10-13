import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  Globe,
  Sun,
  Moon,
  CheckCircle2,
  Sparkles,
  LayoutDashboard,
  ShieldAlert,
} from 'lucide-react';
import { useRouter, Link } from '../../router';
import { usePayGate } from '../../context/PayGateContext';
import { GateButton } from '../gate-ui/GateButton';
import { GateInput } from '../gate-ui/GateInput';
import { UserRole } from '../../types';

export const SignInPage: React.FC = () => {
  const { navigate, setActiveDomain } = useRouter();
  const { merchant, theme, setTheme, language, setLanguage, setCurrentUserRole, addToast } = usePayGate();

  const [role, setRole] = useState<UserRole>('merchant');
  const [email, setEmail] = useState('gmsinternationalbd5@gmail.com');
  const [password, setPassword] = useState('••••••••••••');
  const [twoFactorCode, setTwoFactorCode] = useState('849201');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    if (twoFactorCode.length < 6) {
      setErrorMessage('Please enter a valid 6-digit 2FA authenticator code.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setCurrentUserRole(role);
      if (role === 'admin') {
        addToast('Admin Session Initialized', 'Welcome Tanvir Ahmed (Ops Checker)', 'success');
        setActiveDomain('admin', '/');
      } else {
        addToast('Welcome Back', `Signed in as ${merchant.name}`, 'success');
        setActiveDomain('merchant', '/');
      }
    }, 600);
  };

  const handleDemoFillMerchant = () => {
    setRole('merchant');
    setEmail('gmsinternationalbd5@gmail.com');
    setPassword('DeshiCart2026!Secure');
    setTwoFactorCode('529104');
    setErrorMessage(null);
    addToast('Credentials Filled', 'Demo merchant profile loaded', 'info');
  };

  const handleDemoFillAdmin = () => {
    setRole('admin');
    setEmail('ops.tanvir@paygate.internal');
    setPassword('OpsChecker99!Secure');
    setTwoFactorCode('918234');
    setErrorMessage(null);
    addToast('Credentials Filled', 'Demo Ops Admin profile loaded', 'info');
  };

  const t = {
    en: {
      title: role === 'admin' ? 'PayGate Ops Command Center' : 'Sign in to Merchant Portal',
      subtitle: role === 'admin'
        ? 'Manage SIM forwarder fleet, resolve dispute exceptions, and authorize BEFTN batches'
        : 'Manage payments, pricing plans, signed webhooks, and payouts',
      emailLabel: role === 'admin' ? 'Internal Ops Staff Email' : 'Business Work Email',
      passwordLabel: 'Password',
      twoFactorLabel: '2FA Authenticator Code (TOTP)',
      twoFactorHint: 'Mandatory two-factor authentication for financial security',
      remember: 'Remember this browser for 30 days',
      forgot: 'Forgot password?',
      signInBtn: role === 'admin' ? 'Sign In as Ops Administrator' : 'Sign In to Merchant Dashboard',
      noAccount: "Don't have a merchant account?",
      registerLink: 'Register business (KYB)',
      securityNotice: '256-bit TLS encrypted · Multi-Factor Verified · Double-Entry Ledger Backed',
    },
    bn: {
      title: role === 'admin' ? 'পে-গেট অপস অ্যাডমিন কমান্ড সেন্টার' : 'মার্চেন্ট পোর্টালে সাইন ইন করুন',
      subtitle: role === 'admin'
        ? 'সিম ফ্লিট মনিটরিং, রিভিউ কিউ এবং ব্যাচ অনুমোদন পরিচালনা করুন'
        : 'পেমেন্ট, প্রাইসিং প্ল্যান, ওয়েবহুক এবং সেটেলমেন্ট পরিচালনা করুন',
      emailLabel: 'ইমেইল ঠিকানা',
      passwordLabel: 'পাসওয়ার্ড',
      twoFactorLabel: '২এফএ প্রমাণীকরণ কোড (TOTP)',
      twoFactorHint: 'আর্থিক নিরাপত্তার জন্য বাধ্যতামূলক দ্বি-স্তরীয় কোড',
      remember: '৩০ দিনের জন্য মনে রাখুন',
      forgot: 'পাসওয়ার্ড ভুলে গেছেন?',
      signInBtn: role === 'admin' ? 'অপস অ্যাডমিন হিসেবে প্রবেশ করুন' : 'মার্চেন্ট ড্যাশবোর্ডে প্রবেশ করুন',
      noAccount: 'কোনো মার্চেন্ট অ্যাকাউন্ট নেই?',
      registerLink: 'ব্যবসা নিবন্ধন করুন (KYB)',
      securityNotice: '২৫৬-বিট টিএলএস এনক্রিপশন · দ্বি-স্তরীয় যাচাইকৃত',
    },
  }[language];

  return (
    <div className={`min-h-screen bg-[var(--bg)] flex flex-col justify-between transition-colors ${language === 'bn' ? 'lang-bn' : ''}`}>
      {/* Top Header Navigation Bar */}
      <header className="w-full border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md px-4 sm:px-8 lg:px-12 py-3 flex items-center justify-between sticky top-0 z-20 transition-colors shadow-xs">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--ink)] text-[var(--bg)] flex items-center justify-center font-bold text-sm shadow-xs">
              PG
            </div>
            <span className="font-bold text-base text-[var(--ink)] tracking-tight">
              PayGate Platform
            </span>
          </Link>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] font-semibold hidden sm:inline">
            v4.0 Full Platform
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Direct Link to SMS Simulator */}
          <button
            onClick={() => navigate('/simulator')}
            className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-xs font-medium text-[var(--ink)] cursor-pointer"
          >
            Launch SMS Simulator
          </button>

          {/* Language toggle */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
            className="h-8 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-xs font-medium text-[var(--ink)] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-[var(--ink-3)]" />
            <span className="font-semibold">{language === 'en' ? 'বাংলা' : 'EN'}</span>
          </button>

          {/* Theme Switch */}
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--ink)] flex items-center justify-center cursor-pointer transition-colors"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-[var(--warning)]" />}
          </button>
        </div>
      </header>

      {/* Main Authentication Card */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-xl">
          {/* Role Segmented Switcher */}
          <div className="mb-6 bg-[var(--surface-2)] p-1 rounded-xl border border-[var(--border)] grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => {
                setRole('merchant');
                setEmail('gmsinternationalbd5@gmail.com');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                role === 'merchant'
                  ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs border border-[var(--border)]'
                  : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Merchant SaaS</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRole('admin');
                setEmail('ops.tanvir@paygate.internal');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                role === 'admin'
                  ? 'bg-[var(--surface)] text-amber-600 shadow-xs border border-[var(--border)]'
                  : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Ops Admin</span>
            </button>
          </div>

          <div className="text-center space-y-1 mb-6">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink)]">
              {t.title}
            </h1>
            <p className="text-xs text-[var(--ink-2)] max-w-sm mx-auto leading-relaxed">
              {t.subtitle}
            </p>
          </div>

          {/* Quick Demo Fill Buttons */}
          <div className="mb-6 p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--border)] space-y-2">
            <span className="text-[10px] font-bold uppercase text-[var(--ink-3)] block text-center">
              One-Click Demo Profiles
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDemoFillMerchant}
                className="py-1.5 px-2 bg-[var(--surface)] hover:bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] rounded-lg text-[11px] font-medium text-[var(--ink)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Sparkles className="w-3 h-3 text-[var(--accent)]" />
                <span>Fill Merchant</span>
              </button>

              <button
                type="button"
                onClick={handleDemoFillAdmin}
                className="py-1.5 px-2 bg-[var(--surface)] hover:bg-[var(--surface)] border border-[var(--border)] hover:border-amber-500 rounded-lg text-[11px] font-medium text-amber-600 flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <ShieldAlert className="w-3 h-3 text-amber-500" />
                <span>Fill Ops Admin</span>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] text-xs">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <GateInput
              label={t.emailLabel}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <div className="space-y-1">
              <GateInput
                label={t.passwordLabel}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-[var(--ink-3)] hover:text-[var(--ink)] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
              />
            </div>

            {/* Mandatory 2FA Authenticator Field */}
            <div className="pt-1">
              <GateInput
                label={t.twoFactorLabel}
                placeholder="6-digit code e.g. 849201"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                leftIcon={<ShieldCheck className="w-4 h-4 text-[var(--success)]" />}
                hint={t.twoFactorHint}
                isMono
                required
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[var(--ink-2)]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                />
                <span>{t.remember}</span>
              </label>

              <button
                type="button"
                onClick={() => addToast('Reset Link Sent', 'Password reset instructions sent to your email', 'info')}
                className="text-[var(--accent)] hover:underline cursor-pointer font-medium"
              >
                {t.forgot}
              </button>
            </div>

            <GateButton
              type="submit"
              variant={role === 'admin' ? 'primary' : 'primary'}
              size="lg"
              className="w-full font-semibold mt-2"
              isLoading={isLoading}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {t.signInBtn}
            </GateButton>
          </form>

          {/* Footer Link */}
          <div className="mt-6 pt-5 border-t border-[var(--border)] text-center text-xs text-[var(--ink-2)]">
            <span>{t.noAccount} </span>
            <Link
              href="/registration"
              className="font-semibold text-[var(--accent)] hover:underline ml-1"
            >
              {t.registerLink} →
            </Link>
          </div>
        </div>
      </div>

      {/* Footer Security Badges */}
      <div className="text-center text-xs text-[var(--ink-3)] py-4 flex items-center justify-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-[var(--success)]" />
        <span>{t.securityNotice}</span>
      </div>
    </div>
  );
};
