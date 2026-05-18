import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdminApiService } from '../../../services/admin-api.service';
import { ToastController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-payment-dispute-detail',
  templateUrl: './payment-dispute-detail.page.html',
  styleUrls: ['./payment-dispute-detail.page.scss'],
  standalone: false,
})
export class PaymentDisputeDetailPage implements OnInit {
  dispute: any = null;
  adminNote = '';
  compensationAmount = 0;

  constructor(
    private route: ActivatedRoute,
    private api: AdminApiService,
    private toast: ToastController,
    private loading: LoadingController
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
  }

  load(id: string) {
    this.api.getPaymentDisputeById(id).subscribe({
      next: (res) => {
        this.dispute = res?.data;
        this.compensationAmount = this.dispute?.paymentContext?.fare || 0;
      },
    });
  }

  async resolve(action: string) {
    const id = this.dispute?._id;
    if (!id) return;
    const loader = await this.loading.create({ message: 'Resolving...' });
    await loader.present();
    this.api
      .resolvePaymentDispute(id, {
        action,
        adminNote: this.adminNote,
        compensationAmount: this.compensationAmount,
      })
      .subscribe({
        next: async () => {
          await loader.dismiss();
          const t = await this.toast.create({
            message: 'Dispute updated',
            color: 'success',
            duration: 2000,
          });
          await t.present();
          this.load(id);
        },
        error: async (err) => {
          await loader.dismiss();
          const t = await this.toast.create({
            message: err?.error?.message || 'Failed',
            color: 'danger',
            duration: 3000,
          });
          await t.present();
        },
      });
  }
}
