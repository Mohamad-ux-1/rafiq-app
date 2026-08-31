import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Link,
  Route,
  Switch,
  Router as WouterRouter,
  useLocation,
} from "wouter";
import {
  Activity,
  ArrowLeft,
  Bell,
  BookOpen,
  Camera,
  Check,
  ChevronRight,
  CircleHelp,
  Coffee,
  Droplets,
  Flame,
  Gauge,
  Goal,
  Heart,
  Home,
  Info,
  Leaf,
  Moon,
  NotebookPen,
  Plus,
  Scale,
  Settings,
  ShoppingBasket,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  Utensils,
  WalletCards,
  Wheat,
  X,
  Zap,
  RefreshCw,
  Key,
  CalendarDays,
  Download,
  Send,
  Bookmark,
  Languages,
  BarChart2,
} from "lucide-react";

// --- دوال IndexedDB الخام ---
const DB_NAME = "RafiqDB";
const STORE_NAME = "health_store";

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e: any) => {
      e.target.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function setLocalData(key: string, value: any): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getLocalData(key: string): Promise<any> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
// ---------------------------------------------------

type Language = "ar" | "en";
type HabitKey = "shake" | "oil" | "snack" | "workout";
type Period = "يومي" | "أسبوعي" | "شهري";
type SettingsData = {
  dailyGoal: number;
  targetWeight: number;
  startingWeight: number;
  notificationsEnabled: boolean;
  customHabits: string[];
};
type WeightEntry = { date: string; weight: number };
type DailyLog = {
  date: string;
  calories: number;
  habits: Record<HabitKey, boolean>;
};
type ScannedFood = { query: string; label: string; calories: number };
type AppData = {
  settings: SettingsData;
  weights: WeightEntry[];
  logs: DailyLog[];
  scannedFoods: ScannedFood[];
  savedGuideItems: string[];
};
type ThemeMode = "light" | "dark";

const queryClient = new QueryClient();
const STORAGE_VERSION = 2;
const todayKey = () => new Date().toISOString().slice(0, 10);
const emptyData: AppData = {
  settings: {
    dailyGoal: 2800,
    targetWeight: 67,
    startingWeight: 60,
    notificationsEnabled: false,
    customHabits: ["", "", "", ""],
  },
  weights: [],
  logs: [],
  scannedFoods: [],
  savedGuideItems: [],
};

// --- القاموس والترجمة ---
const dict = {
  ar: {
    home: "نظرتي اليوم",
    tracker: "العادات",
    history: "السجل",
    scanner: "قدّر وجبتك",
    guide: "دليل الأكل",
    saved: "المحفوظات",
    dailyGoal: "الهدف اليومي",
    kcal: "سعرة",
    kg: "كغ",
    weight: "الوزن الحالي",
    target: "الوجهة القادمة",
    addManual: "إضافة إلى اليوم",
    saveWeight: "حفظ القياس",
    morningWeight: "قياس هذا الصباح",
    comparison: "مسار تقدمك (مقارنة أسبوعية)",
    thisWeek: "هذا الأسبوع",
    lastWeek: "الأسبوع الماضي",
    avgKcal: "متوسط السعرات",
    habitsCompleted: "إنجاز العادات",
    settings: "الإعدادات والمزامنة",
    lang: "اللغة / Language",
    save: "حفظ التغييرات",
    habitsTitle: "عادات رفيق الأربعة",
    progress: "التقدم",
    estimate: "قدّر السعرات",
    scanned: "ما الذي أكلته؟",
    scanExample: "مثال: 3 تمر مع لبن",
    quick: "اقتراحات سريعة",
    guideTitle: "دليل الزيادة الاقتصادية",
    savedTitle: "أطباقك المفضلة",
    h1: "مشروب المساء",
    h2: "إضافة مغذية",
    h3: "سناك في الجيب",
    h4: "حركة خفيفة",
    emptyHistory: "لا يوجد سجلات سابقة بعد. سيبدأ رفيق بحفظ بياناتك من اليوم.",
    emptySaved: "لم تقم بحفظ أي أطعمة بعد.",
    backup: "أمان البيانات (نسخة احتياطية)",
    sync: "نقل الحساب بين الأجهزة",
    download: "تنزيل ملف",
    telegram: "إرسال لتيليجرام",
    customTasks: "أهدافك اليومية (تخصيص العادات)",
    defaultTasksNote: "اترك الحقل فارغاً لاستخدام الاسم الافتراضي للعادة",
    manualCal: "سعرات يدوية",
    today: "اليوم",
    greeting: "أهلاً بك في رفيقك",
    greetingDesc:
      "خطوة صغيرة اليوم، جسم أقوى غداً. خذ نظرة سريعة على إيقاعك ثم اختر ما يناسبك.",
  },
  en: {
    home: "Overview",
    tracker: "Habits",
    history: "History",
    scanner: "Scanner",
    guide: "Guide",
    saved: "Saved",
    dailyGoal: "Daily Goal",
    kcal: "kcal",
    kg: "kg",
    weight: "Current Wt",
    target: "Next Target",
    addManual: "Add to Today",
    saveWeight: "Save Weight",
    morningWeight: "Morning Weight",
    comparison: "Your Progress (Weekly Compare)",
    thisWeek: "This Week",
    lastWeek: "Last Week",
    avgKcal: "Avg Calories",
    habitsCompleted: "Habits Done",
    settings: "Settings & Sync",
    lang: "Language / اللغة",
    save: "Save Changes",
    habitsTitle: "Your Daily Habits",
    progress: "Progress",
    estimate: "Estimate kcal",
    scanned: "What did you eat?",
    scanExample: "e.g., 3 dates with yogurt",
    quick: "Quick Suggestions",
    guideTitle: "Nutrition Guide",
    savedTitle: "Saved Items",
    h1: "Evening Shake",
    h2: "Nutritious Add-on",
    h3: "Pocket Snack",
    h4: "Light Workout",
    emptyHistory:
      "No history records yet. Rafiq will start saving your data today.",
    emptySaved: "No saved items yet.",
    backup: "Data Security (Backup)",
    sync: "Sync Between Devices",
    download: "Download File",
    telegram: "Send to Telegram",
    customTasks: "Your Daily Goals (Custom Habits)",
    defaultTasksNote: "Leave empty to use the default habit name",
    manualCal: "Manual Calories",
    today: "Today",
    greeting: "Welcome to Rafiq",
    greetingDesc:
      "A small step today, a stronger body tomorrow. Take a quick look at your rhythm.",
  },
};

type RafiqContextValue = {
  data: AppData;
  todayLog: DailyLog;
  updateSettings: (next: Partial<SettingsData>) => void;
  toggleHabit: (habit: HabitKey) => void;
  addCalories: (calories: number, label?: string) => void;
  addWeight: (weight: number) => void;
  recordScanned: (food: ScannedFood) => void;
  toggleSavedGuideItem: (name: string) => void;
  restoreAllData: (importedData: AppData) => void;
  notify: (message: string) => void;
  theme: ThemeMode;
  toggleTheme: () => void;
  lang: Language;
  setLang: (l: Language) => void;
  t: (k: keyof (typeof dict)["ar"]) => string;
  getHabitName: (index: number) => string;
};
const RafiqContext = createContext<RafiqContextValue | null>(null);

function useRafiq() {
  const value = useContext(RafiqContext);
  if (!value) throw new Error("يجب استخدام هذا المكوّن داخل التطبيق");
  return value;
}

function RafiqProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData);
  const [isLoaded, setIsLoaded] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(
    () => (localStorage.getItem("rafiq-theme") as ThemeMode) || "light",
  );
  const [lang, setLang] = useState<Language>(
    () => (localStorage.getItem("rafiq-lang") as Language) || "ar",
  );
  const [toast, setToast] = useState("");

  const t = (key: keyof (typeof dict)["ar"]) => dict[lang][key] || key;

  const getHabitName = (index: number) => {
    const custom = data.settings.customHabits?.[index];
    if (custom && custom.trim() !== "") return custom;
    const defaults: (keyof (typeof dict)["ar"])[] = ["h1", "h2", "h3", "h4"];
    return t(defaults[index]);
  };

  useEffect(() => {
    getLocalData("rafiq-health-data")
      .then((parsed) => {
        if (parsed && parsed.version === STORAGE_VERSION) {
          setData({
            ...emptyData,
            settings: { ...emptyData.settings, ...(parsed.settings ?? {}) },
            weights: Array.isArray(parsed.weights) ? parsed.weights : [],
            logs: Array.isArray(parsed.logs) ? parsed.logs : [],
            scannedFoods: Array.isArray(parsed.scannedFoods)
              ? parsed.scannedFoods
              : [],
            savedGuideItems: Array.isArray(parsed.savedGuideItems)
              ? parsed.savedGuideItems
              : [],
          });
        } else {
          const savedLocal = localStorage.getItem("rafiq-health-data");
          if (savedLocal) {
            try {
              const parsedLocal = JSON.parse(savedLocal);
              if (parsedLocal?.version === STORAGE_VERSION) {
                setData({
                  ...emptyData,
                  settings: {
                    ...emptyData.settings,
                    ...(parsedLocal.settings ?? {}),
                  },
                  weights: Array.isArray(parsedLocal.weights)
                    ? parsedLocal.weights
                    : [],
                  logs: Array.isArray(parsedLocal.logs) ? parsedLocal.logs : [],
                  scannedFoods: Array.isArray(parsedLocal.scannedFoods)
                    ? parsedLocal.scannedFoods
                    : [],
                  savedGuideItems: Array.isArray(parsedLocal.savedGuideItems)
                    ? parsedLocal.savedGuideItems
                    : [],
                });
              }
            } catch {}
          }
        }
      })
      .catch(console.error)
      .finally(() => setIsLoaded(true));
  }, []);

  useEffect(() => {
    if (isLoaded) {
      setLocalData("rafiq-health-data", {
        version: STORAGE_VERSION,
        ...data,
      }).catch(console.error);
    }
  }, [data, isLoaded]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("rafiq-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("rafiq-lang", lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const todayLog = data.logs.find((log) => log.date === todayKey()) ?? {
    date: todayKey(),
    calories: 0,
    habits: { shake: false, oil: false, snack: false, workout: false },
  };

  const updateSettings = (next: Partial<SettingsData>) =>
    setData((current) => ({
      ...current,
      settings: { ...current.settings, ...next },
    }));

  const toggleHabit = (habit: HabitKey) => {
    setData((current) => {
      const existing = current.logs.find((log) => log.date === todayKey());
      const base = existing ?? {
        date: todayKey(),
        calories: 0,
        habits: { shake: false, oil: false, snack: false, workout: false },
      };
      const nextLog = {
        ...base,
        habits: { ...base.habits, [habit]: !base.habits[habit] },
      };
      return {
        ...current,
        logs: existing
          ? current.logs.map((log) => (log.date === todayKey() ? nextLog : log))
          : [...current.logs, nextLog],
      };
    });
  };

  const addCalories = (calories: number, label?: string) => {
    if (!Number.isFinite(calories) || calories <= 0) return;
    setData((current) => {
      const existing = current.logs.find((log) => log.date === todayKey());
      const base = existing ?? {
        date: todayKey(),
        calories: 0,
        habits: { shake: false, oil: false, snack: false, workout: false },
      };
      const nextLog = {
        ...base,
        calories: base.calories + Math.round(calories),
      };
      return {
        ...current,
        logs: existing
          ? current.logs.map((log) => (log.date === todayKey() ? nextLog : log))
          : [...current.logs, nextLog],
      };
    });
    setToast(label ? `+${calories} ${t("kcal")}` : `+${calories} ${t("kcal")}`);
  };

  const addWeight = (weight: number) => {
    if (!Number.isFinite(weight) || weight <= 0) return;
    setData((current) => ({
      ...current,
      weights: [
        ...current.weights.filter((entry) => entry.date !== todayKey()),
        { date: todayKey(), weight: Number(weight.toFixed(1)) },
      ],
    }));
    setToast(t("saveWeight"));
  };

  const recordScanned = (food: ScannedFood) =>
    setData((current) => ({
      ...current,
      scannedFoods: [
        food,
        ...current.scannedFoods.filter((item) => item.query !== food.query),
      ].slice(0, 12),
    }));

  const toggleSavedGuideItem = (name: string) => {
    setData((current) => ({
      ...current,
      savedGuideItems: current.savedGuideItems.includes(name)
        ? current.savedGuideItems.filter((item) => item !== name)
        : [...current.savedGuideItems, name],
    }));
  };

  const restoreAllData = (importedData: AppData) => {
    setData({ ...emptyData, ...importedData, version: STORAGE_VERSION } as any);
    setToast("تم استرجاع الحساب بنجاح!");
  };

  const toggleTheme = () =>
    setTheme((current) => (current === "light" ? "dark" : "light"));

  if (!isLoaded) return null;

  return (
    <RafiqContext.Provider
      value={{
        data,
        todayLog,
        updateSettings,
        toggleHabit,
        addCalories,
        addWeight,
        recordScanned,
        toggleSavedGuideItem,
        restoreAllData,
        notify: setToast,
        theme,
        toggleTheme,
        lang,
        setLang,
        t,
        getHabitName,
      }}
    >
      {children}
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 w-max max-w-[90vw] rounded-full bg-[hsl(var(--foreground))] px-5 py-3 text-sm font-semibold text-[hsl(var(--background))] shadow-xl md:bottom-7">
          {toast}
        </div>
      )}
    </RafiqContext.Provider>
  );
}

const getNavItems = (t: any) => [
  { href: "/", label: t("home"), icon: Home },
  { href: "/tracker", label: t("tracker"), icon: NotebookPen },
  { href: "/history", label: t("history"), icon: CalendarDays },
  { href: "/scanner", label: t("scanner"), icon: Camera },
  { href: "/guide", label: t("guide"), icon: BookOpen },
  { href: "/saved", label: t("saved"), icon: Bookmark },
];

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] shadow-sm">
        <Leaf size={23} strokeWidth={2.4} />
      </div>
      <div>
        <div className="display-font text-base font-bold leading-5">Rafiq</div>
      </div>
    </div>
  );
}

function ControlsToggle({
  mobile = false,
  onOpenSettings,
}: {
  mobile?: boolean;
  onOpenSettings: () => void;
}) {
  const { theme, toggleTheme, lang, setLang, t } = useRafiq();
  const btnClass = mobile
    ? "flex h-10 w-10 items-center justify-center rounded-full border bg-[hsl(var(--card)/.94)] text-[hsl(var(--foreground))] shadow-md backdrop-blur hover:bg-[hsl(var(--muted))]"
    : "flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold text-[hsl(var(--sidebar-foreground)/.64)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]";

  if (mobile) {
    return (
      <div className="fixed end-4 top-4 z-20 flex gap-2">
        <button onClick={toggleTheme} className={btnClass}>
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          className={btnClass}
        >
          <Languages size={18} />
        </button>
        <button onClick={onOpenSettings} className={btnClass}>
          <Settings size={18} />
        </button>
      </div>
    );
  }
  return (
    <>
      <button onClick={onOpenSettings} className={btnClass}>
        <Settings size={18} />
        <span>{t("settings")}</span>
      </button>
      <button onClick={toggleTheme} className={btnClass}>
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
      </button>
      <button
        onClick={() => setLang(lang === "ar" ? "en" : "ar")}
        className={btnClass}
      >
        <Languages size={18} />
        <span>{t("lang")}</span>
      </button>
    </>
  );
}

function Sidebar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [location] = useLocation();
  const { data, t } = useRafiq();
  const navItems = getNavItems(t);

  return (
    <aside className="hidden w-[246px] shrink-0 flex-col bg-[hsl(var(--sidebar))] px-5 py-7 text-[hsl(var(--sidebar-foreground))] md:flex border-e border-[hsl(var(--border)/.2)]">
      <BrandMark />
      <nav className="mt-8 space-y-1.5">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-colors ${location === href ? "nav-active" : "text-[hsl(var(--sidebar-foreground)/.64)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]"}`}
          >
            <Icon size={18} strokeWidth={location === href ? 2.4 : 1.8} />
            <span>{label}</span>
            {location === href && (
              <span className="ms-auto h-1.5 w-1.5 rounded-full bg-[hsl(var(--sidebar-primary))]" />
            )}
          </Link>
        ))}
      </nav>
      <div className="mt-auto">
        <div className="mb-3 rounded-2xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.5)] p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-[hsl(var(--sidebar-foreground)/.6)]">
            <span>{t("dailyGoal")}</span>
            <Target size={15} className="text-[hsl(var(--sidebar-primary))]" />
          </div>
          <div className="text-xl font-bold" dir="ltr">
            {data.settings.dailyGoal}{" "}
            <span className="text-[10px] text-[hsl(var(--sidebar-foreground)/.55)]">
              {t("kcal")}
            </span>
          </div>
        </div>
        <ControlsToggle onOpenSettings={onOpenSettings} />
      </div>
    </aside>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const { data, updateSettings, restoreAllData, notify, t } = useRafiq();
  const [goal, setGoal] = useState(String(data.settings.dailyGoal));
  const [target, setTarget] = useState(String(data.settings.targetWeight));
  const [syncCode, setSyncCode] = useState("");
  const [customHabits, setCustomHabits] = useState(
    data.settings.customHabits || ["", "", "", ""],
  );

  const save = () => {
    updateSettings({
      dailyGoal: Number(goal) || 2800,
      targetWeight: Number(target) || 67,
      customHabits,
    });
    onClose();
  };

  const generateCode = () => {
    navigator.clipboard.writeText(
      btoa(unescape(encodeURIComponent(JSON.stringify(data)))),
    );
    notify("تم النسخ!");
  };
  const restoreData = () => {
    try {
      restoreAllData(
        JSON.parse(decodeURIComponent(escape(atob(syncCode.trim())))),
      );
      onClose();
    } catch {
      notify("كود غير صالح");
    }
  };
  const downloadData = () => {
    const link = document.createElement("a");
    link.download = `rafiq-${todayKey()}.json`;
    link.href = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    link.click();
  };
  const sendToTelegram = () => {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(`Rafiq Backup\nDate: ${todayKey()}\n\nCode:\n${btoa(unescape(encodeURIComponent(JSON.stringify(data))))}`)}`,
      "_blank",
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[hsl(var(--foreground)/.4)] p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <div className="card-surface w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-t-[28px] p-6 sm:rounded-[28px]">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
          >
            <X size={19} />
          </button>
          <h2 className="display-font text-lg font-bold">{t("settings")}</h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold">
              {t("dailyGoal")}
              <input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                type="number"
                className="mt-1.5 w-full rounded-xl border bg-[hsl(var(--background))] px-3 py-2.5 outline-none focus:ring-2"
                dir="ltr"
              />
            </label>
            <label className="block text-xs font-semibold">
              {t("target")}
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                type="number"
                step="0.1"
                className="mt-1.5 w-full rounded-xl border bg-[hsl(var(--background))] px-3 py-2.5 outline-none focus:ring-2"
                dir="ltr"
              />
            </label>
          </div>

          <div className="rounded-xl border bg-[hsl(var(--background))] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[hsl(var(--primary))]">
              <Activity size={16} /> {t("customTasks")}
            </div>
            <p className="mb-3 text-[10px] text-[hsl(var(--muted-foreground))]">
              {t("defaultTasksNote")}
            </p>
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  value={customHabits[i]}
                  onChange={(e) => {
                    const n = [...customHabits];
                    n[i] = e.target.value;
                    setCustomHabits(n);
                  }}
                  placeholder={t(`h${i + 1}` as any)}
                  className="w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-2 text-xs outline-none focus:ring-1"
                />
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-[hsl(var(--background))] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold">
              <Key size={16} /> {t("sync")}
            </div>
            <div className="flex gap-2 mb-3">
              <button
                onClick={generateCode}
                className="flex-1 rounded-lg bg-[hsl(var(--secondary))] py-2 text-xs font-bold text-[hsl(var(--primary))]"
              >
                نسخ كود الحساب
              </button>
            </div>
            <div className="flex gap-2">
              <input
                value={syncCode}
                onChange={(e) => setSyncCode(e.target.value)}
                placeholder="الصق الكود هنا..."
                className="flex-1 rounded-lg border bg-[hsl(var(--card))] px-3 py-2 text-xs outline-none focus:ring-1"
                dir="ltr"
              />
              <button
                onClick={restoreData}
                disabled={!syncCode.trim()}
                className="rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-50"
              >
                استرجاع
              </button>
            </div>
          </div>

          <div className="rounded-xl border bg-[hsl(var(--background))] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Download size={16} /> {t("backup")}
            </div>
            <div className="flex gap-2">
              <button
                onClick={downloadData}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[hsl(var(--secondary))] py-2 text-xs font-bold text-[hsl(var(--primary))]"
              >
                <Download size={14} /> {t("download")}
              </button>
              <button
                onClick={sendToTelegram}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[#24A1DE]/10 py-2 text-xs font-bold text-[#24A1DE]"
              >
                <Send size={14} /> {t("telegram")}
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={save}
          className="mt-5 w-full rounded-xl bg-[hsl(var(--primary))] py-3.5 text-sm font-bold text-[hsl(var(--primary-foreground))]"
        >
          {t("save")}
        </button>
      </div>
    </div>
  );
}

function MobileNav() {
  const [location] = useLocation();
  const { t } = useRafiq();
  return (
    <nav className="fixed bottom-4 start-4 end-4 z-30 flex items-center justify-around rounded-2xl border bg-[hsl(var(--card)/.92)] px-2 py-2.5 shadow-2xl backdrop-blur-md md:hidden">
      {getNavItems(t).map(({ href, label, icon: Icon }) => (
        <Link
          href={href}
          key={href}
          className={`flex flex-col items-center gap-1 rounded-xl px-2 py-1 text-[10px] font-semibold transition-colors ${location === href ? "text-[hsl(var(--primary))] bg-[hsl(var(--secondary)/.6)]" : "text-[hsl(var(--muted-foreground))]"}`}
        >
          <Icon size={19} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function AppLayout({ children }: { children: ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <div className="app-shell flex min-h-screen relative">
      <Sidebar onOpenSettings={() => setSettingsOpen(true)} />
      <ControlsToggle mobile onOpenSettings={() => setSettingsOpen(true)} />
      <main className="min-w-0 flex-1 pb-28 pt-16 md:pb-0 md:pt-0">
        {children}
      </main>
      <MobileNav />
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="display-font text-[clamp(1.5rem,3vw,2rem)] font-bold leading-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">
            {description}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}

function ProgressRing({ value, max }: { value: number; max: number }) {
  const percentage = Math.min(100, Math.round((value / max) * 100)) || 0;
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="-rotate-90">
        <circle
          cx="60"
          cy="60"
          r="49"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r="49"
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${percentage * 3.08} 308`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="display-font text-xl font-bold" dir="ltr">
          {value}
        </span>
        <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
          / {max}
        </span>
      </div>
    </div>
  );
}

function WeightChart({
  weights,
  target,
}: {
  weights: WeightEntry[];
  target: number;
}) {
  const points = weights.slice(-7);
  if (!points.length) return null;
  const min = Math.min(59.5, ...points.map((p) => p.weight));
  const max = Math.max(target, ...points.map((p) => p.weight));
  const pointString = points
    .map(
      (point, i) =>
        `${(i / Math.max(1, points.length - 1)) * 100},${96 - ((point.weight - min) / Math.max(0.1, max - min)) * 72}`,
    )
    .join(" ");
  const areaString = `0,96 ${pointString} 100,96`;
  return (
    <div className="relative h-40 w-full mt-4" dir="ltr">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-full w-full overflow-visible"
      >
        <defs>
          <linearGradient id="line-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="hsl(var(--accent))" stopOpacity=".32" />
            <stop offset="1" stopColor="hsl(var(--accent))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[20, 44, 68, 92].map((y) => (
          <line
            key={y}
            x1="0"
            x2="100"
            y1={y}
            y2={y}
            stroke="hsl(var(--border))"
            strokeDasharray="1.5 2"
            strokeWidth=".45"
          />
        ))}
        <polygon points={areaString} fill="url(#line-fill)" />
        <polyline
          points={pointString}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point, i) => (
          <circle
            key={point.date}
            cx={(i / Math.max(1, points.length - 1)) * 100}
            cy={96 - ((point.weight - min) / Math.max(0.1, max - min)) * 72}
            r="2.1"
            fill="hsl(var(--card))"
            stroke="hsl(var(--primary))"
            strokeWidth="1.1"
          />
        ))}
      </svg>
      <div className="absolute bottom-[-23px] left-0 right-0 flex justify-between text-[10px] text-[hsl(var(--muted-foreground))]">
        {points.map((point) => (
          <span key={point.date}>
            {new Date(`${point.date}T12:00:00`).toLocaleDateString(undefined, {
              weekday: "short",
            })}
          </span>
        ))}
      </div>
    </div>
  );
}

function WeeklyComparisonCard() {
  const { data, t } = useRafiq();
  const getStats = (offsetStart: number, offsetEnd: number) => {
    let cals = 0,
      habits = 0;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    for (let i = offsetStart; i < offsetEnd; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const log = data.logs.find(
        (l) => l.date === d.toISOString().slice(0, 10),
      );
      if (log) {
        cals += log.calories;
        habits += Object.values(log.habits).filter(Boolean).length;
      }
    }
    return { avgCals: Math.round(cals / 7), totalHabits: habits };
  };

  const current = getStats(0, 7);
  const previous = getStats(7, 14);
  const calDelta = current.avgCals - previous.avgCals;
  const habDelta = current.totalHabits - previous.totalHabits;

  return (
    <section className="card-surface rounded-[24px] p-5 md:p-7">
      <div className="mb-5 flex items-center gap-2 font-bold text-lg">
        <BarChart2 size={20} className="text-[hsl(var(--primary))]" />{" "}
        {t("comparison")}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-[hsl(var(--muted)/.5)] p-4">
          <div className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">
            {t("avgKcal")}
          </div>
          <div className="my-2 text-2xl font-bold" dir="ltr">
            {current.avgCals}
          </div>
          <div
            className={`text-xs font-bold ${calDelta >= 0 ? "text-emerald-500" : "text-rose-500"}`}
            dir="ltr"
          >
            {calDelta >= 0 ? "+" : ""}
            {calDelta} vs {t("lastWeek")}
          </div>
        </div>
        <div className="rounded-2xl bg-[hsl(var(--muted)/.5)] p-4">
          <div className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">
            {t("habitsCompleted")}
          </div>
          <div className="my-2 text-2xl font-bold" dir="ltr">
            {current.totalHabits}{" "}
            <span className="text-sm font-normal text-[hsl(var(--muted-foreground))]">
              / 28
            </span>
          </div>
          <div
            className={`text-xs font-bold ${habDelta >= 0 ? "text-[hsl(var(--primary))]" : "text-rose-500"}`}
            dir="ltr"
          >
            {habDelta >= 0 ? "+" : ""}
            {habDelta} vs {t("lastWeek")}
          </div>
        </div>
      </div>
    </section>
  );
}

function HomePage() {
  const { data, todayLog, addWeight, t } = useRafiq();
  const [weight, setWeight] = useState("");
  const latestWeight = data.weights[data.weights.length - 1]?.weight ?? null;
  const habitsDone = Object.values(todayLog.habits).filter(Boolean).length;

  return (
    <div className="mx-auto max-w-[1280px] p-4 sm:p-6 md:p-9 lg:p-12">
      <PageHeader title={t("greeting")} description={t("greetingDesc")} />
      <div className="grid gap-5 lg:grid-cols-3 mb-5">
        <section className="card-surface rounded-[24px] p-5 md:p-7 col-span-1 lg:col-span-2 flex flex-col justify-center">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ProgressRing
              value={todayLog.calories}
              max={data.settings.dailyGoal}
            />
            <div className="text-center sm:text-start">
              <h2 className="text-xl font-bold mb-1">{t("kcal")}</h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                {t("today")} :{" "}
                <strong className="text-[hsl(var(--foreground))]">
                  {todayLog.calories}
                </strong>{" "}
                / {data.settings.dailyGoal}
              </p>
              <Link
                href="/tracker"
                className="inline-flex items-center justify-center gap-2 text-sm font-bold text-[hsl(var(--primary))] bg-[hsl(var(--secondary))] px-5 py-2.5 rounded-xl transition-opacity hover:opacity-80"
              >
                {t("addManual")}{" "}
                <ChevronRight size={16} className="rtl:rotate-180" />
              </Link>
            </div>
          </div>
        </section>
        <section className="card-surface rounded-[24px] p-5 md:p-7 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-4">
            <span className="font-bold text-lg">{t("habitsCompleted")}</span>
            <span className="text-2xl font-bold text-[hsl(var(--primary))]">
              {habitsDone}/4
            </span>
          </div>
          <div className="h-4 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
            <div
              className="h-full bg-[hsl(var(--accent))] transition-all duration-500"
              style={{ width: `${habitsDone * 25}%` }}
            />
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <WeeklyComparisonCard />
        <section className="card-surface rounded-[24px] p-5 md:p-7">
          <div className="mb-4 flex items-center justify-between">
            <div className="font-bold text-lg flex items-center gap-2">
              <Scale size={20} className="text-[hsl(var(--accent))]" />{" "}
              {t("morningWeight")}
            </div>
          </div>
          <div className="flex gap-3">
            <input
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              type="number"
              step=".1"
              placeholder={latestWeight ? String(latestWeight) : "60"}
              className="flex-1 rounded-xl border bg-[hsl(var(--background))] px-4 py-3 text-lg font-bold outline-none focus:ring-2"
              dir="ltr"
            />
            <button
              onClick={() => {
                addWeight(Number(weight));
                setWeight("");
              }}
              disabled={!weight}
              className="rounded-xl bg-[hsl(var(--primary))] px-6 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-40 shrink-0"
            >
              {t("save")}
            </button>
          </div>
          <div className="mt-5 flex items-center justify-between text-sm border-t pt-4">
            <span className="text-[hsl(var(--muted-foreground))]">
              {t("weight")}:{" "}
              <strong className="text-[hsl(var(--foreground))] text-lg mx-1">
                {latestWeight ?? "--"}
              </strong>{" "}
              {t("kg")}
            </span>
            <span className="text-[hsl(var(--muted-foreground))]">
              {t("target")}:{" "}
              <strong className="text-[hsl(var(--foreground))] text-lg mx-1">
                {data.settings.targetWeight}
              </strong>{" "}
              {t("kg")}
            </span>
          </div>
          <WeightChart
            weights={data.weights}
            target={data.settings.targetWeight}
          />
        </section>
      </div>
    </div>
  );
}

const habitsIcons: Record<HabitKey, typeof Coffee> = {
  shake: Coffee,
  oil: Droplets,
  snack: WalletCards,
  workout: Activity,
};

function TrackerPage() {
  const { todayLog, toggleHabit, addCalories, t, getHabitName } = useRafiq();
  const [calories, setCalories] = useState("");
  const addManual = () => {
    addCalories(Number(calories), t("addManual"));
    setCalories("");
  };
  return (
    <div className="mx-auto max-w-[1080px] p-4 sm:p-6 md:p-9 lg:p-12">
      <PageHeader title={t("tracker")} />
      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <section className="card-surface rounded-[24px] p-5 md:p-7">
          <div className="mb-6 font-bold text-lg">{t("habitsTitle")}</div>
          <div className="grid gap-4 sm:grid-cols-2">
            {(Object.keys(habitsIcons) as HabitKey[]).map((key, i) => {
              const checked = todayLog.habits[key];
              const Icon = habitsIcons[key];
              return (
                <button
                  key={key}
                  onClick={() => toggleHabit(key)}
                  className={`group flex items-center gap-4 rounded-2xl border p-5 text-start transition-all ${checked ? "border-[hsl(var(--primary)/.28)] bg-[hsl(var(--secondary)/.55)]" : "bg-[hsl(var(--background)/.5)]"}`}
                >
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[hsl(var(--card))] ${checked ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--muted-foreground))]"}`}
                  >
                    <Icon size={22} />
                  </span>
                  <span className="min-w-0 flex-1 font-bold text-base">
                    {getHabitName(i)}
                  </span>
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${checked ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" : "border-[hsl(var(--border))] text-transparent"}`}
                  >
                    <Check size={14} />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
        <section className="card-surface rounded-[24px] p-5 md:p-7">
          <div className="mb-6 font-bold text-lg">{t("manualCal")}</div>
          <div className="flex flex-col gap-4">
            <input
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              type="number"
              min="1"
              placeholder="450"
              className="rounded-xl border bg-[hsl(var(--card))] px-4 py-4 text-lg font-bold outline-none focus:ring-2"
              dir="ltr"
            />
            <button
              onClick={addManual}
              disabled={!calories}
              className="rounded-xl bg-[hsl(var(--primary))] py-4 text-sm font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-40"
            >
              {t("addManual")}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function ScannerPage() {
  const { addCalories, recordScanned, t } = useRafiq();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const estimate = () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    const generateSmartEstimate = (text: string) => {
      let estimatedCalories = 0;
      let details: string[] = [];
      const normalizedText = text
        .toLowerCase()
        .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());
      const weightMatch = normalizedText.match(/(\d+)/);
      const userNumber = weightMatch ? parseInt(weightMatch[1], 10) : null;

      const foodDatabase = [
        {
          keywords: ["تمر", "dates"],
          isPiece: true,
          calPerPiece: 35,
          defaultNum: 4,
          unitName: "حبات",
        },
        {
          keywords: ["بيض", "egg"],
          isPiece: true,
          calPerPiece: 70,
          defaultNum: 2,
          unitName: "بيضة",
        },
        {
          keywords: ["جبن", "cheese"],
          calPer100g: 250,
          defaultNum: 50,
          unitName: "غ",
        },
        {
          keywords: ["لبن", "زبادي", "yogurt"],
          calPer100g: 61,
          defaultNum: 170,
          unitName: "غ",
        },
        {
          keywords: ["حليب", "milk"],
          calPer100g: 61,
          defaultNum: 250,
          unitName: "غ",
        },
        {
          keywords: ["شوفان", "oats"],
          calPer100g: 389,
          defaultNum: 50,
          unitName: "غ",
        },
        {
          keywords: ["رز", "أرز", "rice"],
          calPer100g: 130,
          defaultNum: 150,
          unitName: "غ",
        },
        {
          keywords: ["بطاطا", "potato"],
          calPer100g: 87,
          defaultNum: 150,
          unitName: "غ",
        },
        {
          keywords: ["زيت", "سمن", "oil", "butter"],
          calPer100g: 884,
          defaultNum: 15,
          unitName: "غ",
        },
        {
          keywords: ["طحينة", "tahini"],
          calPer100g: 595,
          defaultNum: 30,
          unitName: "غ",
        },
        {
          keywords: ["سوداني", "peanut"],
          calPer100g: 567,
          defaultNum: 30,
          unitName: "غ",
        },
        {
          keywords: ["فول", "beans"],
          calPer100g: 110,
          defaultNum: 150,
          unitName: "غ",
        },
        {
          keywords: ["لحم", "دجاج", "فروج", "شاورما", "meat", "chicken"],
          calPer100g: 250,
          defaultNum: 100,
          unitName: "غ",
        },
        {
          keywords: ["خبز", "صمون", "رغيف", "bread"],
          isPiece: true,
          calPerPiece: 260,
          defaultNum: 1,
          unitName: "رغيف",
        },
        {
          keywords: ["معكرونة", "مكرونة", "pasta"],
          calPer100g: 130,
          defaultNum: 150,
          unitName: "غ",
        },
        {
          keywords: ["موز", "banana"],
          isPiece: true,
          calPerPiece: 90,
          defaultNum: 1,
          unitName: "حبة",
        },
      ];

      foodDatabase.forEach((item) => {
        if (item.keywords.some((kw) => normalizedText.includes(kw))) {
          const numToUse = userNumber !== null ? userNumber : item.defaultNum;
          let itemCalories = item.isPiece
            ? item.calPerPiece! * numToUse
            : Math.round((item.calPer100g! / 100) * numToUse);
          details.push(
            `${item.keywords[0]} (${numToUse} = ${itemCalories} ${t("kcal")})`,
          );
          estimatedCalories += itemCalories;
        }
      });
      if (estimatedCalories === 0) {
        const numToUse = userNumber !== null ? userNumber : 150;
        estimatedCalories = Math.round((200 / 100) * numToUse);
        details.push(
          `غير مسجل (${numToUse} = ${estimatedCalories} ${t("kcal")})`,
        );
      }
      return { calories: estimatedCalories, detail: details.join(" + ") };
    };

    window.setTimeout(() => {
      const smartData = generateSmartEstimate(query.trim());
      const food = {
        label: query.trim(),
        calories: smartData.calories,
        detail: smartData.detail,
      };
      setResult(food);
      recordScanned(food as ScannedFood);
      setLoading(false);
    }, 400);
  };

  return (
    <div className="mx-auto max-w-[1080px] p-4 sm:p-6 md:p-9 lg:p-12">
      <PageHeader title={t("scanner")} />
      <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <section className="card-surface rounded-[24px] p-5 md:p-7">
          <div className="mb-4 font-bold text-lg">{t("scanned")}</div>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && estimate()}
              placeholder={t("scanExample")}
              className="flex-1 rounded-xl border bg-[hsl(var(--background))] px-4 py-3 text-sm outline-none focus:ring-2"
            />
            <button
              onClick={estimate}
              className="rounded-xl bg-[hsl(var(--primary))] px-6 text-sm font-bold text-[hsl(var(--primary-foreground))]"
            >
              {t("estimate")}
            </button>
          </div>
          {loading && (
            <div className="mt-5 rounded-2xl bg-[hsl(var(--muted)/.6)] p-5">
              <div className="h-3 w-2/3 animate-pulse rounded bg-[hsl(var(--border))]" />
            </div>
          )}
          {result && (
            <div className="mt-5 rounded-2xl border bg-[hsl(var(--secondary)/.4)] p-5 flex justify-between items-center">
              <div className="font-bold text-lg">
                {result.label}
                <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  {result.detail}
                </div>
              </div>
              <div
                className="text-2xl font-bold text-[hsl(var(--primary))]"
                dir="ltr"
              >
                {result.calories}{" "}
                <span className="text-[10px]">{t("kcal")}</span>
              </div>
              <button
                onClick={() => addCalories(result.calories, result.label)}
                className="mx-4 rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]"
              >
                <Plus size={16} />
              </button>
            </div>
          )}
        </section>
        <section className="card-surface rounded-[24px] bg-[hsl(var(--secondary)/.3)] p-5 md:p-7">
          <div className="mb-4 font-bold text-lg">{t("quick")}</div>
          <div className="space-y-3">
            {[
              "3 تمر",
              "بيضتين مسلوقين",
              "100 غرام بطاطا مسلوقة",
              "كوب لبن",
            ].map((label) => (
              <button
                key={label}
                onClick={() => {
                  setQuery(label);
                  estimate();
                }}
                className="w-full text-start rounded-xl border bg-[hsl(var(--card)/.7)] p-4 text-sm font-bold hover:bg-[hsl(var(--card))]"
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

const guideFoodsAr = [
  {
    name: "زيت الزيتون",
    tag: "أعلى أثر بأقل حجم",
    calories: "١٢٠",
    unit: "سعرة / ملعقة",
    note: "أضفه للفول، السلطة، أو على الخبز بعد الطهي.",
    icon: Leaf,
  },
  {
    name: "الفول السوداني",
    tag: "رفيق الجيب",
    calories: "٥٦٧",
    unit: "سعرة / ١٠٠غ",
    note: "محمصاً أو على شكل زبدة مع الموز والخبز.",
    icon: ShoppingBasket,
  },
  {
    name: "الزبادي المحلي",
    tag: "بروتين يومي",
    calories: "١٥٠",
    unit: "سعرة / علبة",
    note: "اختَر كامل الدسم وأضف إليه العسل أو الشوفان.",
    icon: Droplets,
  },
  {
    name: "الشوفان",
    tag: "فطور يشبعك",
    calories: "٣٨٩",
    unit: "سعرة / ١٠٠غ",
    note: "اطهه بالحليب، ثم أضف التمر أو الطحينة.",
    icon: Wheat,
  },
  {
    name: "البطاطا المسلوقة",
    tag: "نشويات اقتصادية",
    calories: "٢٦٠",
    unit: "سعرة / حبتين",
    note: "اهرَسها مع ملعقة زيت زيتون أو سمنة لرفع سعراتها بسهولة.",
    icon: Utensils,
  },
  {
    name: "العدس والأرز",
    tag: "طبق البيت الذكي",
    calories: "٤٨٠",
    unit: "سعرة / طبق",
    note: "وجبة دافئة، مشبعة، وتزداد طاقتها بملعقة طحينة.",
    icon: Target,
  },
];
const guideFoodsEn = [
  {
    name: "Olive Oil",
    tag: "High impact, low volume",
    calories: "120",
    unit: "kcal / spoon",
    note: "Add to beans, salads, or bread after cooking.",
    icon: Leaf,
  },
  {
    name: "Peanuts",
    tag: "Pocket Companion",
    calories: "567",
    unit: "kcal / 100g",
    note: "Roasted or as butter with banana and bread.",
    icon: ShoppingBasket,
  },
  {
    name: "Local Yogurt",
    tag: "Daily Protein",
    calories: "150",
    unit: "kcal / cup",
    note: "Choose full fat and add honey or oats.",
    icon: Droplets,
  },
  {
    name: "Oats",
    tag: "Filling Breakfast",
    calories: "389",
    unit: "kcal / 100g",
    note: "Cook with milk, then add dates or tahini.",
    icon: Wheat,
  },
  {
    name: "Boiled Potato",
    tag: "Economic Carbs",
    calories: "260",
    unit: "kcal / 2 pcs",
    note: "Mash with a spoon of olive oil or ghee.",
    icon: Utensils,
  },
  {
    name: "Lentils & Rice",
    tag: "Smart Home Dish",
    calories: "480",
    unit: "kcal / plate",
    note: "Warm, filling, and boosted with tahini.",
    icon: Target,
  },
];

function GuidePage() {
  const { toggleSavedGuideItem, t, lang, data } = useRafiq();
  const list = lang === "ar" ? guideFoodsAr : guideFoodsEn;
  return (
    <div className="mx-auto max-w-[1160px] p-4 sm:p-6 md:p-9 lg:p-12">
      <PageHeader title={t("guideTitle")} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((f) => (
          <article key={f.name} className="card-surface rounded-[22px] p-6">
            <div className="mb-5 flex justify-between">
              <div className="h-12 w-12 rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))] flex items-center justify-center">
                <f.icon size={22} />
              </div>
              <button
                onClick={() => toggleSavedGuideItem(f.name)}
                className={`p-2.5 rounded-full ${data.savedGuideItems.includes(f.name) ? "bg-[hsl(var(--accent)/.2)] text-[hsl(var(--accent-foreground))]" : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"}`}
              >
                <Bookmark
                  size={18}
                  fill={
                    data.savedGuideItems.includes(f.name)
                      ? "currentColor"
                      : "none"
                  }
                />
              </button>
            </div>
            <div className="text-xs font-bold text-[hsl(var(--primary))] mb-1">
              {f.tag}
            </div>
            <h3 className="font-bold text-lg">{f.name}</h3>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))] min-h-[50px]">
              {f.note}
            </p>
            <div className="mt-5 pt-4 border-t flex justify-between items-end">
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                {f.unit}
              </span>
              <div
                className="text-xl font-bold text-[hsl(var(--primary))]"
                dir="ltr"
              >
                {f.calories} <span className="text-[10px]">{t("kcal")}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function SavedPage() {
  const { data, toggleSavedGuideItem, t, lang } = useRafiq();
  const list = (lang === "ar" ? guideFoodsAr : guideFoodsEn).filter((f) =>
    data.savedGuideItems.includes(f.name),
  );
  return (
    <div className="mx-auto max-w-[1160px] p-4 sm:p-6 md:p-9 lg:p-12">
      <PageHeader title={t("savedTitle")} />
      {list.length === 0 ? (
        <div className="card-surface p-10 text-center text-sm rounded-[24px]">
          {t("emptySaved")}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((f) => (
            <article key={f.name} className="card-surface rounded-[22px] p-6">
              <div className="mb-5 flex justify-between">
                <div className="h-12 w-12 rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))] flex items-center justify-center">
                  <f.icon size={22} />
                </div>
                <button
                  onClick={() => toggleSavedGuideItem(f.name)}
                  className={`p-2.5 rounded-full ${data.savedGuideItems.includes(f.name) ? "bg-[hsl(var(--accent)/.2)] text-[hsl(var(--accent-foreground))]" : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"}`}
                >
                  <Bookmark
                    size={18}
                    fill={
                      data.savedGuideItems.includes(f.name)
                        ? "currentColor"
                        : "none"
                    }
                  />
                </button>
              </div>
              <div className="text-xs font-bold text-[hsl(var(--primary))] mb-1">
                {f.tag}
              </div>
              <h3 className="font-bold text-lg">{f.name}</h3>
              <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))] min-h-[50px]">
                {f.note}
              </p>
              <div className="mt-5 pt-4 border-t flex justify-between items-end">
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  {f.unit}
                </span>
                <div
                  className="text-xl font-bold text-[hsl(var(--primary))]"
                  dir="ltr"
                >
                  {f.calories} <span className="text-[10px]">{t("kcal")}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryPage() {
  const { data, t, getHabitName } = useRafiq();
  const sortedLogs = [...data.logs].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  return (
    <div className="mx-auto max-w-[1080px] p-4 sm:p-6 md:p-9 lg:p-12">
      <PageHeader title={t("history")} />
      <div className="grid gap-4">
        {sortedLogs.length === 0 ? (
          <div className="card-surface p-10 text-center text-sm rounded-[24px]">
            {t("emptyHistory")}
          </div>
        ) : (
          sortedLogs.map((log) => {
            const habitsDone = Object.values(log.habits).filter(Boolean).length;
            const weightThatDay = data.weights.find(
              (w) => w.date === log.date,
            )?.weight;
            return (
              <div key={log.date} className="card-surface rounded-[24px] p-6">
                <div className="flex justify-between border-b border-[hsl(var(--border)/.6)] pb-4 mb-5">
                  <div className="font-bold text-base">
                    {new Date(log.date).toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  {weightThatDay && (
                    <div className="text-sm font-bold text-[hsl(var(--primary))] bg-[hsl(var(--secondary))] px-3 py-1.5 rounded-lg">
                      {weightThatDay} {t("kg")}
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="text-3xl font-bold" dir="ltr">
                    {log.calories}{" "}
                    <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
                      {t("kcal")}
                    </span>
                  </div>
                  <div>
                    <div className="mb-3 text-xs font-bold text-[hsl(var(--muted-foreground))]">
                      {t("habitsCompleted")} ({habitsDone}/4)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(habitsIcons) as HabitKey[]).map(
                        (k, idx) =>
                          log.habits[k] && (
                            <span
                              key={k}
                              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]"
                            >
                              <Check size={14} strokeWidth={2.5} />{" "}
                              {getHabitName(idx)}
                            </span>
                          ),
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center p-6 text-center">
      <div>
        <h1 className="font-bold text-2xl">404</h1>
        <Link
          href="/"
          className="mt-4 inline-flex font-bold text-[hsl(var(--primary))]"
        >
          Back Home
        </Link>
      </div>
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  return (
    <ErrorBoundary resetKey={location}>
      <AppLayout>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/tracker" component={TrackerPage} />
          <Route path="/history" component={HistoryPage} />
          <Route path="/saved" component={SavedPage} />
          <Route path="/scanner" component={ScannerPage} />
          <Route path="/guide" component={GuidePage} />
          <Route component={NotFound} />
        </Switch>
      </AppLayout>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <RafiqProvider>
            <Router />
          </RafiqProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
