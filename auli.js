/***************/
/*** GLOBALS ***/
/***************/
let responseSets, assets; //read-only
// scroll looping text animation properties
let SCROLL_LOOP_INTERVAL;
let SCROLL_LOOP_DIRECTION = 'down';
const SCROLL_SPEED = 50;
// typing text animation properties
let TYPING_INTERVAL; //typing text animation handler
let TYPING_TARGET_TEXT = '';
let TYPING_INDEX = 0;
let TYPING_DELAY_COUNT = 0;
const TYPING_SPEED = 100;
const TYPING_RESTART_DELAY = 3; //# of intervals to wait for
// main animation gif properties
const GIF_TIMEOUT_DURATION = 20000; //gif-based video handler

/*********************/
/*** HTML ELEMENTS ***/
/*********************/
const AULI_ANIMATION = document.querySelector('#auli-animation');
const AULI_DANCER = document.querySelector('#auli-dancer');
const AULI_MODAL_CONTAINER = document.querySelector("#auli-modal-container");
const CHAT_INPUT = document.querySelector("#auli-input");
const RESET_BUTTON = document.querySelector('#auli-reset button');

/***************/
/*** RUNTIME ***/
/***************/
(async () => {
  // chat logic + assets
  responseSets = await initChatbot();
  assets = initAssets();
  // user interactions
  window.addEventListener('keyup', handleKeyboardShortcuts);
  RESET_BUTTON.addEventListener('click', playResetResponse);
  CHAT_INPUT.focus();
  playIdleResponse(); // begin with idle loop
})();

/*****************/
/*** FUNCTIONS ***/
/*****************/
/*** initializing content ***/
async function initChatbot() {
  const dataURL = './assets/response_sets.json';
  const res = await fetch(dataURL);
  const raw = await res.json();
  const data = raw.map(set => ({
    ...set,
    keywords: set.keywords &&
      set.keywords.split(', ')
  }));
  return await data;
}

function initAssets() {
  const assets = {};
  const initVideo = (src, config) => {
    const video = document.createElement('video');
    video.src = `./assets/content/${src}`;
    video.playsInline = true;
    // video.loop = config && config.loop ? config.loop : false;
    video.loop = true;
    video.muted = config && config.sound ? !config.sound : true;
    video.volume = config && config.volume ? config.volume : 1;
    video.preload = 'auto';
    video.load();
    return video;
  }
  const initImage = src => {
    const image = new Image();
    image.src = `./assets/content/${src}`;
    return image;
  }
  const applyStyles = (styles, container) => {
    Object.entries(styles)
      .forEach(([prop, value]) => {
        if (
          prop === 'fontSize' ||
          prop === 'color' ||
          prop.includes('margin') ||
          prop === 'textDecoration'
        ) {
          Array.from(
            container.querySelectorAll('*')
          ).forEach(el => {
            el.style[prop] = value;
          });
        } else {
          container.style[prop] = value;
        }
      })
  }
  responseSets.forEach(set => {
    Object.entries(set).forEach(([key, val]) => {
      if (key !== 'keywords' && val) {
        const contents = key === 'modals' ? val : [val];
        contents.forEach(content => {
          const { id, type, src, styles, effect, config, extlink } = content;
          const container = document.createElement('div');
          if (type === 'video') {
            container.classList.add('auli-video-container');
            container.classList.add('intrinsic-ignore');
            const video = initVideo(src, config);
            if (extlink) {
              const linkWrapper = document.createElement('a');
              linkWrapper.href = extlink;
              linkWrapper.target = '_blank';
              linkWrapper.rel = 'noopener noreferrer';
              linkWrapper.appendChild(video);
              container.appendChild(linkWrapper);
            } else {
              container.appendChild(video);
            }
            if (styles) applyStyles(styles, container);
          } else if (type === 'image') {
            container.classList.add('auli-image-container');
            const urls = typeof src === 'string' ? [src] : src;
            urls.forEach(url => {
              const image = initImage(url);
              container.appendChild(image);
            });
            if (effect) {
              effect.split(', ').forEach(cls => {
                container.classList.add(`auli-${cls}`);
                if (effect === 'double-image') {
                  container.style.margin = '0 auto';
                }
              })
            }
            if (styles) applyStyles(styles, container);
          } else if (type === 'html') {
            container.classList.add('auli-modal-content');
            const effectContainer = document.createElement('div');
            if (effect) {
              effect.split(', ').forEach(cls => {
                effectContainer.classList.add(`auli-${cls}`);
              })
            } else {
              effectContainer.classList.add('auli-text');
            }
            const bgShadow = document.createElement('div');
            bgShadow.classList.add('bg-shadow');
            effectContainer.innerHTML = src;
            if (styles) applyStyles(styles, effectContainer);
            container.appendChild(effectContainer);
            if (styles) applyStyles(styles, container);
            container.appendChild(bgShadow);
          }
          assets[id] = container;
        });
      }
    });
  });
  return assets;
}

/*** handling interactions ***/
function handleKeyboardShortcuts(event) {
  if (
    event.code === 'Enter' &&
    document.activeElement === CHAT_INPUT
  ) {
    processUserMessage();
  } else {
    CHAT_INPUT.focus();
  }
}

function processUserMessage() {
  const msg = CHAT_INPUT.value.toLowerCase();
  const rq = generateResponseQueue(msg);
  if (rq.length > 0) playResponseQueue(rq); //begin responding
  CHAT_INPUT.value = ''; //reset input area;
}

/*** response system ***/
function generateResponseQueue(message) {
  const queue = [];
  responseSets.forEach(({
    setID, duration, keywords, animation, dancer, modals
  }) => {
    if (keywords) {
      keywords.forEach(keyword => {
        if (message.includes(keyword)) {
          const response = {
            setID,
            duration,
            animation: animation && animation.id,
            dancer: dancer && dancer.id,
            modals: modals && modals.map(mdl => mdl.id),
            index: message.indexOf(keyword)
          }
          const isInQueue = queue.find(r => r.setID === setID);
          if (!isInQueue) queue.push(response);
        }
      })
    }
  });
  return queue.sort((a, b) => b.index - a.index);
}

function playResponseQueue(queue) {
  const { setID, duration, animation, dancer, modals } = queue.shift();
  if (setID === 'reset') {
    playResetResponse();
    return;
  }
  if (animation) {
    clearContainer(AULI_ANIMATION);
    renderContent(AULI_ANIMATION, assets[animation]);
  }
  if (dancer) {
    clearContainer(AULI_DANCER);
    renderContent(AULI_DANCER, assets[dancer]);
  }
  if (modals) {
    clearContainer(AULI_MODAL_CONTAINER);
    resetTextAnimations();
    modals.forEach(modal => {
      renderContent(AULI_MODAL_CONTAINER, assets[modal]);
    })
  }
  // begin countdown to play next response
  setTimeout(() => {
    if (queue.length > 0) playResponseQueue(queue); //play next response
  }, duration);
}

function clearContainer(container) {
  container.innerHTML = '';
}

function renderContent(container, content) {
  container.appendChild(content);
  // play video
  if (container.querySelector('.auli-video-container')) {
    const video = content.querySelector('video');
    video.currentTime = 0;
    video.loop = true;
    video.play();
    // return;
  } else if (container.querySelector('.auli-scroll-loop')) {
    const scrollLoop = container.querySelector('.auli-scroll-loop');
    scrollLoop.scrollTop = 0;
    SCROLL_LOOP_INTERVAL = setInterval(handleScrollLoop, SCROLL_SPEED, scrollLoop);
    // return;
  } else if (container.querySelector('.auli-typing')) {
    content.classList.add('flex-modal-content');
    const textContainer = container.querySelector('.auli-typing p');
    TYPING_TARGET_TEXT = textContainer.innerText;
    textContainer.innerHTML = '';
    const typeRate = modulateTypeSpeed(-50, 200); //milliseconds
    TYPING_INTERVAL = setInterval(handleTypingAnimation, typeRate, textContainer);
    // return;
  }
}

function playResetResponse() {
  const resetSet = responseSets.find(set => set.setID === 'reset');
  const resetRes = { animation: resetSet.animation.id, duration: resetSet.duration };
  const idleSet = responseSets.find(set => set.setID === 'idle');
  const idleRes = {
    animation: idleSet.animation.id,
    dancer: idleSet.dancer.id
  };
  clearContainer(AULI_MODAL_CONTAINER);
  clearContainer(AULI_DANCER);
  resetTextAnimations();
  playResponseQueue([resetRes, idleRes]);
}

function playIdleResponse() {
  const idleSet = responseSets.find(set => set.setID === 'idle');
  const idleRes = {
    animation: idleSet.animation.id,
    dancer: idleSet.dancer.id
  };
  playResponseQueue([idleRes]);
}

/*** text animations ***/
function handleScrollLoop(element) {
  const text = element.childNodes[0];
  const deltay = SCROLL_LOOP_DIRECTION === 'down' ? 1 : -5;
  element.scrollTop += deltay;
  const textHeight = element.getBoundingClientRect().height;
  const scrollPos = element.scrollTop + textHeight;
  if (
    SCROLL_LOOP_DIRECTION === 'down' &&
    scrollPos >= element.scrollHeight
  ) {
    SCROLL_LOOP_DIRECTION = 'up'
  }
  if (
    SCROLL_LOOP_DIRECTION === 'up' &&
    element.scrollTop <= 0
  ) {
    SCROLL_LOOP_DIRECTION = 'down'
  }
}

function handleTypingAnimation(textContainer) {
  if (TYPING_TARGET_TEXT) {
    if (TYPING_INDEX < TYPING_TARGET_TEXT.length) {
      textContainer.innerHTML += TYPING_TARGET_TEXT[TYPING_INDEX];
      TYPING_INDEX += 1;
    } else if (TYPING_DELAY_COUNT < TYPING_RESTART_DELAY) {
      TYPING_DELAY_COUNT += 1;
    } else {
      textContainer.innerHTML = '';
      TYPING_INDEX = 0;
      TYPING_DELAY_COUNT = 0;
    }
  }
}

function modulateTypeSpeed(min, max) {
  const rng = (min, max) => Math.floor(Math.random() * (max - min) + min);
  return TYPING_SPEED + rng(min, max);
}

function resetTextAnimations() {
  clearInterval(SCROLL_LOOP_INTERVAL);
  SCROLL_LOOP_DIRECTION = 'down';
  clearInterval(TYPING_INTERVAL);
  TYPING_TARGET_TEXT = '';
  TYPING_INDEX = 0;
}