# -*- coding: utf-8 -*-
"""
Script to compress and downscale videos by 1.5x (width & height).
Source: videos/original/mp4
Destination: videos/optimized/mp4
"""

import os
import sys
import subprocess
import time

SRC_DIR = r"D:\develop\GAN\horrorquest\videos\original\mp4"
DST_DIR = r"D:\develop\GAN\horrorquest\videos\optimized\mp4"
BASE_OPTIMIZED = r"D:\develop\GAN\horrorquest\videos\optimized"

def optimize_all():
    if not os.path.exists(SRC_DIR):
        print(f"Source directory does not exist: {SRC_DIR}")
        return

    os.makedirs(DST_DIR, exist_ok=True)

    video_files = []
    for root, dirs, files in os.walk(SRC_DIR):
        for f in files:
            if f.lower().endswith(".mp4"):
                src_path = os.path.join(root, f)
                rel_path = os.path.relpath(src_path, SRC_DIR)
                dst_path = os.path.join(DST_DIR, rel_path)
                video_files.append((src_path, dst_path, rel_path))

    print(f"Found {len(video_files)} videos to optimize.\n")

    total_orig_bytes = 0
    total_opt_bytes = 0
    start_total_time = time.time()

    for idx, (src, dst, rel) in enumerate(video_files, start=1):
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        orig_size = os.path.getsize(src)
        total_orig_bytes += orig_size

        print(f"[{idx}/{len(video_files)}] Processing: {rel} ({orig_size / (1024*1024):.2f} MB)...")

        # ffmpeg command: scale down by 1.5x -> 1080x1920 becomes 720x1280
        # -vf scale=trunc(iw/1.5/2)*2:trunc(ih/1.5/2)*2 ensures even dimensions
        cmd = [
            "ffmpeg", "-y", "-i", src,
            "-vf", "scale=trunc(iw/1.5/2)*2:trunc(ih/1.5/2)*2",
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "22",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "128k",
            "-movflags", "+faststart",
            dst
        ]

        t0 = time.time()
        res = subprocess.run(cmd, capture_output=True, text=True)
        t_elapsed = time.time() - t0

        if res.returncode != 0:
            print(f"  ERROR processing {rel}: {res.stderr}")
            continue

        opt_size = os.path.getsize(dst)
        total_opt_bytes += opt_size
        pct = (opt_size / orig_size) * 100
        print(f"  -> Done in {t_elapsed:.1f}s: {opt_size / (1024*1024):.2f} MB ({pct:.1f}% of orig)\n")

    total_elapsed = time.time() - start_total_time
    print("=" * 60)
    print(f"Finished processing {len(video_files)} videos in {total_elapsed:.1f}s.")
    print(f"Total original size:  {total_orig_bytes / (1024*1024):.2f} MB")
    print(f"Total optimized size: {total_opt_bytes / (1024*1024):.2f} MB")
    saved_bytes = total_orig_bytes - total_opt_bytes
    print(f"Space saved:          {saved_bytes / (1024*1024):.2f} MB ({(saved_bytes / total_orig_bytes)*100:.1f}% reduction)")
    print("=" * 60)

if __name__ == "__main__":
    optimize_all()
