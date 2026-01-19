import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

interface AdminLoginResponse {
  message: string;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminAuthService {
  private readonly tokenKey = 'cerca_admin_token';
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<AdminLoginResponse> {
    return this.http
      .post<AdminLoginResponse>(`${this.baseUrl}/admin/login`, { email, password })
      .pipe(tap((response) => this.setToken(response.token)));
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    return Boolean(this.getToken());
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }
}

