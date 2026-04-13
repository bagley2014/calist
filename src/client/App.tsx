import { useEffect, useState } from "react";
import type { Item, ParsedQuickAdd, SchedulerSettings } from "@shared/types";
import { CalendarView } from "./components/CalendarView";
import { DetailPanel } from "./components/DetailPanel";
import { ListView } from "./components/ListView";
import { QuickAdd } from "./components/QuickAdd";

type ScreenState = "loading" | "setup" | "login" | "ready";
type ViewState = "list" | "calendar";

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const body = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) {
    throw new ApiError(body.error ?? "Request failed.", response.status);
  }

  return body;
}

function initialMonthCursor() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
}

export default function App() {
  const [screen, setScreen] = useState<ScreenState>("loading");
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState<SchedulerSettings | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [view, setView] = useState<ViewState>("list");
  const [monthCursor, setMonthCursor] = useState(initialMonthCursor);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirm, setAuthConfirm] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    function handleOnlineStatus() {
      setIsOffline(!navigator.onLine);
    }

    function handleBeforeInstallPrompt(event: Event) {
      if ("prompt" in event) {
        event.preventDefault();
        setInstallPrompt(event as BeforeInstallPromptEvent);
      }
    }

    window.addEventListener("online", handleOnlineStatus);
    window.addEventListener("offline", handleOnlineStatus);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("online", handleOnlineStatus);
      window.removeEventListener("offline", handleOnlineStatus);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  async function bootstrap() {
    try {
      const setup = await apiRequest<{ isConfigured: boolean }>("/api/setup/status", {
        headers: {},
      });

      if (!setup.isConfigured) {
        setScreen("setup");
        return;
      }

      await loadAuthenticatedState();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to start the app.");
      setScreen("login");
    }
  }

  async function loadAuthenticatedState() {
    try {
      const [itemsResponse, settingsResponse] = await Promise.all([
        apiRequest<{ items: Item[] }>("/api/items?includeCompleted=1"),
        apiRequest<SchedulerSettings>("/api/settings"),
      ]);
      setItems(itemsResponse.items);
      setSettings(settingsResponse);
      setScreen("ready");
      setAuthError(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setScreen("login");
        return;
      }

      setAuthError(error instanceof Error ? error.message : "Unable to load scheduler data.");
      setScreen("login");
    }
  }

  async function handleAuth(mode: "setup" | "login") {
    setBusy(true);
    try {
      if (mode === "setup" && authPassword !== authConfirm) {
        throw new Error("Passwords do not match.");
      }

      await apiRequest<{ ok: boolean }>(mode === "setup" ? "/api/setup" : "/api/login", {
        method: "POST",
        body: JSON.stringify({ password: authPassword }),
      });

      setAuthPassword("");
      setAuthConfirm("");
      await loadAuthenticatedState();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function createItem(parsed: ParsedQuickAdd) {
    const tempId = `temp-${crypto.randomUUID()}`;
    const now = Math.floor(Date.now() / 1000);
    const optimisticItem: Item = {
      id: tempId,
      title: parsed.title,
      notes: parsed.notes,
      priority: parsed.priority,
      startsAt: parsed.startsAt,
      endsAt: parsed.endsAt,
      isAllDay: parsed.isAllDay,
      rrule: parsed.rrule,
      exceptions: [],
      completed: false,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    setItems((current) => [optimisticItem, ...current]);

    try {
      const response = await apiRequest<{ item: Item }>("/api/items", {
        method: "POST",
        body: JSON.stringify({ ...parsed, exceptions: [] }),
      });

      setItems((current) => current.map((item) => (item.id === tempId ? response.item : item)));
      setNotice("Item added.");
    } catch (error) {
      setItems((current) => current.filter((item) => item.id !== tempId));
      throw error;
    }
  }

  async function updateItem(itemId: string, updates: Partial<Item>) {
    const response = await apiRequest<{ item: Item }>(`/api/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });

    setItems((current) => current.map((item) => (item.id === itemId ? response.item : item)));
    setNotice("Item updated.");
  }

  async function deleteItem(itemId: string) {
    await apiRequest<void>(`/api/items/${itemId}`, {
      method: "DELETE",
    });
    setItems((current) => current.filter((item) => item.id !== itemId));
    setSelectedItemId(null);
    setNotice("Item deleted.");
  }

  async function toggleComplete(item: Item, completed: boolean) {
    const response = await apiRequest<{ item: Item }>(`/api/items/${item.id}/toggle-complete`, {
      method: "POST",
      body: JSON.stringify({ completed }),
    });
    setItems((current) => current.map((entry) => (entry.id === item.id ? response.item : entry)));
  }

  async function skipNextOccurrence(itemId: string) {
    const response = await apiRequest<{ item: Item }>(`/api/items/${itemId}/skip-next`, {
      method: "POST",
      body: JSON.stringify({ afterTs: Math.floor(Date.now() / 1000) }),
    });
    setItems((current) => current.map((item) => (item.id === itemId ? response.item : item)));
    setNotice("Next occurrence skipped.");
  }

  async function regenerateIcsKey() {
    const nextSettings = await apiRequest<Pick<SchedulerSettings, "apiKey" | "exportUrl">>("/api/settings/ics-key/regenerate", {
      method: "POST",
    });

    setSettings((current) =>
      current
        ? {
            ...current,
            apiKey: nextSettings.apiKey,
            exportUrl: nextSettings.exportUrl,
          }
        : null,
    );
    setNotice("ICS key regenerated.");
  }

  async function logout() {
    await apiRequest<{ ok: boolean }>("/api/logout", { method: "POST" });
    setScreen("login");
    setItems([]);
    setSelectedItemId(null);
  }

  async function triggerInstall() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  if (screen === "loading") {
    return <div className="splash">Loading scheduler...</div>;
  }

  if (screen === "setup" || screen === "login") {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <span className="eyebrow">Personal Scheduler</span>
          <h1>{screen === "setup" ? "First run setup" : "Welcome back"}</h1>
          <p>{screen === "setup" ? "Set the password that will protect the app on this device." : "Enter your password to unlock the scheduler."}</p>
          <label>
            Password
            <input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} />
          </label>
          {screen === "setup" ? (
            <label>
              Confirm password
              <input type="password" value={authConfirm} onChange={(event) => setAuthConfirm(event.target.value)} />
            </label>
          ) : null}
          {authError ? <p className="inline-message inline-message--error">{authError}</p> : null}
          <button type="button" className="button" onClick={() => void handleAuth(screen)} disabled={busy}>
            {busy ? "Working..." : screen === "setup" ? "Save password" : "Log in"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <span className="eyebrow">Personal Scheduler</span>
          <h1>Keep the schedule flat, fast, and local.</h1>
          <p>Quick-add is the primary path. Detail editing and calendar context stay nearby without taking over the screen.</p>
        </div>
        <div className="hero__actions">
          <button type="button" className={`button ${view === "list" ? "button--active" : "button--ghost"}`} onClick={() => setView("list")}>
            List
          </button>
          <button type="button" className={`button ${view === "calendar" ? "button--active" : "button--ghost"}`} onClick={() => setView("calendar")}>
            Calendar
          </button>
          <button type="button" className="button button--ghost" onClick={() => void logout()}>
            Log out
          </button>
        </div>
      </header>

      <QuickAdd onCreate={createItem} />

      {isOffline ? <div className="inline-message">You are offline. The app shell stays available, but live API data needs a connection.</div> : null}
      {notice ? (
        <div className="inline-message">
          <span>{notice}</span>
          <button type="button" className="button button--ghost" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      <section className="control-strip">
        <div className="settings-card">
          <span className="eyebrow">Settings</span>
          <h2>Export and install</h2>
          <p>Subscribe from another calendar with the private ICS URL, or install the app to your home screen.</p>
          <label>
            ICS feed URL
            <input readOnly value={settings?.exportUrl ?? ""} />
          </label>
          <div className="settings-card__actions">
            <button type="button" className="button button--ghost" onClick={() => void regenerateIcsKey()}>
              Regenerate key
            </button>
            {installPrompt ? (
              <button type="button" className="button" onClick={() => void triggerInstall()}>
                Install PWA
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <div className="content-grid">
        {view === "list" ? (
          <ListView
            items={items}
            showCompleted={showCompleted}
            activeDay={activeDay}
            onToggleShowCompleted={() => setShowCompleted((current) => !current)}
            onClearDayFilter={() => setActiveDay(null)}
            onSelectItem={setSelectedItemId}
            onToggleComplete={(item, completed) => void toggleComplete(item, completed)}
          />
        ) : (
          <CalendarView
            items={items}
            month={monthCursor}
            activeDay={activeDay}
            onPrevMonth={() => setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
            onNextMonth={() => setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
            onToday={() => setMonthCursor(initialMonthCursor())}
            onSelectDay={(dayKey) => {
              setActiveDay(dayKey);
              setView("list");
            }}
          />
        )}

        <DetailPanel
          item={selectedItem}
          onClose={() => setSelectedItemId(null)}
          onSave={updateItem}
          onDelete={deleteItem}
          onToggleComplete={(item, completed) => toggleComplete(item, completed)}
          onSkipNext={skipNextOccurrence}
        />
      </div>
    </main>
  );
}
