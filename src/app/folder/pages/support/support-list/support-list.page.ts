import { Component, OnInit, OnDestroy } from '@angular/core'
import { Router } from '@angular/router'
import { AlertController, LoadingController, ToastController } from '@ionic/angular'
import { AdminSupportService, SupportIssue } from '../../../../services/admin-support.service'
import { AdminSocketService } from '../../../../services/admin-socket.service'
import { Subscription } from 'rxjs'

@Component({
  selector: 'app-support-list',
  templateUrl: './support-list.page.html',
  styleUrls: ['./support-list.page.scss'],
  standalone: false,
})
export class SupportListPage implements OnInit, OnDestroy {
  waitingIssues: SupportIssue[] = []
  activeIssues: SupportIssue[] = []
  resolvedIssues: SupportIssue[] = []
  selectedTab: 'waiting' | 'active' | 'resolved' = 'waiting'
  isLoading = false
  unreadCounts: Map<string, number> = new Map()
  private subscriptions: Subscription[] = []

  constructor(
    private supportService: AdminSupportService,
    private socketService: AdminSocketService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    // Initialize socket if not already initialized
    if (!this.socketService.isConnected()) {
      this.socketService.initialize()
    }
    this.loadIssues()
    this.setupSocketListeners()
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe())
  }

  async loadIssues() {
    this.isLoading = true
    try {
      // Load all tabs in parallel
      const waitingSub = this.supportService.getWaitingIssues().subscribe({
        next: (issues) => {
          this.waitingIssues = issues
        },
        error: (error) => {
          console.error('Error loading waiting issues:', error)
        }
      })
      this.subscriptions.push(waitingSub)

      const activeSub = this.supportService.getActiveChats().subscribe({
        next: (issues) => {
          this.activeIssues = issues
        },
        error: (error) => {
          console.error('Error loading active issues:', error)
        }
      })
      this.subscriptions.push(activeSub)

      const resolvedSub = this.supportService.getResolvedIssues().subscribe({
        next: (issues) => {
          this.resolvedIssues = issues
          this.isLoading = false
        },
        error: (error) => {
          console.error('Error loading resolved issues:', error)
          this.isLoading = false
        }
      })
      this.subscriptions.push(resolvedSub)
    } catch (error) {
      this.isLoading = false
    }
  }

  setupSocketListeners() {
    // Listen for new support requests
    const newIssueSub = this.socketService.on('support:new_issue').subscribe((data: any) => {
      this.loadIssues() // Reload to get new issue
    })
    this.subscriptions.push(newIssueSub)

    // Listen for unread count updates
    const unreadSub = this.socketService.on<{ issueId: string; unreadCount: number }>('support:unread_count').subscribe((data) => {
      this.unreadCounts.set(data.issueId, data.unreadCount)
    })
    this.subscriptions.push(unreadSub)

    // Listen for status changes
    const statusSub = this.socketService.onStatusChanged().subscribe((data: any) => {
      // Reload issues when status changes
      this.loadIssues()
    })
    this.subscriptions.push(statusSub)

    // Listen for support accept
    const acceptSub = this.socketService.on('support:accept').subscribe((data: any) => {
      this.loadIssues() // Reload to update status
    })
    this.subscriptions.push(acceptSub)

    // Listen for support ended
    const endedSub = this.socketService.on('support:ended').subscribe((data: any) => {
      this.loadIssues() // Reload to update status
    })
    this.subscriptions.push(endedSub)
  }

  onTabChange(event: any) {
    this.selectedTab = event.detail.value
  }

  openIssue(issue: SupportIssue) {
    // Clear unread count when opening issue
    this.unreadCounts.delete(issue._id)
    this.router.navigate(['/folder/support', issue._id])
  }

  getUnreadCount(issueId: string): number {
    return this.unreadCounts.get(issueId) || 0
  }

  async acceptIssue(issue: SupportIssue) {
    const alert = await this.alertController.create({
      header: 'Accept Support Request',
      message: `Accept support request from user?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Accept',
          handler: () => {
            this.acceptIssueRequest(issue._id)
          }
        }
      ]
    })
    await alert.present()
  }

  async acceptIssueRequest(issueId: string) {
    const loading = await this.loadingController.create({
      message: 'Accepting support request...'
    })
    await loading.present()

    try {
      // Accept via socket
      this.socketService.emit('support:accept', { issueId })
      
      // Navigate to chat
      await loading.dismiss()
      this.router.navigate(['/folder/support', issueId])
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
        return 'Waiting'
      case 'ADMIN_ASSIGNED':
        return 'Assigned'
      case 'CHAT_ACTIVE':
        return 'Active'
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

  getIssueTypeIcon(issueType: string): string {
    switch (issueType) {
      case 'RIDE':
        return 'car-outline'
      case 'PAYMENT':
        return 'card-outline'
      case 'ACCOUNT':
        return 'person-outline'
      default:
        return 'help-circle-outline'
    }
  }

  getCurrentIssues(): SupportIssue[] {
    switch (this.selectedTab) {
      case 'waiting':
        return this.waitingIssues
      case 'active':
        return this.activeIssues
      case 'resolved':
        return this.resolvedIssues
      default:
        return []
    }
  }

  getUserDisplayName(issue: SupportIssue): string {
    if (!issue?.userId) return 'Unknown'
    if (typeof issue.userId === 'string') return 'Unknown'
    return issue.userId.fullName || issue.userId.email || 'Unknown'
  }

  async doRefresh(event: any) {
    try {
      await this.loadIssues()
      // Wait a bit for all subscriptions to complete
      setTimeout(() => {
        event.target.complete()
      }, 1000)
    } catch (error) {
      console.error('Error refreshing:', error)
      event.target.complete()
    }
  }
}
