#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Forca tokenSecurity=none e exportAuthInfo=true no neutralino.config.json"""
import json

path = r'E:\Projetos\LOPES FOCUS\neutralino.config.json'
c = json.load(open(path, 'r', encoding='utf-8'))
c['tokenSecurity'] = 'none'
c['exportAuthInfo'] = True
json.dump(c, open(path, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
print('OK: tokenSecurity=none, exportAuthInfo=true')
