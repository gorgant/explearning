import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { PodcastEpisode } from 'shared-models/podcast/podcast-episode.model';
import { UiService } from 'src/app/core/services/ui.service';
import { Store } from '@ngrx/store';
import { RootStoreState, PodcastStoreSelectors, PodcastStoreActions } from 'src/app/root-store';
import { withLatestFrom, map, filter, tap } from 'rxjs/operators';
import { PODCAST_PATHS } from 'shared-models/podcast/podcast-vars.model';

@Component({
  selector: 'app-podcast-body',
  templateUrl: './podcast-body.component.html',
  styleUrls: ['./podcast-body.component.scss']
})
export class PodcastBodyComponent implements OnInit {

  podcastList$: Observable<PodcastEpisode[]>;
  loadPodcastTriggered: boolean;

  intervalId: NodeJS.Timer;
  intervalCount = 0;

  constructor(
    private store$: Store<RootStoreState.State>,
    private uiService: UiService
  ) { }

  ngOnInit() {
    this.initializePodcast();
  }

  private initializePodcast() {

    this.intervalId = setInterval(() => {
      console.log('Interval running')
      this.intervalCount++;
      if (this.intervalCount > 20) {
        console.log('Clearing interval, exceeded cap');
        clearInterval(this.intervalId);
      }
    }, 100); // A janky SSR work-around to ensure post loads before Universal renders the post, consider removing

    this.podcastList$ = this.store$.select(PodcastStoreSelectors.selectAllEpisodes)
    .pipe(
      withLatestFrom(
        this.store$.select(PodcastStoreSelectors.selectEpisodesLoaded)
      ),
      map(([episodes, episodesLoaded]) => {
        // Check if items are loaded, if not fetch from server
        if (!episodesLoaded && !this.loadPodcastTriggered) {
          console.log('No episodes loaded, loading those now');
          const podcastId: string = this.uiService.getPodcastId(PODCAST_PATHS.expn.rssFeedPath);
          this.loadPodcastTriggered = true; // Prevents loading from firing more than needed
          this.store$.dispatch(new PodcastStoreActions.AllEpisodesRequested({podcastId}));
        }
        this.loadPodcastTriggered = true; // Prevents loading from firing more than needed
        return episodes;
      }),
      filter(episodes => episodes.length > 0), // Catches the first emission which is an empty array
      tap(posts => clearInterval(this.intervalId))
    );

  }

  ngOnDestroy() {
    clearInterval(this.intervalId);
  }
}
