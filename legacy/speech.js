/*
 * Voice playback for the tutorial.
 *
 * Primary path is a pre-generated mp3 in audio/<key>.mp3, because the built-in
 * Windows Chinese voices sound mechanical and a six-year-old has to listen to
 * these lines many times. speechSynthesis is the fallback when the file is
 * missing, so the game is fully playable before any audio is generated.
 *
 * Browsers refuse to play audio without a user gesture, so unlock() must be
 * called from inside a real click handler once per page load.
 */
(function (root) {
  'use strict';

  var BASE = 'audio/';
  var current = null;      // the <audio> element in flight
  var unlocked = false;
  var muted = false;
  var voice = null;
  var voiceReady = false;
  var pending = null;      // timeout guard for the in-flight line
  var beat = null;         // keepalive/poll interval for the in-flight utterance

  function clearBeat() {
    if (beat) { clearInterval(beat); beat = null; }
  }

  /*
   * The tutorial advances on the end-of-speech callback, so that callback must
   * fire even when nothing is audible: a missing mp3 falls back to
   * speechSynthesis, and speechSynthesis silently never fires onend on some
   * Windows/Chrome setups. Without this guard the child answers correctly and
   * the lesson freezes. Roughly 260ms per Chinese character at rate 0.9.
   */
  function guard(text, onEnd) {
    if (pending) { pending.cancel(); pending = null; }
    var done = false;
    var timer = null;
    function fire() {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      clearBeat();
      if (pending && pending.fire === fire) pending = null;
      if (onEnd) onEnd();
    }
    function cancel() { done = true; if (timer) clearTimeout(timer); clearBeat(); }
    timer = setTimeout(fire, Math.min(20000, 1200 + (text ? text.length : 0) * 260));
    pending = { fire: fire, cancel: cancel };
    return fire;
  }

  function pickVoice() {
    if (voiceReady) return voice;
    var all = [];
    try { all = window.speechSynthesis.getVoices() || []; } catch (e) { return null; }
    if (!all.length) return null;
    var zh = all.filter(function (v) { return /^zh/i.test(v.lang || ''); });
    // Prefer a mainland Mandarin voice; fall back to any Chinese voice.
    voice = zh.filter(function (v) { return /zh[-_]?CN/i.test(v.lang); })[0] || zh[0] || null;
    voiceReady = true;
    return voice;
  }

  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = function () {
        voiceReady = false;
        pickVoice();
      };
    }
  } catch (e) { /* no speech synthesis: mp3-only, or silent */ }

  function stop() {
    clearBeat();
    if (pending) { pending.cancel(); pending = null; }
    if (current) {
      current.onended = current.onerror = null;
      try { current.pause(); } catch (e) {}
      current = null;
    }
    try { window.speechSynthesis.cancel(); } catch (e) {}
  }

  function tts(text, onEnd) {
    if (!text || !window.speechSynthesis) { if (onEnd) onEnd(); return; }
    try {
      var u = new SpeechSynthesisUtterance(text);
      var v = pickVoice();
      if (v) u.voice = v;
      u.lang = 'zh-CN';
      u.rate = 0.9;    // slower than default; six-year-olds lose fast speech
      u.pitch = 1.05;

      var started = false;
      function cleanup() { clearBeat(); }

      u.onstart = function () {
        started = true;
        // Chrome drops the onend event often enough that the tutorial cannot
        // depend on it, and it also silently stops long utterances after ~15s.
        // One interval does both jobs: poll the speaking flag as the real
        // end-of-speech signal, and resume() to keep long lines alive.
        //
        // It MUST be able to die on its own. Where onend never arrives and the
        // speaking flag stays stuck true, an interval tied only to those events
        // would run forever, and one leaks per spoken line until the machine
        // crawls. clearBeat() keeps a single instance; MAX_TICKS ends it.
        clearBeat();
        var ticks = 0;
        var MAX_TICKS = 100; // 30s, longer than any line in the script
        beat = setInterval(function () {
          try {
            ticks++;
            if (ticks > MAX_TICKS) { clearBeat(); return; }
            if (ticks > 2 && !window.speechSynthesis.speaking &&
                !window.speechSynthesis.pending) {
              clearBeat();
              if (onEnd) onEnd();
              return;
            }
            window.speechSynthesis.resume();
          } catch (e) { clearBeat(); }
        }, 300);
      };
      u.onend = function () { cleanup(); if (onEnd) onEnd(); };
      u.onerror = function () { cleanup(); if (onEnd) onEnd(); };

      window.speechSynthesis.speak(u);

      // No onstart within a second means this machine has no working voice
      // (muted output, missing zh voice, automation). Don't make the child
      // wait out the full length-based guard for silence. onEnd is idempotent.
      setTimeout(function () {
        if (!started) { cleanup(); if (onEnd) onEnd(); }
      }, 1000);
    } catch (e) {
      if (onEnd) onEnd();
    }
  }

  /*
   * speak(key, text, onEnd)
   * Always interrupts whatever is playing: if the child clicks three pieces in
   * a row they should hear the third one, not a queue of three.
   */
  function speak(key, text, onEnd) {
    stop();

    // Silent modes still need to advance, but not instantly: the child should
    // get a beat to see the "correct" state before the next step loads.
    if (muted || !unlocked) {
      var quiet = guard('', onEnd);
      setTimeout(quiet, 600);
      return;
    }

    var fire = guard(text, onEnd);
    if (!key) { tts(text, fire); return; }

    var a = new Audio(BASE + key + '.mp3');
    current = a;
    a.onended = function () { current = null; fire(); };
    a.onerror = function () { current = null; tts(text, fire); };
    var pr = a.play();
    if (pr && pr.catch) pr.catch(function () { current = null; tts(text, fire); });
  }

  // Call once from a click handler before any speak().
  function unlock() {
    unlocked = true;
    try {
      var u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      window.speechSynthesis.speak(u);
      window.speechSynthesis.cancel();
    } catch (e) {}
    pickVoice();
  }

  function setMuted(v) { muted = !!v; if (muted) stop(); return muted; }
  function isMuted() { return muted; }

  root.Speech = {
    speak: speak, stop: stop, unlock: unlock,
    setMuted: setMuted, isMuted: isMuted,
    isUnlocked: function () { return unlocked; }
  };
})(typeof self !== 'undefined' ? self : this);
