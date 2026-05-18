import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AdminApiService } from '../../../services/admin-api.service';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-payment-disputes',
  templateUrl: './payment-disputes.page.html',
  styleUrls: ['./payment-disputes.page.scss'],
  standalone: false,
})
export class PaymentDisputesPage implements OnInit {
  disputes: any[] = [];
  stats: any = {};
  statusFilter = '';
  isLoading = false;

  constructor(
    private api: AdminApiService,
    private router: Router,
    private toast: ToastController
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.isLoading = true;
    const params: Record<string, string> = {};
    if (this.statusFilter) params['status'] = this.statusFilter;

    this.api.getPaymentDisputeStats().subscribe({
      next: (res) => (this.stats = res?.data || {}),
    });

    this.api.getPaymentDisputes(params).subscribe({
      next: (res) => {
        this.disputes = res?.data || [];
        this.isLoading = false;
      },
      error: async () => {
        this.isLoading = false;
        const t = await this.toast.create({
          message: 'Failed to load disputes',
          color: 'danger',
          duration: 3000,
        });
        await t.present();
      },
    });
  }

  openDetail(id: string) {
    this.router.navigate(['/folder/payment-disputes', id]);
  }

  reconcileGateway() {
    this.api.triggerPaymentDisputeGatewayReconcile().subscribe({
      next: async (res) => {
        const t = await this.toast.create({
          message: `Gateway reconcile: ${(res?.data || []).length} checked`,
          duration: 3000,
        });
        await t.present();
        this.load();
      },
    });
  }
}
