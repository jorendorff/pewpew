/*
 * This program is derived from PuzzleScript, which includes:
 *
 * RIFFWAVE.js v0.02 - Audio encoder for HTML5 <audio> elements.
 * Copyright (C) 2011 Pedro Ladaria <pedro.ladaria at Gmail dot com>
 *
 * Therefore:
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * version 2 as published by the Free Software Foundation.
 * The full license is available at http://www.gnu.org/licenses/gpl.html
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 */



// === RC4 - An implementation of the ubiquitous stream cipher
// Note: Don't use this for security. RC4 is very broken.

// new RC4(key) - Create a new RC4 stream. key is any string.
function RC4(key) {
    this.i = 0;
    this.j = 0;
    this.s = [];
    for (var i = 0; i < 256; i++) {
        this.s[i] = i;
    }

    // Shuffle the array s using entropy from the key string.
    var j = 0;
    for (var i = 0; i < 256; i++) {
        j += this.s[i] + key.charCodeAt(i % key.length);
        j %= 256;
        this._swap(i, j);
    }
}

RC4.prototype._swap = function(i, j) {
    var tmp = this.s[i];
    this.s[i] = this.s[j];
    this.s[j] = tmp;
};

// rc4.next() - Return the next byte of the cipher stream.
RC4.prototype.next = function() {
    this.i = (this.i + 1) % 256;
    this.j = (this.j + this.s[this.i]) % 256;
    this._swap(this.i, this.j);
    return this.s[(this.s[this.i] + this.s[this.j]) % 256];
};



// === RNG - produce psuedorandom floating-point values from a byte stream

// new RNG(stream) - Create a pseudorandom number generator.
// stream is a byte stream, any object whose .next() method
// returns an integer 0-255.
function RNG(stream) {
    this._stream = stream;
}

// rng.uniform() - Return a uniformly-distributed random number
// in the range [0, 1].
RNG.prototype.uniform = function() {
    var BYTES = 7; // 56 bits to make a 53-bit double
    var output = 0;
    for (var i = 0; i < BYTES; i++) {
        output = 256 * output + this._stream.next();
    }
    return output / (Math.pow(2, BYTES * 8) - 1);
};



// === rngToParams - Produce a random Params object.

function rngToParams(seed, rng) {
    var SOUND_VOL = 0.25;
    var SAMPLE_RATE = 5512;//44100;
    var SAMPLE_SIZE = 8;

    function frnd(range) {
        return rng.uniform() * range;
    }

    function rnd(max) {
        return Math.floor(rng.uniform() * (max + 1));
    }

    // Each of these functions returns a randomly populated Params object.

    function pickupCoin() {
        var result = Params();
        result.wave_type = Math.floor(frnd(NUM_SHAPES));
        if (result.wave_type === NOISE) {
            result.wave_type = SQUARE;
        }
        result.p_base_freq = 0.4 + frnd(0.5);
        result.p_env_attack = 0.0;
        result.p_env_sustain = frnd(0.1);
        result.p_env_decay = 0.1 + frnd(0.4);
        result.p_env_punch = 0.3 + frnd(0.3);
        if (rnd(1)) {
            result.p_arp_speed = 0.5 + frnd(0.2);
            var num = (frnd(7) | 1) + 1;
            var den = num + (frnd(7) | 1) + 2;
            result.p_arp_mod = (+num) / (+den);
        }
        return result;
    }

    function laserShoot() {
        var result = Params();
        if (rnd(2) === 2 && rnd(1)) {
            rnd(1);
        }
        result.wave_type = Math.floor(frnd(NUM_SHAPES));

        if (result.wave_type === 3) {
            result.wave_type = SQUARE;
        }

        result.p_base_freq = 0.5 + frnd(0.5);
        result.p_freq_limit = result.p_base_freq - 0.2 - frnd(0.6);
        if (result.p_freq_limit < 0.2) {
            result.p_freq_limit = 0.2;
        }
        result.p_freq_ramp = -0.15 - frnd(0.2);
        if (rnd(2) === 0) {
            result.p_base_freq = 0.3 + frnd(0.6);
            result.p_freq_limit = frnd(0.1);
            result.p_freq_ramp = -0.35 - frnd(0.3);
        }
        if (rnd(1)) {
            result.p_duty = frnd(0.5);
            result.p_duty_ramp = frnd(0.2);
        } else {
            result.p_duty = 0.4 + frnd(0.5);
            result.p_duty_ramp = -frnd(0.7);
        }
        result.p_env_attack = 0.0;
        result.p_env_sustain = 0.1 + frnd(0.2);
        result.p_env_decay = frnd(0.4);
        if (rnd(1)) {
            result.p_env_punch = frnd(0.3);
        }
        if (rnd(2) === 0) {
            result.p_pha_offset = frnd(0.2);
            result.p_pha_ramp = -frnd(0.2);
        }
        if (rnd(1)) {
            result.p_hpf_freq = frnd(0.3);
        }

        return result;
    }

    function explosion() {
        var result = Params();

        if (rnd(1)) {
            result.p_base_freq = 0.1 + frnd(0.4);
            result.p_freq_ramp = -0.1 + frnd(0.4);
        } else {
            result.p_base_freq = 0.2 + frnd(0.7);
            result.p_freq_ramp = -0.2 - frnd(0.2);
        }
        result.p_base_freq *= result.p_base_freq;
        if (rnd(4) === 0) {
            result.p_freq_ramp = 0.0;
        }
        if (rnd(2) === 0) {
            result.p_repeat_speed = 0.3 + frnd(0.5);
        }
        result.p_env_attack = 0.0;
        result.p_env_sustain = 0.1 + frnd(0.3);
        result.p_env_decay = frnd(0.5);
        if (rnd(1) === 0) {
            result.p_pha_offset = -0.3 + frnd(0.9);
            result.p_pha_ramp = -frnd(0.3);
        }
        result.p_env_punch = 0.2 + frnd(0.6);
        if (rnd(1)) {
            result.p_vib_strength = frnd(0.7);
            result.p_vib_speed = frnd(0.6);
        }
        if (rnd(2) === 0) {
            result.p_arp_speed = 0.6 + frnd(0.3);
            result.p_arp_mod = 0.8 - frnd(1.6);
        }

        return result;
    }

    function birdSound() {
        var result = Params();

        if (frnd(10) < 1) {
            result.wave_type = Math.floor(frnd(NUM_SHAPES));
            if (result.wave_type === 3) {
                result.wave_type = SQUARE;
            }
            result.p_env_attack = 0.4304400932967592 + frnd(0.2) - 0.1;
            result.p_env_sustain = 0.15739346034252394 + frnd(0.2) - 0.1;
            result.p_env_punch = 0.004488201744871758 + frnd(0.2) - 0.1;
            result.p_env_decay = 0.07478075528212291 + frnd(0.2) - 0.1;
            result.p_base_freq = 0.9865265720147687 + frnd(0.2) - 0.1;
            result.p_freq_limit = 0 + frnd(0.2) - 0.1;
            result.p_freq_ramp = -0.2995018224359539 + frnd(0.2) - 0.1;
            if (frnd(1.0) < 0.5) {
                result.p_freq_ramp = 0.1 + frnd(0.15);
            }
            result.p_freq_dramp = 0.004598608156964473 + frnd(0.1) - 0.05;
            result.p_vib_strength = -0.2202799497929496 + frnd(0.2) - 0.1;
            result.p_vib_speed = 0.8084998703158364 + frnd(0.2) - 0.1;
            result.p_arp_mod = 0;
            result.p_arp_speed = 0;
            result.p_duty = -0.9031808754347107 + frnd(0.2) - 0.1;
            result.p_duty_ramp = -0.8128699999808343 + frnd(0.2) - 0.1;
            result.p_repeat_speed = 0.6014860189319991 + frnd(0.2) - 0.1;
            result.p_pha_offset = -0.9424902314367765 + frnd(0.2) - 0.1;
            result.p_pha_ramp = -0.1055482222272056 + frnd(0.2) - 0.1;
            result.p_lpf_freq = 0.9989765717851521 + frnd(0.2) - 0.1;
            result.p_lpf_ramp = -0.25051720626043017 + frnd(0.2) - 0.1;
            result.p_lpf_resonance = 0.32777871505494693 + frnd(0.2) - 0.1;
            result.p_hpf_freq = 0.0023548750981756753 + frnd(0.2) - 0.1;
            result.p_hpf_ramp = -0.002375673204842568 + frnd(0.2) - 0.1;
            return result;
        }

        if (frnd(10) < 1) {
            result.wave_type = Math.floor(frnd(NUM_SHAPES));
            if (result.wave_type === 3) {
                result.wave_type = SQUARE;
            }
            result.p_env_attack = 0.5277795946672003 + frnd(0.2) - 0.1;
            result.p_env_sustain = 0.18243733568468432 + frnd(0.2) - 0.1;
            result.p_env_punch = -0.020159754546840117 + frnd(0.2) - 0.1;
            result.p_env_decay = 0.1561353422051903 + frnd(0.2) - 0.1;
            result.p_base_freq = 0.9028855606533718 + frnd(0.2) - 0.1;
            result.p_freq_limit = -0.008842787837148716;
            result.p_freq_ramp = -0.1;
            result.p_freq_dramp = -0.012891241489551925;
            result.p_vib_strength = -0.17923136138403065 + frnd(0.2) - 0.1;
            result.p_vib_speed = 0.908263385610142 + frnd(0.2) - 0.1;
            result.p_arp_mod = 0.41690153355414894 + frnd(0.2) - 0.1;
            result.p_arp_speed = 0.0010766233195860703 + frnd(0.2) - 0.1;
            result.p_duty = -0.8735363011184684 + frnd(0.2) - 0.1;
            result.p_duty_ramp = -0.7397985366747507 + frnd(0.2) - 0.1;
            result.p_repeat_speed = 0.0591789344172107 + frnd(0.2) - 0.1;
            result.p_pha_offset = -0.9961184222777699 + frnd(0.2) - 0.1;
            result.p_pha_ramp = -0.08234769395850523 + frnd(0.2) - 0.1;
            result.p_lpf_freq = 0.9412475115697335 + frnd(0.2) - 0.1;
            result.p_lpf_ramp = -0.18261358925834958 + frnd(0.2) - 0.1;
            result.p_lpf_resonance = 0.24541438107389477 + frnd(0.2) - 0.1;
            result.p_hpf_freq = -0.01831940280978611 + frnd(0.2) - 0.1;
            result.p_hpf_ramp = -0.03857383633171346 + frnd(0.2) - 0.1;
            return result;

        }
        if (frnd(10) < 1) {
            result.wave_type = Math.floor(frnd(NUM_SHAPES));

            if (result.wave_type === 3) {
                result.wave_type = SQUARE;
            }
            result.p_env_attack = 0.4304400932967592 + frnd(0.2) - 0.1;
            result.p_env_sustain = 0.15739346034252394 + frnd(0.2) - 0.1;
            result.p_env_punch = 0.004488201744871758 + frnd(0.2) - 0.1;
            result.p_env_decay = 0.07478075528212291 + frnd(0.2) - 0.1;
            result.p_base_freq = 0.9865265720147687 + frnd(0.2) - 0.1;
            result.p_freq_limit = 0 + frnd(0.2) - 0.1;
            result.p_freq_ramp = -0.2995018224359539 + frnd(0.2) - 0.1;
            result.p_freq_dramp = 0.004598608156964473 + frnd(0.2) - 0.1;
            result.p_vib_strength = -0.2202799497929496 + frnd(0.2) - 0.1;
            result.p_vib_speed = 0.8084998703158364 + frnd(0.2) - 0.1;
            result.p_arp_mod = -0.46410459213693644 + frnd(0.2) - 0.1;
            result.p_arp_speed = -0.10955361249587248 + frnd(0.2) - 0.1;
            result.p_duty = -0.9031808754347107 + frnd(0.2) - 0.1;
            result.p_duty_ramp = -0.8128699999808343 + frnd(0.2) - 0.1;
            result.p_repeat_speed = 0.7014860189319991 + frnd(0.2) - 0.1;
            result.p_pha_offset = -0.9424902314367765 + frnd(0.2) - 0.1;
            result.p_pha_ramp = -0.1055482222272056 + frnd(0.2) - 0.1;
            result.p_lpf_freq = 0.9989765717851521 + frnd(0.2) - 0.1;
            result.p_lpf_ramp = -0.25051720626043017 + frnd(0.2) - 0.1;
            result.p_lpf_resonance = 0.32777871505494693 + frnd(0.2) - 0.1;
            result.p_hpf_freq = 0.0023548750981756753 + frnd(0.2) - 0.1;
            result.p_hpf_ramp = -0.002375673204842568 + frnd(0.2) - 0.1;
            return result;
        }
        if (frnd(5) > 1) {
            result.wave_type = Math.floor(frnd(NUM_SHAPES));

            if (result.wave_type === 3) {
                result.wave_type = SQUARE;
            }
            if (rnd(1)) {
                result.p_arp_mod = 0.2697849293151393 + frnd(0.2) - 0.1;
                result.p_arp_speed = -0.3131172257760948 + frnd(0.2) - 0.1;
                result.p_base_freq = 0.8090588299313949 + frnd(0.2) - 0.1;
                result.p_duty = -0.6210022920964955 + frnd(0.2) - 0.1;
                result.p_duty_ramp = -0.00043441813553182567 + frnd(0.2) - 0.1;
                result.p_env_attack = 0.004321877246874195 + frnd(0.2) - 0.1;
                result.p_env_decay = 0.1 + frnd(0.2) - 0.1;
                result.p_env_punch = 0.061737781504416146 + frnd(0.2) - 0.1;
                result.p_env_sustain = 0.4987252564798832 + frnd(0.2) - 0.1;
                result.p_freq_dramp = 0.31700340314222614 + frnd(0.2) - 0.1;
                result.p_freq_limit = 0 + frnd(0.2) - 0.1;
                result.p_freq_ramp = -0.163380391341416 + frnd(0.2) - 0.1;
                result.p_hpf_freq = 0.4709005021145149 + frnd(0.2) - 0.1;
                result.p_hpf_ramp = 0.6924667290539194 + frnd(0.2) - 0.1;
                result.p_lpf_freq = 0.8351398631384511 + frnd(0.2) - 0.1;
                result.p_lpf_ramp = 0.36616557192873134 + frnd(0.2) - 0.1;
                result.p_lpf_resonance = -0.08685777111664439 + frnd(0.2) - 0.1;
                result.p_pha_offset = -0.036084571580025544 + frnd(0.2) - 0.1;
                result.p_pha_ramp = -0.014806445085568108 + frnd(0.2) - 0.1;
                result.p_repeat_speed = -0.8094368475518489 + frnd(0.2) - 0.1;
                result.p_vib_speed = 0.4496665457171294 + frnd(0.2) - 0.1;
                result.p_vib_strength = 0.23413762515532424 + frnd(0.2) - 0.1;
            } else {
                result.p_arp_mod = -0.35697118026766184 + frnd(0.2) - 0.1;
                result.p_arp_speed = 0.3581140690559588 + frnd(0.2) - 0.1;
                result.p_base_freq = 1.3260897696157528 + frnd(0.2) - 0.1;
                result.p_duty = -0.30984900436710694 + frnd(0.2) - 0.1;
                result.p_duty_ramp = -0.0014374759133411626 + frnd(0.2) - 0.1;
                result.p_env_attack = 0.3160357835682254 + frnd(0.2) - 0.1;
                result.p_env_decay = 0.1 + frnd(0.2) - 0.1;
                result.p_env_punch = 0.24323114016870148 + frnd(0.2) - 0.1;
                result.p_env_sustain = 0.4 + frnd(0.2) - 0.1;
                result.p_freq_dramp = 0.2866475886237244 + frnd(0.2) - 0.1;
                result.p_freq_limit = 0 + frnd(0.2) - 0.1;
                result.p_freq_ramp = -0.10956352368742976 + frnd(0.2) - 0.1;
                result.p_hpf_freq = 0.20772718017889846 + frnd(0.2) - 0.1;
                result.p_hpf_ramp = 0.1564090637378835 + frnd(0.2) - 0.1;
                result.p_lpf_freq = 0.6021372770637031 + frnd(0.2) - 0.1;
                result.p_lpf_ramp = 0.24016227139979027 + frnd(0.2) - 0.1;
                result.p_lpf_resonance = -0.08787383821160144 + frnd(0.2) - 0.1;
                result.p_pha_offset = -0.381597686151701 + frnd(0.2) - 0.1;
                result.p_pha_ramp = -0.0002481687661373495 + frnd(0.2) - 0.1;
                result.p_repeat_speed = 0.07812112809425686 + frnd(0.2) - 0.1;
                result.p_vib_speed = -0.13648848579133943 + frnd(0.2) - 0.1;
                result.p_vib_strength = 0.0018874158972302657 + frnd(0.2) - 0.1;
            }
            return result;

        }

        result.wave_type = Math.floor(frnd(NUM_SHAPES));
        if (result.wave_type === 1 || result.wave_type === 3) {
            result.wave_type = 2;
        }
        result.p_base_freq = 0.85 + frnd(0.15);
        result.p_freq_ramp = 0.3 + frnd(0.15);

        result.p_env_attack = 0 + frnd(0.09);
        result.p_env_sustain = 0.2 + frnd(0.3);
        result.p_env_decay = 0 + frnd(0.1);

        result.p_duty = frnd(2.0) - 1.0;
        result.p_duty_ramp = Math.pow(frnd(2.0) - 1.0, 3.0);


        result.p_repeat_speed = 0.5 + frnd(0.1);

        result.p_pha_offset = -0.3 + frnd(0.9);
        result.p_pha_ramp = -frnd(0.3);

        result.p_arp_speed = 0.4 + frnd(0.6);
        result.p_arp_mod = 0.8 + frnd(0.1);


        result.p_lpf_resonance = frnd(2.0) - 1.0;
        result.p_lpf_freq = 1.0 - Math.pow(frnd(1.0), 3.0);
        result.p_lpf_ramp = Math.pow(frnd(2.0) - 1.0, 3.0);
        if (result.p_lpf_freq < 0.1 && result.p_lpf_ramp < -0.05) {
            result.p_lpf_ramp = -result.p_lpf_ramp;
        }
        result.p_hpf_freq = Math.pow(frnd(1.0), 5.0);
        result.p_hpf_ramp = Math.pow(frnd(2.0) - 1.0, 5.0);

        return result;
    }

    function pushSound() {
        var result = Params();
        result.wave_type = Math.floor(frnd(NUM_SHAPES));
        if (result.wave_type === 2) {
            result.wave_type++;
        }
        if (result.wave_type === 0) {
            result.wave_type = NOISE;
        }

        result.p_base_freq = 0.1 + frnd(0.4);
        result.p_freq_ramp = 0.05 + frnd(0.2);

        result.p_env_attack = 0.01 + frnd(0.09);
        result.p_env_sustain = 0.01 + frnd(0.09);
        result.p_env_decay = 0.01 + frnd(0.09);

        result.p_repeat_speed = 0.3 + frnd(0.5);
        result.p_pha_offset = -0.3 + frnd(0.9);
        result.p_pha_ramp = -frnd(0.3);
        result.p_arp_speed = 0.6 + frnd(0.3);
        result.p_arp_mod = 0.8 - frnd(1.6);

        return result;
    }

    function powerUp() {
        var result = Params();
        if (rnd(1)) {
            result.wave_type = SAWTOOTH;
        } else {
            result.p_duty = frnd(0.6);
        }
        result.wave_type = Math.floor(frnd(NUM_SHAPES));
        if (result.wave_type === 3) {
            result.wave_type = SQUARE;
        }
        if (rnd(1)) {
            result.p_base_freq = 0.2 + frnd(0.3);
            result.p_freq_ramp = 0.1 + frnd(0.4);
            result.p_repeat_speed = 0.4 + frnd(0.4);
        } else {
            result.p_base_freq = 0.2 + frnd(0.3);
            result.p_freq_ramp = 0.05 + frnd(0.2);
            if (rnd(1)) {
                result.p_vib_strength = frnd(0.7);
                result.p_vib_speed = frnd(0.6);
            }
        }
        result.p_env_attack = 0.0;
        result.p_env_sustain = frnd(0.4);
        result.p_env_decay = 0.1 + frnd(0.4);

        return result;
    }

    function hitHurt() {
        result = Params();
        result.wave_type = rnd(2);
        if (result.wave_type === SINE) {
            result.wave_type = NOISE;
        }
        if (result.wave_type === SQUARE) {
            result.p_duty = frnd(0.6);
        }
        result.wave_type = Math.floor(frnd(NUM_SHAPES));
        result.p_base_freq = 0.2 + frnd(0.6);
        result.p_freq_ramp = -0.3 - frnd(0.4);
        result.p_env_attack = 0.0;
        result.p_env_sustain = frnd(0.1);
        result.p_env_decay = 0.1 + frnd(0.2);
        if (rnd(1)) {
            result.p_hpf_freq = frnd(0.3);
        }
        return result;
    }

    function jump() {
        result = Params();
        result.wave_type = SQUARE;
        result.wave_type = Math.floor(frnd(NUM_SHAPES));
        if (result.wave_type === 3) {
            result.wave_type = SQUARE;
        }
        result.p_duty = frnd(0.6);
        result.p_base_freq = 0.3 + frnd(0.3);
        result.p_freq_ramp = 0.1 + frnd(0.2);
        result.p_env_attack = 0.0;
        result.p_env_sustain = 0.1 + frnd(0.3);
        result.p_env_decay = 0.1 + frnd(0.2);
        if (rnd(1)) {
            result.p_hpf_freq = frnd(0.3);
        }
        if (rnd(1)) {
            result.p_lpf_freq = 1.0 - frnd(0.6);
        }
        return result;
    }

    function blipSelect() {
        result = Params();
        result.wave_type = rnd(1);
        result.wave_type = Math.floor(frnd(NUM_SHAPES));
        if (result.wave_type === 3) {
            result.wave_type = rnd(1);
        }
        if (result.wave_type === SQUARE) {
            result.p_duty = frnd(0.6);
        }
        result.p_base_freq = 0.2 + frnd(0.4);
        result.p_env_attack = 0.0;
        result.p_env_sustain = 0.1 + frnd(0.1);
        result.p_env_decay = frnd(0.2);
        result.p_hpf_freq = 0.1;
        return result;
    }

    function random() {
        result = Params();
        result.wave_type = Math.floor(frnd(NUM_SHAPES));
        result.p_base_freq = Math.pow(frnd(2.0) - 1.0, 2.0);
        if (rnd(1)) {
            result.p_base_freq = Math.pow(frnd(2.0) - 1.0, 3.0) + 0.5;
        }
        result.p_freq_limit = 0.0;
        result.p_freq_ramp = Math.pow(frnd(2.0) - 1.0, 5.0);
        if (result.p_base_freq > 0.7 && result.p_freq_ramp > 0.2) {
            result.p_freq_ramp = -result.p_freq_ramp;
        }
        if (result.p_base_freq < 0.2 && result.p_freq_ramp < -0.05) {
            result.p_freq_ramp = -result.p_freq_ramp;
        }
        result.p_freq_dramp = Math.pow(frnd(2.0) - 1.0, 3.0);
        result.p_duty = frnd(2.0) - 1.0;
        result.p_duty_ramp = Math.pow(frnd(2.0) - 1.0, 3.0);
        result.p_vib_strength = Math.pow(frnd(2.0) - 1.0, 3.0);
        result.p_vib_speed = frnd(2.0) - 1.0;
        result.p_env_attack = Math.pow(frnd(2.0) - 1.0, 3.0);
        result.p_env_sustain = Math.pow(frnd(2.0) - 1.0, 2.0);
        result.p_env_decay = frnd(2.0) - 1.0;
        result.p_env_punch = Math.pow(frnd(0.8), 2.0);
        if (result.p_env_attack + result.p_env_sustain + result.p_env_decay < 0.2) {
            result.p_env_sustain += 0.2 + frnd(0.3);
            result.p_env_decay += 0.2 + frnd(0.3);
        }
        result.p_lpf_resonance = frnd(2.0) - 1.0;
        result.p_lpf_freq = 1.0 - Math.pow(frnd(1.0), 3.0);
        result.p_lpf_ramp = Math.pow(frnd(2.0) - 1.0, 3.0);
        if (result.p_lpf_freq < 0.1 && result.p_lpf_ramp < -0.05) {
            result.p_lpf_ramp = -result.p_lpf_ramp;
        }
        result.p_hpf_freq = Math.pow(frnd(1.0), 5.0);
        result.p_hpf_ramp = Math.pow(frnd(2.0) - 1.0, 5.0);
        result.p_pha_offset = Math.pow(frnd(2.0) - 1.0, 3.0);
        result.p_pha_ramp = Math.pow(frnd(2.0) - 1.0, 3.0);
        result.p_repeat_speed = frnd(2.0) - 1.0;
        result.p_arp_speed = frnd(2.0) - 1.0;
        result.p_arp_mod = frnd(2.0) - 1.0;
        return result;
    }

    // Now we simply select one of those functions, based on the last 2 digits
    // of the seed, and call it.
    var generators = [
        pickupCoin,
        laserShoot,
        explosion,
        powerUp,
        hitHurt,
        jump,
        blipSelect,
        pushSound,
        random,
        birdSound
    ];
    var soundGenerator = generators[seed % 100 % generators.length];
    var params = soundGenerator();

    params.sound_vol = SOUND_VOL;
    params.sample_rate = SAMPLE_RATE;
    params.sample_size = SAMPLE_SIZE;
    return params;
}



// === synthesize - Given a Params object, produce sampled audio.

var SQUARE = 0;
var SAWTOOTH = 1;
var SINE = 2;
var NOISE = 3;
var TRIANGLE = 4;
var BREAKER = 5;

var NUM_SHAPES = 6;

// Sound generation parameters are on [0,1] unless noted SIGNED, & thus [-1,1]
function Params() {
    return {
        // Wave shape
        wave_type: SQUARE,

        // Envelope
        p_env_attack: 0,     // Attack time
        p_env_sustain: 0.3,  // Sustain time
        p_env_punch: 0,      // Sustain punch
        p_env_decay: 0.4,    // Decay time

        // Tone
        p_base_freq: 0.3,    // Start frequency
        p_freq_limit: 0,     // Min frequency cutoff
        p_freq_ramp: 0,      // Slide (SIGNED)
        p_freq_dramp: 0,     // Delta slide (SIGNED)
        // Vibrato
        p_vib_strength: 0,   // Vibrato depth
        p_vib_speed: 0,      // Vibrato speed

        // Tonal change
        p_arp_mod: 0,        // Change amount (SIGNED)
        p_arp_speed: 0,      // Change speed

        // Duty (wat's that?)
        p_duty: 0,           // Square duty
        p_duty_ramp: 0,      // Duty sweep (SIGNED)

        // Repeat
        p_repeat_speed: 0,   // Repeat speed

        // Phaser
        p_pha_offset: 0,     // Phaser offset (SIGNED)
        p_pha_ramp: 0,       // Phaser sweep (SIGNED)

        // Low-pass filter
        p_lpf_freq: 1.0,     // Low-pass filter cutoff
        p_lpf_ramp: 0,       // Low-pass filter cutoff sweep (SIGNED)
        p_lpf_resonance: 0,  // Low-pass filter resonance
        // High-pass filter
        p_hpf_freq: 0,       // High-pass filter cutoff
        p_hpf_ramp: 0,       // High-pass filter cutoff sweep (SIGNED)

        // Sample parameters
        sound_vol: 0.5,
        sample_rate: 44100,
        sample_size: 8
    };
}

var SUPERSAMPLES = 8;

function env_lengths(ps) {
    return [
        SUPERSAMPLES * (Math.floor(ps.p_env_attack * ps.p_env_attack * 100000.0) + 1),
        SUPERSAMPLES * (Math.floor(ps.p_env_sustain * ps.p_env_sustain * 100000.0) + 1),
        SUPERSAMPLES * (Math.floor(ps.p_env_decay * ps.p_env_decay * 100000.0) + 1)
    ];
}

function computePeriodSamples(ps) {
    // If ps.p_repeat_speed is nonzero, the frequency will reset periodically
    // during the sound.
    var rep_period = (ps.p_repeat_speed == 0.0)
                     ? 0
                     : Math.floor(Math.pow(1.0 - ps.p_repeat_speed, 2.0) * 20000 + 32);
    var rep_time;
    var fperiod, fslide; // variables that reset

    function repeat() {
        // Reset the clock and the two variables that reset.
        rep_time = 0;
        fperiod = 100.0 / (ps.p_base_freq * ps.p_base_freq + 0.001);
        fslide = 1.0 - Math.pow(ps.p_freq_ramp, 3.0) * 0.01;
    }

    repeat();  // First time through, this is a bit of a misnomer

    // Frequency slide
    var fmaxperiod = 100.0 / (ps.p_freq_limit * ps.p_freq_limit + 0.001);
    var fdslide = -Math.pow(ps.p_freq_dramp, 3.0) * 0.000001;

    // ...end of initialization. Generate period samples.

    var env_length = env_lengths(ps);
    var max_samples = (env_length[0] + env_length[1] + env_length[2]) / SUPERSAMPLES;
    var buffer = new Float64Array(max_samples);

    for (var t = 0; t < max_samples; ++t) {
        // Repeats
        if (rep_period != 0 && ++rep_time >= rep_period) {
            repeat();
        }

        // Frequency slide, and frequency slide slide!
        fslide += fdslide;
        fperiod *= fslide;
        if (fperiod > fmaxperiod) {
            fperiod = fmaxperiod;
            if (ps.p_freq_limit > 0.0) {
                return buffer.subarray(0, t);
            }
        }

        buffer[t] = fperiod;
    }

    return buffer;
}

// In sythesizers, "arpeggio" means an abrupt change in frequency during a
// sound. This synthesizer only supports a single cutoff point.
function applyArpeggio(params, periodSamples) {
    var len = periodSamples.length;
    var arp_time = Math.floor(Math.pow(1.0 - params.p_arp_speed, 2.0) * 20000 + 32);
    if (params.p_arp_mod === 0.0 || arp_time >= len) {
        // No arpeggio. The algorithm below will produce an exact copy
        // of the input. Don't bother.
        return periodSamples;
    }

    var arp_mod = (params.p_arp_mod >= 0.0)
                  ? 1.0 - Math.pow(params.p_arp_mod, 2.0) * 0.9
                  : 1.0 + Math.pow(params.p_arp_mod, 2.0) * 10.0;

    var out = new Float64Array(len);
    for (var i = 0; i < arp_time; i++) {
        out[i] = periodSamples[i];
    }
    for (; i < len; i++) {
        out[i] = periodSamples[i] * arp_mod;
    }
    return out;
}

function applyVibrato(params, periodSamples) {
    var vib_phase = 0.0;
    var vib_speed = Math.pow(params.p_vib_speed, 2.0) * 0.01;
    var vib_amp = params.p_vib_strength * 0.5;

    var len = periodSamples.length;
    var out = new Float64Array(len);
    for (var i = 0; i < len; i++) {
        // Vibrato - if ps.p_vib_strength is 0, then vib_amp is 0 and this has no effect.
        vib_phase += vib_speed;
        var period = periodSamples[i] * (1.0 + vib_amp * Math.sin(vib_phase));

        // But this has an effect regardless.
        period = Math.floor(period);
        if (period < 8) {
            period = 8;
        }
        out[i] = period;
    }
    return out;
}

// Return a copy of the array samples, but with each element repeated N times.
// The result is N times as long as samples.
function prolong(N, samples) {
    var len = samples.length;
    var out = new Float64Array(len * N);
    var j = 0, k = 0;
    for (var i = 0; i < len; i++) {
        var sample = samples[i];

        k += N;
        for (; j < k; j++) {
            out[j] = sample;
        }
    }
    return out;
}

function applyBaseWaveform(params, periodSamples) {
    var type = params.wave_type;

    // Square duty
    // BUG: This should reset when repeat() fires.
    var square_duty = 0.5 - params.p_duty * 0.5;
    var square_slide = -params.p_duty_ramp * 0.00005 / SUPERSAMPLES;

    // Noise
    var noise_buffer = [];
    for (var i = 0; i < 32; ++i) {
        noise_buffer[i] = Math.random() * 2.0 - 1.0;
    }

    var len = periodSamples.length;
    var out = new Float64Array(len);
    var phase = 0;
    for (var i = 0; i < len; i++) {
        var period = periodSamples[i];

        phase++;
        if (phase >= period) {
            phase %= period;
            if (type === NOISE) {
                for (var i = 0; i < 32; ++i) {
                    noise_buffer[i] = Math.random() * 2.0 - 1.0;
                }
            }
        }

        // Base waveform
        var sample;
        var fp = phase / period;
        if (type === SQUARE) {
            square_duty += square_slide;
            if (square_duty < 0.0) square_duty = 0.0;
            if (square_duty > 0.5) square_duty = 0.5;

            if (fp < square_duty) {
                sample = 0.5;
            } else {
                sample = -0.5;
            }
        } else if (type === SAWTOOTH) {
            sample = 1.0 - fp * 2;
        } else if (type === SINE) {
            sample = Math.sin(fp * 2 * Math.PI);
        } else if (type === NOISE) {
            sample = noise_buffer[Math.floor(phase * 32 / period)];
        } else if (type === TRIANGLE) {
            sample = Math.abs(1 - fp * 2) - 1;
        } else if (type === BREAKER) {
            sample = Math.abs(1 - fp * fp * 2) - 1;
        } else {
            throw new Exception('bad wave type! ' + type);
        }

        out[i] = sample;
    }
    return out;
}

function applyFilters(params, samples) {
    var fltp = 0.0;
    var fltdp = 0.0;
    var fltw = Math.pow(params.p_lpf_freq, 3.0) * 0.1;
    var fltw_d = 1.0 + params.p_lpf_ramp * 0.0001;
    var fltdmp =
        5.0 / (1.0 + Math.pow(params.p_lpf_resonance, 2.0) * 20.0) * (0.01 + fltw);
    if (fltdmp > 0.8) fltdmp = 0.8;
    var flthp = Math.pow(params.p_hpf_freq, 2.0) * 0.1;  // function of i and flthp_d
    var flthp_d = Math.pow(1.0 + params.p_hpf_ramp * 0.0003, 1 / SUPERSAMPLES);  // constant

    var len = samples.length;
    var out = new Float64Array(len);
    var y_out = 0.0;
    for (var i = 0; i < len; i++) {
        var y = samples[i];

        // Low-pass filter
        var pp = fltp;
        fltw *= fltw_d;
        if (fltw < 0.0) fltw = 0.0;
        if (fltw > 0.1) fltw = 0.1;
        if (params.p_lpf_freq != 1.0) {
            fltdp += (y - fltp) * fltw;
            fltdp -= fltdp * fltdmp;
        } else {
            fltp = y;
            fltdp = 0.0;
        }
        fltp += fltdp;

        // High-pass filter
        if (flthp_d !== 1.0) {
            flthp *= flthp_d;
            if (flthp < 0.00001) flthp = 0.00001;
            if (flthp > 0.1) flthp = 0.1;
        }
        y_out += fltp - pp;
        y_out -= y_out * flthp;

        out[i] = y_out;
    }
    return out;
}

function applyPhaser(params, samples) {
    var PHASER_SIZE = 1024, PHASER_MASK = PHASER_SIZE - 1;
    var fphase = Math.pow(params.p_pha_offset, 2.0) * 1020.0;
    if (params.p_pha_offset < 0.0) fphase = -fphase;

    var fdphase = Math.pow(params.p_pha_ramp, 2.0) / SUPERSAMPLES;  // constant
    if (params.p_pha_ramp < 0.0) fdphase = -fdphase;

    var ipp = 0;
    var phaser_buffer = new Float64Array(PHASER_SIZE);
    for (var i = 0; i < PHASER_SIZE; ++i) {
        phaser_buffer[i] = 0.0;
    }

    var len = samples.length;
    var out = new Float64Array(len);
    for (var i = 0; i < len; i++) {
        var y = samples[i];
        phaser_buffer[ipp & PHASER_MASK] = y;

        fphase += fdphase;
        var iphase = Math.abs(Math.floor(fphase));
        if (iphase > PHASER_MASK) iphase = PHASER_MASK;
        y += phaser_buffer[(ipp - iphase + PHASER_SIZE) & PHASER_MASK];
        ipp = (ipp + 1) & PHASER_MASK;

        out[i] = y;
    }
    return out;
}

function applyEnvelope(params, samples) {
    var gain = Math.exp(params.sound_vol) - 1;  // constant
    var env_length = env_lengths(params);

    var len = samples.length;
    var out = new Float64Array(len);
    var env_stage = 0;
    var env_time = 0;
    for (var i = 0; i < len; i++) {
        var env_vol;
        if (env_stage === 0) {
            env_vol = env_time / env_length[0];
        } else if (env_stage === 1) {
            env_vol = 1.0 + (1.0 - env_time / env_length[1]) * 2.0 * params.p_env_punch;
        } else {  // env_stage == 2
            env_vol = 1.0 - env_time / env_length[2];
        }

        out[i] = samples[i] * env_vol * gain;

        // Volume envelope
        env_time++;
        if (env_time >= env_length[env_stage]) {
            env_time = 0;
            env_stage++;
            if (env_stage === 3 && i + 1 !== len) {
                throw new Error("oops, expected " + len + " got " + (i + 1));
            }
        }
    }
    return out;
}

// Reduce the size of samples by a factor of N by decreasing the sample rate.
// The output contains a single (average) sample for every N consecutive
// samples of input.
function compress(N, samples) {
    var outSize = Math.floor(samples.length / N);
    var out = new Float64Array(outSize);
    var rp = 0, wp = 0;
    while (wp < outSize) {
        var total = 0;
        for (var j = 0; j < N; j++) {
            total += samples[rp++];
        }
        out[wp++] = total / N;
    }
    return out;
}

// Convert the "analog" (floating-point) samples in samples_f64 to digital
// samples. bitsPerSample must be either 8 or 16.
function digitize(bitsPerSample, samples_f64) {
    var samples;

    if (bitsPerSample === 8) {
        samples = new Uint8ClampedArray(samples_f64.length);
        for (var i = 0; i < samples_f64.length; i++) {
            // Rescale [-1.0, 1.0) to [0, 256)
            // Don't bother clamping; Uint8ClampedArray does that.
            samples[i] = Math.floor((samples_f64[i] + 1) * 128);
        }
    } else {
        samples = new Uint16Array(samples_f64.length);
        for (var i = 0; i < samples_f64.length; i++) {
            // Rescale [-1.0, 1.0) to [-32768, 32768) and clamp
            var sample = Math.floor(samples_f64[i] * (1 << 15));
            if (sample > (1 << 15) - 1) sample = (1 << 15) - 1;
            else if (sample < -(1 << 15)) sample = -(1 << 15);
            samples[i] = sample;
        }
    }

    return samples;
}

function synthesize(params) {
    // The first few passes operate on "period samples"---that is, each
    // sample is the inverse of the sound's frequency at that point.
    var samples_f64 = computePeriodSamples(params);
    samples_f64 = applyArpeggio(params, samples_f64);
    samples_f64 = applyVibrato(params, samples_f64);
    samples_f64 = prolong(SUPERSAMPLES, samples_f64);

    // This step applies an actual waveform so that we have playable sound.
    samples_f64 = applyBaseWaveform(params, samples_f64);

    // The remaining passes apply to actual time-domain samples.
    samples_f64 = applyFilters(params, samples_f64);
    samples_f64 = applyPhaser(params, samples_f64);
    samples_f64 = applyEnvelope(params, samples_f64);
    samples_f64 = compress(SUPERSAMPLES * Math.floor(44100 / params.sample_rate), samples_f64);
    return digitize(params.sample_size, samples_f64);
}



// === samplesToWaveFormat - Wrap audio sample data to make a WAV file.

function u32ToArray(i) {
    return [i & 0xFF,
            (i >> 8) & 0xFF,
            (i >> 16) & 0xFF,
            (i >> 24) & 0xFF];
}

function u16ToArray(i) {
    return [i & 0xFF,
            (i >> 8) & 0xFF];
}

function samplesToWaveFormat(sampleRate, bitsPerSample, data) {
    var numChannels = 1;
    var byteRate = (sampleRate * numChannels * bitsPerSample) >> 3;
    var blockAlign = (numChannels * bitsPerSample) >> 3;
    var sampleBytes = data.length * Math.ceil(bitsPerSample / 8);

    // Start with headers.
    var wav = [].concat(                           // OFFS SIZE NOTES
        [0x52, 0x49, 0x46, 0x46],               // 0    4    "RIFF" = 0x52494646
        u32ToArray(36 + data.length),           // 4    4    chunk size = 4+(8+SubChunk1Size)+(8+SubChunk2Size)
        [0x57, 0x41, 0x56, 0x45],               // 8    4    "WAVE" = 0x57415645
        // subchunk 1
        [0x66, 0x6D, 0x74, 0x20],               // 12   4    subchunk id: "fmt " = 0x666D7420
        u32ToArray(16),                         // 16   4    subchunk length: 16 bytes to follow
        u16ToArray(1),                          // 20   2    audio format: PCM = 1
        u16ToArray(numChannels),                // 22   2    number of channels: Mono = 1, Stereo = 2, etc.
        u32ToArray(sampleRate),                 // 24   4    SampleRate: 8000, 44100, etc
        u32ToArray(byteRate),                   // 28   4    SampleRate*NumChannels*BitsPerSample/8
        u16ToArray(blockAlign),                 // 32   2    NumChannels*BitsPerSample/8
        u16ToArray(bitsPerSample),              // 34   2    8 bits = 8, 16 bits = 16, etc.
        // subchunk 2
        [0x64, 0x61, 0x74, 0x61],               // 36   4    subchunk id: "data" = 0x64617461
        u32ToArray(sampleBytes)                 // 40   4    subchunk length = NumSamples*NumChannels*BitsPerSample/8
    );

    // Append sample data.
    if (bitsPerSample === 8) {
        for (var i = 0; i < data.length; i++)
            wav.push(data[i]);
    } else {
        for (var i = 0; i < data.length; i++) {
            var sample = data[i];
            wav.push(sample & 0xFF);
            wav.push((sample >> 8) & 0xFF);
        }
    }
    return wav;
}



// === waveFormatToDataURL - Convert an array of bytes to a data: URL.

var Base64_chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
var Base64_encLookup = [];

(function () {
    for (var i = 0; i < 4096; i++) {
        Base64_encLookup[i] = Base64_chars[i >> 6] + Base64_chars[i & 0x3F];
    }
})();

function Base64_Encode(src) {
    var len = src.length;
    var dst = '';
    var i = 0;
    while (len > 2) {
        n = (src[i] << 16) | (src[i + 1] << 8) | src[i + 2];
        dst += Base64_encLookup[n >> 12] + Base64_encLookup[n & 0xFFF];
        len -= 3;
        i += 3;
    }
    if (len > 0) {
        var n1 = (src[i] & 0xFC) >> 2;
        var n2 = (src[i] & 0x03) << 4;
        if (len > 1) {
            n2 |= (src[++i] & 0xF0) >> 4;
        }
        dst += Base64_chars[n1];
        dst += Base64_chars[n2];
        if (len == 2) {
            var n3 = (src[i++] & 0x0F) << 2;
            n3 |= (src[i] & 0xC0) >> 6;
            dst += Base64_chars[n3];
        }
        if (len == 1) {
            dst += '=';
        }
        dst += '=';
    }
    return dst;
}

function waveFormatToDataURL(wave) {
    return 'data:audio/wav;base64,' + Base64_Encode(wave);
}



// === playDataURL - Actually play a sound in the browser.

function playDataURL(dataURL) {
    var audio = new Audio();
    audio.src = dataURL;
    audio.play();
}



// === play - Tie together all the pieces.
// play is the composition of seven functions. If you think of it as a bash pipeline:
// RC4 $SEED | RNG | rngToParams | synthesize | samplesToWaveFormat | waveFormatToDataURL | playDataURL

function play(seed) {
    var key = String((seed / 100) | 0);
    var stream = new RC4(key);
    var rng = new RNG(stream);
    var params = rngToParams(seed, rng);
    var samples = synthesize(params);
    var wave = samplesToWaveFormat(params.sample_rate, params.sample_size, samples);
    var dataURL = waveFormatToDataURL(wave);
    playDataURL(dataURL);
}
