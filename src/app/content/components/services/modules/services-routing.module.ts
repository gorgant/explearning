import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ServicesComponent } from '../components/services/services.component';
import { RemoteCoachComponent } from '../components/remote-coach/remote-coach.component';
import { CheckOutComponent } from 'src/app/content/components/services/components/check-out/check-out.component';
import { PurchaseConfirmationComponent } from '../components/purchase-confirmation/purchase-confirmation.component';

const routes: Routes = [
  {
    path: '',
    component: ServicesComponent
  },
  {
    path: 'remote-coach',
    component: RemoteCoachComponent
  },
  {
    path: 'checkout',
    component: CheckOutComponent
  },
  {
    path: 'purchase-confirmation',
    component: PurchaseConfirmationComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ServicesRoutingModule { }
