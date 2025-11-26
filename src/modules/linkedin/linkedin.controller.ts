import e, { RequestHandler, Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  CreateLinkedinPostSchema,
  LinkedInCallbackSchema,
  multerFileSchema,
} from "./linkedin.dto";
import { Logger } from "winston";
import { jwtToken } from "../shared/jwt/jwtCookie.service";
import { LinkedinService } from ".";
import logger from "../../config/logger.config";
import { uploadImageToCloudinary } from "../../utils/imageUploader";
import { linkedinServices } from "./linkedin.services";
import { ApiError } from "../../utils/apiError";
import { PostServices } from "./post.services";
import { ApiResponse } from "../../utils/apiResponse";

export class LinkedinController {
  constructor(
    private linkedinService: linkedinServices,
    private postServices: PostServices,
    private logger: Logger
  ) {}

  handleLinkedinAuthCallback: RequestHandler = asyncHandler(
    async (req: Request, res: Response) => {
      const { code, state, error, error_description } =
        LinkedInCallbackSchema.parse(req.query);

      if (error) {
        res.redirect(
          `${process.env.FRONTEND_URI}/error?error=${error_description || "Authentication_Failed"}`
        );
        return;
      }

      const jwtResponse = jwtToken.verifyAccessToken(state);

      if (!jwtResponse.success) {
        res.redirect(`${process.env.FRONTEND_URI}/error?error=Unauthenticated`);
        return;
      }

      const accessTokenServiceResponse =
        await LinkedinService.getAccessToken(code);

      const access_token = accessTokenServiceResponse.access_token;

      const userInfoResponse = await LinkedinService.getUserInfo(access_token);

      const dbUser =
        await LinkedinService.createUsersLinkedinConnectionDatabaseRecord(
          userInfoResponse,
          accessTokenServiceResponse,
          state
        );

      this.logger.info("user linkedin connection success", {
        email: userInfoResponse.email,
      });
      res.status(200).redirect(`${process.env.FRONTEND_URI}/home`);
    }
  );

  createLinkedinPost: RequestHandler = asyncHandler(
    async (req: Request, res: Response) => {
      const { text, visibility } = CreateLinkedinPostSchema.parse(req.body);
      const userid = req.user?.id!;

      const account = await this.linkedinService.getUserAccount(userid);
      const image = req.file;
      let imageUrl;
      let linkedinPostId;
      if (image) {
        const validImage = multerFileSchema.parse(req.file);
        imageUrl = (await uploadImageToCloudinary(image!)).secure_url;
        const registerMediaResponse =
          await this.linkedinService.registerImageUpload(
            account.access_token,
            account.platform_userid
          );
        const uploadResponse = await this.linkedinService.UploadImageBuffer(
          registerMediaResponse.uploadUrl,
          validImage.buffer,
          account.access_token
        );

        if (!uploadResponse.success) {
          this.logger.error("image buffer upload error ", {
            error: uploadResponse.message,
          });
          throw new ApiError(500, "internal server error");
        }

        const publishPostResponse =
          await this.linkedinService.publishPostWithImage(
            registerMediaResponse.asset,
            account.access_token,
            account.platform_userid,
            text
          );
        linkedinPostId = publishPostResponse.id;
      } else {
        const publishTextPost = await this.linkedinService.publishTextPost(
          account.platform_userid,
          text!,
          account.access_token
        );
        linkedinPostId = publishTextPost.id;
      }

      const dbpost = await this.postServices.createPost(userid, imageUrl, text);

      const dbPlatformPost =
        await this.linkedinService.createLinkedinPostDatabaseRecord(
          userid,
          dbpost.id,
          account.id,
          linkedinPostId,
          dbpost.createdAt
        );

      // sending response
      this.logger.info("post created successfully");
      res.status(201).json(new ApiResponse(201, dbpost, "crossPosted"));
    }
  );
}
