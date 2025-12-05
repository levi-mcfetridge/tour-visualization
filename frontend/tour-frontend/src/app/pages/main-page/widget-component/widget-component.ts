// src/app/pages/main-page/widget-component/widget-component.ts
import { Component, EventEmitter, Output, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { EventsService } from '../../../core/services/events.service';

export interface ArtistSuggestion {
  id: string;
  name: string;
}

@Component({
  selector: 'app-widget-component',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './widget-component.html',
  styleUrls: ['./widget-component.scss'],
})
export class WidgetComponent {
  /* ------------------------
      INPUT + OUTPUT
  -------------------------*/
  @Input() events: any[] = [];

  @Output() search = new EventEmitter<{
    artistId?: string;
    artistName: string;
    city?: string;
    startDate?: string;
    endDate?: string;
  }>();

  @Output() selectEvent = new EventEmitter<any>();

  /* ------------------------
      STATE
  -------------------------*/
  keyword = '';
  city = '';
  radiusMiles?: number;
  startDate?: string;
  endDate?: string;

  suggestions: ArtistSuggestion[] = [];
  selectedEvent: any = null;

  private inputChanged$ = new Subject<string>();

  constructor(private eventsService: EventsService) {
    this.inputChanged$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((text) => this.eventsService.getArtistSuggestions(text))
      )
      .subscribe((results: ArtistSuggestion[]) => {
        this.suggestions = results;
      });
  }

  /* ------------------------
      AUTOCOMPLETE LOGIC
  -------------------------*/
  onKeywordChange(value: string) {
    this.keyword = value;
    this.inputChanged$.next(value);
  }

  applySuggestion(artist: ArtistSuggestion) {
    this.keyword = artist.name;
    this.suggestions = [];
    this.selectedEvent = null;

    this.search.emit({
      artistId: artist.id,
      artistName: artist.name,
      city: this.city,
      startDate: this.startDate,
      endDate: this.endDate,
    });
  }

  /* ------------------------
      MANUAL SEARCH
  -------------------------*/
  doSearch() {
    this.suggestions = [];
    this.selectedEvent = null;

    // First: get artistId from keyword
    this.eventsService.getArtistSuggestions(this.keyword).subscribe((artists) => {
      if (artists.length === 0) {
        console.warn('No artists match keyword:', this.keyword);
        return;
      }

      // Pick the first (best match)
      const artist = artists[0];

      this.search.emit({
        artistId: artist.id,
        artistName: artist.name,
        city: this.city,
        startDate: this.startDate,
        endDate: this.endDate,
      });
    });
  }

  /* ------------------------
      EVENT SELECTION
  -------------------------*/
  onSelectEvent(event: any) {
    this.selectedEvent = {
      ...event,
      image: event.image ?? 'assets/default-event.jpg',
    };

    this.selectEvent.emit(this.selectedEvent);
  }
}
