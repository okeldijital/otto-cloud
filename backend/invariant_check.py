import ast
import sys
from pathlib import Path

def get_ast(path: Path):
    if not path.exists():
        return None
    with open(path, "r") as f:
        return ast.parse(f.read())

import os

def check_ai_drift():
    """Verify core routes do not import AI services via AST."""
    project_root = Path(__file__).resolve().parent.parent
    prohibited_routes = [
        "backend/routes/catalog.py",
        "backend/routes/contracts.py",
        "backend/routes/network.py",
    ]
    violations = []
    
    for route_rel_path in prohibited_routes:
        abs_path = project_root / route_rel_path
        tree = get_ast(abs_path)
        if not tree:
            continue
            
        for node in ast.walk(tree):
            # Check 'import services.ai'
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if "services.ai" in alias.name or "routes.ai" in alias.name:
                        violations.append(f"Drift: {route_rel_path} imports {alias.name}")
            # Check 'from services.ai import ...'
            elif isinstance(node, ast.ImportFrom):
                if node.module and ("services.ai" in node.module or "routes.ai" in node.module):
                    violations.append(f"Drift: {route_rel_path} imports from {node.module}")
                    
    return violations

def check_ai_writes():
    """Verify AI services do not perform write operations (except approved)."""
    project_root = Path(__file__).resolve().parent.parent
    ai_services_root = project_root / "backend/services/ai"
    ai_routes_root = project_root / "backend/routes"
    
    # Approved locations for mediated persistence
    allowed_services = {
        "audit.py",
        "resolution/persist.py"
    }
    allowed_routes = {
        "ai_contracts.py"
    }

    # Prohibited models for AI-initiated writes
    forbidden_write_models = {
        "Organization", "Individual", "Artist", "Release", "Track", "Work", 
        "Contract", "PRO", "Label", "Publisher", "Royalty"
    }
    
    violations = []
    forbidden_methods = {"add", "commit", "delete", "execute"}
    
    # 1. Check AI Services
    for root, dirs, files in os.walk(ai_services_root):
        for file in files:
            if not file.endswith(".py"):
                continue
                
            rel_path = os.path.relpath(os.path.join(root, file), ai_services_root)
            is_allowed = rel_path in allowed_services
            
            full_path = Path(root) / file
            tree = get_ast(full_path)
            if not tree: continue
            
            for node in ast.walk(tree):
                if isinstance(node, ast.Call):
                    if isinstance(node.func, ast.Attribute) and node.func.attr in forbidden_methods:
                        if not is_allowed:
                            violations.append(f"Write violation in services/ai/{rel_path}: .{node.func.attr}() at line {node.lineno}")
                        
                        # Extra check: Even if in allowed service, must NOT add prohibited models
                        if node.func.attr == "add":
                            for arg in node.args:
                                if isinstance(arg, ast.Call) and isinstance(arg.func, ast.Name):
                                    if arg.func.id in forbidden_write_models:
                                        violations.append(f"Integrity violation in services/ai/{rel_path}: AI attempted write to core model {arg.func.id} at line {node.lineno}")

    # 2. Check AI Routes (e.g. ai_contracts.py)
    # Note: Generally routes should not query DB directly, but OTTO V1 allows it for audit/runs.
    for file in allowed_routes:
        full_path = ai_routes_root / file
        tree = get_ast(full_path)
        if not tree: continue
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
               if isinstance(node.func, ast.Attribute) and node.func.attr == "add":
                    for arg in node.args:
                        if isinstance(arg, ast.Call) and isinstance(arg.func, ast.Name):
                            if arg.func.id in forbidden_write_models:
                                violations.append(f"Integrity violation in routes/{file}: AI route attempted write to core model {arg.func.id} at line {node.lineno}")

    return violations

def main():
    print("🛡️ Running Governed AI Invariant Check (AST)...")
    
    drift_violations = check_ai_drift()
    write_violations = check_ai_writes()
    unscoped_violations = check_ai_unscoped_queries()
    analytics_violations = check_ai_analytics_governance()
    
    all_violations = drift_violations + write_violations + unscoped_violations + analytics_violations
    
    if all_violations:
        for v in all_violations:
            print(f"❌ {v}")
        sys.exit(1)
    else:
        print("✅ AI invariants pass (No drift, No writes in AI tools to production DB, No unscoped network queries).")
        sys.exit(0)

def check_ai_unscoped_queries():
    """
    Verify AI linking services do not query Network entities (Individual, Organization)
    without tenant isolation. All such queries must include an 'organization_id' filter.
    """
    project_root = Path(__file__).resolve().parent.parent
    linking_root = project_root / "backend/services/ai/linking"
    
    violations = []
    risky_models = {"Individual", "Organization"}
    
    if not linking_root.exists():
        return violations

    for root, _, files in os.walk(linking_root):
        for file in files:
            if not file.endswith(".py"):
                continue
                
            full_path = Path(root) / file
            tree = get_ast(full_path)
            if not tree: continue
            
            rel_path = os.path.relpath(full_path, linking_root)
            
            for node in ast.walk(tree):
                if isinstance(node, ast.Call):
                    # Check for db.query(Individual) / db.query(Organization)
                    is_risky_query = False
                    model_name = ""
                    if isinstance(node.func, ast.Attribute) and node.func.attr == "query":
                        for arg in node.args:
                            if isinstance(arg, ast.Name) and arg.id in risky_models:
                                is_risky_query = True
                                model_name = arg.id
                    
                    if is_risky_query:
                        # Heuristic: Find if 'organization_id' is present in the line or nearby.
                        # For AI Link hardening, we require it to be on the same logical expression.
                        with open(full_path, "r") as f:
                            lines = f.readlines()
                            # Check current and next 2 lines for 'organization_id'
                            start_l = max(0, node.lineno - 1)
                            end_l = min(len(lines), node.lineno + 2)
                            context = "".join(lines[start_l:end_l])
                            
                            if "organization_id" not in context:
                                violations.append(f"Unscoped query violation in services/ai/linking/{rel_path}: db.query({model_name}) at line {node.lineno} missing organization_id filter.")
    
    return violations


def check_ai_analytics_governance():
    """
    Verify analytics v1 remains read-only and org-scoped.
    Scope:
      - backend/routes/ai_analytics.py
      - backend/services/ai/analytics/*.py
    """
    project_root = Path(__file__).resolve().parent.parent
    targets = [project_root / "backend/routes/ai_analytics.py"]
    analytics_root = project_root / "backend/services/ai/analytics"
    if analytics_root.exists():
        for root, _, files in os.walk(analytics_root):
            for file in files:
                if file.endswith(".py"):
                    targets.append(Path(root) / file)

    violations = []
    mutating_methods = {"add", "commit", "delete"}
    org_scope_models = {"AIAuditLog", "AIContractResolutionRun"}

    for path in targets:
        if not path.exists():
            continue
        tree = get_ast(path)
        if not tree:
            continue

        rel = os.path.relpath(path, project_root / "backend")
        with open(path, "r") as f:
            lines = f.readlines()

        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue

            if isinstance(node.func, ast.Attribute):
                method = node.func.attr

                if method in mutating_methods:
                    violations.append(
                        f"Analytics read-only violation in {rel}: .{method}() at line {node.lineno}"
                    )

                if method == "execute" and node.args:
                    arg0 = node.args[0]
                    sql_text = ""
                    if isinstance(arg0, ast.Constant) and isinstance(arg0.value, str):
                        sql_text = arg0.value.lower()
                    elif isinstance(arg0, ast.Call) and arg0.args:
                        inner = arg0.args[0]
                        if isinstance(inner, ast.Constant) and isinstance(inner.value, str):
                            sql_text = inner.value.lower()
                    if any(keyword in sql_text for keyword in ("insert", "update", "delete")):
                        violations.append(
                            f"Analytics mutation violation in {rel}: db.execute mutating SQL at line {node.lineno}"
                        )

                if method == "query":
                    touched_models = []
                    for arg in node.args:
                        if isinstance(arg, ast.Name) and arg.id in org_scope_models:
                            touched_models.append(arg.id)
                        if isinstance(arg, ast.Attribute) and isinstance(arg.value, ast.Name):
                            if arg.value.id in org_scope_models:
                                touched_models.append(arg.value.id)
                    if touched_models:
                        start_l = max(0, node.lineno - 1)
                        end_l = min(len(lines), node.lineno + 10)
                        context = "".join(lines[start_l:end_l]).replace(" ", "")
                        if "organization_id==org_id" not in context:
                            model_csv = ",".join(sorted(set(touched_models)))
                            violations.append(
                                f"Analytics org-scope violation in {rel}: query touches {model_csv} without organization_id == org_id near line {node.lineno}"
                            )

    return violations

if __name__ == "__main__":
    main()
