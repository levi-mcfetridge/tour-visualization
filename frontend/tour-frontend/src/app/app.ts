import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('tour-frontend');
  private http = inject(HttpClient);

  ngOnInit() {
    this.http.get('/api/ping').subscribe(console.log);
    this.http.get<any>('/api/events?keyword=Imagine+Dragons').subscribe((data) => {
      const events = data._embedded?.events ?? [];
      for (const e of events) {
        console.log(e.name, e.dates.start.localDate, e._embedded.venues[0].name);
      }
    });
  }
}
