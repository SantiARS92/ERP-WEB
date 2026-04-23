import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { HelpGuide } from '../../shared/components/help-guide/help-guide';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Sidebar, HelpGuide],
  templateUrl: './main-layout.html',
  styles: ``,
})
export class MainLayout {

}
