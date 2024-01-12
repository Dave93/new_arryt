part of 'api_clients_bloc.dart';

abstract class ApiClientsEvent extends Equatable {
  const ApiClientsEvent();

  @override
  List<Object> get props => [];
}

class ApiClientsAdd extends ApiClientsEvent {
  const ApiClientsAdd({
    required this.apiUrl,
    required this.serviceName,
    required this.isServiceDefault,
  });

  final String apiUrl;
  final String serviceName;
  final bool isServiceDefault;

  @override
  List<Object> get props => [apiUrl, serviceName, isServiceDefault];
}

class ApiClientsRemove extends ApiClientsEvent {
  const ApiClientsRemove({
    required this.apiUrl,
    required this.serviceName,
    required this.isServiceDefault,
  });

  final String apiUrl;
  final String serviceName;
  final bool isServiceDefault;

  @override
  List<Object> get props => [apiUrl, serviceName, isServiceDefault];
}

// Update event where apiUrl is the same
class ApiClientsUpdate extends ApiClientsEvent {
  const ApiClientsUpdate({
    required this.apiUrl,
    required this.serviceName,
    required this.isServiceDefault,
  });

  final String apiUrl;
  final String serviceName;
  final bool isServiceDefault;

  @override
  List<Object> get props => [apiUrl, serviceName, isServiceDefault];
}

class ApiClientsRemoveAllIsServiceDefault extends ApiClientsEvent {
  const ApiClientsRemoveAllIsServiceDefault();
}
