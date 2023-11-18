import 'dart:convert';

import 'package:equatable/equatable.dart';
import 'package:arryt/bloc/block_imports.dart';

part 'api_clients_event.dart';
part 'api_clients_state.dart';

class ApiClientsBloc extends HydratedBloc<ApiClientsEvent, ApiClientsState> {
  ApiClientsBloc() : super(const ApiClientsInitial(apiClients: [])) {
    on<ApiClientsAdd>((event, emit) {
      final apiClients = List<ApiClients>.from(state.apiClients);
      // print(apiClients);
      apiClients.add(ApiClients(
        apiUrl: event.apiUrl,
        serviceName: event.serviceName,
        isServiceDefault: event.isServiceDefault,
      ));
      // print(apiClients);
      emit(ApiClientsInitial(apiClients: apiClients));
    });
    on<ApiClientsRemove>((event, emit) {
      final apiClients = state.apiClients;
      apiClients.removeWhere((element) =>
          element.apiUrl == event.apiUrl &&
          element.serviceName == event.serviceName &&
          element.isServiceDefault == event.isServiceDefault);
      emit(ApiClientsInitial(apiClients: apiClients));
    });
    on<ApiClientsUpdate>((event, emit) {
      final apiClients = state.apiClients;
      apiClients.removeWhere((element) =>
          element.apiUrl == event.apiUrl &&
          element.serviceName == event.serviceName &&
          element.isServiceDefault == event.isServiceDefault);
      apiClients.add(ApiClients(
        apiUrl: event.apiUrl,
        serviceName: event.serviceName,
        isServiceDefault: event.isServiceDefault,
      ));
      emit(ApiClientsInitial(apiClients: apiClients));
    });
    on<ApiClientsRemoveAllIsServiceDefault>((event, emit) {
      final apiClients = List<ApiClients>.from(state.apiClients);
      apiClients.removeWhere((element) => element.isServiceDefault == true);
      emit(ApiClientsInitial(apiClients: apiClients));
    });
  }

  @override
  ApiClientsState? fromJson(Map<String, dynamic> json) => ApiClientsInitial(
      apiClients: List<ApiClients>.from(jsonDecode(json['value'])
          .map((e) => ApiClients.fromJson(e))
          .toList()));

  @override
  Map<String, dynamic>? toJson(ApiClientsState state) =>
      {'value': jsonEncode(state.apiClients)};
}
