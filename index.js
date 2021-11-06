/*** GLOBAL VARS ***/
// html elements
const chatInput = document.querySelector('#chat input');
const animationContainer = document.querySelector('#au-li');
const dancerContainer = document.querySelector('#dancer');
const modal = document.querySelector('#modal');
const modalContent = document.querySelector('#modal-content');
const modalCloseButton = document.querySelector('#modal-close-button');
// video management
let currentAnimation = 0;
let currentDancer = 0;
const ANIMATION_FILENAMES = [
  './assets/animations/01_breathe.mp4',
  './assets/animations/02_bounce.mp4',
  './assets/animations/03_breakapart.mp4',
  './assets/animations/04_reset.mp4',
  './assets/animations/05_OK.mp4',
  './assets/animations/06_eyeball.mp4'
];
const DANCER_FILENAMES = [
  './assets/videos/dancer_00_pacing.mp4',
  './assets/videos/dancer_02_confused_waiting.mp4'
];
const ANIMATION_VIDEOS = preloadVideoElements(ANIMATION_FILENAMES);
const IDLE_ANIMATION = ANIMATION_VIDEOS[0];
const DANCER_VIDEOS = preloadVideoElements(
  DANCER_FILENAMES,
  { showControls: true, loop: true }
);
const IDLE_DANCER = DANCER_VIDEOS[0];
// modal management
const articleSpreadModal = `
<div id="article-spread-container">
  <img 
    id="article-spread"
    src="./assets/modal/article_spread_800p.png"
    alt="articles on the environmental costs of lithium"
  >
</div>
`;
const MODAL_CONTENT_SETS = [
  articleSpreadModal
];
let modalIsOpen = false;
let currentModal;

/*** RUNTIME ***/
(async () => {
  // retrieve operational data
  const animations = await fetchData();
  // begin idle video loops
  playIdleVideo(animationContainer, ANIMATION_VIDEOS[0]);
  playIdleVideo(dancerContainer, DANCER_VIDEOS[0]);
  // set up message submission on [ENTER] press
  window.addEventListener('keyup', event => {
    handleMessageInput(event, animations)
  });
  // set up modal mechanics
  modalCloseButton.addEventListener('click', closeModal);
})();

/*** FUNCTIONS ***/
async function fetchData() {
  const url = './data/chatbot.json';
  const res = await fetch(url);
  const data = await res.json();
  return data;
}

function preloadVideoElements(filenames, opts) {
  return filenames
    .map(filename => {
      const video = document.createElement('video');
      video.playsInline = true;
      video.muted = true;
      video.controls = Boolean(opts && opts.showControls && opts.showControls);
      video.loop = opts && opts.loop && opts.loop;
      video.preload = 'auto';
      video.src = filename;
      video.load();
      return video;
    });
}

function handleMessageInput(event, animations) {
  if (
    event.code === 'Enter' &&
    document.activeElement === chatInput
  ) {
    const msg = ` ${chatInput.value.toLowerCase()} `;
    const responseQueue = generateResponseQueue(msg, animations);
    if (responseQueue.length > 0) {
      playResponseQueue(responseQueue);
    }
    chatInput.value = ''; // reset input box?
  }
}

function generateResponseQueue(msg, anims) {
  const queue = [];
  anims.forEach(({ keywords, animation_cue, dancer_cue, modal_cue }) => {
    keywords.forEach(keyword => {
      if (msg.includes(keyword))
        queue.push({
          keyword,
          animation_cue,
          dancer_cue,
          modal_cue,
          index: msg.indexOf(keyword)
        });
    });
  });
  return queue
    .sort((a, b) =>
      a.index - b.index
    );
}

function playResponseQueue(queue) {
  //weird recursive boi
  const { animation_cue, dancer_cue, modal_cue } = queue.shift();
  if (
    (animation_cue || animation_cue === 0) &&
    animation_cue !== currentAnimation
  ) {
    resetIdleLoop();
    const nextAnimation = ANIMATION_VIDEOS[animation_cue];
    playAnimation(nextAnimation, queue, animation_cue);
  }
  if (
    (dancer_cue || dancer_cue === 0) &&
    dancer_cue !== currentDancer
  ) {
    const nextDancerVideo = DANCER_VIDEOS[dancer_cue];
    setAndPlayDancerVideo(nextDancerVideo, dancer_cue);
  }
  if (
    (modal_cue || modal_cue === 0) &&
    modal_cue !== currentModal &&
    !modalIsOpen
  ) {
    openModal(modal_cue);
  }
}

function playAnimation(animation, queue, i) {
  const handleVideoEnd = event => {
    if (queue.length > 0) {
      playResponseQueue(queue)
    } else {
      //end recursion
      playIdleVideo(animationContainer, ANIMATION_VIDEOS[0]);
      event.target.removeEventListener('ended', handleVideoEnd);
    }
  }
  animationContainer.innerHTML = '';
  animationContainer.appendChild(animation);
  animation.addEventListener('ended', handleVideoEnd);
  currentAnimation = i;
  animation.play();
}

function setAndPlayDancerVideo(dancerVideo, i) {
  dancerContainer.innerHTML = '';
  dancerContainer.appendChild(dancerVideo);
  dancerVideo.loop = true;
  currentDancer = i;
  dancerVideo.play();
}

// set idle mode videos
function playIdleVideo(container, idleVideo) {
  container.innerHTML = '';
  container.appendChild(idleVideo);
  idleVideo.loop = true;
  currentAnimation = 0;
  idleVideo.play();
}

// cleanup after exiting idle state
function resetIdleLoop() {
  ANIMATION_VIDEOS[0].loop = false;
}

// modal functions
function openModal(idx) {
  modalIsOpen = true;
  currentModal = idx;
  newModalContent = MODAL_CONTENT_SETS[idx];
  modalContent.innerHTML = newModalContent;
  modal.classList.add('open');
}

function closeModal() {
  modalIsOpen = false;
  currentModal = '';
  modalContent.innerHTML = '';
  modal.classList.remove('open');
 }