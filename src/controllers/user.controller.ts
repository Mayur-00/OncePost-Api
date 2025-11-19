import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { RequestHandler } from "express";
import { googleAuthClient } from "../config/googleOAuth.config";
import { ApiError } from "../utils/apiError";
import { jwtToken } from "../services/jwtCookie.service";
import prisma from "../config/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { myJwtPayload } from "../middlewares/auth.middleware";

export const registerWithGoogle: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { token } = req.body;

    if (!token) {
      return res.status(401).json(new ApiResponse(401, {}, "token not found"));
    }

    const ticket = await googleAuthClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    if (!ticket) {
      throw new ApiError(500, "verifiaction failed");
    }

    const payload = ticket.getPayload()!;

    if (!payload.email || !payload.name) {
      throw new ApiError(400, "Email not found in token payload");
    }

    let user = await prisma?.user.findUnique({
      where: {
        email: payload.email,
      },
    });

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    if (user) {
      const { accessToken, refreshToken } =
        jwtToken.generateAccessTokenAndRefreshToken(
          user.id,
          user.email,
          user.name
        );

      await prisma?.user.update({
        where: {
          email: payload.email,
        },
        data: {
          profile_picture: payload.picture,
          provider_id: payload.sub,
          provider: "GOOGLE",
          refresh_token: refreshToken,
        },
      });

      return res
        .status(200)
        .cookie("accessToken", accessToken, options) // set the access token in the cookie
        .cookie("refreshToken", refreshToken, options) // set the refresh token in the cookie
        .json(
          new ApiResponse(
            200,
            { user: user, accessToken, refreshToken }, // send access and refresh token in response if client decides to save them by themselves
            "User signin in successfully"
          )
        );
    }

    user = await prisma.user.create({
      data: {
        email: payload.email,
        name: payload.name,
        profile_picture: payload.picture,
        provider_id: payload.sub,
        provider: "GOOGLE",
      },
    });

    const { accessToken, refreshToken } =
      jwtToken.generateAccessTokenAndRefreshToken(
        user.id,
        user.email,
        user.name
      );
    const updatedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        refresh_token: refreshToken,
      },
      select: {
        name: true,
        email: true,
        profile_picture: true,
        id: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res
      .status(200)
      .cookie("accessToken", accessToken, options) // set the access token in the cookie
      .cookie("refreshToken", refreshToken, options) // set the refresh token in the cookie
      .json(
        new ApiResponse(
          200,
          { user: updatedUser, accessToken, refreshToken }, // send access and refresh token in response if client decides to save them by themselves
          "User signin in successfully"
        )
      );
  }
);

export const register: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      name,
      email,
      password,
    }: { name: string; email: string; password: string } = req.body;

    if (!name || !email || !password) {
      throw new ApiError(401, "name email password is required");
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (existingUser) {
      throw new ApiError(400, "user already exists please login");
    }

    const hash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: name,
        email: email,
        password: hash,
        provider: "CREDENTIAL",
      },
    });
    const { accessToken, refreshToken } =
      jwtToken.generateAccessTokenAndRefreshToken(
        newUser.id,
        newUser.email,
        newUser.name
      );

    const updatedUser = await prisma.user.update({
      where: {
        id: newUser.id,
      },
      data: {
        refresh_token: refreshToken,
      },
      select:{
        password:false
      }
    });

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options) // set the access token in the cookie
      .cookie("refreshToken", refreshToken, options) // set the refresh token in the cookie
      .json(
        new ApiResponse(
          200,
          { user: updatedUser, accessToken, refreshToken }, // send access and refresh token in response if client decides to save them by themselves
          "User register in successfully"
        )
      );
  }
);

export const login: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // if (!email || !password) {
    //   throw new ApiError(401, "name email password is required");
    // }

    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (!user) {
      throw new ApiError(401, "user not found please register user first");
    }

    const isPassWordCorrect = await bcrypt.compare(password, user.password!);

    if (!isPassWordCorrect) {
      throw new ApiError(401, "incorrect Password");
    }

    const { accessToken, refreshToken } =
      jwtToken.generateAccessTokenAndRefreshToken(
        user.id,
        user.email,
        user.name
      );

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options) // set the access token in the cookie
      .cookie("refreshToken", refreshToken, options) // set the refresh token in the cookie
      .json(
        new ApiResponse(
          200,
          { user: user, accessToken, refreshToken }, // send access and refresh token in response if client decides to save them by themselves
          "User register in successfully"
        )
      );
  }
);

export const logout: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const reqUserId = req.user?.id;

    if (!reqUserId) {
      throw new ApiError(401, "unauthenticated");
    }

    const user = await prisma.user.update({
      where: {
        id: reqUserId,
      },
      data: {
        refresh_token: "",
      },
    });

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "User logged out"));
  }
);

export const user: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const reqUserId = req.user?.id;

    // If there's no authenticated user id on the request, reject
    if (!reqUserId) {
      throw new ApiError(401, "not authenticated");
    }

    const user = await prisma.user.findUnique({
      where: {
        id: reqUserId,
      },
    include:{
      connected_accounts:{
        select:{
          platform:true,
          display_name:true,
          profile_picture:true,
          username:true
        }
      }
    }
    });
    console.log(user)

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    res
      .status(200)
      .json(new ApiResponse(200, user, "user fetched successfully"));
  }
);

export const refreshAccessToken: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
      console.info('no incoming token')
      throw new ApiError(401, "unauthorized request");
    }

    if (!process.env.REFRESH_TOKEN_SECRET) {
      throw new ApiError(500, "token secret not found");
    }
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    ) as myJwtPayload;

    const user = await prisma.user.findUnique({
      where: {
        id: decodedToken.id,
      },
    });

    if (!user) {
      throw new ApiError(401, "invalid Refresh Token");
    }

    if (incomingRefreshToken !== user.refresh_token) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken } =
      jwtToken.generateAccessTokenAndRefreshToken(
        user.id,
        user.email,
        user.name
      );

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: refreshToken,
          },
          "accessToken refreshed"
        )
      );
  }
);
