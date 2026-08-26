import { Component } from '@angular/core';


@Component({
  selector: 'app-help-guide',
  imports: [],
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
