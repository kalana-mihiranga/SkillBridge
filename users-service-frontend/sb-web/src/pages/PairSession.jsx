// src/pages/PairSession.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getSocket } from '../lib/socket';

const DEFAULT_ICE = [
  { urls: 'stun:stun.l.google.com:19302' } // add TURN in prod (see section C)
];

// Parse ICE servers from env if provided (JSON)
function loadIceServers() {
  try {
    const raw = import.meta.env.VITE_ICE_SERVERS; // e.g. [{"urls":"stun:..."},{"urls":"turns:...","username":"x","credential":"y"}]
    return raw ? JSON.parse(raw) : DEFAULT_ICE;
  } catch {
    return DEFAULT_ICE;
  }
}

export default function PairSession() {
  const [sp] = useSearchParams();
  const bookingId = sp.get('bookingId') || ''; // required
  const userId    = sp.get('userId') || localStorage.getItem('sb_user_id') || 'local-user';
  const role      = sp.get('role')   || localStorage.getItem('sb_user_role') || 'MENTEE';

  const [joined, setJoined] = useState(false);
  const [status, setStatus] = useState('idle');
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenTrackRef = useRef(null);

  const socket = getSocket();
  const iceServers = loadIceServers();

  // create RTCPeerConnection
  const ensurePC = useCallback(() => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({ iceServers });

    // send our ICE to room
    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        socket.emit('rtc:candidate', { bookingId, from: userId, candidate: ev.candidate });
      }
    };

    // remote stream
    pc.ontrack = (ev) => {
      const [stream] = ev.streams;
      if (remoteVideoRef.current && stream) {
        remoteVideoRef.current.srcObject = stream;
      }
    };

    // helpful states
    pc.onconnectionstatechange = () => {
      setStatus(pc.connectionState);
    };

    pcRef.current = pc;
    return pc;
  }, [bookingId, socket, userId, iceServers]);

  // Get mic+cam
  const getLocalMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  }, []);

  // Join signaling room
  const join = useCallback(async () => {
    if (!bookingId) {
      alert('Missing bookingId');
      return;
    }
    socket.emit('rtc:join', { bookingId, userId, role });
    setJoined(true);

    // Listen for remote signals
    socket.on('rtc:offer', async ({ from, sdp }) => {
      if (from === userId) return;
      const pc = ensurePC();
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      const stream = await getLocalMedia();
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('rtc:answer', { bookingId, from: userId, sdp: pc.localDescription });
    });

    socket.on('rtc:answer', async ({ from, sdp }) => {
      if (from === userId) return;
      const pc = ensurePC();
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    socket.on('rtc:candidate', async ({ from, candidate }) => {
      if (from === userId) return;
      try {
        await ensurePC().addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('ICE add failed', e);
      }
    });

    socket.on('rtc:peer-left', () => {
      // stop remote stream visual only
      if (remoteVideoRef.current?.srcObject) {
        remoteVideoRef.current.srcObject.getTracks().forEach(t => t.stop());
        remoteVideoRef.current.srcObject = null;
      }
      // keep pc; the other side can rejoin/renegotiate
    });
  }, [bookingId, ensurePC, getLocalMedia, role, socket, userId]);

  // Start a call (as the "offerer")
  const startCall = useCallback(async () => {
    const pc = ensurePC();
    const stream = await getLocalMedia();
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('rtc:offer', { bookingId, from: userId, sdp: pc.localDescription });
  }, [bookingId, ensurePC, getLocalMedia, socket, userId]);

  // Leave room & cleanup
  const leave = useCallback(() => {
    socket.emit('rtc:leave', { bookingId, userId });
    setJoined(false);

    // close peer
    if (pcRef.current) {
      pcRef.current.getSenders().forEach(s => {
        try { s.track?.stop(); } catch {}
      });
      pcRef.current.close();
      pcRef.current = null;
    }
    // stop local media
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    // stop screen track if any
    if (screenTrackRef.current) {
      try { screenTrackRef.current.stop(); } catch {}
      screenTrackRef.current = null;
    }
    // clear video elements
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, [bookingId, socket, userId]);

  // Mute/unmute mic
  const toggleMute = useCallback(() => {
    setMuted(v => {
      const next = !v;
      localStreamRef.current?.getAudioTracks().forEach(t => (t.enabled = !next));
      return next;
    });
  }, []);

  // Turn camera on/off
  const toggleCam = useCallback(() => {
    setCamOff(v => {
      const next = !v;
      localStreamRef.current?.getVideoTracks().forEach(t => (t.enabled = !next));
      return next;
    });
  }, []);

  // Share screen (replace video track on the fly)
  const shareScreen = useCallback(async () => {
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screen.getVideoTracks()[0];
      screenTrackRef.current = screenTrack;

      const pc = ensurePC();
      const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender) {
        await sender.replaceTrack(screenTrack);
      }

      // when user stops sharing, revert to camera
      screenTrack.onended = async () => {
        try {
          const camTrack = localStreamRef.current?.getVideoTracks()[0];
          if (camTrack && sender) await sender.replaceTrack(camTrack);
          screenTrackRef.current = null;
        } catch {}
      };
    } catch (e) {
      console.warn('screen share cancelled/failed', e);
    }
  }, [ensurePC]);

  useEffect(() => () => leave(), [leave]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={join}
          disabled={joined || !bookingId}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Join session
        </button>
        <button
          onClick={startCall}
          disabled={!joined}
          className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Start call
        </button>
        <button
          onClick={leave}
          disabled={!joined}
          className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Leave
        </button>

        <div className="ml-4 flex items-center gap-2">
          <button onClick={toggleMute} disabled={!joined} className="px-3 py-2 border rounded">
            {muted ? 'Unmute' : 'Mute'}
          </button>
          <button onClick={toggleCam} disabled={!joined} className="px-3 py-2 border rounded">
            {camOff ? 'Camera On' : 'Camera Off'}
          </button>
          <button onClick={shareScreen} disabled={!joined} className="px-3 py-2 border rounded">
            Share screen
          </button>
        </div>

        <div className="ml-auto text-sm text-slate-600">
          State: <span className="font-semibold">{status}</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <div className="text-sm mb-1">You</div>
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full rounded-lg bg-black" />
        </div>
        <div>
          <div className="text-sm mb-1">Peer</div>
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full rounded-lg bg-black" />
        </div>
      </div>

      <div className="text-xs text-slate-500">
        Booking: <span className="font-mono">{bookingId}</span> • You are <span className="font-semibold">{role}</span> (<span className="font-mono">{userId}</span>)
      </div>
    </div>
  );
}
