import type { ComponentProps } from "react";
import { useRouter } from "next/navigation";

import SoundEventAnnotationListBase from "@/lib/components/sound_event_annotations/SoundEventAnnotationList";

import type { ClipAnnotation, SoundEventAnnotation } from "@/lib/types";

export default function SoundEventAnnotationList({
  clipAnnotation,
  selectedAnnotation,
  onSelectAnnotation,
  ...props
}: {
  /** The clip annotation containing sound event annotations */
  clipAnnotation: ClipAnnotation;
  /** Currently selected annotation */
  selectedAnnotation?: SoundEventAnnotation | null;
  /** Callback when an annotation is selected */
  onSelectAnnotation?: (annotation: SoundEventAnnotation) => void;
} & Omit<ComponentProps<typeof SoundEventAnnotationListBase>, "soundEventAnnotations" | "selectedAnnotation" | "onSelectAnnotation">) {
  const router = useRouter();

  const handleSelectAnnotation = (annotation: SoundEventAnnotation) => {
    // Call the original callback if provided
    onSelectAnnotation?.(annotation);
    
    // Only navigate if this is not already the selected annotation
    if (selectedAnnotation?.uuid !== annotation.uuid) {
      router.push(`/sound_event_annotations?uuid=${annotation.uuid}`);
    }
  };

  return (
    <SoundEventAnnotationListBase
      soundEventAnnotations={clipAnnotation.sound_events || []}
      selectedAnnotation={selectedAnnotation}
      onSelectAnnotation={handleSelectAnnotation}
      {...props}
    />
  );
}