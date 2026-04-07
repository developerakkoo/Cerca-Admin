import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { AlertController, LoadingController, ToastController } from '@ionic/angular'
import { AdminSupportService, SupportIssue, SupportMessage } from '../../../../services/admin-support.service'
import { AdminSocketService } from '../../../../services/admin-socket.service'
import { Subscription, Subject } from 'rxjs'
import { debounceTime, distinctUntilChanged } from 'rxjs/operators'

@Component({
  selector: 'app-support-chat',
  templateUrl: './support-chat.page.html',
  styleUrls: ['./support-chat.page.scss'],
  standalone: false,
})
export class SupportChatPage implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messageContainer', { static: false }) private messageContainer!: ElementRef

  issueId: string = ''
  issue: SupportIssue | null = null
  messages: SupportMessage[] = []
  newMessage: string = ''
  isLoading = false
  isSending = false
  isUserTyping = false
  private subscriptions: Subscription[] = []
  private shouldScroll = false
  private typingSubject = new Subject<boolean>()
  private typingTimeout: any = null
  private lastMessageId: string | null = null
  private previousMessageCount: number = 0
  private scrollTimeout: any = null

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supportService: AdminSupportService,
    private socketService: AdminSocketService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.issueId = this.route.snapshot.paramMap.get('issueId') || ''
    this.setupTypingDebounce()
    if (this.issueId) {
      this.loadIssue()
      this.loadMessages()
      this.setupSocketListeners()
    }
  }

  ngAfterViewChecked() {
    // Check if message count changed (new message arrived)
    if (this.messages.length !== this.previousMessageCount) {
      this.previousMessageCount = this.messages.length
      // Always scroll when new message arrives
      this.scrollToBottom(true)
    } else if (this.shouldScroll) {
      // Scroll for other reasons (typing indicator, etc.)
      this.scrollToBottom(true)
      this.shouldScroll = false
    }
  }

  ngOnDestroy() {
    // Clear typing status when leaving
    if (this.issueId) {
      this.socketService.emitTyping(this.issueId, false)
    }
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout)
    }
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout)
    }
    this.subscriptions.forEach(sub => sub.unsubscribe())
  }

  private setupTypingDebounce() {
    // Debounce typing events to avoid flooding the server
    const typingSub = this.typingSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(isTyping => {
      this.socketService.emitTyping(this.issueId, isTyping)
    })
    this.subscriptions.push(typingSub)
  }

  async loadIssue() {
    this.isLoading = true
    try {
      const sub = this.supportService.getIssueById(this.issueId).subscribe({
        next: (issue) => {
          this.issue = issue
          this.isLoading = false
          
          // If issue is waiting, accept it
          if (issue.status === 'WAITING_FOR_ADMIN') {
            this.acceptIssue()
          }
        },
        error: async (error) => {
          console.error('Error loading issue:', error)
          this.isLoading = false
          const toast = await this.toastController.create({
            message: 'Failed to load support issue',
            duration: 2000,
            color: 'danger'
          })
          await toast.present()
        }
      })
      this.subscriptions.push(sub)
    } catch (error) {
      this.isLoading = false
    }
  }

  async loadMessages() {
    try {
      const sub = this.supportService.getIssueMessages(this.issueId).subscribe({
        next: (messages) => {
          this.messages = messages
          if (messages.length > 0) {
            this.lastMessageId = messages[messages.length - 1]._id
          }
          this.previousMessageCount = messages.length
          // AfterViewChecked will handle scrolling
        },
        error: (error) => {
          console.error('Error loading messages:', error)
        }
      })
      this.subscriptions.push(sub)
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  setupSocketListeners() {
    // Listen for new messages
    const messageSub = this.socketService.on<SupportMessage>('support:message').subscribe((message: SupportMessage) => {
      const issueMatch = message.issueId === this.issueId || message.issueId?.toString() === this.issueId
      if (!issueMatch) return

      const msgId = message._id?.toString() ?? ''
      const msgTime = new Date(message.createdAt).getTime()
      const TEMP_TIME_MS = 10000

      // Admin-sent: replace optimistic temp message with server payload to avoid duplicates
      if (message.senderType === 'ADMIN') {
        const tempIndex = this.messages.findIndex(
          m => (m._id?.toString().startsWith('temp_') ?? false) &&
            m.message === message.message &&
            Math.abs(new Date(m.createdAt).getTime() - msgTime) < TEMP_TIME_MS
        )
        if (tempIndex !== -1) {
          this.messages[tempIndex] = message
          this.lastMessageId = message._id
          this.cdr.detectChanges()
          return
        }
        // No temp found (e.g. late or reconnected): add only if not already present
        const alreadyHas = this.messages.some(m => m._id === message._id || m._id?.toString() === msgId)
        if (!alreadyHas) {
          this.messages.push(message)
          this.lastMessageId = message._id
          this.cdr.detectChanges()
        }
        return
      }

      // User or system message: add if not duplicate
      const messageExists = this.messages.some(m => m._id === message._id || msgId && m._id?.toString() === msgId)
      if (!messageExists) {
        this.messages.push(message)
        this.lastMessageId = message._id
        if (message.senderType === 'USER') {
          this.isUserTyping = false
        }
        this.cdr.detectChanges()
      }
    })
    this.subscriptions.push(messageSub)

    // Listen for typing indicators
    const typingSub = this.socketService.onTyping().subscribe((data: any) => {
      if (data.issueId === this.issueId && data.senderType === 'USER') {
        this.isUserTyping = data.isTyping
        this.cdr.detectChanges()
        
        // Scroll to bottom when typing indicator appears/disappears
        setTimeout(() => {
          this.scrollToBottom(true)
        }, 100)
        
        // Auto-hide typing indicator after 5 seconds (in case stop typing event is missed)
        if (data.isTyping) {
          if (this.typingTimeout) {
            clearTimeout(this.typingTimeout)
          }
          this.typingTimeout = setTimeout(() => {
            this.isUserTyping = false
            this.cdr.detectChanges()
            // Scroll when typing indicator disappears
            setTimeout(() => {
              this.scrollToBottom(true)
            }, 100)
          }, 5000)
        }
      }
    })
    this.subscriptions.push(typingSub)

    // Listen for support ended
    const endedSub = this.socketService.on('support:ended').subscribe((data: any) => {
      if (data.issueId === this.issueId || data.issueId?.toString() === this.issueId) {
        this.isUserTyping = false
        this.loadIssue() // Reload to get updated status
      }
    })
    this.subscriptions.push(endedSub)

    // Listen for admin assigned
    const acceptSub = this.socketService.on('support:accept').subscribe((data: any) => {
      if (data.issueId === this.issueId || data.issueId?.toString() === this.issueId) {
        this.loadIssue() // Reload to get updated status
      }
    })
    this.subscriptions.push(acceptSub)

    // Listen for status changes
    const statusSub = this.socketService.onStatusChanged().subscribe((data: any) => {
      if (data.issueId === this.issueId || data.issueId?.toString() === this.issueId) {
        // Reload issue to get updated status
        this.loadIssue()
      }
    })
    this.subscriptions.push(statusSub)
  }

  // Handle input changes for typing indicator
  onMessageInput() {
    if (this.newMessage.trim()) {
      this.typingSubject.next(true)
    } else {
      this.typingSubject.next(false)
    }
  }

  async acceptIssue() {
    const loading = await this.loadingController.create({
      message: 'Accepting support request...'
    })
    await loading.present()

    try {
      // Accept via socket
      this.socketService.emit('support:accept', { issueId: this.issueId })
      await loading.dismiss()
      this.loadIssue() // Reload issue to get updated status
    } catch (error) {
      await loading.dismiss()
      const toast = await this.toastController.create({
        message: 'Failed to accept support request',
        duration: 2000,
        color: 'danger'
      })
      await toast.present()
    }
  }

  async resolveIssue() {
    const alert = await this.alertController.create({
      header: 'Resolve Support Issue',
      message: 'Are you sure you want to mark this issue as resolved?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Resolve',
          handler: () => {
            this.resolveIssueRequest()
          }
        }
      ]
    })
    await alert.present()
  }

  async resolveIssueRequest() {
    const loading = await this.loadingController.create({
      message: 'Resolving issue...'
    })
    await loading.present()

    try {
      const sub = this.supportService.resolveIssue(this.issueId).subscribe({
        next: async (response) => {
          await loading.dismiss()
          await this.loadIssue() // Reload to get updated status
          const toast = await this.toastController.create({
            message: 'Issue resolved successfully',
            duration: 2000,
            color: 'success'
          })
          await toast.present()
        },
        error: async (error) => {
          await loading.dismiss()
          console.error('Error resolving issue:', error)
          const toast = await this.toastController.create({
            message: 'Failed to resolve issue',
            duration: 2000,
            color: 'danger'
          })
          await toast.present()
        }
      })
      this.subscriptions.push(sub)
    } catch (error) {
      await loading.dismiss()
    }
  }

  async sendMessage() {
    if (!this.newMessage.trim() || this.isSending) return

    const messageText = this.newMessage.trim()
    this.newMessage = ''
    this.isSending = true

    // Stop typing indicator
    this.typingSubject.next(false)

    try {
      // Send via socket
      this.socketService.emit('support:message', { issueId: this.issueId, message: messageText })

      // Optimistically add message
      const tempMessage: SupportMessage = {
        _id: 'temp_' + Date.now(),
        issueId: this.issueId,
        senderType: 'ADMIN',
        senderId: 'admin',
        message: messageText,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      this.messages.push(tempMessage)
      this.lastMessageId = tempMessage._id
      this.cdr.detectChanges()
      // AfterViewChecked will handle scrolling when message count changes

      this.isSending = false
    } catch (error) {
      console.error('Error sending message:', error)
      this.isSending = false
      this.newMessage = messageText // Restore message on error
      const toast = await this.toastController.create({
        message: 'Failed to send message',
        duration: 2000,
        color: 'danger'
      })
      await toast.present()
    }
  }

  // Professional scroll to bottom implementation
  scrollToBottom(force: boolean = false): void {
    // Clear any pending scroll timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout)
      this.scrollTimeout = null
    }

    try {
      if (!this.messageContainer?.nativeElement) {
        // Retry after a short delay if container not ready
        this.scrollTimeout = setTimeout(() => this.scrollToBottom(force), 100)
        return
      }
      
      const container = this.messageContainer.nativeElement
      
      // If force is true, always scroll regardless of position
      // If force is false, only scroll if user is near bottom
      if (!force) {
        const scrollHeight = container.scrollHeight
        const clientHeight = container.clientHeight
        const scrollTop = container.scrollTop
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
        
        if (!isNearBottom) {
          return // User scrolled up, don't auto-scroll
        }
      }

      // Use requestAnimationFrame for better timing
      requestAnimationFrame(() => {
        try {
          // Strategy 1: Direct scrollTop assignment (immediate)
          container.scrollTop = container.scrollHeight
          
          // Strategy 2: Retry after DOM updates (50ms)
          this.scrollTimeout = setTimeout(() => {
            if (container && this.messageContainer?.nativeElement) {
              container.scrollTop = container.scrollHeight
              
              // Strategy 3: Second retry (100ms)
              this.scrollTimeout = setTimeout(() => {
                if (container && this.messageContainer?.nativeElement) {
                  container.scrollTop = container.scrollHeight
                  
                  // Strategy 4: Verify scroll happened and retry if needed (200ms)
                  this.scrollTimeout = setTimeout(() => {
                    if (container && this.messageContainer?.nativeElement) {
                      const currentScrollTop = container.scrollTop
                      const maxScroll = container.scrollHeight - container.clientHeight
                      const distanceFromBottom = maxScroll - currentScrollTop
                      
                      // If not at bottom (within 10px), retry
                      if (distanceFromBottom > 10) {
                        container.scrollTop = container.scrollHeight
                      }
                    }
                  }, 200)
                }
              }, 100)
            }
          }, 50)
          
          // Strategy 5: Fallback using scrollIntoView (300ms)
          this.scrollTimeout = setTimeout(() => {
            if (container && this.messageContainer?.nativeElement) {
              const messages = container.querySelectorAll('.message-wrapper')
              if (messages.length > 0) {
                const lastMessage = messages[messages.length - 1] as HTMLElement
                const typingIndicator = container.querySelector('.typing-indicator')
                const targetElement = typingIndicator || lastMessage
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'end' })
              } else {
                // No messages, scroll container itself
                container.scrollTop = container.scrollHeight
              }
            }
          }, 300)
        } catch (err) {
          console.error('Error in scroll animation:', err)
        }
      })
    } catch (err) {
      console.error('Error scrolling to bottom:', err)
    }
  }

  isUserMessage(message: SupportMessage): boolean {
    return message.senderType === 'USER'
  }

  isSystemMessage(message: SupportMessage): boolean {
    return message.senderType === 'SYSTEM'
  }

  canSendMessage(): boolean {
    return this.issue?.status === 'CHAT_ACTIVE' || false
  }

  canResolve(): boolean {
    return this.issue?.status === 'CHAT_ACTIVE' || false
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'WAITING_FOR_ADMIN':
        return 'warning'
      case 'CHAT_ACTIVE':
        return 'primary'
      case 'FEEDBACK_PENDING':
        return 'tertiary'
      case 'RESOLVED':
        return 'success'
      case 'ESCALATED':
        return 'danger'
      default:
        return 'medium'
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'WAITING_FOR_ADMIN':
        return 'Waiting for Admin'
      case 'ADMIN_ASSIGNED':
        return 'Admin Assigned'
      case 'CHAT_ACTIVE':
        return 'Active Chat'
      case 'FEEDBACK_PENDING':
        return 'Feedback Pending'
      case 'RESOLVED':
        return 'Resolved'
      case 'ESCALATED':
        return 'Escalated'
      default:
        return status
    }
  }

  getUserDisplayName(): string {
    if (!this.issue?.userId) return 'Unknown User'
    if (typeof this.issue.userId === 'string') return 'Unknown User'
    return this.issue.userId.fullName || this.issue.userId.email || 'Unknown User'
  }

  getUserEmail(): string {
    if (!this.issue?.userId) return ''
    if (typeof this.issue.userId === 'string') return ''
    return this.issue.userId.email || ''
  }

  async doRefresh(event: any) {
    await this.loadIssue()
    await this.loadMessages()
    event.target.complete()
  }
}
