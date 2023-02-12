var sounds = {
    hit: {
        url: "assets/hit.mp3",
        volume: 0.03
    },
    strzal1: {
        url: "assets/strzal1.mp3",
        volume: 0.25
    },
    strzal2: {
        url: "assets/strzal2.mp3",
        volume: 0.25
    },
    strzal3: {
        url: "assets/strzal3.mp3",
        volume: 0.25
    },
    powerup: {
        url: "assets/powerup.mp3",
        volume: 0.25
    }
};

var soundContext = new AudioContext();

for (var key in sounds) {
    loadSound(key);
}

function loadSound(name) {
    var sound = sounds[name];

    var url = sound.url;
    var buffer = sound.buffer;

    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";

    request.onload = function() {
        soundContext.decodeAudioData(request.response, function(newBuffer) {
            sound.buffer = newBuffer;
        });
    };

    request.send();
}

function playSound(name, options) {
    var sound = sounds[name];
    var soundVolume = sounds[name].volume || 1;

    var buffer = sound.buffer;
    if (buffer) {
        var source = soundContext.createBufferSource();
        source.buffer = buffer;

        var volume = soundContext.createGain();

        if (options) {
            if (options.volume) {
                volume.gain.value = soundVolume * options.volume;
            }
        } else {
            volume.gain.value = soundVolume;
        }

        volume.connect(soundContext.destination);
        source.connect(volume);
        source.start(0);
    }
}
