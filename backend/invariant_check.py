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
        "resolution/persist.py",
        "release_integration/attach.py",
        "contract_ingest/ingest.py",
        "core_write/apply.py",
        "contract_wizard/draft.py",
        "contract_attach/apply.py",
    }
    allowed_routes = {
        "ai_contracts.py"
    }

    # Prohibited models for AI-initiated writes
    forbidden_write_models = {
        "Organization", "Individual", "Artist", "Release", "Track", "Work", 
        "Contract", "PRO", "Label", "Publisher", "Royalty"
    }
    core_write_allowed_core_models = {"Organization", "Individual", "ContractParty", "Contract"}
    
    violations = []
    forbidden_methods = {"add", "commit", "delete", "execute", "update"}
    
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
                        if node.func.attr == "delete":
                            violations.append(f"Delete violation in services/ai/{rel_path}: .delete() at line {node.lineno}")
                        elif not is_allowed:
                            violations.append(f"Write violation in services/ai/{rel_path}: .{node.func.attr}() at line {node.lineno}")
                        
                        # Extra check: Even if in allowed service, must NOT add prohibited models
                        if node.func.attr == "add":
                            for arg in node.args:
                                if isinstance(arg, ast.Call) and isinstance(arg.func, ast.Name):
                                    if rel_path == "core_write/apply.py" and arg.func.id in core_write_allowed_core_models:
                                        continue
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
    royalty_violations = check_ai_royalty_governance()
    resolve_violations = check_ai_resolve_governance()
    release_integration_violations = check_release_integration_governance()
    release_validation_violations = check_release_validation_governance()
    admin_backup_violations = check_admin_backup_governance()
    core_write_violations = check_ai_core_write_governance()
    scc_violations = check_scc_governance()
    contract_wizard_violations = check_contract_wizard_governance()
    contract_from_extract_violations = check_contract_create_from_extract_governance()
    
    all_violations = (
        drift_violations
        + write_violations
        + unscoped_violations
        + analytics_violations
        + royalty_violations
        + resolve_violations
        + release_integration_violations
        + release_validation_violations
        + admin_backup_violations
        + core_write_violations
        + scc_violations
        + contract_wizard_violations
        + contract_from_extract_violations
    )
    
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


def check_ai_resolve_governance():
    """
    Ensure resolution persistence remains governed:
      - only ai_contract_resolution_runs / ai_contract_resolution_links writes
      - no core model writes via ORM add()
      - no mutating db.execute() SQL
    """
    project_root = Path(__file__).resolve().parent.parent
    target = project_root / "backend/services/ai/resolution/persist.py"

    forbidden_write_models = {
        "Organization", "Individual", "Artist", "Release", "Track", "Work",
        "Contract", "PRO", "Label", "Publisher", "Royalty", "User",
    }
    allowed_write_models = {"AIContractResolutionRun", "AIContractResolutionLink"}

    violations = []
    tree = get_ast(target)
    if not tree:
        return violations

    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        if not isinstance(node.func, ast.Attribute):
            continue

        method = node.func.attr
        if method == "add":
            for arg in node.args:
                if isinstance(arg, ast.Name):
                    var_name = arg.id
                    # Resolve variable assignment target where possible
                    for parent in ast.walk(tree):
                        if isinstance(parent, ast.Assign) and isinstance(parent.value, ast.Call):
                            if len(parent.targets) == 1 and isinstance(parent.targets[0], ast.Name) and parent.targets[0].id == var_name:
                                ctor = parent.value.func
                                if isinstance(ctor, ast.Name):
                                    model = ctor.id
                                    if model in forbidden_write_models:
                                        violations.append(
                                            f"Resolve governance violation: core model write attempt {model} via db.add() at line {node.lineno}"
                                        )
                                    if model not in allowed_write_models:
                                        violations.append(
                                            f"Resolve governance violation: non-allowed model write {model} via db.add() at line {node.lineno}"
                                        )
                elif isinstance(arg, ast.Call) and isinstance(arg.func, ast.Name):
                    model = arg.func.id
                    if model in forbidden_write_models:
                        violations.append(
                            f"Resolve governance violation: core model write attempt {model} via db.add() at line {node.lineno}"
                        )
                    if model not in allowed_write_models:
                        violations.append(
                            f"Resolve governance violation: non-allowed model write {model} via db.add() at line {node.lineno}"
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
                    f"Resolve governance violation: mutating db.execute SQL at line {node.lineno}"
                )

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


def check_ai_royalty_governance():
    """
    Royalty governance checks:
      - backend/services/ai/royalty/*.py must be read-only
      - backend/routes/ai_royalty.py may write only AIRoyaltySimulationRun
      - block mutating execute SQL (update/delete/alter/drop)
    """
    project_root = Path(__file__).resolve().parent.parent
    targets = [project_root / "backend/routes/ai_royalty.py"]
    service_root = project_root / "backend/services/ai/royalty"
    if service_root.exists():
        for root, _, files in os.walk(service_root):
            for file in files:
                if file.endswith(".py"):
                    targets.append(Path(root) / file)

    violations = []
    forbidden_methods = {"add", "commit", "delete", "update"}
    mutating_sql = ("update", "delete", "alter", "drop")
    allowed_route_model = "AIRoyaltySimulationRun"

    for path in targets:
        if not path.exists():
            continue

        tree = get_ast(path)
        if not tree:
            continue

        rel = os.path.relpath(path, project_root / "backend")
        is_route = rel == "routes/ai_royalty.py"

        for node in ast.walk(tree):
            if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
                continue

            method = node.func.attr
            if method in forbidden_methods:
                if not is_route:
                    violations.append(
                        f"Royalty read-only violation in {rel}: .{method}() at line {node.lineno}"
                    )
                elif method == "add":
                    for arg in node.args:
                        if isinstance(arg, ast.Name):
                            var_name = arg.id
                            for assign in ast.walk(tree):
                                if isinstance(assign, ast.Assign) and isinstance(assign.value, ast.Call):
                                    if (
                                        len(assign.targets) == 1
                                        and isinstance(assign.targets[0], ast.Name)
                                        and assign.targets[0].id == var_name
                                        and isinstance(assign.value.func, ast.Name)
                                    ):
                                        model = assign.value.func.id
                                        if model != allowed_route_model:
                                            violations.append(
                                                f"Royalty route violation in {rel}: non-allowed model add {model} at line {node.lineno}"
                                            )
                        elif isinstance(arg, ast.Call) and isinstance(arg.func, ast.Name):
                            model = arg.func.id
                            if model != allowed_route_model:
                                violations.append(
                                    f"Royalty route violation in {rel}: non-allowed model add {model} at line {node.lineno}"
                                )

            if method == "execute" and node.args:
                arg0 = node.args[0]
                sql_text = ""
                if isinstance(arg0, ast.Constant) and isinstance(arg0.value, str):
                    sql_text = arg0.value.lower()
                elif isinstance(arg0, ast.Call) and arg0.args:
                    first = arg0.args[0]
                    if isinstance(first, ast.Constant) and isinstance(first.value, str):
                        sql_text = first.value.lower()
                if any(keyword in sql_text for keyword in mutating_sql):
                    violations.append(
                        f"Royalty mutation violation in {rel}: mutating db.execute SQL at line {node.lineno}"
                    )

    return violations


def check_release_integration_governance():
    """
    Release Integration read-only governance checks.
    Scope:
      - backend/routes/ai_release_integration.py
      - backend/services/ai/release_integration/*.py
      - backend/services/ai/contract_ingest/*.py
    Block:
      - .add(), .commit(), .delete(), .update() outside attach.py and ingest.py
      - in attach.py/.ingest.py, .add() may target only AI-owned attach/ingest models
      - in attach.py/.ingest.py, .commit() is allowed
      - mutating db.execute SQL (insert/update/delete/alter/drop/create)
    """
    project_root = Path(__file__).resolve().parent.parent
    targets = [project_root / "backend/routes/ai_release_integration.py"]
    service_root = project_root / "backend/services/ai/release_integration"
    ingest_root = project_root / "backend/services/ai/contract_ingest"
    if service_root.exists():
        for root, _, files in os.walk(service_root):
            for file in files:
                if file.endswith(".py"):
                    targets.append(Path(root) / file)
    if ingest_root.exists():
        for root, _, files in os.walk(ingest_root):
            for file in files:
                if file.endswith(".py"):
                    targets.append(Path(root) / file)

    violations = []
    mutating_methods = {"add", "commit", "delete", "update"}
    mutating_sql = ("insert", "update", "delete", "alter", "drop", "create")
    allowed_model_writes = {
        "AIReleaseIntegrationRun",
        "AIReleaseIntegrationLink",
        "AIContractDocument",
        "AIContractWorkLink",
    }

    for target in targets:
        if not target.exists():
            continue

        tree = get_ast(target)
        if not tree:
            continue

        rel = os.path.relpath(target, project_root / "backend")
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            if not isinstance(node.func, ast.Attribute):
                continue

            method = node.func.attr
            if method in mutating_methods:
                is_allowed_write_file = (
                    rel.endswith("services/ai/release_integration/attach.py")
                    or rel.endswith("services/ai/contract_ingest/ingest.py")
                )
                if not is_allowed_write_file:
                    violations.append(
                        f"Release integration read-only violation in {rel}: .{method}() at line {node.lineno}"
                    )
                elif method == "add":
                    for arg in node.args:
                        if isinstance(arg, ast.Name):
                            var_name = arg.id
                            for assign in ast.walk(tree):
                                if isinstance(assign, ast.Assign) and isinstance(assign.value, ast.Call):
                                    if (
                                        len(assign.targets) == 1
                                        and isinstance(assign.targets[0], ast.Name)
                                        and assign.targets[0].id == var_name
                                        and isinstance(assign.value.func, ast.Name)
                                    ):
                                        model = assign.value.func.id
                                        if model not in allowed_model_writes:
                                            violations.append(
                                                f"Release integration attach violation in {rel}: non-allowed model add {model} at line {node.lineno}"
                                            )
                        elif isinstance(arg, ast.Call) and isinstance(arg.func, ast.Name):
                            model = arg.func.id
                            if model not in allowed_model_writes:
                                violations.append(
                                    f"Release integration attach violation in {rel}: non-allowed model add {model} at line {node.lineno}"
                                )

            if method == "execute" and node.args:
                arg0 = node.args[0]
                sql_text = ""
                if isinstance(arg0, ast.Constant) and isinstance(arg0.value, str):
                    sql_text = arg0.value.lower()
                elif isinstance(arg0, ast.Call) and arg0.args:
                    first = arg0.args[0]
                    if isinstance(first, ast.Constant) and isinstance(first.value, str):
                        sql_text = first.value.lower()
                if any(keyword in sql_text for keyword in mutating_sql):
                    violations.append(
                        f"Release integration read-only violation in {rel}: mutating db.execute SQL at line {node.lineno}"
                    )

    return violations


def check_release_validation_governance():
    """
    Release validation governance checks:
      - backend/routes/ai_release_validation.py must remain read-only
      - backend/services/ai/release_validation/*.py must remain read-only
      - block .add() .commit() .delete() .update()
      - block mutating db.execute SQL (insert/update/delete)
    """
    project_root = Path(__file__).resolve().parent.parent
    targets = [project_root / "backend/routes/ai_release_validation.py"]
    service_root = project_root / "backend/services/ai/release_validation"
    if service_root.exists():
        for root, _, files in os.walk(service_root):
            for file in files:
                if file.endswith(".py"):
                    targets.append(Path(root) / file)

    violations = []
    forbidden_methods = {"add", "commit", "delete", "update"}

    for path in targets:
        if not path.exists():
            continue

        tree = get_ast(path)
        if not tree:
            continue

        rel = os.path.relpath(path, project_root / "backend")
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
                continue

            method = node.func.attr
            if method in forbidden_methods:
                violations.append(
                    f"Release validation read-only violation in {rel}: .{method}() at line {node.lineno}"
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
                        f"Release validation mutation violation in {rel}: db.execute mutating SQL at line {node.lineno}"
                    )

    return violations


def check_admin_backup_governance():
    """
    Admin backup governance checks:
      - Scope:
        - backend/routes/backup.py
        - backend/services/admin_backup/*.py
      - Writes allowed only to AdminBackupArtifact, AdminRestoreAudit, and AdminBackupRestoreEvent
      - Block writes to core models
      - Block mutating execute SQL (insert/update/delete/alter/drop/create)
    """
    project_root = Path(__file__).resolve().parent.parent
    targets = [project_root / "backend/routes/backup.py"]
    service_root = project_root / "backend/services/admin_backup"
    if service_root.exists():
        for root, _, files in os.walk(service_root):
            for file in files:
                if file.endswith(".py"):
                    targets.append(Path(root) / file)

    violations = []
    mutating_methods = {"add", "commit", "delete", "update"}
    mutating_sql = ("insert", "update", "delete", "alter", "drop", "create")
    allowed_models = {"AdminBackupArtifact", "AdminRestoreAudit", "AdminBackupRestoreEvent"}
    forbidden_models = {
        "Organization",
        "Individual",
        "Artist",
        "Release",
        "Track",
        "Work",
        "Contract",
        "PRO",
        "Label",
        "Publisher",
        "Royalty",
        "User",
    }

    for path in targets:
        if not path.exists():
            continue
        tree = get_ast(path)
        if not tree:
            continue
        rel = os.path.relpath(path, project_root / "backend")

        for node in ast.walk(tree):
            if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
                continue

            method = node.func.attr
            if method in mutating_methods:
                if method == "add":
                    for arg in node.args:
                        model = None
                        if isinstance(arg, ast.Call) and isinstance(arg.func, ast.Name):
                            model = arg.func.id
                        elif isinstance(arg, ast.Name):
                            var_name = arg.id
                            for assign in ast.walk(tree):
                                if isinstance(assign, ast.Assign) and isinstance(assign.value, ast.Call):
                                    if (
                                        len(assign.targets) == 1
                                        and isinstance(assign.targets[0], ast.Name)
                                        and assign.targets[0].id == var_name
                                        and isinstance(assign.value.func, ast.Name)
                                    ):
                                        model = assign.value.func.id
                        if model:
                            if model in forbidden_models:
                                violations.append(
                                    f"Admin backup governance violation in {rel}: core model write attempt {model} via .add() at line {node.lineno}"
                                )
                            if model not in allowed_models:
                                violations.append(
                                    f"Admin backup governance violation in {rel}: non-allowlisted model write {model} via .add() at line {node.lineno}"
                                )

            if method == "execute" and node.args:
                arg0 = node.args[0]
                sql_text = ""
                if isinstance(arg0, ast.Constant) and isinstance(arg0.value, str):
                    sql_text = arg0.value.lower()
                elif isinstance(arg0, ast.Call) and arg0.args:
                    first = arg0.args[0]
                    if isinstance(first, ast.Constant) and isinstance(first.value, str):
                        sql_text = first.value.lower()
                if any(keyword in sql_text for keyword in mutating_sql):
                    violations.append(
                        f"Admin backup governance violation in {rel}: mutating db.execute SQL at line {node.lineno}"
                    )

    return violations


def check_ai_core_write_governance():
    """
    Core write governance:
      - propose.py and routes/ai_core_write.py are read-only
      - apply.py is the only write allowlist location
      - apply.py may write AI proposal/apply models and explicit core allowlist
      - no mutating execute SQL in propose/route files
    """
    project_root = Path(__file__).resolve().parent.parent
    route_path = project_root / "backend/routes/ai_core_write.py"
    propose_path = project_root / "backend/services/ai/core_write/propose.py"
    apply_path = project_root / "backend/services/ai/core_write/apply.py"

    violations = []
    read_only_targets = [route_path, propose_path]
    forbidden_methods = {"add", "commit", "delete", "update"}
    mutating_sql = ("insert", "update", "delete", "alter", "drop", "create")

    for path in read_only_targets:
        if not path.exists():
            continue
        tree = get_ast(path)
        if not tree:
            continue
        rel = os.path.relpath(path, project_root / "backend")
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
                continue
            if node.func.attr in forbidden_methods:
                violations.append(
                    f"Core write governance violation in {rel}: .{node.func.attr}() at line {node.lineno}"
                )
            if node.func.attr == "execute" and node.args:
                arg0 = node.args[0]
                sql_text = ""
                if isinstance(arg0, ast.Constant) and isinstance(arg0.value, str):
                    sql_text = arg0.value.lower()
                elif isinstance(arg0, ast.Call) and arg0.args and isinstance(arg0.args[0], ast.Constant) and isinstance(arg0.args[0].value, str):
                    sql_text = arg0.args[0].value.lower()
                if any(keyword in sql_text for keyword in mutating_sql):
                    violations.append(
                        f"Core write governance violation in {rel}: mutating db.execute SQL at line {node.lineno}"
                    )

    if apply_path.exists():
        tree = get_ast(apply_path)
        if tree:
            rel = os.path.relpath(apply_path, project_root / "backend")
            allowed_models = {
                "AICoreWriteProposalRun",
                "AICoreWriteProposalItem",
                "AICoreWriteApplyEvent",
                "ContractParty",
                "Organization",
                "Individual",
            }
            forbidden_models = {
                "Artist",
                "Release",
                "Track",
                "Work",
                "ContractAsset",
                "ContractSplit",
                "ContractSplitGroup",
            }
            for node in ast.walk(tree):
                if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
                    continue
                if node.func.attr == "add":
                    for arg in node.args:
                        model = None
                        if isinstance(arg, ast.Call) and isinstance(arg.func, ast.Name):
                            model = arg.func.id
                        elif isinstance(arg, ast.Name):
                            for assign in ast.walk(tree):
                                if (
                                    isinstance(assign, ast.Assign)
                                    and len(assign.targets) == 1
                                    and isinstance(assign.targets[0], ast.Name)
                                    and assign.targets[0].id == arg.id
                                    and isinstance(assign.value, ast.Call)
                                    and isinstance(assign.value.func, ast.Name)
                                ):
                                    model = assign.value.func.id
                        if model in forbidden_models:
                            violations.append(
                                f"Core write governance violation in {rel}: forbidden model write {model} via .add() at line {node.lineno}"
                            )
                        if model and model not in allowed_models:
                            violations.append(
                                f"Core write governance violation in {rel}: non-allowlisted model write {model} via .add() at line {node.lineno}"
                            )
                if node.func.attr == "execute" and node.args:
                    arg0 = node.args[0]
                    sql_text = ""
                    if isinstance(arg0, ast.Constant) and isinstance(arg0.value, str):
                        sql_text = arg0.value.lower()
                    elif isinstance(arg0, ast.Call) and arg0.args and isinstance(arg0.args[0], ast.Constant) and isinstance(arg0.args[0].value, str):
                        sql_text = arg0.args[0].value.lower()
                    if any(keyword in sql_text for keyword in mutating_sql):
                        violations.append(
                            f"Core write governance violation in {rel}: mutating db.execute SQL at line {node.lineno}"
                        )

    return violations


def check_scc_governance():
    """
    SCC governance:
      - backend/routes/system_control_center.py is read-only (no ORM writes)
      - backend/services/admin/scc/*.py is read-only (no ORM writes)
      - mutating db.execute SQL blocked (insert/update/delete/alter/drop/create)
      - filesystem pointer writes are allowed (not checked by AST)
    """
    project_root = Path(__file__).resolve().parent.parent
    targets = [project_root / "backend/routes/system_control_center.py"]
    scc_root = project_root / "backend/services/admin/scc"
    if scc_root.exists():
        for root, _, files in os.walk(scc_root):
            for file in files:
                if file.endswith(".py"):
                    targets.append(Path(root) / file)

    violations = []
    forbidden_methods = {"add", "commit", "delete", "update"}
    mutating_sql = ("insert", "update", "delete", "alter", "drop", "create")

    for path in targets:
        if not path.exists():
            continue
        tree = get_ast(path)
        if not tree:
            continue
        rel = os.path.relpath(path, project_root / "backend")
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
                continue
            if node.func.attr in forbidden_methods:
                violations.append(
                    f"SCC governance violation in {rel}: .{node.func.attr}() at line {node.lineno}"
                )
            if node.func.attr == "execute" and node.args:
                arg0 = node.args[0]
                sql_text = ""
                if isinstance(arg0, ast.Constant) and isinstance(arg0.value, str):
                    sql_text = arg0.value.lower()
                elif isinstance(arg0, ast.Call) and arg0.args and isinstance(arg0.args[0], ast.Constant) and isinstance(arg0.args[0].value, str):
                    sql_text = arg0.args[0].value.lower()
                if any(keyword in sql_text for keyword in mutating_sql):
                    violations.append(
                        f"SCC governance violation in {rel}: mutating db.execute SQL at line {node.lineno}"
                    )

    return violations


def check_contract_wizard_governance():
    """
    Contract wizard governance:
      - Read-only:
        - backend/routes/contracts_wizard.py
        - backend/services/ai/contract_attach/plan.py
      - Writes allowed only in:
        - backend/services/ai/contract_wizard/draft.py (AIContractDraft)
        - backend/services/ai/contract_create/from_draft.py (Contract, ContractDocument)
        - backend/services/ai/contract_attach/apply.py (AIContractAttachRun, AIContractAttachLink)
      - Block mutating execute SQL in all these files.
    """
    project_root = Path(__file__).resolve().parent.parent
    targets = [
        project_root / "backend/routes/contracts_wizard.py",
        project_root / "backend/services/ai/contract_wizard/draft.py",
        project_root / "backend/services/contract_create/from_draft.py",
        project_root / "backend/services/ai/contract_attach/plan.py",
        project_root / "backend/services/ai/contract_attach/apply.py",
    ]
    violations = []
    forbidden_methods = {"add", "commit", "delete", "update"}
    mutating_sql = ("insert", "update", "delete", "alter", "drop", "create")
    model_allowlist = {
        "services/ai/contract_wizard/draft.py": {"AIContractDraft"},
        "services/contract_create/from_draft.py": {"Contract", "ContractDocument"},
        "services/ai/contract_attach/apply.py": {"AIContractAttachRun", "AIContractAttachLink"},
    }
    write_allowlist_files = set(model_allowlist.keys())

    for path in targets:
        if not path.exists():
            continue
        tree = get_ast(path)
        if not tree:
            continue
        rel = os.path.relpath(path, project_root / "backend")
        allow_writes = rel in write_allowlist_files
        allowed_models = model_allowlist.get(rel, set())

        for node in ast.walk(tree):
            if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
                continue

            method = node.func.attr
            if method in forbidden_methods:
                if not allow_writes:
                    violations.append(
                        f"Contract wizard governance violation in {rel}: .{method}() at line {node.lineno}"
                    )
                elif method == "add":
                    for arg in node.args:
                        model = None
                        if isinstance(arg, ast.Call) and isinstance(arg.func, ast.Name):
                            model = arg.func.id
                        elif isinstance(arg, ast.Name):
                            for assign in ast.walk(tree):
                                if (
                                    isinstance(assign, ast.Assign)
                                    and len(assign.targets) == 1
                                    and isinstance(assign.targets[0], ast.Name)
                                    and assign.targets[0].id == arg.id
                                    and isinstance(assign.value, ast.Call)
                                    and isinstance(assign.value.func, ast.Name)
                                ):
                                    model = assign.value.func.id
                        if model and model not in allowed_models:
                            violations.append(
                                f"Contract wizard governance violation in {rel}: non-allowlisted model write {model} via .add() at line {node.lineno}"
                            )

            if method == "execute" and node.args:
                arg0 = node.args[0]
                sql_text = ""
                if isinstance(arg0, ast.Constant) and isinstance(arg0.value, str):
                    sql_text = arg0.value.lower()
                elif isinstance(arg0, ast.Call) and arg0.args and isinstance(arg0.args[0], ast.Constant) and isinstance(arg0.args[0].value, str):
                    sql_text = arg0.args[0].value.lower()
                if any(keyword in sql_text for keyword in mutating_sql):
                    violations.append(
                        f"Contract wizard governance violation in {rel}: mutating db.execute SQL at line {node.lineno}"
                    )

    return violations


def check_contract_create_from_extract_governance():
    """
    Governed create-from-extract checks:
      - Scope: backend/services/contracts/create_from_extract.py
      - Must not import linking/resolution/core_write services
      - ORM writes allowed only to Contract and ContractDocument
      - Block mutating execute SQL
    """
    project_root = Path(__file__).resolve().parent.parent
    path = project_root / "backend/services/contracts/create_from_extract.py"
    violations = []
    if not path.exists():
        return violations

    tree = get_ast(path)
    if not tree:
        return violations

    rel = os.path.relpath(path, project_root / "backend")
    forbidden_import_tokens = (
        "services.ai.linking",
        "services.ai.resolution",
        "services.ai.core_write",
    )
    allowed_models = {"Contract", "ContractDocument"}
    forbidden_methods = {"delete", "update"}
    mutating_sql = ("insert", "update", "delete", "alter", "drop", "create")

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                if any(token in alias.name for token in forbidden_import_tokens):
                    violations.append(
                        f"Contract from_extract governance violation in {rel}: forbidden import {alias.name} at line {node.lineno}"
                    )
        elif isinstance(node, ast.ImportFrom):
            module = node.module or ""
            if any(token in module for token in forbidden_import_tokens):
                violations.append(
                    f"Contract from_extract governance violation in {rel}: forbidden import from {module} at line {node.lineno}"
                )

        if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
            continue
        method = node.func.attr

        if method in forbidden_methods:
            violations.append(
                f"Contract from_extract governance violation in {rel}: .{method}() at line {node.lineno}"
            )

        if method == "add":
            for arg in node.args:
                model = None
                if isinstance(arg, ast.Call) and isinstance(arg.func, ast.Name):
                    model = arg.func.id
                elif isinstance(arg, ast.Name):
                    for assign in ast.walk(tree):
                        if (
                            isinstance(assign, ast.Assign)
                            and len(assign.targets) == 1
                            and isinstance(assign.targets[0], ast.Name)
                            and assign.targets[0].id == arg.id
                            and isinstance(assign.value, ast.Call)
                            and isinstance(assign.value.func, ast.Name)
                        ):
                            model = assign.value.func.id
                if model and model not in allowed_models:
                    violations.append(
                        f"Contract from_extract governance violation in {rel}: non-allowlisted model write {model} via .add() at line {node.lineno}"
                    )

        if method == "execute" and node.args:
            arg0 = node.args[0]
            sql_text = ""
            if isinstance(arg0, ast.Constant) and isinstance(arg0.value, str):
                sql_text = arg0.value.lower()
            elif isinstance(arg0, ast.Call) and arg0.args and isinstance(arg0.args[0], ast.Constant) and isinstance(arg0.args[0].value, str):
                sql_text = arg0.args[0].value.lower()
            if any(keyword in sql_text for keyword in mutating_sql):
                violations.append(
                    f"Contract from_extract governance violation in {rel}: mutating db.execute SQL at line {node.lineno}"
                )

    return violations

if __name__ == "__main__":
    main()
