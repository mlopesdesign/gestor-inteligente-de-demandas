// src/js/backend/ulid.js — gerador de ULIDs (26 chars, ordenável)
// Mantido simples p/ não depender de npm no cliente.

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const TIME_LEN = 10;
const RAND_LEN = 16;

export const UlidFactory = {
  _lastTime: 0,
  _lastRand: '',
  next() {
    let now = Date.now();
    if (now === this._lastTime) {
      // incrementa random dentro do mesmo ms
      const r = this._incrementRand(this._lastRand);
      this._lastRand = r;
      return this._encodeTime(now) + r;
    }
    this._lastTime = now;
    this._lastRand = this._random(RAND_LEN);
    return this._encodeTime(now) + this._lastRand;
  },
  _encodeTime(ms) {
    let s = '';
    for (let i = TIME_LEN - 1; i >= 0; i--) {
      s = ALPHABET[ms % 32] + s;
      ms = Math.floor(ms / 32);
    }
    return s;
  },
  _random(len) {
    let s = '';
    for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * 32)];
    return s;
  },
  _incrementRand(r) {
    const chars = r.split('');
    for (let i = chars.length - 1; i >= 0; i--) {
      const idx = ALPHABET.indexOf(chars[i]);
      if (idx < 31) { chars[i] = ALPHABET[idx + 1]; return chars.join(''); }
      chars[i] = '0';
    }
    return '0' + chars.join('');
  },
};
