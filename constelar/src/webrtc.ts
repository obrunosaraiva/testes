import { onRtc, sendRtc } from './net'
import type { RtcMsg } from './net'

export type CallState = 'idle' | 'connecting' | 'connected' | 'ended'

interface Handlers {
  onRemoteStream?: (stream: MediaStream | null) => void
  onState?: (state: CallState) => void
}

const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]

/**
 * Sessão de áudio/vídeo 1:1 (terapeuta ↔ cliente) usando WebRTC com o padrão
 * "perfect negotiation" — o host é impolido (impolite) e o cliente é polido (polite),
 * o que resolve colisões de oferta (glare) sem travar.
 */
export class RtcSession {
  private pc: RTCPeerConnection
  private polite: boolean
  private makingOffer = false
  private ignoreOffer = false
  private localStream: MediaStream | null = null
  private handlers: Handlers

  constructor(role: 'host' | 'guest', handlers: Handlers = {}) {
    this.polite = role === 'guest'
    this.handlers = handlers
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) sendRtc({ t: 'rtc:ice', candidate: candidate.toJSON() })
    }

    this.pc.ontrack = ({ streams }) => {
      this.handlers.onRemoteStream?.(streams[0] ?? null)
    }

    this.pc.onnegotiationneeded = async () => {
      try {
        this.makingOffer = true
        await this.pc.setLocalDescription()
        sendRtc({ t: 'rtc:desc', desc: this.pc.localDescription?.toJSON() })
      } catch (err) {
        console.error('[rtc] negotiation error', err)
      } finally {
        this.makingOffer = false
      }
    }

    this.pc.onconnectionstatechange = () => {
      const s = this.pc.connectionState
      if (s === 'connected') this.handlers.onState?.('connected')
      else if (s === 'connecting' || s === 'new') this.handlers.onState?.('connecting')
      else if (s === 'failed' || s === 'disconnected' || s === 'closed') this.handlers.onState?.('ended')
    }

    onRtc((msg) => this.handleSignal(msg))
  }

  /** Liga microfone (e câmera opcional) e adiciona as trilhas à conexão. */
  async start(withVideo: boolean): Promise<MediaStream> {
    this.handlers.onState?.('connecting')
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo })
    this.localStream = stream
    for (const track of stream.getTracks()) this.pc.addTrack(track, stream)
    return stream
  }

  private async handleSignal(msg: RtcMsg) {
    try {
      if (msg.t === 'rtc:desc') {
        const description = msg.desc as RTCSessionDescriptionInit
        const offerCollision = description.type === 'offer' && (this.makingOffer || this.pc.signalingState !== 'stable')
        this.ignoreOffer = !this.polite && offerCollision
        if (this.ignoreOffer) return

        await this.pc.setRemoteDescription(description)
        if (description.type === 'offer') {
          await this.pc.setLocalDescription()
          sendRtc({ t: 'rtc:desc', desc: this.pc.localDescription?.toJSON() })
        }
      } else if (msg.t === 'rtc:ice') {
        try {
          await this.pc.addIceCandidate(msg.candidate as RTCIceCandidateInit)
        } catch (err) {
          if (!this.ignoreOffer) throw err
        }
      }
    } catch (err) {
      console.error('[rtc] signal error', err)
    }
  }

  toggleMic(on: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = on))
  }

  toggleCam(on: boolean) {
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = on))
  }

  getLocalStream() {
    return this.localStream
  }

  debugState() {
    return {
      connection: this.pc.connectionState,
      ice: this.pc.iceConnectionState,
      signaling: this.pc.signalingState,
    }
  }

  hangup() {
    onRtc(null)
    this.localStream?.getTracks().forEach((t) => t.stop())
    this.pc.getSenders().forEach((s) => s.track?.stop())
    this.pc.close()
    this.handlers.onState?.('ended')
  }
}
