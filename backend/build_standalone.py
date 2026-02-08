"""
Build script to create standalone backend executable for Tauri bundling.
"""
import PyInstaller.__main__
import os
import shutil

# Clean previous builds
if os.path.exists('dist'):
    shutil.rmtree('dist')
if os.path.exists('build'):
    shutil.rmtree('build')

# PyInstaller configuration
PyInstaller.__main__.run([
    'main.py',
    '--onefile',
    '--name=backend',
    '--add-data=alembic:alembic',
    '--add-data=alembic.ini:.',
    '--hidden-import=uvicorn.logging',
    '--hidden-import=uvicorn.loops',
    '--hidden-import=uvicorn.loops.auto',
    '--hidden-import=uvicorn.protocols',
    '--hidden-import=uvicorn.protocols.http',
    '--hidden-import=uvicorn.protocols.http.auto',
    '--hidden-import=uvicorn.protocols.websockets',
    '--hidden-import=uvicorn.protocols.websockets.auto',
    '--hidden-import=uvicorn.lifespan',
    '--hidden-import=uvicorn.lifespan.on',
    '--hidden-import=sqlalchemy.sql.default_comparator',
    '--collect-all=fastapi',
    '--collect-all=pydantic',
    '--collect-all=alembic',
    '--noconfirm',
])

print("\n✅ Backend executable created at: dist/backend")
print("Next step: Copy to Tauri binaries directory")
