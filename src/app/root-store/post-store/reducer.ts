import { initialState, State, featureAdapter } from './state';
import { Actions, ActionTypes } from './actions';

export function featureReducer(state = initialState, action: Actions): State {
  switch (action.type) {

    case ActionTypes.SINGLE_POST_REQUESTED: {
      return {
        ...state,
        isLoading: true,
        error: null
      };
    }

    case ActionTypes.SINGLE_POST_LOADED: {
      return featureAdapter.addOne(
        action.payload.post, {
          ...state,
          isLoading: false,
          error: null
        }
      );
    }

    case ActionTypes.ALL_POSTS_REQUESTED: {
      return {
        ...state,
        isLoading: true,
        error: null
      };
    }

    case ActionTypes.ALL_POSTS_LOADED: {
      return featureAdapter.addAll(
        action.payload.posts, {
          ...state,
          isLoading: false,
          error: null,
          postsLoaded: true,
        }
      );
    }

    case ActionTypes.POST_LOAD_FAILURE: {
      return {
        ...state,
        isLoading: false,
        error: action.payload.error
      };
    }

    default: {
      return state;
    }
  }
}

// Exporting a variety of selectors in the form of a object from the entity adapter
export const {
  selectAll,
  selectEntities,
  selectIds,
  selectTotal
} = featureAdapter.getSelectors();