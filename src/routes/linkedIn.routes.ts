import express from 'express';
import { authorize } from '../middlewares/auth.middleware';
import { postTextLinkedin } from '../controllers/socialAccounts.controller';
const router = express();

router.post('/post', authorize, postTextLinkedin);


export default router