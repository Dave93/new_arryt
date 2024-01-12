// ignore_for_file:  sort_constructors_first
// ignore_for_file: public_member_api_docs, s

part of 'user_data_bloc.dart';

class UserProfileModel {
  final String? id;
  final String? first_name;
  final String? last_name;
  final String? phone;
  final bool? is_super_user;
  final List<String>? terminal_id;
  final int? wallet_balance;

  UserProfileModel(
      {required this.id,
      required this.first_name,
      required this.last_name,
      required this.phone,
      required this.is_super_user,
      required this.terminal_id,
      required this.wallet_balance});

  UserProfileModel copyWith({
    String? id,
    String? first_name,
    String? last_name,
    String? phone,
    bool? is_super_user,
    List<String>? terminal_id,
    int? wallet_balance,
  }) {
    return UserProfileModel(
      id: id ?? this.id,
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
      'id': id,
      'first_name': first_name,
      'last_name': last_name,
      'phone': phone,
      'is_super_user': is_super_user,
      'terminal_id': terminal_id,
      'wallet_balance': wallet_balance,
    };
  }

  factory UserProfileModel.fromMap(Map<String, dynamic> map) {
    return UserProfileModel(
      id: map['id'] as String,
      first_name:
          map['first_name'] != null ? map['first_name'] as String : null,
      last_name: map['last_name'] != null ? map['last_name'] as String : null,
      phone: map['phone'] != null ? map['phone'] as String : null,
      is_super_user:
          map['is_super_user'] != null ? map['is_super_user'] as bool : null,
      terminal_id: map['terminal_id'] != null
          ? map['terminal_id'] as List<String>
          : null,
      wallet_balance: map['wallet_balance'] ?? 0,
    );
  }

  String toJson() => json.encode(toMap());

  factory UserProfileModel.fromJson(String source) =>
      UserProfileModel.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() {
    return 'UserProfileModel(first_name: $first_name, last_name: $last_name, phone: $phone, is_super_user: $is_super_user, id: $id)';
  }

  @override
  bool operator ==(covariant UserProfileModel other) {
    if (identical(this, other)) return true;

    return other.first_name == first_name &&
        other.last_name == last_name &&
        other.phone == phone &&
        other.is_super_user == is_super_user &&
        other.id == id &&
        other.wallet_balance == wallet_balance;
  }

  @override
  int get hashCode {
    return first_name.hashCode ^
        last_name.hashCode ^
        phone.hashCode ^
        is_super_user.hashCode ^
        id.hashCode ^
        wallet_balance.hashCode;
  }
}

abstract class UserDataState extends Equatable {
  final List<String> permissions;
  final List<Role> roles;
  final String? accessToken;
  final String? refreshToken;
  final String? accessTokenExpires;
  final UserProfileModel? userProfile;
  final bool is_online;
  final DateTime tokenExpires;
  const UserDataState(
      {required this.permissions,
      required this.roles,
      this.accessToken,
      this.refreshToken,
      this.accessTokenExpires,
      this.userProfile,
      required this.is_online,
      required this.tokenExpires});

  static copyWith({
    List<String>? permissions,
    List<Role>? roles,
    String? accessToken,
    String? refreshToken,
    String? accessTokenExpires,
    UserProfileModel? userProfile,
    bool? is_online,
    DateTime? tokenExpires,
  }) {
    return UserDataInitial(
      permissions: permissions ?? [],
      roles: roles ?? [],
      accessToken: accessToken ?? '',
      refreshToken: refreshToken ?? '',
      accessTokenExpires: accessTokenExpires ?? '',
      userProfile: userProfile ??
          UserProfileModel(
            first_name: '',
            last_name: '',
            phone: '',
            is_super_user: false,
            id: '',
            terminal_id: [],
            wallet_balance: 0,
          ),
      is_online: is_online ?? false,
      tokenExpires: tokenExpires ?? DateTime.now(),
    );
  }

  @override
  List<Object> get props => [is_online, permissions, roles, tokenExpires];

  @override
  bool operator ==(covariant UserDataState other) {
    if (identical(this, other)) return true;

    return other.is_online == is_online &&
        other.permissions == permissions &&
        other.roles == roles &&
        other.tokenExpires == tokenExpires;
  }

  @override
  int get hashCode {
    return is_online.hashCode ^
        permissions.hashCode ^
        roles.hashCode ^
        tokenExpires.hashCode;
  }
}

class UserDataInitial extends UserDataState {
  const UserDataInitial({
    required List<String> permissions,
    required List<Role> roles,
    required String? accessToken,
    required String? refreshToken,
    required String? accessTokenExpires,
    required UserProfileModel? userProfile,
    required bool is_online,
    required DateTime tokenExpires,
  }) : super(
            permissions: permissions,
            roles: roles,
            accessToken: accessToken,
            refreshToken: refreshToken,
            accessTokenExpires: accessTokenExpires,
            userProfile: userProfile,
            is_online: is_online,
            tokenExpires: tokenExpires);

  static fromJson(json) {
    return UserDataInitial(
      permissions: json['permissions'] as List<String>,
      roles:
          List<Role>.from(json['roles'].map((e) => Role.fromJson(e)).toList()),
      accessToken: json['accessToken'] as String?,
      refreshToken: json['refreshToken'] as String?,
      accessTokenExpires: json['accessTokenExpires'] as String?,
      userProfile: json['userProfile'] != null
          ? UserProfileModel.fromJson(json['userProfile'])
          : null,
      is_online: json['is_online'] as bool,
      tokenExpires: DateTime.parse(json['tokenExpires']),
    );
  }

  static fromMap(Map<String, dynamic> map) {
    return UserDataInitial(
      permissions: map['permissions'] as List<String>,
      roles:
          List<Role>.from(map['roles'].map((e) => Role.fromJson(e)).toList()),
      accessToken: map['accessToken'] as String?,
      refreshToken: map['refreshToken'] as String?,
      accessTokenExpires: map['accessTokenExpires'] as String?,
      userProfile: map['userProfile'] != null
          ? UserProfileModel.fromJson(map['userProfile'])
          : null,
      is_online: map['is_online'] as bool,
      tokenExpires: DateTime.parse(map['tokenExpires']),
    );
  }

  static toJson(UserDataState state) {
    return {
      'permissions': state.permissions,
      'roles': state.roles.map((e) => e.toJson()).toList(),
      'accessToken': state.accessToken,
      'refreshToken': state.refreshToken,
      'accessTokenExpires': state.accessTokenExpires,
      'userProfile': state.userProfile?.toJson(),
      'is_online': state.is_online,
      'tokenExpires': state.tokenExpires.toIso8601String(),
    };
  }

  static copyWith(UserDataState state) {
    return UserDataInitial(
      permissions: state.permissions,
      roles: state.roles,
      accessToken: state.accessToken,
      refreshToken: state.refreshToken,
      accessTokenExpires: state.accessTokenExpires,
      userProfile: state.userProfile,
      is_online: state.is_online,
      tokenExpires: state.tokenExpires,
    );
  }
}

class UserDataLogout extends UserDataState {
  const UserDataLogout({
    required List<String> permissions,
    required List<Role> roles,
    required String? accessToken,
    required String? refreshToken,
    required String? accessTokenExpires,
    required UserProfileModel? userProfile,
    required bool is_online,
    required DateTime tokenExpires,
  }) : super(
            permissions: permissions,
            roles: roles,
            accessToken: accessToken,
            refreshToken: refreshToken,
            accessTokenExpires: accessTokenExpires,
            userProfile: userProfile,
            is_online: is_online,
            tokenExpires: tokenExpires);

  static fromJson(json) {
    return UserDataLogout(
      permissions: json['permissions'] as List<String>,
      roles:
          List<Role>.from(json['roles'].map((e) => Role.fromJson(e)).toList()),
      accessToken: json['accessToken'] as String?,
      refreshToken: json['refreshToken'] as String?,
      accessTokenExpires: json['accessTokenExpires'] as String?,
      userProfile: UserProfileModel.fromJson(json['userProfile']),
      is_online: json['is_online'] as bool,
      tokenExpires: DateTime.parse(json['tokenExpires']),
    );
  }

  static toJson(UserDataState state) {
    return {
      'permissions': state.permissions,
      'roles': state.roles.map((e) => e.toJson()).toList(),
      'accessToken': state.accessToken,
      'refreshToken': state.refreshToken,
      'accessTokenExpires': state.accessTokenExpires,
      'userProfile': state.userProfile?.toJson(),
      'is_online': state.is_online,
      'tokenExpires': state.tokenExpires.toIso8601String(),
    };
  }

  static copyWith(UserDataState state) {
    return UserDataLogout(
      permissions: state.permissions,
      roles: state.roles,
      accessToken: state.accessToken,
      refreshToken: state.refreshToken,
      accessTokenExpires: state.accessTokenExpires,
      userProfile: state.userProfile,
      is_online: state.is_online,
      tokenExpires: state.tokenExpires,
    );
  }
}
