import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:hive/hive.dart';

part 'user_data.g.dart';

@HiveType(typeId: 0)
class UserProfile extends HiveObject {
  @HiveField(0)
  String identity;

  @HiveField(1)
  String? first_name;

  @HiveField(2)
  String? last_name;

  @HiveField(3)
  String? phone;

  @HiveField(4)
  bool? is_super_user;

  @HiveField(5)
  List<String>? terminal_id;

  @HiveField(6)
  int? wallet_balance;

  UserProfile({
    required this.identity,
    this.first_name,
    this.last_name,
    this.phone,
    this.is_super_user,
    this.terminal_id,
    this.wallet_balance,
  });

  factory UserProfile.fromMap(Map<String, dynamic> map) {
    return UserProfile(
      identity: map['id'] as String,
      first_name: map['first_name'] as String?,
      last_name: map['last_name'] as String?,
      phone: map['phone'] as String?,
      is_super_user: map['is_super_user'] as bool?,
      terminal_id: map['terminal_id'] != null
          ? List<String>.from(map['terminal_id'] as List)
          : null,
      wallet_balance: map['wallet_balance'] as int?,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': identity,
      'first_name': first_name,
      'last_name': last_name,
      'phone': phone,
      'is_super_user': is_super_user,
      'terminal_id': terminal_id,
      'wallet_balance': wallet_balance,
    };
  }

  String toJson() => json.encode(toMap());

  factory UserProfile.fromJson(String source) =>
      UserProfile.fromMap(json.decode(source) as Map<String, dynamic>);
}

@HiveType(typeId: 1)
class Role extends HiveObject {
  @HiveField(0)
  String name;

  @HiveField(1)
  String code;

  @HiveField(2)
  bool active;

  Role({
    required this.name,
    required this.code,
    required this.active,
  });

  factory Role.fromMap(Map<String, dynamic> map) {
    return Role(
      name: map['name'] as String,
      code: map['code'] as String,
      active: map['active'] as bool,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'code': code,
      'active': active,
    };
  }

  String toJson() => json.encode(toMap());

  factory Role.fromJson(String source) =>
      Role.fromMap(json.decode(source) as Map<String, dynamic>);
}

@HiveType(typeId: 2)
class UserData extends HiveObject {
  @HiveField(0)
  String identity;

  @HiveField(1)
  List<String> permissions;

  @HiveField(2)
  String? accessToken;

  @HiveField(3)
  String? refreshToken;

  @HiveField(4)
  String? accessTokenExpires;

  @HiveField(5)
  bool is_online;

  @HiveField(6)
  DateTime tokenExpires;

  @HiveField(7)
  UserProfile? userProfile;

  @HiveField(8)
  List<Role> roles;

  UserData({
    required this.identity,
    required this.permissions,
    this.accessToken,
    this.refreshToken,
    this.accessTokenExpires,
    required this.is_online,
    required this.tokenExpires,
    this.userProfile,
    required this.roles,
  });

  factory UserData.fromMap(Map<String, dynamic> map) {
    return UserData(
      identity: map['user']['id'] as String,
      permissions: List<String>.from(
          map['access']['additionalPermissions'] as List<dynamic>),
      accessToken: map['token']['accessToken'] as String?,
      refreshToken: map['token']['refreshToken'] as String?,
      accessTokenExpires: map['token']['accessTokenExpires'] as String?,
      is_online: map['user']['is_online'] as bool,
      tokenExpires: DateTime.now().add(Duration(
          hours: int.parse(map['token']['accessTokenExpires'].split('h')[0]))),
      userProfile: UserProfile.fromMap(map['user'] as Map<String, dynamic>),
      roles: List<Role>.from((map['access']['roles'] as List<dynamic>)
          .map((e) => Role.fromMap(e))),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': identity,
      'permissions': permissions,
      'accessToken': accessToken,
      'refreshToken': refreshToken,
      'accessTokenExpires': accessTokenExpires,
      'is_online': is_online,
      'tokenExpires': tokenExpires.millisecondsSinceEpoch,
      'userProfile': userProfile?.toMap(),
      'roles': roles.map((e) => e.toMap()).toList(),
    };
  }

  String toJson() => json.encode(toMap());

  factory UserData.fromJson(String source) =>
      UserData.fromMap(json.decode(source) as Map<String, dynamic>);
}
