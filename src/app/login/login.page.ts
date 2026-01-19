import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuController, AlertController } from '@ionic/angular';
import { AdminAuthService } from '../services/admin-auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit {
  loginForm: FormGroup;
  isSubmitted = false;
  showPassword = false;
  isLoading = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private menuController: MenuController,
    private alertController: AlertController,
    private adminAuth: AdminAuthService
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit() {
    // Disable menu on login page
    this.menuController.enable(false);
  }

  get errorControl() {
    return this.loginForm.controls;
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async onSubmit() {
    this.isSubmitted = true;

    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;

      this.isLoading = true;
      this.adminAuth.login(email, password).subscribe({
        next: async () => {
          await this.menuController.enable(true);
          this.router.navigate(['/folder/dashboard']);
          this.isLoading = false;
        },
        error: async () => {
          this.isLoading = false;
          const alert = await this.alertController.create({
            header: 'Login Failed',
            message: 'Invalid email or password. Please try again.',
            buttons: ['OK']
          });
          await alert.present();
        }
      });
    }
  }
}
