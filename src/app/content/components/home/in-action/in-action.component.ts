import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Post } from 'src/app/core/models/posts/post.model';
import { Store } from '@ngrx/store';
import { RootStoreState, PostStoreSelectors, PostStoreActions } from 'src/app/root-store';
import { withLatestFrom, map } from 'rxjs/operators';

@Component({
  selector: 'app-in-action',
  templateUrl: './in-action.component.html',
  styleUrls: ['./in-action.component.scss']
})
export class InActionComponent implements OnInit {

  posts$: Observable<Post[]>;
  error$: Observable<string>;
  isLoading$: Observable<boolean>;

  constructor(
    private store$: Store<RootStoreState.State>
  ) { }

  ngOnInit() {
    this.initializePosts();
  }

  private initializePosts() {
    this.posts$ = this.store$.select(PostStoreSelectors.selectFeaturedPosts)
      .pipe(
        withLatestFrom(
          this.store$.select(PostStoreSelectors.selectPostsLoaded),
          this.store$.select(PostStoreSelectors.selectFeaturedPostsLoaded)
        ),
        map(([posts, postsLoaded, featuredPostsLoaded]) => {
          if (!postsLoaded && !featuredPostsLoaded) {
            console.log('No featured posts loaded, loading those now');
            this.store$.dispatch(new PostStoreActions.FeaturedPostsRequested());
          }
          return posts;
        })
      );

    this.error$ = this.store$.select(
      PostStoreSelectors.selectPostError
    );

    this.isLoading$ = this.store$.select(
      PostStoreSelectors.selectPostIsLoading
    );
  }

}
