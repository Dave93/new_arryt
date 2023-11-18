import 'dart:convert';

import 'package:arryt/models/user_data.dart';
import 'package:equatable/equatable.dart';
import 'package:arryt/bloc/block_imports.dart';

part 'user_data_event.dart';
part 'user_data_state.dart';

class UserDataBloc extends HydratedBloc<UserDataEvent, UserDataState> {
  UserDataBloc()
      : super(UserDataInitial(
            accessToken: '',
            accessTokenExpires: '',
            permissions: const [],
            refreshToken: '',
            roles: const [],
            userProfile: null,
            is_online: false,
            tokenExpires: DateTime.now())) {
    on<UserDataEvent>((event, emit) {
      // TODO: implement event handler
    });
    on<UserDataEventChange>((event, emit) {
      emit(UserDataInitial(
          accessToken: event.accessToken,
          accessTokenExpires: event.accessTokenExpires,
          permissions: event.permissions,
          refreshToken: event.refreshToken,
          roles: event.roles,
          userProfile: event.userProfile,
          is_online: event.is_online,
          tokenExpires: event.tokenExpires));
      // storeUserData(UserDataInitial(
      //     accessToken: event.accessToken,
      //     accessTokenExpires: event.accessTokenExpires,
      //     permissions: event.permissions,
      //     refreshToken: event.refreshToken,
      //     roles: event.roles,
      //     userProfile: event.userProfile,
      //     is_online: event.is_online,
      //     tokenExpires: event.tokenExpires));
    });
    on<UserDataEventLogout>((event, emit) {
      emit(UserDataLogout(
          accessToken: '',
          accessTokenExpires: '',
          permissions: const [],
          refreshToken: '',
          roles: const [],
          userProfile: null,
          is_online: false,
          tokenExpires: DateTime.now()));
    });
  }

  @override
  UserDataState? fromJson(Map<String, dynamic> json) =>
      UserDataInitial.fromJson(json['value']);

  @override
  Map<String, dynamic>? toJson(UserDataState state) =>
      {'value': UserDataInitial.toJson(state)};
}

Future<void> storeUserData(UserDataInitial user) async {
  print({
    'value': {
      'permissions': user.permissions,
      'roles': user.roles.map((e) => e.toJson()).toList(),
      'accessToken': user.accessToken,
      'refreshToken': user.refreshToken,
      'accessTokenExpires': user.accessTokenExpires,
      'userProfile': user.userProfile?.toJson(),
      'is_online': user.is_online,
      'tokenExpires': user.tokenExpires.toIso8601String(),
    }
  });
  await HydratedBloc.storage.write("UserDataBloc", {
    'value': {
      'permissions': user.permissions,
      'roles': user.roles.map((e) => e.toJson()).toList(),
      'accessToken': user.accessToken,
      'refreshToken': user.refreshToken,
      'accessTokenExpires': user.accessTokenExpires,
      'userProfile': user.userProfile?.toJson(),
      'is_online': user.is_online,
      'tokenExpires': user.tokenExpires.toIso8601String(),
    }
  });
}
