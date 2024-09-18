import 'package:hive_flutter/hive_flutter.dart';
import 'package:arryt/models/user_data.dart';
import 'package:arryt/models/api_client.dart';
import 'package:hive_flutter/hive_flutter.dart';

class HiveHelper {
  static const String userDataBoxName = 'userDataBox';
  static const String apiClientBoxName = 'apiClientBox';

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
    isHiveInitialized = true;
  }

  static Box<UserData> getUserDataBox() {
    return Hive.box<UserData>(userDataBoxName);
  }

  static Box<ApiClient> getApiClientBox() {
    return Hive.box<ApiClient>(apiClientBoxName);
  }

  static UserData? getUserData() {
    final box = getUserDataBox();
    return box.get('userData');
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
