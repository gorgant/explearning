import { Component, OnInit, Input } from '@angular/core';
import { PublicAppRoutes } from 'src/app/core/models/routes-and-paths/app-routes.model';
import { Post } from 'src/app/core/models/posts/post.model';
import { UiService } from 'src/app/core/services/ui.service';

@Component({
  selector: 'app-post-item',
  templateUrl: './post-item.component.html',
  styleUrls: ['./post-item.component.scss']
})
export class PostItemComponent implements OnInit {

  @Input() post: Post;
  postTitle: string;

  appRoutes = PublicAppRoutes;

  constructor(
    private uiService: UiService
  ) { }

  ngOnInit() {
    this.setUserFriendlyUrlString();
  }

  private setUserFriendlyUrlString() {
    this.postTitle = this.uiService.convertToFriendlyUrlFormat(this.post.title);
  }

}
