/*** ELEMENTS ***/
const chatInput = document.querySelector('#chat input');
const auLiVideo = document.querySelector('#au-li');
const dancerVideo = document.querySelector('#dancer-video');
const animationQueuePreview = document.querySelector('#proto-aq-preview h3');
const dummyDataURL = './assets/data/test_data.json';

/*** RUNTIME ***/
(async () => {
  // retrieve operational data
  const animations = await fetchData(dummyDataURL);
  // set up message submission on [ENTER] press
  window.addEventListener('keyup', event => {
    handleMessageInput(event, animations)
  });
})();

/*** FUNCTIONS ***/
async function fetchData() {
  const res = await fetch(dummyDataURL);
  const data = await res.json();
  return data;
}

function handleMessageInput(event, data) {
  if (
    event.code === 'Enter' &&
    document.activeElement === chatInput
  ) {
    const msg = ` ${chatInput.value.toLowerCase()} `;
    const animationQueue = [];
    data.forEach(animation => {
      const { keywords, animation_cue } = animation;
      keywords.forEach(keyword => {
        if (msg.includes(keyword)) {
          const animation = {
            index: msg.indexOf(keyword),
            cue: animation_cue,
            keyword
          };
          animationQueue.push(animation);
        }
      })
    });
    const orderedQueue = reorderAnimationQueue(animationQueue);
    console.log(orderedQueue);
    const previewText = orderedQueue.map(anim => `${anim.cue} - ${anim.keyword}`).join('<br>');
    animationQueuePreview.innerHTML = previewText;
    //reset chat input
    chatInput.value = '';
  }
}2

function reorderAnimationQueue(queue) {
  return queue.sort((a, b) => a.index - b.index);
}