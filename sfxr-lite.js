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



// RNG | rngToParams | synthesize | samplesToWaveFormat | waveFormatToDataURL | playDataURL

function play(seed) {
    var rng = new RNG((seed / 100) | 0);
    var params = rngToParams(seed, rng);
    var samples = synthesize(params);
    var wave = samplesToWaveFormat(params.sample_rate, params.sample_size, samples);
    var dataURL = waveFormatToDataURL(wave);
    playDataURL(dataURL);
}



// === RNG - a pseudorandom number generator

/* new ARC4(key) - Create a new ARC4 stream. key is any string. */
function ARC4(key) {
    this.i = 0;
    this.j = 0;
    this.s = [];
    for (var i = 0; i < 256; i++) {
        this.s[i] = i;
    }

    // Mix entropy from the key string into the array s.
    var j = 0;
    for (var i = 0; i < 256; i++) {
        j += this.s[i] + key.charCodeAt(i % key.length);
        j %= 256;
        this._swap(i, j);
    }
}

ARC4.prototype._swap = function(i, j) {
    var tmp = this.s[i];
    this.s[i] = this.s[j];
    this.s[j] = tmp;
};

/* arc4.next() - Compute and return the next byte of this ARC4 stream. */
ARC4.prototype.next = function() {
    this.i = (this.i + 1) % 256;
    this.j = (this.j + this.s[this.i]) % 256;
    this._swap(this.i, this.j);
    return this.s[(this.s[this.i] + this.s[this.j]) % 256];
};

/* new RNG(seed) - Create a pseudorandom number generator. */
function RNG(seed) {
    var key = JSON.stringify(seed);
    this._state = new ARC4(key);
}

/* rng.uniform() - Return a uniformly-distributed random number in the range [0, 1]. */
RNG.prototype.uniform = function() {
    var BYTES = 7; // 56 bits to make a 53-bit double
    var output = 0;
    for (var i = 0; i < BYTES; i++) {
        output = 256 * output + this._state.next();
    }
    return output / (Math.pow(2, BYTES * 8) - 1);
};


// === rngToParams

var SQUARE = 0;
var SAWTOOTH = 1;
var SINE = 2;
var NOISE = 3;
var TRIANGLE = 4;
var BREAKER = 5;

// Playback volume
var masterVolume = 1.0;

function rngToParams(seed, rng) {
    var SOUND_VOL = 0.25;
    var SAMPLE_RATE = 5512;//44100;
    var SAMPLE_SIZE = 8;

    var SHAPES = [
        'square', 'sawtooth', 'sine', 'noise', 'triangle', 'breaker'
    ];

    function frnd(range) {
        return rng.uniform() * range;
    }

    function rnd(max) {
        return Math.floor(rng.uniform() * (max + 1));
    }

    // Each of these functions returns a randomly populated Params object.

    pickupCoin = function() {
        var result = Params();
        result.wave_type = Math.floor(frnd(SHAPES.length));
        if (result.wave_type === 3) {
            result.wave_type = 0;
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
    };

    laserShoot = function() {
        var result = Params();
        result.wave_type = rnd(2);
        if (result.wave_type === SINE && rnd(1)) {
            result.wave_type = rnd(1);
        }
        result.wave_type = Math.floor(frnd(SHAPES.length));

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
    };

    explosion = function() {
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
    };

    birdSound = function() {
        var result = Params();

        if (frnd(10) < 1) {
            result.wave_type = Math.floor(frnd(SHAPES.length));
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
            result.wave_type = Math.floor(frnd(SHAPES.length));
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
            result.wave_type = Math.floor(frnd(SHAPES.length));

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
            result.wave_type = Math.floor(frnd(SHAPES.length));

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

        result.wave_type = Math.floor(frnd(SHAPES.length));
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
    };

    pushSound = function() {
        var result = Params();
        result.wave_type = Math.floor(frnd(SHAPES.length));
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
    };

    powerUp = function() {
        var result = Params();
        if (rnd(1)) {
            result.wave_type = SAWTOOTH;
        } else {
            result.p_duty = frnd(0.6);
        }
        result.wave_type = Math.floor(frnd(SHAPES.length));
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
    };

    hitHurt = function() {
        result = Params();
        result.wave_type = rnd(2);
        if (result.wave_type === SINE) {
            result.wave_type = NOISE;
        }
        if (result.wave_type === SQUARE) {
            result.p_duty = frnd(0.6);
        }
        result.wave_type = Math.floor(frnd(SHAPES.length));
        result.p_base_freq = 0.2 + frnd(0.6);
        result.p_freq_ramp = -0.3 - frnd(0.4);
        result.p_env_attack = 0.0;
        result.p_env_sustain = frnd(0.1);
        result.p_env_decay = 0.1 + frnd(0.2);
        if (rnd(1)) {
            result.p_hpf_freq = frnd(0.3);
        }
        return result;
    };

    jump = function() {
        result = Params();
        result.wave_type = SQUARE;
        result.wave_type = Math.floor(frnd(SHAPES.length));
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
    };

    blipSelect = function() {
        result = Params();
        result.wave_type = rnd(1);
        result.wave_type = Math.floor(frnd(SHAPES.length));
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
    };

    random = function() {
        result = Params();
        result.wave_type = Math.floor(frnd(SHAPES.length));
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
    };

    // Now we simply select one of those functions at random and call it.
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
    var result = soundGenerator();

    result.sound_vol = SOUND_VOL;
    result.sample_rate = SAMPLE_RATE;
    result.sample_size = SAMPLE_SIZE;
    return result;
}



// === synthesize: From parameters to samples

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

function synthesize(ps) {
    // Repetition
    //
    // Some variables are "repeatable": if ps.p_repeat_speed is nonzero, they
    // will be reset to their original values, all at once, right in the middle
    // of the noise.

    // The repeat clock
    var rep_limit = Math.floor(Math.pow(1.0 - ps.p_repeat_speed, 2.0) * 20000 + 32);
    if (ps.p_repeat_speed == 0.0) {
        rep_limit = 0;
    }
    var rep_time;

    // Repeatable variables
    var fperiod, period, fmaxperiod;
    var fslide, fdslide;
    var square_duty, square_slide;
    var arp_mod, arp_time, arp_limit;

    function repeat() {
        // Reset the repeat clock.
        rep_time = 0;

        // Reset all repeatable variables.
        fperiod = 100.0 / (ps.p_base_freq * ps.p_base_freq + 0.001);
        period = Math.floor(fperiod);
        fmaxperiod = 100.0 / (ps.p_freq_limit * ps.p_freq_limit + 0.001);

        fslide = 1.0 - Math.pow(ps.p_freq_ramp, 3.0) * 0.01;
        fdslide = -Math.pow(ps.p_freq_dramp, 3.0) * 0.000001;

        square_duty = 0.5 - ps.p_duty * 0.5;
        square_slide = -ps.p_duty_ramp * 0.00005;

        if (ps.p_arp_mod >= 0.0) {
            arp_mod = 1.0 - Math.pow(ps.p_arp_mod, 2.0) * 0.9;
        } else {
            arp_mod = 1.0 + Math.pow(ps.p_arp_mod, 2.0) * 10.0;
        }
        arp_time = 0;
        arp_limit = Math.floor(Math.pow(1.0 - ps.p_arp_speed, 2.0) * 20000 + 32);
        if (ps.p_arp_speed == 1.0) {
            arp_limit = 0;
        }
    }

    repeat();  // First time through, this is a bit of a misnomer

    // Filter
    var fltp = 0.0;
    var fltdp = 0.0;
    var fltw = Math.pow(ps.p_lpf_freq, 3.0) * 0.1;
    var fltw_d = 1.0 + ps.p_lpf_ramp * 0.0001;
    var fltdmp =
        5.0 / (1.0 + Math.pow(ps.p_lpf_resonance, 2.0) * 20.0) * (0.01 + fltw);
    if (fltdmp > 0.8) {
        fltdmp = 0.8;
    }
    var fltphp = 0.0;
    var flthp = Math.pow(ps.p_hpf_freq, 2.0) * 0.1;
    var flthp_d = 1.0 + ps.p_hpf_ramp * 0.0003;

    // Vibrato
    var vib_phase = 0.0;
    var vib_speed = Math.pow(ps.p_vib_speed, 2.0) * 0.01;
    var vib_amp = ps.p_vib_strength * 0.5;

    // Envelope
    var env_vol = 0.0;
    var env_stage = 0;
    var env_time = 0;
    var env_length = [
        Math.floor(ps.p_env_attack * ps.p_env_attack * 100000.0),
        Math.floor(ps.p_env_sustain * ps.p_env_sustain * 100000.0),
        Math.floor(ps.p_env_decay * ps.p_env_decay * 100000.0)
    ];

    // Phaser
    var phase = 0;
    var fphase = Math.pow(ps.p_pha_offset, 2.0) * 1020.0;
    if (ps.p_pha_offset < 0.0) fphase = -fphase;
    var fdphase = Math.pow(ps.p_pha_ramp, 2.0) * 1.0;
    if (ps.p_pha_ramp < 0.0) fdphase = -fdphase;
    var iphase = Math.abs(Math.floor(fphase));
    var ipp = 0;
    var phaser_buffer = [];
    for (var i = 0; i < 1024; ++i) {
        phaser_buffer[i] = 0.0;
    }

    // Noise
    var noise_buffer = [];
    for (var i = 0; i < 32; ++i) {
        noise_buffer[i] = Math.random() * 2.0 - 1.0;
    }

    var gain = Math.exp(ps.sound_vol) - 1;  // constant

    // ...end of initialization. Generate samples.

    var buffer = [];

    var sample_sum = 0;
    var num_summed = 0;
    var summands = Math.floor(44100 / ps.sample_rate);

    for (var t = 0;; ++t) {
        // Repeats
        if (rep_limit != 0 && ++rep_time >= rep_limit) {
            repeat();
        }

        // Arpeggio (single)
        if (arp_limit != 0 && t >= arp_limit) {
            arp_limit = 0;
            fperiod *= arp_mod;
        }

        // Frequency slide, and frequency slide slide!
        fslide += fdslide;
        fperiod *= fslide;
        if (fperiod > fmaxperiod) {
            fperiod = fmaxperiod;
            if (ps.p_freq_limit > 0.0) {
                break;
            }
        }

        // Vibrato
        var rfperiod = fperiod;
        if (vib_amp > 0.0) {
            vib_phase += vib_speed;
            rfperiod = fperiod * (1.0 + Math.sin(vib_phase) * vib_amp);
        }
        period = Math.floor(rfperiod);
        if (period < 8) {
            period = 8;
        }

        square_duty += square_slide;
        if (square_duty < 0.0) {
            square_duty = 0.0;
        }
        if (square_duty > 0.5) {
            square_duty = 0.5;
        }

        // Volume envelope
        env_time++;
        if (env_time > env_length[env_stage]) {
            env_time = 0;
            env_stage++;
            if (env_stage === 3) {
                break;
            }
        }
        if (env_stage === 0) {
            env_vol = env_time / env_length[0];
        } else if (env_stage === 1) {
            env_vol = 1.0 + Math.pow(1.0 - env_time / env_length[1], 1.0) * 2.0 * ps.p_env_punch;
        } else {  // env_stage == 2
            env_vol = 1.0 - env_time / env_length[2];
        }

        // Phaser step
        fphase += fdphase;
        iphase = Math.abs(Math.floor(fphase));
        if (iphase > 1023) {
            iphase = 1023;
        }

        if (flthp_d != 0.0) {
            flthp *= flthp_d;
            if (flthp < 0.00001) {
                flthp = 0.00001;
            }
            if (flthp > 0.1) {
                flthp = 0.1;
            }
        }

        // 8x supersampling
        var sample = 0.0;
        for (var si = 0; si < 8; ++si) {
            var sub_sample = 0.0;
            phase++;
            if (phase >= period) {
                phase %= period;
                if (ps.wave_type === NOISE) {
                    for (var i = 0; i < 32; ++i) {
                        noise_buffer[i] = Math.random() * 2.0 - 1.0;
                    }
                }
            }

            // Base waveform
            var fp = phase / period;
            if (ps.wave_type === SQUARE) {
                if (fp < square_duty) {
                    sub_sample = 0.5;
                } else {
                    sub_sample = -0.5;
                }
            } else if (ps.wave_type === SAWTOOTH) {
                sub_sample = 1.0 - fp * 2;
            } else if (ps.wave_type === SINE) {
                sub_sample = Math.sin(fp * 2 * Math.PI);
            } else if (ps.wave_type === NOISE) {
                sub_sample = noise_buffer[Math.floor(phase * 32 / period)];
            } else if (ps.wave_type === TRIANGLE) {
                sub_sample = Math.abs(1 - fp * 2) - 1;
            } else if (ps.wave_type === BREAKER) {
                sub_sample = Math.abs(1 - fp * fp * 2) - 1;
            } else {
                throw new Exception('bad wave type! ' + ps.wave_type);
            }

            // Low-pass filter
            var pp = fltp;
            fltw *= fltw_d;
            if (fltw < 0.0) {
                fltw = 0.0;
            }
            if (fltw > 0.1) {
                fltw = 0.1;
            }
            if (ps.p_lpf_freq != 1.0) {
                fltdp += (sub_sample - fltp) * fltw;
                fltdp -= fltdp * fltdmp;
            } else {
                fltp = sub_sample;
                fltdp = 0.0;
            }
            fltp += fltdp;

            // High-pass filter
            fltphp += fltp - pp;
            fltphp -= fltphp * flthp;
            sub_sample = fltphp;

            // Phaser
            phaser_buffer[ipp & 1023] = sub_sample;
            sub_sample += phaser_buffer[(ipp - iphase + 1024) & 1023];
            ipp = (ipp + 1) & 1023;

            // final accumulation and envelope application
            sample += sub_sample * env_vol;
        }

        // Accumulate samples appropriately for sample rate
        sample_sum += sample;
        if (++num_summed >= summands) {
            num_summed = 0;
            sample = sample_sum / summands;
            sample_sum = 0;
        } else {
            continue;
        }

        sample /= 8;
        sample *= masterVolume;
        sample *= gain;

        if (ps.sample_size === 8) {
            // Rescale [-1.0, 1.0) to [0, 256)
            sample = Math.floor((sample + 1) * 128);
            if (sample > 255) {
                sample = 255;
            } else if (sample < 0) {
                sample = 0;
            }
            buffer.push(sample);
        } else {
            // Rescale [-1.0, 1.0) to [-32768, 32768)
            sample = Math.floor(sample * (1 << 15));
            if (sample >= (1 << 15)) {
                sample = (1 << 15) - 1;
            } else if (sample < -(1 << 15)) {
                sample = -(1 << 15);
            }
            buffer.push(sample & 0xFF);
            buffer.push((sample >> 8) & 0xFF);
        }
    }

    return buffer;
}



// === samplesToWaveFormat

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

    return [].concat(                           // OFFS SIZE NOTES
        [0x52, 0x49, 0x46, 0x46],               // 0    4    "RIFF" = 0x52494646
        u32ToArray(36 + data.length),           // 4    4    chunk size = 4+(8+SubChunk1Size)+(8+SubChunk2Size)
        [0x57, 0x41, 0x56, 0x45],               // 8    4    "WAVE" = 0x57415645
        // subchunk 1
        [0x66, 0x6d, 0x74, 0x20],               // 12   4    subchunk id: "fmt " = 0x666d7420
        u32ToArray(16),                         // 16   4    subchunk length: 16 bytes to follow
        u16ToArray(1),                          // 20   2    audio format: PCM = 1
        u16ToArray(numChannels),                // 22   2    number of channels: Mono = 1, Stereo = 2, etc.
        u32ToArray(sampleRate),                 // 24   4    SampleRate: 8000, 44100, etc
        u32ToArray(byteRate),                   // 28   4    SampleRate*NumChannels*BitsPerSample/8
        u16ToArray(blockAlign),                 // 32   2    NumChannels*BitsPerSample/8
        u16ToArray(bitsPerSample),              // 34   2    bitsPerSample: 8 bits = 8, 16 bits = 16, etc.
        // subchunk 2
        [0x64, 0x61, 0x74, 0x61],               // 36   4    subchunk id: "data" = 0x64617461
        u32ToArray(data.length),                // 40   4    subchunk length = NumSamples*NumChannels*BitsPerSample/8
        data
    );
}



// === waveFormatToDataURL

var FastBase64_chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
var FastBase64_encLookup = [];

(function () {
    for (var i = 0; i < 4096; i++) {
        FastBase64_encLookup[i] = FastBase64_chars[i >> 6] + FastBase64_chars[i & 0x3F];
    }
})();

function FastBase64_Encode(src) {
    var len = src.length;
    var dst = '';
    var i = 0;
    while (len > 2) {
        n = (src[i] << 16) | (src[i + 1] << 8) | src[i + 2];
        dst += FastBase64_encLookup[n >> 12] + FastBase64_encLookup[n & 0xFFF];
        len -= 3;
        i += 3;
    }
    if (len > 0) {
        var n1 = (src[i] & 0xFC) >> 2;
        var n2 = (src[i] & 0x03) << 4;
        if (len > 1) {
            n2 |= (src[++i] & 0xF0) >> 4;
        }
        dst += FastBase64_chars[n1];
        dst += FastBase64_chars[n2];
        if (len == 2) {
            var n3 = (src[i++] & 0x0F) << 2;
            n3 |= (src[i] & 0xC0) >> 6;
            dst += FastBase64_chars[n3];
        }
        if (len == 1) {
            dst += '=';
        }
        dst += '=';
    }
    return dst;
}

function waveFormatToDataURL(wave) {
    return 'data:audio/wav;base64,' + FastBase64_Encode(wave);
}



// === playDataURL

function playDataURL(dataURL) {
    var audio = new Audio();
    audio.src = dataURL;
    audio.play();
}
