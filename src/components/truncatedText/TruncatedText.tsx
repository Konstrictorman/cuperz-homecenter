import { useEffect, useRef, useState } from 'react'
import Tooltip from '@mui/material/Tooltip'
import clsx from 'clsx'
import './TruncatedText.css'
import Typography from '@mui/material/Typography'

export interface TruncatedTextProps {
  /** Full text to render, truncate, and show in the tooltip. */
  text: string
  /** Number of lines before truncating. Default: 1 (single-line ellipsis). */
  lines?: number
  className?: string
}

const TruncatedText = ({ text, lines = 1, className }: TruncatedTextProps) => {
  const ref = useRef<HTMLSpanElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const measure = () => {
      const overflowing =
        lines === 1
          ? element.scrollWidth > element.clientWidth
          : element.scrollHeight > element.clientHeight
      setIsOverflowing(overflowing)
    }

    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(element)

    return () => observer.disconnect()
  }, [text, lines])

  return (
    <Tooltip
      title={text}
      disableHoverListener={!isOverflowing}
      disableFocusListener={!isOverflowing}
      disableTouchListener={!isOverflowing}
    >
      <Typography
        ref={ref}
        className={clsx(
          'truncated-text',
          lines === 1
            ? 'truncated-text--single-line'
            : 'truncated-text--multi-line',
          className,
        )}
        style={lines > 1 ? { WebkitLineClamp: lines } : undefined}
      >
        {text}
      </Typography>
    </Tooltip>
  )
}

export default TruncatedText
