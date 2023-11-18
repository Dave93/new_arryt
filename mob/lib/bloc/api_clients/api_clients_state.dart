// ignore_for_file: public_member_api_docs, sort_constructors_first

part of 'api_clients_bloc.dart';

abstract class ApiClientsState extends Equatable {
  const ApiClientsState({
    required this.apiClients,
  });
  final List<ApiClients> apiClients;

  @override
  List<Object> get props => [apiClients];
}

class ApiClientsInitial extends ApiClientsState {
  @override
  final List<ApiClients> apiClients;
  const ApiClientsInitial({required this.apiClients})
      : super(apiClients: apiClients);
}

class ApiClients extends Equatable {
  const ApiClients({
    required this.apiUrl,
    required this.serviceName,
    required this.isServiceDefault,
  });

  final String apiUrl;
  final String serviceName;
  final bool isServiceDefault;

  @override
  List<Object> get props => [apiUrl, serviceName, isServiceDefault];

  ApiClients copyWith({
    String? apiUrl,
    String? serviceName,
    bool? isServiceDefault,
  }) {
    return ApiClients(
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

  factory ApiClients.fromMap(Map<String, dynamic> map) {
    return ApiClients(
      apiUrl: map['apiUrl'] as String,
      serviceName: map['serviceName'] as String,
      isServiceDefault: map['isServiceDefault'] as bool,
    );
  }

  String toJson() => json.encode(toMap());

  factory ApiClients.fromJson(String source) =>
      ApiClients.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  bool get stringify => true;
}
