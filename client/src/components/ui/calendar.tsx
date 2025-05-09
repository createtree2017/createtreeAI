import * as React from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { DayPicker, CaptionProps } from "react-day-picker"
import { format, addYears, subYears, addMonths, subMonths } from "date-fns"
import { ko } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

// 커스텀 캡션 컴포넌트
function CustomCaption(props: CaptionProps & { onMonthChange: (date: Date) => void }) {
  const { displayMonth, onMonthChange } = props;

  // 현재 표시된 년도와 월
  const year = displayMonth.getFullYear();
  const month = displayMonth.getMonth();

  // 년도 선택 옵션 (현재 년도 기준 -80년 ~ +10년)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 91 }, (_, i) => currentYear - 80 + i);

  // 월 이름 배열
  const months = Array.from({ length: 12 }, (_, i) => {
    return format(new Date(2021, i, 1), "LLLL", { locale: ko });
  });

  // 년도 변경 핸들러
  const handleYearChange = (value: string) => {
    const newYear = parseInt(value);
    const newDate = new Date(newYear, month);
    onMonthChange(newDate);
  };

  // 월 변경 핸들러
  const handleMonthChange = (value: string) => {
    const newMonth = months.indexOf(value);
    const newDate = new Date(year, newMonth);
    onMonthChange(newDate);
  };

  // 이전/다음 년도 버튼 핸들러
  const handlePrevYear = () => {
    onMonthChange(subYears(displayMonth, 1));
  };
  
  const handleNextYear = () => {
    onMonthChange(addYears(displayMonth, 1));
  };

  // 이전/다음 월 버튼 핸들러
  const handlePrevMonth = () => {
    onMonthChange(subMonths(displayMonth, 1));
  };
  
  const handleNextMonth = () => {
    onMonthChange(addMonths(displayMonth, 1));
  };

  return (
    <div className="flex justify-center items-center gap-1 py-2">
      <div className="flex items-center gap-1">
        <button
          onClick={handlePrevYear}
          aria-label="이전 년도"
          className={cn(
            buttonVariants({ variant: "outline", size: "icon" }),
            "h-6 w-6 p-0"
          )}
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        
        <button
          onClick={handlePrevMonth}
          aria-label="이전 월"
          className={cn(
            buttonVariants({ variant: "outline", size: "icon" }),
            "h-6 w-6 p-0"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-1">
        <Select
          value={year.toString()}
          onValueChange={handleYearChange}
        >
          <SelectTrigger className="h-8 w-[80px]">
            <SelectValue placeholder={year.toString()} />
          </SelectTrigger>
          <SelectContent className="max-h-[200px]">
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}년
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={months[month]}
          onValueChange={handleMonthChange}
        >
          <SelectTrigger className="h-8 w-[80px]">
            <SelectValue placeholder={months[month]} />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={handleNextMonth}
          aria-label="다음 월"
          className={cn(
            buttonVariants({ variant: "outline", size: "icon" }),
            "h-6 w-6 p-0"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        
        <button
          onClick={handleNextYear}
          aria-label="다음 년도"
          className={cn(
            buttonVariants({ variant: "outline", size: "icon" }),
            "h-6 w-6 p-0"
          )}
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  // 월 변경 핸들러 함수 추가
  const handleMonthChange = (date: Date) => {
    if (props.onMonthChange) {
      props.onMonthChange(date);
    }
  };

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside: "text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Caption: (captionProps) => (
          <CustomCaption
            {...captionProps}
            onMonthChange={handleMonthChange}
          />
        ),
      }}
      locale={ko}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }