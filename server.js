var express = require("express");
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var argv = require('yargs').argv;
var fly = require("./modules/fly");

// determine if minified JavaScript resources are served
var minjs = ".min";
if(argv.debug) {
	console.log("### Serving non-minified JavaScript libraries!");
	minjs = "";
}

// determine port to be used, the default is port 3000
var port = 3000;
if(argv.port) {
	port = argv.port;
}

http.listen(port, function(){
	console.log('listening on *:' + port);
});

app.use(express.static('static'));


app.get('/jquery.js', function(req, res){
	res.sendFile(__dirname + '/static/jquery-1.11.1' + minjs + '.js');
});


var world = new fly.FlyWorld(640,480);
var players = [];
function Player(player) {
	players[player] = this;
	this.player = player;
	this.nick = "Hans";
	this.score = 0;
	this.plane = new fly.FlyPlane(world, 320, 240, player);
}

function nextPlayer() {
	for(var i = 0; i < players.length; ++i) {
		if(players[i] === null) {
			return i;
		}
	}
	players.push(null);
	return players.length - 1;
}

function sendScores() {
	var nicks = [];
	var scores = [];
	var ids = [];
	for(var i = 0; i < players.length; ++i) {
		var p = players[i];
		if(p && "nick" in p && "score" in p && "player" in p) {
			nicks.push(p.nick);
			scores.push(p.score);
			ids.push(p.player);
		}
	}
	var update = {
		"nicks" : nicks,
		"scores" : scores,
		"players" : ids
	}
	io.sockets.in("players").emit("scores", update);
}

world.setScoreCallback(function(player, other) {
	var p = players[player];
	var o = players[other];
	if(p) {
		p.score++;
		console.log("new score for " + p.nick + ": " + p.score);
	}
	sendScores();
});


io.on('connection', function(socket){
	console.log('a user connected');

	socket.on("join", function(request) {
		var player = nextPlayer();
		
		socket.player = new Player(player);
		socket.player.nick = request.nick.substring(0,12);
		socket.join("players");

		var joininfo = {
			"player" : player,
			"width" : world.getWidth(),
			"height" : world.getHeight()
		}
		socket.emit("joinInfo", joininfo);
		sendScores();
	});

	// control update
	socket.on("ctrl", function(update) {

		var dir = 0;
		if(update & 1) dir = -1;
		if(update & 2) dir = 1;
		var boost = (update & 4);
		var brake = (update & 8);
		var fire = (update & 16);

		var plane = socket.player.plane;
		plane.setDir(dir);
		plane.setFire(fire);
		plane.setBoost(boost);
		plane.setBrake(brake);
	});


	socket.on('disconnect', function(){
		console.log('user disconnected');
		if(socket.player) {
			world.remove(socket.player.plane);
			players[socket.player.player] = null;
		}
		sendScores();
	});
});


function tic() {
	var oldtime = world.time;
	world.think();
	var newtime = world.time;

	if(newtime - oldtime > 80) {
		console.log("Warning: Server does not keep up, " + (newtime - oldtime) + " milliseconds between tics instead of 40!");
	}

	var msgs = world.getNetMsg();
	io.sockets.in("players").emit("worldUpdate", msgs);
}
setInterval(tic, 40.0);

