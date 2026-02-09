from PyInstaller.utils.hooks import collect_submodules

# passlib loads handlers dynamically; bundle them all
hiddenimports = collect_submodules("passlib") + collect_submodules("passlib.handlers")

