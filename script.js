'use strict';

class RetroAudioEngine {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  playTone(freq, type = 'square', duration = 0.12, vol = 0.08) {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  playClick() {
    this.playTone(400, 'square', 0.05, 0.05);
  }

  playError() {
    this.playTone(150, 'sawtooth', 0.2, 0.08);
  }

  playHigh() {
    this.playTone(300, 'square', 0.1, 0.06);
  }

  playLow() {
    this.playTone(220, 'square', 0.1, 0.06);
  }

  playWin() {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'square', 0.18, 0.1), idx * 100);
    });
  }

  playLoss() {
    const notes = [200, 160, 120];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'sawtooth', 0.2, 0.1), idx * 120);
    });
  }
}

const audio = new RetroAudioEngine();

// Confetti Particle Generator
class RetroConfetti {
  constructor() {
    this.canvas = document.getElementById('confetti-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.particles = [];
    this.animId = null;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  trigger() {
    if (!this.canvas || !this.ctx) return;
    this.particles = [];
    const colors = ['#eee', '#f59e0b', '#00f2fe', '#ff2a85', '#10b981', '#ffffff'];
    for (let i = 0; i < 90; i++) {
      this.particles.push({
        x: this.canvas.width / 2,
        y: this.canvas.height * 0.3,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.7) * 14,
        size: Math.random() * 10 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 1
      });
    }
    if (this.animId) cancelAnimationFrame(this.animId);
    this.animate();
  }

  animate() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    let active = false;

    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35;
      p.opacity -= 0.012;

      if (p.opacity > 0) {
        active = true;
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = Math.max(0, p.opacity);
        this.ctx.fillRect(p.x, p.y, p.size, p.size);
      }
    });

    if (active) {
      this.animId = requestAnimationFrame(() => this.animate());
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

const confetti = new RetroConfetti();

const MIN_NUMBER = 1;
const MAX_NUMBER = 20;

let secretNumber = Math.trunc(Math.random() * MAX_NUMBER) + MIN_NUMBER;
let score = 20;
let highscore = 0; // Pure in-memory variable
let userGuesses = [];
let gameOver = false;

const bodyEl = document.querySelector('body');
const secretBoxEl = document.getElementById('secret-number-box');
const guessInputEl = document.getElementById('guess-input');
const messageEl = document.getElementById('message-text');
const scoreEl = document.getElementById('score-text');
const highscoreEl = document.getElementById('highscore-text');
const historyBoxEl = document.getElementById('history-box');
const checkBtn = document.getElementById('check-btn');
const againBtn = document.getElementById('again-btn');

highscoreEl.textContent = highscore;

const displayMessage = function (message) {
  messageEl.textContent = message;
};

const renderHistory = function () {
  if (userGuesses.length === 0) {
    historyBoxEl.innerHTML = '<span class="empty-history">None yet</span>';
    return;
  }
  historyBoxEl.innerHTML = '';
  userGuesses.forEach(item => {
    const chip = document.createElement('span');
    chip.className = `guess-chip ${item.type}`;
    chip.textContent = item.val;
    historyBoxEl.appendChild(chip);
  });
};

checkBtn.addEventListener('click', function () {
  audio.playClick();
  if (gameOver) return;

  const guessRaw = guessInputEl.value;

  // CASE 1: Empty Input
  if (guessRaw.trim() === '') {
    audio.playError();
    displayMessage('⛔ No number!');
    return;
  }

  const guess = Number(guessRaw);

  // CASE 2: Invalid or Non-Integer Inputs
  if (isNaN(guess) || !Number.isInteger(guess)) {
    audio.playError();
    displayMessage('⛔ Invalid integer!');
    return;
  }

  // CASE 3: Negative Values
  if (guess < 0) {
    audio.playError();
    displayMessage('⛔ No negative numbers!');
    return;
  }

  // CASE 4: Out of Range
  if (guess < MIN_NUMBER || guess > MAX_NUMBER) {
    audio.playError();
    displayMessage(`⛔ Must be between ${MIN_NUMBER} and ${MAX_NUMBER}!`);
    return;
  }

  // CASE 5: Player Wins!
  if (guess === secretNumber) {
    gameOver = true;
    audio.playWin();
    confetti.trigger();

    displayMessage('🎉 Correct Number!');
    secretBoxEl.textContent = secretNumber;
    secretBoxEl.classList.add('win-width');
    bodyEl.style.backgroundColor = '#60b853';

    // Record guess history
    userGuesses.push({ val: guess, type: 'correct' });
    renderHistory();

    // Check & Update Highscore in Memory
    if (score > highscore) {
      highscore = score;
      highscoreEl.textContent = highscore;
    }
  }
  // CASE 6: Guess is Wrong
  else if (guess !== secretNumber) {
    if (score > 1) {
      const isHigh = guess > secretNumber;
      displayMessage(isHigh ? '📈 Too high!' : '📉 Too low!');

      if (isHigh) audio.playHigh();
      else audio.playLow();

      score--;
      scoreEl.textContent = score;

      userGuesses.push({ val: guess, type: isHigh ? 'high' : 'low' });
      renderHistory();
    } else {
      // Game Over / Lost
      gameOver = true;
      audio.playLoss();
      score = 0;
      scoreEl.textContent = 0;

      displayMessage('💥 You lost the game!');
      secretBoxEl.textContent = secretNumber;
      bodyEl.style.backgroundColor = '#e52521';

      userGuesses.push({ val: guess, type: guess > secretNumber ? 'high' : 'low' });
      renderHistory();
    }
  }

  guessInputEl.value = '';
  guessInputEl.focus();
});

// AGAIN / RESET BUTTON CLICK LISTENER
againBtn.addEventListener('click', function () {
  audio.playClick();
  
  // Reset State Variables
  score = 20;
  secretNumber = Math.trunc(Math.random() * MAX_NUMBER) + MIN_NUMBER;
  userGuesses = [];
  gameOver = false;

  // Reset UI
  displayMessage('Start guessing...');
  scoreEl.textContent = score;
  secretBoxEl.textContent = '?';
  secretBoxEl.classList.remove('win-width');
  guessInputEl.value = '';
  bodyEl.style.backgroundColor = '#60b853';
  renderHistory();
});

// Allow 'Enter' Key to Submit Guess
guessInputEl.addEventListener('keypress', function (e) {
  if (e.key === 'Enter') {
    checkBtn.click();
  }
});
