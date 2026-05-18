import { Directive, HostListener, Input, Optional, Self } from '@angular/core';
import { NgControl } from '@angular/forms';
import { sanitizePhoneInput } from '../validators/phone.validators';

/**
 * Strips non-digits on ion-input (paste-safe). Optional leading + when mode is 'intl'.
 */
@Directive({
  selector: 'ion-input[appDigitsOnlyPhone]',
  standalone: true,
})
export class DigitsOnlyPhoneDirective {
  @Input() appDigitsOnlyPhone: 'digits' | 'intl' = 'digits';

  constructor(@Optional() @Self() private ngControl: NgControl | null) {}

  @HostListener('ionInput', ['$event'])
  onIonInput(ev: CustomEvent): void {
    const raw = ev.detail?.value;
    const clean =
      this.appDigitsOnlyPhone === 'intl'
        ? sanitizePhoneInput(raw, { allowLeadingPlus: true })
        : sanitizePhoneInput(raw, { allowLeadingPlus: false });
    if (String(raw ?? '') === clean) {
      return;
    }
    this.ngControl?.control?.setValue(clean, { emitEvent: false });
    const el = ev.target as HTMLIonInputElement & { value?: string };
    if (el && typeof el.value !== 'undefined') {
      el.value = clean;
    }
  }
}
