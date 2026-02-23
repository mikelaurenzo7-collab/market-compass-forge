#!/usr/bin/env python3
"""Verify ENGINE/WEBSITE/ENGINE_API boundary rules. Fails CI if violated."""
import ast
import re
import sys
from pathlib import Path

FORBIDDEN_ENGINE = {"fastapi", "celery", "flask", "django", "react", "next", "sqlalchemy", "psycopg", "redis", "httpx", "requests"}
FORBIDDEN_WEBSITE = {"numpy", "cupy", "torch", "scipy", "pandas", "sklearn", "engine"}
ENGINE_API_FORBIDDEN_MATH = {"numpy", "cupy", "scipy"}  # engine_api may import engine (which uses numpy internally) but not numpy directly for math


def get_imports(filepath: Path) -> set[str]:
    try:
        tree = ast.parse(filepath.read_text())
        imports = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.add(alias.name.split(".")[0])
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    imports.add(node.module.split(".")[0])
        return imports
    except SyntaxError:
        return set()


def check_engine(root: Path) -> list[str]:
    errors = []
    engine_dir = root / "engine" / "engine"
    if not engine_dir.exists():
        engine_dir = root / "engine"
    for py in engine_dir.rglob("*.py"):
        if "test" in str(py) or "__pycache__" in str(py):
            continue
        imp = get_imports(py)
        bad = imp & FORBIDDEN_ENGINE
        if bad:
            errors.append(f"ENGINE {py.relative_to(root)}: forbidden imports {bad}")
    return errors


def check_engine_api(root: Path) -> list[str]:
    errors = []
    api_dir = root / "services" / "engine_api"
    for py in api_dir.rglob("*.py"):
        if "__pycache__" in str(py):
            continue
        imp = get_imports(py)
        bad = imp & ENGINE_API_FORBIDDEN_MATH
        if bad and "engine" not in str(py):  # engine_api may import engine
            errors.append(f"ENGINE_API {py.relative_to(root)}: direct math imports {bad}")
    return errors


def check_website_ts(root: Path) -> list[str]:
    errors = []
    web_dir = root / "apps" / "web" / "src"
    for f in list(web_dir.rglob("*.ts")) + list(web_dir.rglob("*.tsx")):
        imp = set()
        try:
            text = f.read_text()
            for line in text.split("\n"):
                s = line.strip()
                if not (s.startswith("import ") or s.startswith("from ")):
                    continue
                for p in FORBIDDEN_WEBSITE:
                    if p == "engine":
                        if re.search(rf'from\s+["\']engine["\']', s) or re.search(rf'import\s+.*\s+from\s+["\']engine["\']', s):
                            imp.add(p)
                    else:
                        if re.search(rf'from\s+["\']{p}', s) or re.search(rf'import\s+.*\s+from\s+["\']{p}', s) or re.search(rf'from\s+{p}\s+import', s):
                            imp.add(p)
            if imp:
                errors.append(f"WEBSITE {f.relative_to(root)}: forbidden imports {imp}")
        except Exception:
            pass
    return errors


def main():
    root = Path(__file__).resolve().parent.parent
    errors = []
    errors.extend(check_engine(root))
    errors.extend(check_engine_api(root))
    errors.extend(check_website_ts(root))
    if errors:
        for e in errors:
            print(f"BOUNDARY VIOLATION: {e}")
        sys.exit(1)
    print("Boundary check passed.")
    sys.exit(0)


if __name__ == "__main__":
    main()
