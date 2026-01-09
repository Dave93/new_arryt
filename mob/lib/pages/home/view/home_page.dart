import 'package:arryt/helpers/hive_helper.dart';
import 'package:arryt/main.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:arryt/models/user_data.dart';
import 'package:arryt/pages/orders_management/orders_management.dart';
import 'package:auto_route/auto_route.dart';
import 'package:disable_battery_optimization/disable_battery_optimization.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:arryt/pages/orders/orders.dart';
import 'package:arryt/pages/profile/profile.dart';
import 'package:arryt/pages/settings/settings.dart';
import 'package:geolocator/geolocator.dart';
import 'package:persistent_bottom_nav_bar/persistent_bottom_nav_bar.dart';
import 'package:arryt/l10n/app_localizations.dart';
import 'package:upgrader/upgrader.dart';
import '../../../router.dart';
import '../../../widgets/home/check_permissions.dart';
import '../../../widgets/no_role_set.dart';
import '../../manager/couriers_list.dart';
import '../../orders_history/orders_history.dart';

@RoutePage()
class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return const HomeViewPage();
  }
}

class HomeViewPage extends StatefulWidget {
  const HomeViewPage({super.key});

  @override
  State<HomeViewPage> createState() => _HomeViewPageState();
}

class _HomeViewPageState extends State<HomeViewPage> {
  static bool _permissionsChecked = false;

  Future checkPermissions() async {
    if (_permissionsChecked) return;
    _permissionsChecked = true;

    bool isShowPermissionsPage = false;
    if (defaultTargetPlatform == TargetPlatform.android) {
      bool? isBatteryOptimizationDisabled =
          await DisableBatteryOptimization.isBatteryOptimizationDisabled;

      print('isBatteryOptimizationDisabled: $isBatteryOptimizationDisabled');
      if (isBatteryOptimizationDisabled == false) {
        isShowPermissionsPage = true;
      }
    }

    // check if location permission is granted to always
    LocationPermission permission;
    permission = await Geolocator.checkPermission();
    if (permission != LocationPermission.always) {
      isShowPermissionsPage = true;
    }

    if (isShowPermissionsPage && mounted) {
      showModalBottomSheet(
          context: context,
          isDismissible: false,
          enableDrag: false,
          builder: (context) => const HomeCheckPermissions());
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      checkPermissions();
    });
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<Box<UserData>>(
        valueListenable: HiveHelper.getUserDataBox().listenable(),
        builder: (context, box, _) {
          final userData = HiveHelper.getUserData();
          if (userData != null) {
            Role? userRole;
            if (userData.roles.isNotEmpty) {
              userRole = userData.roles.first;
            }
            if (userRole == null) {
              return const NoRoleSet();
            }

            switch (userRole.code) {
              case 'courier':
                return UpgradeAlert(
                  child: PersistentTabView(
                    context,
                    controller: PersistentTabController(initialIndex: 1),
                    screens: _buildScreens(userRole),
                    items: [
                      PersistentBottomNavBarItem(
                        icon: const Icon(Icons.person),
                        title: AppLocalizations.of(context)!.profile,
                        activeColorPrimary: Theme.of(context).primaryColor,
                        inactiveColorPrimary: Colors.grey,
                      ),
                      PersistentBottomNavBarItem(
                        icon: const Icon(Icons.list),
                        title: AppLocalizations.of(context)!.orders,
                        activeColorPrimary: Theme.of(context).primaryColor,
                        inactiveColorPrimary: Colors.grey,
                      ),
                      PersistentBottomNavBarItem(
                        icon: const Icon(Icons.history_rounded),
                        title: AppLocalizations.of(context)!.ordersHistory.replaceAll('\n', ' '),
                        activeColorPrimary: Theme.of(context).primaryColor,
                        inactiveColorPrimary: Colors.grey,
                      ),
                      PersistentBottomNavBarItem(
                        icon: const Icon(Icons.settings),
                        title: AppLocalizations.of(context)!.settings,
                        activeColorPrimary: Theme.of(context).primaryColor,
                        inactiveColorPrimary: Colors.grey,
                      ),
                    ],
                    backgroundColor: Colors.white,
                    handleAndroidBackButtonPress: true,
                    resizeToAvoidBottomInset: true,
                    stateManagement: true,
                    decoration: NavBarDecoration(
                      borderRadius: BorderRadius.circular(10.0),
                      colorBehindNavBar: Colors.white,
                    ),
                    navBarStyle: NavBarStyle.style1,
                  ),
                );
              case 'manager':
                return PersistentTabView(
                  context,
                  controller: PersistentTabController(initialIndex: 1),
                  screens: _buildScreens(userRole),
                  items: [
                    PersistentBottomNavBarItem(
                      icon: const Icon(Icons.person),
                      title: AppLocalizations.of(context)!.profile,
                      activeColorPrimary: Theme.of(context).primaryColor,
                      inactiveColorPrimary: Colors.grey,
                    ),
                    PersistentBottomNavBarItem(
                      icon: const Icon(Icons.account_balance_wallet_outlined),
                      title: AppLocalizations.of(context)!.couriersListTabLabel,
                      activeColorPrimary: Theme.of(context).primaryColor,
                      inactiveColorPrimary: Colors.grey,
                    ),
                    PersistentBottomNavBarItem(
                      icon: const Icon(Icons.history_rounded),
                      title: AppLocalizations.of(context)!.ordersHistory.replaceAll('\n', ' '),
                      activeColorPrimary: Theme.of(context).primaryColor,
                      inactiveColorPrimary: Colors.grey,
                    ),
                    PersistentBottomNavBarItem(
                      icon: const Icon(Icons.assignment_outlined),
                      title: AppLocalizations.of(context)!.ordersManagement.replaceAll('\n', ' '),
                      activeColorPrimary: Theme.of(context).primaryColor,
                      inactiveColorPrimary: Colors.grey,
                    ),
                    PersistentBottomNavBarItem(
                      icon: const Icon(Icons.settings),
                      title: AppLocalizations.of(context)!.settings,
                      activeColorPrimary: Theme.of(context).primaryColor,
                      inactiveColorPrimary: Colors.grey,
                    ),
                  ],
                  backgroundColor: Colors.white,
                  handleAndroidBackButtonPress: true,
                  resizeToAvoidBottomInset: true,
                  stateManagement: true,
                  decoration: NavBarDecoration(
                    borderRadius: BorderRadius.circular(10.0),
                    colorBehindNavBar: Colors.white,
                  ),
                  navBarStyle: NavBarStyle.style1,
                );
              default:
                return const NoRoleSet();
            }
          } else {
            getIt<AppRouter>().replace(LoginTypePhoneRoute());
            return const SizedBox(
              height: 0,
            );
          }
        });
  }

  List<Widget> _buildScreens(Role role) {
    if (role.code == 'courier') {
      return [
        const ProfilePageView(),
        OrdersPage(),
        const OrdersHistory(),
        const SettingsPage()
      ];
    } else if (role.code == 'manager') {
      return [
        const ProfilePageView(),
        const ManagerCouriersList(),
        const OrdersHistory(),
        const OrdersManagement(),
        const SettingsPage()
      ];
    } else {
      return [];
    }
  }
}
