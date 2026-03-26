import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:arryt/l10n/support_locale.dart';

class LocaleProvider extends ChangeNotifier {
  static const _key = 'app_locale';
  Locale? _locale;
  Locale? get locale => _locale;

  LocaleProvider() {
    _loadLocale();
  }

  Future<void> _loadLocale() async {
    final prefs = await SharedPreferences.getInstance();
    final code = prefs.getString(_key);
    if (code != null && _locale == null) {
      _locale = Locale(code);
      notifyListeners();
    }
  }

  Future<void> setLocale(Locale loc) async {
    if (!L10n.support.contains(loc)) return;
    _locale = loc;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, loc.languageCode);
  }

  /// Call this before runApp to preload saved locale
  static Future<Locale> getSavedLocale() async {
    final prefs = await SharedPreferences.getInstance();
    final code = prefs.getString(_key);
    return Locale(code ?? 'uz');
  }

  void initWithLocale(Locale? savedLocale) {
    if (savedLocale != null) {
      _locale = savedLocale;
    }
  }

  void clearLocale() {
    _locale = null;
    notifyListeners();
  }
}
