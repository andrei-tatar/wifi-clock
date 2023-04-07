import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-wifi-settings',
  templateUrl: './wifi-settings.component.html',
  styleUrls: ['./wifi-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WifiSettingsComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
