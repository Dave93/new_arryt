// GENERATED CODE - DO NOT MODIFY BY HAND

// **************************************************************************
// AutoRouterGenerator
// **************************************************************************

// ignore_for_file: type=lint
// coverage:ignore-file

part of 'router.dart';

/// generated route for
/// [BrandsPage]
class BrandsRoute extends PageRouteInfo<void> {
  const BrandsRoute({List<PageRouteInfo>? children})
      : super(
          BrandsRoute.name,
          initialChildren: children,
        );

  static const String name = 'BrandsRoute';

  static PageInfo page = PageInfo(
    name,
    builder: (data) {
      return const BrandsPage();
    },
  );
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

  static PageInfo page = PageInfo(
    name,
    builder: (data) {
      return const CallCenterOrganizationsListPage();
    },
  );
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

  static PageInfo page = PageInfo(
    name,
    builder: (data) {
      return const HomePage();
    },
  );
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

  static PageInfo page = PageInfo(
    name,
    builder: (data) {
      return const InitialPage();
    },
  );
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

  static PageInfo page = PageInfo(
    name,
    builder: (data) {
      return const LoginTypeOtpPage();
    },
  );
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

  static PageInfo page = PageInfo(
    name,
    builder: (data) {
      return const LoginTypePhonePage();
    },
  );
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

  static PageInfo page = PageInfo(
    name,
    builder: (data) {
      final pathParams = data.inheritedPathParams;
      final args = data.argsAs<OrderCustomerCommentsRouteArgs>(
          orElse: () => OrderCustomerCommentsRouteArgs(
                customerId: pathParams.getString('customerId'),
                orderId: pathParams.getString('orderId'),
              ));
      return OrderCustomerCommentsPage(
        key: args.key,
        customerId: args.customerId,
        orderId: args.orderId,
      );
    },
  );
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

  static PageInfo page = PageInfo(
    name,
    builder: (data) {
      return const PrivacyPolicyPage();
    },
  );
}
