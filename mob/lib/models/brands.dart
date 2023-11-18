import 'dart:convert';

// ignore_for_file: public_member_api_docs, sort_constructors_first
class BrandsModel {
  String id;
  String name;
  String logoPath;
  String sign;
  BrandsModel({
    required this.id,
    required this.name,
    required this.logoPath,
    required this.sign,
  });

  BrandsModel copyWith({
    String? id,
    String? name,
    String? logoPath,
    String? sign,
  }) {
    return BrandsModel(
      id: id ?? this.id,
      name: name ?? this.name,
      logoPath: logoPath ?? this.logoPath,
      sign: sign ?? this.sign,
    );
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'id': id,
      'name': name,
      'logo_path': logoPath,
      'sign': sign,
    };
  }

  factory BrandsModel.fromMap(Map<String, dynamic> map) {
    return BrandsModel(
      id: map['id'] as String,
      name: map['name'] as String,
      logoPath: map['logo_path'] as String,
      sign: map['sign'] as String,
    );
  }

  String toJson() => json.encode(toMap());

  factory BrandsModel.fromJson(String source) =>
      BrandsModel.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() {
    return 'BrandsModel(id: $id, name: $name, logoPath: $logoPath, sign: $sign)';
  }

  @override
  bool operator ==(covariant BrandsModel other) {
    if (identical(this, other)) return true;

    return other.id == id &&
        other.name == name &&
        other.logoPath == logoPath &&
        other.sign == sign;
  }

  @override
  int get hashCode {
    return id.hashCode ^ name.hashCode ^ logoPath.hashCode ^ sign.hashCode;
  }
}
