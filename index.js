/***************/
/*** GLOBALS ***/
/***************/
let responseSets, assets; //read-only
let scrollLoopInterval; //scroll loop handler
const SCROLL_SPEED = 50;

/*********************/
/*** HTML ELEMENTS ***/
/*********************/
const AULI_ANIMATION = document.querySelector('#auli-animation');
const AULI_DANCER = document.querySelector('#auli-dancer');
const AULI_MODAL_1 = document.querySelector('#auli-modal-1');
const AULI_MODAL_2 = document.querySelector('#auli-modal-2');
const CHAT_INPUT = document.querySelector('#auli-message-box input');
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
})();

/*****************/
/*** FUNCTIONS ***/
/*****************/

/*** INITIALIZING CONTENT ***/
async function initChatbot() {
  const dataURL = './data/chatbot.json';
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
  return {
    ...preloadVideos(),
    ...preloadImages(),
    ...generateHTMLContent()
  }
}

function preloadVideos() {
  const videos = {};
  responseSets.forEach(set => { // parse video filenames found in chatbot system
    Object.entries(set)
      .forEach(([key, val]) => {
        if (
          key !== "keywords" && val &&
          (val.type === 'video' || key === 'animation')
        ) {
          const dir = key === 'animation' ? 'animations' : 'videos';
          const filename = key === 'animation' ? val : val.content;
          const id = key === 'animation' ? val : val.id;
          //generate video element
          const videoURL = `./assets/${dir}/${filename}`;
          const video = document.createElement('video');
          video.src = videoURL;
          video.playsInline = true;
          video.loop = false;
          video.preload = 'auto';
          video.load();
          const videoContainer = document.createElement('div');
          videoContainer.classList.add('auli-video-container');
          videoContainer.appendChild(video);
          videos[id] = videoContainer;
        }
      });
  });
  return videos;
}

function preloadImages() {
  const images = {};
  responseSets.forEach(set => {
    Object.entries(set)
      .forEach(([key, val]) => {
        if (key !== "keywords" && val && val.type === 'image') {
          const image = new Image();
          image.src = `./assets/images/${val.content}`;
          const imageContainer = document.createElement('div');
          imageContainer.classList.add('auli-image-container');
          imageContainer.appendChild(image);
          images[val.id] = imageContainer;
        }
      })
  });
  return images;
}

function generateHTMLContent() {
  const htmlNodes = {};
  responseSets.forEach(set => {
    Object.entries(set)
      .forEach(([key, val]) => {
        if (
          key !== 'keywords' && val &&
          (val.type === 'text' || val.type === 'scroll-loop')
        ) {
          const container = document.createElement('div');
          container.classList.add(val.type);
          if (val.background_image) {
            console.log('yo');
            bgURL = `./assets/images/${val.background_image}`;
            container.style.backgroundImage = `url(${bgURL})`;
          }
          container.innerHTML = val.content;
          htmlNodes[val.id] = container;
        }
      });
  });
  return htmlNodes;
}
//end init content


/*** INTERACTION HANDLERS ***/
function handleKeyboardShortcuts(event) {
  // send message in input when enter is pressed
  if (
    event.code === 'Enter' &&
    document.activeElement === CHAT_INPUT
  ) {
    processUserMessage();
  }
}

// when user sends message, process it
// prepare then play responses triggered by keywords
function processUserMessage() {
  const msg = CHAT_INPUT.value.toLowerCase();
  const rq = generateResponseQueue(msg);
  if (rq.length > 0) playResponseQueue(rq); //begin responding
  CHAT_INPUT.value = ''; //reset input area;
}
// end interaction handlers

/*** CHATBOT RESPONSE SYSTEM ***/
function generateResponseQueue(message) {
  const queue = [];
  responseSets.forEach(({
    keywords, animation, dancer, modal1, modal2
  }) => {
    if (keywords) {
      keywords.forEach(keyword => {
        if (message.includes(keyword)) {
          const response = {
            animation,
            dancer,
            modal1,
            modal2,
            keyword, //TODO: delete for prod
            inputIndex: message.indexOf(keyword) //TODO: delete for prod
          }
          const animationIsInQueue = queue.find(r => r.animation === animation);
          if (!animationIsInQueue) queue.push(response);
        }
      });
    }
  });
  return [...new Set(queue
    .sort((a, b) =>
      b.inputIndex - a.inputIndex //respond from end of sentence
    ))];
}

function playResponseQueue(queue) {
  console.log([...queue]);
  // recursively run function at the end of each video to play out full sequence
  const handleVideoEnd = event => {
    if (queue.length > 0) {
      playResponseQueue(queue) // continue recursion
    } else {
      returnToIdleState(); // end recursion
      event.target.removeEventListener('ended', handleVideoEnd); //cleanup
    }
  }
  resetScrollLoop(); // reset ongoing text animations
  // get next response set
  const { animation, dancer, modal1, modal2 } = queue.shift();
  if (animation) {
    const asset = assets[animation];
    const video = asset.querySelector('video');
    video.addEventListener('ended', handleVideoEnd);
    renderAsset(AULI_ANIMATION, asset);
  }
  if (dancer) {
    renderAsset(AULI_DANCER, assets[dancer.id], { loop: true, muted: true });
  }
  if (modal1) {
    AULI_MODAL_1.classList.add('open');
    renderAsset(AULI_MODAL_1, assets[modal1.id]);
  }
  if (modal2) {
    AULI_MODAL_2.classList.add('open');
    renderAsset(AULI_MODAL_2, assets[modal2.id]);
  }
  // if (modal1) setModal1Content(modal1);
  // if (modal2) setModal2Content(modal2);
}

// end chatbot response system

/*** ASSET RENDERING ***/
function renderAsset(container, asset, opts) {
  container.innerHTML = '';
  container.appendChild(asset);
  if (asset.classList.contains('auli-video-container')) {
    const video = asset.querySelector('video');
    video.loop = opts && Boolean(opts.loop);
    video.muted = opts && Boolean(opts.muted);
    video.play();
  } else if (asset.classList.contains('scroll-loop')) {
    asset.scrollTop = 0;
    scrollLoopInterval = setInterval(() => {
      handleScrollLoop(asset)
    }, SCROLL_SPEED);
  } else if (asset.classList.contains('text')) {

  }
}

// scroll loop animation
function handleScrollLoop(element) {
  // const sh = element.scrollTop;
  element.scrollTop += 1;
  const containerHeight = element.parentNode.getBoundingClientRect().height;
  if (element.scrollTop + containerHeight >= element.scrollHeight) {
    const loopContent = element.childNodes;
    loopContent.forEach(content => {
      element.innerHTML += content.outerHTML;
    });
  }
}

function resetScrollLoop() {
  clearInterval(scrollLoopInterval);
}

// reset button handling
function playResetResponse() {
  const resetResponse = responseSets
    .find(rs => rs.status === 'reset');
  playResponseQueue([{ ...resetResponse }]);
  resetModals();
}

// set back to idle mode || end of response queue
function returnToIdleState() {
  // retrieve idle response set
  const { animation } = responseSets
    .find(rs => rs.status === 'idle');
  // reset videos to default loop
  renderAsset(
    AULI_ANIMATION,
    assets[animation],
    { loop: true }
  );
}

function resetModals() {
  document
    .querySelectorAll('.auli-modal')
    .forEach(modal => {
      modal.classList.remove('open');
      modal.innerHTML = '';
    })
}