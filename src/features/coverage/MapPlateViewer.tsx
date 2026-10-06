import { formatYearRange } from "../../domain/chronology";
import { useEffect, useRef, useState } from "react";
import type { MapPlate } from "../../data/manifest";

export function MapPlateViewer({
  plate,
  onClose,
}: {
  plate: MapPlate;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1),
    [failed, setFailed] = useState(false),
    [fitWidth, setFitWidth] = useState(0);
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    const observer = new ResizeObserver(([entry]) => {
      setFitWidth(
        Math.min(
          entry.contentRect.width,
          (entry.contentRect.height * plate.width) / plate.height,
        ),
      );
    });
    if (viewport.current) observer.observe(viewport.current);
    return () => {
      observer.disconnect();
      el?.close();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="plate-viewer"
      aria-labelledby="plate-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <div>
          <span className="eyebrow">来源参考图幅</span>
          <h2 id="plate-title">
            {formatYearRange(plate.year, plate.endYear ?? plate.year)} ·{" "}
            {plate.title}
          </h2>
        </div>
        <button aria-label="关闭参考图幅" onClick={onClose}>
          ×
        </button>
      </header>
      <p className="plate-limits">{plate.limitations}</p>
      <div className="plate-tools" role="group" aria-label="图幅缩放">
        <button
          onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
          disabled={zoom === 1}
        >
          缩小图幅
        </button>
        <output aria-label="图幅比例">{Math.round(zoom * 100)}%</output>
        <button
          onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
          disabled={zoom === 4}
        >
          放大图幅
        </button>
        <button onClick={() => setZoom(1)}>适合窗口</button>
      </div>
      <div
        ref={viewport}
        className="plate-image-scroll"
        tabIndex={0}
        aria-label="滚动查看参考图幅"
      >
        {failed ? (
          <p role="alert">图幅加载失败，请关闭后重试，或查看来源页。</p>
        ) : (
          <img
            src={`/data/${plate.image.path}`}
            alt={`${formatYearRange(plate.year, plate.endYear ?? plate.year)}${plate.title}`}
            style={{
              width: fitWidth ? `${fitWidth * zoom}px` : "100%",
              marginInline: "auto",
            }}
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <footer>
        <p>
          {plate.creator} · {plate.edition}
        </p>
        <p>
          <a href={plate.sourceUrl} target="_blank" rel="noreferrer">
            原图与来源说明
          </a>{" "}
          ·{" "}
          <a
            href={
              plate.license === "CC0 1.0"
                ? "https://creativecommons.org/publicdomain/zero/1.0/"
                : plate.license === "CC BY 3.0"
                  ? "https://creativecommons.org/licenses/by/3.0/"
                  : plate.license === "CC BY-SA 3.0 CZ"
                    ? "https://creativecommons.org/licenses/by-sa/3.0/cz/"
                    : `https://creativecommons.org/licenses/by-sa/${plate.license.endsWith("4.0") ? "4.0" : "3.0"}/`
            }
            target="_blank"
            rel="noreferrer"
          >
            {plate.license}
          </a>{" "}
          · 按原图展示，未将图中边线转换为地理疆界。
        </p>
      </footer>
    </dialog>
  );
}
