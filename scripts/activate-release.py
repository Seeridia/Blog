#!/usr/bin/env python3
"""Validate a staged static site, then atomically replace its document-root symlink."""
import hashlib
import json
import os
from pathlib import Path
import re
import sys


def replace_link(link, destination):
    temporary = link.with_name(f"{link.name}.next-{os.getpid()}")
    try:
        temporary.symlink_to(destination, target_is_directory=True)
        os.replace(temporary, link)
    finally:
        if temporary.is_symlink():
            temporary.unlink()


def activate(target, release_id):
    target = Path(target)
    if not target.is_absolute() or target == Path('/'):
        raise ValueError('TARGET_DIR must be an absolute, non-root path')
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]*', release_id):
        raise ValueError('Invalid release ID')
    if target.exists() and not target.is_symlink():
        raise ValueError('TARGET_DIR is a real directory; perform the documented one-time migration first')
    incoming = Path(f'{target}.deploy') / release_id / 'dist'
    manifest = json.loads((incoming / 'build-manifest.json').read_text())['files']
    required = {'index.html', '404.html', 'rss.xml', 'sitemap-index.xml', 'pagefind/pagefind.js'}
    if not required.issubset(manifest):
        raise ValueError('Incomplete release: required pages or search index are missing')
    for name, digest in manifest.items():
        path = incoming / name
        if Path(name).is_absolute() or '..' in Path(name).parts or path.is_symlink():
            raise ValueError(f'Invalid release path: {name}')
        if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            raise ValueError(f'Release checksum mismatch: {name}')
    release = Path(f'{target}.releases') / release_id
    release.parent.mkdir(parents=True, exist_ok=True)
    if release.exists():
        raise ValueError('Release IDs are immutable; use a new ID')
    previous = target.resolve() if target.is_symlink() else None
    incoming.rename(release)
    if previous:
        replace_link(Path(f'{target}.previous'), previous)
    replace_link(target, release)
    print(f'Activated release {release_id}')


def rollback(target):
    target = Path(target)
    previous = Path(f'{target}.previous')
    if not target.is_absolute() or not target.is_symlink() or not previous.is_symlink():
        raise ValueError('Current and previous release symlinks are required')
    old, destination = target.resolve(), previous.resolve()
    if not (destination / 'index.html').is_file():
        raise ValueError('Previous release is incomplete')
    replace_link(target, destination)
    replace_link(previous, old)
    print('Rolled back to the previous release')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit('Usage: activate-release.py TARGET_DIR RELEASE_ID|--rollback')
    try:
        if sys.argv[2] == '--rollback':
            rollback(sys.argv[1])
        else:
            activate(sys.argv[1], sys.argv[2])
    except (ValueError, OSError, KeyError) as error:
        sys.exit(str(error))
