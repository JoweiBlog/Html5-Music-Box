/**
 * audio module
 * created by Jowei
 * */

!(function (W) {

  W.AudioContext = W.AudioContext || W.webkitAudioContext || W.mozAudioContext || W.msAudioContext;
  W.$getId = (function (id) { return document.getElementById(id); });

  var isMobile = function () {
    var ua = W.navigator.userAgent.toLowerCase();
    return /(android)|(iphone)|(ipad)|(ipod)/i.test(ua);
  };

  var $frequency = $getId('m_frequency'),
    $coverImg = $getId('m_cover'),
    $lrcBox = $getId('m_lrc_box'),
    $lrcScrollBox = $getId('m_isr_box'),
    $currentTime = $getId('m_current_time'),
    $duration = $getId('m_duration'),
    $timeline = $getId('m_time_line'),
    $playBtn = $getId('play_btn'),
    $pauseBtn = $getId('pause_btn'),

    dpr = window.devicePixelRatio || 1;
    $frequency.width = $frequencyWidth = $frequency.clientWidth * dpr,
    $frequency.height = $frequencyHeight = $frequency.clientHeight * dpr,
    $freCtx = $frequency.getContext('2d'),
    gradient = $freCtx.createLinearGradient(0, 0, 0, $frequencyHeight);

  gradient.addColorStop(1, '#F41323');
  gradient.addColorStop(0, '#FFFFFF');
  $freCtx.fillStyle = gradient;



  /**
   * 构造 MBox 对象；
   * */
  var MBox;

  MBox = function () {
    _.audioCtx = new AudioContext();
    _.audio = !isMobile() ? new Audio() : null;
    _.aniFrame = null;
    _.analyser = _.audioCtx.createAnalyser();
    _.buffer = null;
    _.frequencyData = new Uint8Array(_.analyser.frequencyBinCount);
    _.sound = null;
    _.done = [];  // 已完成加载的音乐项；
    _.loading = false;
    _.lrc = {
      arr: [],
      cur: 0,
      step: 0,
      centerPos: 0,
    };
    _.timeLine = {
      startedAt: 0,
      pausedAt: 0,
      duration: 0,
      currentTime: 0,
    };
    _.conf = {
      src: '',
      name: '',
      singer: '',
      size: '',
      cover: '',
      lyrics: ''
    };


    /**
     * AddListener
     * */
    if (!isMobile()) {
      _.audio.addEventListener('canplay', function() {
        if (!_.sound) {
          _.sound = _.audioCtx.createMediaElementSource(_.audio);
          _.sound.connect(_.analyser);
          _.analyser.connect(_.audioCtx.destination);
        }
        _.timeLine.duration = this.duration * 1;
        $duration.innerText = _.formatDuration(_.timeLine.duration);
      }, false);

      _.audio.addEventListener('error', function () {
        throw new Error('load failed');
      });
    }

    _.setTransform = function (ele, n) {
      ele.style.transition = 'all .4s linear';
      ele.style.webkitTransition = 'all .4s linear';
      ele.style.transform = 'translate3d(0px, '+ n +'px, 0px)';
      ele.style.webkitTransform = 'translate3d(0px, '+ n +'px, 0px)';
    };

    _.toggleBtnClass = function (s) {
      $playBtn.className = s === 1 ? 'op-btn-i miss' : 'op-btn-i';
      $pauseBtn.className = s === 1 ? 'op-btn-i' : 'op-btn-i  miss';
    };

    _.loadSource = function (url, cb) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'arraybuffer';
      xhr.onload = function(){
        _.audioCtx.decodeAudioData(xhr.response, function (buffer) {
          _.buffer = buffer;
          cb && cb();
        });
      };
      xhr.send();
    };

    _.getCurrentTime = function() {
      if(_.timeLine.pausedAt) {
        return _.timeLine.pausedAt;
      }
      if(_.timeLine.startedAt) {
        return _.audioCtx.currentTime - _.timeLine.startedAt;
      }
      return 0;
    };


    /**
     * Lrc
     * */
    _.formatLrc = function (lrc) {
      var mArr = [], mStr = '', i, ms, mp, msi, mpi, mpis, mpit;
      var mSplit = lrc.split('↵'), mSplitL = mSplit.length;

      for (i = 0; i < mSplitL; i++) {
        ms = mSplit[i].split(']');
        msi = ms ? ms[1] : '';
        mp = mSplit[i].match(/\[(\S*)\]/);
        mpi = mp ? mp[1] : '';
        mpis = mpi.split(':');

        if (!msi) continue;
        mpit = parseInt((mpis[0] * 1 * 60 + mpis[1] * 1) * 100, 10);
        mArr.push({ point: mpit, text: msi });
        mStr += '<p class="'+ (i === 0 ? 'act' : '' ) +'" data-time="'+ mpit +'">' + msi + '</p>';
      }

      return { lrcArr: mArr, lrcTmp: mStr };
    };

    _.renderLrc = function () {
      var ct = parseInt(_.timeLine.currentTime * 100, 10);
      if (_.lrc.cur !== _.lrc.arr.length && ct >= _.lrc.arr[_.lrc.cur].point) {
        _.setTransform($lrcScrollBox, _.lrc.centerPos - _.lrc.step * _.lrc.cur);
        if (_.lrc.cur !== 0) $lrcScrollBox.childNodes[_.lrc.cur - 1].className = '';
        $lrcScrollBox.childNodes[_.lrc.cur].className = 'act';
        _.lrc.cur += 1;
      }
    };

    _.resetLrc = function () {
      if (_.lrc.cur === 0) return;
      $lrcScrollBox.childNodes[_.lrc.cur - 1].className = '';
      _.lrc.cur = 0;
      $lrcScrollBox.childNodes[_.lrc.cur].className = 'act';
      _.setTransform($lrcScrollBox, _.lrc.centerPos);
    };


    /**
     * Frequency
     * */
    var meterWidth = 3 * dpr,
      gap = dpr,
      step = 0,
      meterNum = Math.floor($frequencyWidth / (meterWidth + gap));
    _.renderFrequency = function () {
      _.frequencyData = new Uint8Array(_.analyser.frequencyBinCount);
      _.analyser.getByteFrequencyData(_.frequencyData);
      step = Math.round(_.frequencyData.length / meterNum);
      $freCtx.clearRect(0, 0, $frequencyWidth, $frequencyHeight);
      for (var i = 0; i < meterNum; i++) {
        var v = _.frequencyData[i * step] / 2.5;
        $freCtx.fillRect(i * (meterWidth + gap), $frequency.height - v, meterWidth, v);
      }
    };
    _.resetFrequency = function () {
      $freCtx.clearRect(0, 0, $frequencyWidth, $frequencyHeight);
    };


    /**
     * Process
     * */
    _.formatDuration = function (t) {
      var _m = Math.floor(t / 60),
        _s = Math.floor(t % 60);
      return _.addZeroPrefix(_m) + ':' + _.addZeroPrefix(_s);
    };

    _.addZeroPrefix = function (t) {
      return t < 10 ? '0' + t : t;
    };

    _.renderProcess = function () {
      _.timeLine.currentTime = _.audio.currentTime || _.getCurrentTime();
      $currentTime.innerText = _.formatDuration(_.timeLine.currentTime);
      $timeline.style.width = (_.timeLine.currentTime / _.timeLine.duration) * 100 + '%';
    };

    _.resetProcess = function () {
      _.timeLine.currentTime = 0;
      _.timeLine.pausedAt = 0;
      _.timeLine.startedAt = 0;
      $currentTime.innerText = _.formatDuration(0);
      $timeline.style.width = '0';
    };


    /**
     * Animation
     * */
    _.setAnimationFrame = function () {
      _.aniFrame = requestAnimationFrame(function ani() {
        if (_.audio.ended || _.audio.paused) {
          cancelAnimationFrame(_.aniFrame);
          _.aniFrame = null;
          return;
        }

        _.renderProcess();
        _.renderLrc();
        _.renderFrequency();
        _.aniFrame = requestAnimationFrame(ani);
      });
    };

    _.resetAnimationFrame = function () {
      _.aniFrame && cancelAnimationFrame(_.aniFrame);
      _.aniFrame = null;
      _.resetProcess();
      _.resetFrequency();
      _.resetLrc();
    };
  };

  /**
   * play
   * */
  MBox.prototype.play = function () {
    if (!isMobile()) {
      _.audio.play();
    } else {
      if (_.done.indexOf(_.conf.name) === -1) {
        return alert('您没有加载音乐哦~，稍等一下，或重新载入页面试试~');
      }

      if (_.loading) {
        return alert('音乐正在加载');
      }

      _.audio = _.audioCtx.createBufferSource();
      _.audio.buffer = _.buffer;
      _.audio.connect(_.analyser);
      _.analyser.connect(_.audioCtx.destination);
      _.timeLine.duration = _.audio.buffer.duration;
      $duration.innerText = _.formatDuration(_.timeLine.duration);
      _.audio.start(0, _.timeLine.pausedAt);
      _.timeLine.startedAt = _.audioCtx.currentTime + .2 - _.timeLine.pausedAt;
      _.timeLine.pausedAt = 0;
    }

    _.audio.onended = function () {
      _.resetFrequency();
      _.resetLrc();
      _.resetProcess();
      _.toggleBtnClass(0);
    };

    _.setAnimationFrame();
    _.toggleBtnClass(1);
  };


  /**
   * pause
   * */
  MBox.prototype.pause = function () {
    if (_.audio) {
      if (!isMobile()) {
        _.audio.pause();
      } else {
        _.timeLine.pausedAt = _.audioCtx.currentTime - _.timeLine.startedAt;
        _.audio.disconnect();
        _.audio.stop();
      }
    }
    _.toggleBtnClass(0);
  };


  /**
   * init
   * @param {Object} m
   * : { src, name, singer, cover, lyrics }
   * */
  MBox.prototype.init = function (m) {
    if (!m) return;
    var formatLyrics, isComfirm = true;

    for (var k in m) {
      _.conf[k] = m[k];
    }

    formatLyrics = _.formatLrc(_.conf.lyrics);
    $coverImg.src = _.conf.cover;
    $lrcScrollBox.innerHTML = formatLyrics.lrcTmp;
    $duration.innerText = _.formatDuration(0);
    $currentTime.innerText = _.formatDuration(0);
    _.resetAnimationFrame();
    _.lrc.cur = 0;
    _.lrc.arr = formatLyrics.lrcArr;
    _.lrc.step = $lrcScrollBox.childNodes[0].getBoundingClientRect().height;
    _.lrc.centerPos = ($lrcBox.getBoundingClientRect().height - _.lrc.step) / 2;
    _.setTransform($lrcScrollBox, _.lrc.centerPos);
    _.prototype.pause();
    _.timeLine.duration = 0;
    _.timeLine.currentTime = 0;
    _.timeLine.pausedAt = 0;

    if (!isMobile()) {
      _.audio.src = _.conf.src;
      _.audio.crossOrigin = 'anonymous';
    } else {
      if(_.done.indexOf(_.conf.name) === -1) {
        isComfirm = confirm('预加载该音乐资源大约' + _.conf.size + 'M, 继续？（wifi任性，4g慎重）');
      }

      if (isComfirm) {
        _.loading = true;
        $playBtn.className = 'op-btn-i loading';
        _.loadSource(_.conf.src, function () {
          _.loading = false;
          $playBtn.className = 'op-btn-i';
          _.done.push(_.conf.name);
        });
      }
      console.log(_.timeLine.pausedAt);
    }
  };



  // register;
  var _ = MBox;
  'undefined' != typeof exports ? exports.MBox = _ : W.MBox = _;

})(window);
