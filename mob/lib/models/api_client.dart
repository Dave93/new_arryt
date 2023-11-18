// ignore_for_file: public_member_api_docs, sort_constructors_first
import 'dart:convert';

import 'package:objectbox/objectbox.dart';

@Entity()
class ApiClient {
  int id = 0;
  @Index()
  String apiUrl;
  String serviceName;
  bool isServiceDefault;
  ApiClient({
    required this.apiUrl,
    required this.serviceName,
    required this.isServiceDefault,
  });

  ApiClient copyWith({
    int? id,
    String? apiUrl,
    String? serviceName,
    bool? isServiceDefault,
  }) {
    return ApiClient(
      apiUrl: apiUrl ?? this.apiUrl,
      serviceName: serviceName ?? this.serviceName,
      isServiceDefault: isServiceDefault ?? this.isServiceDefault,
    );
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'apiUrl': apiUrl,
      'serviceName': serviceName,
      'isServiceDefault': isServiceDefault,
    };
  }

  factory ApiClient.fromMap(Map<String, dynamic> map) {
    return ApiClient(
      apiUrl: map['apiUrl'] as String,
      serviceName: map['serviceName'] as String,
      isServiceDefault: map['isServiceDefault'] as bool,
    );
  }

  String toJson() => json.encode(toMap());

  factory ApiClient.fromJson(String source) =>
      ApiClient.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() {
    return 'ApiClient(apiUrl: $apiUrl, serviceName: $serviceName, isServiceDefault: $isServiceDefault)';
  }

  @override
  bool operator ==(covariant ApiClient other) {
    if (identical(this, other)) return true;

    return other.apiUrl == apiUrl &&
        other.serviceName == serviceName &&
        other.isServiceDefault == isServiceDefault;
  }

  @override
  int get hashCode {
    return apiUrl.hashCode ^ serviceName.hashCode ^ isServiceDefault.hashCode;
  }
}
