"use client";

import React, {
  useEffect,
  useState,
  useRef,
  createContext,
  useContext,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import SearchOverlay from "./ui/SearchOverlay";
import EmptyState from "./ui/EmptyState";
import RetryButton from "./ui/RetryButton";
import ProgressiveStepper from "./ui/ProgressiveStepper";
import { registerSearchItem } from "@/lib/searchRegistry";

// Theme
const ThemeContext = createContext({ theme: "light", toggle: () => {} });
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved) setTheme(saved);
      else if (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      )
        setTheme("dark");
    } catch (e) {}
  }, []);
  useEffect(() => {
    const el = document.documentElement;
    if (theme === "dark") {
      el.classList.add("dark");
    } else {
      el.classList.remove("dark");
    }
    try {
      localStorage.setItem("theme", theme);
    } catch (e) {}
  }, [theme]);
  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Toasts
type Toast = {
  id: string;
  title?: string;
  message: string;
  tone?: "info" | "success" | "error";
};
const ToastContext = createContext({
  push: (t: Omit<Toast, "id">) => "" as string,
});
function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  function push(t: Omit<Toast, "id">) {
    const id = String(Date.now()) + Math.random().toString(36).slice(2);
    setToasts((s) => [...s, { ...t, id }]);
    setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 6000);
    return id;
  }
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        className="fixed right-4 top-4 z-50 flex flex-col gap-2"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            aria-live={t.tone === "error" ? "assertive" : "polite"}
            aria-atomic="true"
            tabIndex={-1}
            className={`max-w-sm p-3 rounded shadow-lg border ${t.tone === "error" ? "bg-red-50 border-red-200" : t.tone === "success" ? "bg-green-50 border-green-200" : "bg-white border-slate-200"}`}
          >
            {t.title && <div className="font-semibold">{t.title}</div>}
            <div className="text-sm">{t.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext) as { push: (t: Omit<Toast, "id">) => string };
}

// Offline indicator
function OfflineIndicator() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  useEffect(() => {
    function onOnline() {
      setOnline(true);
    }
    function onOffline() {
      setOnline(false);
    }
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);
  if (online) return null;
  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-4 py-2 rounded z-50"
      role="status"
      aria-live="polite"
    >
      You're offline — some features are unavailable
    </div>
  );
}

// Error boundary (client-side)
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { error };
  }
  componentDidCatch(error: any, info: any) {
    // log to window or send to server
    console.error("ErrorBoundary caught:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-6 m-4 rounded border bg-white dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <pre className="whitespace-pre-wrap text-sm mt-2">
            {String(this.state.error)}
          </pre>
          <div className="mt-4 flex gap-2">
            <button
              className="px-3 py-1 bg-slate-200 rounded"
              onClick={() => location.reload()}
            >
              Reload
            </button>
            <button
              className="px-3 py-1 bg-rose-100 rounded"
              onClick={() => this.setState({ error: null })}
            >
              Dismiss
            </button>
          </div>
        </div>
      );
    }
    return this.props.children as any;
  }
}

// Confirm modal
const ConfirmContext = createContext({
  confirm: (opts: { title?: string; description?: string }) =>
    Promise.resolve(false),
});
function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const resolveRef = useRef<(v: boolean) => void>(() => {});
  const [opts, setOpts] = useState<{ title?: string; description?: string }>(
    {},
  );
  function confirm(o: { title?: string; description?: string }) {
    setOpts(o);
    setOpen(true);
    return new Promise<boolean>((res) => {
      resolveRef.current = res;
    });
  }
  function doClose(val: boolean) {
    setOpen(false);
    resolveRef.current(val);
  }
  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onKeyDown={(e) => {
            if (e.key === "Escape") doClose(false);
          }}
        >
          <div
            className="absolute inset-0 bg-black/40 modal-backdrop"
            onClick={() => doClose(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-desc"
            className="bg-white dark:bg-slate-900 p-6 rounded shadow-lg z-10 w-full max-w-md"
          >
            <h3 id="confirm-title" className="font-semibold text-lg">
              {opts.title || "Confirm"}
            </h3>
            <p id="confirm-desc" className="mt-2 text-sm">
              {opts.description}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                aria-label="Cancel"
                className="px-3 py-1"
                onClick={() => doClose(false)}
              >
                Cancel
              </button>
              <button
                aria-label="Confirm"
                className="px-3 py-1 bg-blue-600 text-white rounded"
                onClick={() => doClose(true)}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext) as {
    confirm: (opts: {
      title?: string;
      description?: string;
    }) => Promise<boolean>;
  };
}

// Command palette (simple)
function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();
  const { toggle } = useTheme();
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((s) => !s);
      }
      if (e.key === "?") setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const [highlight, setHighlight] = useState(0);
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      filtered[highlight]?.run();
      setOpen(false);
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  }
  const commands = [
    { id: "toggle-theme", label: "Toggle theme", run: () => toggle() },
    { id: "go-home", label: "Go to Home", run: () => router.push("/") },
    { id: "open-admin", label: "Open Admin", run: () => router.push("/admin") },
  ];
  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(q.toLowerCase()),
  );
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start pt-20 justify-center"
      onKeyDown={onKeyDown}
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-black/30"
        onClick={() => setOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="bg-white dark:bg-slate-800 w-full max-w-xl rounded shadow p-4 z-10"
      >
        <input
          autoFocus
          aria-label="Command search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setHighlight(0);
          }}
          placeholder="Type a command... (Ctrl/Cmd+K)"
          className="w-full p-3 rounded border"
        />
        <div className="mt-2 max-h-48 overflow-auto">
          {filtered.map((c, idx) => (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              aria-selected={idx === highlight}
              className={`p-2 cursor-pointer ${idx === highlight ? "bg-slate-100 dark:bg-slate-700" : ""}`}
              onClick={() => {
                c.run();
                setOpen(false);
              }}
              onMouseEnter={() => setHighlight(idx)}
            >
              {c.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>
          <ErrorBoundary>
            {children}
            <CommandPalette />
            <OfflineIndicator />
          </ErrorBoundary>
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

// Small shared UI elements exported for reuse
export function Skeleton({
  className = "",
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded ${className}`}
    >
      {children}
    </div>
  );
}

export function ProgressiveForm({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

export function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  const pathname = usePathname();
  return (
    <nav
      className="text-sm text-slate-600 dark:text-slate-300"
      aria-label="breadcrumbs"
    >
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center">
          {it.href ? (
            <a href={it.href} className="hover:underline">
              {it.label}
            </a>
          ) : (
            <span>{it.label}</span>
          )}
          {i < items.length - 1 && <span className="mx-2">/</span>}
        </span>
      ))}
    </nav>
  );
}

export { SearchOverlay, EmptyState, RetryButton, ProgressiveStepper };
