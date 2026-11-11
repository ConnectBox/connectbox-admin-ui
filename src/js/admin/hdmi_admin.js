/**
 * @fileoverview "HDMI Screen" section of the Configuration page (Raspberry Pi
 * ConnectBox, 2026-11-11).  Plain ES5 with XMLHttpRequest so it runs on old
 * phones, and self-contained so the same file serves both ways:
 *  - connectbox-admin-ui source: imported by admin.js (bundled);
 *  - an existing release: copied next to admin.bundle.js and loaded with a
 *    <script> tag by connectbox-pi's patch_admin_hdmi.py.
 * Keep the two copies (connectbox-admin-ui src/js/admin/hdmi_admin.js and
 * connectbox-pi roles/enhanced-content/files/hdmi_admin.js) the same.
 *
 * The section (#hdmi, an Advanced option) lets the admin:
 *  - build the playlist looped on the HDMI screen from the box's video,
 *    audio and picture files (add, move up/down, remove, seconds per
 *    picture, Save);
 *  - play one file now, or stop it (back to the playlist);
 *  - allow visitors to use "Play on HDMI" on the media pages
 *    (brand.j2 hdmi_visitor_play).
 * API: connectbox-manage src/hdmi.js (/admin/api/hdmi/...).  On a box without
 * the HDMI player the section says so and offers nothing else.
 */
(function () {
  'use strict';
  var API = '/admin/api/';

  /** Send a request; done(status, parsed JSON or null). 401 goes to the login page. */
  function request(method, url, body, done) {
    var x = new XMLHttpRequest();
    x.open(method, API + url, true);
    x.onload = function () {
      if (x.status === 401) { window.location.href = '/admin/login.html'; return; }
      var data = null;
      try { data = JSON.parse(x.responseText); } catch (e) { data = null; }
      done(x.status, data);
    };
    x.onerror = function () { done(0, null); };
    if (body !== undefined) {
      x.setRequestHeader('Content-Type', 'application/json');
      x.send(JSON.stringify(body));
    } else {
      x.send();
    }
  }

  function el(id) { return document.getElementById(id); }

  /** Short message under the section's buttons (green ok, red error). */
  function say(text, bad) {
    var m = el('hdmi-message');
    if (!m) return;
    m.textContent = text || '';
    m.style.color = bad ? '#c62828' : '#2e7d32';
  }

  var media = [];        // playable files on the box: {path, name, lang, kind}
  var playlist = [];     // web paths in order

  /** Label for a file: name (language, kind). */
  function label(path) {
    for (var i = 0; i < media.length; i++) {
      if (media[i].path === path) return media[i].name + ' (' + media[i].lang + ', ' + media[i].kind + ')';
    }
    return path.split('/').pop() + ' (not on the box now)';
  }

  /** Redraw the playlist with Up / Down / Remove buttons. */
  function drawPlaylist() {
    var list = el('hdmi-playlist');
    if (!list) return;
    while (list.firstChild) list.removeChild(list.firstChild);
    if (!playlist.length) {
      var li0 = document.createElement('li');
      li0.textContent = 'Empty: the screen shows the box name and Wi-Fi name.';
      li0.style.listStyle = 'none';
      list.appendChild(li0);
    }
    for (var i = 0; i < playlist.length; i++) {
      (function (i) {
        var li = document.createElement('li');
        li.className = 'mb-1';
        li.appendChild(document.createTextNode(label(playlist[i]) + ' '));
        [['↑', 'Move up', function () { if (i > 0) { var t = playlist[i - 1]; playlist[i - 1] = playlist[i]; playlist[i] = t; } }],
         ['↓', 'Move down', function () { if (i < playlist.length - 1) { var t = playlist[i + 1]; playlist[i + 1] = playlist[i]; playlist[i] = t; } }],
         ['✕', 'Remove', function () { playlist.splice(i, 1); }]].forEach(function (b) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'bg-transparent border-0 text-primary px-1';
          btn.title = b[1];
          btn.setAttribute('aria-label', b[1]);
          btn.textContent = b[0];
          btn.onclick = function () { b[2](); drawPlaylist(); say('Not saved yet'); };
          li.appendChild(btn);
        });
        list.appendChild(li);
      })(i);
    }
  }

  /** Fill the file chooser, grouped by language. */
  function drawMedia() {
    var sel = el('hdmi-media');
    if (!sel) return;
    while (sel.firstChild) sel.removeChild(sel.firstChild);
    var groups = {};
    for (var i = 0; i < media.length; i++) {
      var m = media[i];
      if (!groups[m.lang]) {
        groups[m.lang] = document.createElement('optgroup');
        groups[m.lang].label = m.lang;
        sel.appendChild(groups[m.lang]);
      }
      var o = document.createElement('option');
      o.value = m.path;
      o.textContent = m.name + ' (' + m.kind + ')';
      groups[m.lang].appendChild(o);
    }
    if (!media.length) {
      var none = document.createElement('option');
      none.textContent = 'No video, audio or pictures on the box';
      none.value = '';
      sel.appendChild(none);
    }
  }

  /** Show the screen status line. */
  function showStatus() {
    request('GET', 'hdmi/status', undefined, function (code, st) {
      var s = el('hdmi-status');
      if (!s) return;
      if (code !== 200 || !st || st.ok === false) {
        s.textContent = 'HDMI player not running on this box.';
        return;
      }
      var what = st.mode === 'single' ? 'playing a chosen file' :
        st.mode === 'playlist' ? 'looping the playlist' :
        st.mode === 'splash' ? 'showing the box name and Wi-Fi name' : 'no screen connected';
      s.textContent = (st.monitor ? 'Screen connected: ' : 'No screen connected. ') + (st.monitor ? what : '');
      var v = el('hdmi_visitor_play-input');
      if (v) v.checked = !!st.visitor_play;
    });
  }

  /** Load everything from the box. */
  function load() {
    if (!el('hdmi')) return;
    request('GET', 'hdmi/status', undefined, function (code, st) {
      var body = el('hdmi-controls');
      if (code !== 200 || !st || st.error === 'HDMI player is not running') {
        if (body) body.style.display = 'none';
        var s = el('hdmi-status');
        if (s) s.textContent = 'This box has no HDMI player (Raspberry Pi builds only).';
        return;
      }
      if (body) body.style.display = '';
      request('GET', 'hdmi/media', undefined, function (c1, m) {
        media = (c1 === 200 && m && m.length !== undefined) ? m : [];
        drawMedia();
        request('GET', 'hdmi/playlist', undefined, function (c2, p) {
          playlist = [];
          if (c2 === 200 && p && p.items) {
            for (var i = 0; i < p.items.length; i++) playlist.push(p.items[i].path);
            if (el('hdmi-image-seconds')) el('hdmi-image-seconds').value = p.image_seconds || 10;
          }
          drawPlaylist();
          showStatus();
        });
      });
    });
  }

  /** Wire the buttons and the visitor switch. */
  function attach() {
    if (!el('hdmi')) return;
    el('hdmi-add').onclick = function () {
      var v = el('hdmi-media').value;
      if (v) { playlist.push(v); drawPlaylist(); say('Not saved yet'); }
    };
    el('hdmi-save').onclick = function () {
      var secs = parseInt(el('hdmi-image-seconds').value, 10) || 10;
      request('PUT', 'hdmi/playlist', {items: playlist, image_seconds: secs}, function (code, r) {
        if (code === 200) { say('Playlist saved'); showStatus(); }
        else say('Save failed: ' + (r && r.error || code), true);
      });
    };
    el('hdmi-play').onclick = function () {
      var v = el('hdmi-media').value;
      if (!v) return;
      request('PUT', 'hdmi/public/play', {path: v}, function (code, r) {
        if (code === 200) { say('Playing on the screen'); showStatus(); }
        else say('Play failed: ' + (r && r.error || code), true);
      });
    };
    el('hdmi-stop').onclick = function () {
      request('GET', 'hdmi/stop', undefined, function (code) {
        say(code === 200 ? 'Back to the playlist' : 'Stop failed', code !== 200);
        showStatus();
      });
    };
    el('hdmi_visitor_play-input').onchange = function () {
      var on = this.checked ? 1 : 0;
      request('PUT', 'brand', {value: 'hdmi_visitor_play=' + on}, function (code) {
        say(code === 200 ? (on ? 'Visitors can use Play on HDMI' : 'Only the admin can use Play on HDMI') : 'Save failed', code !== 200);
      });
    };
  }

  function start() { attach(); load(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
