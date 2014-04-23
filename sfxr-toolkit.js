/*

  "Moog's innovations were set out in his 1964 paper Voltage-Controlled
  Electronic Music Modules[1], presented at the AES conference in October 1964,
  where he also demonstrated his prototype synthesizer modules. There were two
  key features in Moog's new system: he analyzed and systematized the
  production of electronically generated sounds, breaking down the process into
  a number of basic functional blocks, which could be carried out by
  standardized modules. He proposed the use of a standardized scale of voltages
  for the electrical signals that controlled the various functions of these
  modules---the Moog oscillators and keyboard, for example, used a standard
  progression of 1 volt per octave for pitch control."

                             -- https://en.wikipedia.org/wiki/Moog_synthesizer

  To paraphrase this extraordinary paragraph, Moog's key innovations were:

  1.  He factored the problem into (and I quote) "functional" pieces.

  2.  He developed standard ways for the pieces to communicate, making them
      easily composable.

  Moog was a functional API designer!

  [1] R. A. Moog, Journal of the Audio Engineering Society, Vol. 13, No. 3,
      pp. 200–206, July 1965.

  Another inspiration for this library is SVG filters:
  http://www.w3.org/TR/SVG/filters.html#Introduction
  I like how they're specified in terms of continuous functions,
  but designed to be efficiently implementable.

  ~~~~

  The Moog synthesizer Google Doodle is archived here:
  http://www.google.com/doodles/robert-moogs-78th-birthday

*/


// It seems like there should maybe be only one thing:
//
// A Clip is simply a pair of a duration (n seconds) and a function
// mapping float64 time indices in [0,n) to float64 numbers.
//
// A Clip could be a "bitmap" i.e. sampled data, with attached sample rate.  In
// that case, the actual pure function returns steps or (if necessarly)
// interpolated values.
//
// A Clip can be rendered to sampled data at any sample rate; absent
// high-frequency components or low-frequency sampling, it should sound about
// the same.
//
// A Clip's duration can be Infinity, in which case don't try to render it.
// Such clips are useful in combination with other pieces; for example you can
// make an infinite sine wave, use other filters to make the sound funky, then
// use adsr() or slice() to clip it to a finite duration.

// data Clip = FunctionClip (TimeIndex, TimeIndex -> Float64)

function Clip(duration, fn) {
    this.duration = duration;
    this.fn = fn;
}

function renderToInt16Array(clip, sample_rate) {
    if (clip.duration === Infinity)
        throw new ValueError("can't render an infinite Clip");
    var len = Math.floor(clip.duration * sample_rate);
    var out = new Int16Array(len);
    var f = clip.fn;
    var dt_di = 1 / sample_rate;
    for (var i = 0; i < len; i++) {
        var t = i * dt_di;

        // Rescale [-1.0, 1.0) to [-32768, 32768) and clamp
        var y = Math.floor((1 << 15) * f(t));
        if (y > (1 << 15) - 1)
            y = (1 << 15) - 1;
        else if (y < -(1 << 15))
            y = -(1 << 15);
        out[i] = y;
    }
    return out;
}

var empty = new Clip(0, t => 0);
var silence = new Clip(Infinity, t => 0);

// Basic waveforms

function sine(a, f) {
    var w = 2 * Math.PI * f;
    var a_w = a / w;
    return new Clip(Infinity, t => a * Math.sin(w * t));
}

function sawtooth(a, f) {
    var a_f = a / f;
    return new Clip(Infinity, t => a * (-1 + 2 * (f * t % 1)));
}

function square(a, f) {
    var a_f = a / f;
    return new Clip(Infinity, t => a * (f * t % 1 < 1/2 ? 1/2 : -1/2));
}


// Operations on clips

function slice(a, start, d) {
    var ad = a.duration, af = a.fn;
    return new Clip(d, t => t < ad - start ? af(t + start) : 0);
}

function repeat(a) {
    var ad = a.duration, af = a.fn;
    return new Clip(Infinity, t => af(t % ad));
}


// Combinators

// Make a clip consisting of a followed by b.
function concat(a, b) {
    if (a.duration === Infinity)
        throw TypeError("can't concat to an infinite Clip");
    var ad = a.duration, af = a.fn, bf = b.fn;
    return new Clip(ad + b.duration,
                    t => t < ad ? af(t) : bf(t - ad));
}

// Combine two clips (a and b) pointwise using a given binary operation (op).
// If the two clips are different lengths, the shorter is
// zero-padded to the length of the longer one.
function zipWith(a, b, op) {
    var ad = a.duration, af = a.fn, bd = b.duration, bf = b.fn;
    var d = Math.max(ad, bd);
    console.log(ad, bd, d);
    if (ad < d) {
        var af0 = af;
        af = t => (t < ad ? af0(t) : 0);
    }
    if (bd < d) {
        var bf0 = bf;
        bf = t => (t < bd ? bf0(t) : 0);
    }
    return new Clip(d, t => op(af(t), bf(t)));
}

// Combine two clips by playing them both at the same time.
// This can cause some clipping (not easily avoidable).
function add(a, b) {
    return zipWith(a, b, (a, b) => a + b);
}

// Combine two clips (a and b) pointwise using a given binary operation (op).
// This is exactly like zipWith except that the result is only as long as the
// shorter of a and b.
function truncatingZipWith(a, b, op) {
    var af = a.fn, bf = b.fn;
    return new Clip(Math.min(a.duration, b.duration),
                    t => op(af(t), bf(t)));
}

// Combine two clips by multiplying. This is the way to apply
// an envelope to a waveform, for example.
//
// Note that unlike add(), mul() truncates:
//   add(a, b).duration === MAX(a.duration, b.duration)
//   mul(a, b).duration === MIN(a.duration, b.duration)
function mul(a, b) {
    return truncatingZipWith(a, b, (a, b) => a * b);
}


// Envelopes

// An envelope shapes the volume of a sound.

// The ADSR envelope is a classic.
//
// Parameters:
//
// a  - Attack. How long the sound takes to ramp up from 0 to its peak volume.
// d  - Decay. How long the sound takes to fade from peak volume to the
//      sustain level.
// s  - Sustain. How long the sound stays at the sustain level.
// sl - Sustain level. 0 to 1. Anything from 0.7 to 1 sounds nice even with
//      a fast release.
// r  - Release. How long the sound takes to fade from the sustain level to 0.
//
// The duration of the resulting sound is simply a + d + s + r.
//
function adsr_envelope(a, d, s, sl, r) {
    var duration = a + d + s + r;
    return new Clip(duration, t => {
        var y = t < a           ? t / a
              : t - a < d       ? 1 - (1 - sl) * (t - a) / d
              :                   sl;

        // This is designed to produce a slightly better result when s is
        // negative, which should never happen, but could, because s is typically
        // going to be computed from a, d, and the desired duration.
        if (t > duration - r)
            y = Math.min(y, sl * (duration - t) / r);
        return y;
    });
}

function adsr(a, d, s, sl, r, clip) {
    return mul(adsr_envelope(a, d, s, sl, r), clip);
}


/*
// Return a Clip of the function t => g(f(t)).
// This returns a Clip the same duration as f.
//
// If you think of f as a big array of samples,
// this passes each sample through g.
function compose(g, f) {
    var gd = g.duration, gf = g.fn, ff = f.fn;
    return new Clip(f.duration, t => {
        var x = ff(t);
        return x < 0 || x > gd ? 0 : gf(x);
    });
}
*/

// One problem is that a phaser() combinator built on this would
// call af twice per sample--very wasteful. It is more efficient
// to render phaser() on discrete samples.
function perturb(a, offset) {
    // I think this is equivalent, if we take offset to also be a Clip,
    // of compose(add(offset, id), a).
    var ad = a.duration, af = a.fn, of = offset.fn;
    if (offset.duration < ad)
        throw new Error("second argument to perturb must be as long as the clip to be perturbed");
    return new Clip(ad, t => {
        var u = t + of(t);
        return u < 0 || u > ad ? 0 : af(u);
    });
}

function sampled(samples, rate) {
    // No interpolation here, assuming the use cases for sampled data involve
    // either performance or a high enough sample rate that interpolation is
    // unnecessary.
    return new Clip(samples.length / rate, t => samples[Math.floor(t * rate)]);
}

// Convert any Clip to a sampled clip.
function sample(clip, rate) {
    var len = Math.ceil(clip.duration * rate);
    var samples = new Float64Array(len);
    var fn = clip.fn;
    var dt_di = 1 / rate;
    for (var i = 0; i < len; i++)
        samples[i] = fn(i * dt_di);
    return sampled(samples, rate);
}

function integral(clip, rate) {
    var len = Math.ceil(clip.duration * rate);
    var samples = new Float64Array(len);
    var fn = clip.fn;
    var dt_di = 1 / rate;
    var acc = 0;
    for (var i = 0; i < len; i++)
        samples[i] = (acc += dt_di * fn(i * dt_di));
    return sampled(samples, rate);
}

// Repeat w, adjusting the speed of progress through w using f to tell
// how many seconds of w to pass through per second.
function applyBaseWaveform(f, w, rate) {
    var F = integral(f, rate), Ff = F.fn;
    var wd = w.duration, wf = w.fn;
    if (wd === 0)
        throw new Error("Can't use zero-length waveform with applyBaseWaveform");

    return new Clip(f.duration, t => wf(Ff(t) % wd));
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



// === Clip.prototype.play - Play any clip and cache the resulting URL.

Clip.prototype.play = function play() {
    if (!("_cachedAudio" in this)) {
        var sampleRate = 44000;
        var samples = renderToInt16Array(this, sampleRate);
        var url = waveFormatToDataURL(samplesToWaveFormat(sampleRate, 16, samples));
        var audio = new Audio();
        audio.src = url
        this._cachedAudio = audio;
    }
    this._cachedAudio.play();
};

function playBoop() {
    adsr(0.02, 0.1, 0.4, 0.5, 0.5, sine(0.5, 440)).play();
}
