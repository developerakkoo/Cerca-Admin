import { Injectable } from '@angular/core'
import { HttpClient, HttpHeaders } from '@angular/common/http'
import { Observable, throwError } from 'rxjs'
import { catchError } from 'rxjs/operators'
import { environment } from 'src/environments/environment'
import { AdminAuthService } from './admin-auth.service'

export interface SupportIssue {
  _id: string
  userId: string | {
    _id?: string
    fullName?: string
    email?: string
    phoneNumber?: string
    [key: string]: any
  }
  adminId?: string | {
    _id?: string
    fullName?: string
    email?: string
    [key: string]: any
  }
  issueType: 'RIDE' | 'PAYMENT' | 'ACCOUNT' | 'GENERAL'
  status: 'WAITING_FOR_ADMIN' | 'ADMIN_ASSIGNED' | 'CHAT_ACTIVE' | 'FEEDBACK_PENDING' | 'RESOLVED' | 'ESCALATED'
  escalated?: boolean
  resolvedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface SupportMessage {
  _id: string
  issueId: string
  senderType: 'USER' | 'ADMIN' | 'SYSTEM'
  senderId?: string
  message: string
  createdAt: Date
  updatedAt: Date
}

export interface SupportStats {
  waiting: number
  active: number
  resolved: number
  feedbackPending: number
  adminActiveChats: number
  averageRating: number
  totalIssues: number
}

@Injectable({
  providedIn: 'root'
})
export class AdminSupportService {
  private apiUrl = `${environment.apiBaseUrl}/admin/support`

  constructor(
    private http: HttpClient,
    private authService: AdminAuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken()
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    })
  }

  /**
   * Get all issues with filters
   */
  getAllIssues(filters?: { status?: string; issueType?: string; page?: number; limit?: number }): Observable<any> {
    const params: any = {}
    if (filters?.status) params.status = filters.status
    if (filters?.issueType) params.issueType = filters.issueType
    if (filters?.page) params.page = filters.page
    if (filters?.limit) params.limit = filters.limit

    return this.http.get(`${this.apiUrl}/issues`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError(this.handleError)
    )
  }

  /**
   * Get waiting issues
   */
  getWaitingIssues(): Observable<SupportIssue[]> {
    return this.http.get<SupportIssue[]>(`${this.apiUrl}/issues/waiting`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    )
  }

  /**
   * Get active chats for current admin
   */
  getActiveChats(): Observable<SupportIssue[]> {
    return this.http.get<SupportIssue[]>(`${this.apiUrl}/issues/active`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    )
  }

  /**
   * Get resolved issues
   */
  getResolvedIssues(): Observable<SupportIssue[]> {
    return this.http.get<SupportIssue[]>(`${this.apiUrl}/issues/resolved`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    )
  }

  /**
   * Get issue by ID
   */
  getIssueById(issueId: string): Observable<SupportIssue> {
    return this.http.get<SupportIssue>(`${this.apiUrl}/issues/${issueId}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    )
  }

  /**
   * Get messages for an issue
   */
  getIssueMessages(issueId: string): Observable<SupportMessage[]> {
    return this.http.get<SupportMessage[]>(`${this.apiUrl}/issues/${issueId}/messages`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    )
  }

  /**
   * Resolve an issue
   */
  resolveIssue(issueId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/issues/${issueId}/resolve`, {}, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    )
  }

  /**
   * Get support statistics
   */
  getSupportStats(): Observable<SupportStats> {
    return this.http.get<SupportStats>(`${this.apiUrl}/stats`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    )
  }

  /**
   * Error handler
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An unknown error occurred'
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`
    } else {
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message || error.error?.message || errorMessage}`
    }
    console.error('Admin Support Service Error:', errorMessage)
    return throwError(() => new Error(errorMessage))
  }
}

