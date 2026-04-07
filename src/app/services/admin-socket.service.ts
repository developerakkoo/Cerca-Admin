import { Injectable, NgZone } from '@angular/core'
import { Observable, BehaviorSubject } from 'rxjs'
import { environment } from 'src/environments/environment'
import { AdminAuthService } from './admin-auth.service'
import { Socket } from 'ngx-socket-io'

export interface ConnectionStatus {
  connected: boolean
  socketId?: string
  error?: string
}

@Injectable({
  providedIn: 'root'
})
export class AdminSocketService {
  private connectionStatus$ = new BehaviorSubject<ConnectionStatus>({
    connected: false
  })
  private isInitialized = false
  private currentAdminId: string | null = null
  private eventHandlers: {
    event: string
    handler: (...args: any[]) => void
  }[] = []

  constructor(
    private socket: Socket,
    private zone: NgZone,
    private authService: AdminAuthService
  ) {
    this.setupEventListeners()
  }

  /**
   * Setup socket event listeners
   */
  private setupEventListeners(): void {
    // Helper to add and track event listeners
    const addTrackedListener = (
      event: string,
      handler: (...args: any[]) => void
    ) => {
      this.socket.on(event, handler)
      this.eventHandlers.push({ event, handler })
    }

    // Connection events
    addTrackedListener('connect', () => {
      this.zone.run(() => {
        console.log('✅ Admin socket connected:', this.socket.ioSocket.id)
        this.connectionStatus$.next({
          connected: true,
          socketId: this.socket.ioSocket.id
        })
        // Always join admin room on every connect (required for emergency alerts and dashboard events)
        const adminId = this.currentAdminId || 'admin'
        this.connectToSupportRoom(adminId)
      })
    })

    addTrackedListener('disconnect', (reason: string) => {
      this.zone.run(() => {
        console.log('❌ Admin socket disconnected:', reason)
        this.connectionStatus$.next({
          connected: false,
          error: reason
        })
      })
    })

    addTrackedListener('connect_error', (error: any) => {
      this.zone.run(() => {
        console.error('Admin socket connection error:', error)
        this.connectionStatus$.next({
          connected: false,
          error: error.message || 'Connection error'
        })
      })
    })
  }

  /**
   * Initialize Socket.IO connection for admin
   */
  initialize(adminId?: string): void {
    if (this.isInitialized) {
      console.warn('Admin socket already initialized')
      return
    }

    try {
      const token = this.authService.getToken()
      if (!token) {
        console.error('No admin token found')
        return
      }

      // Extract adminId from token if not provided
      let extractedAdminId = adminId
      if (!extractedAdminId) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          extractedAdminId = payload.id || payload.adminId
        } catch (e) {
          console.warn('Could not extract adminId from token, using placeholder')
          extractedAdminId = 'admin'
        }
      }

      // Configure socket query params and auth
      this.socket.ioSocket.io.opts.query = {
        adminId: extractedAdminId
      }

      // Set auth token in query params (backend may use this for authentication)
      // If backend uses headers, we can add: this.socket.ioSocket.io.opts.extraHeaders
      if (this.socket.ioSocket.io.opts.query) {
        (this.socket.ioSocket.io.opts.query as any).token = token
      }

      console.log('🔧 Socket query params:', this.socket.ioSocket.io.opts.query)
      console.log('🌐 Target URL:', environment.apiBaseUrl)

      // Store adminId for use in connect handler
      this.currentAdminId = extractedAdminId || 'admin'

      // Connect
      console.log('📞 Calling socket.connect()...')
      this.socket.connect()
      this.isInitialized = true

      console.log('✅ Socket initialization started successfully')
    } catch (error) {
      console.error('Error initializing admin socket:', error)
      this.connectionStatus$.next({
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Connect to admin support room
   */
  private connectToSupportRoom(adminId: string): void {
    if (!this.isConnected()) return

    this.socket.emit('adminSupportConnect', { adminId })
    console.log('📢 Admin connected to support room')
  }

  /**
   * Disconnect socket
   */
  disconnect(): void {
    if (this.isConnected()) {
      this.socket.disconnect()
      this.isInitialized = false
      this.connectionStatus$.next({ connected: false })
    }
  }

  /**
   * Emit event
   */
  emit(event: string, data?: any): void {
    if (!this.isConnected()) {
      console.warn('Socket not connected, cannot emit:', event)
      return
    }

    this.socket.emit(event, data)
  }

  /**
   * Emit typing status for support chat
   */
  emitTyping(issueId: string, isTyping: boolean): void {
    this.emit('support:typing', { issueId, isTyping })
  }

  /**
   * Listen for typing indicator events
   */
  onTyping(): Observable<{ issueId: string; senderType: 'USER' | 'ADMIN'; isTyping: boolean }> {
    return this.on<{ issueId: string; senderType: 'USER' | 'ADMIN'; isTyping: boolean }>('support:typing')
  }

  /**
   * Listen for status changed events
   */
  onStatusChanged(): Observable<{ issueId: string; status: string }> {
    return this.on<{ issueId: string; status: string }>('support:status_changed')
  }

  /**
   * Listen for emergency alert events
   */
  onEmergencyAlert(): Observable<any> {
    return this.on<any>('emergencyAlert')
  }

  /**
   * Listen for emergency live location updates
   */
  onEmergencyLocationUpdate(): Observable<{ emergencyId: string; latitude: number; longitude: number; timestamp?: string }> {
    return this.on<any>('emergencyLocationUpdate')
  }

  /**
   * Join a ride room to receive live updates (driver location, status). Backend must handle adminJoinRideRoom.
   */
  adminJoinRideRoom(rideId: string): void {
    this.emit('adminJoinRideRoom', { rideId })
  }

  /**
   * Leave a ride room. Call on detail page destroy to avoid leaking room membership.
   */
  adminLeaveRideRoom(rideId: string): void {
    this.emit('adminLeaveRideRoom', { rideId })
  }

  /**
   * Listen for event (e.g. rideStatusUpdated, driverLocationUpdate, rideLocationUpdate, rideCompleted, rideCancelled).
   */
  on<T = any>(event: string): Observable<T> {
    return new Observable(observer => {
      const handler = (data: T) => {
        this.zone.run(() => {
          observer.next(data)
        })
      }

      this.socket.on(event, handler)

      return () => {
        this.socket.off(event, handler)
      }
    })
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket.ioSocket?.connected || false
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): Observable<ConnectionStatus> {
    return this.connectionStatus$.asObservable()
  }
}

