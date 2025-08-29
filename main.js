const smileys = ['😀', '😃', '😄', '😁', '😅', '😂', '😇', '🙂', '😌', '😘', '😙', '😚', '😝', '🤪', '🤨', '🤓', '😎', '🥳', '🥱', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😫', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥶', '😨', '😥', '😓', '😶', '😑', '😬', '😯', '😮', '😲', '🥴', '😵', '🤐', '🥱', '🤫', '🤭', '🧐', '🥸', '🤡', '🤠', '👿'];
const hands = ['✊', '🤞', '🤟', '🤘', '👌', '✋', '🖐', '🖖', '🖕', '🤙'];

function randomize() {
    const randomSmiley = smileys[Math.floor(Math.random() * smileys.length)];
    const randomRightHand = hands[Math.floor(Math.random() * hands.length)];
    const randomLeftHand = hands[Math.floor(Math.random() * hands.length)];
    document.getElementById('face').textContent = randomSmiley;
    document.getElementById('right').textContent = randomRightHand;
    document.getElementById('left').textContent = randomLeftHand;
    document.title = randomSmiley;
}

document.getElementById('randomize').addEventListener('click', randomize);
document.getElementById('year').textContent = new Date().getFullYear();
