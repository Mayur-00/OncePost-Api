import { BskyAgent } from "@atproto/api";

export interface BlueskyAccountData {
  did: string;
  handle: string;
  accessJwt: string;
  refreshJwt: string;
  updatedAt: Date;
} 

 export interface LoginCredentials {
  userId: string;       // Your local application user id
  identifier: string;   // The user's Bluesky handle or email
  appPassword: string;  // The user's Bluesky App Password
}

export interface BlueskyPlatformData {
  did: string;
  handle: string;
}

export interface BlueskyPostData{
  text: string;
  ImageBuffer: Buffer;
  userId:string;
}