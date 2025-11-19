import { RequestHandler, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { jwtToken } from "../services/jwtCookie.service";
import { LikedinAccountServices } from "../services/likendinAccount.services";
import { createPostDatabseRecord } from "../utils/createPostDbRecord";
import { ApiResponse } from "../utils/apiResponse";


export const ConnectLinkedin:RequestHandler = asyncHandler(async(req:Request, res:Response) => {
    const {code, state, error} = req.query as {code:string, state:string, error:string};
    const FRONTEND_URI = process.env.FRONTEND_URI
    if(!code){
        throw new ApiError(401, "code not provided");
    };
   
    const tokenResponse =  jwtToken.verifyAccessToken(state);

    if(!tokenResponse.success){
        res.redirect(`${FRONTEND_URI}/error?message=${tokenResponse.error}`) //TODO: change message to a default message in production
    }


    const accessTokenResponse = await LikedinAccountServices.getAccessToken(code);

    if(!accessTokenResponse.success){       
        throw new ApiError(500, accessTokenResponse.error)
    };
    const accessToken = accessTokenResponse.response?.access_token

    const getUserInfoResponse = await LikedinAccountServices.getUserInfo(accessToken!);
    
    if(!getUserInfoResponse.success ){
        res.redirect(`${FRONTEND_URI}/error?message=${getUserInfoResponse.error}`)
    };
    const databaseRecord = await LikedinAccountServices.createDatabseRecord(getUserInfoResponse.data!, accessTokenResponse.response!, tokenResponse.id!);

    if(!databaseRecord.success){
        res.redirect(`${FRONTEND_URI}/error?message=${databaseRecord.error}`); //TODO:

    };

    
    res.redirect(`${FRONTEND_URI}/home`)
});


export const postTextLinkedin :RequestHandler = asyncHandler(async (req:Request, res:Response) => {

    const {text} = req.body;

    if(!text){
        throw new ApiError(400,"text not provided" )
    };

    if(!req.user){
        throw new ApiError(401, 'unauthorized')
    }

    const accountServiceResponse = await LikedinAccountServices.getUsersLinkedinAccount(req.user.id);

    if(!accountServiceResponse.success){
        console.log(accountServiceResponse.error);
        throw new ApiError(500, "service failed");
    };


    const accountData = accountServiceResponse.data!

    const resData = await LikedinAccountServices.createTextPost(accountData?.platform_userid, text, accountData?.access_token);

    if(!resData.success){
        console.log(resData.error)
        throw new ApiError(500, "post service failed");
        
    };

    const dbPost = await createPostDatabseRecord(req.user.id, text);

    if(!dbPost.success) {
        console.log(dbPost.error)
        throw new ApiError(500, 'service failed')
    };

    const linkedinPostDbRecord = await LikedinAccountServices.createPostDbRecord(req.user.id, dbPost.data?.id!, accountData.id, resData.data.id, dbPost.data?.createdAt!)

    if(!linkedinPostDbRecord.success){
        console.log(linkedinPostDbRecord.error);
        throw new ApiError(500, 'crossposting failed');
    };

    res.status(201).json( new ApiResponse(201, linkedinPostDbRecord.data, "crossPosted"));
    

})