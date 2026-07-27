/**
 * Wiederverwendbare UI-Komponente `square-image-field`.
 * Die Komponente kapselt klar abgegrenzte Darstellung und Interaktion, damit sie in mehreren Seiten oder Features einheitlich eingesetzt werden kann.
 */
"use client";

import NextImage from "next/image";
import { useEffect, useRef, useState } from "react";

type BaseProps = {
  label: string;
};

type SingleImageFieldProps = BaseProps & {
  mode: "single";
  value: string;
  onChange: (nextValue: string) => void;
  selectedLabel?: string;
};

type GalleryImageFieldProps = BaseProps & {
  mode: "gallery";
  values: string[];
  onChange: (nextValues: string[]) => void;
  maxItems: number;
};

type SquareImageFieldProps = SingleImageFieldProps | GalleryImageFieldProps;

type CropState = {
  source: string;
  name: string;
};

type CropSize = {
  width: number;
  height: number;
};

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Datei konnte nicht geladen werden."));
    image.src = source;
  });
}

async function cropToSquareDataUrl(
  source: string,
  cropSize: CropSize,
  zoom: number,
  offsetX: number,
  offsetY: number
): Promise<string> {
  const image = await loadImage(source);
  const canvas = document.createElement("canvas");
  canvas.width = cropSize.width;
  canvas.height = cropSize.height;

  const context = canvas.getContext("2d");
  if (!context) {
    return source;
  }

  const baseScale = Math.max(cropSize.width / image.width, cropSize.height / image.height);
  const scale = baseScale * zoom;
  const visibleSourceWidth = Math.min(image.width, cropSize.width / scale);
  const visibleSourceHeight = Math.min(image.height, cropSize.height / scale);
  const maxSourceX = Math.max(0, image.width - visibleSourceWidth);
  const maxSourceY = Math.max(0, image.height - visibleSourceHeight);
  const sourceX = Math.max(0, Math.min(maxSourceX, (image.width - visibleSourceWidth) / 2 - offsetX / scale));
  const sourceY = Math.max(0, Math.min(maxSourceY, (image.height - visibleSourceHeight) / 2 - offsetY / scale));

  context.drawImage(
    image,
    sourceX,
    sourceY,
    visibleSourceWidth,
    visibleSourceHeight,
    0,
    0,
    cropSize.width,
    cropSize.height
  );

  return canvas.toDataURL("image/jpeg", 0.9);
}

function CropModal({
  open,
  state,
  onCancel,
  onConfirm,
  title,
}: {
  open: boolean;
  state: CropState | null;
  title: string;
  onCancel: () => void;
  onConfirm: (croppedDataUrl: string) => void;
}) {
  const dragStateRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [cropBoxElement, setCropBoxElement] = useState<HTMLDivElement | null>(null);
  const [naturalSize, setNaturalSize] = useState<CropSize | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const cropSize = cropBoxElement?.clientWidth ?? 320;

  useEffect(() => {
    if (!open || !state) {
      return;
    }

    let active = true;

    void loadImage(state.source)
      .then((image) => {
        if (!active) {
          return;
        }

        setNaturalSize({ width: image.width, height: image.height });
      })
      .catch(() => {
        if (active) {
          setNaturalSize({ width: cropSize, height: cropSize });
        }
      });

    return () => {
      active = false;
    };
  }, [open, state, cropSize]);

  const baseScale = naturalSize ? Math.max(cropSize / naturalSize.width, cropSize / naturalSize.height) : 1;

  const displayWidth = naturalSize ? naturalSize.width * baseScale * zoom : cropSize;
  const displayHeight = naturalSize ? naturalSize.height * baseScale * zoom : cropSize;
  const maxOffsetX = Math.max(0, (displayWidth - cropSize) / 2);
  const maxOffsetY = Math.max(0, (displayHeight - cropSize) / 2);
  const safeOffsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, offset.x));
  const safeOffsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, offset.y));

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!naturalSize) {
      return;
    }

    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: safeOffsetX,
      originY: safeOffsetY,
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current || !naturalSize) {
      return;
    }

    const deltaX = event.clientX - dragStateRef.current.startX;
    const deltaY = event.clientY - dragStateRef.current.startY;

    setOffset({
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, dragStateRef.current.originX + deltaX)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, dragStateRef.current.originY + deltaY)),
    });
  };

  const handlePointerUp = () => {
    dragStateRef.current = null;
    setIsDragging(false);
  };

  const handleConfirm = async () => {
    if (!state || !naturalSize) {
      return;
    }

    setIsProcessing(true);
    try {
      const cropped = await cropToSquareDataUrl(
        state.source,
        { width: cropSize, height: cropSize },
        zoom,
        safeOffsetX,
        safeOffsetY
      );
      onConfirm(cropped);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!open || !state) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <div className="w-full max-w-[520px] rounded-[28px] bg-white p-5 shadow-2xl shadow-black/30">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-medium text-black">{title}</h3>
          <button type="button" onClick={onCancel} className="text-sm text-black/55 transition hover:text-black">
            Abbrechen
          </button>
        </div>

        <div
          ref={setCropBoxElement}
          className="relative mt-4 aspect-square w-full overflow-hidden rounded-[28px] bg-black"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {naturalSize ? (
            <img
              src={state.source}
              alt={state.name}
              draggable={false}
              className="pointer-events-none absolute select-none"
              style={{
                left: `calc(50% + ${safeOffsetX}px)`,
                top: `calc(50% + ${safeOffsetY}px)`,
                width: `${displayWidth}px`,
                height: `${displayHeight}px`,
                transform: "translate(-50%, -50%)",
                objectFit: "cover",
                maxWidth: "none",
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-white/60">Bild wird geladen...</div>
          )}
          {naturalSize ? (
            <div
              aria-hidden
              className="absolute inset-0"
              style={{ cursor: isDragging ? "grabbing" : "grab" }}
            />
          ) : null}
        </div>

        <div className="mt-4">
          <label className="text-xs uppercase tracking-[0.18em] text-black/45">Zoom</label>
          <input
            type="range"
            min="1"
            max="2.5"
            step="0.01"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="mt-2 w-full accent-black"
          />
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-full border border-black px-5 py-2 text-sm transition hover:bg-black hover:text-white">
            Verwerfen
          </button>
          <button
            type="button"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={isProcessing}
            className="rounded-full border border-black bg-black px-5 py-2 text-sm text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-black disabled:hover:text-white"
          >
            {isProcessing ? "Schneide..." : "Zuschneiden"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SquareImageField(props: SquareImageFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropState, setCropState] = useState<CropState | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingIndex, setPendingIndex] = useState(0);

  const isGallery = props.mode === "gallery";
  const currentValue = props.mode === "single" ? props.value : undefined;
  const currentValues = props.mode === "gallery" ? props.values : [];
  const remainingSlots = isGallery ? Math.max(0, props.maxItems - currentValues.length) : 0;

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const beginCropping = (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    setPendingFiles(files);
    setPendingIndex(0);
    setCropState({ source: URL.createObjectURL(files[0]), name: files[0].name });
  };

  useEffect(() => {
    return () => {
      if (cropState?.source) {
        URL.revokeObjectURL(cropState.source);
      }
    };
  }, [cropState?.source]);

  return (
    <div className="space-y-4">
      {props.mode === "single" ? (
        <div className="space-y-3 rounded-[28px] border border-black/10 bg-black/5 p-5">
          <div className="relative aspect-square w-full overflow-hidden rounded-[24px] bg-black">
            {currentValue ? (
              <NextImage src={currentValue} alt={props.label} fill unoptimized className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-white/60">Kein Bild hinterlegt</div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={openFileDialog}
              className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-black underline underline-offset-4 transition hover:text-black/70"
            >
              <span>{currentValue ? props.selectedLabel ?? `${props.label} ändern` : props.label}</span>
            </button>

            {currentValue ? (
              <button
                type="button"
                onClick={() => props.onChange("")}
                className="ml-auto cursor-pointer text-sm font-semibold text-red-600 transition hover:text-red-900"
              >
                Löschen
              </button>
            ) : null}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }

              beginCropping([file]);
              event.target.value = "";
            }}
            className="sr-only"
            aria-label={props.label}
          />
        </div>
      ) : null}

      {props.mode === "gallery" ? (
        <div className="space-y-4 p-0 pt-2">
          <h3 className="text-lg font-medium">Galeriebilder</h3>

          {currentValues.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {currentValues.map((image, index) => (
                <div key={`${image}-${index}`} className="relative overflow-hidden rounded-[24px]">
                  <div className="relative aspect-square w-full">
                    <NextImage src={image} alt={`Galeriebild ${index + 1}`} fill unoptimized className="object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={() => props.onChange(currentValues.filter((_, imageIndex) => imageIndex !== index))}
                    className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-black shadow-sm transition hover:bg-black hover:text-white"
                  >
                    Löschen
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-black/45">Noch keine Bilder hinterlegt.</p>
          )}

          <button
            type="button"
            onClick={openFileDialog}
            className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-black underline underline-offset-4 transition hover:text-black/70"
            disabled={remainingSlots === 0}
          >
            <span>{remainingSlots === 0 ? "Maximale Anzahl an Galeriebildern erreicht" : props.label}</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []).slice(0, remainingSlots);
              if (files.length === 0) {
                return;
              }

              beginCropping(files);
              event.target.value = "";
            }}
            className="sr-only"
            aria-label={props.label}
          />
        </div>
      ) : null}

      <CropModal
        key={cropState?.source ?? "closed"}
        open={cropState !== null}
        state={cropState}
        title={props.mode === "single" ? "Profilbild zuschneiden" : "Galeriebild zuschneiden"}
        onCancel={() => {
          if (cropState?.source) {
            URL.revokeObjectURL(cropState.source);
          }

          const nextIndex = pendingIndex + 1;
          if (nextIndex < pendingFiles.length) {
            const nextFile = pendingFiles[nextIndex];
            setPendingIndex(nextIndex);
            setCropState({ source: URL.createObjectURL(nextFile), name: nextFile.name });
          } else {
            setPendingFiles([]);
            setPendingIndex(0);
            setCropState(null);
          }
        }}
        onConfirm={(croppedDataUrl) => {
          if (cropState?.source) {
            URL.revokeObjectURL(cropState.source);
          }

          if (props.mode === "single") {
            props.onChange(croppedDataUrl);
            setPendingFiles([]);
            setPendingIndex(0);
            setCropState(null);
            return;
          }

          props.onChange([...currentValues, croppedDataUrl]);
          const nextIndex = pendingIndex + 1;
          if (nextIndex < pendingFiles.length) {
            const nextFile = pendingFiles[nextIndex];
            setPendingIndex(nextIndex);
            setCropState({ source: URL.createObjectURL(nextFile), name: nextFile.name });
          } else {
            setPendingFiles([]);
            setPendingIndex(0);
            setCropState(null);
          }
        }}
      />
    </div>
  );
}
