// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'user_data.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class UserProfileAdapter extends TypeAdapter<UserProfile> {
  @override
  final int typeId = 0;

  @override
  UserProfile read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return UserProfile(
      identity: fields[0] as String,
      first_name: fields[1] as String?,
      last_name: fields[2] as String?,
      phone: fields[3] as String?,
      is_super_user: fields[4] as bool?,
      terminal_id: (fields[5] as List?)?.cast<String>(),
      wallet_balance: fields[6] as int?,
    );
  }

  @override
  void write(BinaryWriter writer, UserProfile obj) {
    writer
      ..writeByte(7)
      ..writeByte(0)
      ..write(obj.identity)
      ..writeByte(1)
      ..write(obj.first_name)
      ..writeByte(2)
      ..write(obj.last_name)
      ..writeByte(3)
      ..write(obj.phone)
      ..writeByte(4)
      ..write(obj.is_super_user)
      ..writeByte(5)
      ..write(obj.terminal_id)
      ..writeByte(6)
      ..write(obj.wallet_balance);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UserProfileAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class RoleAdapter extends TypeAdapter<Role> {
  @override
  final int typeId = 1;

  @override
  Role read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return Role(
      name: fields[0] as String,
      code: fields[1] as String,
      active: fields[2] as bool,
    );
  }

  @override
  void write(BinaryWriter writer, Role obj) {
    writer
      ..writeByte(3)
      ..writeByte(0)
      ..write(obj.name)
      ..writeByte(1)
      ..write(obj.code)
      ..writeByte(2)
      ..write(obj.active);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RoleAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class UserDataAdapter extends TypeAdapter<UserData> {
  @override
  final int typeId = 2;

  @override
  UserData read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return UserData(
      identity: fields[0] as String,
      permissions: (fields[1] as List).cast<String>(),
      accessToken: fields[2] as String?,
      refreshToken: fields[3] as String?,
      accessTokenExpires: fields[4] as String?,
      is_online: fields[5] as bool,
      tokenExpires: fields[6] as DateTime,
      userProfile: fields[7] as UserProfile?,
      roles: (fields[8] as List).cast<Role>(),
    );
  }

  @override
  void write(BinaryWriter writer, UserData obj) {
    writer
      ..writeByte(9)
      ..writeByte(0)
      ..write(obj.identity)
      ..writeByte(1)
      ..write(obj.permissions)
      ..writeByte(2)
      ..write(obj.accessToken)
      ..writeByte(3)
      ..write(obj.refreshToken)
      ..writeByte(4)
      ..write(obj.accessTokenExpires)
      ..writeByte(5)
      ..write(obj.is_online)
      ..writeByte(6)
      ..write(obj.tokenExpires)
      ..writeByte(7)
      ..write(obj.userProfile)
      ..writeByte(8)
      ..write(obj.roles);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UserDataAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}
