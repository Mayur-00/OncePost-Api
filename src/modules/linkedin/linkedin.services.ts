import axios, { AxiosInstance } from "axios";
import { Logger } from "winston";
import {
  AccessTokenResponseType,
  linkedinAccessTokenResponse,
  linkedInMediaRegisterResponse,
  LinkedinPostPublishResponse,
  LinkedinUserInfoResponse,
  LinkedinUserInfoType,
} from "./linkedin.types";
import { ApiError } from "../../utils/apiError";
import { PlatformPost, PrismaClient, SocialAccount } from "../../generated/prisma/client";

export class linkedinServices {
  constructor(
    private prisma: PrismaClient,
    private logger: Logger,
    private httpClient: AxiosInstance = axios,
    private Config: {
      clientID: string;
      clientSecret: string;
      redirectUri: string;
    }
  ) {}

  async getAccessToken(code: string): Promise<linkedinAccessTokenResponse> {
    try {
      const response = await this.httpClient.post<linkedinAccessTokenResponse>(
        "https://www.linkedin.com/oauth/v2/accessToken",
        new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          redirect_uri: this.Config.redirectUri,
          client_id: this.Config.clientID,
          client_secret: this.Config.clientSecret,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      this.logger.info("linkedin acccess token obtained by this code", {
        code: code.substring(0, 5),
      });
      return response.data;
    } catch (error: any) {
      this.logger.error(" Failed to get linkedin access token", { error });
      if (error.response?.status === 401) {
        throw new ApiError(401, "Invalid authorization code");
      }

      if (error.response?.status === 429) {
        throw new ApiError(429, "Rate limit exceeded");
      }

      // Generic error
      throw new ApiError(500, "Failed to authenticate with LinkedIn");
    }
  }

  async getUserInfo(accessToken: string): Promise<LinkedinUserInfoResponse> {
    try {
      const response = await this.httpClient.get<LinkedinUserInfoResponse>(
        "https://api.linkedin.com/v2/userinfo",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      this.logger.info("user info obtained");
      return response.data;
    } catch (error) {
      this.logger.error("failed to get user info", { error });
      throw new ApiError(500, "failed to get user info");
    }
  }

  async publishTextPost(
    linkedinUserId: string,
    text: string,
    accessToken: string
  ): Promise<LinkedinPostPublishResponse> {
    try {
      const response = await this.httpClient.post<LinkedinPostPublishResponse>(
        "https://api.linkedin.com/v2/ugcPosts",
        {
          author: `urn:li:person:${linkedinUserId}`,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: {
                text: text,
              },
              shareMediaCategory: "NONE",
            },
          },
          visibility: {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
          },
        }
      );

      this.logger.info("Post Published Successfully");
      return response.data;
    } catch (error) {
      this.logger.info("Post Publising Failed", { error });
      throw new ApiError(500, "Post Publish Failed");
    }
  }

  async registerImageUpload(
    access_token: string,
    linkedin_user_id: string
  ): Promise<linkedInMediaRegisterResponse> {
    try {
      const response = await this.httpClient.post(
        "https://api.linkedin.com/v2/assets?action=registerUpload",
        {
          registerUploadRequest: {
            recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
            owner: `urn:li:person:${linkedin_user_id}`,
            serviceRelationships: [
              {
                relationshipType: "OWNER",
                identifier: "urn:li:userGeneratedContent",
              },
            ],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
            "LinkedIn-Version": "202401",
          },
        }
      );

      this.logger.info("Media Successfully Registered");

      return {
        uploadUrl:
          response.data.value.uploadMechanism[
            "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
          ].uploadUrl,
        asset: response.data.value.asset,
      };
    } catch (error) {
      this.logger.error("Media Registeration Failed", { error });
      throw new ApiError(500, "Media Registeration Failed");
    }
  }

  async UploadImageBuffer(
    uploadUrl: string,
    imageBuffer: Buffer,
    access_token: string
  ) {
    try {
      const response = await this.httpClient.put(uploadUrl, imageBuffer, {
        headers: {
          "Content-Type": "application/octet-stream",
          Authorization: `Bearer ${access_token}`,
        },
      });

      this.logger.info("image buffer upload success");

      return {
        success: true,
        message: "success",
      };
    } catch (error) {
      this.logger.error("image buffer upload failed", { error });
      throw new ApiError(500, "media buffer upload Failed");
    }
  }

  async publishPostWithImage(
    asset: string,
    linkedin_access_token: string,
    linkedin_user_id: string,
    text?: string
  ): Promise<LinkedinPostPublishResponse> {
    try {
      const response = await this.httpClient.post<LinkedinPostPublishResponse>(
        "https://api.linkedin.com/v2/ugcPosts",
        {
          author: `urn:li:person:${linkedin_user_id}`,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: {
                text: text || "",
              },
              shareMediaCategory: "IMAGE",
              media: [
                {
                  status: "READY",
                  media: asset,
                },
              ],
            },
          },
          visibility: {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${linkedin_access_token}`,
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
          },
        }
      );

      this.logger.info("Post Published Successfully");
      return response.data;
    } catch (error) {
      this.logger.error("Post Publishing Failed", { error });
      throw new ApiError(500, "Post Publishing Failed");
    }
  }

  async createUsersLinkedinConnectionDatabaseRecord(
    user_info: LinkedinUserInfoType,
    access_token_obj: AccessTokenResponseType,
    user_id: string
  ): Promise<SocialAccount> {
    try {
      const socialAccount = await this.prisma.socialAccount.create({
        data: {
          owner_id: user_id,
          platform: "LINKEDIN",
          platform_userid: user_info.sub,
          display_name: user_info.name,
          profile_picture: user_info.picture,
          access_token: access_token_obj.access_token,
          refresh_token: access_token_obj.refresh_token || null,
          token_expiry: new Date(
            Date.now() + access_token_obj.expires_in * 1000
          ),
          platformData: user_info,
          lastSync: new Date(),
        },
      });

      this.logger.info("Social Account Database Record Created ");
      return socialAccount;
    } catch (error) {
      this.logger.error("Social Account Database Record Creation Failed");
      throw new ApiError(500, "Account Creation Failed");
    }
  }

  async createLinkedinPostDatabaseRecord(
    user_id: string,
    post_id: string,
    linkedin_account_id: string,
    linkedin_post_id: string,
    posted_at: Date
  ):Promise<PlatformPost> {
    try {
      const post = await this.prisma.platformPost.create({
        data: {
          post_id: post_id,
          owner_id: user_id,
          platform: "LINKEDIN",
          account_id: linkedin_account_id,
          platform_post_id: linkedin_post_id,
          platform_post_url: `https://www.linkedin.com/feed/update/${linkedin_post_id}/`,
          status: "POSTED",
          postedAt: posted_at,
        },
      });

      this.logger.info("Db Record Creation Success");
      return post;
    } catch (error) {
        this.logger.error('Db Record Creation Failed : ', {error});
        throw new ApiError(500, 'database linkedin post creation failed')
    }
  };

  async getUserAccount (userid:string):Promise<SocialAccount> {
     try {
      const user = await this.prisma.socialAccount.findFirst({
       where:{
        owner_id:userid,
        platform:'LIKENDIN'
       }
      });
      if(!user){
        this.logger.error('account not found');
        throw new ApiError(404 , 'account not found')
      }

      this.logger.info("Account Found ");
      return user;
    } catch (error) {
        this.logger.error('account fetch Failed : ', {error});
        throw new ApiError(500, 'database linkedin account fetch failed')
    }
  }
}
