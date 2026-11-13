/**
 * @fileoverview "Box Content" section of the Configuration page (Advanced,
 * 2026-11-13): copy a USB key's content to the box, or the box's content to a
 * USB key, as the front panel's admin menu does.  The hat service runs the
 * copy (connectbox-hat-service buttons.py); connectbox-manage passes the
 * request on (PUT /admin/api/boxcontent) and reports its progress
 * (GET /admin/api/boxcontent: state queued / running / done / error, the step
 * text, its age in seconds).  Plain ES5 with XMLHttpRequest, self-starting.
 *
 * Polling the status every 2 s while a copy runs also keeps the admin session
 * alive (it ends after 5 minutes without an admin request).  A copy started on
 * the front panel shows here too.  Leaving the page does not stop a copy.
 */
(function () {
  'use strict';
  var API = '/admin/api/';
  var POLL_MS = 2000;
  // The hat service looks for a request every 2 s: no answer after this long
  //  means it is not running
  var NO_ANSWER_SECS = 20;
  // A running copy that has said nothing for this long is not shown as running
  //  (same limit as connectbox-manage)
  var BUSY_SECS = 360;
  var COMMANDS = {
    copy_from_usb: {form: 'boxcontent_from_usb',
      ask: 'Replace the box\'s own content with the content folder of the USB key? The box\'s current content is deleted.'},
    copy_to_usb: {form: 'boxcontent_to_usb',
      ask: 'Copy the box\'s content to the USB key? The key\'s content folder is replaced.'}
  };
  var timer = null;
  var watching = null;     // command whose status is shown

  /** Send a request; done(status, parsed JSON or null, raw text). 401 goes to the login page. */
  function request(method, url, body, done) {
    var x = new XMLHttpRequest();
    x.open(method, API + url, true);
    x.onload = function () {
      if (x.status === 401) { window.location.href = '/admin/login.html'; return; }
      var data = null;
      try { data = JSON.parse(x.responseText); } catch (e) { data = null; }
      done(x.status, data, x.responseText);
    };
    x.onerror = function () { done(0, null, ''); };
    if (body !== undefined) {
      x.setRequestHeader('Content-Type', 'application/json');
      x.send(JSON.stringify(body));
    } else {
      x.send();
    }
  }

  function el(id) { return document.getElementById(id); }

  /** Make the hat service's step text readable on one line. */
  function friendly(st) {
    var t = String(st.text || '');
    var m = /^Copying (\d+)%\s*Size:(\d+)MB$/.exec(t.replace(/\n/g, ' '));
    if (m) return 'Copying ' + m[1] + '% of ' + m[2] + ' MB';
    if (t === 'Insert USB key') return 'Put the USB key in (waiting up to 5 minutes)';
    if (t === 'Remove the USB key') return 'Copied: take the USB key out';
    if (st.state === 'queued') return 'Starting';
    if (st.state === 'error') return 'Failed: ' + t;
    return t.replace(/\n/g, ' ');
  }

  /** Show text in the status line of the command's form (colour by state). */
  function show(command, text, state) {
    var c = COMMANDS[command];
    if (!c) return;
    var s = el(c.form + '-status');
    if (!s) return;
    s.textContent = text || '';
    s.style.color = state === 'error' ? '#c62828' : state === 'done' ? '#2e7d32' : '';
  }

  /** Enable or disable both start buttons. */
  function buttons(enabled) {
    for (var k in COMMANDS) {
      var b = el(COMMANDS[k].form + '-button');
      if (b) { b.disabled = !enabled; b.style.opacity = enabled ? '' : '0.4'; }
    }
  }

  /** Is st a copy that is still going on? */
  function active(st) {
    return st && (st.state === 'running' || st.state === 'queued') && st.age < BUSY_SECS;
  }

  /** Read the status once and show it; keeps polling while a copy is going on. */
  function poll() {
    timer = null;
    request('GET', 'boxcontent', undefined, function (code, data) {
      var st = data && data.result ? data.result[0] : null;
      if (code !== 200 || !st) {
        if (watching) show(watching, 'No answer from the box', 'error');
        buttons(true);
        return;
      }
      if (st.command && COMMANDS[st.command]) watching = st.command;
      if (st.state === 'queued' && st.age > NO_ANSWER_SECS) {
        show(watching, 'Failed: the front panel service is not answering', 'error');
        buttons(true);
        return;
      }
      if (active(st)) {
        show(watching, friendly(st), st.state);
        buttons(false);
        timer = setTimeout(poll, POLL_MS);
        return;
      }
      if (watching && (st.state === 'done' || st.state === 'error')) show(watching, friendly(st), st.state);
      buttons(true);
    });
  }

  /** Ask, then start the copy and follow it. */
  function start(command) {
    if (!window.confirm(COMMANDS[command].ask)) return;
    watching = command;
    show(command, 'Starting', 'queued');
    buttons(false);
    request('PUT', 'boxcontent', {value: command}, function (code, data, raw) {
      if (code !== 200) {
        show(command, code === 409 ? (raw || 'Busy') : 'Failed: ' + (raw || code), 'error');
        buttons(true);
        if (code === 409 && !timer) timer = setTimeout(poll, POLL_MS);
        return;
      }
      if (!timer) timer = setTimeout(poll, POLL_MS);
    });
  }

  /** Wire the buttons and show a copy already going on (from here or the panel). */
  function attach() {
    if (!el('boxcontent')) return;
    for (var k in COMMANDS) {
      (function (command) {
        var b = el(COMMANDS[command].form + '-button');
        if (b) b.onclick = function () { start(command); };
      })(k);
    }
    request('GET', 'boxcontent', undefined, function (code, data) {
      var st = data && data.result ? data.result[0] : null;
      if (code === 200 && active(st)) {
        if (st.command && COMMANDS[st.command]) watching = st.command;
        poll();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
  else attach();
})();
