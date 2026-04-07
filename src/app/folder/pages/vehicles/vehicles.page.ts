import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  merge,
  of,
  Subject,
  switchMap,
} from 'rxjs';
import { AdminApiService } from '../../../services/admin-api.service';
import {
  AdminVehicleInventoryResponse,
  AdminVehicleInventoryRow,
  vehicleApprovalBadgeColor,
} from '../../../core/admin-vehicle-inventory';

@Component({
  selector: 'app-vehicles',
  templateUrl: './vehicles.page.html',
  styleUrls: ['./vehicles.page.scss'],
  standalone: false,
})
export class VehiclesPage implements OnInit, ViewWillEnter {
  private readonly destroyRef = inject(DestroyRef);
  private readonly immediateLoad$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();

  inventory: AdminVehicleInventoryResponse | null = null;
  vehicles: AdminVehicleInventoryRow[] = [];
  isLoading = false;
  error: string | null = null;

  searchTerm = '';
  /** all | APPROVED | UNDER_APPROVAL | REJECTED */
  statusFilter = 'all';
  /** all | fleet | personal */
  ownershipFilter = 'all';
  vendorId = '';

  vendors: { _id: string; businessName: string }[] = [];

  badgeColor = vehicleApprovalBadgeColor;

  constructor(
    private adminApi: AdminApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    merge(
      this.immediateLoad$,
      this.searchSubject.pipe(debounceTime(350), distinctUntilChanged())
    )
      .pipe(
        switchMap(() => {
          this.isLoading = true;
          this.error = null;
          return this.adminApi.getVehicleInventory(this.buildQuery()).pipe(
            finalize(() => {
              this.isLoading = false;
            }),
            catchError((err) => {
              this.error =
                err?.error?.message || err?.message || 'Failed to load vehicles';
              return of(null);
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res) => {
        if (res?.success) {
          this.inventory = res;
          this.vehicles = res.vehicles || [];
        } else if (res === null) {
          this.inventory = null;
          this.vehicles = [];
        }
      });

    this.adminApi.getVendors().subscribe({
      next: (data) => {
        this.vendors = (data?.vendors || []).map((v: { _id: string; businessName?: string }) => ({
          _id: v._id,
          businessName: v.businessName || v._id,
        }));
      },
      error: () => {
        this.vendors = [];
      },
    });

    this.immediateLoad$.next();
  }

  ionViewWillEnter(): void {
    this.immediateLoad$.next();
    this.adminApi.getVendors().subscribe({
      next: (data) => {
        this.vendors = (data?.vendors || []).map((v: { _id: string; businessName?: string }) => ({
          _id: v._id,
          businessName: v.businessName || v._id,
        }));
      },
      error: () => {
        this.vendors = [];
      },
    });
  }

  onSearchInput(): void {
    this.searchTerm = String(this.searchTerm ?? '').trim();
    this.searchSubject.next(this.searchTerm);
  }

  onFilterChange(): void {
    if (this.ownershipFilter === 'personal') {
      this.vendorId = '';
    }
    this.immediateLoad$.next();
  }

  doRefresh(ev: CustomEvent): void {
    this.immediateLoad$.next();
    const target = ev.target as HTMLIonRefresherElement;
    setTimeout(() => target.complete(), 300);
  }

  openVehicle(row: AdminVehicleInventoryRow): void {
    if (row.vehicleRecordType === 'VENDOR_FLEET' && row.fleetVehicleId) {
      this.router.navigate(['/folder/vehicles/fleet', row.fleetVehicleId]);
      return;
    }
    if (row.vehicleRecordType === 'DRIVER_PERSONAL' && row.driverId) {
      this.router.navigate(['/folder/vehicles/driver', row.driverId]);
    }
  }

  ownershipLabel(row: AdminVehicleInventoryRow): string {
    if (row.vehicleRecordType === 'VENDOR_FLEET') {
      return row.vendor?.businessName || 'Vendor fleet';
    }
    const d = row.assignedDriver;
    if (d?.name) {
      return `Independent driver · ${d.name}`;
    }
    return 'Independent driver';
  }

  assignmentHint(row: AdminVehicleInventoryRow): string {
    if (row.vehicleRecordType !== 'VENDOR_FLEET') return '';
    const n = row.assignedDriverCount ?? 0;
    if (n <= 0) return 'Unassigned';
    if (n === 1) return '1 driver assigned';
    return `${n} drivers assigned`;
  }

  private buildQuery(): Record<string, string> {
    const p: Record<string, string> = {};
    if (this.statusFilter && this.statusFilter !== 'all') {
      p['status'] = this.statusFilter;
    }
    if (this.ownershipFilter === 'fleet') {
      p['ownershipType'] = 'VENDOR_FLEET';
    } else if (this.ownershipFilter === 'personal') {
      p['ownershipType'] = 'DRIVER_PERSONAL';
    }
    if (this.vendorId && this.ownershipFilter !== 'personal') {
      p['vendorId'] = this.vendorId;
    }
    if (this.searchTerm) {
      p['search'] = this.searchTerm;
    }
    return p;
  }
}
