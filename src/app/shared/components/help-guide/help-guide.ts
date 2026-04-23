import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-help-guide',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './help-guide.html',
})
export class HelpGuide {
  isOpen = false;
  activeSection = 'dashboard'; // Default section

  openGuide() {
    this.isOpen = true;
  }

  closeGuide() {
    this.isOpen = false;
  }

  setSection(section: string) {
    this.activeSection = section;
  }
}
