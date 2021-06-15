'use strict'

var http = require('http');
var https = require('https');
var fs = require('fs');

var express = require('express');
var serveIndex = require('serve-index');
var socketIo = require('socket.io');
var USERCOUNT = 3;

//打log
var log4js = require('log4js');
log4js.configure({
	appenders:{
		file:{
			type:'file',
			filename:'app.log',
			layout:{
				type:'pattern',
				pattern:'%r %p - %m',
			}
		}
	},
	categories:{
		default:{
			appenders:['file'],
			level:'debug'
		}
	}
});
var logger = log4js.getLogger();

var app = express();

//按照这个顺序
app.use(serveIndex('./public'));
app.use(express.static('./public'));

var options = {
	key  : fs.readFileSync('./cert/privkey.pem'),
	cert : fs.readFileSync('./cert/fullchain.pem') 
}

var https_server = https.createServer(options, app);

var io = socketIo.listen(https_server);

//信令服务器
io.sockets.on('connection',(socket)=>{
	socket.on('message', (room, data)=>{//信息中转
		socket.to(room).emit('message', room, data)//房间内所有人,除自己外
		//io.in(room).emit('message', room, data)//房间内所有人
	});
	socket.on('join',(room)=>{
		socket.join(room);
		var myRoom = io.sockets.adapter.rooms[room];//在数组中找房间号
		var users = (myRoom)? Object.keys(myRoom.sockets).length : 0;
		logger.log('the number of user in room is' + users);
		//在这里可以控制进入房间的人数,现在一个房间最多 2个人
		//为了便于客户端控制，如果是多人的话，应该将目前房间里
		//人的个数当做数据下发下去。
		if(users < USERCOUNT) {
			socket.emit('joined', room, socket.id);	
			if (users > 1) {
				socket.to(room).emit('otherjoin', room);//除自己之外
			}
		}else {
			socket.leave(room);
			socket.emit('full', room, socket.id);	
		}
	 	//socket.to(room).emit('joined', room, socket.id);//除自己之外
		//io.in(room).emit('joined', room, socket.id)//房间内所有人
	 	//socket.broadcast.emit('joined', room, socket.id);//除自己，全部站点
	});
	socket.on('leave',(room)=>{
		var myRoom = io.sockets.adapter.rooms[room];//在数组中找房间号
		var users = (myRoom)? Object.keys(myRoom.sockets).length : 0;
		logger.log('the number of user in room is' + users-1);//user-1
		//socket.leave(room);
		//socket.emit('leaved',room,socket.id);//
		//.to(room).emit('bye',room,socket.id);
		socket.to(room).emit('bye', room, socket.id);
		socket.emit('leaved', room, socket.id);
		//io.in(room).emit('leaved',room,socket.id);//所有人
		//socket.broadcast.emit('leaved',room,socket.id);//给站点所有人发，除自己
	});
});
https_server.listen(28522, '0.0.0.0');

var http_server = http.createServer(app);
http_server.listen(28521, '0.0.0.0');