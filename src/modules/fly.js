class World {

	constructor(width, height) {
		this.width = width;
		this.height = height;
		this.entities = [];	// entities in this world
		this.killents = [];	// entities that are to be removed from this world
		this.scoreCallback = function(){};

		this.time = new Date().getTime();
	}

	think() {
		// update time
		var now = new Date().getTime();
		this.timedelta = (now - this.time) * 0.001;
		this.time = now;

		// remove entities marked for removal
		for(let kent of this.killents) {
			let idx = this.entities.indexOf(kent);
			if(idx >= 0) {
				this.entities.splice(idx, 1);
			}
		}
		// clear array of entities to be removed
		this.killents.length = 0;

		// ensure all remaining entities think
		for(let ent of this.entities) {
			if("think" in ent) {
				ent.think();
			}
		}
	}

	findRadius(ent, radius, type) {
		var radius_squared = radius * radius;
		var result = [];
		var x = ent.x;
		var y = ent.y;

		for(let e2 of this.entities) {
			if(e2 === ent || (type && e2.type != type)) {
				continue;
			}
			let xdelta = x - e2.x;
			let ydelta = y - e2.y;
			let dist_squared = (xdelta*xdelta)+(ydelta*ydelta);
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

		for(let e2 of this.entities) {
			if(e2 === ent || (type && e2.type != type)) {
				continue;
			}

			let xdelta = x - e2.x;
			let ydelta = y - e2.y;
			let dist_squared = (xdelta*xdelta)+(ydelta*ydelta);
			if(dist_squared <= radius_squared && dist_squared < best) {
				result = e2;
				best = dist_squared;
			}
		}

		return result;
	}

	findType(type) {
		var result = [];
		for(let ent of this.entities) {
			if(ent.type === type) {
				result.push(ent);
			}
		}
		return result;
	}

	getNetMsg() {
		var msg = [];
		for(let ent of this.entities) {
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

	setScoreCallback(callback) {
		this.scoreCallback = callback;
	}

	score(points, player, other) {
		this.scoreCallback(points, player, other);
	}
}

class MovingEntity {

	updateAngle(direction, rotspeed) {
		var angle = this.angle;
		angle += direction * (rotspeed * this.world.timedelta);
		angle = angle < -Math.PI ? angle + (2 * Math.PI) : angle;
		angle = angle > Math.PI ? angle - (2 * Math.PI) : angle;
		this.angle = angle;
	}

	updatePosition(speed) {
		var x = this.x;
		var y = this.y;
		x += this.world.timedelta * (Math.cos(this.angle) * speed);
		y -= this.world.timedelta * (Math.sin(this.angle) * speed);

		// clamp position to world dimensions
		var width = this.world.width;
		var height = this.world.height;
		x = x < 0 ? x + width : x;
		x = x > width ? x - width : x;

		y = y < 0 ? y + height : y;
		y = y > height ? y - height : y;

		this.x = x;
		this.y = y;
	}
}



class Plane extends MovingEntity {

	constructor(world, x, y, player) {
		super();
		this.world = world;
		this.world.add(this);
		this.x = x;
		this.y = y;
		this.player = player;
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

		this.updateAngle(direction, rotspeed);
		this.updatePosition(speed);

		var rapidfire = this.world.time < this.rapidfiretime;

		// fire if ready
		if(this.fire && this.health > 0 && this.world.time > this.lastfire + (this.firedelay * (rapidfire ? 0.33 : 1.0))) {
			this.doFire();
		}
	}

	doFire() {
		this.lastfire = this.world.time;
		new Bullet(this.world, this.x, this.y, this.angle, this.player);
		if(this.multishottime > this.world.time) {
			if(this.multishottype == 0) {
				new Bullet(this.world, this.x, this.y, this.angle - 0.5 * Math.PI, this.player);
				new Bullet(this.world, this.x, this.y, this.angle + 0.5 * Math.PI, this.player);
				new Bullet(this.world, this.x, this.y, this.angle + Math.PI, this.player);
			} else {
				new Bullet(this.world, this.x, this.y, this.angle - 0.125 * Math.PI, this.player);
				new Bullet(this.world, this.x, this.y, this.angle + 0.125 * Math.PI, this.player);
			}
		}
		new Sound(this.world, 0); // Firing sound
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

class Bullet extends MovingEntity{

	constructor(world, x, y, angle, player) {
		super();
		this.world = world;
		this.world.add(this);
		this.x = x;
		this.y = y;
		this.player = player;
		this.angle = angle;
		this.type = 1;			 // this is a bullet!
	
		this.speed = 300; 		// pixels per second!
		this.lifeTime = 700;	// milliseconds before removal
		this.endTime = this.world.time + this.lifeTime;
	}

	// Quake-style think function :)
	think() {
		this.updatePosition(this.speed);

		// find close planes!
		var other = this.world.findClosest(this, 20, 0);
		if(other && other.player != this.player && other.health > 0) {
			other.receiveDamage(200);
			new Sound(this.world, 1); // Hit sound
			this.world.score(1, this.player, other.player);
			this.world.remove(this);
		}

		// this bullet expired
		if(this.world.time > this.endTime) {
			this.world.remove(this);
		}
	}

	getNetMsg() {
		return [
			(this.type|0),
			(this.x|0),
			(this.y|0)
		];
	}
}




class Bonus extends MovingEntity {

	constructor(world, x, y) {
		super();
		this.world = world;
		this.world.add(this);
		this.x = x;
		this.y = y;
		this.type = 3; // this is a bonus item

		this.angle = Math.random() * 2.0;
		this.speed = 40;
		this.expiretime = this.world.time + 10000;
	}

	think() {
		this.updatePosition(this.speed);		

		// find close planes!
		var other = this.world.findClosest(this, 20, 0);
		if(other && other.health > 0) {
			var r = Math.random();
			if(r < 0.33) {
				other.enableMultiShot(0);
			} else if(r < 0.66) {
				other.enableMultiShot(1);
			} else {
				other.enableRapidFire();
			}
			new Sound(this.world, 3); // Bonus pickup
			this.world.remove(this);
		}

		if(this.world.time > this.expiretime) {
			this.world.remove(this);
		}

	}

	getNetMsg() {
		return [
			(this.type|0),
			(this.x|0),
			(this.y|0)
		];
	}
}

class BonusSpawner {

	constructor(world) {
		this.world = world;
		this.world.add(this);
		this.nextspawn = 0;
	}

	think() {
		if(this.world.time < this.nextspawn) return;
		this.nextspawn = this.world.time + 15000 + Math.random() * 45000;

		// find planes
		var planes = this.world.findType(0);
		if(planes.length > 0) {
			new Bonus(this.world, this.world.width * Math.random(), this.world.height * Math.random());
			new Sound(this.world, 2); // Bonus spawn sound
		}
	}
}

class Bot {

	constructor(world, plane) {
		this.world = world;
		this.world.add(this);
		this.plane = plane;

		this.nextTurn = this.world.time;
		this.nextTarget = this.world.time;
		this.target = null;
	}

	think() {
		if(this.world.time > this.nextTarget) {
			// find close plane
			this.target = this.world.findClosest(this.plane, 200, 0);
			this.nextTarget = this.world.time + 100;
		}

		if(this.target) {
			// Arguments for Math.atan2 are "backwards": atan2(y, x)!
			// Also note that the y-axis is "downwards", the larger the "more down"
			var angle2 = Math.atan2(this.plane.y - this.target.y, this.target.x - this.plane.x)
			var diff = this.plane.angle - angle2;
			this.plane.setFire(Math.abs(diff) < 0.5);
		} else {
			this.plane.setFire(false);
			if(this.world.time > this.nextTurn) {
				var r = Math.random();
				var dir = 0;
				if(r < 0.4) {
					dir = 1;
				} else if(r > 0.6) {
					dir = -1;
				}
				this.plane.setDir(dir);
				this.nextTurn = this.world.time + (Math.random() * 2000);
			}
		}
	}
}


class Sound {

	constructor(world, sound) {
		this.world = world;
		this.world.add(this);
		this.sound = sound;
		this.type = 2; // this is a sound effect
	}

	getNetMsg() {
		var msg = [this.type, this.sound];
		this.world.remove(this);
		return msg;
	}
}


module.exports = {
	"FlyWorld" : World,
	"FlyPlane" : Plane,
	"FlyBullet": Bullet,
	"FlyBonus" : Bonus,
	"FlyBonusSpawner" : BonusSpawner,
	"FlySound" : Sound,
	"FlyBot"   : Bot
}
