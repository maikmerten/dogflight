WebAudioSynth = function(voicecount) {

	/*
	 * A single Oscillator
	 */
	var Oscillator = function(samplerate) {
		var incr = 0.0
		var time = 0.0;	

		var sine = function() {
			return (Math.sin(time * 2.0 * Math.PI));
		}

		var saw = function() {
			var s = time * 2.0;
			if(time >= 0.5) {
				s -= 2.0;
			}
			return s;
		}

		var triangle = function() {
			var s = time * 4.0;
			switch(Math.floor(s)) {
				case 0:
					break;
				case 1:
				case 2:
					s = 2.0 - s;
					break;
				case 3:
					s = s - 4.0;
					break;
				default:
					s = 0.0;
			}
			return s;
		}

		var square = function() {
			return time < 0.5 ? 1.0 : -1.0;
		}

		var noisesample = 0.0;
		var noisescale = 0.25;
		var noise = function() {
			noisesample += (Math.random() * 2 - 1.0) * noisescale;
			noisesample = Math.min(1.0, Math.max(-1.0, noisesample));
			return noisesample;
		}

		var silence = function() {
			return 0.0;
		}

		var waveforms = [
			sine,
			saw,
			triangle,
			square,
			noise,
			silence
		];

		this.SINE = 0;
		this.SAW = 1;
		this.TRIANGLE = 2;
		this.SQUARE = 3;
		this.NOISE = 4;
		this.SILENCE = 5;

		var waveform = silence;
		this.init = function(wform, frequency) {
			time = 0.0;
			waveform = waveforms[Math.min(waveforms.length - 1, Math.max(0, wform))];
			incr = frequency / samplerate;
			if(wform === this.NOISE) {
				noisescale = frequency / 10000;
			}

		}

		this.getSample = function() {
			// ensure time ranges between 0 and 1 (one cycle)
			time = time - Math.floor(time);
			var s = waveform();
			time += incr;
			return s;
		}

	}

	/*
	 * An ADSR envelope generator
	 */

	var Envelope = function(samplerate) {

		this.attackend = 0;		// end of attack phase
		this.attackstp = 0.0;	// attack step per sample

		this.decacend = 0;		// end of decay phase
		this.decaystp = 0.0;		// decay step per sample

		this.sustainend = 0;		// end of sustain phase

		this.releaseend = 0;		// end of release phase
		this.releasestp = 0.0;	// release step per sample

		this.sample = 0;			// sample counter
		this.volume = 0.0;		// current volume of envelope

		this.released = false;
		this.repeat = 1;

		this.init = function(atime, alevel, dtime, dlevel, stime, rtime, repeat) {
			// times in milliseconds!
			var attack= Math.floor(atime * 0.001 * samplerate);
			this.attackstp = alevel / attack;
			this.attackend = attack;

			var decay = Math.floor(dtime * 0.001 * samplerate);
			this.decaystp = (dlevel - alevel) / decay;
			this.decayend = this.attackend + decay;

			this.sustainend = Math.floor(stime * 0.001 * samplerate) + this.decayend;

			var release = Math.floor(rtime * 0.001 * samplerate);
			this.releasestp = -1 * (dlevel / release);
			this.releaseend = this.sustainend + release;

			if(repeat) {
				this.repeat = repeat;
			} else {
				this.repeat = 1;
			}

			this.reset();
		}


		this.reset = function() {
			this.volume = 0.0;
			this.sample = 0;
			this.released = false;
		}

		this.release = function() {
			this.released = true;
		}

		this.getEnvelope = function() {
			if(!this.released) return 0.0;


			var phase = (0|0);
			phase |= this.sample < this.attackend ? 1 : 0;
			phase |= this.sample < this.decayend ? 2 : 0;
			phase |= this.sample < this.sustainend ? 4 : 0;
			phase |= this.sample < this.releaseend ? 8 : 0;

			switch(phase) {
				case 15: // attack
					this.volume += this.attackstp;
					this.sample++;
					break;
				case 14: // decay
					this.volume += this.decaystp;
					this.sample++;
					break;
				case 12: // sustain
					this.sample++;
					break;
				case 8: // release
					this.volume += this.releasestp;
					this.sample++;
					break;
				default:
					this.volume = 0.0;
					if(this.repeat < 0 || this.repeat > 1) {
						this.reset();
						this.released = true;
						this.repeat--;
					}

			}

			return this.volume;
		}

	}


	/*
	 * A voice
	 */
	var Voice = function(samplerate) {
		this.osc = new Oscillator(samplerate);
		this.env = new Envelope(samplerate);

		this.getSample = function() {
			var e = this.env.getEnvelope();
			if(e > 0) {
				return e * this.osc.getSample();
			} else {
				return 0.0;
			}
		}
	}

	var audioContext;
	try {
		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		audioContext = new AudioContext();
	} catch(e) {
		throw 'Web Audio API is not supported in this browser';
	}

	var voices = [];
	this.voices = voices;
	for(var i = 0; i < voicecount; ++i) {
		voices.push(new Voice(audioContext.sampleRate));
	}


	var bufferSize = 1024;
	var pcmProcessingNode = audioContext.createScriptProcessor(bufferSize, 1, 1);
	pcmProcessingNode.onaudioprocess = function(e) {
		var out = e.outputBuffer.getChannelData(0);
		for(var i = 0; i < out.length; ++i) {
			var s = 0.0;
			for(var j = 0; j < voices.length;++j) {
				s += voices[j].getSample();
			}
			out[i] = s;
		}
	}

	this.start = function() {
		pcmProcessingNode.connect(audioContext.destination);
		console.log("sample rate: " + audioContext.sampleRate);
	}

	this.stop = function() {
		pcmProcessingNode.disconnect(audioContext.destination);
	}

}
