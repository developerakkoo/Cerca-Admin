import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuController, AlertController } from '@ionic/angular';

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

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private menuController: MenuController,
    private alertController: AlertController
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['admin@test.com', [Validators.required, Validators.email]],
      password: ['test123', [Validators.required, Validators.minLength(6)]]
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
      
      // Test credentials: admin@test.com / test123
      if (email === 'admin@test.com' && password === 'test123') {
        // Enable menu for authenticated users
        await this.menuController.enable(true);
        // Navigate to dashboard
        this.router.navigate(['/folder/dashboard']);
      } else {
        // Show error message
        const alert = await this.alertController.create({
          header: 'Login Failed',
          message: 'Invalid email or password. Please try again.',
          buttons: ['OK']
        });
        await alert.present();
      }
    }
  }
}
