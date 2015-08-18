
FlyRenderer = function(player, canvas) {
	var that = this;
	var vectrex = false;
	var scanlines = true;
	var bgCanvas = $("<canvas>").attr("width", canvas.width).attr("height", canvas.height)[0];
	var fgCanvas = $("<canvas>").attr("width", canvas.width).attr("height", canvas.height)[0];

	this.prepareBackdrop = function() {
		var ctx = bgCanvas.getContext("2d");

		if(vectrex) {
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

		ctx.lineWidth = vectrex ? 2 : 3;
		ctx.strokeStyle = vectrex ? "#FFF" : "#CCC";
		ctx.fillStyle = vectrex ? "#000" : "#FFF";

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
		var angle = msg[4] * 0.0025 * Math.PI;

		var x_tip = x + (Math.cos(angle) * 12);
		var y_tip = y + (Math.sin(angle) * 12);

		var wingslant = 0.7 * Math.PI;
		var angle_wing_l = angle - wingslant;
		var x_wing_l = x + (Math.cos(angle_wing_l) * 10);
		var y_wing_l = y + (Math.sin(angle_wing_l) * 10);

		var angle_wing_r = angle + wingslant;
		var x_wing_r = x + (Math.cos(angle_wing_r) * 10);
		var y_wing_r = y + (Math.sin(angle_wing_r) * 10);

		if(vectrex) {
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
		ctx.strokeStyle = vectrex? "#FFF" : "#000";
		ctx.stroke();
	}

	this.renderBullet = function(ctx, msg) {
		var x = msg[1];
		var y = msg[2];

		ctx.fillStyle = vectrex? "#FFF" : "#000";
		ctx.beginPath();
		ctx.arc(x, y, 2, 0, 2 * Math.PI, false);
		ctx.fill();
	}

	this.renderSound = function(msg) {
		var sound = msg[1];
		var audio = $("#sound" + sound);
		if(audio[0]) {
			audio[0].play();
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
