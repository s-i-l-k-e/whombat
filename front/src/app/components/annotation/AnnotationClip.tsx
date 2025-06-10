import { useEffect, useState, useMemo, useRef } from "react";

import Player from "@/app/components/audio/Player";
import SelectedSoundEventAnnotation from "@/app/components/sound_event_annotations/SelectedSoundEventAnnotation";
import ClipAnnotationCanvas from "@/app/components/spectrograms/ClipAnnotationCanvas";
import SettingsMenu from "@/app/components/spectrograms/SettingsMenu";
import ViewportBar from "@/app/components/spectrograms/ViewportBar";
import ViewportToolbar from "@/app/components/spectrograms/ViewportToolbar";

import useClipAnnotation from "@/app/hooks/api/useClipAnnotation";
import useAnnotationHotkeys from "@/app/hooks/hotkeys/useAnnotationHotkeys";
import useAudioSettings from "@/app/hooks/settings/useAudioSettings";
import useSpectrogramSettings from "@/app/hooks/settings/useSpectrogramSettings";

import AnnotationControls from "@/lib/components/annotation/AnnotationControls";
import ClipAnnotationSpectrogramBase from "@/lib/components/clip_annotations/ClipAnnotationSpectrogram";
import Empty from "@/lib/components/ui/Empty";

import useAnnotationState from "@/lib/hooks/annotation/useAnnotationState";
import useAnnotationTagPallete from "@/lib/hooks/annotation/useAnnotationTagPalette";
import useSpectrogramAudio from "@/lib/hooks/spectrogram/useSpectrogramAudio";
import useSpectrogramState from "@/lib/hooks/spectrogram/useSpectrogramState";
import useClipViewport from "@/lib/hooks/window/useClipViewport";

import { getGeometryViewingWindow } from "@/lib/utils/windows";

import type { ClipAnnotation, SoundEventAnnotation } from "@/lib/types";

export default function ClipAnnotationSpectrogram({
  clipAnnotation,
  spectrogramSettings,
  audioSettings,
  tagPalette,
  height,
  initialSoundEventAnnotationUUID,
  selectedSoundEventAnnotation,
  onSelectedSoundEventAnnotationChange,
}: {
  clipAnnotation: ClipAnnotation;
  spectrogramSettings: ReturnType<typeof useSpectrogramSettings>;
  audioSettings: ReturnType<typeof useAudioSettings>;
  tagPalette: ReturnType<typeof useAnnotationTagPallete>;
  height?: number;
  initialSoundEventAnnotationUUID?: string | null;
  selectedSoundEventAnnotation?: SoundEventAnnotation | null;
  onSelectedSoundEventAnnotationChange?: (annotation: SoundEventAnnotation | null) => void;
}) {
  const { data = clipAnnotation } = useClipAnnotation({
    uuid: clipAnnotation.uuid,
    clipAnnotation,
  });

  const spectrogramState = useSpectrogramState();

  const annotationState = useAnnotationState({ 
    spectrogramState,
    soundEventAnnotation: selectedSoundEventAnnotation,
    onSelectAnnotation: onSelectedSoundEventAnnotationChange,
  });

  const viewport = useClipViewport({
    clip: data.clip,
    spectrogramSettings: spectrogramSettings.settings,
  });

  // Track if we've already processed the initial UUID to prevent infinite loops
  const processedInitialUUID = useRef<string | null>(null);

  // Bounding box mode state
  const [boundingBoxMode, setBoundingBoxMode] = useState(false);

  // Calculate bounding box time range from selected annotation
  const boundingBoxTimeRange = useMemo(() => {
    if (!boundingBoxMode || !annotationState.selectedAnnotation) {
      return null;
    }
    
    const geometry = annotationState.selectedAnnotation.sound_event.geometry;
    
    // Extract time range from geometry
    if (geometry.type === "TimeStamp") {
      // For timestamps, use a small buffer around the time
      const time = geometry.coordinates;
      const buffer = 0.1; // 100ms buffer
      return {
        startTime: Math.max(0, time - buffer),
        endTime: time + buffer,
      };
    } else if (geometry.type === "TimeInterval") {
      // For intervals, use the exact time range
      const [startTime, endTime] = geometry.coordinates;
      return { startTime, endTime };
    } else if (geometry.type === "BoundingBox") {
      // For bounding boxes, use the time dimensions
      const { coordinates } = geometry;
      const [startTime, , endTime] = coordinates;
      return { startTime, endTime };
    }
    
    return null;
  }, [boundingBoxMode, annotationState.selectedAnnotation]);

  const audio = useSpectrogramAudio({
    viewport,
    recording: data.clip.recording,
    audioSettings: audioSettings.settings,
    customTimeRange: boundingBoxTimeRange,
  });

  useAnnotationHotkeys({
    annotationState,
    audio,
    viewport,
    spectrogramState,
  });

  // Handle initial sound event annotation selection from URL (only once)
  useEffect(() => {

    if (
      initialSoundEventAnnotationUUID && 
      data.sound_events && 
      data.clip?.recording &&
      processedInitialUUID.current !== initialSoundEventAnnotationUUID
    ) {
      
      const targetAnnotation = data.sound_events.find(
        (annotation) => annotation.uuid === initialSoundEventAnnotationUUID
      );
      
      
      if (targetAnnotation) {
        annotationState.setSelectedAnnotation(targetAnnotation);
        
        // Move viewport to show the selected annotation
        const geometryWindow = getGeometryViewingWindow({
          geometry: targetAnnotation.sound_event.geometry,
          recording: data.clip.recording,
          timeBuffer: 10, // Add 10 seconds context around the annotation
          freqBuffer: null, // Use full frequency range (zoom all the way out)
        });
        
        
        viewport.set(geometryWindow);
        
        // Check if viewport actually changed
        setTimeout(() => {
          
          // Try setting again with a delay
          viewport.set(geometryWindow);
          
          setTimeout(() => {
          }, 50);
        }, 10);
        
        // Mark this UUID as processed
        processedInitialUUID.current = initialSoundEventAnnotationUUID;
      } else {
      }
    }
  }, [
    initialSoundEventAnnotationUUID,
    data.sound_events,
    data.clip?.recording,
  ]);


  // Disable bounding box mode when no annotation is selected
  useEffect(() => {
    if (!annotationState.selectedAnnotation && boundingBoxMode) {
      setBoundingBoxMode(false);
    }
  }, [annotationState.selectedAnnotation, boundingBoxMode]);

  return (
    <ClipAnnotationSpectrogramBase
      ViewportToolbar={
        <ViewportToolbar state={spectrogramState} viewport={viewport} />
      }
      Player={
        <Player
          audio={audio}
          samplerate={data.clip.recording.samplerate}
          boundingBoxMode={boundingBoxMode}
          onChangeSpeed={(speed) =>
            audioSettings.dispatch({ type: "setSpeed", speed })
          }
          onToggleBoundingBoxMode={() => setBoundingBoxMode(!boundingBoxMode)}
        />
      }
      SettingsMenu={
        <SettingsMenu
          samplerate={data.clip.recording.samplerate}
          audioSettings={audioSettings}
          spectrogramSettings={spectrogramSettings}
        />
      }
      ViewportBar={<ViewportBar viewport={viewport} />}
      AnnotationControls={
        <AnnotationControls
          mode={annotationState.mode}
          geometryType={annotationState.geometryType}
          onDraw={annotationState.enableDrawing}
          onDelete={annotationState.enableDeleting}
          onSelect={annotationState.enableSelecting}
          onSelectGeometryType={annotationState.setGeometryType}
        />
      }
      Canvas={
        <ClipAnnotationCanvas
          height={height}
          clipAnnotation={data}
          audioSettings={audioSettings.settings}
          spectrogramSettings={spectrogramSettings.settings}
          spectrogramState={spectrogramState}
          annotationState={annotationState}
          recording={data.clip.recording}
          audio={audio}
          viewport={viewport}
          defaultTags={tagPalette.tags}
        />
      }
      SelectedSoundEvent={
        annotationState.selectedAnnotation != null ? (
          <SelectedSoundEventAnnotation
            soundEventAnnotation={annotationState.selectedAnnotation}
          />
        ) : (
          <Empty>
            No annotation selected, click on an annotation to view details
          </Empty>
        )
      }
    />
  );
}
