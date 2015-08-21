
FlyRenderer = function(player, canvas) {
	var that = this;
	var nocolors = false;
	var scanlines = true;
	var bgCanvas = $("<canvas>").attr("width", canvas.width).attr("height", canvas.height)[0];
	var fgCanvas = $("<canvas>").attr("width", canvas.width).attr("height", canvas.height)[0];

	// try to init WebAudioSynth
	var was = null;
	try {
		// three channels
		was = new WebAudioSynth(3);
		was.start();
	} catch(e) {
		console.log(e);
	}
	
	this.setColors = function(colors) {
		nocolors = !colors;
		this.prepareBackdrop();
		this.prepareForeground();
	}

	this.prepareBackdrop = function() {
		var ctx = bgCanvas.getContext("2d");

		if(nocolors) {
			ctx.fillStyle = "#000";
		} else {
			var grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
			grd.addColorStop(0, "#449");
			grd.addColorStop(1, "#aaf");
			ctx.fillStyle=grd;
		}
		ctx.fillRect(0,0, canvas.width, canvas.height);
	}
	this.prepareBackdrop();

	this.renderBackdrop = function() {
		var ctx = canvas.getContext("2d");
		ctx.drawImage(bgCanvas, 0, 0);
	}

	this.prepareForeground = function() {
		var ctx = fgCanvas.getContext("2d");
		var width = fgCanvas.width;
		var height = fgCanvas.height;

		ctx.clearRect(0,0, canvas.width, canvas.height);

		ctx.lineWidth = nocolors ? 2 : 3;
		ctx.strokeStyle = nocolors ? "#FFF" : "#CCC";
		ctx.fillStyle = nocolors ? "#000" : "#FFF";

		// cloud
		ctx.save();
		ctx.scale(2, 1);
		ctx.beginPath();
		ctx.arc(width * 0.18, height * 0.4, width * 0.06, 0, 2 * Math.PI, false);
		ctx.restore();
		ctx.fill();
		ctx.stroke();

		// cloud
		ctx.save();
		ctx.scale(2, 1);
		ctx.beginPath();
		ctx.arc(width * 0.24, height * 0.5, width * 0.05, 0, 2 * Math.PI, false);
		ctx.restore();
		ctx.fill();
		ctx.stroke();

		ctx.save();
		ctx.scale(2, 1);
		ctx.beginPath();
		ctx.arc(width * 0.47, height * 0.05, width * 0.04, 0, 2 * Math.PI, false);
		ctx.restore();
		ctx.fill();
		ctx.stroke();


		ctx.save();
		ctx.scale(2, 1);
		ctx.beginPath();
		ctx.arc(width * 0.03, height * 0.95, width * 0.04, 0, 2 * Math.PI, false);
		ctx.restore();
		ctx.fill();
		ctx.stroke();

		ctx.save();
		ctx.scale(2, 1);
		ctx.beginPath();
		ctx.arc(width * 0.35, height * 0.75, width * 0.04, 0, 2 * Math.PI, false);
		ctx.restore();
		ctx.fill();
		ctx.stroke();

		for(var y = 0; scanlines && y < fgCanvas.height; ++y) {
			var a = (y & 1) > 0 ? 0.0 : 0.4;
			ctx.fillStyle = "rgba(0, 0, 0," + a + ")";
			ctx.fillRect(0, y, fgCanvas.width, 1);
		}
	}
	this.prepareForeground();

	this.renderForeground = function() {
		var ctx = canvas.getContext("2d");
		ctx.drawImage(fgCanvas, 0, 0);
	}

	this.renderPlane = function(ctx, msg) {
		var p = msg[1];
		var x = msg[2];
		var y = msg[3];
		var angle = msg[4] * 0.005;

		var x_tip = x + (Math.cos(angle) * 12);
		var y_tip = y - (Math.sin(angle) * 12);

		var wingslant = 0.7 * Math.PI;
		var angle_wing_l = angle - wingslant;
		var x_wing_l = x + (Math.cos(angle_wing_l) * 10);
		var y_wing_l = y - (Math.sin(angle_wing_l) * 10);

		var angle_wing_r = angle + wingslant;
		var x_wing_r = x + (Math.cos(angle_wing_r) * 10);
		var y_wing_r = y - (Math.sin(angle_wing_r) * 10);

		if(nocolors) {
			ctx.fillStyle = (p === player) ? "#FFF" : "#000";
		} else {
			ctx.fillStyle = this.getPlayerColor(p);
		}
		
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x_wing_l,y_wing_l);
		ctx.lineTo(x_tip, y_tip);
		ctx.lineTo(x_wing_r, y_wing_r);
		ctx.closePath();
		ctx.fill();
		ctx.lineWidth = 2;
		ctx.strokeStyle = nocolors? "#FFF" : "#000";
		ctx.stroke();
	}

	this.renderBullet = function(ctx, msg) {
		var x = msg[1];
		var y = msg[2];

		ctx.fillStyle = nocolors? "#FFF" : "#000";
		ctx.beginPath();
		ctx.arc(x, y, 2, 0, 2 * Math.PI, false);
		ctx.fill();
	}

	this.renderBonus = function(ctx, msg) {
		var x = msg[1];
		var y = msg[2];

		ctx.fillStyle = nocolors? "#000" : "#090";
		ctx.beginPath();
		ctx.arc(x, y, 10, 0, 2 * Math.PI, false);
		ctx.fill();
		ctx.strokeStyle = nocolors? "#FFF" : "#000";
		ctx.stroke();
		ctx.fillStyle = "#FFF";
		ctx.fillRect(x - 2, y - 6, 4, 12);
		ctx.fillRect(x - 6, y - 2, 12, 4);
	}



	this.renderSoundFire = function() {
		var voice2 = was.voices[2];
		voice2.osc.init(voice2.osc.NOISE, 3000);
		voice2.env.init(10,0.75,10,0.15,40,40)

		voice2.env.release();
	}

	this.renderSoundHit = function() {
		var voice0 = was.voices[0];
		voice0.osc.init(voice0.osc.TRIANGLE, 500);
		voice0.env.init(10,1.0,30,0.5,10,10);

		var voice1 = was.voices[1];
		voice1.osc.init(voice1.osc.TRIANGLE, 400);
		voice1.env.init(10,1.0,30,0.5,10,10);

		voice0.env.release();
		voice1.env.release();
	}

	this.renderSoundBonusSpawn = function() {
		var voice0 = was.voices[0];
		voice0.osc.init(voice0.osc.TRIANGLE, 600);
		voice0.env.init(10,0.7,80,0.35,10,10, 5);
		voice0.env.release();
	}

	this.renderSoundBonusPickup = function() {
		var voice0 = was.voices[0];
		voice0.osc.init(voice0.osc.TRIANGLE, 600);
		voice0.env.init(30,0.7,40,0.35,10,50);
		voice0.env.release();
	}

	this.renderSound = function(msg) {
		if(!was) return;
		var sound = msg[1];
		
		switch(sound) {
			case 0: // fire
				this.renderSoundFire();
				break;
			case 1: // Hit
				this.renderSoundHit();
				break;
			case 2: // Bonus spawn
				this.renderSoundBonusSpawn();
				break;
			case 3: // Bonus pickup
				this.renderSoundBonusPickup();
				break;
		}
	}

	this.renderMsg = function(msg) {
		var ctx = canvas.getContext("2d");
		var type = msg[0];

		switch(type) {
			case 0:
				that.renderPlane(ctx, msg);
				break;
			case 1:
				that.renderBullet(ctx, msg);
				break;
			case 2:
				that.renderSound(msg);
				break;
			case 3:
				that.renderBonus(ctx, msg);
				break;
		}
	}

	this.getPlayerColor = function(p) {
		if(p === player) {
			return "#0F0";
		}

		var colors = [
			"#F00",
			"#00F",
			"#FF0",
			"#F0F",
			"#0FF",
			"#F06",
			"#60F",
			"#909",
			"#990",
			"#099"
		];
		return colors[p % colors.length];
	}

}
