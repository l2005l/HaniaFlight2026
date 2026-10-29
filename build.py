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
head, core, game = read('src/head.html'), read('src/core.js'), read('src/game.js').replace('/*@HD@*/', read('src/hd.js')).replace('/*@VO@*/', read('src/vo.js')).replace('/*@NET@*/', read('src/net.js')).replace('/*@UFC@*/', read('src/ufc.js'))
# the technician's safety round lives only in local/ (not in the repository, not on the site): it goes into the offline file alone
HAS_MAINT = os.path.exists(os.path.join(root, 'local', 'maint.js'))
head_site = head.replace('<!--@MAINT_BTN@-->\n', '').replace('<!--@MAINT_UI@-->\n', '').replace('/*@MAINT_CSS@*/\n', '')
game_site = game.replace('/*@MAINT@*/', '')
assert '</script' not in core and '</script' not in game
CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
def scripts(three, g=None):
    # The world build blocks for a moment, so it starts after the first paint: the briefing (and the app's
    # splash screen) appears at once instead of waiting for it.
    return ('<script src="' + three + '"></script>\n<script>\nrequestAnimationFrame(function(){setTimeout(function(){\n'
            'window.RAAM=(function(){\n' + core + '\nreturn RAAM;})();\n' + (g if g is not None else game_site) + '\n},30);});\n</script>\n')
APP = ('<link rel="manifest" href="manifest.webmanifest">\n<meta name="theme-color" content="#0c1114">\n'
       '<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-capable" content="yes">\n'
       '<link rel="apple-touch-icon" href="icons/icon-192.png">\n<link rel="icon" href="icons/icon-192.png">\n')
# Registers the service worker and runs the in-app update flow: a progress bar while a new version downloads,
# then a reload (at once in the briefing, after the flight otherwise).
SW = """<script src="install.js" data-name="HaniaFlight" data-color="#1f6feb" data-menu-only="1" data-apk="https://github.com/l2005l/HaniaFlight2026/releases/download/android-latest/HaniaFlight.apk" defer></script>
<script>
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
i2 = head_site.index('<div id="app"')
page = ('<!doctype html>\n<html lang="he">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover,user-scalable=no">\n'
        '<style>body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n'
        + APP + head_site[:i2] + '</head>\n<body>\n' + head_site[i2:] + scripts('vendor/three.min.js') + SW + '</body>\n</html>\n')
ver = hashlib.sha1((page + read('vendor/three.min.js') + read('src/sw.js')).encode('utf8')).hexdigest()[:7]
page = page.replace('__BUILD__', ver)
write('index.html', page)
write('sw.js', read('src/sw.js').replace('__VERSION__', ver))
write('dist/artifact.html', (head_site + scripts(CDN, game_site)).replace('__BUILD__', ver))
# the technician's safety round as one file that works offline, opened straight from the computer (three.js inside)
if HAS_MAINT:
  L = lambda n: read('local/' + n)
  head_l = head.replace('<!--@MAINT_BTN@-->\n', L('maint-btn.html')).replace('<!--@MAINT_UI@-->\n', L('maint-ui.html')).replace('/*@MAINT_CSS@*/\n', L('maint.css'))
  head_l = head_l.replace('        <div><h4>סיור סביב המטוס</h4><ul>', L('maint-guide.html') + '        <div><h4>סיור סביב המטוס</h4><ul>', 1)
  game_l = game.replace('/*@MAINT@*/', L('maint.js'))
  il = head_l.index('<div id="app"')
  local = ('<!doctype html>\n<html lang="he">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">\n'
         '<title>סיבוב בטיחות לטכנאי</title>\n<style>body{margin:0}[hidden]{display:none!important}</style>\n' + head_l[:il] + '</head>\n<body>\n' + head_l[il:]
         + '<script>window.HF_MAINT=true;</script>\n<script>\n' + read('vendor/three.min.js') + '\n</script>\n'
         + '<script>\nrequestAnimationFrame(function(){setTimeout(function(){\nwindow.RAAM=(function(){\n' + core + '\nreturn RAAM;})();\n' + game_l + '\n},30);});\n</script>\n</body>\n</html>\n').replace('__BUILD__', ver)
  write('dist/maint-local.html', local)
print('index.html', len(page), 'bytes, build', ver)
