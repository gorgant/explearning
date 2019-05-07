import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/auth';
import { AnonymousUser } from 'src/app/core/models/user/anonymous-user.model';
import * as firebase from 'firebase/app';
import 'firebase/auth';
import { from, Observable, Subject, throwError } from 'rxjs';
import { now } from 'moment';
import { AppRoutes } from '../models/routes-and-paths/app-routes.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  authStatus = new Subject<string>();
  private ngUnsubscribe$: Subject<void> = new Subject();

  constructor(
    private router: Router,
    private afAuth: AngularFireAuth,
  ) { }

  // Listen for user, if exists, initiatle auth success actions, otherwise initiate logout actions
  initAuthListener(): void {
    this.afAuth.authState.subscribe(user => {
      if (user) {
        this.authSuccessActions(user);
      } else {
        this.postLogoutActions();
      }
    });
  }

  authenticateAnonymousUser(): Observable<AnonymousUser> {
    const authResponse = this.afAuth.auth.signInAnonymously()
      .then(creds => {
        const userData: AnonymousUser = {
          id: creds.user.uid,
          lastAuthenticated: now()
        };
        return userData;
      })
      .catch(error => {
        console.log('Error during anonymous auth', error);
        return throwError(error).toPromise();
      });

    return from(authResponse);
  }

  logout(): void {
    this.preLogoutActions();
    this.afAuth.auth.signOut();
    // Post logout actions carried out by auth listener once logout detected
  }

  get unsubTrigger$() {
    return this.ngUnsubscribe$;
  }

  private authSuccessActions(user: firebase.User): void {
    this.authStatus.next(user.uid);
  }

  private preLogoutActions(): void {
    this.ngUnsubscribe$.next(); // Send signal to Firebase subscriptions to unsubscribe
    this.ngUnsubscribe$.complete(); // Send signal to Firebase subscriptions to unsubscribe
    console.log('Triggering ng Unsubscribe');
    // Reinitialize the unsubscribe subject in case page isn't refreshed after logout (which means auth wouldn't reset)
    this.ngUnsubscribe$ = new Subject<void>();
    this.router.navigate([AppRoutes.HOME]);
  }

  private postLogoutActions(): void {
    this.authStatus.next(null);
  }
}
