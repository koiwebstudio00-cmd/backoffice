import { Link } from 'react-router-dom'
import { calendarTypeStyles, type CalendarItem } from '@/lib/calendar'
import { cn } from '@/lib/utils'
import type { MeetingRecord } from '@/data/repository'

interface CalendarItemRowProps {
  item: CalendarItem
  onMeetingClick?: (meeting: MeetingRecord) => void
  onSelect?: (item: CalendarItem) => void
}

export function CalendarItemRow({ item, onMeetingClick, onSelect }: CalendarItemRowProps) {
  const content = (
    <>
      <span className={cn('mt-1 size-2 shrink-0 rounded-full', calendarTypeStyles[item.type].dot)} />
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium leading-4">{item.time ? `${item.time} · ` : ''}{item.title}</span>
        {item.meta && <span className="block truncate text-[10px] text-muted-foreground">{item.meta}</span>}
      </span>
    </>
  )
  const className = 'flex w-full items-start gap-1.5 rounded-md border border-border/60 bg-background p-1.5 text-left transition-colors hover:border-primary/40'

  if (onSelect) {
    return <button type="button" className={className} onClick={() => onSelect(item)}>{content}</button>
  }
  if (item.meeting && onMeetingClick) {
    const meeting = item.meeting
    return <button type="button" className={className} onClick={() => onMeetingClick(meeting)}>{content}</button>
  }
  if (item.to) {
    return <Link to={item.to} className={className}>{content}</Link>
  }
  return <div className={className}>{content}</div>
}
