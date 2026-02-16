export type RectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type MorphTransform = {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  valid: boolean;
};

function isFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function sanitizeRect(rect: RectLike | null | undefined): RectLike | null {
  if (!rect) return null;
  if (!isFiniteNumber(rect.left) || !isFiniteNumber(rect.top) || !isFiniteNumber(rect.width) || !isFiniteNumber(rect.height)) {
    return null;
  }
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  return rect;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function computeMorphTransform(sourceRect: RectLike | null, targetRect: RectLike | null): MorphTransform {
  const source = sanitizeRect(sourceRect);
  const target = sanitizeRect(targetRect);

  if (!source || !target) {
    return {
      translateX: 0,
      translateY: 0,
      scaleX: 1,
      scaleY: 1,
      valid: false
    };
  }

  const sourceCenterX = source.left + source.width / 2;
  const sourceCenterY = source.top + source.height / 2;
  const targetCenterX = target.left + target.width / 2;
  const targetCenterY = target.top + target.height / 2;

  const rawScaleX = source.width / target.width;
  const rawScaleY = source.height / target.height;

  if (!Number.isFinite(rawScaleX) || !Number.isFinite(rawScaleY)) {
    return {
      translateX: 0,
      translateY: 0,
      scaleX: 1,
      scaleY: 1,
      valid: false
    };
  }

  return {
    translateX: sourceCenterX - targetCenterX,
    translateY: sourceCenterY - targetCenterY,
    scaleX: clamp(rawScaleX, 0.08, 2.5),
    scaleY: clamp(rawScaleY, 0.08, 2.5),
    valid: true
  };
}
