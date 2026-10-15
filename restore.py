#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Antigravity Chinese Localization Clean Uninstaller (restore.py)
Acquires the patcher lock, unloads LaunchAgent guard, deletes unpacked
Resources/app & staging/state files, restores Resources/app.asar.disabled -> Resources/app.asar,
and removes the persistent runtime directory ~/.antigravity-zh.
"""

from __future__ import annotations

import argparse
import fcntl
import os
import shutil
import subprocess
import sys
import tempfile
import time
from datetime import datetime

APP_PATH = "/Applications/Antigravity.app"
RESOURCES_DIR = os.path.join(APP_PATH, "Contents", "Resources")
ASAR_FILE = os.path.join(RESOURCES_DIR, "app.asar")
ASAR_DISABLED = os.path.join(RESOURCES_DIR, "app.asar.disabled")
UNPACKED_APP_DIR = os.path.join(RESOURCES_DIR, "app")
STAGING_APP_DIR = os.path.join(RESOURCES_DIR, "app.staging")
SHA256_STATE_FILE = os.path.join(RESOURCES_DIR, ".zh_asar_sha256")

LAUNCH_AGENT_LABEL = "com.antigravity.zh-cn"


def log(msg: str) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)


def get_real_user_info() -> tuple[int, int, str]:
    sudo_uid = os.environ.get("SUDO_UID")
    sudo_gid = os.environ.get("SUDO_GID")
    sudo_user = os.environ.get("SUDO_USER")
    if os.geteuid() == 0 and sudo_uid and sudo_user:
        uid = int(sudo_uid)
        gid = int(sudo_gid) if sudo_gid else 20
        home_dir = os.path.expanduser(f"~{sudo_user}")
        return uid, gid, home_dir
    return os.getuid(), os.getgid(), os.path.expanduser("~")


def is_running_inside_antigravity() -> bool:
    if os.environ.get("__CFBundleIdentifier") == "com.google.antigravity":
        return True
    try:
        pid = os.getpid()
        while pid > 1:
            out = subprocess.check_output(
                ["ps", "-o", "ppid=,comm=", "-p", str(pid)], text=True
            ).strip()
            if not out:
                break
            parts = out.split(None, 1)
            ppid = int(parts[0])
            comm = parts[1] if len(parts) > 1 else ""
            if "Antigravity" in comm:
                return True
            if ppid == pid:
                break
            pid = ppid
    except Exception:
        pass
    return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Antigravity 汉化卸载与原版恢复工具")
    parser.add_argument("--skip-kill", action="store_true", help="不终止正在运行的 Antigravity 进程")
    parser.add_argument("--skip-restart", action="store_true", help="恢复完成后不自动重启 Antigravity")
    args = parser.parse_args()

    uid, gid, home_dir = get_real_user_info()
    lock_path = os.path.join(tempfile.gettempdir(), f"antigravity-zh-{uid}.lock")
    lock_f = open(lock_path, "w")
    try:
        os.chmod(lock_path, 0o600)
        if os.geteuid() == 0 and uid != 0:
            os.chown(lock_path, uid, gid)
    except Exception:
        pass
    fcntl.flock(lock_f, fcntl.LOCK_EX)
    try:
        plist_path = os.path.join(home_dir, "Library", "LaunchAgents", f"{LAUNCH_AGENT_LABEL}.plist")
        guard_log_file = os.path.join(home_dir, ".antigravity-guard.log")
        persist_dir = os.path.join(home_dir, ".antigravity-zh")

        if os.path.isfile(plist_path):
            log(f"正在卸载守护进程: {plist_path}")
            subprocess.run(
                ["launchctl", "bootout", f"gui/{uid}", plist_path],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            os.remove(plist_path)

        if os.path.isfile(guard_log_file):
            os.remove(guard_log_file)

        try:
            # Restore app.asar BEFORE removing unpacked app dir so there is never a window without an app source
            if os.path.isfile(ASAR_DISABLED):
                log("正在恢复官方原版 app.asar ...")
                if os.path.isfile(ASAR_FILE):
                    os.remove(ASAR_FILE)
                os.rename(ASAR_DISABLED, ASAR_FILE)

            for d in (STAGING_APP_DIR, UNPACKED_APP_DIR):
                if os.path.isdir(d):
                    log(f"正在移除目录: {d}")
                    shutil.rmtree(d)

            if os.path.isfile(SHA256_STATE_FILE):
                os.remove(SHA256_STATE_FILE)

            bin_dir = os.path.join(RESOURCES_DIR, "bin")
            for fname in ("language_server_zh", "language_server_zh.staging", ".zh_ls_sha256"):
                fpath = os.path.join(bin_dir, fname)
                if os.path.isfile(fpath):
                    log(f"正在移除文件: {fpath}")
                    os.remove(fpath)
        except PermissionError:
            log("错误: macOS 拦截了终端修改 /Applications/Antigravity.app 的权限。")
            log("请使用管理员权限运行: sudo python3 restore.py")
            sys.exit(1)

        if os.path.isdir(persist_dir):
            shutil.rmtree(persist_dir, ignore_errors=True)

        if is_running_inside_antigravity():
            log("已完整恢复 Antigravity 官方英文原版状态（重启应用后生效）。")
        else:
            if not args.skip_kill:
                subprocess.run(["killall", "Antigravity"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                time.sleep(0.6)
            if not args.skip_restart and os.path.isdir(APP_PATH):
                subprocess.run(["open", "-a", APP_PATH])
            log("已完整恢复 Antigravity 官方英文原版状态！")
    finally:
        fcntl.flock(lock_f, fcntl.LOCK_UN)
        lock_f.close()


if __name__ == "__main__":
    main()
