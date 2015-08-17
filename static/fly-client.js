
FlyRenderer = function(player, canvas) {
	var that = this;

	this.renderBackdrop = function() {
		var ctx = canvas.getContext("2d");

		var grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
		grd.addColorStop(0, "#449");
		grd.addColorStop(1, "#aaf");
		ctx.fillStyle=grd;
		ctx.fillRect(0,0, canvas.width, canvas.height);
	}

	this.renderForeground = function() {
		var ctx = canvas.getContext("2d");
		var width = canvas.width;
		var height = canvas.height;

		ctx.lineWidth = 3;
		ctx.strokeStyle = "#CCC";
		ctx.fillStyle = "#FFF";

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
		ctx.arc(width * 0.32, height * 0.42, width * 0.06, 0, 2 * Math.PI, false);
		ctx.restore();
		ctx.fill();
		ctx.stroke();
	}

	this.renderPlane = function(ctx, msg) {
		var x = msg.x;
		var y = msg.y;
		var angle = msg.a * 0.0025 * Math.PI;

		var x_tip = x + (Math.cos(angle) * 12);
		var y_tip = y + (Math.sin(angle) * 12);

		var wingslant = 0.7 * Math.PI;
		var angle_wing_l = angle - wingslant;
		var x_wing_l = x + (Math.cos(angle_wing_l) * 10);
		var y_wing_l = y + (Math.sin(angle_wing_l) * 10);

		var angle_wing_r = angle + wingslant;
		var x_wing_r = x + (Math.cos(angle_wing_r) * 10);
		var y_wing_r = y + (Math.sin(angle_wing_r) * 10);

		ctx.fillStyle = msg.p === player ? "#0F0" : "#F00";
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x_wing_l,y_wing_l);
		ctx.lineTo(x_tip, y_tip);
		ctx.lineTo(x_wing_r, y_wing_r);
		ctx.closePath();
		ctx.fill();
		ctx.lineWidth = 2;
		ctx.strokeStyle = "#000";
		ctx.stroke();
	}

	this.renderBullet = function(ctx, msg) {
		var x = msg.x;
		var y = msg.y;

		ctx.fillStyle = "#000";
		ctx.beginPath();
		ctx.arc(x, y, 2, 0, 2 * Math.PI, false);
		ctx.fill();
	}

	this.renderSound = function(msg) {
		var audio = $("#sound" + msg.s);
		if(audio[0]) {
			audio[0].play();
		}
	}

	this.renderMsg = function(msg) {
		var ctx = canvas.getContext("2d");
		var type = msg.t;

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

}
