import { useMemo } from "react";

import PlayerBase from "@/lib/components/audio/Player";

import { getSpeedOptions } from "@/lib/hooks/settings/useAudioSettings";

import type { AudioController } from "@/lib/types";

export default function Player({
  audio,
  samplerate,
  boundingBoxMode,
  onChangeSpeed,
  onToggleBoundingBoxMode,
}: {
  audio: AudioController;
  samplerate: number;
  boundingBoxMode?: boolean;
  onChangeSpeed?: (speed: number) => void;
  onToggleBoundingBoxMode?: () => void;
}) {
  const speedOptions = useMemo(() => {
    return getSpeedOptions(samplerate);
  }, [samplerate]);

  return (
    <PlayerBase
      currentTime={audio.currentTime}
      startTime={audio.startTime}
      endTime={audio.endTime}
      isPlaying={audio.isPlaying}
      loop={audio.loop}
      speed={audio.speed}
      boundingBoxMode={boundingBoxMode}
      speedOptions={speedOptions}
      onPlay={audio.play}
      onPause={audio.pause}
      onSeek={audio.seek}
      onToggleLoop={audio.toggleLoop}
      onToggleBoundingBoxMode={onToggleBoundingBoxMode}
      onChangeSpeed={onChangeSpeed}
    />
  );
}
