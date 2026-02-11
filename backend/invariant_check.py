import os
import sys
import yaml
import subprocess
from pathlib import Path
from fnmatch import fnmatch

def load_boundaries():
    boundaries_path = Path(__file__).resolve().parent.parent / "governance/CHANGE_BOUNDARIES.yaml"
    if not boundaries_path.exists():
        print(f"❌ Missing governance/CHANGE_BOUNDARIES.yaml at {boundaries_path}")
        sys.exit(1)
    with open(boundaries_path, "r") as f:
        return yaml.safe_load(f)

def get_changed_files():
    # Detects changes in the working directory (unstaged + staged) relative to HEAD
    try:
        # Check if inside a git repo
        subprocess.run(["git", "rev-parse", "--is-inside-work-tree"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        # Get changed files (staged and unstaged)
        # diff HEAD --name-only lists files changed in working tree (and index) vs HEAD
        result = subprocess.run(["git", "diff", "HEAD", "--name-only"], capture_output=True, text=True, check=True)
        files = result.stdout.strip().splitlines()
        
        # Also check for untracked files
        untracked = subprocess.run(["git", "ls-files", "--others", "--exclude-standard"], capture_output=True, text=True, check=True)
        files.extend(untracked.stdout.strip().splitlines())
        
        return sorted(list(set(f for f in files if f.strip())))
    except subprocess.CalledProcessError:
        # Not a git repo or error running git
        print("⚠️ Warning: Not running inside a valid git repository or git error. Skipping invariant check.")
        return []

def match_glob(filename, patterns):
    for pattern in patterns:
        # Handle directory wildcards like 'frontend/src/**' manually or via fnmatch if standard
        # fnmatch standard: '*' matches everything distinct from '/'? No, in python it matches everything including /.
        # But we want strict checks.
        
        # If pattern ends with /**, treat as directory prefix
        if pattern.endswith("/**"):
            prefix = pattern[:-3]
            if filename.startswith(prefix):
                return True
        elif fnmatch(filename, pattern):
            return True
            
    return False

def main():
    scope = os.getenv("OTTO_CHANGE_SCOPE")
    if not scope:
        print("❌ GOVERNANCE INVARIANT FAILED: OTTO_CHANGE_SCOPE is not set.")
        print("   Must be set to one of: contracts, catalog, office, network, installer, governance, frontend-ui, backend-core")
        sys.exit(1)

    boundaries = load_boundaries()
    allowed_scopes = boundaries.get("scopes", {})
    always_allowed = boundaries.get("always_allowed", [])

    if scope not in allowed_scopes:
        print(f"❌ Unknown scope: {scope}")
        print(f"   Available: {', '.join(allowed_scopes.keys())}")
        sys.exit(1)

    allowed_globs = allowed_scopes[scope] + always_allowed
    
    changed_files = get_changed_files()
    violations = []

    for f in changed_files:
        if not match_glob(f, allowed_globs):
            violations.append(f)

    if violations:
        print(f"❌ INVARIANT VIOLATION: Scope '{scope}' touched out-of-bounds files:")
        for v in violations:
            print(f" - {v}")
        print(f"   Allowed patterns for {scope}:")
        for p in allowed_globs:
            print(f"   + {p}")
        sys.exit(1)

    print(f"✅ Invariant check passed for scope: {scope}")

if __name__ == "__main__":
    main()
