import { NgModule } from '@angular/core';

import { ContactRoutingModule } from './contact-routing.module';
import { SharedModule } from 'src/app/shared/shared.module';
import { ContactComponent } from '../components/contact/contact.component';

@NgModule({
  declarations: [
    ContactComponent
  ],
  imports: [
    SharedModule,
    ContactRoutingModule
  ]
})
export class ContactModule { }
