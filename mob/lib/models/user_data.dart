// ignore_for_file: public_member_api_docs, sort_constructors_first
import 'dart:convert';

import 'package:flutter/foundation.dart';

import 'package:objectbox/objectbox.dart';

@Entity()
class UserProfile {
  int id = 0;
  @Index()
  String identity = '';
  String? first_name;
  String? last_name;
  String? phone;
  bool? is_super_user;
  List<String>? terminal_id;
  int? wallet_balance;

  UserProfile(
      {required this.identity,
      required this.first_name,
      required this.last_name,
      required this.phone,
      required this.is_super_user,
      required this.terminal_id,
      required this.wallet_balance});

  UserProfile copyWith({
    String? identity,
    String? first_name,
    String? last_name,
    String? phone,
    bool? is_super_user,
    List<String>? terminal_id,
    int? wallet_balance,
  }) {
    return UserProfile(
      identity: identity ?? this.identity,
      first_name: this.first_name ?? '',
      last_name: this.last_name ?? '',
      phone: this.phone ?? '',
      is_super_user: this.is_super_user ?? false,
      terminal_id: this.terminal_id ?? [],
      wallet_balance: this.wallet_balance ?? 0,
    );
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'id': identity,
      'first_name': first_name,
      'last_name': last_name,
      'phone': phone,
      'is_super_user': is_super_user,
      'terminal_id': terminal_id,
      'wallet_balance': wallet_balance,
    };
  }

  factory UserProfile.fromMap(Map<String, dynamic> map) {
    return UserProfile(
      identity: map['id'] as String,
      first_name:
          map['first_name'] != null ? map['first_name'] as String : null,
      last_name: map['last_name'] != null ? map['last_name'] as String : null,
      phone: map['phone'] != null ? map['phone'] as String : null,
      is_super_user:
          map['is_super_user'] != null ? map['is_super_user'] as bool : null,
      terminal_id: map['terminal_id'] != null
          ? (map['terminal_id'] as List<dynamic>)
              .map((e) => e as String)
              .toList()
          : null,
      wallet_balance: map['wallet_balance'] ?? 0,
    );
  }

  String toJson() => json.encode(toMap());

  factory UserProfile.fromJson(String source) =>
      UserProfile.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() {
    return 'UserProfileModel(first_name: $first_name, last_name: $last_name, phone: $phone, is_super_user: $is_super_user, identity: $identity)';
  }

  @override
  bool operator ==(covariant UserProfile other) {
    if (identical(this, other)) return true;

    return other.first_name == first_name &&
        other.last_name == last_name &&
        other.phone == phone &&
        other.is_super_user == is_super_user &&
        other.identity == identity &&
        other.wallet_balance == wallet_balance;
  }

  @override
  int get hashCode {
    return first_name.hashCode ^
        last_name.hashCode ^
        phone.hashCode ^
        is_super_user.hashCode ^
        identity.hashCode ^
        wallet_balance.hashCode;
  }
}

@Entity()
class Role {
  int id = 0;
  final String name;
  @Index()
  final String code;
  final bool active;

  Role({
    required this.name,
    required this.code,
    required this.active,
  });

  Role copyWith({
    String? name,
    String? code,
    bool? active,
  }) {
    return Role(
        name: name ?? this.name,
        active: active ?? this.active,
        code: code ?? this.code);
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'name': name,
      'code': code,
      'active': active,
    };
  }

  factory Role.fromMap(Map<String, dynamic> map) {
    return Role(
      name: map['name'] as String,
      code: map['code'] as String,
      active: map['active'] as bool,
    );
  }

  String toJson() => json.encode(toMap());

  factory Role.fromJson(String source) =>
      Role.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() => 'Role(name: $name, active: $active, code: $code)';

  @override
  bool operator ==(covariant Role other) {
    if (identical(this, other)) return true;

    return other.name == name && other.active == active && other.code == code;
  }

  @override
  int get hashCode => name.hashCode ^ active.hashCode;
}

@Entity()
class UserData {
  @Id()
  int id = 0;

  String identity;
  List<String> permissions;
  String? accessToken;
  String? refreshToken;
  String? accessTokenExpires;
  bool is_online;
  DateTime tokenExpires;

  final userProfile = ToOne<UserProfile>();
  final roles = ToMany<Role>();

  UserData({
    required this.identity,
    required this.permissions,
    this.accessToken,
    this.refreshToken,
    this.accessTokenExpires,
    required this.is_online,
    required this.tokenExpires,
  });

  UserData copyWith({
    String? identity,
    List<String>? permissions,
    String? accessToken,
    String? refreshToken,
    String? accessTokenExpires,
    bool? is_online,
    DateTime? tokenExpires,
  }) {
    return UserData(
      identity: identity ?? this.identity,
      permissions: permissions ?? this.permissions,
      accessToken: accessToken ?? this.accessToken,
      refreshToken: refreshToken ?? this.refreshToken,
      accessTokenExpires: accessTokenExpires ?? this.accessTokenExpires,
      is_online: is_online ?? this.is_online,
      tokenExpires: tokenExpires ?? this.tokenExpires,
    );
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'id': identity,
      'permissions': permissions,
      'accessToken': accessToken,
      'refreshToken': refreshToken,
      'accessTokenExpires': accessTokenExpires,
      'is_online': is_online,
      'tokenExpires': tokenExpires.millisecondsSinceEpoch,
    };
  }

  factory UserData.fromMap(Map<String, dynamic> map) {
    UserData user = UserData(
        identity: map['user']['id'] as String,
        permissions: List<String>.from(
            (map['access']['additionalPermissions'] as List<dynamic>)
                .map((e) => e as String)),
        accessToken: map['token']['accessToken'] != null
            ? map['token']['accessToken'] as String
            : null,
        refreshToken: map['token']['refreshToken'] != null
            ? map['token']['refreshToken'] as String
            : null,
        accessTokenExpires: map['token']['accessTokenExpires'] != null
            ? map['token']['accessTokenExpires'] as String
            : null,
        is_online: map['user']['is_online'] as bool,
        tokenExpires: DateTime.now().add(Duration(
            hours:
                int.parse(map['token']['accessTokenExpires'].split('h')[0]))));
    user.userProfile.target =
        UserProfile.fromMap(map['user'] as Map<String, dynamic>);
    user.roles.addAll(List<Role>.from(
        (map['access']['roles'] as List<dynamic>).map((e) => Role.fromMap(e))));

    return user;
  }

  String toJson() => json.encode(toMap());

  factory UserData.fromJson(String source) =>
      UserData.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() {
    return 'UserData(id: $id, identity: $identity, permissions: $permissions, accessToken: $accessToken, refreshToken: $refreshToken, accessTokenExpires: $accessTokenExpires, is_online: $is_online, tokenExpires: $tokenExpires)';
  }

  @override
  bool operator ==(covariant UserData other) {
    if (identical(this, other)) return true;

    return other.id == id &&
        listEquals(other.permissions, permissions) &&
        other.accessToken == accessToken &&
        other.refreshToken == refreshToken &&
        other.accessTokenExpires == accessTokenExpires &&
        other.is_online == is_online &&
        other.tokenExpires == tokenExpires &&
        other.identity == identity;
  }

  @override
  int get hashCode {
    return id.hashCode ^
        permissions.hashCode ^
        accessToken.hashCode ^
        refreshToken.hashCode ^
        accessTokenExpires.hashCode ^
        is_online.hashCode ^
        tokenExpires.hashCode ^
        identity.hashCode;
  }
}
