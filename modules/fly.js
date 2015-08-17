FlyWorld = function(_width, _height) {
	var that = this;
	var width = _width;
	var height = _height;
	var entities = [];	// entities in this world
	var killents = [];	// entities that are to be removed from this world
	var scoreCallback = function(){};


	this.think = function() {
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
			entities[i].think();
		}
	}

	this.findRadius = function(ent, radius, type) {
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
			var dist = Math.sqrt((xdelta*xdelta)+(ydelta*ydelta));
			if(dist <= radius) {
				result.push(e2);
			}
		}

		return result;
	}

	this.findClosest = function(ent, radius, type) {
		var result = null;
		var best = radius + 9;
		var x = ent.x;
		var y = ent.y;

		for(var i = 0; i < entities.length; ++i) {
			var e2 = entities[i];
			if(e2 === ent || (type && e2.type != type)) {
				continue;
			}

			var xdelta = x - e2.x;
			var ydelta = y - e2.y;
			var dist = Math.sqrt((xdelta*xdelta)+(ydelta*ydelta));
			if(dist <= radius && dist < best) {
				result = e2;
				best = dist;
			}
		}

		return result;
	}

	this.getNetMsg = function() {
		var msg = [];
		for(var i = 0; i < entities.length; ++i) {
			var ent = entities[i];
			msg.push(ent.getNetMsg());
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

	this.score = function(player, other) {
		scoreCallback(player, other);
	}
}



FlyPlane = function(_world, _x, _y, _player) {

	var that = this;
	var world = _world;
	world.add(this);

	var angle = 0.0; 			// plane is horizontal, flies right ->
	var dir = 1;				// -1: turn counter-clockwise, 0: don't turn, 1: turn clockwise

	var fire = false;
	var lastfire = 0;			// time of firing last
	var firedelay = 700;	

	var recovertime = 0;
	var recoverdelay = 1333;	

	var lasttic = new Date().getTime();
	var now = lasttic;

	// public members
	this.health = 100;
	this.x = _x;
	this.y = _y;
	this.player = _player;
	this.type = 0; // this is a plane!

	// Quake-style think function :)
	this.think = function() {
		now = new Date().getTime();
		var timedelta = (now - lasttic) * 0.001;
		lasttic = now;

		var direction = dir;
		var rotspeed = 0.4; 		// revolutions per two seconds!
		var speed = 100; 			// pixels per second!

		// rotate if dead
		if(this.health <= 0) {
			direction = 1;
			rotspeed = 5;
			speed = 0;
			if(now > recovertime) {
				this.health = 100;
			}
		}

		// update angle
		angle += direction * (rotspeed * timedelta);
		angle = angle < 0 ? angle + 2.0 : angle;
		angle = angle > 2 ? angle - 2.0 : angle;

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

		// fire if ready
		if(fire && now > lastfire + firedelay) {
			this.fire();
		}
	}

	this.fire = function() {
		lastfire = now;
		new FlyBullet(world, this.x, this.y, angle, this.player);
		new FlySound(world, 0); // Firing sound
	}

	this.receiveDamage = function(dmg) {
		this.health -= dmg;
		if(this.health <= 0) {
			recovertime = now + recoverdelay;
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

	
	this.getNetMsg = function() {
		return [
			(this.type|0),
			(this.player|0),
			(this.x|0),
			(this.y|0),
			((angle * 400)|0)
		];
	}
}

FlyBullet = function(_world, _x, _y, _angle, _player) {

	var that = this;
	var world = _world;
	world.add(this);

	var angle = _angle;
	var speed = 300; 			// pixels per second!
	var lifeTime = 700;		// milliseconds before removal

	var now = new Date().getTime();
	var lasttic = now;
	var endTime = now + lifeTime;


	// public members
	this.x = _x;
	this.y = _y;
	this.player = _player;
	this.type = 1; // this is a bullet!

	// Quake-style think function :)
	this.think = function() {

		now = new Date().getTime();
		var timedelta = (now - lasttic) * 0.001;
		lasttic = now;

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
		if(other && other.player != this.player && other.health > 0) {
			other.receiveDamage(200);
			world.score(this.player, other.player);
			world.remove(this);
		}

		// this bullet expired
		if(now > endTime) {
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
	this.sound = _sound;

	this.think = function(){};

	this.getNetMsg = function() {
		var msg = [2, this.sound];
		world.remove(this);
		return msg;
	}
}

if(!module) {
	var module = {};
}

module.exports = {
	"FlyWorld" : FlyWorld,
	"FlyPlane" : FlyPlane,
	"FlyBullet": FlyBullet,
	"FlySound" : FlySound
}
