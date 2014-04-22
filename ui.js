var SynthUI = (function () {

    // Metadata about all the parameters the synthesizer supports.
    var param_info = [
        {
            id: "env_attack",
            name: "Attack"
        },
        {
            id: "env_sustain",
            name: "Sustain"
        },
        {
            id: "env_punch",
            name: "Punch"
        },
        {
            id: "env_decay",
            name: "Decay"
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
            name: "Vibrato strength"
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
            name: "Lo-pass resonance"
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

    function initControlTable() {
        var defaults = Params();

        var tbody = document.getElementById("controltbody");
        for (var i = 0; i < param_info.length; i++) {
            var p = param_info[i];
            var nameCell = document.createElement("td");
            nameCell.appendChild(document.createTextNode(p.name));
            var sliderCell = document.createElement("td");
            var slider = document.createElement("input");
            slider.id = p.id;
            slider.className = "slider";
            slider.type = "range";
            slider.max = 1;
            slider.min = p.signed ? -1 : 0;
            slider.step = 1/1000;
            slider.value = defaults[p.id];
            slider.addEventListener("input", onChange);
            sliderCell.appendChild(slider);
            var row = document.createElement("tr");
            row.appendChild(nameCell);
            row.appendChild(sliderCell);
            tbody.appendChild(row);
        }
    }

    function getParamsFromControls() {
        var params = new Params;
        params.wave_type = SQUARE;
        params.sample_size = 16;
        params.sample_rate = PUZZLESCRIPT_SAMPLE_RATE;

        for (var i = 0; i < param_info.length; i++) {
            var pi = param_info[i];
            params[pi.id] = document.getElementById(pi.id).value;
        }
        return params;
    }

    function setControls(params) {
        // Change all the controls to reflect the given params
        for (var i = 0; i < param_info.length; i++) {
            var p = param_info[i];
            document.getElementById(p.id).value = params[p.id];
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
