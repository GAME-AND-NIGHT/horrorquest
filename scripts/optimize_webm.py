# -*- coding: utf-8 -*-
"""
Script to compress and downscale alpha-channel videos by 1.5x (width & height).
Source: videos/original/webm (*.mov files with ProRes 4444 alpha)
Destination: videos/optimized/webm (*.webm files with VP9 yuva420p alpha)
"""

import os
import subprocess
import time

SRC_DIR = r"D:\develop\GAN\horrorquest\videos\original\webm"
DST_DIR = r"D:\develop\GAN\horrorquest\videos\optimized\webm"

def optimize_alpha_videos(output_ext=".webm", crf=30):
    if not os.path.exists(SRC_DIR):
        print(f"Source directory does not exist: {SRC_DIR}")
        return

    os.makedirs(DST_DIR, exist_ok=True)

    video_files = []
    for root, dirs, files in os.walk(SRC_DIR):
        for f in files:
            if f.lower().endswith((".mov", ".webm")):
                src_path = os.path.join(root, f)
                rel_path = os.path.relpath(src_path, SRC_DIR)
                base_name, _ = os.path.splitext(rel_path)
                dst_rel = base_name + output_ext
                dst_path = os.path.join(DST_DIR, dst_rel)
                video_files.append((src_path, dst_path, rel_path, dst_rel))

    print(f"Found {len(video_files)} videos to process.\n")

    total_orig_bytes = 0
    total_opt_bytes = 0
    start_total_time = time.time()

    for idx, (src, dst, rel_src, rel_dst) in enumerate(video_files, start=1):
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        orig_size = os.path.getsize(src)
        total_orig_bytes += orig_size

        print(f"[{idx}/{len(video_files)}] Processing: {rel_src} -> {rel_dst} ({orig_size / (1024*1024):.2f} MB)...")

        # 1080x1920 / 1.5 = 720x1280
        if output_ext.lower() == ".webm":
            cmd = [
                "ffmpeg", "-y", "-i", src,
                "-vf", "scale=trunc(iw/1.5/2)*2:trunc(ih/1.5/2)*2",
                "-c:v", "libvpx-vp9",
                "-pix_fmt", "yuva420p",
                "-b:v", "0",
                "-crf", str(crf),
                "-row-mt", "1",
                "-threads", "0",
                "-cpu-used", "2",
                "-c:a", "libopus",
                "-b:a", "96k",
                dst
            ]
        else: # mov with prores 4444
            cmd = [
                "ffmpeg", "-y", "-i", src,
                "-vf", "scale=trunc(iw/1.5/2)*2:trunc(ih/1.5/2)*2",
                "-c:v", "prores_ks",
                "-profile:v", "4444",
                "-pix_fmt", "yuva444p10le",
                "-c:a", "copy",
                dst
            ]

        t0 = time.time()
        res = subprocess.run(cmd, capture_output=True, text=True)
        t_elapsed = time.time() - t0

        if res.returncode != 0:
            print(f"  ERROR processing {rel_src}:\n{res.stderr}")
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
    if total_orig_bytes > 0:
        saved_bytes = total_orig_bytes - total_opt_bytes
        print(f"Space saved:          {saved_bytes / (1024*1024):.2f} MB ({(saved_bytes / total_orig_bytes)*100:.1f}% reduction)")
    print("=" * 60)

if __name__ == "__main__":
    optimize_alpha_videos()
