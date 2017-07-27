/**
 * audio module
 * created by Jowei
 * */

!(function (W) {

  W.AudioContext = W.AudioContext || W.webkitAudioContext || W.mozAudioContext || W.msAudioContext;

  var $frequency = document.getElementById('m_frequency'),
    $coverImg = document.getElementById('m_cover'),
    $lrcBox = document.getElementById('m_lrc_box'),
    $lrcScrollBox = document.getElementById('m_isr_box'),
    $currentTime = document.getElementById('m_current_time'),
    $duration = document.getElementById('m_duration'),
    $timeline = document.getElementById('m_time_line'),
    $playBtn = document.getElementById('play_btn'),
    $pauseBtn = document.getElementById('pause_btn'),

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
    _.audio = new Audio();
    _.aniFrame = null;
    _.analyser = _.audioCtx.createAnalyser();
    _.processor = _.audioCtx.createScriptProcessor(1024);
    _.processor.connect(_.audioCtx.destination);
    _.analyser.connect(_.processor);
    _.frequencyData = new Uint8Array(_.analyser.frequencyBinCount);
    _.sound = null;
    _.lrc = {
      arr: [],
      cur: 0,
      step: 0,
      centerPos: 0,
    };
    _.timeLine = {
      duration: 0,
      currentTime: 0,
    };
    _.conf = {
      src: '',
      name: '',
      singer: '',
      cover: '',
      lyrics: ''
    };


    /**
     * AddListener
     * */
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
      var ct = parseInt(_.audio.currentTime * 100, 10);
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
      step = Math.round(_.frequencyData.length / meterNum);
      $freCtx.clearRect(0, 0, $frequencyWidth, $frequencyHeight);
      for (var i = 0; i < meterNum; i++) {
        var v = _.frequencyData[i * step] / 1.5;
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
      _.timeLine.currentTime = _.audio.currentTime;
      $currentTime.innerText = _.formatDuration(_.timeLine.currentTime);
      $timeline.style.width = (_.timeLine.currentTime / _.timeLine.duration) * 100 + '%';
    };

    _.resetProcess = function () {
      _.timeLine.currentTime = 0;
      $currentTime.innerText = _.formatDuration(0);
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
  };

  /**
   * play
   * */
  MBox.prototype.play = function () {
    _.audio.onended = function () {
      // _.sound.disconnect();
      // _.sound = null;
      _.processor.onaudioprocess = function () {};
      _.resetFrequency();
      _.resetLrc();
      _.resetProcess();
      _.toggleBtnClass(0);
    };

    _.processor.onaudioprocess = function () {
      _.frequencyData = new Uint8Array(_.frequencyData);
      _.analyser.getByteFrequencyData(_.frequencyData);
    };
    _.audio.play();
    _.setAnimationFrame();
    _.toggleBtnClass(1);
  };


  /**
   * pause
   * */
  MBox.prototype.pause = function () {
    _.audio && _.audio.pause();
    _.toggleBtnClass(0);
  };


  /**
   * init
   * @param {Object} m
   * : { src, name, singer, cover, lyrics }
   * */
  MBox.prototype.init = function (m) {
    if (!m) return;
    var formatLyrics;

    for (var k in m) {
      _.conf[k] = m[k];
    }

    formatLyrics = _.formatLrc(_.conf.lyrics);
    $coverImg.src = _.conf.cover;
    $lrcScrollBox.innerHTML = formatLyrics.lrcTmp;
    $duration.innerText = _.formatDuration(0);
    $currentTime.innerText = _.formatDuration(0);
    _.lrc.cur = 0;
    _.lrc.arr = formatLyrics.lrcArr;
    _.lrc.step = $lrcScrollBox.childNodes[0].getBoundingClientRect().height;
    _.lrc.centerPos = ($lrcBox.getBoundingClientRect().height - _.lrc.step) / 2;
    _.setTransform($lrcScrollBox, _.lrc.centerPos);
    _.timeLine.duration = 0;
    _.timeLine.currentTime = 0;
    _.prototype.pause();
    _.audio.src = _.conf.src;
    _.audio.crossOrigin = 'anonymous';
  };



  // register;
  var _ = MBox;
  'undefined' != typeof exports ? exports.MBox = _ : W.MBox = _;

})(window);
