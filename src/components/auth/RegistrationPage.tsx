import React, { useState } from 'react';
import {
  Building2,
  UserCheck,
  ShieldCheck,
  Building,
  CreditCard,
  Lock,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Globe,
  Sun,
  Moon,
  Check,
  CheckCircle2,
  FileText,
  Upload,
  AlertCircle,
} from 'lucide-react';
import { useRouter, Link } from '../../router';
import { usePayGate } from '../../context/PayGateContext';
import { GateButton } from '../gate-ui/GateButton';
import { GateInput } from '../gate-ui/GateInput';

export const RegistrationPage: React.FC = () => {
  const { navigate } = useRouter();
  const { updateMerchantSettings, theme, setTheme, language, setLanguage, addToast } = usePayGate();

  // Wizard active step state (1 to 4)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Business Profile
  const [businessName, setBusinessName] = useState('DeshiCart Technologies Ltd.');
  const [tradeLicense, setTradeLicense] = useState('TRAD/DNCC/09281/2026');
  const [tinNumber, setTinNumber] = useState('891273910283');
  const [address, setAddress] = useState('Plot 42, Road 11, Block D, Banani, Dhaka-1213');

  // Step 2: Owner & KYB
  const [ownerName, setOwnerName] = useState('Rahim Ahmed');
  const [nidNumber, setNidNumber] = useState('19922692019481920');
  const [ownerPhone, setOwnerPhone] = useState('01712750278');
  const [kycDocUploaded, setKycDocUploaded] = useState(true);

  // Step 3: Payout Destination
  const [payoutType, setPayoutType] = useState<'bank' | 'mfs'>('bank');
  const [bankName, setBankName] = useState('Eastern Bank PLC');
  const [accountName, setAccountName] = useState('DeshiCart Technologies Ltd');
  const [accountNumber, setAccountNumber] = useState('1081520038921');
  const [routingNumber, setRoutingNumber] = useState('095261320');

  // Step 4: Security & Access
  const [email, setEmail] = useState('gmsinternationalbd5@gmail.com');
  const [password, setPassword] = useState('P@ssword2026!Secure');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const validateStep = (step: number): boolean => {
    setStepError(null);
    if (step === 1) {
      if (!businessName.trim() || !tradeLicense.trim() || !tinNumber.trim() || !address.trim()) {
        setStepError('Please complete all business entity details.');
        return false;
      }
    } else if (step === 2) {
      if (!ownerName.trim() || !nidNumber.trim() || !ownerPhone.trim()) {
        setStepError('Please complete all Managing Director & NID identification fields.');
        return false;
      }
    } else if (step === 3) {
      if (payoutType === 'bank') {
        if (!bankName.trim() || !accountName.trim() || !accountNumber.trim() || !routingNumber.trim()) {
          setStepError('Please provide complete commercial bank account details.');
          return false;
        }
      } else {
        if (!accountName.trim() || !accountNumber.trim()) {
          setStepError('Please provide complete MFS merchant wallet details.');
          return false;
        }
      }
    } else if (step === 4) {
      if (!email.trim() || !password.trim()) {
        setStepError('Please provide login credentials.');
        return false;
      }
      if (!agreeTerms) {
        setStepError('Please accept the Merchant Agreement and compliance terms.');
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3 | 4);
      }
    }
  };

  const handlePrevStep = () => {
    setStepError(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(4)) return;

    setIsLoading(true);
    setTimeout(() => {
      updateMerchantSettings({
        name: businessName,
        kybStatus: 'verified',
        payoutAccount: {
          type: payoutType,
          accountNumber,
          accountName,
          bankName: payoutType === 'bank' ? bankName : 'bKash Merchant Wallet',
          routingNumber: payoutType === 'bank' ? routingNumber : undefined,
        },
      });

      setIsLoading(false);
      addToast('KYB Registered Successfully', `Welcome ${businessName} to PayGate Sandbox!`, 'success');
      navigate('/');
    }, 700);
  };

  const handleAutofill = () => {
    setBusinessName('Chowdhury Apparels & Crafts Ltd.');
    setTradeLicense('TRAD/DSCC/44910/2026');
    setTinNumber('771029481029');
    setAddress('Gulshan Avenue, Tower 5, Dhaka');
    setOwnerName('Tariq Chowdhury');
    setNidNumber('19882691039481921');
    setOwnerPhone('01799112233');
    setKycDocUploaded(true);
    setPayoutType('bank');
    setBankName('City Bank PLC');
    setAccountName('Chowdhury Apparels Ltd');
    setAccountNumber('3102948102001');
    setRoutingNumber('225261890');
    setEmail('gmsinternationalbd5@gmail.com');
    setPassword('DeshiCart2026!Secure');
    setAgreeTerms(true);
    setStepError(null);
    addToast('Sample KYB Loaded', 'Sample verified business profile filled across all 4 steps', 'info');
  };

  const stepsConfig = [
    { number: 1, labelEn: 'Business Entity', labelBn: 'ব্যবসা প্রতিষ্ঠান', icon: <Building2 className="w-4 h-4" /> },
    { number: 2, labelEn: 'Director & KYB', labelBn: 'পরিচালক ও কেওয়াইবি', icon: <UserCheck className="w-4 h-4" /> },
    { number: 3, labelEn: 'Settlement Account', labelBn: 'সেটেলমেন্ট হিসাব', icon: <CreditCard className="w-4 h-4" /> },
    { number: 4, labelEn: 'Security & Access', labelBn: 'নিরাপত্তা ও এক্সেস', icon: <Lock className="w-4 h-4" /> },
  ];

  const t = {
    en: {
      title: 'Merchant Registration & KYB Onboarding',
      subtitle: 'Complete 4 quick steps to start accepting bKash, Nagad, and Rocket payments',
      stepIndicator: `Step ${currentStep} of 4`,
      sec1: '1. Business Entity Information',
      businessName: 'Registered Business Name',
      tradeLicense: 'Trade License Number',
      tin: 'e-TIN Number',
      address: 'Registered Office Address',
      sec2: '2. Managing Director & KYB Verification',
      ownerName: 'Managing Director / Owner Name',
      nid: 'National ID (NID) Number',
      phone: 'Direct Mobile Number',
      docUpload: 'Government Trade & NID Proof',
      sec3: '3. Settlement Payout Destination',
      payoutMethod: 'Payout Account Type',
      bankOption: 'Commercial Bank Account',
      mfsOption: 'MFS Merchant Wallet',
      bankName: 'Bank Name',
      accName: 'Account Holder Name',
      accNum: 'Account / Wallet Number',
      routingNum: 'Routing Number',
      sec4: '4. Security Credentials & API Provisioning',
      email: 'Work Email Address',
      pass: 'Master Password',
      twoFactorText: 'Enforce mandatory 2FA Authenticator app on staff sign-in',
      terms: 'I agree to the PayGate Bangladesh Merchant Terms, 5% fee schedule, and MFS pooling compliance rules.',
      nextBtn: 'Continue to Next Step',
      backBtn: 'Previous Step',
      submitBtn: 'Complete Registration & Launch SaaS',
      autofill: 'Fill Sample Business Profile',
      hasAccount: 'Already registered?',
      signInLink: 'Sign in to Merchant Portal',
    },
    bn: {
      title: 'মার্চেন্ট নিবন্ধন ও কেওয়াইবি যাচাই',
      subtitle: 'বিকাশ, নগদ ও রকেট পেমেন্ট গ্রহণে ৪টি সহজ ধাপ সম্পন্ন করুন',
      stepIndicator: `ধাপ ${currentStep} / ৪`,
      sec1: '১. ব্যবসায়িক প্রতিষ্ঠানের তথ্য',
      businessName: 'নিবন্ধিত ব্যবসার নাম',
      tradeLicense: 'ট্রেড লাইসেন্স নম্বর',
      tin: 'ই-টিন নম্বর',
      address: 'অফিসের নিবন্ধিত ঠিকানা',
      sec2: '২. ব্যবস্থাপনা পরিচালক ও কেওয়াইবি তথ্য',
      ownerName: 'ব্যবস্থাপনা পরিচালক / মালিকের নাম',
      nid: 'জাতীয় পরিচয়পত্র (NID) নম্বর',
      phone: 'সরাসরি মোবাইল নম্বর',
      docUpload: 'ট্রেড লাইসেন্স ও এনআইডি ডকুমেন্ট',
      sec3: '৩. সেটেলমেন্ট প্রাপক হিসাব',
      payoutMethod: 'টাকা উত্তোলনের মাধ্যম',
      bankOption: 'বাণিজ্যিক ব্যাংক অ্যাকাউন্ট',
      mfsOption: 'মোবাইল ওয়ালেট (MFS)',
      bankName: 'ব্যাংকের নাম',
      accName: 'অ্যাকাউন্টধারীর নাম',
      accNum: 'অ্যাকাউন্ট / ওয়ালেট নম্বর',
      routingNum: 'রাউটিং নম্বর',
      sec4: '৪. নিরাপত্তা ও এপিআই এক্সেস',
      email: 'ব্যবসায়িক ইমেইল ঠিকানা',
      pass: 'মাস্টার পাসওয়ার্ড',
      twoFactorText: 'লগইনে বাধ্যতামূলক ২এফএ প্রমাণীকরণ সক্রিয় রাখুন',
      terms: 'আমি পে-গেট বাংলাদেশ মার্চেন্ট শর্তাবলী, ৫% ফি তালিকা এবং কমপ্লায়েন্স নীতি মেনে নিচ্ছি।',
      nextBtn: 'পরবর্তী ধাপে যান',
      backBtn: 'পূর্ববর্তী ধাপ',
      submitBtn: 'নিবন্ধন সম্পন্ন করুন ও ড্যাশবোর্ডে যান',
      autofill: 'নমুনা ব্যবসার তথ্য দিয়ে পূরণ করুন',
      hasAccount: 'ইতিমধ্যে নিবন্ধিত?',
      signInLink: 'মার্চেন্ট পোর্টালে সাইন ইন করুন',
    },
  }[language];

  return (
    <div className={`min-h-screen bg-[var(--bg)] flex flex-col justify-between transition-colors ${language === 'bn' ? 'lang-bn' : ''}`}>
      {/* Wider Top Header Navigation Bar */}
      <header className="w-full border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md px-4 sm:px-8 lg:px-12 py-3 flex items-center justify-between sticky top-0 z-20 transition-colors shadow-xs">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--ink)] text-[var(--bg)] flex items-center justify-center font-bold text-sm shadow-xs">
              PG
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-[var(--ink)] leading-none">
                PayGate Platform
              </span>
              <span className="text-[10px] text-[var(--ink-3)] font-mono mt-0.5 hidden sm:inline">
                Merchant Gateway Onboarding v3.1
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-[var(--border)]">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
            <span className="text-[11px] font-medium text-[var(--ink-2)]">
              Automated KYB Verification Fleet
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleAutofill}
            className="hidden sm:flex py-1.5 px-3 text-xs bg-[var(--surface-2)] hover:bg-[var(--surface)] border border-dashed border-[var(--border)] hover:border-[var(--accent)] rounded-lg text-[var(--accent)] font-medium items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.autofill}</span>
          </button>

          {/* Language toggle */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
            className="h-8 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface)] text-xs font-medium text-[var(--ink)] flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-[var(--ink-3)]" />
            <span>{language === 'en' ? 'বাংলা' : 'EN'}</span>
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface)] text-[var(--ink)] flex items-center justify-center cursor-pointer transition-colors"
          >
            {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5 text-[var(--warning)]" />}
          </button>

          <Link
            href="/signin"
            className="inline-flex items-center justify-center h-8 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface)] text-xs font-medium text-[var(--ink)] transition-colors cursor-pointer"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Main 4-Step Wizard Container */}
      <div className="w-full max-w-3xl mx-auto px-4 py-8 flex-1">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-10 shadow-xl space-y-8">
          
          {/* Header Title & Autofill Mobile */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border)]">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-[var(--ink)]">
                  {t.title}
                </h1>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] font-mono">
                  {t.stepIndicator}
                </span>
              </div>
              <p className="text-xs text-[var(--ink-2)] mt-1">
                {t.subtitle}
              </p>
            </div>

            <button
              type="button"
              onClick={handleAutofill}
              className="sm:hidden py-1 px-2.5 text-xs bg-[var(--surface-2)] border border-dashed border-[var(--border)] rounded-lg text-[var(--accent)] font-medium flex items-center gap-1.5 transition-colors cursor-pointer w-fit"
            >
              <Sparkles className="w-3 h-3" />
              <span>{t.autofill}</span>
            </button>
          </div>

          {/* 4-Step Interactive Progress Tracker */}
          <div className="grid grid-cols-4 gap-2 sm:gap-4 select-none">
            {stepsConfig.map((s) => {
              const isPassed = s.number < currentStep;
              const isCurrent = s.number === currentStep;

              return (
                <button
                  type="button"
                  key={s.number}
                  onClick={() => {
                    if (s.number < currentStep || validateStep(currentStep)) {
                      setCurrentStep(s.number as 1 | 2 | 3 | 4);
                    }
                  }}
                  className={`text-left p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isCurrent
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-xs'
                      : isPassed
                      ? 'border-[var(--success)]/40 bg-[var(--surface-2)]'
                      : 'border-[var(--border)] bg-[var(--surface-2)]/40 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center font-mono ${
                        isPassed
                          ? 'bg-[var(--success)] text-white'
                          : isCurrent
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--surface)] text-[var(--ink-3)] border border-[var(--border)]'
                      }`}
                    >
                      {isPassed ? <Check className="w-3 h-3 stroke-[3]" /> : s.number}
                    </span>
                    <span className="hidden sm:inline text-[var(--ink-3)]">
                      {s.icon}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-bold truncate block ${
                      isCurrent
                        ? 'text-[var(--accent)]'
                        : isPassed
                        ? 'text-[var(--ink)]'
                        : 'text-[var(--ink-3)]'
                    }`}
                  >
                    {language === 'bn' ? s.labelBn : s.labelEn}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Validation Alert */}
          {stepError && (
            <div className="p-3 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/25 text-xs text-[var(--danger)] font-medium flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{stepError}</span>
            </div>
          )}

          {/* Form with 4 Modular Step Views */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* STEP 1: Business Profile */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[var(--accent)]" />
                    {t.sec1}
                  </h3>
                  <span className="text-[11px] text-[var(--ink-3)]">Official RJSC / City Corporation data</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <GateInput
                    label={t.businessName}
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Acme Tech Limited"
                    required
                  />
                  <GateInput
                    label={t.tradeLicense}
                    value={tradeLicense}
                    onChange={(e) => setTradeLicense(e.target.value)}
                    placeholder="TRAD/DNCC/XXXXX/2026"
                    isMono
                    required
                  />
                  <GateInput
                    label={t.tin}
                    value={tinNumber}
                    onChange={(e) => setTinNumber(e.target.value)}
                    placeholder="12-digit e-TIN"
                    isMono
                    required
                  />
                  <GateInput
                    label={t.address}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Physical Registered Banani/Gulshan office"
                    required
                  />
                </div>
              </div>
            )}

            {/* STEP 2: Owner & KYB Details */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[var(--success)]" />
                    {t.sec2}
                  </h3>
                  <span className="text-[11px] text-[var(--ink-3)]">Bangladesh Porichoy API Verified</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <GateInput
                    label={t.ownerName}
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Full legal name"
                    required
                  />
                  <GateInput
                    label={t.nid}
                    value={nidNumber}
                    onChange={(e) => setNidNumber(e.target.value)}
                    placeholder="10 or 17 digit NID"
                    isMono
                    required
                  />
                  <GateInput
                    label={t.phone}
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    isMono
                    required
                  />
                </div>

                {/* KYB Document Verification Drag-and-Drop Area */}
                <div className="mt-4 p-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[var(--ink)]">
                        Trade License & NID Smart Card PDF
                      </div>
                      <div className="text-[11px] text-[var(--ink-3)]">
                        Instant OCR verification enabled · Max 10MB
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {kycDocUploaded ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--success)] bg-[var(--success)]/10 px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified Document Attached
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setKycDocUploaded(true)}
                        className="px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--surface-2)] cursor-pointer flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" /> Upload File
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Settlement Destination */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[var(--warning)]" />
                    {t.sec3}
                  </h3>
                  {/* Bank / MFS selector */}
                  <div className="flex items-center gap-1 p-0.5 bg-[var(--surface-2)] rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => setPayoutType('bank')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                        payoutType === 'bank' ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs' : 'text-[var(--ink-2)]'
                      }`}
                    >
                      {t.bankOption}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayoutType('mfs')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                        payoutType === 'mfs' ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs' : 'text-[var(--ink-2)]'
                      }`}
                    >
                      {t.mfsOption}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {payoutType === 'bank' ? (
                    <>
                      <GateInput
                        label={t.bankName}
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. Eastern Bank PLC, City Bank"
                        required
                      />
                      <GateInput
                        label={t.accName}
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        placeholder="Account name must match Trade License"
                        required
                      />
                      <GateInput
                        label={t.accNum}
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="13-16 digit bank account"
                        isMono
                        required
                      />
                      <GateInput
                        label={t.routingNum}
                        value={routingNumber}
                        onChange={(e) => setRoutingNumber(e.target.value)}
                        placeholder="9-digit Bangladesh Bank routing"
                        isMono
                        required
                      />
                    </>
                  ) : (
                    <>
                      <GateInput
                        label="MFS Provider Name"
                        value="bKash Merchant Account"
                        disabled
                      />
                      <GateInput
                        label={t.accName}
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        placeholder="Account holder name"
                        required
                      />
                      <div className="sm:col-span-2">
                        <GateInput
                          label="MFS Registered Wallet Number"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          placeholder="01XXXXXXXXX"
                          isMono
                          required
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--border)] text-[11px] text-[var(--ink-2)] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[var(--accent)] shrink-0" />
                  <span>
                    Payouts are transferred via BEFTN / NPSB once your balance reaches the Tk 1,000 threshold.
                  </span>
                </div>
              </div>
            )}

            {/* STEP 4: Security Credentials & Access */}
            {currentStep === 4 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[var(--ink-2)]" />
                    {t.sec4}
                  </h3>
                  <span className="text-[11px] text-[var(--ink-3)]">API Key will be generated upon completion</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <GateInput
                    label={t.email}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="billing@company.com"
                    required
                  />
                  <GateInput
                    label={t.pass}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="p-3.5 bg-[var(--surface-2)] rounded-xl border border-[var(--border)] space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-[var(--ink)]">
                    <input
                      type="checkbox"
                      checked={twoFactorEnabled}
                      onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                      className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                    />
                    <span>{t.twoFactorText}</span>
                  </label>
                  <p className="text-[11px] text-[var(--ink-3)] pl-6">
                    Protects payout routing and webhook secrets against unauthorized modifications.
                  </p>
                </div>

                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[var(--ink-2)] leading-relaxed">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                      required
                    />
                    <span>{t.terms}</span>
                  </label>
                </div>
              </div>
            )}

            {/* Stepper Navigation Buttons */}
            <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between gap-3">
              {currentStep > 1 ? (
                <GateButton
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={handlePrevStep}
                  icon={<ArrowLeft className="w-4 h-4" />}
                >
                  {t.backBtn}
                </GateButton>
              ) : (
                <div />
              )}

              {currentStep < 4 ? (
                <GateButton
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleNextStep}
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  {t.nextBtn}
                </GateButton>
              ) : (
                <GateButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isLoading}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                >
                  {t.submitBtn}
                </GateButton>
              )}
            </div>
          </form>

          {/* Footer Back Link */}
          <div className="pt-2 border-t border-[var(--border)] text-center text-xs text-[var(--ink-2)]">
            <span>{t.hasAccount} </span>
            <Link
              href="/signin"
              className="font-semibold text-[var(--accent)] hover:underline ml-1"
            >
              {t.signInLink} →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
