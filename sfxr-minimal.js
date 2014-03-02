var SAMPLE_RATE = 44100; // samples per second

function Params() {
    this.magnitude = 1.0;
    this.frequency = 440;
    this.duration = 1000; // milliseconds
}

function synthesize(params) {
    var N = SAMPLE_RATE * params.duration / 1000;
    var SUBSAMPLES = 1;
    var arr = [];
    alert(arr.length);

    var A = params.magnitude;
    var w = params.frequency * 2 * Math.PI / SAMPLE_RATE;
    for (var i = 0; i < N; i++) {
        var y = A * Math.sin(i * w);
        // var y8 = ((1 << 8) * ((1 + y) / 2)) >>> 0;
        // if (y8 > 255)
        //     y8 = 255;
        // else if (y8 < 0)
        //     y8 = 0;
        // arr[i] = y8;
        var y16 = (y * 0x8000) | 0;
        arr[2 * i] = y16 & 0xff;
        arr[2 * i + 1] = (y16 >> 8) & 0xff;
        //arr[i] = y16;

        //arr[2 * i] = (256 * Math.random())|0;  // least significant byte
        //arr[2 * i + 1] = (256 * Math.random())|0;
    }

    //// convert to Uint8Array at the last second
    //return new Uint8Array(arr.buffer);

    alert(arr[N-1]);

    return arr;
}

function playSeed(n) {
    var p = new Params;
    //p.magnitude = 0.9;
    var samples = synthesize(p);
    var wave = samplesToWaveFormat(SAMPLE_RATE, 16, samples);
    var dataURL = waveFormatToDataURL(wave);
    playDataURL(dataURL);
}
