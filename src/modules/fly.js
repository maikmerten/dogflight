class FlyWorld {

	constructor(_width, _height) {
		this.width = _width;
		this.height = _height;
		this.entities = [];	// entities in this world
		this.killents = [];	// entities that are to be removed from this world
		this.scoreCallback = function(){};

		this.time = new Date().getTime();
		this.lasttic = this.time;
	}

	think() {
		// update time
		this.time = new Date().getTime();
		this.timedelta = (this.time - this.lasttic) * 0.001;
		this.lasttic = this.time;

		// remove entities marked for removal
		for(let i = 0; i < this.killents.length; ++i) {
			let idx = this.entities.indexOf(this.killents[i]);
			if(idx >= 0) {
				this.entities.splice(idx, 1);
			}
		}
		this.killents = [];

		// ensure all remaining entities think
		for(let i = 0; i < this.entities.length; ++i) {
			let ent = this.entities[i];
			if("think" in ent) {
				this.entities[i].think();
			}
		}
	}

	findRadius(ent, radius, type) {
		var radius_squared = radius * radius;
		var result = [];
		var x = ent.x;
		var y = ent.y;

		for(let i = 0; i < this.entities.length; ++i) {
			var e2 = this.entities[i];
			if(e2 === ent || (type && e2.type != type)) {
				continue;
			}
			var xdelta = x - e2.x;
			var ydelta = y - e2.y;
			var dist_squared = (xdelta*xdelta)+(ydelta*ydelta);
			if(dist_squared <= radius_squared) {
				result.push(e2);
			}
		}

		return result;
	}

	findClosest(ent, radius, type) {
		var radius_squared = radius * radius;
		var result = null;
		var best = radius_squared + 9;
		var x = ent.x;
		var y = ent.y;

		for(let i = 0; i < this.entities.length; ++i) {
			var e2 = this.entities[i];
			if(e2 === ent || (type && e2.type != type)) {
				continue;
			}

			var xdelta = x - e2.x;
			var ydelta = y - e2.y;
			var dist_squared = (xdelta*xdelta)+(ydelta*ydelta);
			if(dist_squared <= radius_squared && dist_squared < best) {
				result = e2;
				best = dist_squared;
			}
		}

		return result;
	}

	findType(type) {
		var result = [];
		for(var i = 0; i < this.entities.length; ++i) {
			let ent = this.entities[i];
			if(ent.type === type) {
				result.push(ent);
			}
		}

		return result;
	}

	getNetMsg() {
		var msg = [];
		for(let i = 0; i < this.entities.length; ++i) {
			let ent = this.entities[i];
			if("getNetMsg" in ent) {
				msg.push(ent.getNetMsg());
			}
		}
		return msg;
	}

	add(ent) {
		if(this.entities.indexOf(ent) < 0) {
			this.entities.push(ent);
		}
	}

	remove(ent) {
		if(this.killents.indexOf(ent) < 0) {
			this.killents.push(ent);
		}
	}

	getWidth() {
		return this.width;
	}

	getHeight() {
		return this.height;
	}

	setScoreCallback(callback) {
		this.scoreCallback = callback;
	}

	score(points, player, other) {
		this.scoreCallback(points, player, other);
	}
}



class FlyPlane {

	constructor(_world, _x, _y, _player) {
		this.world = _world;
		this.world.add(this);

		this.x = _x;
		this.y = _y;
		this.player = _player;
		this.type = 0; // this is a plane!
		this.health = 100;

		this.angle = 0;	 			// plane is horizontal, flies right ->
		this.dir = -1;				// 1: turn counter-clockwise, 0: don't turn, -1: turn clockwise

		this.fire = false;
		this.lastfire = 0;			// time of firing last
		this.firedelay = 700;

		this.boost = false;
		this.boostfuel = 100;
		this.boostrecovery = 10; 	// boost fuel recovered per second
		this.boostconsumption = 40;	// boost fuel consumed per second

		this.brake = false;

		this.recovertime = 0;
		this.recoverdelay = 1333;

		this.multishottime = 0;
		this.multishotduration = 15000;
		this.multishottype = 0;

		this.rapidfiretime = 0;
		this.rapidfireduration = 20000;
	}

	// Quake-style think function :)
	think() {
		var timedelta = this.world.timedelta;

		var direction = this.dir;
		var rotspeed = 1.9;
		var speed = 100; 			// pixels per second!

		if(this.brake) {
			speed -= 40;
			rotspeed *= 1.2;
		}

		if(this.boost) {
			this.boostfuel -= this.boostconsumption * timedelta;
			if(this.boostfuel > 0) {
				speed += 75;
				rotspeed *= 1.2;
			}
		} else {
			this.boostfuel += this.boostrecovery * timedelta;
		}
		this.boostfuel = Math.min(100, Math.max(0, this.boostfuel));

		// rotate if dead
		if(this.health <= 0) {
			direction = 1;
			rotspeed = 15;
			speed = 0;
			if(this.world.time > this.recovertime) {
				this.health = 100;
			}
		}

		// update angle
		var angle = this.angle;
		angle += direction * (rotspeed * timedelta);
		angle = angle < -Math.PI ? angle + (2 * Math.PI) : angle;
		angle = angle > Math.PI ? angle - (2 * Math.PI) : angle;
		this.angle = angle;

		var x = this.x;
		var y = this.y;
		x += timedelta * (Math.cos(angle) * speed);
		y -= timedelta * (Math.sin(angle) * speed);

		// clamp position to world dimensions
		var width = this.world.getWidth();
		var height = this.world.getHeight();
		x = x < 0 ? x + width : x;
		x = x > width ? x - width : x;

		y = y < 0 ? y + height : y;
		y = y > height ? y - height : y;

		this.x = x;
		this.y = y;

		var rapidfire = this.world.time < this.rapidfiretime;

		// fire if ready
		if(this.fire && this.health > 0 && this.world.time > this.lastfire + (this.firedelay * (rapidfire ? 0.33 : 1.0))) {
			this.doFire();
		}
	}

	doFire() {
		this.lastfire = this.world.time;
		new FlyBullet(this.world, this.x, this.y, this.angle, this.player);
		if(this.multishottime > this.world.time) {
			if(this.multishottype == 0) {
				new FlyBullet(this.world, this.x, this.y, this.angle - 0.5 * Math.PI, this.player);
				new FlyBullet(this.world, this.x, this.y, this.angle + 0.5 * Math.PI, this.player);
				new FlyBullet(this.world, this.x, this.y, this.angle + Math.PI, this.player);
			} else {
				new FlyBullet(this.world, this.x, this.y, this.angle - 0.125 * Math.PI, this.player);
				new FlyBullet(this.world, this.x, this.y, this.angle + 0.125 * Math.PI, this.player);
			}
		}
		new FlySound(this.world, 0); // Firing sound
	}

	receiveDamage(dmg) {
		this.health -= dmg;
		if(this.health <= 0) {
			this.recovertime = this.world.time + this.recoverdelay;
		}
	}

	setDir(newdir) {
		this.dir = newdir;
		this.dir = this.dir < -1 ? -1 : this.dir;
		this.dir = this.dir > 1 ? 1 : this.dir;
	}

	setFire(newfire) {
		this.fire = newfire;
	}

	setBoost(newboost) {
		this.boost = newboost;
	}

	setBrake(newbrake) {
		this.brake = newbrake;
	}

	enableMultiShot(type) {
		this.multishottype = type;
		this.multishottime = this.world.time + this.multishotduration;
	}

	enableRapidFire() {
		this.rapidfiretime = this.world.time + this.rapidfireduration;
	}
	
	getNetMsg() {
		return [
			(this.type|0),
			(this.player|0),
			(this.x|0),
			(this.y|0),
			((this.angle * 200)|0)
		];
	}
}

var FlyBullet = function(_world, _x, _y, _angle, _player) {

	var that = this;
	var world = _world;
	world.add(this);

	var angle = _angle;
	var speed = 300; 		// pixels per second!
	var lifeTime = 700;		// milliseconds before removal
	var endTime = world.time + lifeTime;

	// public members
	this.x = _x;
	this.y = _y;
	this.player = _player;
	this.type = 1; // this is a bullet!

	// Quake-style think function :)
	this.think = function() {
		var timedelta = world.timedelta;

		var x = this.x;
		var y = this.y;
		x += timedelta * (Math.cos(angle) * speed);
		y -= timedelta * (Math.sin(angle) * speed);

		// clamp position to world dimensions
		var width = world.getWidth();
		var height = world.getHeight();
		x = x < 0 ? x + width : x;
		x = x > width ? x - width : x;

		y = y < 0 ? y + height : y;
		y = y > height ? y - height : y;

		this.x = x;
		this.y = y;

		// find close planes!
		var other = world.findClosest(this, 20, 0);
		if(other && other.player != this.player && other.health > 0) {
			other.receiveDamage(200);
			new FlySound(world, 1); // Hit sound
			world.score(1, this.player, other.player);
			world.remove(this);
		}

		// this bullet expired
		if(world.time > endTime) {
			world.remove(this);
		}
	}

	this.getNetMsg = function() {
		return [
			(this.type|0),
			(this.x|0),
			(this.y|0)
		];
	}
}


var FlySound = function(_world, _sound) {
	var that = this;
	var world = _world;
	world.add(this);
	this.type = 2; // this is a sound effect
	this.sound = _sound;

	this.getNetMsg = function() {
		var msg = [this.type, this.sound];
		world.remove(this);
		return msg;
	}
}

var FlyBonus = function(_world, _x, _y) {
	var that = this;
	var world = _world;
	world.add(this);
	var angle = Math.random() * 2.0;
	var speed = 40;
	var expiretime = world.time + 10000;

	this.type = 3; // this is a bonus item
	this.x = _x;
	this.y = _y;

	this.think = function() {
		var timedelta = world.timedelta;

		var x = this.x;
		var y = this.y;
		x += timedelta * (Math.cos(angle) * speed);
		y -= timedelta * (Math.sin(angle) * speed);

		// clamp position to world dimensions
		var width = world.getWidth();
		var height = world.getHeight();
		x = x < 0 ? x + width : x;
		x = x > width ? x - width : x;

		y = y < 0 ? y + height : y;
		y = y > height ? y - height : y;

		this.x = x;
		this.y = y;

		// find close planes!
		var other = world.findClosest(this, 20, 0);
		if(other && other.health > 0) {
			var r = Math.random();
			if(r < 0.33) {
				other.enableMultiShot(0);
			} else if(r < 0.66) {
				other.enableMultiShot(1);
			} else {
				other.enableRapidFire();
			}
			new FlySound(world, 3); // Bonus pickup
			world.remove(this);
		}

		if(world.time > expiretime) {
			world.remove(this);
		}

	}

	this.getNetMsg = function() {
		return [
			(this.type|0),
			(this.x|0),
			(this.y|0)
		];
	}
}

var FlyBonusSpawner = function(_world) {
	var world = _world;
	world.add(this);
	var nextspawn = 0;

	this.think = function() {
		if(world.time < nextspawn) return;
		nextspawn = world.time + 15000 + Math.random() * 45000;

		// find planes
		var planes = world.findType(0);
		if(planes.length > 0) {
			new FlyBonus(world, world.getWidth() * Math.random(), world.getHeight() * Math.random());
			new FlySound(world, 2); // Bonus spawn sound
		}
	}
}

var FlyBot = function(_world, _plane) {
	var that = this;
	var world = _world;
	var plane = _plane;
	world.add(this);

	var nextTurn = world.time;
	var nextTarget = world.time;
	var target = null;

	this.think = function() {
		if(world.time > nextTarget) {
			// find close plane
			target = world.findClosest(plane, 200, 0);
			nextTarget = world.time + 100;
		}

		if(target) {
			// Arguments for Math.atan2 are "backwards": atan2(y, x)!
			// Also note that the y-axis is "downwards", the larger the "more down"
			var angle2 = Math.atan2(plane.y - target.y, target.x - plane.x)
			var diff = plane.angle - angle2;
			plane.setFire(Math.abs(diff) < 0.5);
		} else {
			plane.setFire(false);
			if(world.time > nextTurn) {
				var r = Math.random();
				var dir = 0;
				if(r < 0.4) {
					dir = 1;
				} else if(r > 0.6) {
					dir = -1;
				}
				plane.setDir(dir);
				nextTurn = world.time + (Math.random() * 2000);
			}
		}
	}
}



module.exports = {
	"FlyWorld" : FlyWorld,
	"FlyPlane" : FlyPlane,
	"FlyBullet": FlyBullet,
	"FlyBonus" : FlyBonus,
	"FlyBonusSpawner" : FlyBonusSpawner,
	"FlySound" : FlySound,
	"FlyBot"   : FlyBot
}
