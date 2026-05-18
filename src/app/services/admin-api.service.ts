import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AdminVehicleInventoryResponse } from '../core/admin-vehicle-inventory';
import { normalizeEmail } from '../shared/validators/email.validators';
import { normalizePhoneDigits } from '../shared/validators/phone.validators';

@Injectable({
  providedIn: 'root'
})
export class AdminApiService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getDashboard(params?: Record<string, string | number>): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/dashboard`, { params: this.buildParams(params) });
  }

  getPaymentDisputes(params?: Record<string, string | number>): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/payment-disputes`, {
      params: this.buildParams(params),
    });
  }

  getPaymentDisputeById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/payment-disputes/${id}`);
  }

  getPaymentDisputeStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/payment-disputes/stats`);
  }

  resolvePaymentDispute(
    id: string,
    body: { action: string; adminNote?: string; compensationAmount?: number }
  ): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/payment-disputes/${id}/resolve`, body);
  }

  triggerPaymentDisputeGatewayReconcile(): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/payment-disputes/reconcile-gateway`, {});
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

  updateUser(id: string, userData: any, profilePic?: File): Observable<any> {
    const formData = new FormData();
    const normalizedEmail = normalizeEmail(userData.email);
    const normalizedPhone = normalizePhoneDigits(userData.phoneNumber);
    
    // Add user data fields
    if (userData.fullName) formData.append('fullName', userData.fullName);
    if (normalizedEmail) formData.append('email', normalizedEmail);
    if (normalizedPhone) formData.append('phoneNumber', normalizedPhone);
    
    // Add profile picture if provided
    if (profilePic) {
      formData.append('profilePic', profilePic);
    }
    
    return this.http.put(`${this.baseUrl}/admin/users/${id}`, formData);
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/admin/users/${id}`);
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

  approveDriverVehicle(id: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/drivers/${id}/vehicle/approve`, {});
  }

  rejectDriverVehicle(
    id: string,
    reason: string,
    allowDocumentResubmit?: boolean
  ): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/drivers/${id}/vehicle/reject`, {
      reason,
      allowDocumentResubmit: Boolean(allowDocumentResubmit),
    });
  }

  approveDriver(id: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/drivers/${id}/approve`, {});
  }

  rejectDriver(id: string, reason: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/drivers/${id}/reject`, { reason });
  }

  updateDriverStatus(id: string, isActive: boolean): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/drivers/${id}/block`, { isActive });
  }

  verifyDriver(id: string, isVerified: boolean): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/drivers/${id}/verify`, { isVerified });
  }

  putDriverCompliance(id: string, body: { complianceDocuments: unknown[] }): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/drivers/${id}/compliance-documents`, body);
  }

  getDriverDocuments(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/drivers/${id}/documents`);
  }

  approvePriorityDriver(id: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/drivers/${id}/approve-priority`, {});
  }

  rejectPriorityDriver(id: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/drivers/${id}/reject-priority`, {});
  }

  getPriorityDocumentBlob(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/admin/drivers/${id}/priority-document`, { responseType: 'blob' });
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

  /** List vendor payouts — uses /admin/vendors/payouts (stable on older API deploys). */
  getVendorPayouts(params?: Record<string, string | number>): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/vendors/payouts`, { params: this.buildParams(params) });
  }

  processVendorPayout(id: string, payload: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/vendors/payouts/${id}`, payload);
  }

  getDriverEarningsList(params?: Record<string, string | number>): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/drivers/earnings`, { params: this.buildParams(params) });
  }

  getDriverEarningsByDriver(driverId: string, params?: Record<string, string | number>): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/drivers/${driverId}/earnings`, { params: this.buildParams(params) });
  }

  getDriverEarningsStats(params?: Record<string, string | number>): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/drivers/earnings/stats`, { params: this.buildParams(params) });
  }

  getDriverEarningsAnalytics(params?: Record<string, string | number>): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/drivers/earnings/analytics`, { params: this.buildParams(params) });
  }

  /** Outstanding cash platform fees drivers owe admin */
  getCashReceivables(params?: Record<string, string | number>): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/drivers/cash-receivables`, { params: this.buildParams(params) });
  }

  collectCashPlatformFee(earningId: string, payload?: { notes?: string }): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/drivers/earnings/${earningId}/cash-platform-collect`, payload || {});
  }

  getHeatmapData(params?: Record<string, string | number>): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/analytics/heatmap`, { params: this.buildParams(params) });
  }

  updateDriverEarningStatus(earningId: string, payload: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/drivers/earnings/${earningId}/status`, payload);
  }

  bulkUpdateDriverEarningStatus(payload: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/drivers/earnings/bulk-status`, payload);
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

  // Promo Code / Coupon methods
  getPromoCodes(params?: Record<string, string | number | boolean>): Observable<any> {
    return this.http.get(`${this.baseUrl}/coupons`, { params: this.buildParams(params) });
  }

  getPromoCodeById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/coupons/${id}`);
  }

  createPromoCode(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/coupons`, data);
  }

  updatePromoCode(id: string, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/coupons/${id}`, data);
  }

  deletePromoCode(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/coupons/${id}`);
  }

  getPromoCodeStats(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/coupons/${id}/statistics`);
  }

  assignGiftToUser(couponId: string, userId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/coupons/${couponId}/assign/${userId}`, {});
  }

  // Emergency alerts
  getEmergencies(params?: Record<string, string | number>): Observable<any> {
    return this.http.get(`${this.baseUrl}/emergencies`, { params: this.buildParams(params) });
  }

  getEmergencyById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/emergencies/${id}`);
  }

  resolveEmergency(id: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/emergencies/${id}/resolve`, {});
  }

  dismissEmergency(id: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/emergencies/${id}/dismiss`, {});
  }

  // Vendors
  getVendors(): Observable<{ total: number; vendors: any[] }> {
    return this.http.get<{ total: number; vendors: any[] }>(`${this.baseUrl}/admin/vendors`);
  }

  getVendorById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/vendors/${id}`);
  }

  getVendorDocuments(id: string): Observable<{ documents: string[] }> {
    return this.http.get<{ documents: string[] }>(`${this.baseUrl}/admin/vendors/${id}/documents`);
  }

  verifyVendor(vendorId: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/vendors/verify`, { vendorId });
  }

  rejectVendor(
    vendorId: string,
    reason: string,
    allowDocumentResubmit = false
  ): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/vendors/reject`, {
      vendorId,
      reason,
      allowDocumentResubmit,
    });
  }

  blockVendor(vendorId: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/vendors/block`, { vendorId });
  }

  unblockVendor(vendorId: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/vendors/unblock`, { vendorId });
  }

  /** Merged inventory: vendor fleet + standalone driver vehicles (GET /admin/vehicles). */
  getVehicleInventory(
    params?: Record<string, string | number | boolean>
  ): Observable<AdminVehicleInventoryResponse> {
    return this.http.get<AdminVehicleInventoryResponse>(
      `${this.baseUrl}/admin/vehicles`,
      { params: this.buildParams(params) }
    );
  }

  getFleetVehicles(params?: Record<string, string | number | boolean>): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/fleet-vehicles`, { params: this.buildParams(params) });
  }

  getFleetVehicleById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/fleet-vehicles/${id}`);
  }

  approveFleetVehicle(id: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/fleet-vehicles/${id}/approve`, {});
  }

  rejectFleetVehicle(
    id: string,
    body: { reason: string; allowDocumentResubmit?: boolean }
  ): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/fleet-vehicles/${id}/reject`, body);
  }

  /** In-app admin notifications (JWT). */
  getAdminNotifications(
    params?: Record<string, string | number | boolean>
  ): Observable<{
    success: boolean;
    notifications: any[];
    total: number;
    unreadCount: number;
    count: number;
  }> {
    return this.http.get<{
      success: boolean;
      notifications: any[];
      total: number;
      unreadCount: number;
      count: number;
    }>(`${this.baseUrl}/admin/notifications`, {
      params: this.buildParams(params),
    });
  }

  markAdminNotificationRead(id: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/notifications/${id}/read`, {});
  }

  markAllAdminNotificationsRead(): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/notifications/read-all`, {});
  }

  /**
   * Send a test FCM payload from the admin debug page.
   * See `Test_Main_Cerca_cabs/Controllers/Admin/fcm.controller.js` for the
   * accepted shape and the structured response.
   */
  sendTestFcm(payload: {
    mode: 'userId' | 'driverId' | 'tokens';
    userId?: string;
    driverId?: string;
    tokens?: string[];
    title: string;
    body: string;
    data?: Record<string, any>;
    dataOnly?: boolean;
    androidChannelId?: string;
  }): Observable<{
    success: boolean;
    mode: string;
    tokenCount: number;
    dispatch: {
      mode: string;
      skipped: boolean;
      reason: string | null;
      successCount: number;
      failureCount: number;
      messageId: string | null;
      error: string | null;
    };
    responses?: Array<{
      index: number;
      token: string;
      success: boolean;
      messageId: string | null;
      errorCode: string | null;
      errorMessage: string | null;
    }>;
  }> {
    return this.http.post<any>(`${this.baseUrl}/admin/test/fcm`, payload);
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

