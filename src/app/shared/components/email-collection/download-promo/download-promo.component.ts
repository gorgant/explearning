import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { SUBSCRIBE_VALIDATION_MESSAGES } from 'shared-models/forms-and-components/public-validation-messages.model';
import { Observable } from 'rxjs';
import { EmailSenderAddresses } from 'shared-models/email/email-vars.model';
import { Store } from '@ngrx/store';
import { RootStoreState, UserStoreSelectors, UserStoreActions } from 'src/app/root-store';
import { takeWhile } from 'rxjs/operators';
import { PublicUser } from 'shared-models/user/public-user.model';
import { EmailSubData } from 'shared-models/subscribers/email-sub-data.model';
import { SubscriptionSource } from 'shared-models/subscribers/subscription-source.model';
import { BillingKeys } from 'shared-models/billing/billing-details.model';

@Component({
  selector: 'app-download-promo',
  templateUrl: './download-promo.component.html',
  styleUrls: ['./download-promo.component.scss']
})
export class DownloadPromoComponent implements OnInit {

  subscribeForm: FormGroup;
  formValidationMessages = SUBSCRIBE_VALIDATION_MESSAGES;

  subscribeProcessing$: Observable<boolean>;
  subscribeSubmitted$: Observable<boolean>;
  emailSubmitted: boolean;
  senderEmail: string = EmailSenderAddresses.EXPLEARNING_NEWSLETTER;

  constructor(
    @Inject(MAT_DIALOG_DATA) public promoData: any,
    private fb: FormBuilder,
    private store$: Store<RootStoreState.State>
  ) { }

  ngOnInit() {
    this.subscribeForm = this.fb.group({
      [BillingKeys.FIRST_NAME]: ['', [Validators.required]],
      [BillingKeys.EMAIL]: ['', [Validators.required, Validators.email]]
    });

    this.initializeSubscribeObservers(); // Used to disable subscribe buttons
  }

  onSubmit() {
    // Prevent submission if either field is blank (allows submit button to stay illuminated even when blank)
    if (this[BillingKeys.EMAIL].value === '' || this[BillingKeys.FIRST_NAME].value === '') {
      return;
    }

    this.store$.select(UserStoreSelectors.selectUser) // User initialized in app component
      .pipe(
        takeWhile(() => !this.emailSubmitted)
      )
      .subscribe(user => {
        console.log('Checking for user to subscribe', user);
        if (user) {
          // Update the user's name and email address (or add to a new billing details object)
          const updatedUser: PublicUser = {
            ...user,
            billingDetails: user.billingDetails ? {
              ...user.billingDetails,
              [BillingKeys.FIRST_NAME]: (this[BillingKeys.FIRST_NAME].value as string).trim(),
              [BillingKeys.EMAIL]: (this[BillingKeys.EMAIL].value as string).trim()
            } : {
              [BillingKeys.FIRST_NAME]: (this[BillingKeys.FIRST_NAME].value as string).trim(),
              [BillingKeys.EMAIL]: (this[BillingKeys.EMAIL].value as string).trim()
            }
          };

          console.log('Subscribe email submitted', updatedUser);

          // Update user record
          this.store$.dispatch(new UserStoreActions.StoreUserDataRequested({userData: updatedUser}));

          // Submit subscriber data to admin
          const emailSubData: EmailSubData = {
            user: updatedUser,
            subSource: SubscriptionSource.POPUP_SMALLTALK
          };
          this.store$.dispatch(new UserStoreActions.SubscribeUserRequested({emailSubData}));

          // Mark email submitted to close the subscription
          this.emailSubmitted = true;
        }
      });
  }

  private initializeSubscribeObservers() {
    this.subscribeProcessing$ = this.store$.select(UserStoreSelectors.selectSubscribeProcessing);
    this.subscribeSubmitted$ = this.store$.select(UserStoreSelectors.selectSubscribeSubmitted);
  }

  // These getters are used for easy access in the HTML template
  get [BillingKeys.FIRST_NAME]() { return this.subscribeForm.get(BillingKeys.FIRST_NAME); }
  get [BillingKeys.EMAIL]() { return this.subscribeForm.get(BillingKeys.EMAIL); }

}
