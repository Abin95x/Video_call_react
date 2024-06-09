
import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import { io } from 'socket.io-client';

const socket = io("https://video-call-server-1zwl.onrender.com");
// const socket = io("http://localhost:3000");


function App() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);

  useEffect(() => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }, 
        {
          url: 'turn:192.158.29.39:3478?transport=udp',  
          credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
          username: '28224511:1379330808'
        },
        {
          url: 'turn:192.158.29.39:3478?transport=tcp',
          credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
          username: '28224511:1379330808'
        }
      ]
    });

    setPeerConnection(pc);

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        setLocalStream(stream);
        localVideoRef.current.srcObject = stream;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
      });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('candidate', event.candidate);
      }
    };

    pc.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    socket.on('offer', async (data) => {
      if (!pc.currentRemoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', answer);
      }
    });

    socket.on('answer', async (data) => {
      if (!pc.currentRemoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(data));
      }
    });

    socket.on('candidate', async (data) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data));
      } catch (e) {
        console.error('Error adding received ice candidate', e);
      }
    });

    return () => {
      socket.off('offer');
      socket.off('answer');
      socket.off('candidate');
    };
  }, []);

  const createOffer = async () => {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', offer);
  };

  return (
    <div className="App">
      <h1>Video Call App</h1>
      <div>
        <video ref={localVideoRef} autoPlay playsInline muted></video>
        <video ref={remoteVideoRef} autoPlay playsInline></video>
      </div>
      <button onClick={createOffer}>Start Call</button>
    </div>
  );
}

export default App;

