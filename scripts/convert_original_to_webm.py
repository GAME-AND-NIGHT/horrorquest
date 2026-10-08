# -*- coding: utf-8 -*-
"""
Script to convert original ProRes MOV files to high-quality WebM (VP9)
preserving alpha channel at full original resolution (1080x1920).
Source: videos/original/webm (*.mov)
Destination: videos/original/webm (*.webm)
"""

import os
import subprocess
import time

SRC_DIR = r"D:\develop\GAN\horrorquest\videos\original\webm"

def convert_original_to_webm(crf=18, delete_mov=False):
    if not os.path.exists(SRC_DIR):
        print(f"Source directory does not exist: {SRC_DIR}")
        return

    mov_files = []
    for root, dirs, files in os.walk(SRC_DIR):
        for f in files:
            if f.lower().endswith(".mov"):
                src_path = os.path.join(root, f)
                base_name, _ = os.path.splitext(src_path)
                dst_path = base_name + ".webm"
                rel_src = os.path.relpath(src_path, SRC_DIR)
                rel_dst = os.path.relpath(dst_path, SRC_DIR)
                mov_files.append((src_path, dst_path, rel_src, rel_dst))

    print(f"Found {len(mov_files)} original MOV videos to convert to high-quality WebM.\n")

    total_orig_bytes = 0
    total_opt_bytes = 0
    start_total_time = time.time()

    for idx, (src, dst, rel_src, rel_dst) in enumerate(mov_files, start=1):
        orig_size = os.path.getsize(src)
        total_orig_bytes += orig_size

        print(f"[{idx}/{len(mov_files)}] Converting: {rel_src} -> {rel_dst} ({orig_size / (1024*1024):.2f} MB)...")

        # Full resolution (1080x1920), high-fidelity CRF 18, alpha preservation
        cmd = [
            "ffmpeg", "-y", "-i", src,
            "-c:v", "libvpx-vp9",
            "-pix_fmt", "yuva420p",
            "-b:v", "0",
            "-crf", str(crf),
            "-row-mt", "1",
            "-threads", "0",
            "-cpu-used", "2",
            "-c:a", "libopus",
            "-b:a", "160k",
            dst
        ]

        t0 = time.time()
        res = subprocess.run(cmd, capture_output=True, text=True)
        t_elapsed = time.time() - t0

        if res.returncode != 0:
            print(f"  ERROR converting {rel_src}:\n{res.stderr}")
            continue

        opt_size = os.path.getsize(dst)
        total_opt_bytes += opt_size
        pct = (opt_size / orig_size) * 100
        print(f"  -> Done in {t_elapsed:.1f}s: {opt_size / (1024*1024):.2f} MB ({pct:.1f}% of orig)\n")

        if delete_mov and os.path.exists(dst) and os.path.getsize(dst) > 0:
            os.remove(src)
            print(f"  (Deleted original: {rel_src})")

    total_elapsed = time.time() - start_total_time
    print("=" * 60)
    print(f"Finished converting {len(mov_files)} videos in {total_elapsed:.1f}s.")
    print(f"Total MOV size:   {total_orig_bytes / (1024*1024):.2f} MB")
    print(f"Total WebM size:  {total_opt_bytes / (1024*1024):.2f} MB")
    if total_orig_bytes > 0:
        saved_bytes = total_orig_bytes - total_opt_bytes
        print(f"Space reduction:  {saved_bytes / (1024*1024):.2f} MB ({(saved_bytes / total_orig_bytes)*100:.1f}%)")
    print("=" * 60)

if __name__ == "__main__":
    convert_original_to_webm()
