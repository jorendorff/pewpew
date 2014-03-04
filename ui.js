
function playAndShowPlot(seed) {
    var key = String((seed / 100) | 0);
    var stream = new RC4(key);
    var rng = new RNG(stream);
    var params = rngToParams(seed, rng);

    params.sample_size = 16;

    // Force-disable most of the parameters
    // to see if the waveform looks anything like what's expected.

    // Tone
    params.p_freq_limit = 0;     // Min frequency cutoff
    params.p_freq_ramp = 0;      // Slide (SIGNED)
    params.p_freq_dramp = 0;     // Delta slide (SIGNED)
    // Vibrato
    params.p_vib_strength = 0;   // Vibrato depth
    params.p_vib_speed = 0;      // Vibrato speed

    // Tonal change
    params.p_arp_mod = 0;        // Change amount (SIGNED)
    params.p_arp_speed = 0;      // Change speed

    // Duty (wat's that?)
    params.p_duty = 0;           // Square duty
    params.p_duty_ramp = 0;      // Duty sweep (SIGNED)

    // Repeat
    params.p_repeat_speed = 0;   // Repeat speed

    // Phaser
    params.p_pha_offset = 0;     // Phaser offset (SIGNED)
    params.p_pha_ramp = 0;       // Phaser sweep (SIGNED)

    // Low-pass filter
    params.p_lpf_freq = 1.0;     // Low-pass filter cutoff
    params.p_lpf_ramp = 0;       // Low-pass filter cutoff sweep (SIGNED)
    params.p_lpf_resonance = 0;  // Low-pass filter resonance

    console.log(uneval(params));


    var real_samples = synthesize(params);
    var wave = samplesToWaveFormat(params.sample_rate, params.sample_size, real_samples);
    var dataURL = waveFormatToDataURL(wave);
    playDataURL(dataURL);

    params.p_base_freq /= 5;  // hack params to artificial low frequency
    var fake_samples = synthesize(params);

    var c = document.getElementById('graph');
    c.width = real_samples.length;
    c.height = 400;
    var ctx = c.getContext("2d");


    var labels = [];


    function convertToRawData(samples) {
        var SAMPLE_RATE = 5512;

        var rawData = [];
        for (var i = 0, o = 0; i <= samples.length; i += 2, o++) {
            var x = i / SAMPLE_RATE;
            var yh = samples[i + 1];
            if (yh >= 0x80)
                yh -= 0x0100;
            rawData[o] = (256 * yh + samples[i] + 0.5) / (1 << 15);
            labels[o] = "";

            if ((o * 10) % SAMPLE_RATE < 10) {
                var dsec = Math.floor(o * 10 / SAMPLE_RATE);
                labels[o] = Math.floor(dsec / 10) + "." + (dsec % 10);
            }
        }
        return rawData;
    }


    var real_samples_raw = convertToRawData(real_samples);
    var fake_samples_raw = convertToRawData(fake_samples);

    var chart = new Chart(ctx);
    chart.Line({
        labels: labels,
        datasets: [
            {
                fillColor : "rgba(151,187,205,0.5)",
                strokeColor : "rgba(151,187,205,1)",
                data : real_samples_raw
            },
            {
                fillColor: "transparent",
                strokeColor: "maroon",
                data: fake_samples_raw
            }
        ]
    }, {
        bezierCurve: false,
        pointDot: false,
        animation: false
    });
}

function init_ui() {
    var seedField = document.getElementById('seed');
    var playButton = document.getElementById("play");

    playButton.addEventListener("click", function (event) {
        var seed = parseInt(seedField.value, 10);
        play(seed);
        //playAndShowPlot(seed);
    });
}
