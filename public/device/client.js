'use strict'
//devices
var audioSource  = document.querySelector("select#audioSource");
var audioOutput  = document.querySelector("select#audioOutput");
var videoSource  = document.querySelector("select#videoSource");
//media
var localaudioplay = document.querySelector("audio#localaudio");
var localvideoplay = document.querySelector("video#localVideo");
var remoteaudioplay = document.querySelector("audio#remoteaudio");
var remotevideoplay = document.querySelector("video#remoteVideo");
//div
var divConstraints = document.querySelector("div#constraints");

//
var filterSelect = document.querySelector("select#filter");

//picture
var snapshotlocal = document.querySelector("button#snapshotlocal");
var picturelocal = document.querySelector("canvas#picturelocal");
var snapshotremote = document.querySelector("button#snapshotremote");
var pictureremote = document.querySelector("canvas#pictureremote");
//userinfo
var userName = document.querySelector("input#username");
var inputRoom = document.querySelector("input#room");
var btnConnect = document.querySelector("button#connect");
var btnLeave = document.querySelector('button#leave');
var outputArea = document.querySelector("textarea#output");
outputArea.disabled = true;
var inputArea = document.querySelector("textarea#input");
var btnSend = document.querySelector("button#send");
//call
var btnStart = document.querySelector("button#start");
var btnCall = document.querySelector("button#call");
var btnHangUp = document.querySelector("button#hangup");

var socketchat;
var localStream;
var room;
var data
var pc1;
var pc2;
btnConnect.onclick = ()=>{
    //connect
    socketchat=io.connect();
    //send msg
    room = inputRoom.value;
    socketchat.emit('join',room);
    //receive msg
    socketchat.on('joined',(room,id)=>{
        btnConnect.disabled = true;
        btnLeave.disabled = false;
        inputArea.disabled = false;
        btnSend.disabled = false;
    });
    socketchat.on('leaved',(room,id)=>{
        btnConnect.disabled = false;
        inputArea.disabled = true;
        btnSend.disabled = true;
    });
    socketchat.on('message',(room,data)=>{
        outputArea.scrollTop = outputArea.scrollHeight;//窗口总是显示最后的内容
        outputArea.value = outputArea.value + data + '\r';
    });
    socketchat.on('disconnect', (socket)=>{
		btnConnect.disabled = false;
		btnLeave.disabled = true;
		inputArea.disabled = true;
		btnSend.disabled = true;
	});
}
btnSend.onclick = ()=>{
    var data = inputArea.value;
    if(data!='')
    {
        data = userName.value + ':' + data;
        socketchat.emit('message',room,data);
        inputArea.value = '';
    }
}

btnLeave.onclick = ()=>{
	room = inputRoom.value;
	socketchat.emit('leave', room);
    inputRoom.value = '';
    btnLeave.disabled = true;
}

inputArea.onkeypress = (event)=> {
    //event = event || window.event;
    if (event.keyCode == 13) { //回车发送消息
	var data = inputArea.value;
    if(data!='')
    {
	    data = userName.value + ':' + data;
	    socketchat.emit('message', room, data);
	    inputArea.value = '';
    }
	event.preventDefault();//阻止默认行为
    }
}

/*
if (!location.hash) {
 location.hash = Math.floor(Math.random() * 0xFFFFFF).toString(16);
}
const roomHash = location.hash.substring(1);
*/
//首次运行引导用户，信任域名
var first = window.localStorage.getItem('first');
if(first == null ){
    if (navigator.mediaDevices.getUserMedia || navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia) {
        //调用用户媒体设备, 访问摄像头
        getUserMedia({video: {width: 480, height: 320}}, success, error);
    } else {
        alert('不支持访问用户媒体');
    }
}
startenumerateDevices();//获取设备列表。一次即可
startgetUserMedia();//获取用户媒体
videoSource.onchange = startgetUserMedia;//option改变，刷新重新获取用户媒体
audioOutput.onchange = startgetUserMedia;
audioSource.onchange = startgetUserMedia;

function startenumerateDevices()
{
    if(!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices){
        console.log('enumerateDevices is not supported!');
        return;
    }else {
        navigator.mediaDevices.enumerateDevices()
            .then(gotDevices)
            .catch(handleError);
    }
}
function startgetUserMedia()
{
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
        console.log('getUserMedias is not supported!');
        return;
    }else {
        var deviceId = videoSource.value;
        var constraints =   {//json格式
                                video : {   width : 480,
                                            height: 320,
                                            frameRate:{min:15,max:30},
                                            deviceId : deviceId ? deviceId : undefined            
                                        },//设置分辨率，帧率等参数
                                audio : false,
                                        /*
                                        {   noiseSuppression:true,
                                            echoCancellation:true,
                                            deviceId : deviceId ? deviceId : undefined 
                                        },//设置延迟，音量大小等参数
                                        */
                            }
        navigator.mediaDevices.getUserMedia(constraints)
            .then(gotMediaStream)
            .catch(handleError);//异步
    }
}
//
function getOffer(desc){
    pc1.setLocalDescription(desc);
    //send desc to signal
    //receive desc from signal
    pc2.setRemoteDescription(desc);
    //远端应答
    pc2.createAnswer()
                .then(getAnswer)
                .catch(handleAnswerError);
}
btnStart.onclick = start;
btnCall.onclick = call;
btnHangUp.onclick = hangup;

//getAnswer
function getAnswer(desc){
    pc2.setLocalDescription(desc);
    //send desc to signal
    //receive desc from signal
    pc1.setRemoteDescription(desc);
}
//启动RTCPeerConnection
function call(){
    pc1=new RTCPeerConnection();
    pc2=new RTCPeerConnection();
    pc1.onicecandidate = (e)=>{
        pc2.addIceCandidate(e.candidate).catch(handleError);
    }
    pc2.onicecandidate = (e)=>{
        pc2.addIceCandidate(e.candidate);
    }
    pc2.ontrack = getRemoteStream;//数据通了的话，获取remote端视频流
    var offerOptions = {
        offerToRecieveAudio : 0,
        offerToRecieveVideo : 1,
    }
    localStream.getTracks().forEach((track)=>{
		pc1.addTrack(track, localStream);
	});
    //媒体协商
    pc1.createOffer(offerOptions)
                    .then(getOffer)
                    .catch(handleOfferError);
}
//关闭
function hangup(){
    pc1.close();
    pc2.close();
    pc1 = null;
    pc2 = null;
}
//获取对端流
function getRemoteStream(e){
    remotevideoplay.srcObject = e.streams[0];
}

function gotDevices(deviceInfos){
	deviceInfos.forEach( 
        function(deviceInfo)
        {
		    console.log(deviceInfo.kind + ": label = " 
				        + deviceInfo.label + ": id = "
				        + deviceInfo.deviceId + ": groupId = "
				        + deviceInfo.groupId);	
		    var option = document.createElement('option');
		    option.text = deviceInfo.label;
		    option.value = deviceInfo.deviceId;
		    if(deviceInfo.kind === 'audioinput'){
			    audioSource.appendChild(option);
		    }else if(deviceInfo.kind === 'audiooutput'){
			    audioOutput.appendChild(option);
		    }else if(deviceInfo.kind === 'videoinput'){
			    videoSource.appendChild(option);
		    }
	    });
}
function gotMediaStream(stream) {
    localvideoplay.srcObject = stream;
    var videoTrack = stream.getVideoTracks()[0];//取第一个视频轨
    var videoConstraints = videoTrack.getSettings();//取第一个视频轨的参数
    divConstraints.textContent = JSON.stringify(videoConstraints,null,2);//转成字符串
    localaudioplay.srcObject = stream;
    localStream = stream;
    //return navigator.mediaDevices.enumerateDevices();
}
function handleError(err){
	console.log(err.name + " : " + err.message);
}
function handleOfferError(err){
    console.log('Failed to create offer: ',err);
    console.log(err.name + " : " + err.message);
}
function handleAnswerError(err){
    console.log('Failed to create answer: ',err);
    console.log(err.name + " : " + err.message);
}
//访问用户媒体设备的兼容方法
function getUserMedia(constraints, success, error) {
    if (navigator.mediaDevices.getUserMedia) {
        //最新的标准API
        navigator.mediaDevices.getUserMedia(constraints).then(success).catch(error);
    } else if (navigator.webkitGetUserMedia) {
        //webkit核心浏览器
        navigator.webkitGetUserMedia(constraints, success, error)
    } else if (navigator.mozGetUserMedia) {
        //firfox浏览器
        navigator.mozGetUserMedia(constraints, success, error);
    } else if (navigator.getUserMedia) {
        //旧版API
        navigator.getUserMedia(constraints, success, error);
    }
}
function success(stream) {
    console.log(stream);
    window.localStorage.setItem('first',"false");
    window.location.reload();
}
function error(error) {
    console.log(`访问用户媒体设备失败${error.name}, ${error.message}`);
}
filterSelect.onchange = function(){
    localvideoplay.className = filterSelect.value;
}
snapshotlocal.onclick = function(){
    picturelocal.className = filterSelect.value;
    picturelocal.getContext('2d').drawImage(localvideoplay,0,0,picturelocal.width,picturelocal.height);
}
snapshotremote.onclick = function(){
    pictureremote.className = filterSelect.value;
    pictureremote.getContext('2d').drawImage(remotevideoplay,0,0,pictureremote.width,pictureremote.height);
}