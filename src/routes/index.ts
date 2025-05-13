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
import { paymentRoute } from '../app/modules/payment/payment.routes';
import { OfferRouter } from '../app/modules/offer/offer.routes';
import { NotificationRoutes } from '../app/modules/notification/notification.routes';
import { BookmarkRoutes } from '../app/modules/bookmark/bookmark.routes';
import { WcServiceRoutes } from '../app/modules/service/servicewc.Routes';
import { BookingRoutes } from '../app/modules/booking/booking.route';
import { AdminRoutes } from '../app/modules/admin/admin.routes';
import { SubscriptionsRotes } from '../app/modules/subscription/subscription.routes';
import { PackageRoutes } from '../app/modules/package/package.routes';

const router = express.Router();

const apiRoutes = [
  { path: '/user', route: UserRoutes },
  { path: '/auth', route: AuthRoutes },
  { path: '/service', route: ServiceRoutes },
  { path: '/wcservice', route: WcServiceRoutes },
  { path: '/rule', route: RuleRoutes },
  { path: '/post', route: PostRoutes },
  { path: '/chat', route: ChatRoutes },
  { path: '/message', route: MessageRoutes },
  { path: '/review', route: ReviewRoutes },
  { path: '/banner', route: BannerRoutes },
  { path: '/payment', route: paymentRoute },
  { path: '/subscription', route: SubscriptionsRotes},
  { path: '/package', route: PackageRoutes},
  { path: '/offer', route: OfferRouter },
  { path: '/notification', route: NotificationRoutes },
  { path: '/bookmark', route: BookmarkRoutes },
  { path: '/booking', route: BookingRoutes },
  { path: '/admin', route: AdminRoutes },
];

apiRoutes.forEach(route => router.use(route.path, route.route));
export default router;