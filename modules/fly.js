FlyWorld = function(_width, _height) {
	var that = this;
	var width = _width;
	var height = _height;
	var entities = [];	// entities in this world
	var killents = [];	// entities that are to be removed from this world
	var scoreCallback = function(){};

	this.time = new Date().getTime();
	var lasttic = this.time;

	this.think = function() {
		// update time
		this.time = new Date().getTime();
		this.timedelta = (this.time - lasttic) * 0.001;
		lasttic = this.time;

		// remove entities marked for removal
		for(var i = 0; i < killents.length; ++i) {
			var idx = entities.indexOf(killents[i]);
			if(idx >= 0) {
				entities.splice(idx, 1);
			}
		}
		killents = [];

		// ensure all remaining entities think
		for(var i = 0; i < entities.length; ++i) {
			var ent = entities[i];
			if("think" in ent) {
				entities[i].think();
			}
		}
	}

	this.findRadius = function(ent, radius, type) {
		var radius_squared = radius * radius;
		var result = [];
		var x = ent.x;
		var y = ent.y;

		for(var i = 0; i < entities.length; ++i) {
			var e2 = entities[i];
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

	this.findClosest = function(ent, radius, type) {
		var radius_squared = radius * radius;
		var result = null;
		var best = radius_squared + 9;
		var x = ent.x;
		var y = ent.y;

		for(var i = 0; i < entities.length; ++i) {
			var e2 = entities[i];
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

	this.findType = function(type) {
		var result = [];
		for(var i = 0; i < entities.length; ++i) {
			var ent = entities[i];
			if(ent.type === type) {
				result.push(ent);
			}
		}

		return result;
	}

	this.getNetMsg = function() {
		var msg = [];
		for(var i = 0; i < entities.length; ++i) {
			var ent = entities[i];
			if("getNetMsg" in ent) {
				msg.push(ent.getNetMsg());
			}
		}
		return msg;
	}

	this.add = function(ent) {
		if(entities.indexOf(ent) < 0) {
			entities.push(ent);
		}
	}

	this.remove = function(ent) {
		if(killents.indexOf(ent) < 0) {
			killents.push(ent);
		}
	}

	this.getWidth = function() {
		return width;
	}

	this.getHeight = function() {
		return height;
	}

	this.setScoreCallback = function(callback) {
		scoreCallback = callback;
	}

	this.score = function(points, player, other) {
		scoreCallback(points, player, other);
	}
}



FlyPlane = function(_world, _x, _y, _player) {

	var that = this;
	var world = _world;
	world.add(this);

	var angle = 0;	 			// plane is horizontal, flies right ->
	this.angle = angle;
	var dir = 0;				// 1: turn counter-clockwise, 0: don't turn, -1: turn clockwise

	var fire = false;
	var lastfire = 0;			// time of firing last
	var firedelay = 700;

	var boost = false;
	var boostfuel = 100;
	var boostrecovery = 10; 	// boost fuel recovered per second
	var boostconsumption = 40;	// boost fuel consumed per second

	var brake = false;

	var recovertime = 0;
	var recoverdelay = 1333;	

	// public members
	this.health = 100;
	this.x = _x;
	this.y = _y;
	this.player = _player;
	this.type = 0; // this is a plane!

	// Quake-style think function :)
	this.think = function() {
		var timedelta = world.timedelta;

		var direction = dir;
		var rotspeed = 1.9;
		var speed = 100; 			// pixels per second!

		if(brake) {
			speed -= 40;
			rotspeed *= 1.2;
		}

		if(boost) {
			boostfuel -= boostconsumption * timedelta;
			if(boostfuel > 0) {
				speed += 75;
				rotspeed *= 1.2;
			}
		} else {
			boostfuel += boostrecovery * timedelta;
		}
		boostfuel = Math.min(100, boostfuel);
		boostfuel = Math.max(0, boostfuel);

		// rotate if dead
		if(this.health <= 0) {
			direction = 1;
			rotspeed = 15;
			speed = 0;
			if(world.time > recovertime) {
				this.health = 100;
			}
		}

		// update angle
		angle += direction * (rotspeed * timedelta);
		angle = angle < -Math.PI ? angle + (2 * Math.PI) : angle;
		angle = angle > Math.PI ? angle - (2 * Math.PI) : angle;
		this.angle = angle;

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

		// fire if ready
		if(fire && this.health > 0 && world.time > lastfire + firedelay) {
			this.fire();
		}
	}

	this.fire = function() {
		lastfire = world.time;
		new FlyBullet(world, this.x, this.y, angle, this.player);
		new FlySound(world, 0); // Firing sound
	}

	this.receiveDamage = function(dmg) {
		this.health -= dmg;
		if(this.health <= 0) {
			recovertime = world.time + recoverdelay;
		}
	}
	

	this.setDir = function(newdir) {
		dir = newdir;
		dir = dir < -1 ? -1 : dir;
		dir = dir > 1 ? 1 : dir;
	}

	this.setFire = function(newfire) {
		fire = newfire;
	}

	this.setBoost = function(newboost) {
		boost = newboost;
	}

	this.setBrake = function(newbrake) {
		brake = newbrake;
	}
	
	this.getNetMsg = function() {
		return [
			(this.type|0),
			(this.player|0),
			(this.x|0),
			(this.y|0),
			((angle * 200)|0)
		];
	}
}

FlyBullet = function(_world, _x, _y, _angle, _player) {

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


FlySound = function(_world, _sound) {
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

FlyBonus = function(_world, _x, _y) {
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
		x += timedelta * (Math.cos(angle * Math.PI) * speed);
		y += timedelta * (Math.sin(angle * Math.PI) * speed);

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
			world.score(5, other.player);
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

FlyBonusSpawner = function(_world) {
	var world = _world;
	world.add(this);
	var nextspawn = 0;

	this.think = function() {
		if(world.time < nextspawn) return;
		nextspawn = world.time + 30000 + Math.random() * 60000;

		// find planes
		var planes = world.findType(0);
		if(planes.length > 0) {
			new FlyBonus(world, world.getWidth() * Math.random(), world.getHeight() * Math.random());
			new FlySound(world, 2); // Bonus spawn sound
		}
	}
}

FlyBot = function(_world, _plane) {
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

if(!module) {
	var module = {};
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
