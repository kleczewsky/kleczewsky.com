import { useEffect, useRef, useState } from "react";
import { PROFILE_PROJECTION as media } from "../content/profile-projection";
import { useLocale } from "../lib/locale";
import "./ProfileProjection.css";

export function ProfileProjection() {
  const { locale } = useLocale();
  const root = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [still, setStill] = useState(true);
  const [failed, setFailed] = useState(false);
  const pauseRequested = useRef(false);
  const syncPlayback = useRef<(() => void) | null>(null);
  const pl = locale === "pl";

  useEffect(() => {
    const video = videoRef.current;
    const host = root.current;
    if (!video || !host) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let disposed = false;
    let mediaFailed = false;
    let revision = 0;
    const shouldPlay = () =>
      visible && !document.hidden && !motion.matches && !pauseRequested.current && !mediaFailed;
    const sync = () => {
      const request = ++revision;
      if (disposed) return;
      if (!shouldPlay()) {
        video.pause();
        setPlaying(false);
        if (motion.matches || mediaFailed) setStill(true);
        return;
      }
      // Attach the source only when visible and motion is allowed.
      if (!video.getAttribute("src")) video.src = media.video;
      void video
        .play()
        .then(() => {
          if (disposed) return;
          if (!shouldPlay()) {
            video.pause();
            return;
          }
          if (request !== revision) return;
          setPlaying(true);
          setStill(false);
        })
        .catch(() => {
          if (disposed || request !== revision) return;
          setPlaying(false);
          setStill(true);
          pauseRequested.current = true;
          setPaused(true);
        });
    };
    syncPlayback.current = sync;
    const onError = () => {
      mediaFailed = true;
      setFailed(true);
      sync();
    };
    video.addEventListener("error", onError);
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = (entry?.intersectionRatio ?? 0) >= 0.05;
        sync();
      },
      { threshold: [0, 0.05] },
    );
    observer.observe(host);
    motion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      disposed = true;
      revision++;
      syncPlayback.current = null;
      observer.disconnect();
      motion.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      video.removeEventListener("error", onError);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, []);

  return (
    <div ref={root} className="profile-projection" data-playing={playing} data-still={still}>
      <div className="projection-figure" aria-hidden="true">
        <span className="projection-beam" />
        <video
          ref={videoRef}
          className="projection-media projection-video"
          width={media.width}
          height={media.height}
          poster={media.poster}
          muted
          playsInline
          loop
          preload="none"
          tabIndex={-1}
          disablePictureInPicture
        />
        <img
          className="projection-media projection-poster"
          src={media.poster}
          width={media.width}
          height={media.height}
          alt=""
          decoding="async"
        />
        <span className="projection-scan" />
      </div>
      <div className="projection-caption t-micro">
        <span>{media.standIn ? (pl ? "POSTAĆ ZASTĘPCZA" : "STAND-IN PREVIEW") : "EK / 01"}</span>
        <button
          type="button"
          disabled={failed}
          onClick={() => {
            pauseRequested.current = !paused;
            setPaused(!paused);
            syncPlayback.current?.();
          }}
          aria-pressed={paused}
          aria-label={
            paused
              ? pl
                ? "Wznów projekcję"
                : "Resume projection"
              : pl
                ? "Wstrzymaj projekcję"
                : "Pause projection"
          }
        >
          {paused ? "▶" : "Ⅱ"}
        </button>
      </div>
      <span className="projection-emitter" aria-hidden="true" />
    </div>
  );
}
