// GENERATED CODE - DO NOT MODIFY BY HAND

// **************************************************************************
// AutoRouterGenerator
// **************************************************************************

// ignore_for_file: type=lint
// coverage:ignore-file

part of 'router.dart';

abstract class _$AppRouter extends RootStackRouter {
  // ignore: unused_element
  _$AppRouter({super.navigatorKey});

  @override
  final Map<String, PageFactory> pagesMap = {
    BrandsRoute.name: (routeData) {
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: const BrandsPage(),
      );
    },
    CallCenterOrganizationsListRoute.name: (routeData) {
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: const CallCenterOrganizationsListPage(),
      );
    },
    HomeRoute.name: (routeData) {
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: const HomePage(),
      );
    },
    InitialRoute.name: (routeData) {
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: const InitialPage(),
      );
    },
    LoginTypeOtpRoute.name: (routeData) {
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: const LoginTypeOtpPage(),
      );
    },
    LoginTypePhoneRoute.name: (routeData) {
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: const LoginTypePhonePage(),
      );
    },
    OrderCustomerCommentsRoute.name: (routeData) {
      final pathParams = routeData.inheritedPathParams;
      final args = routeData.argsAs<OrderCustomerCommentsRouteArgs>(
          orElse: () => OrderCustomerCommentsRouteArgs(
                customerId: pathParams.getString('customerId'),
                orderId: pathParams.getString('orderId'),
              ));
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: OrderCustomerCommentsPage(
          key: args.key,
          customerId: args.customerId,
          orderId: args.orderId,
        ),
      );
    },
    PrivacyPolicyRoute.name: (routeData) {
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: const PrivacyPolicyPage(),
      );
    },
    QRRoute.name: (routeData) {
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: const QRPage(),
      );
    },
  };
}

/// generated route for
/// [BrandsPage]
class BrandsRoute extends PageRouteInfo<void> {
  const BrandsRoute({List<PageRouteInfo>? children})
      : super(
          BrandsRoute.name,
          initialChildren: children,
        );

  static const String name = 'BrandsRoute';

  static const PageInfo<void> page = PageInfo<void>(name);
}

/// generated route for
/// [CallCenterOrganizationsListPage]
class CallCenterOrganizationsListRoute extends PageRouteInfo<void> {
  const CallCenterOrganizationsListRoute({List<PageRouteInfo>? children})
      : super(
          CallCenterOrganizationsListRoute.name,
          initialChildren: children,
        );

  static const String name = 'CallCenterOrganizationsListRoute';

  static const PageInfo<void> page = PageInfo<void>(name);
}

/// generated route for
/// [HomePage]
class HomeRoute extends PageRouteInfo<void> {
  const HomeRoute({List<PageRouteInfo>? children})
      : super(
          HomeRoute.name,
          initialChildren: children,
        );

  static const String name = 'HomeRoute';

  static const PageInfo<void> page = PageInfo<void>(name);
}

/// generated route for
/// [InitialPage]
class InitialRoute extends PageRouteInfo<void> {
  const InitialRoute({List<PageRouteInfo>? children})
      : super(
          InitialRoute.name,
          initialChildren: children,
        );

  static const String name = 'InitialRoute';

  static const PageInfo<void> page = PageInfo<void>(name);
}

/// generated route for
/// [LoginTypeOtpPage]
class LoginTypeOtpRoute extends PageRouteInfo<void> {
  const LoginTypeOtpRoute({List<PageRouteInfo>? children})
      : super(
          LoginTypeOtpRoute.name,
          initialChildren: children,
        );

  static const String name = 'LoginTypeOtpRoute';

  static const PageInfo<void> page = PageInfo<void>(name);
}

/// generated route for
/// [LoginTypePhonePage]
class LoginTypePhoneRoute extends PageRouteInfo<void> {
  const LoginTypePhoneRoute({List<PageRouteInfo>? children})
      : super(
          LoginTypePhoneRoute.name,
          initialChildren: children,
        );

  static const String name = 'LoginTypePhoneRoute';

  static const PageInfo<void> page = PageInfo<void>(name);
}

/// generated route for
/// [OrderCustomerCommentsPage]
class OrderCustomerCommentsRoute
    extends PageRouteInfo<OrderCustomerCommentsRouteArgs> {
  OrderCustomerCommentsRoute({
    Key? key,
    required String customerId,
    required String orderId,
    List<PageRouteInfo>? children,
  }) : super(
          OrderCustomerCommentsRoute.name,
          args: OrderCustomerCommentsRouteArgs(
            key: key,
            customerId: customerId,
            orderId: orderId,
          ),
          rawPathParams: {
            'customerId': customerId,
            'orderId': orderId,
          },
          initialChildren: children,
        );

  static const String name = 'OrderCustomerCommentsRoute';

  static const PageInfo<OrderCustomerCommentsRouteArgs> page =
      PageInfo<OrderCustomerCommentsRouteArgs>(name);
}

class OrderCustomerCommentsRouteArgs {
  const OrderCustomerCommentsRouteArgs({
    this.key,
    required this.customerId,
    required this.orderId,
  });

  final Key? key;

  final String customerId;

  final String orderId;

  @override
  String toString() {
    return 'OrderCustomerCommentsRouteArgs{key: $key, customerId: $customerId, orderId: $orderId}';
  }
}

/// generated route for
/// [PrivacyPolicyPage]
class PrivacyPolicyRoute extends PageRouteInfo<void> {
  const PrivacyPolicyRoute({List<PageRouteInfo>? children})
      : super(
          PrivacyPolicyRoute.name,
          initialChildren: children,
        );

  static const String name = 'PrivacyPolicyRoute';

  static const PageInfo<void> page = PageInfo<void>(name);
}

/// generated route for
/// [QRPage]
class QRRoute extends PageRouteInfo<void> {
  const QRRoute({List<PageRouteInfo>? children})
      : super(
          QRRoute.name,
          initialChildren: children,
        );

  static const String name = 'QRRoute';

  static const PageInfo<void> page = PageInfo<void>(name);
}
