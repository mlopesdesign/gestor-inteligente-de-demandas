#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Le um trecho de arquivo"""
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
path = sys.argv[1]
start = int(sys.argv[2])
count = int(sys.argv[3])
with open(path, 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()
print(''.join(lines[start:start+count]))
