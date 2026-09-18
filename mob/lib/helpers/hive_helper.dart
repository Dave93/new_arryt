import 'package:hive_flutter/hive_flutter.dart';
import 'package:arryt/models/user_data.dart';
import 'package:arryt/models/api_client.dart';

class HiveHelper {
  static const String userDataBoxName = 'userDataBox';
  static const String apiClientBoxName = 'apiClientBox';
  static const String settingsBoxName = 'settingsBox';

  /// Согласие на сбор геолокации. Переживает перезапуск: политика Google Play
  /// требует показать раскрытие до первого доступа к координатам, а не до
  /// выдачи разрешения — разрешение может быть выдано и раньше.
  static const String locationDisclosureKey = 'locationDisclosureAccepted';

  static bool isHiveInitialized = false;

  static Future<void> initHive() async {
    if (isHiveInitialized) {
      return;
    }
    await Hive.initFlutter();
    Hive.registerAdapter(UserDataAdapter());
    Hive.registerAdapter(UserProfileAdapter());
    Hive.registerAdapter(RoleAdapter());
    Hive.registerAdapter(ApiClientAdapter());
    await Hive.openBox<UserData>(userDataBoxName);
    await Hive.openBox<ApiClient>(apiClientBoxName);
    await Hive.openBox(settingsBoxName);
    isHiveInitialized = true;
  }

  static Box<UserData> getUserDataBox() {
    return Hive.box<UserData>(userDataBoxName);
  }

  static Box<ApiClient> getApiClientBox() {
    return Hive.box<ApiClient>(apiClientBoxName);
  }

  static Box getSettingsBox() {
    return Hive.box(settingsBoxName);
  }

  static bool isLocationDisclosureAccepted() {
    if (!Hive.isBoxOpen(settingsBoxName)) {
      return false;
    }
    return getSettingsBox().get(locationDisclosureKey, defaultValue: false)
        as bool;
  }

  static Future<void> setLocationDisclosureAccepted() async {
    await getSettingsBox().put(locationDisclosureKey, true);
  }

  static UserData? getUserData() {
    final box = getUserDataBox();
    return box.get('userData');
  }

  static void clearUserData() {
    final box = getUserDataBox();
    box.clear();
  }

  static void setUserData(UserData userData) {
    final box = getUserDataBox();
    box.put('userData', userData);
  }

  static ApiClient? getDefaultApiClient() {
    final box = getApiClientBox();
    try {
      return box.values.firstWhere((client) => client.isServiceDefault);
    } catch (e) {
      // If no element is found, return null
      return null;
    }
  }

  static void setDefaultApiClient(ApiClient apiClient) {
    final box = getApiClientBox();
    // Remove the previous default client
    box.values.where((client) => client.isServiceDefault).forEach((client) {
      client.isServiceDefault = false;
      box.put(client.key, client);
    });
    // Set the new default client
    apiClient.isServiceDefault = true;
    box.add(apiClient);
  }

  static void setUserDataToken(String accessToken, String refreshToken,
      String accessTokenExpires, DateTime tokenExpires) {
    final box = getUserDataBox();
    final userData = box.get('userData');
    if (userData != null) {
      userData.accessToken = accessToken;
      userData.refreshToken = refreshToken;
      userData.accessTokenExpires = accessTokenExpires;
      userData.tokenExpires = tokenExpires;
      box.put('userData', userData);
    }
  }
}
