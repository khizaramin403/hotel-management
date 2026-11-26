"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "antd";

export interface RoomDescriptionProps {
  description: string;
}

const FALLBACK_CHAR_LIMIT = 360;
const COLLAPSED_MAX_LINES = 6;

export function RoomDescription({ description }: RoomDescriptionProps) {
  const paragraphRef = useRef<HTMLParagraphElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  const estimatedOverflow =
    description.split(/\r?\n/).length > COLLAPSED_MAX_LINES ||
    description.length > FALLBACK_CHAR_LIMIT;

  useLayoutEffect(() => {
    const element = paragraphRef.current;
    if (!element || expanded) {
      return;
    }

    const measure = () => {
      if (element.clientHeight > 0) {
        setHasOverflow(element.scrollHeight > element.clientHeight + 1);
      } else {
        setHasOverflow(estimatedOverflow);
      }
    };

    measure();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(measure);
      observer.observe(element);
      return () => observer.disconnect();
    }

    return undefined;
  }, [description, estimatedOverflow, expanded]);

  const showToggle = expanded || hasOverflow || estimatedOverflow;

  return (
    <div>
      <p
        ref={paragraphRef}
        className={`m-0 max-w-[65ch] font-sans text-[16px] font-normal leading-[26px] text-ink ${
          expanded ? "" : "line-clamp-6"
        }`.trim()}
      >
        {description}
      </p>

      {showToggle ? (
        <Button
          type="text"
          size="small"
          aria-expanded={expanded}
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-2 min-h-[44px] !min-w-0 !px-2 lg:min-h-0"
        >
          {expanded ? "Show less" : "Read more"}
        </Button>
      ) : null}
    </div>
  );
}
