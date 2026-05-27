"""Strip baked checkerboard background from placeholder PNGs via cv2 floodFill."""
import sys
import numpy as np
import cv2
from PIL import Image


def is_checker_color(rgb: np.ndarray) -> np.ndarray:
    r, g, b = rgb[..., 0].astype(int), rgb[..., 1].astype(int), rgb[..., 2].astype(int)
    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    return ((max_c - min_c) <= 14) & (min_c >= 185)


def strip(src: str, dst: str) -> None:
    img = Image.open(src).convert("RGBA")
    arr = np.array(img)
    rgb = arr[..., :3]
    h, w = arr.shape[:2]

    candidate = is_checker_color(rgb).astype(np.uint8) * 255

    # cv2.floodFill expects 8-bit single-channel image
    # Use a mask 2 pixels larger as required by cv2
    flood_mask = np.zeros((h + 2, w + 2), dtype=np.uint8)
    seeds = [
        (0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1),
        (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2),
    ]
    for (sx, sy) in seeds:
        if candidate[sy, sx] == 255 and flood_mask[sy + 1, sx + 1] == 0:
            cv2.floodFill(candidate, flood_mask, (sx, sy), 128, loDiff=0, upDiff=0)

    bg = (candidate == 128)

    out = arr.copy()
    out[bg, 3] = 0
    out[bg, 0:3] = 0

    Image.fromarray(out).save(dst, optimize=True)
    pct = bg.mean() * 100
    print(f"  {dst.split('/')[-1]}: {pct:.1f}% transparent ({w}×{h})")


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        src, dst = arg.split("::")
        strip(src, dst)
