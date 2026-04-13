import { useCallback, useEffect, useRef, useState } from 'react';
import type { Howl } from 'howler';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { audioService } from '@/services/audio.service';

interface AudioMessagePlayerProps {
  src: string;
  className?: string;
  autoPlay?: boolean;
}

const POSITION_UPDATE_INTERVAL_MS = 250;

function formatAudioTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return '0:00';
  }

  const roundedSeconds = Math.floor(totalSeconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function AudioMessagePlayer({ src, className, autoPlay = false }: AudioMessagePlayerProps) {
  const { t } = useTranslation();
  const playerRef = useRef<Howl | null>(null);
  const positionTimerRef = useRef<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [positionSeconds, setPositionSeconds] = useState(0);

  const stopPositionTimer = useCallback(() => {
    if (positionTimerRef.current !== null) {
      window.clearInterval(positionTimerRef.current);
      positionTimerRef.current = null;
    }
  }, []);

  const syncPosition = useCallback(() => {
    const player = playerRef.current;
    if (!player) {
      return;
    }

    const seekValue = player.seek();
    if (typeof seekValue === 'number') {
      setPositionSeconds(seekValue);
    }
  }, []);

  useEffect(() => {
    stopPositionTimer();

    const player = audioService.createAudioPlayer(src, {
      onLoad: () => {
        setIsReady(true);
        setDurationSeconds(player.duration());

        if (autoPlay) {
          audioService.stopAllPlayback();
          player.play();
        }
      },
      onPlay: () => {
        setIsPlaying(true);
        syncPosition();
        stopPositionTimer();
        positionTimerRef.current = window.setInterval(syncPosition, POSITION_UPDATE_INTERVAL_MS);
      },
      onPause: () => {
        setIsPlaying(false);
        syncPosition();
        stopPositionTimer();
      },
      onStop: () => {
        setIsPlaying(false);
        setPositionSeconds(0);
        stopPositionTimer();
      },
      onEnd: () => {
        setIsPlaying(false);
        setPositionSeconds(player.duration());
        stopPositionTimer();
      },
      onSeek: () => {
        syncPosition();
      },
      onLoadError: () => {
        setIsReady(false);
        setIsPlaying(false);
        stopPositionTimer();
      },
      onPlayError: () => {
        setIsPlaying(false);
        stopPositionTimer();
      },
    });

    playerRef.current = player;

    return () => {
      stopPositionTimer();
      player.unload();
      playerRef.current = null;
    };
  }, [autoPlay, src, stopPositionTimer, syncPosition]);

  const togglePlayback = () => {
    const player = playerRef.current;
    if (!player) {
      return;
    }

    if (player.playing()) {
      player.pause();
      return;
    }

    audioService.stopAllPlayback();
    player.play();
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const player = playerRef.current;
    if (!player) {
      return;
    }

    const nextPositionSeconds = Number(event.target.value);
    player.seek(nextPositionSeconds);
    setPositionSeconds(nextPositionSeconds);
  };

  const resolvedDurationSeconds = Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 0;
  const resolvedPositionSeconds = Math.min(positionSeconds, resolvedDurationSeconds);
  const playbackTitle = isPlaying ? t('chat.pauseAudio') : t('chat.playAudio');

  return (
    <div className={`rounded-xl border border-dn-border/30 bg-dn-surface-low/40 px-3 py-2 ${className ?? ''}`}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlayback}
          disabled={!isReady}
          className="h-9 w-9 shrink-0 rounded-full bg-dn-primary/15 text-dn-primary hover:bg-dn-primary/25 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          aria-label={playbackTitle}
          title={playbackTitle}
        >
          <Icon name={isPlaying ? 'pause' : 'play_arrow'} className="text-[20px]" />
        </button>

        <div className="min-w-0 flex-1 flex flex-col items-center justify-center">
          <input
            type="range"
            min={0}
            max={resolvedDurationSeconds || 1}
            step={0.1}
            value={resolvedPositionSeconds}
            onChange={handleSeek}
            disabled={!isReady || resolvedDurationSeconds <= 0}
            className="block w-full mx-auto accent-dn-primary disabled:opacity-40"
            aria-label={t('chat.reviewRecording')}
          />
          <p className="w-full text-[11px] text-dn-text-muted text-center mt-1 tabular-nums">
            {t('chat.audioTimeline', {
              current: formatAudioTime(resolvedPositionSeconds),
              total: formatAudioTime(resolvedDurationSeconds),
            })}
          </p>
        </div>
      </div>
    </div>
  );
}