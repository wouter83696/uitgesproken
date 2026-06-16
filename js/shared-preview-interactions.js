(function(global){
  'use strict';

  var PK = global.PK = global.PK || {};

  var DEFAULT_TIMINGS = {
    flipDuration: 520,
    rebuildDelay: 260,
    flipStartDelay: 24,
    spinDuration: 380,
    spinSwapDelay: 170
  };

  function normalizeBackMode(mode){
    return mode === 'blank' || mode === 'reflect' ? mode : 'mirror';
  }

  function createBackModeController(options){
    options = options || {};
    var timings = Object.assign({}, DEFAULT_TIMINGS, options.timings || {});
    var timers = {
      swap: 0,
      turn: 0,
      flip: 0
    };

    function getElements(){
      return typeof options.getElements === 'function' ? options.getElements() : null;
    }

    function applyUiState(){
      if (typeof options.applyUiState === 'function') options.applyUiState();
    }

    function clearTimers(){
      if (timers.swap) {
        clearTimeout(timers.swap);
        timers.swap = 0;
      }
      if (timers.turn) {
        clearTimeout(timers.turn);
        timers.turn = 0;
      }
      if (timers.flip) {
        clearTimeout(timers.flip);
        timers.flip = 0;
      }
    }

    function setFlipped(isFlipped){
      if (typeof options.setFlipped === 'function') options.setFlipped(!!isFlipped);
      applyUiState();
    }

    function startFlip(isFlipped, afterFlipStart){
      var els = getElements();
      var after = typeof afterFlipStart === 'function' ? afterFlipStart : null;
      if (!els || !els.faceInner) {
        setFlipped(isFlipped);
        if (after) after();
        return;
      }
      void els.faceInner.offsetWidth;
      if (timers.flip) clearTimeout(timers.flip);
      timers.flip = setTimeout(function(){
        timers.flip = 0;
        setFlipped(isFlipped);
        if (after) after();
      }, timings.flipStartDelay);
    }

    function startBackSwapTurn(){
      var els = getElements();
      if (!els || !els.faceInner) return;
      if (timers.turn) clearTimeout(timers.turn);
      els.faceInner.classList.remove('back-swap-turn');
      void els.faceInner.offsetWidth;
      els.faceInner.classList.add('back-swap-turn');
      timers.turn = setTimeout(function(){
        timers.turn = 0;
        var nextEls = getElements();
        if (nextEls && nextEls.faceInner) nextEls.faceInner.classList.remove('back-swap-turn');
      }, timings.spinDuration + 40);
    }

    function setBackMode(nextMode){
      if (typeof options.isDoubleSided === 'function' && !options.isDoubleSided()) return;
      var prevMode = normalizeBackMode(typeof options.getBackMode === 'function' ? options.getBackMode() : 'mirror');
      var mode = normalizeBackMode(nextMode);
      var wasFlipped = !!(typeof options.getFlipped === 'function' && options.getFlipped());
      var changed = prevMode !== mode;
      var spinAdvance = !!(changed && wasFlipped);
      if (!changed && wasFlipped) return;
      if (typeof options.commitBackMode === 'function') {
        options.commitBackMode(mode, {
          prevMode: prevMode,
          changed: changed,
          wasFlipped: wasFlipped,
          spinAdvance: spinAdvance
        });
      }
      clearTimers();
      if (spinAdvance) {
        setFlipped(true);
        startBackSwapTurn();
        timers.swap = setTimeout(function(){
          timers.swap = 0;
          if (typeof options.replaceBackFaceDom === 'function') options.replaceBackFaceDom();
          applyUiState();
          if (typeof options.afterSwap === 'function') options.afterSwap({
            prevMode: prevMode,
            nextMode: mode,
            wasFlipped: wasFlipped
          });
        }, timings.spinSwapDelay);
        return;
      }
      setFlipped(false);
      applyUiState();
      startFlip(true);
      timers.swap = setTimeout(function(){
        timers.swap = 0;
        if (typeof options.replaceBackFaceDom === 'function') options.replaceBackFaceDom();
        applyUiState();
        if (typeof options.afterSwap === 'function') options.afterSwap({
          prevMode: prevMode,
          nextMode: mode,
          wasFlipped: wasFlipped
        });
      }, timings.rebuildDelay);
    }

    function toggleFlip(){
      if (typeof options.isDoubleSided === 'function' && !options.isDoubleSided()) {
        setFlipped(false);
        return;
      }
      var next = !(typeof options.getFlipped === 'function' && options.getFlipped());
      setFlipped(next);
    }

    return {
      clearTimers: clearTimers,
      setBackMode: setBackMode,
      setFlipped: setFlipped,
      toggleFlip: toggleFlip
    };
  }

  PK.sharedPreviewInteractions = {
    timings: Object.assign({}, DEFAULT_TIMINGS),
    createBackModeController: createBackModeController
  };
})(window);
