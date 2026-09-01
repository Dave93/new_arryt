import 'package:animated_snack_bar/animated_snack_bar.dart';
import 'package:arryt/helpers/api_server.dart';
import 'package:arryt/helpers/hive_helper.dart';
import 'package:arryt/models/user_data.dart';
import 'package:arryt/router.dart';
import 'package:auto_route/auto_route.dart';
import 'package:auto_size_text/auto_size_text.dart';
import 'package:flutter/material.dart';
import 'package:arryt/l10n/app_localizations.dart';
import 'package:url_launcher/url_launcher.dart';

class NoRoleSet extends StatelessWidget {
  const NoRoleSet({super.key});

  @override
  Widget build(BuildContext context) {
    return const NoRoleSetView();
  }
}

class NoRoleSetView extends StatefulWidget {
  const NoRoleSetView({super.key});

  @override
  State<NoRoleSetView> createState() => _NoRoleSetViewState();
}

class _NoRoleSetViewState extends State<NoRoleSetView> {
  String adminPhone = '';
  bool _isReloading = false;

  Future<void> _loadAdminPhone() async {
    try {
      final response =
          await ApiServer().get('/api/system_configs/public/admin_phone', null);
      final value = response.data['value'];
      if (mounted && value is String && value.isNotEmpty) {
        setState(() {
          adminPhone = value;
        });
      }
    } catch (e) {
      // Телефон поддержки не критичен для экрана: без него просто прячем
      // кнопку звонка, а не встречаем пользователя ошибкой.
      debugPrint('admin_phone load failed: $e');
    }
  }

  Future<void> _logout(BuildContext context) async {
    // Кнопка по смыслу — сменить номер: чистим сессию и возвращаем на ввод.
    HiveHelper.clearUserData();
    await AutoRouter.of(context).replaceAll([LoginTypePhoneRoute()]);
  }

  Future<void> _reloadUserData(BuildContext context) async {
    if (_isReloading) return;

    setState(() {
      _isReloading = true;
    });

    try {
      final response = await ApiServer().get('/api/users/reload', null);
      final user = UserData.fromMap(response.data);
      HiveHelper.setUserData(user);

      // Домашний экран слушает Hive-бокс: как только появится роль,
      // он перестроится сам, поэтому навигация здесь не нужна.
      if (mounted && user.roles.isEmpty) {
        AnimatedSnackBar.material(
          AppLocalizations.of(context)!.noRoleSet,
          type: AnimatedSnackBarType.info,
        ).show(context);
      }
    } catch (e) {
      if (mounted) {
        AnimatedSnackBar.material(
          AppLocalizations.of(context)!.error_label,
          type: AnimatedSnackBarType.error,
        ).show(context);
      }
    } finally {
      if (mounted) {
        setState(() {
          _isReloading = false;
        });
      }
    }
  }

  void _makePhoneCall(String phoneNumber) async {
    final Uri launchUri = Uri(
      scheme: 'tel',
      path: phoneNumber,
    );
    await launchUrl(launchUri);
  }

  @override
  void initState() {
    // TODO: implement initState
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadAdminPhone();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).primaryColor,
      body: SafeArea(
        child: Center(
          child: Column(
            children: [
              const Spacer(),
              AutoSizeText(
                AppLocalizations.of(context)!
                    .noRoleSet
                    .replaceAll(" ", "\n")
                    .toUpperCase(),
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleLarge!.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(
                height: 10,
              ),
              // Без номера поддержки кнопка звонка бесполезна: `tel:` с пустым
              // путём просто ничего не открывает.
              if (adminPhone.isNotEmpty)
                ElevatedButton(
                  onPressed: () async {
                    _makePhoneCall(adminPhone);
                  },
                  style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green.shade400,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(30),
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 50,
                        vertical: 15,
                      )),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.call),
                      const SizedBox(
                        width: 10,
                      ),
                      Text(AppLocalizations.of(context)!.callUs.toUpperCase()),
                    ],
                  )),
              Spacer(),
              ElevatedButton(
                  onPressed: _isReloading
                      ? null
                      : () {
                          _reloadUserData(context);
                        },
                  style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: Theme.of(context).primaryColor,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(30),
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 50,
                        vertical: 15,
                      )),
                  child: Text(
                      AppLocalizations.of(context)!.refresh.toUpperCase())),
              const SizedBox(height: 10),
              ElevatedButton(
                  onPressed: () {
                    _logout(context);
                  },
                  style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(30),
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 50,
                        vertical: 15,
                      )),
                  child: AutoSizeText(
                    AppLocalizations.of(context)!.changeNumber.toUpperCase(),
                    maxLines: 3,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  )),
              const SizedBox(height: 20)
            ],
          ),
        ),
      ),
    );
  }
}
