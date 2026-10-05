"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface CalendarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  selected?: Date;
  onSelect?: (date: Date) => void;
}

export function Calendar({ selected, onSelect, className, ...props }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(selected || new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDay = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const days = [];
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  return (
    <div className={cn("rounded-lg border border-border bg-surface p-4", className)} {...props}>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-surface-secondary rounded-lg transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="font-semibold text-text">
          {monthNames[month]} {year}
        </span>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-surface-secondary rounded-lg transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((day) => (
          <div key={day} className="text-center text-xs font-medium text-text-secondary py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => (
          <button
            key={index}
            onClick={() => date && onSelect?.(date)}
            disabled={!date}
            className={cn(
              "h-9 w-9 flex items-center justify-center rounded-lg text-sm transition-colors",
              !date && "pointer-events-none",
              date && isSameDay(date, selected || new Date())
                ? "bg-primary text-primary-foreground"
                : date && "hover:bg-surface-secondary text-text"
            )}
          >
            {date?.getDate()}
          </button>
        ))}
      </div>
    </div>
  );
}
