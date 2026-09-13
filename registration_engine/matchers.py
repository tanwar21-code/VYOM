"""Feature detection and matching for lunar image registration."""

import numpy as np
import cv2

from registration_engine.preprocessing import phase_congruency_map


SUPPORTED_ALGORITHMS = ("sift", "akaze", "rift2")


def detect_and_match(
    source_img: np.ndarray,
    reference_img: np.ndarray,
    algorithm: str = "sift",
) -> tuple[list[cv2.DMatch], list[cv2.KeyPoint], list[cv2.KeyPoint]]:
    """Detect keypoints and compute descriptor matches between two grayscale images.

    Args:
        source_img: Grayscale source image (2D uint8 numpy array).
        reference_img: Grayscale reference image (2D uint8 numpy array).
        algorithm: Feature detection algorithm — "sift", "akaze", or "rift2".

    Returns:
        Tuple of (good_matches, keypoints_source, keypoints_reference).
        good_matches is the list of cv2.DMatch objects that passed Lowe's ratio test.

    Raises:
        ValueError: If algorithm is not one of the supported values.
    """
    algorithm_lower = algorithm.strip().lower()
    if algorithm_lower not in SUPPORTED_ALGORITHMS:
        raise ValueError(
            f"Unsupported algorithm '{algorithm}'. "
            f"Choose one of: {', '.join(SUPPORTED_ALGORITHMS)}"
        )

    if algorithm_lower == "rift2":
        return _detect_and_match_rift2(source_img, reference_img)

    # --- Standard SIFT / AKAZE path ---

    # Create the feature detector/descriptor
    if algorithm_lower == "sift":
        detector = cv2.SIFT_create()
    else:  # akaze
        detector = cv2.AKAZE_create()

    # Detect keypoints and compute descriptors
    kp_source, desc_source = detector.detectAndCompute(source_img, None)
    kp_reference, desc_reference = detector.detectAndCompute(reference_img, None)

    # Guard against empty descriptor sets
    if desc_source is None or desc_reference is None:
        return [], list(kp_source), list(kp_reference)
    if len(desc_source) < 2 or len(desc_reference) < 2:
        return [], list(kp_source), list(kp_reference)

    # Choose the appropriate norm for the descriptor type:
    # SIFT uses float32 descriptors -> L2 norm
    # AKAZE (default) uses binary descriptors -> Hamming norm
    if algorithm_lower == "sift":
        norm_type = cv2.NORM_L2
    else:
        norm_type = cv2.NORM_HAMMING

    # Brute-force matcher with k=2 nearest neighbours for ratio test
    bf = cv2.BFMatcher(norm_type)
    raw_matches = bf.knnMatch(desc_source, desc_reference, k=2)

    # Apply Lowe's ratio test (threshold = 0.75) to discard ambiguous matches
    good_matches: list[cv2.DMatch] = []
    for pair in raw_matches:
        if len(pair) == 2:
            m, n = pair
            if m.distance < 0.75 * n.distance:
                good_matches.append(m)

    return good_matches, list(kp_source), list(kp_reference)


def _detect_and_match_rift2(
    source_img: np.ndarray,
    reference_img: np.ndarray,
) -> tuple[list[cv2.DMatch], list[cv2.KeyPoint], list[cv2.KeyPoint]]:
    """Simplified RIFT2-inspired matching via phase congruency + ORB.

    This is a simplified reimplementation inspired by:
      - Li, J., Hu, Q., & Ai, M. (2020). "RIFT: Multi-Modal Image Matching
        Based on Radiation-Invariant Feature Transform." IEEE Transactions on
        Image Processing, 29, 3296-3310.
      - Li, J., Hu, Q., & Ai, M. (2023). "RIFT2: Speeding-Up RIFT with A New
        Rotation-Invariance Technique." ISPRS Journal of Photogrammetry and
        Remote Sensing, 199, 55-70.
    It is NOT a byte-for-byte reproduction of either published algorithm.

    The key insight from RIFT/RIFT2 is that phase congruency maps are
    inherently invariant to illumination / radiometric differences between
    multi-modal images (e.g. different sun angles, different sensors). By
    first computing phase congruency maps and then running a standard fast
    detector (ORB) on those maps, we approximate the illumination-invariant
    feature detection behaviour of the full RIFT2 algorithm at much lower
    implementation complexity. ORB is chosen over AKAZE here because the
    phase congruency maps are already edge-normalised uint8 images, and ORB's
    FAST corner detection + BRIEF descriptors run efficiently on them.
    """
    # Step 1: Compute illumination-invariant phase congruency maps for both images
    pc_source = phase_congruency_map(source_img)
    pc_reference = phase_congruency_map(reference_img)

    # Step 2: Detect keypoints and compute descriptors on the phase congruency maps
    # using ORB (fast binary detector suitable for the normalised PC maps)
    detector = cv2.ORB_create(nfeatures=10000)
    kp_source, desc_source = detector.detectAndCompute(pc_source, None)
    kp_reference, desc_reference = detector.detectAndCompute(pc_reference, None)

    # Guard against empty descriptor sets
    if desc_source is None or desc_reference is None:
        return [], list(kp_source or []), list(kp_reference or [])
    if len(desc_source) < 2 or len(desc_reference) < 2:
        return [], list(kp_source), list(kp_reference)

    # Step 3: Brute-force match with Hamming norm (binary ORB descriptors)
    bf = cv2.BFMatcher(cv2.NORM_HAMMING)
    raw_matches = bf.knnMatch(desc_source, desc_reference, k=2)

    # Step 4: Lowe's ratio test (threshold = 0.75) to filter ambiguous matches
    good_matches: list[cv2.DMatch] = []
    for pair in raw_matches:
        if len(pair) == 2:
            m, n = pair
            if m.distance < 0.75 * n.distance:
                good_matches.append(m)

    return good_matches, list(kp_source), list(kp_reference)
