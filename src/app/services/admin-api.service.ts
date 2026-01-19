import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminApiService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getDashboard(params?: Record<string, string | number>): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/dashboard`, { params: this.buildParams(params) });
  }

  getEarnings(params?: Record<string, string | number>): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/earnings`, { params: this.buildParams(params) });
  }

  getUsers(params?: Record<string, string | number | boolean>): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/users`, { params: this.buildParams(params) });
  }

  getUserDetails(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/users/${id}`);
  }

  updateUserStatus(id: string, isActive: boolean): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/users/${id}/block`, { isActive });
  }

  verifyUser(id: string, isVerified: boolean): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/users/${id}/verify`, { isVerified });
  }

  adjustUserWallet(id: string, amount: number, type: 'add' | 'deduct', description?: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/users/${id}/wallet`, { amount, type, description });
  }

  getDrivers(params?: Record<string, string | number | boolean>): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/drivers`, { params: this.buildParams(params) });
  }

  getDriverDetails(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/drivers/${id}`);
  }

  approveDriver(id: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/drivers/${id}/approve`, {});
  }

  rejectDriver(id: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/drivers/${id}/reject`, {});
  }

  updateDriverStatus(id: string, isActive: boolean): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/drivers/${id}/block`, { isActive });
  }

  verifyDriver(id: string, isVerified: boolean): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/drivers/${id}/verify`, { isVerified });
  }

  getDriverDocuments(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/drivers/${id}/documents`);
  }

  getRides(params?: Record<string, string | number>): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/rides`, { params: this.buildParams(params) });
  }

  getRideById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/rides/${id}`);
  }

  cancelRide(id: string, reason?: string, cancellationFee?: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/rides/${id}/cancel`, { reason, cancellationFee });
  }

  assignDriver(rideId: string, driverId: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/rides/${rideId}/assign`, { driverId });
  }

  getRideTimeline(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/rides/${id}/timeline`);
  }

  getPayments(params?: Record<string, string | number>): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/payments`, { params: this.buildParams(params) });
  }

  refundPayment(rideId: string, reason?: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/payments/refund`, { rideId, reason });
  }

  getPayouts(params?: Record<string, string | number>): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/payments/payouts`, { params: this.buildParams(params) });
  }

  processPayout(id: string, payload: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/payments/payouts/${id}/process`, payload);
  }

  getSettings(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/settings`);
  }

  updateSettings(payload: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/settings`, payload);
  }

  addSettings(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/settings`, payload);
  }

  private buildParams(params?: Record<string, any>): HttpParams {
    let httpParams = new HttpParams();
    if (!params) return httpParams;
    Object.keys(params).forEach((key) => {
      const value = params[key];
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return httpParams;
  }
}

