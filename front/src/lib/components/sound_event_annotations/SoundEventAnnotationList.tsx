import { type ComponentProps } from "react";

import { BoundingBoxIcon, TagIcon, UserIcon } from "@/lib/components/icons";
import Card from "@/lib/components/ui/Card";

import type { SoundEventAnnotation } from "@/lib/types";

export default function SoundEventAnnotationList({
  soundEventAnnotations = [],
  selectedAnnotation,
  onSelectAnnotation,
  ...props
}: {
  /** List of sound event annotations to display */
  soundEventAnnotations?: SoundEventAnnotation[];
  /** Currently selected annotation */
  selectedAnnotation?: SoundEventAnnotation | null;
  /** Callback when an annotation is selected */
  onSelectAnnotation?: (annotation: SoundEventAnnotation) => void;
} & ComponentProps<typeof Card>) {
  if (soundEventAnnotations.length === 0) {
    return (
      <Card {...props}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <BoundingBoxIcon className="w-5 h-5 text-stone-500" />
            <span className="text-sm font-medium text-stone-500">
              Annotations
            </span>
          </div>
          <p className="text-sm text-stone-400 dark:text-stone-600">
            No annotations
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card {...props}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <BoundingBoxIcon className="w-5 h-5 text-stone-500" />
          <span className="text-center text-md font-semibold leading-6 text-stone-800 dark:text-stone-300">
            Annotations ({soundEventAnnotations.length})
          </span>
        </div>
        <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
          {soundEventAnnotations.map((annotation) => {
            const isSelected = selectedAnnotation?.uuid === annotation.uuid;
            const primaryTag = annotation.tags?.[0];
            const tagTitle = primaryTag ? `${primaryTag.key}: ${primaryTag.value}` : "Untitled";
            const author = annotation.created_by?.username || "Unknown";

            return (
              <div
                key={annotation.uuid}
                onClick={() => onSelectAnnotation?.(annotation)}
                className={`
                  w-full text-left p-3 rounded cursor-pointer transition-colors border-2
                  ${isSelected 
                    ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800" 
                    : "border-transparent hover:bg-stone-100 dark:hover:bg-stone-800"
                  }
                `}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <TagIcon className="w-3 h-3 text-stone-400" />
                    <span className="text-xs font-medium text-stone-700 dark:text-stone-300 truncate">
                      {tagTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <UserIcon className="w-3 h-3 text-stone-400" />
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      {author}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-mono text-stone-400 dark:text-stone-500 truncate">
                      {annotation.uuid}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}