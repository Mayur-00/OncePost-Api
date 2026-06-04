import { Logger } from "winston";
import { BlueskyService } from "./bluesky.services.js";
import { RequestHandler, Request, Response } from 'express';
import { asyncHandler } from "../../utils/asyncHandler.js";
import { BlueskyLoginSchema } from "./bluesky.dto.js";
import { ApiError } from "../../utils/apiError.js";
import { ApiResponse } from "../../utils/apiResponse.js";

export class BlueskyControllerClass {
    constructor(private blueskyServices:BlueskyService, private logger : Logger){}
    HandleLogin :RequestHandler = asyncHandler(async (req : Request, res:Response) => {

        if(!req.user){
            this.logger.error("Unauthorized User");
            throw new ApiError(401, "Unauthorized")
        };

        const userid = req.user.id;


        const { email, password} = BlueskyLoginSchema.parse(req.body);

        const response = await this.blueskyServices.connectAccount(userid, email, password );

        if(!response.success){
            this.logger.error("Failed to Connect Bluesky Account");
            throw new ApiError(500, "Failed")
        };

        return res.status(200).json(new ApiResponse(200, {}, "Success"));
    });
}