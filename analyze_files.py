#!/usr/bin/env python3
import json
import os
from pathlib import Path

def get_file_type(file_path):
    """Determine if it's a file or directory"""
    # From the filelist, everything appears to be files
    return "file"

def get_category(file_path):
    """Categorize the file based on extension and path"""
    path_str = str(file_path).lower()
    
    # Configuration files
    if any(config in path_str for config in ['.env', '.gitignore', 'dockerfile', 'vite.config', 'eslint.config']):
        return "configuration"
    
    # Database files
    if any(db in path_str for db in ['.sqlite', '.db']):
        return "database"
    
    # Log/cache files
    if any(cache in path_str for cache in ['__pycache__', '.pytest_cache', 'cachedir.tag']):
        return "cache"
    
    # Documentation
    if any(doc in path_str for doc in ['.md', '.txt', 'readme', 'license']):
        return "documentation"
    
    # Python source files
    if file_path.endswith('.py'):
        # Further categorize Python files
        if 'test' in path_str:
            return "test"
        elif 'migration' in path_str or 'alembic' in path_str or 'version' in path_str:
            return "migration"
        elif 'model' in path_str:
            return "model"
        elif 'route' in path_str:
            return "route"
        elif 'schema' in path_str:
            return "schema"
        elif 'service' in path_str:
            return "service"
        elif 'util' in path_str or 'utils' in path_str:
            return "utility"
        elif 'controller' in path_str:
            return "controller"
        elif 'main' in path_str or 'runner' in path_str or 'build' in path_str:
            return "application"
        else:
            return "source"
    
    # JavaScript/TypeScript files
    if file_path.endswith(('.js', '.jsx', '.ts', '.tsx')):
        if 'test' in path_str:
            return "test"
        elif 'config' in path_str:
            return "configuration"
        else:
            return "source"
    
    # CSS/Styling files
    if file_path.endswith(('.css', '.scss', '.sass')):
        return "styling"
    
    # Image/icon files
    if file_path.endswith(('.icns', '.ico', '.png', '.jpg', '.jpeg', '.svg', '.gif')):
        return "asset"
    
    # Rust files
    if file_path.endswith(('.rs',)):
        return "source"
    
    # SQL files
    if file_path.endswith(('.sql',)):
        return "database"
    
    # Shell scripts
    if file_path.endswith(('.sh', '.bash', '.zsh')):
        return "script"
    
    # JSON/YAML/TOML configs
    if file_path.endswith(('.json', '.yaml', '.yml', '.toml', '.xml')):
        return "configuration"
    
    # Text files
    if file_path.endswith(('.txt', '.log', '.md', '.rst')):
        return "documentation"
    
    # Binary/data files
    if file_path.endswith(('.doc', '.docx', '.pdf', '.zip', '.tar', '.gz')):
        return "data"
    
    # Default
    return "other"

def get_risk_level(file_path, category):
    """Assess risk level based on file type and category"""
    path_str = str(file_path).lower()
    
    # High risk: files that could contain secrets, configs, or cause damage if modified
    high_risk_patterns = [
        '.env', 'secret', 'key', 'credential', 'password', 
        '.pem', '.p12', '.pfx', '.gpg', '.ssh', '.gnupg',
        'docker-compose', 'dockerfile', 'makefile', 'build.',
        'database', '.sqlite', '.db'
    ]
    
    # Medium risk: source code, configs, scripts that affect behavior
    medium_risk_patterns = [
        'config', 'setting', 'route', 'controller', 'service',
        'model', 'schema', 'migration', 'main', 'application',
        'script', 'build', 'deploy', 'install', 'setup'
    ]
    
    # Check for high risk
    if any(pattern in path_str for pattern in high_risk_patterns):
        return "high"
    
    # Check for medium risk
    if any(pattern in path_str for pattern in medium_risk_patterns):
        return "medium"
    
    # Specific categories that are usually medium risk
    if category in ['configuration', 'database', 'source', 'migration']:
        return "medium"
    
    # Low risk: tests, docs, cache, assets
    if category in ['test', 'documentation', 'cache', 'asset', 'other']:
        return "low"
    
    # Default to low
    return "low"

def get_description(file_path):
    """Generate a brief description based on filename and path"""
    filename = os.path.basename(file_path)
    path_str = str(file_path)
    
    # Remove leading './' if present
    if path_str.startswith('./'):
        path_str = path_str[2:]
    
    # Special cases for known files
    special_cases = {
        '.gitignore': 'Git ignore file specifying intentionally untracked files to ignore',
        'Dockerfile': 'Docker container definition file',
        '.env.example': 'Example environment variables template',
        'database.sqlite': 'SQLite database file',
        'main.py': 'Main application entry point',
        'backend_runner.py': 'Backend application runner script',
        'build_backend.py': 'Backend build script',
        'build_standalone.py': 'Standalone build script',
        'config.py': 'Application configuration module',
        'governance.py': 'Governance-related functionality',
        'governance_check.py': 'Governance validation script',
        'governance_gate.py': 'Governance gatekeeping logic',
        'invariant_check.py': 'Data invariant validation script',
        'preflight_check.py': 'Pre-deployment validation script',
        'finalize_main.py': 'Main finalization script',
        'fix_db_schema.py': 'Database schema correction script',
        'inspect_db.py': 'Database inspection utility',
        'inspect_correct_db.py': 'Corrected database inspection utility',
        'patch_audit_log.py': 'Audit log patching script',
        'seed_scoping.py': 'Database seeding script for scoping',
        'add_contact_image_col.py': 'Script to add contact image column',
        'analyze_spreadsheet.py': 'Spreadsheet analysis utility',
        'test-report.js': 'Node.js test reporting script',
        'test-report-node.js': 'Node.js test reporting script',
        'run_test.js': 'Test execution script',
        'run_test2.js': 'Alternative test execution script',
        'verify_schedule.py': 'Schedule verification script',
        'otto.icns': 'Application icon file',
        'soak_pdfs/Busi Mhlongo Afrodesia Remixes M2KR.doc': 'Test document for PDF processing',
        'parse_dom.js': 'DOM parsing utility',
        'preload.js': 'Preload script for application',
        'main.js': 'Main JavaScript entry point'
    }
    
    if filename in special_cases:
        return special_cases[filename]
    
    # Check path for special cases
    for key, desc in special_cases.items():
        if key in path_str:
            return desc
    
    # Generate description based on extension and path
    ext = os.path.splitext(filename)[1].lower()
    
    if ext == '.py':
        if 'test' in path_str:
            return f'Python test file: {filename}'
        elif 'migration' in path_str or 'alembic' in path_str:
            return f'Database migration script: {filename}'
        elif 'model' in path_str:
            return f'Python data model definition: {filename}'
        elif 'route' in path_str:
            return f'API route handler: {filename}'
        elif 'schema' in path_str:
            return f'Data validation schema: {filename}'
        elif 'service' in path_str:
            return f'Business logic service: {filename}'
        elif 'util' in path_str or 'utils' in path_str:
            return f'Utility module: {filename}'
        elif 'controller' in path_str:
            return f'Request controller: {filename}'
        else:
            return f'Python source file: {filename}'
    
    elif ext in ['.js', '.jsx', '.ts', '.tsx']:
        if 'test' in path_str:
            return f'JavaScript/TypeScript test file: {filename}'
        elif 'config' in path_str:
            return f'Configuration file: {filename}'
        elif 'service' in path_str:
            return f'Service module: {filename}'
        elif 'component' in path_str:
            return f'UI component: {filename}'
        elif 'hook' in path_str:
            return f'React hook: {filename}'
        elif 'api' in path_str:
            return f'API client module: {filename}'
        else:
            return f'JavaScript/TypeScript source file: {filename}'
    
    elif ext == '.css':
        return f'Stylesheet: {filename}'
    
    elif ext in ['.html', '.htm']:
        return f'HTML template/file: {filename}'
    
    elif ext in ['.json', '.yaml', '.yml', '.toml']:
        return f'Configuration file: {filename}'
    
    elif ext in ['.md', '.txt', '.rst']:
        return f'Documentation file: {filename}'
    
    elif ext in ['.icns', '.ico', '.png', '.jpg', '.jpeg', '.svg', '.gif']:
        return f'Image/icon asset: {filename}'
    
    elif ext in ['.sql']:
        return f'SQL database script: {filename}'
    
    elif ext in ['.sh', '.bash', '.zsh']:
        return f'Shell script: {filename}'
    
    elif ext in ['.rs']:
        return f'Rust source file: {filename}'
    
    elif ext in ['.doc', '.docx', '.pdf']:
        return f'Document file: {filename}'
    
    else:
        return f'File: {filename}'

def main():
    # Read the filelist
    with open('/Users/m2krproduction/otto-cloud/filelist.txt', 'r') as f:
        lines = f.readlines()
    
    # Parse file paths (skip line numbers)
    file_paths = []
    for line in lines:
        line = line.strip()
        if line and ': ' in line:
            # Format is "line_number: ./path/to/file"
            file_path = line.split(': ', 1)[1]
            file_paths.append(file_path)
    
    # Generate metadata for each file
    metadata_list = []
    for file_path in file_paths:
        # Make path absolute
        abs_path = os.path.join('/Users/m2krproduction/otto-cloud', file_path.lstrip('./'))
        
        file_type = get_file_type(file_path)
        category = get_category(file_path)
        risk_level = get_risk_level(file_path, category)
        description = get_description(file_path)
        
        metadata_list.append({
            "path": abs_path,
            "type": file_type,
            "category": category,
            "risk_level": risk_level,
            "description": description
        })
    
    # Output as JSON
    print(json.dumps(metadata_list, indent=2))

if __name__ == "__main__":
    main()