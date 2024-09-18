import 'package:hive/hive.dart';

part 'api_client.g.dart';

@HiveType(typeId: 3)
class ApiClient extends HiveObject {
  @HiveField(0)
  String apiUrl;

  @HiveField(1)
  String serviceName;

  @HiveField(2)
  bool isServiceDefault;

  ApiClient({
    required this.apiUrl,
    required this.serviceName,
    required this.isServiceDefault,
  });

  factory ApiClient.fromMap(Map<String, dynamic> map) {
    return ApiClient(
      apiUrl: map['apiUrl'] as String,
      serviceName: map['serviceName'] as String,
      isServiceDefault: map['isServiceDefault'] as bool,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'apiUrl': apiUrl,
      'serviceName': serviceName,
      'isServiceDefault': isServiceDefault,
    };
  }
}
