import ast
import sys
from pathlib import Path

def get_ast(path: Path):
    if not path.exists():
        return None
    with open(path, "r") as f:
        return ast.parse(f.read())

def check_ai_drift():
    """Verify core routes do not import AI services via AST."""
    prohibited_routes = [
        "backend/routes/catalog.py",
        "backend/routes/contracts.py",
        "backend/routes/network.py",
    ]
    violations = []
    project_root = Path(__file__).resolve().parent.parent

    for route_rel_path in prohibited_routes:
        abs_path = project_root / route_rel_path
        tree = get_ast(abs_path)
        if not tree:
            continue
            
        for node in ast.walk(tree):
            # Check 'import services.ai'
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name.startswith("services.ai") or alias.name.startswith("routes.ai"):
                        violations.append(f"Drift: {route_rel_path} imports {alias.name}")
            # Check 'from services.ai import ...'
            elif isinstance(node, ast.ImportFrom):
                if node.module and (node.module.startswith("services.ai") or node.module.startswith("routes.ai")):
                    violations.append(f"Drift: {route_rel_path} imports from {node.module}")
                    
    return violations

def check_ai_writes():
    """Verify AI tools do not perform write operations via AST."""
    # Specifically targeted check for tools.py as per instructions
    tools_path = Path(__file__).resolve().parent.parent / "backend/services/ai/tools.py"
    tree = get_ast(tools_path)
    violations = []
    
    if not tree:
        return violations

    forbidden_methods = {"add", "commit", "delete", "update"}
    
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            # Detect obj.method()
            if isinstance(node.func, ast.Attribute):
                if node.func.attr in forbidden_methods:
                    # Double check if it's likely a DB session operation
                    # We are strict here: any method with these names in tools.py is a violation
                    violations.append(f"Write violation in tools.py: .{node.func.attr}() at line {node.lineno}")
                    
    return violations

def main():
    print("🛡️ Running Governed AI Invariant Check (AST)...")
    
    drift_violations = check_ai_drift()
    write_violations = check_ai_writes()
    
    all_violations = drift_violations + write_violations
    
    if all_violations:
        for v in all_violations:
            print(f"❌ {v}")
        sys.exit(1)
    else:
        print("✅ AI invariants pass (No drift, No writes).")
        sys.exit(0)

if __name__ == "__main__":
    main()
