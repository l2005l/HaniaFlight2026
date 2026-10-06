#!/usr/bin/env python3
"""Build HaniaFlight into single-file pages.

  index.html           full page, served by GitHub Pages
  dist/artifact.html   body-only page for publishing as a Claude artifact
"""
import os
root = os.path.dirname(os.path.abspath(__file__))
read = lambda p: open(os.path.join(root, p), encoding='utf8').read()
head, core, game = read('src/head.html'), read('src/core.js'), read('src/game.js')
assert '</script' not in core and '</script' not in game
THREE = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
scripts = ('<script src="' + THREE + '"></script>\n<script>\nvar RAAM=(function(){\n' + core +
           '\nreturn RAAM;})();\n</script>\n<script>\n' + game + '\n</script>\n')
i = head.index('<div id="app"')
page = ('<!doctype html>\n<html lang="he">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        '<style>body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n'
        + head[:i] + '</head>\n<body>\n' + head[i:] + scripts + '</body>\n</html>\n')
os.makedirs(os.path.join(root, 'dist'), exist_ok=True)
open(os.path.join(root, 'index.html'), 'w', encoding='utf8').write(page)
open(os.path.join(root, 'dist/artifact.html'), 'w', encoding='utf8').write(head + scripts)
print('index.html', len(page), 'bytes')
