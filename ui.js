
var SynthUI = (function () {

    // Metadata about all the parameters the synthesizer supports.
    var param_info = [
        {
            id: "env_attack",
            name: "Attack",
            abs: true,
        },
        {
            id: "env_sustain",
            name: "Sustain",
            abs: true,
        },
        {
            id: "env_punch",
            name: "Punch"
        },
        {
            id: "env_decay",
            name: "Decay",
            abs: true
        },
        {
            id: "base_freq",
            name: "Base frequency"
        },
        {
            id: "freq_limit",
            name: "Frequency limit"
        },
        {
            id: "freq_ramp",
            name: "Frequency ramp",
            signed: true
        },
        {
            id: "freq_dramp",
            name: "Frequency ramp ramp",
            signed: true
        },
        {
            id: "vib_strength",
            name: "Vibrato strength",
            abs: true
        },
        {
            id: "vib_speed",
            name: "Vibrato speed"
        },
        {
            id: "repeat_speed",
            name: "Repeat speed"
        },
        {
            id: "arp_speed",
            name: "Arpeggio speed"
        },
        {
            id: "arp_mod",
            name: "Arpeggio magnitude",
            signed: true
        },
        {
            id: "duty",
            name: "Square duty"
        },
        {
            id: "duty_ramp",
            name: "Square duty ramp",
            signed: true
        },
        {
            id: "pha_offset",
            name: "Phaser offset",
            signed: true
        },
        {
            id: "pha_ramp",
            name: "Phaser ramp",
            signed: true
        },
        {
            id: "lpf_freq",
            name: "Lo-pass frequency"
        },
        {
            id: "lpf_resonance",
            name: "Lo-pass resonance",
            abs: true
        },
        {
            id: "lpf_ramp",
            name: "Lo-pass ramp",
            signed: true
        },
        {
            id: "hpf_freq",
            name: "Hi-pass frequency"
        },
        {
            id: "hpf_ramp",
            name: "Hi-pass ramp",
            signed: true
        },
        {
            id: "sound_vol",
            name: "Volume"
        }
    ];

    // Initialize the HTML controls.
    // This creates a bunch of sliders; the wave_type control must already exist in the HTML.
    var SynthState = function () {
        this.wave_type = SQUARE;
        for (var i = 0; i < param_info.length; i++) {
            var p = param_info[i];
            this[p.id] = 0.0001;
        }
    };

    var state = new SynthState();

    var gui = new dat.GUI();

    function initControlTable() {
        function changed() {
            playParams(getParamsFromControls());
        }

        var waveformsByName = {
            square: SQUARE,
            sawtooth: SAWTOOTH,
            sine: SINE,
            noise: NOISE,
            triangle: TRIANGLE,
            breaker: BREAKER
        };
        gui.add(state, 'wave_type', waveformsByName).onChange(changed);

        for (var i = 0; i < param_info.length; i++) {
            var p = param_info[i];
            var controller = gui.add(state, p.id, p.signed ? -1.0 : 0, 1.0).listen();
            controller.onChange(changed);
        }

        // Set all the controls to default values.
        setControls(Params());
    }

    // Create a new Params object populated from the HTML controls.
    function getParamsFromControls() {
        var params = new Params;
        params.wave_type = Number(state.wave_type);
        params.sample_size = 16;
        params.sample_rate = PUZZLESCRIPT_SAMPLE_RATE;

        for (var i = 0; i < param_info.length; i++) {
            var pi = param_info[i];
            params[pi.id] = state[pi.id];
        }
        return params;
    }

    // Change all the HTML controls to reflect the values in the given Params object.
    function setControls(params) {
        state.wave_type = params.wave_type;
        for (var i = 0; i < param_info.length; i++) {
            var p = param_info[i];
            var v = params[p.id];
            if (p.abs)
                v = Math.abs(v);
            state[p.id] = v;
        }
    }

    function onChange() {
        var SOUND_DELAY_MSEC = 400;

        var counter = ++onChange.counter;
        setTimeout(function () {
            if (onChange.counter === counter)
                playParams(getParamsFromControls());
        }, SOUND_DELAY_MSEC);
    }
    onChange.counter = 0;

    function playSeed(seed) {
        var key = String((seed / 100) | 0);
        var stream = new RC4(key);
        var rng = new RNG(stream);
        var params = rngToParams(seed, rng);

        return playParams(params);
    }

    var PUZZLESCRIPT_SAMPLE_RATE = 5512;

    function playParams(params) {
        setControls(params);
        params.sample_size = 16;
        params.sample_rate = PUZZLESCRIPT_SAMPLE_RATE;

        var real_samples = synthesize(params);
        var wave = samplesToWaveFormat(params.sample_rate, params.sample_size, real_samples);
        var dataURL = waveFormatToDataURL(wave);
        playDataURL(dataURL);

        var c = document.getElementById('graph');
        var rect = c.getBoundingClientRect();
        c.width = real_samples.length + 300;
        c.height = 400;
        var ctx = c.getContext("2d");

        var labels = [];

        function convertToRawData(samples) {
            var sampleRate = PUZZLESCRIPT_SAMPLE_RATE;
            var dsec = 0;
            var rawData = [];
            for (var i = 0; i < samples.length; i++) {
                rawData[i] = samples[i] / (1 << 15);
                labels[i] = "";

                if ((i * 10) % sampleRate < 10) {
                    labels[i] = Math.floor(dsec / 10) + "." + (dsec % 10);
                    dsec++;
                }
            }
            return rawData;
        }


        var real_samples_raw = convertToRawData(real_samples);

        var chart = new Chart(ctx);
        chart.Line({
            labels: labels,
            datasets: [
                {
                    fillColor : "rgba(151,187,205,0.5)",
                    strokeColor : "rgba(151,187,205,1)",
                    data : real_samples_raw
                },
            ]
        }, {
            bezierCurve: false,
            pointDot: false,
            animation: false
        });
    }

    function init() {
        var seedField = document.getElementById('seed');
        document.getElementById("playseed").addEventListener(
            "click",
            function (event) {
                playSeed(seedField.value);
            });
        document.getElementById("playcontrols").addEventListener(
            "click",
            function (event) {
                playParams(getParamsFromControls());
            });
    }

    return {
        init: init,
        initControlTable: initControlTable
    };
})();
