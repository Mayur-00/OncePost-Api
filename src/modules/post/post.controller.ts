import { RequestHandler, Request, Response } from 'express';
import { Logger } from 'winston';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  createPostSchema,
  getPostSchema,
  getPostsSchema,
  getSearchPostsSchema,
  multerFileSchema,
  publishPostToMultiplePlatfromsSchema,
  publishPostToMultiplePlatfromsSchemaQueued,
} from './post.dto.js';
import { PostService } from './post.services.js';
import { uploadImageToCloudinary } from '../../utils/imageUploader.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import { linkedinServices } from '../linkedin/linkedin.services.js';
import { ApiError } from '../../utils/apiError.js';
import { Multer } from 'multer';
import { XServices } from '../x/x.services.js';
import { TweetDbRecord } from '../x/x.dto.js';
import { postQueue } from '../../queues/queues.js';
import { jobBody } from '../../workers/worker.types.js';

export class PostController {
  constructor(
    private logger: Logger,
    private postServices: PostService,
    private linkedinServices: linkedinServices,
    private xServices: XServices,
  ) {}

  createPost: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { content } = createPostSchema.parse(req.body);
    if (!req.user) {
      throw new ApiError(400, 'Unauthorized');
    }

    const media_file = multerFileSchema.parse(req.file);

    const media_url = (await uploadImageToCloudinary(media_file.buffer)).secure_url;

    const post = await this.postServices.createPost(
      content,
      media_url,
      req.user.id!,
      media_file.mimetype,
      'CREATED'
    );

    this.logger.info('post created successfully', { postId: post.id });

    res.status(201).json(new ApiResponse(201, post, 'success'));
  });

  getPost: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { post_id } = getPostSchema.parse(req.body);
    if (!req.user) {
      throw new ApiError(400, 'Unauthorized');
    }

    const post = await this.postServices.getPostById(post_id);

    if (!post) {
      this.logger.error('post not found');
      throw new ApiError(404, 'post not found');
    }

    this.logger.info('post fetched successfully', { postId: post.id });

    res.status(200).json(new ApiResponse(201, post, 'success'));
  });
  getAllPosts: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    };
    const {limit,skip} = getPostsSchema.parse(req.query);

    const posts = await this.postServices.getAllPosts(req.user.id, limit, skip);


    this.logger.info(`all posts fetched successfully, total post ${posts.length}`);

    res.status(200).json(new ApiResponse(200, posts, 'success'));
  });
  getSearchedPosts: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    };
    const {limit,skip, query, type} = getSearchPostsSchema.parse(req.query);
    this.logger.info(`limit= ${limit} skip=${skip} query=${query} type=${type}`)

    const posts = await this.postServices.getPostsByQuery(req.user.id,query, limit, skip, type);


    this.logger.info(` posts fetched successfully, total post ${posts.length}`);

    res.status(200).json(new ApiResponse(200, posts, 'success'));
  });
  publishPostMultiplePlatformsQueued: RequestHandler = asyncHandler(
    async (req: Request, res: Response) => {
      const { content, platforms, imageLink, imageMimeType, scheduledDateAndTime } =
        publishPostToMultiplePlatfromsSchemaQueued.parse(req.body);

      if (!req.user) {
        this.logger.error('UnAuthorized Request');
        throw new ApiError(401, 'You Are Not Authorized');
      };



      if (scheduledDateAndTime) {
        const post = await this.postServices.createPost(
          content,
          imageLink || '',
          req.user.id,
          imageMimeType || '',
          'SCHEDULED',
        );

        const now = new Date();
        const delay = scheduledDateAndTime.getTime() - now.getTime();

        if (delay < 0) {
          throw new ApiError(401, 'Scheduled time must be in the future');
        }

        const data: jobBody = {
          platfroms: platforms,
          postId: post.id,
          userid: req.user.id,
        };

        postQueue.add('post', data, {
          delay: delay,
          jobId: post.id,
        });

          this.logger.info('Post Scheduled Successfuly');
          res.status(200).json(new ApiResponse(203, 'Scheduled successFully'));

      } else{
        const post = await this.postServices.createPost(
          content,
          imageLink || '',
          req.user.id,
          imageMimeType || '',
          'CREATED',
        );

         const data: jobBody = {
        platfroms: platforms,
        postId: post.id,
        userid: req.user.id,
      };

      postQueue.add('post', data, {jobId:post.id});
          this.logger.info('Post Queued to platforms');
          res.status(200).json(new ApiResponse(203, 'post queued successFully'));
      }
    },
  );
}
