// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'api_client.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class ApiClientAdapter extends TypeAdapter<ApiClient> {
  @override
  final int typeId = 3;

  @override
  ApiClient read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return ApiClient(
      apiUrl: fields[0] as String,
      serviceName: fields[1] as String,
      isServiceDefault: fields[2] as bool,
    );
  }

  @override
  void write(BinaryWriter writer, ApiClient obj) {
    writer
      ..writeByte(3)
      ..writeByte(0)
      ..write(obj.apiUrl)
      ..writeByte(1)
      ..write(obj.serviceName)
      ..writeByte(2)
      ..write(obj.isServiceDefault);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ApiClientAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}
