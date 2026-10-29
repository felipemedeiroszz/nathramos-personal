"use client";
import { cn } from "@/lib/utils";
import {
  HTMLAttributes,
  createContext,
  useContext,
  useId,
  useState,
} from "react";
export interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
}
export interface TabsListProps extends HTMLAttributes<HTMLDivElement> {}
export interface TabsTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  value: string;
}
export interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
}
const TabsContext = createContext<
  | { activeTab: string; setActiveTab: (value: string) => void; id: string }
  | undefined
>(undefined);
export function Tabs({
  defaultValue,
  children,
  className,
  ...props
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue || "");
  const id = useId();
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, id }}>
      <div className={className} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}
export function TabsList({ className, onKeyDown, ...props }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-lg bg-surface-secondary p-1",
        className,
      )}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (
          e.defaultPrevented ||
          !["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)
        )
          return;
        const items = Array.from(
          e.currentTarget.querySelectorAll<HTMLButtonElement>(
            '[role="tab"]:not([disabled])',
          ),
        );
        if (!items.length) return;
        e.preventDefault();
        const index = items.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        const next =
          e.key === "Home"
            ? 0
            : e.key === "End"
              ? items.length - 1
              : (index + (e.key === "ArrowRight" ? 1 : -1) + items.length) %
                items.length;
        items[next].focus();
        items[next].click();
      }}
      {...props}
    />
  );
}
export function TabsTrigger({
  value,
  className,
  children,
  ...props
}: TabsTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");
  const selected = context.activeTab === value;
  return (
    <button
      type="button"
      role="tab"
      id={`${context.id}-tab-${value}`}
      aria-selected={selected}
      aria-controls={`${context.id}-panel-${value}`}
      tabIndex={selected ? 0 : -1}
      onClick={() => context.setActiveTab(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        selected
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-text-secondary hover:text-text",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
export function TabsContent({
  value,
  className,
  children,
  ...props
}: TabsContentProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within Tabs");
  if (value !== context.activeTab) return null;
  return (
    <div
      role="tabpanel"
      id={`${context.id}-panel-${value}`}
      aria-labelledby={`${context.id}-tab-${value}`}
      tabIndex={0}
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
