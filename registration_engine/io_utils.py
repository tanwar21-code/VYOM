"""I/O and image loading utilities for lunar image registration."""

from pathlib import Path
import numpy as np
from PIL import Image
import tifffile
import cv2


class RegistrationInputError(Exception):
    """Custom exception raised when an input image cannot be read or processed."""
    pass


def _load_single_image(image_path: str | Path) -> np.ndarray:
    """Load an image file as a 2D grayscale numpy array."""
    path = Path(image_path)
    if not path.exists():
        raise RegistrationInputError(f"Image file does not exist: {path}")

    ext = path.suffix.lower()

    try:
        if ext in [".tif", ".tiff"]:
            img = tifffile.imread(str(path))
            if img is None:
                raise RegistrationInputError(f"tifffile failed to decode TIFF image at: {path}")

            # Handle 3D / multi-channel arrays
            if img.ndim == 3:
                if img.shape[2] in (3, 4):
                    # RGB / RGBA -> Grayscale
                    img = (0.299 * img[:, :, 0] + 0.587 * img[:, :, 1] + 0.114 * img[:, :, 2])
                elif img.shape[0] in (3, 4):
                    # Channel-first format
                    img = (0.299 * img[0, :, :] + 0.587 * img[1, :, :] + 0.114 * img[2, :, :])
                else:
                    img = img[:, :, 0]
            elif img.ndim != 2:
                raise RegistrationInputError(f"Unexpected image shape in TIFF: {img.shape}")

            # Normalize / cast to uint8
            if np.issubdtype(img.dtype, np.floating):
                if img.max() <= 1.0:
                    img = np.clip(img * 255.0, 0, 255).astype(np.uint8)
                else:
                    img = np.clip(img, 0, 255).astype(np.uint8)
            elif img.dtype == np.uint16:
                img = (img / 256).astype(np.uint8)
            else:
                img = img.astype(np.uint8)

            return img

        elif ext in [".png", ".jpg", ".jpeg", ".bmp", ".webp"]:
            with Image.open(path) as pil_img:
                gray_pil = pil_img.convert("L")
                return np.array(gray_pil, dtype=np.uint8)

        else:
            # Fallback attempt with Pillow first, then tifffile
            try:
                with Image.open(path) as pil_img:
                    return np.array(pil_img.convert("L"), dtype=np.uint8)
            except Exception:
                img = tifffile.imread(str(path))
                if img is not None:
                    if img.ndim == 3:
                        img = img[:, :, 0]
                    return img.astype(np.uint8)
                raise RegistrationInputError(
                    f"Unsupported or unrecognized image file extension '{ext}' for file: {path}"
                )

    except RegistrationInputError:
        raise
    except Exception as exc:
        raise RegistrationInputError(f"Unable to read or parse image '{path}': {exc}") from exc


def load_and_resample(
    source_path: str,
    reference_path: str,
    target_gsd: float | None = None
) -> tuple[np.ndarray, np.ndarray]:
    """Load both images as grayscale numpy arrays and optionally resample them.

    Args:
        source_path: Filepath to the source image (e.g. Chandrayaan-2 swath).
        reference_path: Filepath to the reference image (e.g. LRO NAC or basemap).
        target_gsd: Optional target ground-sampling-distance or direct resize ratio.

    Returns:
        tuple[np.ndarray, np.ndarray]: (source_image, reference_image) as 2D uint8 arrays.

    Raises:
        RegistrationInputError: If either image cannot be read or processed.
    """
    source_img = _load_single_image(source_path)
    ref_img = _load_single_image(reference_path)

    # TODO: Full ground-sampling-distance-aware resizing needs each product's metadata
    # (e.g. parsing spatial resolution from PDS4 XML labels, GeoTIFF tags, or LRO/Chandrayaan-2
    # mission headers). In this MVP, if target_gsd is provided, we assume the caller passes
    # the correct resize ratio directly if known; otherwise images are returned unresized.
    if target_gsd is not None and target_gsd > 0 and target_gsd != 1.0:
        new_source_w = max(1, int(round(source_img.shape[1] * target_gsd)))
        new_source_h = max(1, int(round(source_img.shape[0] * target_gsd)))
        source_img = cv2.resize(source_img, (new_source_w, new_source_h), interpolation=cv2.INTER_LINEAR)

        new_ref_w = max(1, int(round(ref_img.shape[1] * target_gsd)))
        new_ref_h = max(1, int(round(ref_img.shape[0] * target_gsd)))
        ref_img = cv2.resize(ref_img, (new_ref_w, new_ref_h), interpolation=cv2.INTER_LINEAR)

    return source_img, ref_img

def list_demo_pairs(data_dir: str | Path = "data/demo_pairs") -> list[str]:
    """Return a list of available demo pair folder names."""
    data_dir = Path(data_dir)
    if data_dir.exists():
        return sorted([d.name for d in data_dir.iterdir() if d.is_dir()])
    return []

