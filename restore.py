#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Antigravity & Gemini.app Dual-End Clean Uninstaller / Restorer
Restores both /Applications/Antigravity.app and /Applications/Gemini.app to their
unmodified official state and cleans LaunchAgent, shared web bundles, and ~/.antigravity-zh.
"""

from __future__ import annotations

import argparse
import fcntl
import glob
import os
import shutil
import stat
import subprocess
import sys
import time

APP_PATH = "/Applications/Antigravity.app"
RESOURCES_DIR = os.path.join(APP_PATH, "Contents", "Resources")
ASAR_FILE = os.path.join(RESOURCES_DIR, "app.asar")
ASAR_DISABLED = os.path.join(RESOURCES_DIR, "app.asar.disabled")
UNPACKED_APP_DIR = os.path.join(RESOURCES_DIR, "app")
STAGING_APP_DIR = os.path.join(RESOURCES_DIR, "app.staging")
SHA256_STATE_FILE = os.path.join(RESOURCES_DIR, ".zh_asar_sha256")

BIN_DIR = os.path.join(RESOURCES_DIR, "bin")
LS_ZH_BIN = os.path.join(BIN_DIR, "language_server_zh")
LS_ZH_STAGING_BIN = os.path.join(BIN_DIR, "language_server_zh.staging")
LS_SHA256_STATE_FILE = os.path.join(BIN_DIR, ".zh_ls_sha256")

GEMINI_APP_PATH = "/Applications/Gemini.app"
GEMINI_HELPERS_DIR = os.path.join(GEMINI_APP_PATH, "Contents", "Helpers")
GEMINI_AGY_BIN = os.path.join(GEMINI_HELPERS_DIR, "agy")
LEGACY_GEMINI_AGY_ORIG = os.path.join(GEMINI_HELPERS_DIR, ".agy.orig")
LEGACY_GEMINI_AGY_STAGING = os.path.join(GEMINI_HELPERS_DIR, ".agy.staging")
LEGACY_GEMINI_AGY_SHA256_STATE_FILE = os.path.join(GEMINI_HELPERS_DIR, ".zh_agy_sha256")

LAUNCH_AGENT_LABEL = "com.antigravity.zh-cn"


def get_real_user_info() -> tuple[int, int, str]:
    """Returns (uid, gid, home_dir) of the real logged-in user, even when invoked via sudo."""
    sudo_uid = os.environ.get("SUDO_UID")
    sudo_gid = os.environ.get("SUDO_GID")
    sudo_user = os.environ.get("SUDO_USER")
    if os.geteuid() == 0 and sudo_uid and sudo_user:
        uid = int(sudo_uid)
        gid = int(sudo_gid) if sudo_gid else 20
        home_dir = os.path.expanduser(f"~{sudo_user}")
        return uid, gid, home_dir
    return os.getuid(), os.getgid(), os.path.expanduser("~")


def get_lock_path(uid: int) -> str:
    """Returns the canonical cross-privilege lock path strictly under /tmp."""
    return f"/tmp/antigravity-zh-{uid}.lock"


def acquire_lock(uid: int, gid: int):
    """Acquires /tmp/antigravity-zh-{uid}.lock safely with O_NOFOLLOW and ownership verification."""
    lock_path = get_lock_path(uid)
    flags = os.O_CREAT | os.O_RDWR
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    lock_fd = os.open(lock_path, flags, 0o600)
    try:
        st = os.fstat(lock_fd)
        if not stat.S_ISREG(st.st_mode) or st.st_uid not in (os.geteuid(), uid, 0):
            raise PermissionError(f"锁文件校验失败（非预期文件类型或属主）: {lock_path}")
        if os.geteuid() == 0 and uid != 0 and st.st_uid != uid:
            os.fchown(lock_fd, uid, gid)
    except Exception:
        os.close(lock_fd)
        raise

    lock_f = os.fdopen(lock_fd, "r+")
    try:
        fcntl.flock(lock_f, fcntl.LOCK_EX)
    except Exception:
        lock_f.close()
        raise
    return lock_f, lock_path


def is_running_inside_antigravity() -> bool:
    """Detects if this script is running inside Antigravity's or Gemini's built-in terminal or agent."""
    if os.environ.get("__CFBundleIdentifier") in ("com.google.antigravity", "com.google.GeminiMacOS"):
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
            if "Antigravity" in comm or "Gemini" in comm or "/Helpers/agy" in comm:
                return True
            if ppid == pid:
                break
            pid = ppid
    except Exception:
        pass
    return False


def _remove_file_if_exists(path: str) -> bool:
    if os.path.lexists(path):
        os.unlink(path)
        return True
    return False


def restore_launch_agent(uid: int, home_dir: str) -> None:
    plist_path = os.path.join(home_dir, "Library", "LaunchAgents", f"{LAUNCH_AGENT_LABEL}.plist")
    if os.path.lexists(plist_path):
        subprocess.run(
            ["launchctl", "bootout", f"gui/{uid}", plist_path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        os.unlink(plist_path)
        print(f"已卸载并移除防掉后台服务: {plist_path}")

    guard_log = os.path.join(home_dir, ".antigravity-guard.log")
    if _remove_file_if_exists(guard_log):
        print(f"已清理守护日志: {guard_log}")


def restore_antigravity_app(uid: int, gid: int) -> None:
    if not os.path.isdir(APP_PATH):
        return

    if os.path.isfile(ASAR_DISABLED):
        if os.path.isfile(ASAR_FILE):
            print("检测到 app.asar 与 app.asar.disabled 共存，保留官方 app.asar 并移除冗余 .disabled。")
            os.remove(ASAR_DISABLED)
        else:
            print("正在恢复原始 app.asar...")
            os.rename(ASAR_DISABLED, ASAR_FILE)
        if os.geteuid() == 0 and uid != 0 and os.path.exists(ASAR_FILE):
            os.chown(ASAR_FILE, uid, gid)

    for dir_path in (STAGING_APP_DIR, UNPACKED_APP_DIR):
        if os.path.isdir(dir_path) and not os.path.islink(dir_path):
            print(f"正在删除解包目录 {os.path.basename(dir_path)}...")
            shutil.rmtree(dir_path)
        elif os.path.lexists(dir_path):
            os.unlink(dir_path)

    for state_file in (SHA256_STATE_FILE, LS_ZH_BIN, LS_ZH_STAGING_BIN, LS_SHA256_STATE_FILE):
        if _remove_file_if_exists(state_file):
            print(f"已清理 {os.path.basename(state_file)}")

    for ls_tmp in glob.glob(os.path.join(BIN_DIR, "language_server_zh*")):
        if os.path.lexists(ls_tmp):
            os.unlink(ls_tmp)


def restore_gemini_agy(uid: int, gid: int, home_dir: str) -> bool:
    if not os.path.isdir(GEMINI_HELPERS_DIR):
        return False

    persist_orig = os.path.join(home_dir, ".antigravity-zh", "backup", "gemini_agy.orig")
    backup_src = None
    for candidate in (persist_orig, LEGACY_GEMINI_AGY_ORIG):
        if os.path.isfile(candidate) and not os.path.islink(candidate):
            backup_src = candidate
            break

    restored = False
    if backup_src is not None:
        print(f"正在从官方备份恢复 Gemini.app Helpers/agy ({backup_src})...")
        restore_tmp = os.path.join(GEMINI_HELPERS_DIR, f".agy.restore-{os.getpid()}")
        if os.path.lexists(restore_tmp):
            os.unlink(restore_tmp)
        shutil.copy2(backup_src, restore_tmp)
        os.chmod(restore_tmp, 0o755)
        if os.geteuid() == 0 and uid != 0:
            os.chown(restore_tmp, uid, gid)
        os.replace(restore_tmp, GEMINI_AGY_BIN)
        restored = True
    elif os.path.isfile(GEMINI_AGY_BIN):
        verify = subprocess.run(
            ["codesign", "--verify", "--strict", GEMINI_AGY_BIN],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        if verify.returncode != 0:
            print("警告: 未找到 gemini_agy.orig 备份，且当前 Gemini.app/Contents/Helpers/agy 签名校验异常。")

    for legacy_file in (
        LEGACY_GEMINI_AGY_ORIG,
        LEGACY_GEMINI_AGY_STAGING,
        LEGACY_GEMINI_AGY_SHA256_STATE_FILE,
    ):
        _remove_file_if_exists(legacy_file)
    for pattern in (".agy.staging*", ".agy.restore*"):
        for tmp_path in glob.glob(os.path.join(GEMINI_HELPERS_DIR, pattern)):
            _remove_file_if_exists(tmp_path)

    return restored


def clean_shared_bundles_and_persist_dir(home_dir: str) -> None:
    brain_dir = os.path.join(home_dir, ".gemini", "antigravity", "brain")
    shared_dir = os.path.join(brain_dir, ".antigravity-zh")
    if os.path.isdir(shared_dir) and not os.path.islink(shared_dir):
        shutil.rmtree(shared_dir, ignore_errors=True)
        print(f"已清理双端共享 Web 汉化目录: {shared_dir}")
    elif os.path.lexists(shared_dir):
        os.unlink(shared_dir)

    for legacy_name in ("ag-zh-bundle.js",):
        _remove_file_if_exists(os.path.join(brain_dir, legacy_name))
    for tmp_bundle in glob.glob(os.path.join(brain_dir, ".ag-zh-bundle.js.staging*")):
        _remove_file_if_exists(tmp_bundle)

    persist_dir = os.path.join(home_dir, ".antigravity-zh")
    if os.path.isdir(persist_dir) and not os.path.islink(persist_dir):
        shutil.rmtree(persist_dir, ignore_errors=True)
        print(f"已清理持久化配置与备份目录: {persist_dir}")
    elif os.path.lexists(persist_dir):
        os.unlink(persist_dir)


def main() -> None:
    parser = argparse.ArgumentParser(description="还原 Antigravity & Gemini.app 至官方未修改状态")
    parser.add_argument("--skip-kill", action="store_true", help="不终止正在运行的 Antigravity / Gemini 进程")
    parser.add_argument("--skip-restart", action="store_true", help="还原后不自动重新打开 Antigravity")
    args = parser.parse_args()

    uid, gid, home_dir = get_real_user_info()
    lock_f, lock_path = acquire_lock(uid, gid)

    try:
        # Remove LaunchAgent first so WatchPaths cannot re-patch while restoring
        restore_launch_agent(uid, home_dir)

        try:
            restore_antigravity_app(uid, gid)
            gemini_restored = restore_gemini_agy(uid, gid, home_dir)
        except PermissionError:
            print("错误: macOS 拦截了恢复 /Applications 应用包的权限。")
            print("解决方法：请尝试使用 `sudo python3 restore.py`，或在「系统设置 -> 隐私与安全性 -> App 管理」授权当前终端。")
            sys.exit(1)

        clean_shared_bundles_and_persist_dir(home_dir)

        inside_ag = is_running_inside_antigravity()
        if inside_ag:
            print("还原完成！当前在 Antigravity / Gemini 内部运行，请手动重启应用以完全恢复原版界面。")
        else:
            if not args.skip_kill:
                if gemini_restored:
                    subprocess.run(
                        ["pkill", "-f", GEMINI_AGY_BIN],
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                    )
                if os.path.isdir(APP_PATH):
                    subprocess.run(["killall", "Antigravity"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    time.sleep(0.5)
            if not args.skip_restart and os.path.isdir(APP_PATH):
                subprocess.run(["open", "-a", APP_PATH])
            print("双端完整还原成功！")
    finally:
        fcntl.flock(lock_f, fcntl.LOCK_UN)
        lock_f.close()
        try:
            os.unlink(lock_path)
        except OSError:
            pass


if __name__ == "__main__":
    main()
