#!/usr/bin/env python3
"""Compatibility wrapper: the approved full-bleed source is canonical."""
from pathlib import Path
import subprocess, sys
subprocess.run([sys.executable, str(Path(__file__).with_name('build-fullbleed-splash.py'))], check=True)
