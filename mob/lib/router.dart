import 'package:arryt/pages/callcenter/organizations_list.dart';
import 'package:arryt/pages/privacy/index.dart';
import 'package:auto_route/auto_route.dart';
import 'package:flutter/material.dart';
import 'package:arryt/pages/brands/brands.dart';
import 'package:arryt/pages/home/view/home_page.dart';
import 'package:arryt/pages/initial.dart';
import 'package:arryt/pages/login/type_otp.dart';
import 'package:arryt/pages/login/type_phone.dart';
import 'package:arryt/pages/qr/qr.dart';
import 'package:arryt/widgets/orders/order_customer_comments.dart';

part 'router.gr.dart';

@AutoRouterConfig(
  replaceInRouteName: 'Page,Route',
)
class AppRouter extends _$AppRouter {
  @override
  List<AutoRoute> get routes => [
        AutoRoute(page: InitialRoute.page, initial: true),
        AutoRoute(page: HomeViewRoute.page, path: '/home'),
        AutoRoute(page: QRRoute.page, path: '/qr'),
        AutoRoute(page: LoginTypePhoneRoute.page, path: '/login/type-phone'),
        AutoRoute(page: LoginTypeOtpRoute.page, path: '/login/type-otp'),
        AutoRoute(page: BrandsRoute.page, path: '/brands'),
        AutoRoute(
            page: OrderCustomerCommentsRoute.page,
            path: '/order/customer-comments/:customerId/:orderId'),
        AutoRoute(
            page: CallCenterOrganizationsListRoute.page,
            path: '/organizations'),
        AutoRoute(page: PrivacyPolicyRoute.page, path: '/privacy'),
      ];
}
