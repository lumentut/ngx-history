import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-contact',
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class Contact {
  formData = {
    name: '',
    email: '',
    subject: '',
    message: '',
    newsletter: false,
  };

  onSubmit(): void {
    if (this.isFormValid()) {
      // In a real application, you would send this data to your backend
      console.log('Form submitted:', this.formData);

      // Show success message (in a real app, use a toast service or similar)
      alert("Thank you for your message! We'll get back to you soon.");

      // Reset form
      this.resetForm();
    }
  }

  private isFormValid(): boolean {
    return !!(
      this.formData.name.trim() &&
      this.formData.email.trim() &&
      this.formData.subject.trim() &&
      this.formData.message.trim()
    );
  }

  private resetForm(): void {
    this.formData = {
      name: '',
      email: '',
      subject: '',
      message: '',
      newsletter: false,
    };
  }
}
