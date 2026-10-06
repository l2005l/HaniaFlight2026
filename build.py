#!/usr/bin/env python3
"""Build HaniaFlight into single-file pages.

  index.html           installable page served by GitHub Pages (local three.js, manifest, service worker)
  sw.js                service worker, stamped with a hash of the build
  dist/artifact.html   body-only page for publishing as a Claude artifact (three.js from a CDN)
"""
import os, hashlib
root = os.path.dirname(os.path.abspath(__file__))
read = lambda p: open(os.path.join(root, p), encoding='utf8').read()
def write(p, s):
    os.makedirs(os.path.dirname(os.path.join(root, p)) or root, exist_ok=True)
    open(os.path.join(root, p), 'w', encoding='utf8').write(s)
head, core, game = read('src/head.html'), read('src/core.js'), read('src/game.js')
assert '</script' not in core and '</script' not in game
CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
def scripts(three):
    # The world build blocks for a moment, so it starts after the first paint: the briefing (and the app's
    # splash screen) appears at once instead of waiting for it.
    return ('<script src="' + three + '"></script>\n<script>\nrequestAnimationFrame(function(){setTimeout(function(){\n'
            'window.RAAM=(function(){\n' + core + '\nreturn RAAM;})();\n' + game + '\n},30);});\n</script>\n')
APP = ('<link rel="manifest" href="manifest.webmanifest">\n<meta name="theme-color" content="#0c1114">\n'
       '<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-capable" content="yes">\n'
       '<link rel="apple-touch-icon" href="icons/icon-192.png">\n<link rel="icon" href="icons/icon-192.png">\n')
# Registers the service worker and runs the in-app update flow: a progress bar while a new version downloads,
# then a reload (at once in the briefing, after the flight otherwise).
SW = """<script>
if('serviceWorker' in navigator){(function(){
  var sw=navigator.serviceWorker,box=document.getElementById('update'),txt=document.getElementById('updText'),bar=document.getElementById('updBar'),btn=document.getElementById('updNow'),had=!!sw.controller,ready=false;
  function show(t,done){box.hidden=false;box.dataset.done=done?'1':'';txt.textContent=t;btn.hidden=!done;}
  btn.onclick=function(){location.reload();};
  sw.addEventListener('message',function(e){if(e.data&&e.data.type==='hf-progress'&&had&&!ready){show('מוריד עדכון חדש…',false);bar.style.width=Math.round(e.data.done/e.data.total*100)+'%';}});
  sw.addEventListener('controllerchange',function(){if(!had){had=true;return;}ready=true;
    if(window.__raam&&window.__raam.state!=='menu'){window.__hfPending=true;show('עדכון חדש מוכן. הוא ייכנס בסיום הטיסה.',true);}
    else{show('העדכון הותקן. טוען מחדש…',false);bar.style.width='100%';setTimeout(function(){location.reload();},900);}});
  addEventListener('load',function(){sw.register('sw.js',{updateViaCache:'none'}).then(function(reg){
    function watch(w){if(!w)return;if(had)show('מוריד עדכון חדש…',false);w.addEventListener('statechange',function(){if(w.state==='redundant'&&!ready)box.hidden=true;});}
    watch(reg.installing);reg.addEventListener('updatefound',function(){watch(reg.installing);});
    function chk(){reg.update().catch(function(){});}
    document.addEventListener('visibilitychange',function(){if(!document.hidden)chk();});setInterval(chk,600000);
  }).catch(function(){});});
})();}
</script>
"""
i = head.index('<div id="app"')
page = ('<!doctype html>\n<html lang="he">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">\n'
        '<style>body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n'
        + APP + head[:i] + '</head>\n<body>\n' + head[i:] + scripts('vendor/three.min.js') + SW + '</body>\n</html>\n')
ver = hashlib.sha1((page + read('vendor/three.min.js') + read('src/sw.js')).encode('utf8')).hexdigest()[:7]
page = page.replace('__BUILD__', ver)
write('index.html', page)
write('sw.js', read('src/sw.js').replace('__VERSION__', ver))
write('dist/artifact.html', (head + scripts(CDN)).replace('__BUILD__', ver))
print('index.html', len(page), 'bytes, build', ver)
