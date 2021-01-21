// ......................................................
// ..................RTCMultiConnection Code.............
// ......................................................

var connection = new RTCMultiConnection();
var designer = null;

// by default, socket.io server is assumed to be deployed on your own URL
connection.socketURL = "/";

// comment-out below line if you do not have your own socket.io server
// connection.socketURL = 'https://rtcmulticonnection.herokuapp.com:443/';

connection.socketMessageEvent = "call-by-username-demo";

// do not shift room control to other users
connection.autoCloseEntireSession = true;

connection.session = {
  audio: true,
  video: true,
  data: true,
  // broadcast: true // if you remove this, then it becomes MANY-to-MANY
};

connection.sdpConstraints.mandatory = {
  OfferToReceiveAudio: true,
  OfferToReceiveVideo: true,
};

// https://www.rtcmulticonnection.org/docs/iceServers/
// use your own TURN-server here!
connection.iceServers = [
  {
    urls: [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302",
      "stun:stun2.l.google.com:19302",
      "stun:stun.l.google.com:19302?transport=udp",
    ],
  },
];

var onShareVideo = function (id, width) {
  designer = new CanvasDesigner();

  // you can place widget.html anywhere
  designer.widgetHtmlURL = "/demos/widget.html";
  designer.widgetJsURL = "/demos/widget.js";

  designer.addSyncListener(function (data) {
    // console.log("++++++++++", data["points"][0][0], data["points"][0][1]);
    // for (var i = 0; i < 4; i++) {
    //   data["points"][0][1][i] = parseInt(data["points"][0][1][i] * 0.3);
    // }

    console.log("++++++++++", data["points"][0][0], data["points"][0][1]);
    connection.send(data);
    console.log("++++++++++", data["points"][0][0], data["points"][0][1]);
  });

  designer.setSelected("pencil");

  designer.setTools({
    dragSingle: true,
    pencil: true,
    text: true,
    image: false,
    pdf: false,
    eraser: true,
    line: false,
    arrow: false,    
    dragMultiple: false,
    arc: true,
    rectangle: true,
    quadratic: false,
    bezier: false,
    marker: false,
    zoom: false,
    lineWidth: false,
    colorsPicker: false,
    extraOptions: false,
    code: false,
    undo: true,
  });

  designer.appendTo(document.getElementById(id), function () {
    var tempStreamCanvas = document.getElementById("temp-stream-canvas");
    var tempStream = tempStreamCanvas.captureStream();
    tempStream.isScreen = true;
    tempStream.streamid = tempStream.id;
    tempStream.width = width;
    tempStream.type = "local";
    connection.attachStreams.push(tempStream);
    window.tempStream = tempStream;

    connection.extra.roomOwner = true;
  });
  
  setTimeout(function () {
    connection.send('plz-sync-points');
}, 1000);
}

connection.videosContainer = document.getElementById("videos-container");
connection.onstream = function (event) {
  var existing = document.getElementById(event.streamid);
  if (existing && existing.parentNode) {
    existing.parentNode.removeChild(existing);
  }

  event.mediaElement.removeAttribute("src");
  event.mediaElement.removeAttribute("srcObject");
  event.mediaElement.muted = true;
  event.mediaElement.volume = 0;
  var video = document.createElement("video");

  try {
    video.setAttributeNode(document.createAttribute("autoplay"));
    video.setAttributeNode(document.createAttribute("playsinline"));
  } catch (e) {
    video.setAttribute("autoplay", true);
    video.setAttribute("playsinline", true);
  }

  // var width = parseInt(connection.videosContainer.clientWidth) - 20;
  var width = connection.videosContainer.clientWidth;

  if (event.type === "local") {
    // width = parseInt(connection.videosContainer.clientWidth / 4);
    video.volume = 0;
    try {
      video.setAttributeNode(document.createAttribute("muted"));
    } catch (e) {
      video.setAttribute("muted", true);
    }

    connection.dontCaptureUserMedia = true;
  }
  video.srcObject = event.stream;

  var mediaElement = getHTMLMediaElement(video, {
    title: event.type,
    buttons: ["share-video", "full-screen"],
    width: width,
    showOnMouseEnter: true,
    id: event.userid,
    onShareVideo: onShareVideo
  });

  connection.videosContainer.appendChild(mediaElement);

  setTimeout(function () {
    mediaElement.media.play();
  }, 5000);

  mediaElement.id = event.streamid;
};

connection.onstreamended = function (event) {
  var mediaElement = document.getElementById(event.streamid);
  if (mediaElement) {
    mediaElement.parentNode.removeChild(mediaElement);
  }
};

connection.onMediaError = function (e) {
  if (e.message === "Concurrent mic process limit.") {
    if (DetectRTC.audioInputDevices.length <= 1) {
      alert(
        "Please select external microphone. Check github issue number 483."
      );
      return;
    }

    var secondaryMic = DetectRTC.audioInputDevices[1].deviceId;
    connection.mediaConstraints.audio = {
      deviceId: secondaryMic,
    };

    connection.join(
      connection.sessionid,
      function (isRoomJoined, roomid, error) {
        if (error) {
          alert(error);
        }
      }
    );
  }
};

connection.onmessage = function (event) {
  if (event.data === "plz-sync-points") {
    designer.sync();
    return;
  }

  designer.syncData(event.data);
}

// ..................................
// ALL below scripts are redundant!!!
// ..................................

var joinCalleeUsingHisUsername = document.getElementById(
  "join-callee-using-his-username"
);
joinCalleeUsingHisUsername.onclick = function () {
  this.disabled = true;
  connection.checkPresence(calleeUserName.value, function (isOnline, username) {
    if (!isOnline) {
      joinCalleeUsingHisUsername.disabled = false;
      alert(username + " is not online.");
      return;
    }

    // console.log("+++++++++", username, roomid);
    connection.join(username, function (isRoomJoined, roomid, error) {
      if (error) {
        alert(error);
      }
    });
  });
  console.log("sssssssss", connection);
  setTimeout(function () {
    joinCalleeUsingHisUsername.disabled = false;
  }, 1000);
};

// caller
var currentUserName = document.getElementById("current-username");
currentUserName.onkeyup = currentUserName.onpaste = currentUserName.oninput = function () {
  localStorage.setItem(this.id, this.value);
};
currentUserName.value =
  localStorage.getItem(currentUserName.id) || connection.token();
console.log("=======", currentUserName.value);
document.getElementById("change-your-own-username").onclick = function () {
  this.disabled = true;
  connection.open(
    currentUserName.value,
    function (isRoomOpened, roomid, error) {
      if (error) {
        alert(error);
      }

      joinCalleeUsingHisUsername.disabled = false;
    }
  );
};

// callee
var calleeUserName = document.getElementById("callee-username");
calleeUserName.onkeyup = calleeUserName.onpaste = calleeUserName.oninput = function () {
  localStorage.setItem(this.id, this.value);
};
calleeUserName.value =
  localStorage.getItem(calleeUserName.id) || connection.token();
console.log("=======", calleeUserName.value);
// detect 2G
if (
  navigator.connection &&
  navigator.connection.type === "cellular" &&
  navigator.connection.downlinkMax <= 0.115
) {
  alert("2G is not supported. Please use a better internet service.");
}
