#!/usr/bin/env python3
"""
Systematic migration fixer for Supabase migrations.
Fixes common patterns that cause failures on fresh database:
- Adds IF NOT EXISTS to CREATE statements
- Adds IF EXISTS to DROP statements  
- Adds ON CONFLICT DO NOTHING to INSERT statements
- Fixes CREATE TYPE to handle duplicates
"""

import re
import sys
from pathlib import Path
from typing import List, Tuple

def fix_create_type(content: str) -> str:
    """Fix CREATE TYPE statements to handle duplicates"""
    # Pattern: CREATE TYPE ... AS ENUM (...)
    pattern = r'CREATE TYPE\s+(\S+)\s+AS\s+ENUM\s*\([^)]+\)'
    
    def replace(match):
        type_name = match.group(1)
        full_match = match.group(0)
        return f"""DO $$ BEGIN
  {full_match};
EXCEPTION WHEN duplicate_object THEN null;
END $$;"""
    
    return re.sub(pattern, replace, content, flags=re.IGNORECASE | re.MULTILINE)

def fix_create_table(content: str) -> str:
    """Add IF NOT EXISTS to CREATE TABLE statements"""
    # Pattern: CREATE TABLE table_name (not CREATE TABLE IF NOT EXISTS)
    pattern = r'CREATE TABLE\s+(?!IF NOT EXISTS\s+)(public\.)?(\w+)'
    
    def replace(match):
        prefix = match.group(1) or ''
        table_name = match.group(2)
        return f'CREATE TABLE IF NOT EXISTS {prefix}{table_name}'
    
    return re.sub(pattern, replace, content, flags=re.IGNORECASE)

def fix_create_index(content: str) -> str:
    """Add IF NOT EXISTS to CREATE INDEX statements"""
    pattern = r'CREATE\s+(UNIQUE\s+)?INDEX\s+(?!IF NOT EXISTS\s+)(\w+)'
    
    def replace(match):
        unique = match.group(1) or ''
        index_name = match.group(2)
        return f'CREATE {unique}INDEX IF NOT EXISTS {index_name}'
    
    return re.sub(pattern, replace, content, flags=re.IGNORECASE)

def fix_create_trigger(content: str) -> str:
    """Add DROP TRIGGER IF EXISTS before CREATE TRIGGER"""
    # Find CREATE TRIGGER statements
    pattern = r'CREATE\s+TRIGGER\s+(\w+)\s+'
    
    def replace(match):
        trigger_name = match.group(1)
        # Check if DROP already exists before this CREATE
        # This is a simplified check - full implementation would need context
        return f'DROP TRIGGER IF EXISTS {trigger_name} ON public.{trigger_name.split("_")[1] if "_" in trigger_name else "unknown"};\nCREATE TRIGGER {trigger_name} '
    
    # More careful: only add DROP if not already present
    lines = content.split('\n')
    result = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if re.match(r'CREATE\s+TRIGGER\s+(\w+)', line, re.IGNORECASE):
            trigger_name = re.match(r'CREATE\s+TRIGGER\s+(\w+)', line, re.IGNORECASE).group(1)
            # Check previous lines for DROP
            has_drop = any('DROP TRIGGER' in prev_line and trigger_name in prev_line 
                          for prev_line in lines[max(0, i-5):i])
            if not has_drop:
                # Try to infer table name from trigger name pattern
                table_match = re.search(r'ON\s+(?:public\.)?(\w+)', '\n'.join(lines[i:i+3]), re.IGNORECASE)
                if table_match:
                    table_name = table_match.group(1)
                    result.append(f'DROP TRIGGER IF EXISTS {trigger_name} ON public.{table_name};')
        result.append(line)
        i += 1
    
    return '\n'.join(result)

def fix_insert_statements(content: str) -> str:
    """Add ON CONFLICT DO NOTHING to INSERT statements that don't have it"""
    # Pattern: INSERT INTO ... VALUES ... or INSERT INTO ... SELECT ...
    # Skip if already has ON CONFLICT
    pattern = r'(INSERT\s+INTO\s+\S+\s+(?:\([^)]+\)\s+)?(?:VALUES|SELECT)[^;]+)(?<!ON CONFLICT[^;]*);'
    
    def replace(match):
        insert_stmt = match.group(1).strip()
        # Don't add if already has ON CONFLICT
        if 'ON CONFLICT' in insert_stmt.upper():
            return insert_stmt + ';'
        # Add ON CONFLICT DO NOTHING
        return insert_stmt + '\nON CONFLICT DO NOTHING;'
    
    # More careful approach: process line by line
    lines = content.split('\n')
    result = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if re.match(r'INSERT\s+INTO', line, re.IGNORECASE):
            # Collect multi-line INSERT
            insert_lines = [line]
            j = i + 1
            while j < len(lines) and not lines[j].strip().endswith(';'):
                insert_lines.append(lines[j])
                j += 1
            if j < len(lines):
                insert_lines.append(lines[j])
            
            insert_block = '\n'.join(insert_lines)
            if 'ON CONFLICT' not in insert_block.upper():
                # Add ON CONFLICT DO NOTHING before the semicolon
                insert_block = insert_block.rstrip(';') + '\nON CONFLICT DO NOTHING;'
            
            result.extend(insert_block.split('\n'))
            i = j + 1
        else:
            result.append(line)
            i += 1
    
    return '\n'.join(result)

def fix_drop_statements(content: str) -> str:
    """Add IF EXISTS to DROP statements that don't have it"""
    # Pattern: DROP TABLE/INDEX/TRIGGER/POLICY/FUNCTION without IF EXISTS
    patterns = [
        (r'DROP\s+TABLE\s+(?!IF EXISTS\s+)(\S+)', r'DROP TABLE IF EXISTS \1'),
        (r'DROP\s+INDEX\s+(?!IF EXISTS\s+)(\S+)', r'DROP INDEX IF EXISTS \1'),
        (r'DROP\s+TRIGGER\s+(?!IF EXISTS\s+)(\S+)', r'DROP TRIGGER IF EXISTS \1'),
        (r'DROP\s+POLICY\s+(?!IF EXISTS\s+)(\S+)', r'DROP POLICY IF EXISTS \1'),
        (r'DROP\s+FUNCTION\s+(?!IF EXISTS\s+)(\S+)', r'DROP FUNCTION IF EXISTS \1'),
    ]
    
    for pattern, replacement in patterns:
        content = re.sub(pattern, replacement, content, flags=re.IGNORECASE)
    
    return content

def process_migration_file(file_path: Path) -> Tuple[bool, str]:
    """Process a single migration file and return (changed, content)"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            original = f.read()
        
        content = original
        
        # Apply fixes in order
        content = fix_create_type(content)
        content = fix_create_table(content)
        content = fix_create_index(content)
        content = fix_drop_statements(content)
        # Note: INSERT and TRIGGER fixes are more complex and may need manual review
        
        changed = content != original
        return changed, content
    except Exception as e:
        print(f"Error processing {file_path}: {e}", file=sys.stderr)
        return False, ""

def main():
    migrations_dir = Path('supabase/migrations')
    if not migrations_dir.exists():
        print(f"Error: {migrations_dir} does not exist", file=sys.stderr)
        sys.exit(1)
    
    migration_files = sorted(migrations_dir.glob('*.sql'))
    print(f"Found {len(migration_files)} migration files")
    
    changed_count = 0
    for file_path in migration_files:
        changed, content = process_migration_file(file_path)
        if changed:
            changed_count += 1
            print(f"Would update: {file_path.name}")
            # Uncomment to actually write changes:
            # with open(file_path, 'w', encoding='utf-8') as f:
            #     f.write(content)
    
    print(f"\n{changed_count} files would be updated")
    print("Review the script output and uncomment write operations to apply changes")

if __name__ == '__main__':
    main()
