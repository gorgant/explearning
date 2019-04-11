import { State } from './state';
import { MemoizedSelector, createFeatureSelector, createSelector } from '@ngrx/store';
import * as fromPosts from './reducer';
import { Post } from 'src/app/core/models/posts/post.model';

export const getError = (state: State): any => state.error;
export const getIsLoading = (state: State): boolean => state.isLoading;
export const getPostsLoaded = (state: State): boolean => state.postsLoaded;

export const selectPostState: MemoizedSelector<object, State>
= createFeatureSelector<State>('posts');

export const selectAllPosts: (state: object) => Post[] = createSelector(
  selectPostState,
  fromPosts.selectAll
);

export const selectPostById: (postId: string) => MemoizedSelector<object, Post>
= (postId: string) => createSelector(
  selectPostState,
  postsState => postsState.entities[postId]
);

export const selectPostError: MemoizedSelector<object, any> = createSelector(
  selectPostState,
  getError
);

export const selectPostIsLoading: MemoizedSelector<object, boolean>
= createSelector(selectPostState, getIsLoading);

export const selectPostsLoaded: MemoizedSelector<object, boolean>
= createSelector(selectPostState, getPostsLoaded);