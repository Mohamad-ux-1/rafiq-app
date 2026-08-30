import { type ChangeEvent, type ReactNode, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { Activity, ArrowLeft, Bell, BookOpen, Camera, Check, ChevronRight, CircleHelp, Coffee, Droplets, Flame, Gauge, Goal, Heart, Home, Info, Leaf, Moon, NotebookPen, Plus, Scale, Settings, ShoppingBasket, Sparkles, Sun, Target, TrendingUp, Upload, Utensils, WalletCards, Wheat, X, Zap } from 'lucide-react';

type HabitKey = 'shake' | 'oil' | 'snack' | 'workout';
type Period = 'يومي' | 'أسبوعي' | 'شهري';
type SettingsData = { dailyGoal: number; targetWeight: number; startingWeight: number; notificationsEnabled: boolean };
type WeightEntry = { date: string; weight: number };
type DailyLog = { date: string; calories: number; habits: Record<HabitKey, boolean> };
type ScannedFood = { query: string; label: string; calories: number };
type AppData = { settings: SettingsData; weights: WeightEntry[]; logs: DailyLog[]; scannedFoods: ScannedFood[] };
type ThemeMode = 'light' | 'dark';

const queryClient = new QueryClient();
const STORAGE_VERSION = 2;
const todayKey = () => new Date().toISOString().slice(0, 10);
const todayLabel = () => new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
const emptyData: AppData = {
  settings: { dailyGoal: 2800, targetWeight: 67, startingWeight: 60, notificationsEnabled: false },
  weights: [],
  logs: [],
  scannedFoods: [],
};

function readSaved(): AppData {
  try {
    const saved = localStorage.getItem('rafiq-health-data');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.version !== STORAGE_VERSION) return emptyData;
      return {
        ...emptyData,
        settings: { ...emptyData.settings, ...(parsed.settings ?? {}) },
        weights: Array.isArray(parsed.weights) ? parsed.weights : [],
        logs: Array.isArray(parsed.logs) ? parsed.logs : [],
        scannedFoods: Array.isArray(parsed.scannedFoods) ? parsed.scannedFoods : [],
      };
    }
  } catch { /* first run or blocked storage */ }
  return emptyData;
}

type RafiqContextValue = {
  data: AppData;
  todayLog: DailyLog;
  updateSettings: (next: Partial<SettingsData>) => void;
  toggleHabit: (habit: HabitKey) => void;
  addCalories: (calories: number, label?: string) => void;
  addWeight: (weight: number) => void;
  recordScanned: (food: ScannedFood) => void;
  notify: (message: string) => void;
  theme: ThemeMode;
  toggleTheme: () => void;
};
const RafiqContext = createContext<RafiqContextValue | null>(null);

function useRafiq() {
  const value = useContext(RafiqContext);
  if (!value) throw new Error('يجب استخدام هذا المكوّن داخل التطبيق');
  return value;
}

function RafiqProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(readSaved);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('rafiq-theme');
    return saved === 'dark' || saved === 'light' ? saved : 'light';
  });
  const [toast, setToast] = useState('');
  useEffect(() => localStorage.setItem('rafiq-health-data', JSON.stringify({ version: STORAGE_VERSION, ...data })), [data]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('rafiq-theme', theme);
  }, [theme]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const todayLog = data.logs.find((log) => log.date === todayKey()) ?? { date: todayKey(), calories: 0, habits: { shake: false, oil: false, snack: false, workout: false } };
  const updateSettings = (next: Partial<SettingsData>) => setData((current) => ({ ...current, settings: { ...current.settings, ...next } }));
  const toggleHabit = (habit: HabitKey) => {
    setData((current) => {
      const existing = current.logs.find((log) => log.date === todayKey());
      const base = existing ?? { date: todayKey(), calories: 0, habits: { shake: false, oil: false, snack: false, workout: false } };
      const nextLog = { ...base, habits: { ...base.habits, [habit]: !base.habits[habit] } };
      return { ...current, logs: existing ? current.logs.map((log) => log.date === todayKey() ? nextLog : log) : [...current.logs, nextLog] };
    });
  };
  const addCalories = (calories: number, label?: string) => {
    if (!Number.isFinite(calories) || calories <= 0) return;
    setData((current) => {
      const existing = current.logs.find((log) => log.date === todayKey());
      const base = existing ?? { date: todayKey(), calories: 0, habits: { shake: false, oil: false, snack: false, workout: false } };
      const nextLog = { ...base, calories: base.calories + Math.round(calories) };
      return { ...current, logs: existing ? current.logs.map((log) => log.date === todayKey() ? nextLog : log) : [...current.logs, nextLog] };
    });
    setToast(label ? `أضيف ${label} إلى يومك` : 'أضيفت السعرات إلى يومك');
  };
  const addWeight = (weight: number) => {
    if (!Number.isFinite(weight) || weight <= 0) return;
    setData((current) => ({ ...current, weights: [...current.weights.filter((entry) => entry.date !== todayKey()), { date: todayKey(), weight: Number(weight.toFixed(1)) }] }));
    setToast('تم حفظ قياس اليوم');
  };
  const recordScanned = (food: ScannedFood) => setData((current) => ({ ...current, scannedFoods: [food, ...current.scannedFoods.filter((item) => item.query !== food.query)].slice(0, 12) }));
  const notify = (message: string) => setToast(message);
  const toggleTheme = () => setTheme((current) => current === 'light' ? 'dark' : 'light');
  return <RafiqContext.Provider value={{ data, todayLog, updateSettings, toggleHabit, addCalories, addWeight, recordScanned, notify, theme, toggleTheme }}>
    {children}
    {toast && <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[hsl(var(--foreground))] px-5 py-3 text-sm font-semibold text-[hsl(var(--background))] shadow-lg md:bottom-7" role="status" data-testid="status-toast">{toast}</div>}
  </RafiqContext.Provider>;
}

const navItems = [
  { href: '/', label: 'نظرتي اليوم', icon: Home },
  { href: '/tracker', label: 'متابعة العادات', icon: NotebookPen },
  { href: '/scanner', label: 'قدّر وجبتك', icon: Camera },
  { href: '/guide', label: 'دليل الأكل', icon: BookOpen },
];

function BrandMark() {
  return <div className="flex items-center gap-3" dir="rtl">
    <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] shadow-sm"><Leaf size={23} strokeWidth={2.4} /></div>
    <div><div className="display-font text-base font-bold leading-5">رفيق</div><div className="text-[11px] text-[hsl(var(--sidebar-foreground)/.62)]">الزيادة الصحية</div></div>
  </div>;
}

function ThemeToggle({ mobile = false }: { mobile?: boolean }) {
  const { theme, toggleTheme } = useRafiq();
  const isDark = theme === 'dark';
  return <button
    onClick={toggleTheme}
    className={mobile
      ? 'flex h-11 w-11 items-center justify-center rounded-full border bg-[hsl(var(--card)/.94)] text-[hsl(var(--foreground))] shadow-md backdrop-blur transition-colors hover:bg-[hsl(var(--muted))]'
      : 'flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold text-[hsl(var(--sidebar-foreground)/.64)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]'}
    aria-label={isDark ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
    title={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
    data-testid="button-theme-toggle"
  >
    {isDark ? <Sun size={18} /> : <Moon size={18} />}
    {!mobile && <><span>{isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}</span><span className="mr-auto text-[10px] text-[hsl(var(--sidebar-foreground)/.42)]">{isDark ? 'LIGHT' : 'DARK'}</span></>}
  </button>;
}

function Sidebar() {
  const [location] = useLocation();
  const { data, updateSettings, notify } = useRafiq();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const requestNotifications = () => {
    if (!('Notification' in window)) { notify('التنبيهات غير متاحة في هذا المتصفح'); return; }
    Notification.requestPermission().then((permission) => {
      const enabled = permission === 'granted';
      updateSettings({ notificationsEnabled: enabled });
      notify(enabled ? 'تم تفعيل تذكيرات رفيق' : 'يمكنك تفعيلها لاحقاً من إعدادات المتصفح');
    });
  };
  return <>
    <aside className="hidden w-[246px] shrink-0 flex-col bg-[hsl(var(--sidebar))] px-5 py-7 text-[hsl(var(--sidebar-foreground))] md:flex" dir="rtl">
      <BrandMark />
      <div className="mt-12 px-2 text-[11px] font-semibold tracking-[.15em] text-[hsl(var(--sidebar-foreground)/.45)]">مساحتك اليومية</div>
      <nav className="mt-3 space-y-1.5">
        {navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-colors ${location === href ? 'nav-active' : 'text-[hsl(var(--sidebar-foreground)/.64)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]'}`} data-testid={`link-nav-${href === '/' ? 'home' : href.slice(1)}`}>
          <Icon size={18} strokeWidth={location === href ? 2.4 : 1.8} /><span>{label}</span>{location === href && <span className="mr-auto h-1.5 w-1.5 rounded-full bg-[hsl(var(--sidebar-primary))]" />}
        </Link>)}
      </nav>
      <div className="mt-auto">
        <div className="mb-5 rounded-2xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.5)] p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-[hsl(var(--sidebar-foreground)/.6)]"><span>الهدف اليومي</span><Target size={15} className="text-[hsl(var(--sidebar-primary))]" /></div>
          <div className="text-xl font-bold" dir="ltr">{data.settings.dailyGoal.toLocaleString('ar-EG')} <span className="text-xs font-medium text-[hsl(var(--sidebar-foreground)/.55)]">سعرة</span></div>
          <div className="mt-3 h-1.5 rounded-full bg-[hsl(var(--sidebar-foreground)/.13)]"><div className="h-full rounded-full bg-[hsl(var(--sidebar-primary))]" style={{ width: `${Math.min(100, (data.logs.find((l) => l.date === todayKey())?.calories ?? 0) / data.settings.dailyGoal * 100)}%` }} /></div>
        </div>
        <button onClick={() => setSettingsOpen(true)} className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold text-[hsl(var(--sidebar-foreground)/.64)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]" data-testid="button-open-settings"><Settings size={18} /><span>الإعدادات</span></button>
        <button onClick={requestNotifications} className="mt-1 flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold text-[hsl(var(--sidebar-foreground)/.64)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]" data-testid="button-notification-settings"><Bell size={18} /><span>{data.settings.notificationsEnabled ? 'التذكيرات مفعّلة' : 'فعّل التذكيرات'}</span></button>
        <div className="mt-1"><ThemeToggle /></div>
      </div>
    </aside>
    {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} onNotify={requestNotifications} />}
  </>;
}

function SettingsModal({ onClose, onNotify }: { onClose: () => void; onNotify: () => void }) {
  const { data, updateSettings } = useRafiq();
  const [goal, setGoal] = useState(String(data.settings.dailyGoal));
  const [target, setTarget] = useState(String(data.settings.targetWeight));
  const save = () => { updateSettings({ dailyGoal: Number(goal) || 2800, targetWeight: Number(target) || 67 }); onClose(); };
  return <div className="fixed inset-0 z-40 flex items-end justify-center bg-[hsl(var(--foreground)/.35)] p-0 backdrop-blur-sm md:items-center md:p-5" dir="rtl">
    <div className="card-surface w-full max-w-md rounded-t-[28px] p-6 md:rounded-[28px]" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="mb-6 flex items-center justify-between"><button onClick={onClose} className="rounded-full p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]" aria-label="إغلاق الإعدادات" data-testid="button-close-settings"><X size={19} /></button><h2 id="settings-title" className="display-font text-lg font-bold">إعدادات رفيق</h2></div>
      <div className="space-y-4">
        <label className="block text-sm font-semibold">هدف السعرات اليومي<input value={goal} onChange={(e) => setGoal(e.target.value)} type="number" className="mt-2 w-full rounded-xl border bg-[hsl(var(--background))] px-4 py-3 outline-none ring-[hsl(var(--primary))] focus:ring-2" dir="ltr" data-testid="input-daily-goal" /></label>
        <label className="block text-sm font-semibold">الوزن المستهدف (كغ)<input value={target} onChange={(e) => setTarget(e.target.value)} type="number" step="0.1" className="mt-2 w-full rounded-xl border bg-[hsl(var(--background))] px-4 py-3 outline-none ring-[hsl(var(--primary))] focus:ring-2" dir="ltr" data-testid="input-target-weight" /></label>
        <div className="space-y-2 rounded-xl border bg-[hsl(var(--background))] p-3">
          <div className="flex items-center justify-between px-1 text-xs font-bold"><span>تذكيرات رفيق</span><span className="text-[10px] text-[hsl(var(--muted-foreground))]">{data.settings.notificationsEnabled ? 'مفعّلة' : 'غير مفعّلة'}</span></div>
          <button onClick={onNotify} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm font-semibold hover:bg-[hsl(var(--muted))]" data-testid="button-modal-notifications"><span className="flex items-center gap-2"><Moon size={15} className="text-[hsl(var(--primary))]" /> مشروب التاسعة مساءً</span><span className={`h-2.5 w-2.5 rounded-full ${data.settings.notificationsEnabled ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted-foreground)/.35)]'}`} /></button>
          <button onClick={onNotify} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm font-semibold hover:bg-[hsl(var(--muted))]" data-testid="button-modal-weight-reminder"><span className="flex items-center gap-2"><Scale size={15} className="text-[hsl(var(--primary))]" /> وزن صباح السبت</span><span className={`h-2.5 w-2.5 rounded-full ${data.settings.notificationsEnabled ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted-foreground)/.35)]'}`} /></button>
        </div>
      </div>
      <button onClick={save} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] py-3.5 text-sm font-bold text-[hsl(var(--primary-foreground))] hover:opacity-90" data-testid="button-save-settings"><Check size={17} /> حفظ التغييرات</button>
    </div>
  </div>;
}

function MobileNav() {
  const [location] = useLocation();
  return <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-4 border-t bg-[hsl(var(--card)/.96)] px-2 py-2 backdrop-blur md:hidden" dir="rtl">
    {navItems.map(({ href, label, icon: Icon }) => <Link href={href} key={href} className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-semibold ${location === href ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`} data-testid={`link-mobile-${href === '/' ? 'home' : href.slice(1)}`}><Icon size={19} /><span>{label.replace('متابعة العادات', 'العادات').replace('نظرتي اليوم', 'اليوم')}</span></Link>)}
  </nav>;
}

function AppLayout({ children }: { children: ReactNode }) {
  return <div className="app-shell flex" dir="rtl"><Sidebar /><div className="fixed left-4 top-4 z-20 md:hidden"><ThemeToggle mobile /></div><main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main><MobileNav /></div>;
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <header className="mb-7 flex items-start justify-between gap-4" dir="rtl"><div><div className="mb-2 text-xs font-bold tracking-[.13em] text-[hsl(var(--primary))]">{eyebrow}</div><h1 className="display-font text-[clamp(1.65rem,3vw,2.2rem)] font-bold leading-tight">{title}</h1>{description && <p className="mt-2 max-w-xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">{description}</p>}</div>{action}</header>;
}

function ArabicNumber({ value, suffix }: { value: number | string; suffix?: string }) {
  return <span dir="ltr">{typeof value === 'number' ? value.toLocaleString('ar-EG') : value}{suffix && <small className="mr-1 text-[.55em] font-semibold text-[hsl(var(--muted-foreground))]">{suffix}</small>}</span>;
}

function ProgressRing({ value, max }: { value: number; max: number }) {
  const percentage = Math.min(100, Math.round(value / max * 100));
  return <div className="relative h-36 w-36 shrink-0" aria-label={`أنجزت ${percentage} بالمئة من هدف السعرات`} role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
    <svg viewBox="0 0 120 120" className="-rotate-90"><circle cx="60" cy="60" r="49" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" /><circle cx="60" cy="60" r="49" fill="none" stroke="hsl(var(--accent))" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${percentage * 3.08} 308`} /></svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="display-font text-2xl font-bold"><ArabicNumber value={value} /></span><span className="text-[10px] text-[hsl(var(--muted-foreground))]">من {max.toLocaleString('ar-EG')}</span></div>
  </div>;
}

function WeightChart({ weights, target }: { weights: WeightEntry[]; target: number }) {
  const points = weights.slice(-7);
  if (!points.length) {
    return <div className="flex h-52 flex-col items-center justify-center rounded-2xl border border-dashed bg-[hsl(var(--muted)/.35)] px-6 text-center" dir="rtl">
      <Scale size={24} className="mb-3 text-[hsl(var(--primary))]" />
      <p className="text-sm font-bold">مسارك يبدأ من أول قياس</p>
      <p className="mt-1 max-w-xs text-xs leading-6 text-[hsl(var(--muted-foreground))]">سجّل وزنك اليوم حتى يظهر تقدمك نحو {target} كغ هنا.</p>
    </div>;
  }
  const min = Math.min(59.5, ...points.map((p) => p.weight));
  const max = Math.max(target, ...points.map((p) => p.weight));
  const pointString = points.map((point, i) => `${(i / Math.max(1, points.length - 1)) * 100},${96 - ((point.weight - min) / Math.max(.1, max - min)) * 72}`).join(' ');
  const areaString = `0,96 ${pointString} 100,96`;
  return <div className="relative h-52 w-full" dir="ltr">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
      <defs><linearGradient id="line-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="hsl(var(--accent))" stopOpacity=".32" /><stop offset="1" stopColor="hsl(var(--accent))" stopOpacity="0" /></linearGradient></defs>
      {[20, 44, 68, 92].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="hsl(var(--border))" strokeDasharray="1.5 2" strokeWidth=".45" />)}
      <polygon points={areaString} fill="url(#line-fill)" /><polyline points={pointString} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, i) => <circle key={point.date} cx={(i / Math.max(1, points.length - 1)) * 100} cy={96 - ((point.weight - min) / Math.max(.1, max - min)) * 72} r="2.1" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="1.1" />)}
    </svg>
    <div className="absolute bottom-[-23px] left-0 right-0 flex justify-between text-[10px] text-[hsl(var(--muted-foreground))]">{points.map((point) => <span key={point.date}>{new Date(`${point.date}T12:00:00`).toLocaleDateString('ar-EG', { weekday: 'short' })}</span>)}</div>
  </div>;
}

function FeedbackCard() {
  const { data } = useRafiq();
  const points = data.weights.slice(-7);
  const delta = points.length > 1 ? points[points.length - 1].weight - points[0].weight : 0;
  const message = delta > .15 ? 'ممتاز، جسمك يستجيب بهدوء' : delta > 0 ? 'تقدم لطيف… الاستمرارية تصنع الفرق' : 'لا بأس، نعود لروتيننا اليوم';
  return <div className="relative overflow-hidden rounded-[24px] bg-[hsl(var(--primary))] p-6 text-[hsl(var(--primary-foreground))] shadow-[0_18px_38px_hsl(var(--primary)/.18)]" dir="rtl">
    <div className="absolute -left-7 -top-10 h-32 w-32 rounded-full border-[18px] border-[hsl(var(--accent)/.18)]" /><div className="absolute -bottom-14 right-16 h-28 w-28 rounded-full border-[15px] border-[hsl(var(--accent)/.12)]" />
    <div className="relative flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"><Sparkles size={21} /></div><div><div className="text-xs font-semibold text-[hsl(var(--primary-foreground)/.65)]">قراءة رفيق لهذا الأسبوع</div><h2 className="mt-1 display-font text-lg font-bold">{message}</h2><p className="mt-2 text-xs leading-6 text-[hsl(var(--primary-foreground)/.72)]">{delta > 0 ? `زاد وزنك ${delta.toFixed(1)} كغ منذ القياس السابق. هذا بالضبط هو الإيقاع الذي نبحث عنه.` : 'الميزان يوم واحد لا يحكي القصة كاملة. اهتم بوجبتك القادمة فقط.'}</p></div></div>
  </div>;
}

function ViewToggle({ period, setPeriod }: { period: Period; setPeriod: (period: Period) => void }) {
  return <div className="flex rounded-xl border bg-[hsl(var(--card))] p-1" dir="rtl">{(['يومي', 'أسبوعي', 'شهري'] as Period[]).map((item) => <button key={item} onClick={() => setPeriod(item)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${period === item ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'}`} data-testid={`button-period-${item}`}>{item}</button>)}</div>;
}

function HomePage() {
  const { data, todayLog, addWeight } = useRafiq();
  const [period, setPeriod] = useState<Period>('أسبوعي');
  const [weight, setWeight] = useState('');
  const latestWeight = data.weights[data.weights.length - 1]?.weight ?? null;
  const gained = latestWeight === null ? 0 : latestWeight - data.settings.startingWeight;
  const habitsDone = Object.values(todayLog.habits).filter(Boolean).length;
  const visibleWeights = period === 'يومي' ? data.weights.slice(-1) : period === 'شهري' ? data.weights : data.weights.slice(-7);
  const saveWeight = () => { addWeight(Number(weight)); setWeight(''); };
  return <div className="mx-auto max-w-[1280px] p-5 md:p-9 lg:p-12" dir="rtl">
    <PageHeader eyebrow={todayLabel()} title="أهلاً بك في رفيقك" description="خطوة صغيرة اليوم، جسم أقوى غداً. خذ نظرة سريعة على إيقاعك ثم اختر ما يناسبك." action={<div className="hidden items-center gap-2 rounded-full border bg-[hsl(var(--card))] px-3 py-2 text-xs font-semibold text-[hsl(var(--muted-foreground))] md:flex"><Sun size={15} className="text-[hsl(var(--accent))]" /> يوم هادئ للنمو</div>} />
    <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
      <FeedbackCard />
      <section className="card-surface flex items-center justify-between gap-3 rounded-[24px] p-5" aria-label="ملخص اليوم"><div><div className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">إنجاز اليوم</div><div className="mt-2 display-font text-3xl font-bold"><ArabicNumber value={habitsDone} /><span className="mr-1 text-base font-medium text-[hsl(var(--muted-foreground))]">/ ٤ عادات</span></div><p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">{habitsDone === 4 ? 'يوم مكتمل، أحسنت.' : 'ما زال أمامك وقت لطيف.'}</p></div><div className="flex h-16 w-16 items-center justify-center rounded-full border-[6px] border-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><Check size={26} /></div></section>
    </div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
       <section className="card-surface rounded-[24px] p-5 md:p-7" aria-labelledby="progress-title">
        <div className="mb-8 flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><TrendingUp size={18} className="text-[hsl(var(--primary))]" /><h2 id="progress-title" className="display-font text-lg font-bold">مسار الزيادة</h2></div><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{period === 'يومي' ? 'قراءة اليوم' : period === 'شهري' ? 'نظرة على الشهر' : 'آخر سبعة أيام'} · من {data.settings.startingWeight} كغ إلى {data.settings.targetWeight} كغ</p></div><ViewToggle period={period} setPeriod={setPeriod} /></div>
         <div className="relative"><WeightChart weights={visibleWeights} target={data.settings.targetWeight} /><div className="mt-8 flex items-center justify-between border-t pt-4 text-xs"><span className="text-[hsl(var(--muted-foreground))]">الوزن الحالي <strong className="mr-1 text-base text-[hsl(var(--foreground))]">{latestWeight === null ? '—' : <ArabicNumber value={latestWeight.toFixed(1)} suffix="كغ" />}</strong></span><span className="rounded-full bg-[hsl(var(--secondary))] px-3 py-1.5 font-bold text-[hsl(var(--primary))]">{latestWeight === null ? 'بانتظار أول قياس' : `+${gained.toFixed(1)} كغ منذ البداية`}</span></div></div>
      </section>
      <section className="card-surface rounded-[24px] p-5 md:p-7" aria-labelledby="weight-log-title">
        <div className="mb-5 flex items-center justify-between"><div><h2 id="weight-log-title" className="display-font text-lg font-bold">قياس هذا الصباح</h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">مرة واحدة في الأسبوع تكفي</p></div><Scale size={22} className="text-[hsl(var(--accent))]" /></div>
        <div className="flex items-center gap-2"><input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" step=".1" placeholder={latestWeight === null ? 'مثال: ٦٠' : latestWeight.toFixed(1)} className="w-full rounded-xl border bg-[hsl(var(--background))] px-4 py-3 text-lg font-bold outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" dir="ltr" aria-label="الوزن بالكيلوغرام" data-testid="input-today-weight" /><span className="text-sm text-[hsl(var(--muted-foreground))]">كغ</span></div>
        <button onClick={saveWeight} disabled={!weight} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--secondary))] py-3 text-sm font-bold text-[hsl(var(--primary))] transition-opacity disabled:cursor-not-allowed disabled:opacity-40 hover:opacity-85" data-testid="button-save-weight"><Plus size={17} /> حفظ القياس</button>
        <div className="mt-5 flex gap-3 rounded-xl bg-[hsl(var(--muted)/.6)] p-3 text-xs leading-6 text-[hsl(var(--muted-foreground))]"><Info size={16} className="mt-1 shrink-0 text-[hsl(var(--primary))]" /> اختَر نفس الوقت والظروف تقريباً لتحصل على قراءة أصدق.</div>
      </section>
    </div>
    <div className="mt-5 grid gap-5 md:grid-cols-2">
       <section className="card-surface rounded-[24px] p-5" aria-label="هدف السعرات"><div className="mb-3 flex items-center justify-between"><div><h2 className="display-font text-lg font-bold">وقود يومك</h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">سعرات مسجلة اليوم</p></div><Flame size={21} className="text-[hsl(var(--accent))]" /></div><div className="flex items-center gap-5"><ProgressRing value={todayLog.calories} max={data.settings.dailyGoal} /><div><div className="text-2xl font-bold"><ArabicNumber value={todayLog.calories} suffix="سعرة" /></div><p className="mt-2 text-xs leading-6 text-[hsl(var(--muted-foreground))]">تبقّى لك <strong className="text-[hsl(var(--foreground))]"><ArabicNumber value={Math.max(0, data.settings.dailyGoal - todayLog.calories)} /></strong> سعرة للوصول لهدفك.</p><Link href="/tracker" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[hsl(var(--primary))]" data-testid="link-go-tracker">أكمل يومك <ArrowLeft size={14} /></Link></div></div></section>
       <section className="card-surface flex items-center justify-between gap-4 rounded-[24px] p-5"><div><div className="mb-2 flex items-center gap-2 text-xs font-bold text-[hsl(var(--primary))]"><Goal size={15} /> وجهتك القادمة</div><h2 className="display-font text-xl font-bold"><ArabicNumber value={data.settings.targetWeight.toFixed(1)} suffix="كغ" /></h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{latestWeight === null ? 'سجّل أول قياس لتعرف المسافة المتبقية.' : `باقي ${Math.max(0, data.settings.targetWeight - latestWeight).toFixed(1)} كغ بإيقاعك الخاص.`}</p></div><div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-[hsl(var(--secondary))]"><div className="absolute inset-1 rounded-full border-4 border-t-[hsl(var(--accent))] border-l-transparent border-b-transparent border-r-transparent rotate-45" /><Target size={27} className="text-[hsl(var(--primary))]" /></div></section>
    </div>
  </div>;
}

const habits: { key: HabitKey; title: string; description: string; icon: typeof Coffee; color: string }[] = [
  { key: 'shake', title: 'مشروب المساء', description: 'كوب عالي السعرات عند التاسعة', icon: Coffee, color: 'bg-[hsl(30_76%_62%/.18)] text-[hsl(25_55%_35%)]' },
  { key: 'oil', title: 'إضافة مغذية', description: 'زيت زيتون أو طحينة مع وجبتك', icon: Droplets, color: 'bg-[hsl(154_42%_31%/.12)] text-[hsl(var(--primary))]' },
  { key: 'snack', title: 'سناك في الجيب', description: 'فول سوداني أو تمر بين الوجبات', icon: WalletCards, color: 'bg-[hsl(44_72%_55%/.2)] text-[hsl(30_54%_32%)]' },
  { key: 'workout', title: 'حركة خفيفة', description: 'تمرين منزلي يحفّز الشهية', icon: Activity, color: 'bg-[hsl(200_42%_48%/.15)] text-[hsl(200_42%_32%)]' },
];

function TrackerPage() {
  const { data, todayLog, toggleHabit, addCalories, notify } = useRafiq();
  const [calories, setCalories] = useState('');
  const completed = Object.values(todayLog.habits).filter(Boolean).length;
  const addManual = () => { addCalories(Number(calories), 'السعرات اليدوية'); setCalories(''); };
  const toggleNotifications = () => {
    if (!('Notification' in window)) { notify('التنبيهات غير متاحة هنا'); return; }
    Notification.requestPermission().then((permission) => { notify(permission === 'granted' ? 'سيذكّرك رفيقك عند التاسعة مساءً' : 'لم يتم تفعيل التنبيهات'); });
  };
  return <div className="mx-auto max-w-[1080px] p-5 md:p-9 lg:p-12" dir="rtl">
    <PageHeader eyebrow="روتين بسيط، أثر كبير" title="متابعة يومك" description="لا نبحث عن الكمال. أربع عادات صغيرة تعطي جسمك إشارة ثابتة بأنه في أمان للنمو." />
     <section className="mb-5 overflow-hidden rounded-[24px] bg-[hsl(var(--primary))] p-5 text-[hsl(var(--primary-foreground))] md:p-7"><div className="flex flex-wrap items-end justify-between gap-5"><div><div className="flex items-center gap-2 text-xs font-semibold text-[hsl(var(--primary-foreground)/.68)]"><Gauge size={16} /> {todayLabel()}</div><h2 className="mt-2 display-font text-2xl font-bold">إيقاعك اليومي</h2><p className="mt-1 text-sm text-[hsl(var(--primary-foreground)/.7)]">أنجزت {completed} من ٤ عادات حتى الآن.</p></div><div className="min-w-[190px]"><div className="mb-2 flex justify-between text-xs"><span>التقدم</span><span dir="ltr">{completed * 25}%</span></div><div className="h-2 rounded-full bg-[hsl(var(--primary-foreground)/.16)]"><div className="h-full rounded-full bg-[hsl(var(--accent))] transition-all duration-500" style={{ width: `${completed * 25}%` }} /></div></div></div></section>
    <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
      <section className="card-surface rounded-[24px] p-5 md:p-7"><div className="mb-5 flex items-center justify-between"><div><h2 className="display-font text-lg font-bold">عادات رفيق الأربعة</h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">اضغط على العادة بعد إنجازها</p></div><span className="rounded-full bg-[hsl(var(--secondary))] px-3 py-1 text-xs font-bold text-[hsl(var(--primary))]">{completed === 4 ? 'يوم مكتمل' : `${completed}/٤`}</span></div><div className="grid gap-3 sm:grid-cols-2">{habits.map(({ key, title, description, icon: Icon, color }) => { const checked = todayLog.habits[key]; return <button key={key} onClick={() => toggleHabit(key)} className={`group flex items-center gap-3 rounded-2xl border p-4 text-right transition-all ${checked ? 'border-[hsl(var(--primary)/.28)] bg-[hsl(var(--secondary)/.55)]' : 'bg-[hsl(var(--background)/.5)] hover:border-[hsl(var(--primary)/.35)]'}`} data-testid={`button-habit-${key}`} aria-pressed={checked}><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${color} ${checked ? 'check-pop' : ''}`}>{checked ? <Check size={20} strokeWidth={2.5} /> : <Icon size={20} />}</span><span className="min-w-0"><strong className={`block text-sm ${checked ? 'text-[hsl(var(--primary))]' : ''}`}>{title}</strong><small className="mt-1 block text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">{description}</small></span><span className={`mr-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${checked ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border-[hsl(var(--border))] text-transparent'}`}><Check size={12} /></span></button>; })}</div></section>
      <section className="card-surface rounded-[24px] p-5 md:p-7"><div className="mb-5 flex items-center justify-between"><div><h2 className="display-font text-lg font-bold">أضف ما أكلت</h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">رقم تقريبي أفضل من عدم التسجيل</p></div><Plus size={21} className="text-[hsl(var(--accent))]" /></div><div className="rounded-2xl bg-[hsl(var(--muted)/.65)] p-4"><label className="text-xs font-bold text-[hsl(var(--muted-foreground))]">سعرات يدوية<input value={calories} onChange={(e) => setCalories(e.target.value)} type="number" min="1" placeholder="مثال: 450" className="mt-2 w-full rounded-xl border bg-[hsl(var(--card))] px-3 py-3 text-base font-semibold outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" dir="ltr" data-testid="input-manual-calories" /></label><button onClick={addManual} disabled={!calories} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-40" data-testid="button-add-manual-calories"><Plus size={16} /> إضافة إلى اليوم</button></div><div className="mt-5 flex items-center gap-3 border-t pt-4"><button onClick={toggleNotifications} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]" aria-label="تفعيل تذكير المساء" data-testid="button-enable-reminder"><Bell size={18} /></button><p className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">تذكير لطيف عند ٩ مساءً لمشروبك عالي السعرات.</p></div></section>
    </div>
    <div className="mt-5 rounded-[24px] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/.5)] p-5 text-center"><Moon size={20} className="mx-auto mb-2 text-[hsl(var(--primary))]" /><p className="text-sm font-semibold">الاستمرارية أهم من يوم مثالي</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">كل علامة هنا هي وعد صغير قطعته لنفسك.</p></div>
  </div>;
}

type Food = { label: string; calories: number; portion: string; detail: string; icon: typeof Utensils };
const foodKnowledge: Food[] = [
  { label: 'شوفان بالحليب', calories: 420, portion: 'كوب شوفان + كوب حليب', detail: 'فطور دافئ وسهل الرفع بالسعرات', icon: Wheat },
  { label: 'فول سوداني', calories: 170, portion: 'حفنة صغيرة (٣٠غ)', detail: 'يناسب الجيب بين الوجبات', icon: ShoppingBasket },
  { label: 'طحينة', calories: 90, portion: 'ملعقة كبيرة', detail: 'أضفها للفول أو الساندويتش', icon: Droplets },
  { label: 'زبادي كامل الدسم', calories: 150, portion: 'علبة ١٧٠غ', detail: 'مع العسل أو الشوفان', icon: Utensils },
  { label: 'زيت الزيتون', calories: 120, portion: 'ملعقة كبيرة', detail: 'دفعة صغيرة لا تغيّر حجم الطبق', icon: Leaf },
  { label: 'تمر', calories: 140, portion: '٤ حبات', detail: 'حلاوة طبيعية مع مكسرات', icon: Sun },
];

function ScannerPage() {
  const { addCalories, recordScanned, notify } = useRafiq();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageName, setImageName] = useState('');
  const [imageCalories, setImageCalories] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<Food | null>(null);
  const matches = useMemo(() => query.trim() ? foodKnowledge.filter((food) => food.label.includes(query.trim())) : [], [query]);
  const estimate = () => {
    if (!query.trim()) return;
    setLoading(true); setResult(null);
    window.setTimeout(() => { const food = matches[0] ?? { label: query.trim(), calories: 300, portion: 'حصة متوسطة', detail: 'تقدير أولي قابل للتعديل', icon: Utensils }; setResult(food); recordScanned({ query: query.trim(), label: food.label, calories: food.calories }); setLoading(false); }, 550);
  };
  const openImagePicker = () => fileInputRef.current?.click();
  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('اختر ملف صورة صالحاً');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      notify('حجم الصورة يجب أن يكون أقل من ٨ ميغابايت');
      return;
    }
    setImageLoading(true);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(String(reader.result));
      setImageName(file.name);
      setImageCalories('');
      setImageLoading(false);
      notify('تم تحميل الصورة، أدخل تقدير السعرات');
    };
    reader.onerror = () => {
      setImageLoading(false);
      notify('تعذر قراءة الصورة، جرّب صورة أخرى');
    };
    reader.readAsDataURL(file);
  };
  const clearImage = () => {
    setImagePreview(null);
    setImageName('');
    setImageCalories('');
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const estimateImage = () => {
    const calories = Number(imageCalories);
    if (!imagePreview || !Number.isFinite(calories) || calories <= 0) {
      notify('أدخل سعرات تقريبية للصورة أولاً');
      return;
    }
    const food = { label: imageName ? `وجبة من ${imageName}` : 'وجبة من الصورة', calories: Math.round(calories), portion: 'تقدير يدوي', detail: 'الصورة للمعاينة فقط ولا يتم حفظ ملفها', icon: Utensils };
    setResult(food);
    recordScanned({ query: `صورة:${imageName}`, label: food.label, calories: food.calories });
    notify('تم تجهيز تقدير وجبتك');
  };
  return <div className="mx-auto max-w-[1080px] p-5 md:p-9 lg:p-12" dir="rtl">
    <PageHeader eyebrow="خمن، سجّل، وواصل" title="قدّر وجبتك" description="اكتب اسم الطعام كما تقوله في البيت، أو ارفع صورة لطبقك. الرقم تقريبي، والغرض أن يساعدك لا أن يقيّدك." />
    <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
      <section className="card-surface rounded-[24px] p-5 md:p-7"><div className="mb-6 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><Utensils size={19} /></span><div><h2 className="display-font text-lg font-bold">ما الذي أكلته؟</h2><p className="text-xs text-[hsl(var(--muted-foreground))]">اكتب اسم الطعام أو ارفع صورة حقيقية</p></div></div><div className="flex gap-2"><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && estimate()} placeholder="مثال: فول مع زيت، شوفان..." className="min-w-0 flex-1 rounded-xl border bg-[hsl(var(--background))] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" aria-label="اسم الطعام" data-testid="input-food-search" /><button onClick={estimate} className="rounded-xl bg-[hsl(var(--primary))] px-5 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="button-estimate-food">قدّر</button></div>{matches.length > 0 && <div className="mt-2 rounded-xl border bg-[hsl(var(--card))] p-1">{matches.slice(0, 3).map((food) => <button key={food.label} onClick={() => { setQuery(food.label); setResult(food); }} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-right text-xs hover:bg-[hsl(var(--muted))]" data-testid={`button-suggestion-${food.label}`}><span>{food.label}</span><span className="text-[hsl(var(--muted-foreground))]">{food.calories} سعرة</span></button>)}</div>}<div className="my-6 flex items-center gap-3 text-[10px] font-bold text-[hsl(var(--muted-foreground))]"><span className="h-px flex-1 bg-[hsl(var(--border))]" /> أو <span className="h-px flex-1 bg-[hsl(var(--border))]" /></div><input ref={fileInputRef} onChange={handleImageChange} type="file" accept="image/*" className="hidden" data-testid="input-food-image" /><button onClick={openImagePicker} disabled={imageLoading} className="paper-grid flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--primary)/.35)] px-5 py-7 text-center transition-colors hover:bg-[hsl(var(--secondary)/.35)] disabled:opacity-60" data-testid="button-upload-food-image"><span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">{imageLoading ? <span className="h-5 w-5 animate-pulse rounded-full bg-[hsl(var(--accent))]" /> : <Upload size={19} />}</span><strong className="text-sm">{imageLoading ? 'جارٍ تجهيز الصورة...' : 'صوّر طبقك أو ارفع صورة'}</strong><span className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">JPG وPNG حتى ٨ ميغابايت</span></button>{imagePreview && <div className="mt-4 rounded-2xl border bg-[hsl(var(--muted)/.35)] p-3"><div className="relative overflow-hidden rounded-xl"><img src={imagePreview} alt={`معاينة ${imageName}`} className="max-h-56 w-full object-cover" /><button onClick={clearImage} className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--foreground)/.75)] text-[hsl(var(--background))]" aria-label="إزالة الصورة" data-testid="button-remove-food-image"><X size={16} /></button></div><p className="mt-2 truncate text-xs font-semibold">{imageName}</p><div className="mt-3 flex gap-2"><input value={imageCalories} onChange={(e) => setImageCalories(e.target.value)} type="number" min="1" placeholder="السعرات التقريبية" className="min-w-0 flex-1 rounded-xl border bg-[hsl(var(--card))] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" dir="ltr" aria-label="السعرات التقريبية للصورة" data-testid="input-image-calories" /><button onClick={estimateImage} className="rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))]" data-testid="button-estimate-uploaded-image">اعتماد التقدير</button></div><p className="mt-2 text-[10px] leading-5 text-[hsl(var(--muted-foreground))]">لا يتم تخزين ملف الصورة. أدخل تقديراً تقريبياً حسب كمية الطبق.</p></div>}{loading && <div className="mt-5 rounded-2xl bg-[hsl(var(--muted)/.6)] p-5"><div className="h-3 w-2/3 animate-pulse rounded bg-[hsl(var(--border))]" /><div className="mt-3 h-3 w-1/3 animate-pulse rounded bg-[hsl(var(--border))]" /></div>}{result && <EstimateResult food={result} onAdd={() => addCalories(result.calories, result.label)} />}</section>
      <section className="rounded-[24px] bg-[hsl(var(--secondary)/.45)] p-5 md:p-7"><div className="mb-5 flex items-center justify-between"><div><h2 className="display-font text-lg font-bold">اقتراحات سريعة</h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">اختَر وجبة شائعة وابدأ منها</p></div><Zap size={20} className="text-[hsl(var(--accent))]" /></div><div className="space-y-2.5">{foodKnowledge.slice(0, 4).map((food) => <button key={food.label} onClick={() => { setQuery(food.label); setResult(food); }} className="flex w-full items-center gap-3 rounded-2xl border border-[hsl(var(--border)/.7)] bg-[hsl(var(--card)/.7)] p-3 text-right hover:bg-[hsl(var(--card))]" data-testid={`button-quick-food-${food.label}`}><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--card))] text-[hsl(var(--primary))]"><food.icon size={18} /></span><span className="min-w-0 flex-1"><strong className="block text-xs">{food.label}</strong><small className="text-[10px] text-[hsl(var(--muted-foreground))]">{food.portion}</small></span><span className="text-xs font-bold text-[hsl(var(--primary))]">{food.calories} <small>سعرة</small></span></button>)}</div><div className="mt-6 flex gap-2 rounded-xl border border-[hsl(var(--border)/.8)] bg-[hsl(var(--card)/.5)] p-3 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]"><CircleHelp size={15} className="mt-0.5 shrink-0 text-[hsl(var(--primary))]" /> التقديرات تختلف حسب طريقة التحضير. استخدمها كبوصلة لا كحساب دقيق.</div></section>
    </div>
  </div>;
}

function EstimateResult({ food, onAdd }: { food: Food; onAdd: () => void }) {
  return <div className="mt-5 rounded-2xl border border-[hsl(var(--primary)/.25)] bg-[hsl(var(--secondary)/.4)] p-4"><div className="flex items-center justify-between"><div><div className="text-[11px] font-bold text-[hsl(var(--primary))]">تقدير رفيق</div><h3 className="mt-1 font-bold">{food.label}</h3><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{food.portion} · {food.detail}</p></div><div className="text-left"><div className="display-font text-2xl font-bold text-[hsl(var(--primary))]">{food.calories}</div><div className="text-[10px] text-[hsl(var(--muted-foreground))]">سعرة تقريباً</div></div></div><button onClick={onAdd} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] py-3 text-xs font-bold text-[hsl(var(--primary-foreground))]" data-testid="button-add-estimated-food"><Plus size={15} /> أضف إلى سعرات اليوم</button></div>;
}

const guideFoods = [
  { name: 'زيت الزيتون', tag: 'أعلى أثر بأقل حجم', calories: '١٢٠', unit: 'سعرة / ملعقة', note: 'أضفه للفول، السلطة، أو على الخبز بعد الطهي.', icon: Leaf },
  { name: 'الفول السوداني', tag: 'رفيق الجيب', calories: '٥٦٧', unit: 'سعرة / ١٠٠غ', note: 'محمصاً أو على شكل زبدة مع الموز والخبز.', icon: ShoppingBasket },
  { name: 'الزبادي المحلي', tag: 'بروتين يومي', calories: '١٥٠', unit: 'سعرة / علبة', note: 'اختَر كامل الدسم وأضف إليه العسل أو الشوفان.', icon: Droplets },
  { name: 'الشوفان', tag: 'فطور يشبعك', calories: '٣٨٩', unit: 'سعرة / ١٠٠غ', note: 'اطهه بالحليب، ثم أضف التمر أو الطحينة.', icon: Wheat },
  { name: 'البيض', tag: 'أساس اقتصادي', calories: '١٤٠', unit: 'سعرة / بيضتين', note: 'مع الخبز وزيت الزيتون يصبح طبقاً متكاملاً.', icon: Utensils },
  { name: 'العدس والأرز', tag: 'طبق البيت الذكي', calories: '٤٨٠', unit: 'سعرة / طبق', note: 'وجبة دافئة، مشبعة، وتزداد طاقتها بملعقة طحينة.', icon: BowlIcon },
];
function BowlIcon({ size = 20 }: { size?: number }) { return <div style={{ width: size, height: size }} className="rounded-b-full border-2 border-current border-t-0" />; }

function GuidePage() {
  const [saved, setSaved] = useState<string[]>([]);
  const toggleSaved = (name: string) => setSaved((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  return <div className="mx-auto max-w-[1160px] p-5 md:p-9 lg:p-12" dir="rtl">
    <PageHeader eyebrow="أكل البيت، بذكاء" title="دليل الزيادة الاقتصادية" description="أطعمة مألوفة، متاحة، وتضيف طاقة حقيقية لطبقك من دون أن تثقل ميزانيتك." action={<div className="hidden rounded-full bg-[hsl(var(--secondary))] px-4 py-2 text-xs font-bold text-[hsl(var(--primary))] md:block"><WalletCards size={14} className="ml-1 inline" /> خيارات على قد اليد</div>} />
    <section className="mb-7 grid gap-4 md:grid-cols-[1fr_1.5fr]"><div className="rounded-[24px] bg-[hsl(var(--primary))] p-6 text-[hsl(var(--primary-foreground))]"><div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"><Heart size={19} /></div><h2 className="display-font text-xl font-bold leading-9">لا تحتاج مكونات غريبة<br />كي تنمو جيداً.</h2><p className="mt-3 text-xs leading-6 text-[hsl(var(--primary-foreground)/.7)]">اجعل وجباتك المعتادة أغنى بقليل. ملعقة هنا، حفنة هناك، والفرق يتراكم.</p></div><div className="card-surface flex items-center gap-5 rounded-[24px] p-6"><div className="relative hidden h-28 w-28 shrink-0 rounded-full border-[12px] border-[hsl(var(--secondary))] sm:block"><div className="absolute inset-[-12px] rounded-full border-[12px] border-t-[hsl(var(--accent))] border-r-transparent border-b-transparent border-l-transparent rotate-[35deg]" /><div className="absolute inset-0 flex items-center justify-center"><Flame size={25} className="text-[hsl(var(--accent))]" /></div></div><div><div className="text-xs font-bold text-[hsl(var(--primary))]">قاعدة رفيق</div><h2 className="mt-2 display-font text-lg font-bold">ارفع السعرات، لا حجم الطبق</h2><p className="mt-2 text-xs leading-6 text-[hsl(var(--muted-foreground))]">الدهون الجيدة مثل زيت الزيتون والطحينة تمنحك طاقة مركزة تساعدك على الوصول لهدفك براحة.</p></div></div></section>
    <div className="mb-4 flex items-center justify-between"><div><h2 className="display-font text-xl font-bold">رفّ المطبخ</h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">أفكار عملية لوجبتك القادمة</p></div><span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">{saved.length ? `حفظت ${saved.length} اقتراحات` : 'اضغط للحفظ'}</span></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{guideFoods.map(({ name, tag, calories, unit, note, icon: Icon }, index) => <article key={name} className={`card-surface rise-in rounded-[22px] p-5 ${index > 2 ? 'delay-2' : ''}`}><div className="mb-5 flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><Icon size={21} /></span><button onClick={() => toggleSaved(name)} className={`rounded-full p-2 transition-colors ${saved.includes(name) ? 'bg-[hsl(var(--accent)/.25)] text-[hsl(var(--accent-foreground))]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'}`} aria-label={saved.includes(name) ? `إزالة ${name} من المحفوظات` : `حفظ ${name}`} data-testid={`button-save-food-${name}`}><BookmarkIcon filled={saved.includes(name)} /></button></div><div className="text-[10px] font-bold text-[hsl(var(--primary))]">{tag}</div><h3 className="mt-1 display-font text-lg font-bold">{name}</h3><p className="mt-2 min-h-[44px] text-xs leading-6 text-[hsl(var(--muted-foreground))]">{note}</p><div className="mt-4 flex items-end justify-between border-t pt-3"><span className="text-[10px] text-[hsl(var(--muted-foreground))]">{unit}</span><span className="text-lg font-bold text-[hsl(var(--primary))]">{calories}</span></div></article>)}</div>
    <div className="mt-7 flex items-start gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-xs leading-6 text-[hsl(var(--muted-foreground))]"><Info size={17} className="mt-1 shrink-0 text-[hsl(var(--primary))]" /><span>نصيحة توفير: حضّر كمية أكبر من الأرز أو العدس ليومين، واحتفظ بالفول السوداني والتمر في مكان قريب لتسهيل السناك.</span></div>
  </div>;
}
function BookmarkIcon({ filled }: { filled: boolean }) { return <svg width="17" height="17" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>; }

function NotFound() {
  return <div className="flex min-h-[100dvh] items-center justify-center p-6 text-center" dir="rtl"><div><div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><CircleHelp size={28} /></div><h1 className="display-font text-2xl font-bold">هذه الصفحة أخذت استراحة</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">لنعد إلى مساحتك اليومية.</p><Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="link-back-home"><ArrowRightIcon /> العودة للرئيسية</Link></div></div>;
}
function ArrowRightIcon() { return <ChevronRight size={16} />; }

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><AppLayout><Switch><Route path="/" component={HomePage} /><Route path="/tracker" component={TrackerPage} /><Route path="/scanner" component={ScannerPage} /><Route path="/guide" component={GuidePage} /><Route component={NotFound} /></Switch></AppLayout></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><RafiqProvider><Router /></RafiqProvider></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;