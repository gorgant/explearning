import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlexLayoutModule } from '@angular/flex-layout';
import { ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../material.module';
import { SubscribeComponent } from './components/subscribe/subscribe.component';
import { PageHeroComponent } from './components/page-hero/page-hero.component';
import { PostCollectionComponent } from './components/post-collection/post-collection.component';
import { PostItemComponent } from './components/post-item/post-item.component';
import { RouterModule } from '@angular/router';
import { MatElevationDirective } from './directives/mat-elevation.directive';
import { TestamonialComponent } from './components/testamonial/testamonial.component';
import { AvatarPortraitComponent } from './components/avatar-portrait/avatar-portrait.component';

@NgModule({
  declarations: [
    SubscribeComponent,
    PageHeroComponent,
    PostCollectionComponent,
    PostItemComponent,
    MatElevationDirective,
    TestamonialComponent,
    AvatarPortraitComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MaterialModule,
    FlexLayoutModule,
  ],
  exports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,
    FlexLayoutModule,
    SubscribeComponent,
    PageHeroComponent,
    PostCollectionComponent,
    PostItemComponent,
    MatElevationDirective,
    TestamonialComponent,
    AvatarPortraitComponent,
  ]
})
export class SharedModule { }
