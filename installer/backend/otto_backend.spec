# -*- mode: python ; coding: utf-8 -*-
from pathlib import Path

from PyInstaller.utils.hooks import collect_all, collect_submodules

spec_dir = Path(SPECPATH).resolve()
repo_root = spec_dir.parents[1]
backend_dir = repo_root / "backend"

datas = [
    (str(backend_dir / "alembic"), "alembic"),
    (str(backend_dir / "alembic.ini"), "."),
]
binaries = []

# Deterministic packaging lock: explicitly include dynamic imports.
hiddenimports = []
hiddenimports += collect_submodules("sqlalchemy")
hiddenimports += collect_submodules("uvicorn")
hiddenimports += collect_submodules("pydantic")
hiddenimports += collect_submodules("email_validator")
hiddenimports += collect_submodules("fastapi")
hiddenimports += collect_submodules("starlette")
hiddenimports += collect_submodules("passlib")
hiddenimports += collect_submodules("passlib.handlers")

# Also collect package data/binaries where hooks provide them.
tmp = collect_all("sqlalchemy"); datas += tmp[0]; binaries += tmp[1]
tmp = collect_all("alembic"); datas += tmp[0]; binaries += tmp[1]
tmp = collect_all("pydantic"); datas += tmp[0]; binaries += tmp[1]
tmp = collect_all("fastapi"); datas += tmp[0]; binaries += tmp[1]
tmp = collect_all("uvicorn"); datas += tmp[0]; binaries += tmp[1]
tmp = collect_all("email_validator"); datas += tmp[0]; binaries += tmp[1]
tmp = collect_all("passlib"); datas += tmp[0]; binaries += tmp[1]

a = Analysis(
    [str(backend_dir / "backend_runner.py")],
    pathex=[str(backend_dir)],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[str(spec_dir / "hooks")],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="otto_backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="otto_backend",
)
