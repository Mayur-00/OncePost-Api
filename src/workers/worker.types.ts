export interface jobBody {
  postId: string;
  userid: string;
  platfroms: unknown[];
}

export interface ExpireSubscriptionJobBody {
  subscriptionId: string;
  userId: string;
}

export interface PostJobData {
  postId: string;
  userId: string;
  content: string;
  mediaUrl: string;
  mediaType: string;
}
