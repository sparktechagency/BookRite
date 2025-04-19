import express from 'express';
import { AuthRoutes } from '../app/modules/auth/auth.route';
import { UserRoutes } from '../app/modules/user/user.route';
import { ServiceRoutes } from '../app/modules/service/service.route';
import { RuleRoutes } from '../app/modules/rule/rule.route';
import { PostRoutes } from '../app/modules/post/post.routes';
import { ChatRoutes } from '../app/modules/chat/chat.routes';
import { MessageRoutes } from '../app/modules/message/message.routes';
import { ReviewRoutes } from '../app/modules/review/review.routes';
import { BannerRoutes } from '../app/modules/banner/banner.routes';
import { PaymentRoutes } from '../app/modules/payment/payment.routes';
import { OfferRouter } from '../app/modules/offer/offer.routes';
import { NotificationRoutes } from '../app/modules/notification/notification.routes';
import { BookmarkRoutes } from '../app/modules/bookmark/bookmark.routes';
const router = express.Router();

const apiRoutes = [
  { path: '/user', route: UserRoutes },
  { path: '/auth', route: AuthRoutes },
  { path: '/service', route: ServiceRoutes },
  { path: '/rule', route: RuleRoutes },
  { path: '/post', route: PostRoutes },
  { path: '/chat', route: ChatRoutes },
  { path: '/message', route: MessageRoutes },
  { path: '/review', route: ReviewRoutes },
  { path: '/banner', route: BannerRoutes },
  { path: '/payment', route: PaymentRoutes },
  { path: '/offer', route: OfferRouter },
  { path: '/notification', route: NotificationRoutes },
  { path: '/bookmark', route: BookmarkRoutes },
];

apiRoutes.forEach(route => router.use(route.path, route.route));
export default router;