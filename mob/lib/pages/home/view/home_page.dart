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
  int _currentIndex = 1;

  Future checkPermissions() async {
    if (_permissionsChecked) return;
    _permissionsChecked = true;

    bool isShowPermissionsPage = false;
    if (defaultTargetPlatform == TargetPlatform.android) {
      bool? isBatteryOptimizationDisabled =
          await DisableBatteryOptimization.isBatteryOptimizationDisabled;

      if (isBatteryOptimizationDisabled == false) {
        isShowPermissionsPage = true;
      }
    }

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

            final screens = _buildScreens(userRole);
            final navItems = _buildNavItems(userRole, context);

            if (screens.isEmpty) return const NoRoleSet();

            Widget body = Scaffold(
              body: IndexedStack(
                index: _currentIndex,
                children: screens,
              ),
              bottomNavigationBar: SafeArea(
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.06),
                        blurRadius: 12,
                        offset: const Offset(0, -2),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: List.generate(navItems.length, (index) {
                      final item = navItems[index];
                      final isActive = _currentIndex == index;
                      return _buildNavItem(
                        icon: item['icon'] as IconData,
                        activeIcon: item['activeIcon'] as IconData,
                        label: item['label'] as String,
                        isActive: isActive,
                        onTap: () => setState(() => _currentIndex = index),
                      );
                    }),
                  ),
                ),
              ),
            );

            if (userRole.code == 'courier') {
              return UpgradeAlert(child: body);
            }
            return body;
          } else {
            getIt<AppRouter>().replace(LoginTypePhoneRoute());
            return const SizedBox(height: 0);
          }
        });
  }

  Widget _buildNavItem({
    required IconData icon,
    required IconData activeIcon,
    required String label,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    final color = isActive
        ? Theme.of(context).primaryColor
        : Colors.grey.shade600;

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeInOut,
        padding: EdgeInsets.symmetric(
          horizontal: isActive ? 16 : 12,
          vertical: 8,
        ),
        decoration: BoxDecoration(
          color: isActive
              ? Theme.of(context).primaryColor.withOpacity(0.12)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isActive ? activeIcon : icon,
              color: color,
              size: 22,
            ),
            if (isActive) ...[
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  color: color,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  List<Map<String, dynamic>> _buildNavItems(
      Role role, BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    if (role.code == 'courier') {
      return [
        {'icon': Icons.person_outline, 'activeIcon': Icons.person, 'label': l10n.profile},
        {'icon': Icons.list_alt_outlined, 'activeIcon': Icons.list_alt, 'label': l10n.orders},
        {'icon': Icons.history_outlined, 'activeIcon': Icons.history, 'label': l10n.ordersHistory.replaceAll('\n', ' ')},
        {'icon': Icons.settings_outlined, 'activeIcon': Icons.settings, 'label': l10n.settings},
      ];
    } else if (role.code == 'manager') {
      return [
        {'icon': Icons.person_outline, 'activeIcon': Icons.person, 'label': l10n.profile},
        {'icon': Icons.account_balance_wallet_outlined, 'activeIcon': Icons.account_balance_wallet, 'label': l10n.couriersListTabLabel},
        {'icon': Icons.history_outlined, 'activeIcon': Icons.history, 'label': l10n.ordersHistory.replaceAll('\n', ' ')},
        // {'icon': Icons.assignment_outlined, 'activeIcon': Icons.assignment, 'label': l10n.ordersManagement.replaceAll('\n', ' ')},
        {'icon': Icons.settings_outlined, 'activeIcon': Icons.settings, 'label': l10n.settings},
      ];
    }
    return [];
  }

  List<Widget> _buildScreens(Role role) {
    if (role.code == 'courier') {
      return [
        const ProfilePageView(),
        OrdersPage(),
        const OrdersHistory(),
        const SettingsPage(),
      ];
    } else if (role.code == 'manager') {
      return [
        const ProfilePageView(),
        const ManagerCouriersList(),
        const OrdersHistory(),
        // const OrdersManagement(),
        const SettingsPage(),
      ];
    } else {
      return [];
    }
  }
}
