const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startBtn = document.getElementById('startBtn');
const callBtn = document.getElementById('callBtn');
const hangupBtn = document.getElementById('hangupBtn');
const acceptBtn = document.getElementById('acceptBtn');
const rejectBtn = document.getElementById('rejectBtn');
const incomingCallDiv = document.getElementById('incomingCall');
const nextBtn = document.getElementById('nextBtn');

// WebRTC Variables
let localStream;
let pc;
let currentOffer = null;
let peerId = null;
const socket = io();

// Twilio ICE servers configuration

// Set up signaling listeners IMMEDIATELY
socket.on('offer', handleIncomingOffer);
socket.on('answer', handleAnswer);
socket.on('candidate', handleCandidate);

// Listen for matchmaking
socket.on('match', async ({ peerSocketId, isInitiator }) => {
  peerId = peerSocketId;
  await setupConnection();

  if (isInitiator) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('offer', { offer, to: peerId });
  }
});

// 1. Start Camera
startBtn.onclick = async () => {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ 
      video: { width: 1280, height: 720 },
      audio: true 
    });
    localVideo.srcObject = localStream;
    callBtn.disabled = false;
    startBtn.disabled = true;
  } catch (err) {
    console.error("Camera error:", err);
    alert("Could not access camera/microphone. Please check permissions.");
  }
};

// 2. Start Call (random matchmaking)
callBtn.onclick = () => {
  socket.emit('findPeer');
  callBtn.disabled = true;
};

// 3. Handle incoming offer (Callee)
function handleIncomingOffer({ offer, from }) {
  currentOffer = offer;
  peerId = from;
  incomingCallDiv.classList.remove('hidden');
}

// 4. Accept incoming call (Callee)
acceptBtn.onclick = async () => {
  if (!currentOffer) return;

  incomingCallDiv.classList.add('hidden');

  if (!localStream) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 },
        audio: true 
      });
      localVideo.srcObject = localStream;
      startBtn.disabled = true;
    } catch (err) {
      console.error("Camera error:", err);
      alert("Could not start camera for the call");
      return;
    }
  }

  await setupConnection();

  try {
    await pc.setRemoteDescription(new RTCSessionDescription(currentOffer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('answer', { answer: pc.localDescription, to: peerId });
    enableCallControls();
  } catch (err) {
    console.error("Answer error:", err);
  }

  currentOffer = null;
};

// 5. Reject incoming call
rejectBtn.onclick = () => {
  currentOffer = null;
  incomingCallDiv.classList.add('hidden');
};

// 6. Handle answer (Caller)
function handleAnswer({ answer }) {
  if (pc) {
    pc.setRemoteDescription(new RTCSessionDescription(answer));
    enableCallControls();
  }
}

// 7. Handle ICE candidates
function handleCandidate({ candidate }) {
  if (pc) {
    pc.addIceCandidate(new RTCIceCandidate(candidate));
  }
}

// 8. End Call
hangupBtn.onclick = () => {
  hangupCall();
  socket.emit('findPeer');
};

// 9. Next Button
nextBtn.onclick = () => {
  hangupCall();
  socket.emit('findPeer');
};

// 🔄 Enable control buttons after connection established
function enableCallControls() {
  hangupBtn.disabled = false;
  nextBtn.disabled = false;
}

// 🔧 Setup WebRTC peer connection
async function setupConnection() {
  pc = new RTCPeerConnection({ iceServers });

  localStream.getTracks().forEach(track => {
    pc.addTrack(track, localStream);
  });

  pc.ontrack = event => {
    remoteVideo.srcObject = event.streams[0];
  };

  pc.onicecandidate = ({ candidate }) => {
    if (candidate && peerId) {
      socket.emit('candidate', { candidate, to: peerId });
    }
  };

  pc.onconnectionstatechange = () => {
    if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
      hangupCall();
      socket.emit('findPeer');
    }
  };
}

// 🔌 Clean up call and UI state
function hangupCall() {
  if (pc) {
    pc.close();
    pc = null;
  }

  if (remoteVideo.srcObject) {
    remoteVideo.srcObject.getTracks().forEach(track => track.stop());
    remoteVideo.srcObject = null;
  }

  peerId = null;
  currentOffer = null;

  hangupBtn.disabled = true;
  nextBtn.disabled = true;
  callBtn.disabled = false;
  incomingCallDiv.classList.add('hidden');
}

// Cleanup on page close
window.onbeforeunload = () => {
  socket.disconnect();
  if (pc) pc.close();
};
