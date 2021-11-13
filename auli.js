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
    video.loop = config && config.loop ? config.loop : false;
    video.muted = config && config.sound ? !config.sound : true;
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
          prop.includes('margin')
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
          const { id, type, src, styles, effect, config } = content;
          const container = document.createElement('div');
          if (type === 'video') {
            container.classList.add('auli-video-container');
            container.classList.add('intrinsic-ignore');
            const video = initVideo(src, config);
            container.appendChild(video);
          } else if (type === 'image') {
            container.classList.add('auli-image-container');
            const image = initImage(src);
            container.appendChild(image);
          } else if (type === 'html') {
            if (effect) {
              effect.split(', ').forEach(cls => {
                container.classList.add(`auli-${cls}`);
              })
            } else {
              container.classList.add(`auli-text`);
            }
            container.classList.add('bg-shadow');
            container.innerHTML = src;
          }
          if (styles) applyStyles(styles, container);
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
  ) processUserMessage();
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
    setID, keywords, animation, dancer, modals
  }) => {
    if (keywords) {
      keywords.forEach(keyword => {
        if (message.includes(keyword)) {
          const response = {
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
  const handleVideoEnd = event => {
    if (queue.length > 0) {
      playResponseQueue(queue); //continue recursion
    } else {
      if (event) {
        event.target.loop = true;
        event.target.play();
        event.target.removeEventListener('ended', handleVideoEnd);
      }
      return;
    }
  }
  const { animation, dancer, modals } = queue.shift(); // get next set
  if (animation) {
    const element = assets[animation];
    const asset = element.childNodes[0];
    if (asset.tagName === 'VIDEO') {
      asset.loop = false;
      asset.addEventListener('ended', handleVideoEnd);
    } else if (asset.tagName === 'IMG') {
      setTimeout(handleVideoEnd, GIF_TIMEOUT_DURATION);
    }
    clearContainer(AULI_ANIMATION);
    renderElement(AULI_ANIMATION, element);
  }
  if (dancer) {
    clearContainer(AULI_DANCER);
    renderElement(AULI_DANCER, assets[dancer]);
  }
  if (modals) {
    clearContainer(AULI_MODAL_CONTAINER);
    resetTextAnimations();
    modals.forEach(modal =>
      renderElement(AULI_MODAL_CONTAINER, assets[modal])
    );
  }
}

function clearContainer(container) {
  container.innerHTML = '';
}

function renderElement(container, element) {
  container.appendChild(element);
  if (element.classList.contains('auli-video-container')) {
    const video = element.querySelector('video');
    video.currentTime = 0;
    video.play();
  } else if (element.classList.contains('auli-scroll-loop')) {
    element.scrollTop = 0;
    SCROLL_LOOP_INTERVAL = setInterval(handleScrollLoop, SCROLL_SPEED, element);
  } else if (element.classList.contains('auli-typing')) {
    const textContainer = element.querySelector('p');
    TYPING_TARGET_TEXT = textContainer.innerText;
    textContainer.innerHTML = '';
    TYPING_INTERVAL = setInterval(handleTypingAnimation, modulateTypeSpeed(-50, 200), textContainer);
  } else if (element.classList.contains('auli-blink')) {
    element.style.animationDuration = `${modulateTypeSpeed(0, 300) * 4 / 1000}s`;
  }
}

function playResetResponse() {
  const resetSet = responseSets.find(set => set.setID === 'reset');
  const resetRes = { animation: resetSet.animation.id };
  const idleSet = responseSets.find(set => set.setID === 'idle');
  const idleRes = {
    animation: idleSet.animation.id,
    dancer: idleSet.dancer.id
  };
  clearContainer(AULI_MODAL_CONTAINER);
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