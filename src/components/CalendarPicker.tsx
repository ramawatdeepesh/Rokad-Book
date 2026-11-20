import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getLocalDateString } from '../utils/formatters';

interface CalendarPickerProps {
  isOpen: boolean;
  selectedDate: string;
  activeDates: Set<string>;
  onSelectDate: (date: string) => void;
  onClose: () => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function parseYMD(dateStr: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const now = new Date();
  return {
    year: y || now.getFullYear(),
    month: (m || now.getMonth() + 1) - 1,
    day: d || now.getDate(),
  };
}

function toYMD(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export const CalendarPicker: React.FC<CalendarPickerProps> = ({
  isOpen,
  selectedDate,
  activeDates,
  onSelectDate,
  onClose,
}) => {
  const todayStr = getLocalDateString(0);
  const yesterdayStr = getLocalDateString(-1);
  const todayParsed = parseYMD(todayStr);

  const parsed = parseYMD(selectedDate > todayStr ? todayStr : selectedDate);
  const [viewYear, setViewYear] = useState(parsed.year);
  const [viewMonth, setViewMonth] = useState(parsed.month);

  useEffect(() => {
    if (!isOpen) return;
    const p = parseYMD(selectedDate > todayStr ? todayStr : selectedDate);
    setViewYear(p.year);
    setViewMonth(p.month);
  }, [isOpen, selectedDate, todayStr]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const yearOptions = useMemo(() => {
    const start = Math.min(todayParsed.year - 10, viewYear - 2);
    const end = todayParsed.year;
    const list: number[] = [];
    for (let y = start; y <= end; y++) list.push(y);
    return list;
  }, [todayParsed.year, viewYear]);

  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  if (!isOpen) return null;

  const isAtCurrentOrFutureMonth =
    viewYear > todayParsed.year ||
    (viewYear === todayParsed.year && viewMonth >= todayParsed.month);

  const stepMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    const nextY = next.getFullYear();
    const nextM = next.getMonth();
    if (
      nextY > todayParsed.year ||
      (nextY === todayParsed.year && nextM > todayParsed.month)
    ) {
      return;
    }
    setViewYear(nextY);
    setViewMonth(nextM);
  };

  const handleYearChange = (nextYear: number) => {
    setViewYear(nextYear);
    if (nextYear === todayParsed.year && viewMonth > todayParsed.month) {
      setViewMonth(todayParsed.month);
    }
  };

  const handlePick = (dateStr: string) => {
    if (dateStr > todayStr) return;
    onSelectDate(dateStr);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#141B2D]/45 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Select ledger date"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet-elevated w-full max-w-[390px] overflow-hidden rounded-t-[22px] sm:rounded-[18px]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E6EE] px-5 py-3.5">
          <h3 className="text-[17px] font-semibold text-[#141B2D]">
            Select Date
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close calendar"
            className="flex h-10 w-10 items-center justify-center rounded-[12px] text-[#637083] hover:bg-[#F2F4F8] hover:text-[#141B2D]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {/* Month / Year Navigation Controls */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => stepMonth(-1)}
              aria-label="Previous month"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#E2E6EE] text-[#141B2D] hover:border-[#3B5BDB] hover:text-[#3B5BDB]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex flex-1 items-center justify-center gap-2">
              <select
                aria-label="Select month"
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="h-10 rounded-[10px] border border-[#E2E6EE] bg-white px-2.5 text-sm font-semibold text-[#141B2D] outline-none focus:border-[#3B5BDB]"
              >
                {MONTHS.map((m, idx) => {
                  const isFutureMonth =
                    viewYear === todayParsed.year && idx > todayParsed.month;
                  return (
                    <option key={m} value={idx} disabled={isFutureMonth}>
                      {m}
                    </option>
                  );
                })}
              </select>

              <select
                aria-label="Select year"
                value={viewYear}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                className="tnum h-10 rounded-[10px] border border-[#E2E6EE] bg-white px-2.5 text-sm font-semibold text-[#141B2D] outline-none focus:border-[#3B5BDB]"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => stepMonth(1)}
              disabled={isAtCurrentOrFutureMonth}
              aria-label="Next month"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#E2E6EE] text-[#141B2D] hover:border-[#3B5BDB] hover:text-[#3B5BDB] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="mt-4 grid grid-cols-7 text-center">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="py-1 text-[11px] font-semibold text-[#637083]"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day Grid */}
          <div className="mt-1 grid grid-cols-7 gap-1">
            {calendarCells.map((dayNum, index) => {
              if (dayNum === null) {
                return <div key={`empty-${index}`} className="h-11" />;
              }
              const cellDate = toYMD(viewYear, viewMonth, dayNum);
              const isFuture = cellDate > todayStr;
              const isSelected = cellDate === selectedDate;
              const isToday = cellDate === todayStr;
              const hasEntries = activeDates.has(cellDate);

              return (
                <button
                  key={cellDate}
                  type="button"
                  disabled={isFuture}
                  onClick={() => handlePick(cellDate)}
                  className={`tnum relative flex h-11 flex-col items-center justify-center rounded-[10px] text-sm font-semibold transition-colors ${
                    isFuture
                      ? 'cursor-not-allowed text-[#94A3B8] opacity-40'
                      : isSelected
                        ? 'bg-[#3B5BDB] text-white'
                        : isToday
                          ? 'border border-[#3B5BDB] bg-[#EEF2FF] text-[#3B5BDB]'
                          : 'text-[#141B2D] hover:bg-[#F2F4F8]'
                  }`}
                >
                  <span>{dayNum}</span>
                  {hasEntries && !isFuture && (
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 h-1 w-1 rounded-full ${
                        isSelected ? 'bg-white' : 'bg-[#0C9B6A]'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend & Quick Jump Buttons */}
          <div className="mt-4 flex items-center justify-between border-t border-[#E2E6EE] pt-3.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePick(todayStr)}
                className="min-h-[40px] rounded-[10px] border border-[#E2E6EE] bg-white px-3 text-xs font-semibold text-[#3B5BDB] hover:bg-[#EEF2FF]"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handlePick(yesterdayStr)}
                className="min-h-[40px] rounded-[10px] border border-[#E2E6EE] bg-white px-3 text-xs font-semibold text-[#637083] hover:text-[#141B2D]"
              >
                Yesterday
              </button>
            </div>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#637083]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#0C9B6A]" />
              Has entries
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
